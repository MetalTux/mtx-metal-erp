// Ejecutar sólo en copia local descartable; fixtures/fallos deliberados nunca en BD real.
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { guardarCotizacion, resolverCotizacion } from "../src/lib/servicios/cotizaciones";
import { cargarImagenCotizacion } from "../src/lib/servicios/imagenes-cotizacion";
import { obtenerCotizacion, consultarCotizaciones } from "../src/lib/consultas/cotizaciones";
import { cotizacionSchema } from "../src/lib/validaciones/cotizacion";
import { validarTextoCotizacion, documentoVacioCotizacion, URL_IMAGEN_COTIZACION } from "../src/lib/validaciones/texto-cotizacion";
import { guardarCliente } from "../src/lib/servicios/clientes";
import type { DatosCotizacion } from "../src/lib/validaciones/cotizacion";
async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  assert(["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname.startsWith("/mtx_validacion_cotizaciones_"));
  assert(process.env.COTIZACION_IMAGEN_DIR?.includes("imagenes-validacion"));
  const previo = await prisma.$queryRaw`SELECT (SELECT md5(coalesce(string_agg(to_jsonb(s)::text,'' ORDER BY id),'')) FROM "WarehouseStock" s) a, (SELECT count(*)::int FROM "StockMovement") b, (SELECT md5(coalesce(string_agg(to_jsonb(s)::text,'' ORDER BY id),'')) FROM "ProductWarehouseStock" s) c, (SELECT count(*)::int FROM "ProductStockMovement") d, (SELECT count(*)::int FROM "AccountReceivable") e, (SELECT count(*)::int FROM "Payment") f`;
  let cliente = await prisma.client.findFirst();
  if (!cliente) {
    const r = await guardarCliente({ rut: "12345678-5", name: "Cliente prueba cotización", contact: "General", phone: "12345", email: "", branches: [{ name: "Casa Central", isHeadOffice: true, address: "Dirección prueba", city: "Curicó", contact: "Sucursal", phone: "12345", email: "" }] }); assert(r.ok && r.cliente); cliente = await prisma.client.findUniqueOrThrow({ where: { id: r.cliente.id } });
  }
  let sucursal = await prisma.clientBranch.findFirst({ where: { clientId: cliente.id, legacyIncomplete: false, address: { not: null }, city: { not: null }, contact: { not: null }, phone: { not: null } } });
  if (!sucursal) {
    const rut = "11111111-1";
    const r = await guardarCliente({ rut, name: "Cliente completo cotización", contact: "General", phone: "12345", email: "", branches: [{ name: "Casa Central", isHeadOffice: true, address: "Dirección prueba", city: "Curicó", contact: "Sucursal", phone: "12345", email: "" }] }); assert(r.ok && r.cliente); cliente = await prisma.client.findUniqueOrThrow({ where: { id: r.cliente.id } }); sucursal = await prisma.clientBranch.findFirstOrThrow({ where: { clientId: cliente.id } });
  }
  const unidad = await prisma.unitMeasure.findFirstOrThrow(), condicion = await prisma.paymentCondition.findFirstOrThrow();
  const dato: DatosCotizacion = { commercialTerms: null, date: "2026-10-10", validUntil: null, clientId: cliente.id, clientBranchId: sucursal.id, paymentConditionId: condicion.id, bankAccountId: null, discount: { modo: "SIN_DESCUENTO" }, technicalDescription: documentoVacioCotizacion, lines: [{ kind: "SERVICIO", rawMaterialId: null, productId: null, unitMeasureId: unidad.id, description: "Trabajo a medida", quantity: "1", unitPrice: "4800000" }] };
  // Contrato anterior: solicitudes sin condiciones comerciales conservan su huella.
  const antiguaClave = randomUUID(); const antigua = await guardarCotizacion(dato, antiguaClave); assert(antigua.ok);
  const { commercialTerms: _condiciones, ...datosAntiguos } = cotizacionSchema.parse(dato); void _condiciones;
  const huellaAntigua = createHash("sha256").update(JSON.stringify({ tipo: "CREAR", datos: datosAntiguos, referencia: null, correccion: null })).digest("hex");
  assert.equal((await prisma.quoteOperation.findUniqueOrThrow({ where: { idempotencyKey: antiguaClave } })).fingerprint, huellaAntigua);
  const material = await prisma.rawMaterial.findFirst() ?? await prisma.rawMaterial.create({ data: { code: randomUUID(), name: "Material prueba cotización", unitMeasureId: unidad.id } });
  const producto = await prisma.product.findFirst({ where: { deletedAt: null } }) ?? await prisma.product.create({ data: { name: "Producto prueba cotización", unitMeasureId: unidad.id, creationKey: randomUUID(), creationFingerprint: "a".repeat(64) } });
  const mixta = await guardarCotizacion({ ...dato, lines: [dato.lines[0], { kind: "MATERIA_PRIMA", rawMaterialId: material.id, productId: null, unitMeasureId: material.unitMeasureId, description: material.name, quantity: "0.5", unitPrice: "101" }, { kind: "PRODUCTO", rawMaterialId: null, productId: producto.id, unitMeasureId: producto.unitMeasureId, description: producto.name, quantity: "2", unitPrice: "1000" }] }, randomUUID());
  assert(mixta.ok);
  const mixtos = await prisma.quoteDetail.findMany({ where: { quoteId: mixta.id }, orderBy: { position: "asc" } });
  assert.deepEqual(mixtos.map(l => l.kind), ["SERVICIO", "MATERIA_PRIMA", "PRODUCTO"]); assert.equal(mixtos[1].rawMaterialCode, material.code); assert.equal(mixtos[2].productCode, producto.code);
  assert.equal((await obtenerCotizacion(mixta.id)).historico.totalAmount, "5714441");
  const paralelas = await Promise.all([guardarCotizacion({ ...dato, lines: [{ kind: "PRODUCTO", rawMaterialId: null, productId: producto.id, unitMeasureId: producto.unitMeasureId, description: producto.name, quantity: "1", unitPrice: "100" }] }, randomUUID()), guardarCotizacion({ ...dato, lines: [{ kind: "PRODUCTO", rawMaterialId: null, productId: producto.id, unitMeasureId: producto.unitMeasureId, description: producto.name, quantity: "2", unitPrice: "100" }] }, randomUUID())]);
  assert(paralelas.every(r => r.ok), "Dos cotizaciones del mismo producto deben serializar sin ascender bloqueos SHARE.");
  // SQL bloquea cambios incompletos de importe/versión y líneas incompatibles.
  await assert.rejects(prisma.quote.update({ where: { id: mixta.id }, data: { totalAmount: "1", version: { increment: 1 } } }));
  await assert.rejects(prisma.quoteDetail.update({ where: { id: mixtos[1].id }, data: { unitPrice: "1.5" } }));
  await assert.rejects(prisma.quoteDetail.deleteMany({ where: { quoteId: mixta.id } }));
  const clave = randomUUID(), uploadKey = randomUUID();
  const bytes = await sharp({ create: { width: 40, height: 30, channels: 3, background: "#446688" } }).png().toBuffer();
  const upload = () => { const f = new FormData(); f.set("archivo", new File([new Uint8Array(bytes)], "prueba.png", { type: "image/png" })); f.set("draftKey", clave); f.set("uploadKey", uploadKey); return cargarImagenCotizacion(f); };
  const imagen = await upload(); assert(imagen.ok); const retry = await upload(); assert(retry.ok && retry.src === imagen.src);
  const archivosAntes = (await readdir(process.env.COTIZACION_IMAGEN_DIR!)).sort();
  const mala = new FormData(); mala.set("archivo", new File(["Contenido que no es PNG"], "falsa.png", { type: "image/png" })); mala.set("draftKey", clave); mala.set("uploadKey", randomUUID());
  assert.equal((await cargarImagenCotizacion(mala)).ok, false);
  await prisma.$executeRawUnsafe("CREATE FUNCTION prueba_imagen_cotizacion_fallo() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fallo de imagen de prueba'; END $$");
  await prisma.$executeRawUnsafe('CREATE TRIGGER prueba_imagen_cotizacion_fallo BEFORE INSERT ON "QuoteImageFile" FOR EACH ROW EXECUTE FUNCTION prueba_imagen_cotizacion_fallo()');
  try { const f = new FormData(); f.set("archivo", new File([new Uint8Array(bytes)], "prueba.png", { type: "image/png" })); f.set("draftKey", clave); f.set("uploadKey", randomUUID()); assert.equal((await cargarImagenCotizacion(f)).ok, false); assert.deepEqual((await readdir(process.env.COTIZACION_IMAGEN_DIR!)).sort(), archivosAntes); }
  finally { await prisma.$executeRawUnsafe('DROP TRIGGER prueba_imagen_cotizacion_fallo ON "QuoteImageFile"'); await prisma.$executeRawUnsafe('DROP FUNCTION prueba_imagen_cotizacion_fallo()'); }
  dato.technicalDescription = { type: "doc", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Especificaciones" }] }, { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Acero inoxidable", marks: [{ type: "bold" }] }] }] }] }, { type: "paragraph", attrs: { textAlign: "right" }, content: [{ type: "text", text: "Formato copiado", marks: [{ type: "textStyle", attrs: { color: "rgb(204, 0, 0)", fontFamily: "Calibri", fontSize: "18pt" } }] }] }, { type: "table", content: [{ type: "tableRow", content: [{ type: "tableHeader", attrs: { colspan: 1, rowspan: 1, colwidth: null, align: null, backgroundColor: "rgb(220, 220, 220)" }, content: [{ type: "paragraph", content: [{ type: "text", text: "Encabezado" }] }] }, { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Celda" }] }] }] }] }, { type: "image", attrs: { src: imagen.src, alt: "Referencia", placement: "izquierda", width: 33 } }] };
  const altas = await Promise.all([guardarCotizacion(dato, clave), guardarCotizacion(dato, clave)]);
  assert(altas.every(r => r.ok)); const alta = altas[0]; assert(alta.ok); assert.equal(altas[1].ok && altas[1].id, alta.id);
  const q = await obtenerCotizacion(alta.id); assert.equal(q.historico.totalAmount, "5712000"); assert.equal(q.historico.netAmount, "4800000"); assert.equal(q.historico.vatAmount, "912000"); assert.deepEqual(q.datos.technicalDescription, validarTextoCotizacion(dato.technicalDescription));
  assert.equal((await consultarCotizaciones({ q: q.folio, desde: "2026-10-10", hasta: "2026-10-10" })).filas.length, 1);
  assert.equal((await consultarCotizaciones({ q: q.folio, desde: "2026-10-11" })).filas.length, 0);
  assert.equal((await guardarCotizacion({ ...dato, validUntil: "2026-10-30" }, clave)).ok, false);
  const editarClave = randomUUID(), referencia = { id: alta.id, version: alta.version };
  const editar = await guardarCotizacion({ ...dato, discount: { modo: "PORCENTAJE", valor: "10" } }, editarClave, referencia); assert(editar.ok && editar.version === 2);
  assert.equal((await guardarCotizacion(dato, randomUUID(), referencia)).ok, false);
  const aprobado = await resolverCotizacion({ id: alta.id, version: 2 }, randomUUID(), "APROBAR"); assert(aprobado.ok);
  // Reintento de edición ya confirmada funciona aun después del cambio de estado/version.
  assert((await guardarCotizacion({ ...dato, discount: { modo: "PORCENTAJE", valor: "10" } }, editarClave, referencia)).ok);
  assert.equal((await guardarCotizacion(dato, randomUUID(), { id: alta.id, version: aprobado.version })).ok, false);
  await assert.rejects(prisma.quote.update({ where: { id: alta.id }, data: { clientName: "Alterado", version: { increment: 1 } } }));
  await assert.rejects(prisma.quoteDetail.deleteMany({ where: { quoteId: alta.id } }));
  await assert.rejects(prisma.quoteImageLink.deleteMany({ where: { quoteId: alta.id } }));
  await assert.rejects(prisma.quote.delete({ where: { id: alta.id } }));
  const copia = await guardarCotizacion(dato, randomUUID(), undefined, { id: alta.id, version: aprobado.version }); assert(copia.ok && copia.id !== alta.id);
  const nueva = await obtenerCotizacion(copia.id); assert(nueva.folio !== q.folio && nueva.historico.correctedQuoteId === alta.id && nueva.status === "PENDIENTE");
  const bajaClave = randomUUID(); assert((await resolverCotizacion({ id: copia.id, version: copia.version }, bajaClave, "ELIMINAR")).ok); assert((await resolverCotizacion({ id: copia.id, version: copia.version }, bajaClave, "ELIMINAR")).ok);
  await readFile(path.join(process.env.COTIZACION_IMAGEN_DIR!, imagen.src.slice(URL_IMAGEN_COTIZACION.length)));
  assert(await prisma.quote.findUnique({ where: { id: copia.id } })); assert(!(await consultarCotizaciones({ q: nueva.folio })).filas.length);
  const vencida = await guardarCotizacion({ ...dato, technicalDescription: documentoVacioCotizacion, validUntil: "2026-10-10" }, randomUUID()); assert(vencida.ok);
  assert.equal((await resolverCotizacion({ id: vencida.id, version: vencida.version }, randomUUID(), "APROBAR")).ok, false);
  const rechazada = await resolverCotizacion({ id: vencida.id, version: vencida.version }, randomUUID(), "RECHAZAR"); assert(rechazada.ok);
  const name = cliente.name;
  await prisma.client.update({ where: { id: cliente.id }, data: { name: "Cambio de catálogo en copia" } });
  assert.equal((await obtenerCotizacion(alta.id)).historico.clientName, name);
  // UUID ajeno no habilita usar imágenes de otro borrador sin vínculo al original.
  assert.equal((await guardarCotizacion(dato, randomUUID())).ok, false);
  for (const contenido of [{ type: "script" }, { type: "doc", content: [{ type: "image", attrs: { src: "javascript:alert(1)" } }] }, { type: "doc", content: [{ type: "paragraph", attrs: { onclick: "alert(1)" } }] }]) assert.throws(() => validarTextoCotizacion(contenido));
  const texto = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "<script>alert(1)</script>" }] }] }; assert.equal(validarTextoCotizacion(texto).content![0].content![0].text, "<script>alert(1)</script>");
  // Rollback provocado después de reservar folio: contador/documento/operación juntos.
  const contador = await prisma.documentNumbering.findUniqueOrThrow({ where: { type: "COTIZACION" } }), cantidad = await prisma.quote.count();
  await prisma.$executeRawUnsafe("CREATE FUNCTION prueba_cotizacion_fallo() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fallo de prueba'; END $$");
  await prisma.$executeRawUnsafe('CREATE TRIGGER prueba_cotizacion_fallo BEFORE INSERT ON "QuoteDetail" FOR EACH ROW EXECUTE FUNCTION prueba_cotizacion_fallo()');
  const rollbackClave = randomUUID();
  try { assert.equal((await guardarCotizacion({ ...dato, technicalDescription: documentoVacioCotizacion }, rollbackClave)).ok, false); assert.equal(await prisma.quote.count(), cantidad); assert.equal((await prisma.documentNumbering.findUniqueOrThrow({ where: { type: "COTIZACION" } })).nextNumber, contador.nextNumber); assert.equal(await prisma.documentFolio.count({ where: { idempotencyKey: rollbackClave } }), 0); }
  finally { await prisma.$executeRawUnsafe('DROP TRIGGER prueba_cotizacion_fallo ON "QuoteDetail"'); await prisma.$executeRawUnsafe('DROP FUNCTION prueba_cotizacion_fallo()'); }
  const despues = await prisma.$queryRaw`SELECT (SELECT md5(coalesce(string_agg(to_jsonb(s)::text,'' ORDER BY id),'')) FROM "WarehouseStock" s) a, (SELECT count(*)::int FROM "StockMovement") b, (SELECT md5(coalesce(string_agg(to_jsonb(s)::text,'' ORDER BY id),'')) FROM "ProductWarehouseStock" s) c, (SELECT count(*)::int FROM "ProductStockMovement") d, (SELECT count(*)::int FROM "AccountReceivable") e, (SELECT count(*)::int FROM "Payment") f`;
  assert.deepEqual(despues, previo);
  console.log("OK: guardado/folio/IVA/importes, imágenes/formato históricos, concurrencia/UUID/versiones, estados/vigencia, baja/corrección, rollback y ningún cambio en inventario/cobranza.");
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
