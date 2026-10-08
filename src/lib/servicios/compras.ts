import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  compraSchema,
  lineaCompraSchema,
  recepcionCompraSchema,
  cierreCompraSchema,
  motivoCompraSchema,
  referenciaCompraSchema,
  claveCompraSchema,
  filtrosCompraSchema,
  type DatosCompra,
} from "@/lib/validaciones/compra";
import { inicioDiaChile } from "@/lib/fechas-chile";
import { normalizarRut, rutValido } from "@/lib/validaciones/rut";
import { TIPOS_DOCUMENTO_COMPRA } from "@/config/tipos-documento-compra";
import type {
  CatalogosCompra,
  Compra,
  ResultadoCompra,
  CalculoCompra,
} from "@/lib/tipos/compra";
class ReglaCompra extends Error {}
const exigir = (condicion: unknown, mensaje: string) => {
  if (!condicion) throw new ReglaCompra(mensaje);
};
const hash = (datos: unknown) =>
  createHash("sha256").update(JSON.stringify(datos)).digest("hex");
const limiteCantidad = new Prisma.Decimal("99999999999.999");
const limiteImporte = new Prisma.Decimal("999999999999.99");
/** La equivalencia no se redondea: redondear cantidades cambiaría el stock comprado. */
export function calcularCompra(datos: DatosCompra): CalculoCompra {
  let total = new Prisma.Decimal(0);
  const lineas = datos.lines.map((linea) => {
    const cantidad = new Prisma.Decimal(linea.purchasedQuantity),
      factor = new Prisma.Decimal(linea.unitFactor),
      precio = new Prisma.Decimal(linea.unitPrice);
    const equivalente = cantidad.times(factor);
    exigir(
      cantidad.gt(0) &&
        factor.gt(0) &&
        cantidad.lte(limiteCantidad) &&
        factor.lte(limiteCantidad),
      "Cantidades y contenido deben ser positivos y estar dentro del límite.",
    );
    exigir(
      equivalente.lte(limiteCantidad) && equivalente.decimalPlaces() <= 3,
      "El contenido equivalente debe ser exacto con hasta tres decimales y estar dentro del límite.",
    );
    const importe = cantidad
      .times(precio)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    exigir(
      precio.gte(0) && precio.lte(limiteImporte) && importe.lte(limiteImporte),
      "El importe supera el límite permitido.",
    );
    total = total.plus(importe);
    return { cantidad: equivalente.toString(), importe: importe.toFixed(2) };
  });
  exigir(total.lte(limiteImporte), "El total supera el límite permitido.");
  return { total: total.toFixed(2), lineas };
}
export function previsualizarCompra(entrada: unknown):
  | {
      ok: true;
      calculo: CalculoCompra;
    }
  | {
      ok: false;
      mensaje: string;
    } {
  const v = compraSchema.safeParse(entrada);
  if (!v.success)
    return {
      ok: false,
      mensaje:
        "Completa cabecera y líneas: valores positivos, fecha y decimales válidos.",
    };
  try {
    return { ok: true, calculo: calcularCompra(v.data) };
  } catch (e) {
    return {
      ok: false,
      mensaje:
        e instanceof ReglaCompra ? e.message : "No se pudo calcular la compra.",
    };
  }
}
function errorCompra(e: unknown): ResultadoCompra {
  if (e instanceof ReglaCompra) return { ok: false, mensaje: e.message };
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002")
      return {
        ok: false,
        mensaje:
          "Ya existe una compra con ese proveedor, tipo y número de documento.",
      };
    if (e.code === "P2003")
      return {
        ok: false,
        mensaje:
          "Una referencia cambió o está asociada a otra operación. Actualiza el listado.",
      };
    if (e.code === "P2025" || e.code === "P2034")
      return {
        ok: false,
        mensaje:
          "Los datos cambiaron durante la operación. Actualiza y vuelve a intentarlo.",
      };
  }
  console.error("Error en Compras:", e);
  return {
    ok: false,
    mensaje:
      "No se pudo completar la operación. Conserva el formulario e inténtalo nuevamente.",
  };
}
export async function catalogosCompra(): Promise<CatalogosCompra> {
  const [proveedores, bodegas, tipos, materiales, presentaciones] =
    await Promise.all([
      prisma.supplier.findMany({
        select: { id: true, name: true, rut: true },
        orderBy: { name: "asc" },
      }),
      prisma.warehouse.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.documentType.findMany({
        where: { code: { in: TIPOS_DOCUMENTO_COMPRA.map((t) => t.code) } },
        select: { id: true, name: true, code: true },
        orderBy: { id: "asc" },
      }),
      prisma.rawMaterial.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          unitMeasure: { select: { abbreviation: true } },
        },
        orderBy: { name: "asc" },
      }),
      // PostgreSQL agrupa nombres sin traer todo el historial de líneas de compra.
      prisma.purchaseDetail.groupBy({
        by: ["presentation"],
        orderBy: { presentation: "asc" },
      }),
    ]);
  return {
    presentaciones: [
      ...new Map(
        presentaciones.map((p) => [
          p.presentation.trim().toLocaleLowerCase("es-CL"),
          p.presentation.trim(),
        ]),
      ).values(),
    ].filter(Boolean),
    proveedores,
    bodegas,
    tipos,
    materiales: materiales.map(({ unitMeasure, ...m }) => ({
      ...m,
      unidad: unitMeasure.abbreviation,
    })),
  };
}
/** Lecturas escalares secuenciales dentro del snapshot; evita consultas hermanas de pg en paralelo. */
async function leerCompras(
  tx: Prisma.TransactionClient,
  ids: number[],
): Promise<Compra[]> {
  const compras = await tx.purchase.findMany({ where: { id: { in: ids } } });
  const lineas = await tx.purchaseDetail.findMany({
    where: { purchaseId: { in: ids } },
    orderBy: { id: "asc" },
  });
  const proveedores = await tx.supplier.findMany({
    where: { id: { in: compras.map((c) => c.supplierId) } },
  });
  const bodegas = await tx.warehouse.findMany({
    where: { id: { in: compras.map((c) => c.warehouseId) } },
  });
  const materiales = await tx.rawMaterial.findMany({
    where: { id: { in: lineas.map((l) => l.rawMaterialId) } },
  });
  const unidades = await tx.unitMeasure.findMany({
    where: { id: { in: materiales.map((m) => m.unitMeasureId) } },
  });
  const tipos = await tx.documentType.findMany({
    where: { id: { in: compras.map((c) => c.documentTypeId) } },
  });
  const recepciones = await tx.purchaseReceipt.findMany({
    where: { purchaseId: { in: ids } },
    orderBy: { id: "asc" },
  });
  const recibidos = await tx.purchaseReceiptDetail.findMany({
    where: { purchaseId: { in: ids } },
  });
  const cierres = await tx.purchasePendingClosure.findMany({
    where: { purchaseId: { in: ids } },
  });
  const dia = (d: Date) =>
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Santiago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  return compras.map((c) => {
    const lines = lineas
      .filter((l) => l.purchaseId === c.id)
      .map((l) => {
        const material = materiales.find((m) => m.id === l.rawMaterialId)!;
        const recibido = recibidos
          .filter((r) => r.purchaseDetailId === l.id)
          .reduce((s, r) => s.plus(r.receivedQuantity), new Prisma.Decimal(0));
        const cerrado = cierres
          .filter((r) => r.purchaseDetailId === l.id)
          .reduce((s, r) => s.plus(r.quantity), new Prisma.Decimal(0));
        return {
          id: l.id,
          rawMaterialId: l.rawMaterialId,
          presentation: l.presentation,
          purchasedQuantity: l.purchasedQuantity.toString(),
          unitFactor: l.unitFactor.toString(),
          unitPrice: l.unitPrice.toFixed(2),
          quantity: l.quantity.toString(),
          lineAmount: l.lineAmount.toFixed(2),
          material: material.name,
          unidad: unidades.find((u) => u.id === material.unitMeasureId)!
            .abbreviation,
          recibido: recibido.toString(),
          cerrado: cerrado.toString(),
          pendiente: c.voidedAt
            ? "0"
            : l.purchasedQuantity.minus(recibido).minus(cerrado).toString(),
        };
      });
    const recibida = recepciones.some((r) => r.purchaseId === c.id);
    return {
      id: c.id,
      version: c.version,
      date: c.date.toISOString(),
      dia: dia(c.date),
      totalAmount: c.totalAmount.toFixed(2),
      supplierId: c.supplierId,
      proveedor: proveedores.find((p) => p.id === c.supplierId)!.name,
      rut: c.supplierRut,
      documentTypeId: c.documentTypeId,
      documento: tipos.find((t) => t.id === c.documentTypeId)!.name,
      documentNumber: c.documentNumber,
      warehouseId: c.warehouseId,
      bodega: bodegas.find((b) => b.id === c.warehouseId)!.name,
      voidedAt: c.voidedAt?.toISOString() ?? null,
      voidReason: c.voidReason,
      deletedAt: c.deletedAt?.toISOString() ?? null,
      recibida,
      estado: c.voidedAt
        ? "Anulada"
        : lines.every((l) => l.pendiente === "0")
          ? "Completa/cerrada"
          : recibida
            ? "Recepción parcial"
            : "Pendiente de recepción",
      lines,
      closures: cierres
        .filter((r) => r.purchaseId === c.id)
        .map((r) => ({
          id: r.id,
          material: lines.find((l) => l.id === r.purchaseDetailId)!.material,
          cantidad: r.quantity.toString(),
          motivo: r.reason,
          fecha: r.createdAt.toISOString(),
        })),
      receipts: recepciones
        .filter((r) => r.purchaseId === c.id)
        .map((r) => ({
          id: r.id,
          fecha: r.date.toISOString(),
          lineas: recibidos
            .filter((d) => d.receiptId === r.id)
            .map((d) => ({
              material: lines.find((l) => l.id === d.purchaseDetailId)!
                .material,
              cantidad: d.receivedQuantity.toString(),
              equivalente: d.inventoryQuantity.toString(),
            })),
        })),
    };
  });
}
export async function listarCompras(entrada: unknown) {
  const v = filtrosCompraSchema.safeParse(entrada);
  if (!v.success)
    return { ok: false as const, mensaje: "Revisa los filtros de compras." };
  const f = v.data;
  return prisma.$transaction(
    async (tx) => {
      const where: Prisma.PurchaseWhereInput = {
        deletedAt: null,
        ...(f.q
          ? {
              OR: [
                { documentNumber: { contains: f.q, mode: "insensitive" } },
                { supplierRut: { contains: f.q, mode: "insensitive" } },
                { supplier: { name: { contains: f.q, mode: "insensitive" } } },
              ],
            }
          : {}),
      };
      const total = await tx.purchase.count({ where });
      const pagina = Math.min(
        f.pagina,
        Math.max(1, Math.ceil(total / f.tamano)),
      );
      const orden: Prisma.PurchaseOrderByWithRelationInput =
        f.orden === "total"
          ? { totalAmount: f.sentido }
          : f.orden === "documento"
            ? { documentNumber: f.sentido }
            : { date: f.sentido };
      const ids = await tx.purchase.findMany({
        where,
        select: { id: true },
        orderBy: [orden, { id: "desc" }],
        take: f.tamano,
        skip: (pagina - 1) * f.tamano,
      });
      const datos = await leerCompras(
        tx,
        ids.map((r) => r.id),
      );
      return {
        ok: true as const,
        pagina: {
          total,
          pagina,
          tamano: f.tamano,
          datos: ids.map((r) => datos.find((c) => c.id === r.id)!),
        },
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}
export async function consultarCompra(id: unknown): Promise<ResultadoCompra> {
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0)
    return { ok: false, mensaje: "Compra inválida." };
  try {
    const compra = await prisma.$transaction(
      async (tx) => (await leerCompras(tx, [id]))[0],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return compra
      ? { ok: true, mensaje: "Compra consultada.", compra }
      : { ok: false, mensaje: "La compra ya no existe." };
  } catch (e) {
    return errorCompra(e);
  }
}
/** Repetir una creación confirmada devuelve su resultado; una clave con otros datos se rechaza. */
async function repeticion(
  key: string,
  huella: string,
): Promise<ResultadoCompra | undefined> {
  const op = await prisma.purchaseOperation.findUnique({
    where: { idempotencyKey: key },
  });
  if (!op) return;
  return op.type === "CREAR" && op.requestHash === huella
    ? { ok: true, mensaje: "Compra ya registrada.", id: op.purchaseId }
    : {
        ok: false,
        mensaje: "La clave de operación ya se utilizó con otros datos.",
      };
}
export async function guardarCompra(
  entrada: unknown,
  clave: unknown,
  referencia?: unknown,
): Promise<ResultadoCompra> {
  const v = compraSchema.safeParse(entrada),
    key = claveCompraSchema.safeParse(clave),
    ref =
      referencia === undefined
        ? undefined
        : referenciaCompraSchema.safeParse(referencia);
  if (!v.success || !key.success || (ref && !ref.success))
    return {
      ok: false,
      mensaje: "Revisa cabecera, fecha y líneas de la compra.",
    };
  const d = v.data;
  const huella = hash({ ...d, documentNumber: d.documentNumber.toUpperCase() });
  try {
    const calculo = calcularCompra(d);
    if (!ref) {
      const previa = await repeticion(key.data, huella);
      if (previa) return previa;
    }
    const id = await prisma.$transaction(async (tx) => {
      // Bloquear compra y material coordina ediciones con recepción y cambio de unidad futuros.
      if (ref?.success)
        await tx.$queryRaw`SELECT id FROM "Purchase" WHERE id=${ref.data.id} FOR UPDATE`;
      const anterior = ref?.success
        ? await tx.purchase.findUnique({ where: { id: ref.data.id } })
        : null;
      if (ref?.success)
        exigir(
          anterior &&
            anterior.version === ref.data.version &&
            !anterior.voidedAt &&
            !anterior.deletedAt,
          "La compra cambió o está anulada. Actualiza antes de editar.",
        );
      const proveedor = await tx.supplier.findUnique({
        where: { id: d.supplierId },
      });
      const tipo = await tx.documentType.findUnique({
        where: { id: d.documentTypeId },
      });
      exigir(
        proveedor && rutValido(proveedor.rut),
        "Selecciona un proveedor con RUT válido.",
      );
      exigir(
        tipo && TIPOS_DOCUMENTO_COMPRA.some((t) => t.code === tipo.code),
        "Selecciona uno de los tres tipos de documento permitidos.",
      );
      exigir(
        await tx.warehouse.findUnique({ where: { id: d.warehouseId } }),
        "La bodega ya no existe.",
      );
      for (const mid of [...new Set(d.lines.map((l) => l.rawMaterialId))].sort(
        (a, b) => a - b,
      )) {
        const filas = await tx.$queryRaw<
          {
            id: number;
          }[]
        >`SELECT id FROM "RawMaterial" WHERE id=${mid} FOR UPDATE`;
        exigir(filas.length, "Un material ya no existe.");
      }
      const existentes = anterior
        ? await tx.purchaseDetail.findMany({
            where: { purchaseId: anterior.id },
          })
        : [];
      exigir(
        new Set(d.lines.filter((l) => l.id).map((l) => l.id)).size ===
          d.lines.filter((l) => l.id).length,
        "Hay líneas repetidas.",
      );
      for (const l of d.lines) {
        if (l.id) {
          const previa = existentes.find((p) => p.id === l.id);
          exigir(previa, "Una línea no pertenece a esta compra.");
          exigir(
            previa!.unitPrice.eq(l.unitPrice),
            "El precio guardado no puede modificarse.",
          );
        } else
          exigir(
            !anterior ||
              !existentes.some((p) => p.rawMaterialId === l.rawMaterialId),
            "No reemplaces una línea guardada para cambiar su precio.",
          );
      }
      if (
        anterior &&
        ((await tx.purchaseReceipt.count({
          where: { purchaseId: anterior.id },
        })) > 0 ||
          (await tx.purchasePendingClosure.count({
            where: { purchaseId: anterior.id },
          })) > 0)
      ) {
        const iguales =
          d.warehouseId === anterior.warehouseId &&
          d.supplierId === anterior.supplierId &&
          d.documentTypeId === anterior.documentTypeId &&
          d.documentNumber === anterior.documentNumber &&
          d.lines.length === existentes.length &&
          d.lines.every((l) => {
            const p = existentes.find((p) => p.id === l.id);
            return (
              p &&
              p.rawMaterialId === l.rawMaterialId &&
              p.presentation === l.presentation &&
              p.purchasedQuantity.eq(l.purchasedQuantity) &&
              p.unitFactor.eq(l.unitFactor)
            );
          });
        exigir(
          iguales,
          "Después de recibir o cerrar pendientes no se puede cambiar la identidad, bodega ni estructura de la compra.",
        );
      }
      const cabecera = {
        date: inicioDiaChile(d.date),
        supplierId: d.supplierId,
        supplierRut:
          anterior?.supplierId === d.supplierId
            ? anterior.supplierRut
            : normalizarRut(proveedor!.rut),
        documentTypeId: d.documentTypeId,
        documentTypeCode:
          anterior?.documentTypeId === d.documentTypeId
            ? anterior.documentTypeCode
            : tipo!.code,
        documentNumber: d.documentNumber,
        documentNumberNormalized: d.documentNumber.toUpperCase(),
        warehouseId: d.warehouseId,
        totalAmount: calculo.total,
      };
      // Retirar primero líneas omitidas evita que el cambio de bodega cascada deje referencias inconsistentes.
      if (anterior)
        await tx.purchaseDetail.deleteMany({
          where: {
            purchaseId: anterior.id,
            id: { notIn: d.lines.flatMap((l) => (l.id ? [l.id] : [])) },
          },
        });
      const compra = anterior
        ? await tx.purchase.update({
            where: {
              id: anterior.id,
              version: ref!.success ? ref!.data.version : 0,
            },
            data: { ...cabecera, version: { increment: 1 } },
          })
        : await tx.purchase.create({ data: cabecera });
      for (let i = 0; i < d.lines.length; i++) {
        const l = d.lines[i],
          data = {
            purchaseId: compra.id,
            warehouseId: d.warehouseId,
            rawMaterialId: l.rawMaterialId,
            presentation: l.presentation,
            purchasedQuantity: l.purchasedQuantity,
            unitFactor: l.unitFactor,
            unitPrice: l.unitPrice,
            quantity: calculo.lineas[i].cantidad,
            lineAmount: calculo.lineas[i].importe,
          };
        if (l.id) await tx.purchaseDetail.update({ where: { id: l.id }, data });
        else await tx.purchaseDetail.create({ data });
      }
      if (!anterior)
        await tx.purchaseOperation.create({
          data: {
            idempotencyKey: key.data,
            type: "CREAR",
            requestHash: huella,
            purchaseId: compra.id,
          },
        });
      return compra.id;
    });
    return {
      ok: true,
      mensaje:
        "Compra guardada. Las existencias no cambian hasta registrar una recepción.",
      id,
    };
  } catch (e) {
    // Una colisión de clave aborta la transacción: resolver el reintento en una conexión nueva.
    if (
      !ref &&
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const previa = await repeticion(key.data, huella);
      if (previa) return previa;
    }
    return errorCompra(e);
  }
}
/** Eliminar oculta una compra ya anulada: nunca borra sus líneas, operaciones ni Kardex. */
export async function eliminarCompra(
  referencia: unknown,
  clave: unknown,
): Promise<ResultadoCompra> {
  const ref = referenciaCompraSchema.safeParse(referencia),
    key = claveCompraSchema.safeParse(clave);
  if (!ref.success || !key.success)
    return { ok: false, mensaje: "Referencia de compra inválida." };
  const huella = hash(ref.data);
  try {
    const previa = await prisma.purchaseOperation.findUnique({
      where: { idempotencyKey: key.data },
    });
    if (previa)
      return previa.type === "ELIMINAR" && previa.requestHash === huella
        ? { ok: true, mensaje: "Compra ya eliminada del listado." }
        : {
            ok: false,
            mensaje: "La clave de operación pertenece a otra solicitud.",
          };
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Purchase" WHERE id=${ref.data.id} FOR UPDATE`;
      const compra = await tx.purchase.findUnique({
        where: { id: ref.data.id },
      });
      exigir(
        compra && compra.version === ref.data.version && !compra.deletedAt,
        "La compra cambió. Actualiza antes de eliminar.",
      );
      exigir(
        compra!.voidedAt,
        "Primero debes anular la compra conforme a las reglas de inventario.",
      );
      await tx.purchase.update({
        where: { id: ref.data.id, version: ref.data.version },
        data: { deletedAt: new Date(), version: { increment: 1 } },
      });
      await tx.purchaseOperation.create({
        data: {
          idempotencyKey: key.data,
          type: "ELIMINAR",
          requestHash: huella,
          purchaseId: ref.data.id,
        },
      });
    });
    return {
      ok: true,
      mensaje: "Compra eliminada del listado; historial conservado.",
    };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const previa = await prisma.purchaseOperation.findUnique({
        where: { idempotencyKey: key.data },
      });
      if (previa?.type === "ELIMINAR" && previa.requestHash === huella)
        return { ok: true, mensaje: "Compra ya eliminada del listado." };
    }
    return errorCompra(e);
  }
}

/** Compra → materiales → saldos: mismo orden en todas las recepciones, sin consultas paralelas en tx. */
export async function recibirCompra(
  entrada: unknown,
  referencia: unknown,
  clave: unknown,
): Promise<ResultadoCompra> {
  const datos = recepcionCompraSchema.safeParse(entrada);
  const ref = referenciaCompraSchema.safeParse(referencia);
  const key = claveCompraSchema.safeParse(clave);
  if (!datos.success || !ref.success || !key.success)
    return {
      ok: false,
      mensaje: "Revisa fecha, cantidades, líneas y clave de la recepción.",
    };
  // El orden de las líneas y los ceros decimales no cambian la identidad de un reintento.
  const lines = datos.data.lines
    .map((l) => ({
      ...l,
      receivedQuantity: new Prisma.Decimal(l.receivedQuantity).toString(),
    }))
    .sort((a, b) => a.purchaseDetailId - b.purchaseDetailId);
  const huella = hash({
    referencia: ref.data,
    date: datos.data.date,
    note: datos.data.note || null,
    lines,
  });
  const replay = (
    op: { type: string; requestHash: string; purchaseId: number } | null,
  ): ResultadoCompra | undefined =>
    op
      ? op.type === "RECIBIR" && op.requestHash === huella
        ? {
            ok: true,
            id: op.purchaseId,
            mensaje: "Recepción ya registrada; no se duplicaron las entradas.",
          }
        : {
            ok: false,
            mensaje: "La clave de operación pertenece a otra solicitud.",
          }
      : undefined;
  try {
    const previa = replay(
      await prisma.purchaseOperation.findUnique({
        where: { idempotencyKey: key.data },
      }),
    );
    if (previa) return previa;
    await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Purchase" WHERE id=${ref.data.id} FOR UPDATE`;
        // Se verifica otra vez tras el bloqueo: un reintento simultáneo puede haber terminado mientras esperábamos.
        const anterior = await tx.purchaseOperation.findUnique({
          where: { idempotencyKey: key.data },
        });
        if (anterior) {
          exigir(
            anterior.type === "RECIBIR" && anterior.requestHash === huella,
            "La clave de operación pertenece a otra solicitud.",
          );
          return;
        }
        const compra = await tx.purchase.findUnique({
          where: { id: ref.data.id },
        });
        exigir(
          compra && !compra.voidedAt && !compra.deletedAt,
          "No se puede recibir una compra anulada o eliminada.",
        );
        exigir(
          compra!.version === ref.data.version,
          "La compra cambió. Actualiza antes de recibir.",
        );
        exigir(
          new Set(lines.map((l) => l.purchaseDetailId)).size === lines.length,
          "Una línea no puede repetirse en la recepción.",
        );
        const detalles = await tx.purchaseDetail.findMany({
          where: { purchaseId: ref.data.id },
          orderBy: { id: "asc" },
        });
        const recibidos = await tx.purchaseReceiptDetail.findMany({
          where: { purchaseId: ref.data.id },
        });
        const cierres = await tx.purchasePendingClosure.findMany({
          where: { purchaseId: ref.data.id },
        });
        const incrementos = new Map<number, Prisma.Decimal>();
        const entradas = lines.map((l) => {
          const detalle = detalles.find((d) => d.id === l.purchaseDetailId);
          exigir(detalle, "La línea no pertenece a esta compra.");
          const cantidad = new Prisma.Decimal(l.receivedQuantity);
          const usada = recibidos
            .filter((r) => r.purchaseDetailId === detalle!.id)
            .reduce(
              (s, r) => s.plus(r.receivedQuantity),
              new Prisma.Decimal(0),
            );
          const cerrada = cierres
            .filter((c) => c.purchaseDetailId === detalle!.id)
            .reduce((s, c) => s.plus(c.quantity), new Prisma.Decimal(0));
          const pendiente = detalle!.purchasedQuantity
            .minus(usada)
            .minus(cerrada);
          exigir(
            cantidad.gt(0) && cantidad.lte(pendiente),
            "La cantidad debe ser positiva y no superar el pendiente de la línea.",
          );
          const equivalente = cantidad.times(detalle!.unitFactor);
          exigir(
            equivalente.gt(0) &&
              equivalente.lte(limiteCantidad) &&
              equivalente.decimalPlaces() <= 3,
            "La equivalencia debe ser exacta con hasta tres decimales en la unidad del material.",
          );
          incrementos.set(
            detalle!.rawMaterialId,
            (
              incrementos.get(detalle!.rawMaterialId) ?? new Prisma.Decimal(0)
            ).plus(equivalente),
          );
          return { detalle: detalle!, cantidad, equivalente };
        });
        // Bloquear el material también serializa la creación del primer saldo y coordina el cambio de unidad.
        for (const id of [...incrementos.keys()].sort((a, b) => a - b))
          await tx.$queryRaw`SELECT id FROM "RawMaterial" WHERE id=${id} FOR UPDATE`;
        const saldos = await tx.warehouseStock.findMany({
          where: {
            warehouseId: compra!.warehouseId,
            rawMaterialId: { in: [...incrementos.keys()] },
          },
          orderBy: { id: "asc" },
        });
        for (const saldo of saldos)
          await tx.$queryRaw`SELECT id FROM "WarehouseStock" WHERE id=${saldo.id} FOR UPDATE`;
        // Releer tras el bloqueo permite convivir con otros procesos que escriban inventario.
        for (const [material, incremento] of [...incrementos].sort(
          ([a], [b]) => a - b,
        )) {
          const saldo = await tx.warehouseStock.findUnique({
            where: {
              warehouseId_rawMaterialId: {
                warehouseId: compra!.warehouseId,
                rawMaterialId: material,
              },
            },
          });
          exigir(
            (saldo?.quantity ?? new Prisma.Decimal(0))
              .plus(incremento)
              .lte(limiteCantidad),
            "El saldo resultante supera el límite de inventario.",
          );
          await tx.warehouseStock.upsert({
            where: {
              warehouseId_rawMaterialId: {
                warehouseId: compra!.warehouseId,
                rawMaterialId: material,
              },
            },
            create: {
              warehouseId: compra!.warehouseId,
              rawMaterialId: material,
              quantity: incremento,
            },
            update: { quantity: { increment: incremento } }, // Conservar minStock y cualquier configuración existente.
          });
        }
        const fecha = inicioDiaChile(datos.data.date);
        const recepcion = await tx.purchaseReceipt.create({
          data: {
            purchaseId: compra!.id,
            date: fecha,
            note: datos.data.note || null,
          },
        });
        for (const entrada of entradas) {
          const detalle = await tx.purchaseReceiptDetail.create({
            data: {
              purchaseId: compra!.id,
              receiptId: recepcion.id,
              purchaseDetailId: entrada.detalle.id,
              receivedQuantity: entrada.cantidad,
              inventoryQuantity: entrada.equivalente,
            },
          });
          await tx.stockMovement.create({
            data: {
              date: fecha,
              type: "ENTRADA",
              quantity: entrada.equivalente,
              warehouseId: compra!.warehouseId,
              rawMaterialId: entrada.detalle.rawMaterialId,
              purchaseDetailId: entrada.detalle.id,
              purchaseReceiptDetailId: detalle.id,
              note: `Recepción de compra ${compra!.documentNumber}${datos.data.note ? `: ${datos.data.note}` : ""}`,
            },
          });
        }
        await tx.purchase.update({
          where: { id: compra!.id },
          data: { version: { increment: 1 } },
        });
        await tx.purchaseOperation.create({
          data: {
            idempotencyKey: key.data,
            type: "RECIBIR",
            requestHash: huella,
            purchaseId: compra!.id,
            receiptId: recepcion.id,
          },
        });
      },
      { maxWait: 10000, timeout: 20000 },
    );
    return {
      ok: true,
      id: ref.data.id,
      mensaje: "Recepción registrada; stock y Kardex actualizados.",
    };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const anterior = replay(
        await prisma.purchaseOperation.findUnique({
          where: { idempotencyKey: key.data },
        }),
      );
      if (anterior) return anterior;
    }
    return errorCompra(e);
  }
}

/** Vista previa en servidor: Decimal nunca se convierte a number para calcular inventario. */
export async function previsualizarRecepcionCompra(
  entrada: unknown,
  referencia: unknown,
) {
  const datos = recepcionCompraSchema.safeParse(entrada);
  const ref = referenciaCompraSchema.safeParse(referencia);
  if (!datos.success || !ref.success)
    return {
      ok: false as const,
      mensaje:
        "Indica una fecha válida y al menos una cantidad con hasta tres decimales.",
    };
  try {
    const resultado = await consultarCompra(ref.data.id);
    exigir(resultado.ok && resultado.compra, "No se pudo consultar la compra.");
    const compra = resultado.ok ? resultado.compra! : undefined;
    exigir(
      compra &&
        compra.version === ref.data.version &&
        !compra.voidedAt &&
        !compra.deletedAt,
      "La compra cambió o no admite recepciones. Actualiza el listado.",
    );
    exigir(
      new Set(datos.data.lines.map((l) => l.purchaseDetailId)).size ===
        datos.data.lines.length,
      "Hay líneas repetidas.",
    );
    const lineas = datos.data.lines.map((l) => {
      const detalle = compra!.lines.find((d) => d.id === l.purchaseDetailId);
      exigir(detalle, "La línea no pertenece a esta compra.");
      const cantidad = new Prisma.Decimal(l.receivedQuantity);
      exigir(
        cantidad.gt(0) && cantidad.lte(detalle!.pendiente),
        "La cantidad debe ser positiva y no superar el pendiente.",
      );
      const equivalente = cantidad.times(detalle!.unitFactor);
      exigir(
        equivalente.lte(limiteCantidad) && equivalente.decimalPlaces() <= 3,
        "La equivalencia debe ser exacta con hasta tres decimales en la unidad del material.",
      );
      return {
        id: detalle!.id,
        material: detalle!.material,
        cantidad: cantidad.toString(),
        presentacion: detalle!.presentation,
        equivalente: equivalente.toString(),
        unidad: detalle!.unidad,
      };
    });
    return { ok: true as const, lineas };
  } catch (e) {
    return {
      ok: false as const,
      mensaje:
        e instanceof ReglaCompra
          ? e.message
          : "No se pudo verificar la recepción.",
    };
  }
}

/** Cierre y anulación comparten bloqueo, versión e idempotencia; el resultado se persiste con su operación. */
async function finalizarCompra(
  tipo: "CERRAR_PENDIENTE" | "ANULAR",
  entrada: unknown,
  referencia: unknown,
  clave: unknown,
): Promise<ResultadoCompra> {
  const datos =
    tipo === "CERRAR_PENDIENTE"
      ? cierreCompraSchema.safeParse(entrada)
      : motivoCompraSchema.safeParse(entrada);
  const ref = referenciaCompraSchema.safeParse(referencia),
    key = claveCompraSchema.safeParse(clave);
  if (!datos.success || !ref.success || !key.success)
    return {
      ok: false,
      mensaje: "Indica un motivo y referencias válidas para la operación.",
    };
  const huella = hash({ tipo, referencia: ref.data, datos: datos.data });
  const replay = (
    op: { type: string; requestHash: string; purchaseId: number } | null,
  ): ResultadoCompra | undefined =>
    op
      ? op.type === tipo && op.requestHash === huella
        ? {
            ok: true,
            id: op.purchaseId,
            mensaje: "Operación ya registrada; no se duplicaron los cambios.",
          }
        : {
            ok: false,
            mensaje: "La clave de operación pertenece a otra solicitud.",
          }
      : undefined;
  try {
    const previa = replay(
      await prisma.purchaseOperation.findUnique({
        where: { idempotencyKey: key.data },
      }),
    );
    if (previa) return previa;
    await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Purchase" WHERE id=${ref.data.id} FOR UPDATE`;
        const op = await tx.purchaseOperation.findUnique({
          where: { idempotencyKey: key.data },
        });
        if (op) {
          exigir(
            op.type === tipo && op.requestHash === huella,
            "La clave de operación pertenece a otra solicitud.",
          );
          return;
        }
        const compra = await tx.purchase.findUnique({
          where: { id: ref.data.id },
        });
        exigir(
          compra && !compra.deletedAt && !compra.voidedAt,
          "La compra está anulada, eliminada o ya no existe.",
        );
        exigir(
          compra!.version === ref.data.version,
          "La compra cambió. Actualiza antes de continuar.",
        );
        let closureId: number | undefined;
        if (tipo === "CERRAR_PENDIENTE") {
          const d = cierreCompraSchema.parse(datos.data);
          const linea = await tx.purchaseDetail.findFirst({
            where: { id: d.purchaseDetailId, purchaseId: compra!.id },
          });
          exigir(linea, "La línea no pertenece a esta compra.");
          const recibido = await tx.purchaseReceiptDetail.aggregate({
            where: { purchaseDetailId: linea!.id },
            _sum: { receivedQuantity: true },
          });
          const cerrado = await tx.purchasePendingClosure.aggregate({
            where: { purchaseDetailId: linea!.id },
            _sum: { quantity: true },
          });
          const pendiente = linea!.purchasedQuantity
            .minus(recibido._sum.receivedQuantity ?? 0)
            .minus(cerrado._sum.quantity ?? 0);
          exigir(
            pendiente.gt(0),
            "Esta línea no tiene cantidad pendiente para cerrar.",
          );
          closureId = (
            await tx.purchasePendingClosure.create({
              data: {
                purchaseId: compra!.id,
                purchaseDetailId: linea!.id,
                quantity: pendiente,
                reason: d.reason,
              },
            })
          ).id;
          // Cerrar cancela la recepción del restante: no modifica lo comprado ni genera movimientos.
          await tx.purchase.update({
            where: { id: compra!.id },
            data: { version: { increment: 1 } },
          });
        } else {
          const detalles = await tx.purchaseDetail.findMany({
            where: { purchaseId: compra!.id },
          });
          const recibidos = await tx.purchaseReceiptDetail.findMany({
            where: { purchaseId: compra!.id },
            orderBy: { id: "asc" },
          });
          const entradas = await tx.stockMovement.findMany({
            where: {
              purchaseReceiptDetailId: { in: recibidos.map((r) => r.id) },
            },
            orderBy: { id: "asc" },
          });
          const totales = new Map<number, Prisma.Decimal>(),
            primeras = new Map<number, number>();
          for (const recibido of recibidos) {
            const linea = detalles.find(
              (d) => d.id === recibido.purchaseDetailId,
            )!;
            const entrada = entradas.find(
              (m) => m.purchaseReceiptDetailId === recibido.id,
            );
            exigir(
              entrada &&
                entrada.type === "ENTRADA" &&
                entrada.purchaseDetailId === linea.id &&
                entrada.warehouseId === compra!.warehouseId &&
                entrada.rawMaterialId === linea.rawMaterialId &&
                entrada.quantity.eq(recibido.inventoryQuantity),
              "El historial de recepción no coincide con su entrada de inventario. Requiere revisión.",
            );
            totales.set(
              linea.rawMaterialId,
              (totales.get(linea.rawMaterialId) ?? new Prisma.Decimal(0)).plus(
                recibido.inventoryQuantity,
              ),
            );
            primeras.set(
              linea.rawMaterialId,
              Math.min(
                primeras.get(linea.rawMaterialId) ?? entrada!.id,
                entrada!.id,
              ),
            );
          }
          for (const id of [...totales.keys()].sort((a, b) => a - b))
            await tx.$queryRaw`SELECT id FROM "RawMaterial" WHERE id=${id} FOR UPDATE`;
          const saldos = await tx.warehouseStock.findMany({
            where: {
              warehouseId: compra!.warehouseId,
              rawMaterialId: { in: [...totales.keys()] },
            },
            orderBy: { id: "asc" },
          });
          for (const s of saldos)
            await tx.$queryRaw`SELECT id FROM "WarehouseStock" WHERE id=${s.id} FOR UPDATE`;
          for (const [material, total] of [...totales].sort(
            ([a], [b]) => a - b,
          )) {
            // Los IDs se asignan al registrar bajo el bloqueo de saldo; date puede ser manual y createdAt comenzar en otra transacción.
            const salida = await tx.stockMovement.findFirst({
              where: {
                warehouseId: compra!.warehouseId,
                rawMaterialId: material,
                id: { gt: primeras.get(material)! },
                OR: [
                  { type: "SALIDA" },
                  { type: "AJUSTE", quantity: { lt: 0 } },
                ],
              },
            });
            exigir(
              !salida,
              "No se puede anular: hubo consumo, traslado o ajuste negativo posterior a la recepción, aunque el stock se haya repuesto.",
            );
            const saldo = await tx.warehouseStock.findUnique({
              where: {
                warehouseId_rawMaterialId: {
                  warehouseId: compra!.warehouseId,
                  rawMaterialId: material,
                },
              },
            });
            exigir(
              saldo && saldo.quantity.gte(total),
              "El stock disponible no alcanza para revertir las recepciones.",
            );
            const kardex = await tx.stockMovement.aggregate({
              where: {
                warehouseId: compra!.warehouseId,
                rawMaterialId: material,
              },
              _sum: { quantity: true },
            });
            exigir(
              saldo!.quantity.eq(kardex._sum.quantity ?? 0),
              "El saldo no coincide con el Kardex. Revisa el inventario antes de anular.",
            );
            await tx.warehouseStock.update({
              where: { id: saldo!.id },
              data: { quantity: { decrement: total } },
            });
          }
          const ahora = new Date();
          for (const recibido of recibidos) {
            const linea = detalles.find(
              (d) => d.id === recibido.purchaseDetailId,
            )!;
            await tx.stockMovement.create({
              data: {
                date: ahora,
                type: "AJUSTE",
                quantity: recibido.inventoryQuantity.negated(),
                warehouseId: compra!.warehouseId,
                rawMaterialId: linea.rawMaterialId,
                purchaseDetailId: linea.id,
                reversedReceiptDetailId: recibido.id,
                note: `Anulación de compra ${compra!.documentNumber}: ${datos.data.reason}`,
              },
            });
          }
          await tx.purchase.update({
            where: { id: compra!.id },
            data: {
              voidedAt: ahora,
              voidReason: datos.data.reason,
              version: { increment: 1 },
            },
          });
        }
        await tx.purchaseOperation.create({
          data: {
            idempotencyKey: key.data,
            type: tipo,
            requestHash: huella,
            purchaseId: compra!.id,
            closureId,
          },
        });
      },
      { maxWait: 10000, timeout: 20000 },
    );
    return {
      ok: true,
      id: ref.data.id,
      mensaje:
        tipo === "ANULAR"
          ? "Compra anulada; recepciones revertidas conservando su historial."
          : "Pendiente de la línea cerrado; stock sin cambios.",
    };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const previa = replay(
        await prisma.purchaseOperation.findUnique({
          where: { idempotencyKey: key.data },
        }),
      );
      if (previa) return previa;
    }
    return errorCompra(e);
  }
}
export async function cerrarPendienteCompra(
  datos: unknown,
  referencia: unknown,
  clave: unknown,
) {
  return finalizarCompra("CERRAR_PENDIENTE", datos, referencia, clave);
}
export async function anularCompra(
  datos: unknown,
  referencia: unknown,
  clave: unknown,
) {
  return finalizarCompra("ANULAR", datos, referencia, clave);
}

/** Equivalencia orientativa; guardar vuelve a validar cantidades y factor con Decimal. */
export function previsualizarEquivalenciaCompra(entrada: unknown) {
  const v = lineaCompraSchema
    .pick({ purchasedQuantity: true, unitFactor: true })
    .safeParse(entrada);
  if (!v.success)
    return {
      ok: false as const,
      mensaje: "Indica cantidades positivas con hasta tres decimales.",
    };
  try {
    const cantidadComprada = new Prisma.Decimal(v.data.purchasedQuantity);
    const factor = new Prisma.Decimal(v.data.unitFactor);
    const equivalente = cantidadComprada.times(factor);
    exigir(
      cantidadComprada.gt(0) &&
        factor.gt(0) &&
        cantidadComprada.lte(limiteCantidad) &&
        factor.lte(limiteCantidad),
      "Cantidad y contenido deben ser positivos y estar dentro del límite.",
    );
    exigir(
      equivalente.lte(limiteCantidad) && equivalente.decimalPlaces() <= 3,
      "La equivalencia debe ser exacta con hasta tres decimales en la unidad del material.",
    );
    const cantidad = equivalente.toString();
    return { ok: true as const, cantidad };
  } catch (e) {
    return {
      ok: false as const,
      mensaje:
        e instanceof ReglaCompra
          ? e.message
          : "No se pudo calcular la equivalencia.",
    };
  }
}
