import { anotarMutacion } from "@/lib/seguridad/autoria";
import { tienePermiso } from "@/lib/seguridad/permisos";
import { exigirAcceso, exigirAccesoEnTransaccion } from "@/lib/seguridad/acceso";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { tieneReferenciaHistoricaPlan } from "./referencias-plan-trabajo";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { productoSchema, referenciaProductoSchema } from "@/lib/validaciones/producto";
import type { MaterialReceta, Producto, ResultadoProducto } from "@/lib/tipos/producto";
import { almacenImagenesProducto, prepararImagenProducto, URL_IMAGEN_PRODUCTO } from "@/lib/almacenamiento/imagenes-producto";
const obsoleto: ResultadoProducto = { ok: false, mensaje: "El producto cambió. Actualiza el listado y vuelve a abrirlo." };
/** Relaciones por lotes secuenciales: no disparar consultas hermanas simultáneas en pg. */
async function cargar(tx: Prisma.TransactionClient, ids?: number[]): Promise<Producto[]> {
  const sesion = await exigirAccesoEnTransaccion(tx, "catalogos.leer");
  const verPrecios = tienePermiso(sesion.roles,"precios.leer");
  const filas = await tx.product.findMany({ where: { deletedAt: null, ...(ids && { id: { in: ids } }) }, orderBy: [{ name: "asc" }, { id: "asc" }] });
  const claves = filas.map(p => p.id);
  const unidades = await tx.unitMeasure.findMany({ where: { id: { in: filas.map(p => p.unitMeasureId) } } });
  const recetas = await tx.productRecipe.findMany({ where: { productId: { in: claves } }, orderBy: { id: "asc" } });
  const materiales = await tx.rawMaterial.findMany({ where: { id: { in: recetas.map(r => r.rawMaterialId) } } });
  const unidadesMaterial = await tx.unitMeasure.findMany({ where: { id: { in: materiales.map(m => m.unitMeasureId) } } });
  const imagenes = await tx.productImage.findMany({ where: { productId: { in: claves }, removedAt: null }, orderBy: [{ position: "asc" }, { id: "asc" }] });
  const referencias = await tx.quoteDetail.groupBy({ by: ["productId"], where: { productId: { in: claves } }, _count: { _all: true } });
  const stocks = await tx.productWarehouseStock.groupBy({ by: ["productId"], where: { productId: { in: claves } }, _count: { _all: true } });
  return filas.map(p => ({ id: p.id, code: p.code, name: p.name, description: p.description, unitMeasureId: p.unitMeasureId, unidad: unidades.map(u => ({ id: u.id, name: u.name, abbreviation: u.abbreviation })).find(u => u.id === p.unitMeasureId)!, suggestedPrice: verPrecios ? p.suggestedPrice?.toFixed(0) ?? null : null, version: p.version, inventario: stocks.find(s => s.productId === p.id)?._count._all ?? 0, cotizaciones: referencias.find(r => r.productId === p.id)?._count._all ?? 0,
    recipes: recetas.filter(r => r.productId === p.id).map(r => { const m = materiales.find(m => m.id === r.rawMaterialId)!, u = unidadesMaterial.find(u => u.id === m.unitMeasureId)!; return { rawMaterialId: m.id, unitMeasureId: m.unitMeasureId, quantity: r.quantity.toString(), name: m.name, code: m.code, unitName: u.name, abbreviation: u.abbreviation }; }),
    images: imagenes.filter(i => i.productId === p.id).map(i => ({ id: i.id, url: URL_IMAGEN_PRODUCTO + i.fileKey })),
  }));
}
export async function listarProductos() {
  await exigirAcceso("catalogos.leer");
 return prisma.$transaction(tx => cargar(tx), { isolationLevel: "RepeatableRead" }); }
export async function listarMaterialesReceta(): Promise<MaterialReceta[]> {
  await exigirAcceso("catalogos.leer");

  const materiales = await prisma.rawMaterial.findMany({ include: { unitMeasure: true }, orderBy: [{ name: "asc" }, { id: "asc" }] });
  return materiales.map(m => ({ id: m.id, name: m.name, code: m.code, unitMeasureId: m.unitMeasureId, unitName: m.unitMeasure.name, abbreviation: m.unitMeasure.abbreviation }));
}
export async function consultarProducto(id: unknown): Promise<ResultadoProducto> {
  await exigirAcceso("catalogos.leer");

  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) return { ok: false, mensaje: "Producto inválido." };
  try { const filas = await prisma.$transaction(tx => cargar(tx, [id]), { isolationLevel: "RepeatableRead" }); return filas[0] ? { ok: true, mensaje: "Producto consultado.", producto: filas[0] } : obsoleto; }
  catch (error) { return errorOperacion(error); }
}
function errorOperacion(error: unknown): ResultadoProducto {
  if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2003", "P2025"].includes(error.code)) return { ok: false, mensaje: "El producto, material o unidad cambió o tiene referencias. Actualiza el listado." };
  console.error("Error en Productos:", error);
  return { ok: false, mensaje: "No se pudo completar la operación. Revisa la conexión e inténtalo nuevamente." };
}
export async function guardarProducto(datos: unknown, referencia?: unknown, archivos: File[] = [], clave?: unknown): Promise<ResultadoProducto> {
  const sesion = await exigirAcceso("catalogos.operar");
  const verPrecios = tienePermiso(sesion.roles,"precios.leer");

  const validacion = productoSchema.safeParse(datos), ref = referencia === undefined ? undefined : referenciaProductoSchema.safeParse(referencia);
  if (!validacion.success) return { ok: false, mensaje: validacion.error.issues[0].message };
  if ((ref && !ref.success) || (!ref && !z.uuid().safeParse(clave).success)) return { ok: false, mensaje: "Referencia o clave de creación inválida." };
  const d = validacion.data;
  const indices = d.images.flatMap(i => "fileIndex" in i ? [i.fileIndex] : []);
  if (archivos.length > 10 || indices.length !== archivos.length || indices.some(i => i >= archivos.length) || (!ref && d.images.some(i => "id" in i))) return { ok: false, mensaje: "La selección de imágenes no es válida." };
  const nuevas: string[] = [], almacen = almacenImagenesProducto();
  let preparadas: Buffer[];
  try { preparadas = []; for (const f of archivos) preparadas.push(await prepararImagenProducto(f)); }
  catch (error) { return { ok: false, mensaje: error instanceof Error ? error.message : "No se pudieron preparar las imágenes." }; }
  const receta = d.recipes.map(r => ({ ...r, quantity: new Prisma.Decimal(r.quantity.replace(",", ".")) }));
  const huella = createHash("sha256").update(JSON.stringify({ ...d, recipes: receta.map(r => ({ ...r, quantity: r.quantity.toFixed(3) })), files: preparadas.map(b => createHash("sha256").update(b).digest("hex")) })).digest("hex");
  try {
    return await prisma.$transaction(async tx => {
      await exigirAccesoEnTransaccion(tx, "catalogos.operar");

      if (!ref) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${String(clave).toLowerCase()}, 72113))`;
        const anterior = await tx.product.findUnique({ where: { creationKey: String(clave) } });
        if (anterior) {
          if (anterior.creationFingerprint !== huella) return { ok: false, mensaje: "La clave de creación ya se usó con otros datos." };
          return anterior.deletedAt ? { ok: false, mensaje: "Este producto ya se creó y luego se eliminó. No se recreará por reintento." } : { ok: true, mensaje: "Producto ya guardado; reintento reconocido.", producto: (await cargar(tx, [anterior.id]))[0] };
        }
      }
      // Materiales ascendentes antes del producto, también al cambiar/eliminar recetas.
      const anteriores = ref?.success ? await tx.productRecipe.findMany({ where: { productId: ref.data.id }, select: { rawMaterialId: true } }) : [];
      const materiales = [...new Set([...anteriores.map(r => r.rawMaterialId), ...receta.map(r => r.rawMaterialId)])].sort((a, b) => a - b);
      for (const id of materiales) await tx.$queryRaw`SELECT id FROM "RawMaterial" WHERE id = ${id} FOR UPDATE`;
      if (ref?.success) {
        await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${ref.data.id} FOR UPDATE`;
        const actual = await tx.product.findUnique({ where: { ...ref.data, deletedAt: null } });
        if (!actual) return obsoleto;
        if (actual.unitMeasureId !== d.unitMeasureId && (anteriores.length || await tx.quoteDetail.count({ where: { productId: actual.id } }) || await tx.productWarehouseStock.count({ where: { productId: actual.id } }) || await tx.workOrderLine.count({ where: { productId: actual.id } }) || await tieneReferenciaHistoricaPlan(tx, "Product", actual.id))) return { ok: false, mensaje: "La unidad está bloqueada por recetas, cotizaciones, trabajos o inventario asociados." };
      }
      for (const r of receta) {
        const material = await tx.rawMaterial.findUnique({ where: { id: r.rawMaterialId } });
        if (!material || material.unitMeasureId !== r.unitMeasureId) return { ok: false, mensaje: "Un material cambió su unidad o ya no existe. Actualiza el listado." };
      }
      if (!await tx.unitMeasure.findUnique({ where: { id: d.unitMeasureId } })) return { ok: false, mensaje: "La unidad seleccionada ya no existe." };
      const propias = ref?.success ? await tx.productImage.findMany({ where: { productId: ref.data.id, removedAt: null } }) : [];
      if (d.images.some(i => "id" in i && !propias.some(p => p.id === i.id))) return { ok: false, mensaje: "Una imagen no pertenece a este producto o ya fue retirada." };
      const data = { name: d.name, description: d.description || null, unitMeasureId: d.unitMeasureId, ...(verPrecios ? { suggestedPrice: d.suggestedPrice ? new Prisma.Decimal(d.suggestedPrice) : null } : {}) };
      const producto = ref?.success ? await anotarMutacion(tx, "product", "update", await tx.product.update({ where: { id: ref.data.id }, data: { ...data, version: { increment: 1 } } })) : await anotarMutacion(tx, "product", "create", await tx.product.create({ data: { ...data, creationKey: String(clave), creationFingerprint: huella } }));
      await tx.productRecipe.deleteMany({ where: { productId: producto.id } });
      for (const r of receta) await tx.productRecipe.create({ data: { productId: producto.id, rawMaterialId: r.rawMaterialId, quantity: r.quantity } });
      // Archivos antiguos permanecen en disco; sólo nuevas escrituras se limpian si falla la tx.
      for (const i of propias) if (!d.images.some(v => "id" in v && v.id === i.id)) await tx.productImage.update({ where: { id: i.id }, data: { removedAt: new Date() } });
      for (const [position, i] of d.images.entries()) {
        if ("id" in i) await tx.productImage.update({ where: { id: i.id }, data: { position } });
        else { const fileKey = await almacen.guardar(preparadas[i.fileIndex]); nuevas.push(fileKey); await tx.productImage.create({ data: { productId: producto.id, fileKey, position } }); }
      }
      return { ok: true, mensaje: ref ? "Producto actualizado." : "Producto creado.", producto: (await cargar(tx, [producto.id]))[0] };
    }, { timeout: 20000 });
  } catch (error) {
    for (const archivo of nuevas) try { await almacen.eliminar(archivo); } catch { console.error("No se pudo retirar una imagen sin confirmar:", archivo); }
    return errorOperacion(error);
  }
}
export async function eliminarProducto(referencia: unknown): Promise<ResultadoProducto> {
  await exigirAcceso("catalogos.operar");

  const ref = referenciaProductoSchema.safeParse(referencia);
  if (!ref.success) return { ok: false, mensaje: "Referencia inválida." };
  try {
    return await prisma.$transaction(async tx => {
      await exigirAccesoEnTransaccion(tx, "catalogos.operar");

      await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${ref.data.id} FOR UPDATE`;
      const actual = await tx.product.findUnique({ where: { ...ref.data, deletedAt: null } });
      if (!actual) return obsoleto;
      if (await tx.quoteDetail.count({ where: { productId: actual.id } })) return { ok: false, mensaje: "No se puede eliminar un producto referenciado en cotizaciones." };
      if (await tx.workOrderLine.count({ where: { productId: actual.id } }) || await tieneReferenciaHistoricaPlan(tx, "Product", actual.id)) return { ok: false, mensaje: "No se puede eliminar un producto referenciado en órdenes de trabajo actuales o históricas." };
      if (await tx.productWarehouseStock.count({ where: { productId: actual.id } })) return { ok: false, mensaje: "No se puede eliminar un producto con stock o historial de inventario, incluso saldo cero." };
      await anotarMutacion(tx, "product", "update", await tx.product.update({ where: { id: actual.id }, data: { deletedAt: new Date(), version: { increment: 1 } } }));
      return { ok: true, mensaje: "Producto eliminado del catálogo; código y archivos históricos conservados." };
    });
  } catch (error) { return errorOperacion(error); }
}
