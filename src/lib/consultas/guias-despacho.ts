import { exigirAcceso } from "@/lib/seguridad/acceso";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { fechaCalendarioValida } from "@/lib/fechas-chile";
import { hoyOrden } from "@/lib/servicios/ordenes-compra-cliente";
import { rutValido } from "@/lib/validaciones/rut";

const decimal = (valor: Prisma.Decimal | string | number) => new Prisma.Decimal(valor);
const cero = () => decimal(0);
const fecha = (valor: Date | null) => valor?.toISOString().slice(0, 10) ?? null;
const texto = (valor: unknown) => typeof valor === "string" && valor.trim().length > 0;
const objeto = (valor: Prisma.JsonValue | null): Record<string, unknown> | null =>
  valor && typeof valor === "object" && !Array.isArray(valor) ? valor : null;

const filtrosSchema = z.object({
  q: z.string().trim().max(150).default(""),
  pagina: z.coerce.number().int().positive().max(1_000_000).default(1),
  ot: z.coerce.number().int().positive().max(2147483647).optional(),
  estado: z.enum(["TODOS", "CONFIRMADA", "CORREGIDA", "CORRECCION", "LEGADO"]).default("TODOS"),
  orden: z.enum(["fecha", "folio", "cliente", "ot"]).default("fecha"),
  sentido: z.enum(["asc", "desc"]).default("desc"),
  desde: z.string().default("").refine(v => !v || fechaCalendarioValida(v)),
  hasta: z.string().default("").refine(v => !v || fechaCalendarioValida(v)),
}).refine(v => !v.desde || !v.hasta || v.desde <= v.hasta);

/** Listado documental. El legado se muestra, pero nunca participa en entregas netas. */
export async function listarGuiasDespacho(entrada: unknown) {
  await exigirAcceso("guias.leer");

  const parsed = filtrosSchema.safeParse(entrada);
  const f = parsed.success ? parsed.data : filtrosSchema.parse({});
  const legado = f.estado === "LEGADO";
  const where: Prisma.DeliveryNoteWhereInput = {
    schemaVersion: legado ? null : 1,
    ...(f.ot ? { workOrderId: f.ot } : {}),
    ...(f.estado === "CORRECCION" ? { kind: "CORRECCION" } : {}),
    ...(f.estado === "CONFIRMADA" ? { kind: "ENTREGA", corrections: { none: {} } } : {}),
    ...(f.estado === "CORREGIDA" ? { kind: "ENTREGA", corrections: { some: {} } } : {}),
    ...(f.desde || f.hasta ? { [legado ? "date" : "dispatchDate"]: {
      ...(f.desde ? { gte: new Date(`${f.desde}T00:00:00Z`) } : {}),
      ...(f.hasta ? { lte: new Date(`${f.hasta}T23:59:59.999Z`) } : {}),
    } } : {}),
    ...(f.q ? { OR: [
      { folio: { folio: { contains: f.q, mode: "insensitive" } } },
      { salesOrder: { clientName: { contains: f.q, mode: "insensitive" } } },
      { workOrder: { folio: { folio: { contains: f.q, mode: "insensitive" } } } },
      ...(/^\d+$/.test(f.q) && Number.isSafeInteger(Number(f.q)) && Number(f.q) <= 2147483647 ? [{ workOrderId: Number(f.q) }] : []),
    ] } : {}),
  };
  return prisma.$transaction(async tx => {
    const legadas = await tx.deliveryNote.count({ where: { schemaVersion: null } });
    const total = await tx.deliveryNote.count({ where });
    const paginas = Math.max(1, Math.ceil(total / 10));
    const pagina = Math.min(f.pagina, paginas);
    const campo = f.orden === "folio" ? "folio" : f.orden === "cliente" ? "salesOrder" : f.orden === "ot" ? "workOrderId" : legado ? "date" : "dispatchDate";
    const orderBy: Prisma.DeliveryNoteOrderByWithRelationInput = campo === "folio" ? { folio: { folio: f.sentido } }
      : campo === "salesOrder" ? { salesOrder: { clientName: f.sentido } }
      : { [campo]: f.sentido };
    const filas = await tx.deliveryNote.findMany({ where, orderBy: [orderBy, { id: "desc" }], skip: (pagina - 1) * 10, take: 10,
      select: { id: true, schemaVersion: true, kind: true, date: true, dispatchDate: true, confirmedAt: true,
        workOrderId: true, salesOrderId: true, folioId: true } });
    const trabajos = await tx.workOrder.findMany({ where: { id: { in: filas.map(g => g.workOrderId) } }, select: { id: true, folioId: true } });
    const ordenes = await tx.salesOrder.findMany({ where: { id: { in: filas.flatMap(g => g.salesOrderId === null ? [] : [g.salesOrderId]) } }, select: { id: true, clientName: true } });
    const folios = await tx.documentFolio.findMany({ where: { id: { in: [
      ...filas.flatMap(g => g.folioId === null ? [] : [g.folioId]),
      ...trabajos.flatMap(w => w.folioId === null ? [] : [w.folioId]),
    ] } }, select: { id: true, folio: true } });
    const cuentas = await tx.deliveryNoteLine.groupBy({ by: ["deliveryNoteId"], where: { deliveryNoteId: { in: filas.map(g => g.id) } }, _count: { _all: true } });
    const correcciones = await tx.deliveryNote.groupBy({ by: ["correctsDeliveryNoteId"], where: { correctsDeliveryNoteId: { in: filas.map(g => g.id) } }, _count: { _all: true } });
    return { filtros: { ...f, pagina }, total, paginas, legadas, avisoLegado: legadas > 0,
      filas: filas.map(g => ({ id: g.id, legado: g.schemaVersion === null, folio: folios.find(f => f.id === g.folioId)?.folio ?? null,
        fecha: fecha(g.dispatchDate ?? g.date), confirmadoEn: g.confirmedAt?.toISOString() ?? null,
        workOrderId: g.workOrderId, workOrderFolio: folios.find(f => f.id === trabajos.find(w => w.id === g.workOrderId)?.folioId)?.folio ?? null,
        salesOrderId: g.salesOrderId, cliente: ordenes.find(o => o.id === g.salesOrderId)?.clientName ?? null,
        estado: g.schemaVersion === null ? "LEGADO_NO_CONCILIADO" : g.kind === "CORRECCION" ? "CORRECCION" : correcciones.some(c => c.correctsDeliveryNoteId === g.id) ? "CORREGIDA" : "CONFIRMADA",
        partidas: cuentas.find(c => c.deliveryNoteId === g.id)?._count._all ?? 0,
      })) };
  }, { isolationLevel: "RepeatableRead" });
}

/** Consulta consistente para preparar una guía. No autoriza la escritura posterior. */
export async function prepararGuiaDespacho(workOrderId: number) {
  await exigirAcceso("guias.leer");

  if (!Number.isSafeInteger(workOrderId) || workOrderId <= 0) throw new Error("Referencia de OT inválida.");
  return prisma.$transaction(async tx => {
    const ot = await tx.workOrder.findUnique({ where: { id: workOrderId } });
    if (!ot) throw new Error("La OT no existe.");
    const occ = ot.salesOrderId === null ? null : await tx.salesOrder.findUnique({ where: { id: ot.salesOrderId } });
    const lineas = await tx.workOrderLine.findMany({ where: { workOrderId }, orderBy: [{ position: "asc" }, { id: "asc" }] });
    const comerciales = occ ? await tx.salesOrderDetail.findMany({ where: { salesOrderId: occ.id } }) : [];
    const entregas = await tx.deliveryNoteLine.findMany({ where: { workOrderId, deliveryNote: { schemaVersion: 1 } },
      select: { salesOrderDetailId: true, quantity: true, deliveryNote: { select: { kind: true } } } });
    const registros = await tx.productionRecord.findMany({ where: { workOrderId }, select: { id: true, workOrderLineId: true, quantity: true, reversal: { select: { id: true } } } });
    const reservas = await tx.$queryRaw<{ id: number; workOrderLineId: number; purpose: string; warehouseId: number; rawMaterialId: number | null; productId: number | null; active: string }[]>`
      SELECT id,"workOrderLineId",purpose::text,"warehouseId","rawMaterialId","productId",public.reserva_activa_asignacion(id)::text AS active
      FROM "StockReservationAllocation" WHERE "workOrderId"=${workOrderId} AND purpose IN ('ENTREGA_PRODUCTO','ENTREGA_DIRECTA_MP') ORDER BY id`;
    const bodegas = await tx.warehouse.findMany({ where: { id: { in: [...new Set(reservas.map(r => r.warehouseId))] } }, select: { id: true, name: true, classification: true } });
    const filtrosMateria = reservas.filter(r => r.rawMaterialId !== null).map(r => ({ warehouseId: r.warehouseId, rawMaterialId: r.rawMaterialId! }));
    const filtrosProducto = reservas.filter(r => r.productId !== null).map(r => ({ warehouseId: r.warehouseId, productId: r.productId! }));
    const materia = await tx.warehouseStock.findMany({ where: { OR: filtrosMateria.length ? filtrosMateria : [{ id: -1 }] },
      select: { warehouseId: true, rawMaterialId: true, quantity: true } });
    const productos = await tx.productWarehouseStock.findMany({ where: { OR: filtrosProducto.length ? filtrosProducto : [{ id: -1 }] },
      select: { warehouseId: true, productId: true, quantity: true } });
    const movimientosMateria = await tx.stockMovement.groupBy({ by: ["warehouseId", "rawMaterialId"],
      where: { OR: filtrosMateria.length ? filtrosMateria : [{ id: -1 }] },
      _sum: { quantity: true } });
    const movimientosProducto = await tx.productStockMovement.groupBy({ by: ["warehouseId", "productId"],
      where: { OR: filtrosProducto.length ? filtrosProducto : [{ id: -1 }] },
      _sum: { quantity: true } });
    const totalesReserva = await tx.$queryRaw<{ warehouseId: number; rawMaterialId: number | null; productId: number | null; reserved: string }[]>`
      SELECT DISTINCT "warehouseId","rawMaterialId","productId",public.reserva_activa_recurso("rawMaterialId","productId","warehouseId")::text AS reserved
      FROM "StockReservationAllocation" WHERE "workOrderId"=${workOrderId} AND purpose IN ('ENTREGA_PRODUCTO','ENTREGA_DIRECTA_MP')`;
    const folio = ot.folioId ? await tx.documentFolio.findUnique({ where: { id: ot.folioId }, select: { folio: true } }) : null;
    const folioOcc = occ?.folioId ? await tx.documentFolio.findUnique({ where: { id: occ.folioId }, select: { folio: true } }) : null;
    const numeracion = await tx.documentNumbering.findUnique({ where: { type: "GUIA_DESPACHO" }, select: { padding: true, nextNumber: true } });
    const emisor = objeto(occ?.companySnapshot ?? null), cliente = objeto(occ?.clientSnapshot ?? null);
    const motivos: string[] = [];
    if (ot.schemaVersion !== 1 || !occ || occ.status !== "CONFIRMADA" || !occ.folioId || ot.salesOrderId !== occ.id)
      motivos.push("Se requiere una OCC confirmada y una OT comercial nueva vinculada.");
    if (!["EN_PROCESO", "FINALIZADO"].includes(ot.status) || !ot.startedDate) motivos.push("La OT debe estar iniciada o finalizada.");
    if (!numeracion?.padding || numeracion.nextNumber === null) motivos.push("Configura la numeración de Guía de Despacho.");
    if (!emisor || !["legalName", "rut", "address", "city"].every(k => texto(emisor[k])) || !rutValido(String(emisor.rut))) motivos.push("El emisor histórico de la OCC está incompleto.");
    if (!cliente || !["rut", "name", "branchName", "address", "city", "branchContact", "branchPhone"].every(k => texto(cliente[k])) || !rutValido(String(cliente.rut))) motivos.push("El cliente o la sucursal histórica de la OCC están incompletos.");
    if (!occ?.acceptanceDate) motivos.push("Falta la fecha histórica de aceptación de la OCC.");
    if (lineas.length === 0 || lineas.length !== comerciales.length || lineas.some(l => !comerciales.some(c => c.id === l.salesOrderDetailId && c.quantity.eq(l.quantity) && c.unitMeasureId === l.unitMeasureId)))
      motivos.push("Las líneas de OCC y OT no coinciden íntegramente.");
    const hoy = hoyOrden();
    const partidas = lineas.map(l => {
      const c = comerciales.find(v => v.id === l.salesOrderDetailId);
      const contratado = c?.quantity ?? l.quantity;
      const entregado = entregas.filter(e => e.salesOrderDetailId === l.salesOrderDetailId).reduce((v, e) => e.deliveryNote.kind === "CORRECCION" ? v.minus(e.quantity) : v.plus(e.quantity), cero());
      const ejecutado = registros.filter(r => r.workOrderLineId === l.id && !r.reversal).reduce((v, r) => v.plus(r.quantity), cero());
      const pendiente = contratado.minus(entregado);
      const asignaciones = reservas.filter(r => r.workOrderLineId === l.id && ((l.executionMode === "CATALOGO" && r.purpose === "ENTREGA_PRODUCTO" && r.productId === l.productId) ||
        (l.executionMode === "VENTA_DIRECTA_MP" && r.purpose === "ENTREGA_DIRECTA_MP" && r.rawMaterialId === l.rawMaterialId)));
      const disponibles = asignaciones.map(r => {
        const b = bodegas.find(v => v.id === r.warehouseId);
        const saldo = r.productId === null ? materia.find(v => v.warehouseId === r.warehouseId && v.rawMaterialId === r.rawMaterialId)?.quantity ?? cero()
          : productos.find(v => v.warehouseId === r.warehouseId && v.productId === r.productId)?.quantity ?? cero();
        const total = decimal(totalesReserva.find(v => v.warehouseId === r.warehouseId && v.rawMaterialId === r.rawMaterialId && v.productId === r.productId)?.reserved ?? 0);
        const sumaKardex = r.productId === null
          ? movimientosMateria.find(v => v.warehouseId === r.warehouseId && v.rawMaterialId === r.rawMaterialId)?._sum.quantity ?? cero()
          : movimientosProducto.find(v => v.warehouseId === r.warehouseId && v.productId === r.productId)?._sum.quantity ?? cero();
        const kardexConciliado = saldo.eq(sumaKardex);
        const propia = asignaciones.filter(a => a.warehouseId === r.warehouseId).reduce((v, a) => v.plus(a.active), cero());
        const libre = saldo.minus(total);
        const compatible = b && (r.productId !== null ? ["PRODUCTO_TERMINADO", "MIXTA"].includes(b.classification ?? "") : ["MATERIA_PRIMA", "MIXTA"].includes(b.classification ?? ""));
        return { warehouseId: r.warehouseId, bodega: b?.name ?? "Bodega no disponible", compatible: Boolean(compatible), kardexConciliado,
          saldo: saldo.toFixed(3), reservadoPropio: propia.toFixed(3), reservadoTotal: total.toFixed(3), libre: libre.toFixed(3),
          utilizable: Prisma.Decimal.max(0, Prisma.Decimal.min(saldo, propia, libre.plus(propia))).toFixed(3) };
      }).filter((r, i, all) => all.findIndex(v => v.warehouseId === r.warehouseId) === i);
      const motivosLinea: string[] = [];
      if (!c || c.kind !== l.kind || c.description !== l.description || c.code !== l.code || c.productId !== l.productId || c.rawMaterialId !== l.rawMaterialId) motivosLinea.push("La partida comercial no coincide con la OT.");
      if (pendiente.lte(0)) motivosLinea.push("No queda cantidad comercial pendiente.");
      if (pendiente.gt(contratado) || entregado.lt(0)) motivosLinea.push("La entrega neta histórica requiere conciliación.");
      if (["SERVICIO", "A_MEDIDA"].includes(l.executionMode) && ejecutado.minus(entregado).lte(0)) motivosLinea.push("No hay ejecución neta sin entregar.");
      if (["CATALOGO", "VENTA_DIRECTA_MP"].includes(l.executionMode) && !disponibles.some(d => d.compatible && d.kardexConciliado && decimal(d.reservadoPropio).gt(0) && decimal(d.utilizable).gt(0))) motivosLinea.push("No hay reserva propia y stock físico conciliado elegibles.");
      return { id: l.id, salesOrderDetailId: l.salesOrderDetailId, posicion: l.position, modo: l.executionMode,
        descripcion: l.description, codigo: l.code, rawMaterialId: l.rawMaterialId, productId: l.productId,
        unidad: l.unitAbbreviation, contratado: contratado.toFixed(3), ejecutadoNeto: ejecutado.toFixed(3),
        entregadoNeto: entregado.toFixed(3), pendiente: pendiente.toFixed(3), bodegas: disponibles, motivos: motivosLinea,
        maximoPrevisualizable: Prisma.Decimal.max(0, ["SERVICIO", "A_MEDIDA"].includes(l.executionMode)
          ? Prisma.Decimal.min(pendiente, ejecutado.minus(entregado))
          : Prisma.Decimal.min(pendiente, disponibles.filter(b => b.compatible && b.kardexConciliado).reduce((v, b) => v.plus(b.utilizable), cero()))).toFixed(3) };
    });
    if (!partidas.some(p => p.motivos.length === 0)) motivos.push("No hay partidas elegibles para entregar.");
    return { workOrderId: ot.id, workOrderVersion: ot.version, workOrderStatus: ot.status, workOrderFolio: folio?.folio ?? null,
      salesOrderId: occ?.id ?? null, salesOrderVersion: occ?.version ?? null, salesOrderFolio: folioOcc?.folio ?? null,
      cliente: occ?.clientName ?? null, sucursal: cliente ? { nombre: cliente.branchName, direccion: cliente.address, ciudad: cliente.city, contacto: cliente.branchContact } : null,
      fechaMinima: [fecha(ot.startedDate), fecha(occ?.acceptanceDate ?? null)].filter((v): v is string => Boolean(v)).sort().at(-1) ?? null,
      fechaMaxima: hoy, elegible: motivos.length === 0, motivos, partidas,
      aviso: "Previsualización informativa: al confirmar se revalidan cantidades, reservas y stock bajo bloqueo." };
  }, { isolationLevel: "RepeatableRead", timeout: 30_000 });
}

export type ListadoGuiasDespacho = Awaited<ReturnType<typeof listarGuiasDespacho>>;
export type PreparacionGuiaDespacho = Awaited<ReturnType<typeof prepararGuiaDespacho>>;

/** Preparación informativa de partidas aún corregibles; el servicio revalida bajo bloqueo. */
export async function prepararCorreccionGuia(deliveryNoteId: number) {
  await exigirAcceso("guias.leer");

  if (!Number.isSafeInteger(deliveryNoteId) || deliveryNoteId <= 0 || deliveryNoteId > 2147483647) return null;
  return prisma.$transaction(async tx => {
    const guide = await tx.deliveryNote.findUnique({ where: { id: deliveryNoteId } });
    if (guide?.schemaVersion !== 1 || guide.kind !== "ENTREGA" || !guide.dispatchDate) return null;
    const work = await tx.workOrder.findUniqueOrThrow({ where: { id: guide.workOrderId } });
    const folio = guide.folioId ? await tx.documentFolio.findUnique({ where: { id: guide.folioId } }) : null;
    const lines = await tx.deliveryNoteLine.findMany({ where: { deliveryNoteId }, orderBy: { position: "asc" } });
    const corrections = await tx.deliveryNoteLine.findMany({ where: { correctsDeliveryNoteLineId: { in: lines.map(l => l.id) } } });
    const warehouses = await tx.warehouse.findMany({ where: { id: { in: lines.flatMap(l => l.warehouseId === null ? [] : [l.warehouseId]) } }, select: { id: true, name: true } });
    return { deliveryNoteId, folio: folio?.folio ?? `#${deliveryNoteId}`, version: work.version,
      fechaMinima: fecha(guide.dispatchDate)!, fechaMaxima: hoyOrden(),
      lines: lines.map(l => ({ id: l.id, descripcion: l.description, unidad: l.unitAbbreviation, quantity: l.quantity.toFixed(3),
        pendiente: l.quantity.minus(corrections.filter(c => c.correctsDeliveryNoteLineId === l.id).reduce((n,c) => n.plus(c.quantity), cero())).toFixed(3),
        warehouseId: l.warehouseId, bodega: warehouses.find(b => b.id === l.warehouseId)?.name ?? null })),
    };
  }, { isolationLevel: "RepeatableRead" });
}
export type PreparacionCorreccionGuia = NonNullable<Awaited<ReturnType<typeof prepararCorreccionGuia>>>;

/** Detalle documental y trazabilidad leídos en una copia coherente, sin escribir saldos. */
export async function consultarGuiaDespacho(id: number) {
  await exigirAcceso("guias.leer");

  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) return null;
  return prisma.$transaction(async tx => {
    const g = await tx.deliveryNote.findUnique({ where: { id } });
    if (!g) return null;
    const w = await tx.workOrder.findUniqueOrThrow({ where: { id: g.workOrderId } });
    const lineas = await tx.deliveryNoteLine.findMany({ where: { deliveryNoteId: id }, orderBy: { position: "asc" } });
    const documentos = await tx.deliveryNote.findMany({ where: { workOrderId: w.id, schemaVersion: 1 }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    const todas = await tx.deliveryNoteLine.findMany({ where: { deliveryNoteId: { in: documentos.map(d => d.id) } }, orderBy: { id: "asc" } });
    const contratadas = await tx.salesOrderDetail.findMany({ where: { salesOrderId: g.salesOrderId ?? -1 }, orderBy: { position: "asc" } });
    const s = g.salesOrderId ? await tx.salesOrder.findUnique({ where: { id: g.salesOrderId } }) : null;
    const folios = await tx.documentFolio.findMany({ where: { id: { in: [...documentos.flatMap(d => d.folioId ? [d.folioId] : []), ...(w.folioId ? [w.folioId] : []), ...(s?.folioId ? [s.folioId] : [])] } } });
    const bodegas = await tx.warehouse.findMany({ where: { id: { in: lineas.flatMap(l => l.warehouseId ? [l.warehouseId] : []) } }, select: { id: true, name: true } });
    const raw = await tx.stockMovement.findMany({ where: { deliveryNoteLineId: { in: lineas.map(l => l.id) } }, orderBy: { id: "asc" } });
    const product = await tx.productStockMovement.findMany({ where: { deliveryNoteLineId: { in: lineas.map(l => l.id) } }, orderBy: { id: "asc" } });
    const eventos = await tx.stockReservationEvent.findMany({ where: { deliveryNoteLineId: { in: lineas.map(l => l.id) } }, orderBy: { id: "asc" } });
    const restituciones = await tx.stockReservationAllocation.findMany({ where: { correctionDeliveryNoteLineId: { in: lineas.map(l => l.id) } }, orderBy: { id: "asc" } });
    const folio = (folioId: number | null | undefined) => folios.find(f => f.id === folioId)?.folio ?? null;
    const corrigieron = documentos.some(d => d.correctsDeliveryNoteId === id);
    return { id: g.id, legado: g.schemaVersion === null, tipo: g.kind, folio: folio(g.folioId),
      estado: g.schemaVersion === null ? "Legado no conciliado" : g.kind === "CORRECCION" ? "Corrección confirmada" : corrigieron ? "Entrega con correcciones" : "Entrega confirmada",
      fecha: fecha(g.dispatchDate ?? g.date), registrado: g.createdAt.toISOString(), confirmado: g.confirmedAt?.toISOString() ?? null,
      workOrderId: w.id, workOrderFolio: folio(w.folioId), salesOrderId: g.salesOrderId, salesOrderFolio: folio(s?.folioId),
      emisor: objeto(g.companySnapshot), cliente: objeto(g.clientSnapshot), destino: objeto(g.destinationSnapshot),
      nota: g.note, motivo: g.correctionReason, recepcionFisica: g.physicalRestitutionConfirmed, originalId: g.correctsDeliveryNoteId,
      originalFolio: folio(documentos.find(d => d.id === g.correctsDeliveryNoteId)?.folioId),
      lineas: lineas.map(l => ({ id: l.id, posicion: l.position, descripcion: l.description, codigo: l.resourceCode, modo: l.executionMode,
        quantity: l.quantity.toFixed(3), unidad: l.unitAbbreviation, warehouseId: l.warehouseId, bodega: bodegas.find(b => b.id === l.warehouseId)?.name ?? null,
        conformidad: l.conformityName, fechaConformidad: fecha(l.conformityDate), originalLineId: l.correctsDeliveryNoteLineId,
        corregido: todas.filter(c => c.correctsDeliveryNoteLineId === l.id).reduce((n,c) => n.plus(c.quantity), cero()).toFixed(3),
        movimientos: [...raw.filter(m => m.deliveryNoteLineId === l.id).map(m => ({ id: m.id, familia: "Materia prima", tipo: m.type, quantity: m.quantity.toFixed(3), registrado: m.createdAt.toISOString() })),
          ...product.filter(m => m.deliveryNoteLineId === l.id).map(m => ({ id: m.id, familia: "Producto terminado", tipo: m.type, quantity: m.quantity.toFixed(3), registrado: m.createdAt.toISOString() }))],
        reservas: eventos.filter(e => e.deliveryNoteLineId === l.id).map(e => ({ id: e.id, asignacion: e.allocationId, quantity: e.quantity.toFixed(3) })),
        restituciones: restituciones.filter(a => a.correctionDeliveryNoteLineId === l.id).map(a => ({ id: a.id, eventoOriginal: a.restoresReservationEventId, quantity: a.quantity.toFixed(3) })),
      })),
      compromiso: contratadas.map(l => {
        const entregado = todas.filter(x => x.salesOrderDetailId === l.id).reduce((n,x) => documentos.find(d => d.id === x.deliveryNoteId)?.kind === "CORRECCION" ? n.minus(x.quantity) : n.plus(x.quantity), cero());
        return { id: l.id, descripcion: l.description, unidad: l.unitAbbreviation, contratado: l.quantity.toFixed(3), entregado: entregado.toFixed(3), pendiente: l.quantity.minus(entregado).toFixed(3) };
      }),
      historial: documentos.map(d => ({ id: d.id, folio: folio(d.folioId), tipo: d.kind, fecha: fecha(d.dispatchDate), registrado: d.createdAt.toISOString(), originalId: d.correctsDeliveryNoteId, motivo: d.correctionReason })),
    };
  }, { isolationLevel: "RepeatableRead", timeout: 30_000 });
}
export type GuiaConsultada = NonNullable<Awaited<ReturnType<typeof consultarGuiaDespacho>>>;
