// Todas las escrituras y fallos deliberados requieren copia PostgreSQL local descartable.
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { guardarPeriodoIva, eliminarPeriodoIva, ivaParaDocumento, listarPeriodosIva } from "../src/lib/servicios/iva";
import { guardarCliente } from "../src/lib/servicios/clientes";
async function main() {
  const destino = new URL(process.env.DATABASE_URL!);
  assert(["localhost", "127.0.0.1"].includes(destino.hostname) && destino.pathname.startsWith("/mtx_validacion_iva_"));
  const inicial = await prisma.vatRatePeriod.findFirstOrThrow(); assert(inicial.rate.equals(19)); assert.equal(inicial.validFrom.toISOString().slice(0, 10), "2003-10-01"); assert.equal(inicial.validTo, null);
  const capturar = (fecha: string) => prisma.$transaction(tx => ivaParaDocumento(tx, fecha));
  await assert.rejects(capturar("2003-09-30")); await assert.rejects(capturar("2020-02-30")); assert((await capturar("2003-10-01")).vatRate.equals(19));
  for (const rate of ["-1", "NaN", "101", "19.12345"]) assert.equal((await guardarPeriodoIva({ rate, validFrom: "1800-01-01", validTo: "1899-12-31" })).ok, false);
  assert.equal((await guardarPeriodoIva({ rate: "18", validFrom: "1800-01-02", validTo: "1800-01-01" })).ok, false);
  await assert.rejects(prisma.vatRatePeriod.create({ data: { rate: "NaN", validFrom: new Date("1800-01-01Z"), validTo: new Date("1800-01-02Z") } }));
  await assert.rejects(prisma.vatRatePeriod.create({ data: { rate: "18", validFrom: new Date("2003-10-01Z"), validTo: new Date("2003-10-02Z") } }));
  await assert.rejects(prisma.vatRatePeriod.update({ where: { id: inicial.id }, data: { validTo: new Date("2029-12-31Z"), version: { increment: 1 } } })); // Cierre sin sustituto abierto.
  const usado = await prisma.client.findFirst();
  let clientId = usado?.id;
  if (!clientId) {
    const r = await guardarCliente({ rut: "12345678-5", name: "Cliente copia IVA", contact: "Contacto", phone: "12345", email: "", branches: [{ name: "Casa Central", isHeadOffice: true, address: "Dirección copia", city: "Curicó", contact: "Contacto", phone: "12345", email: "" }] }); assert(r.ok && r.cliente); clientId = r.cliente.id;
  }
  const q = await prisma.$transaction(async tx => { const iva = await ivaParaDocumento(tx, "2010-01-01"); return tx.quote.create({ data: { ...iva, clientId: clientId!, date: new Date("2010-01-01Z"), totalAmount: "1000" } }); });
  await assert.rejects(prisma.quote.update({ where: { id: q.id }, data: { vatRate: "20" } }));
  await assert.rejects(prisma.quote.update({ where: { id: q.id }, data: { vatRatePeriodId: null, vatRate: null } }));
  const newData = { rate: "20", validFrom: "2030-01-01", validTo: null };
  assert((await guardarPeriodoIva(newData, undefined, { id: inicial.id, version: inicial.version })).ok);
  const closed = await prisma.vatRatePeriod.findUniqueOrThrow({ where: { id: inicial.id } }); assert.equal(closed.validTo?.toISOString().slice(0, 10), "2029-12-31");
  assert((await capturar("2029-12-31")).vatRate.equals(19)); assert((await capturar("2030-01-01")).vatRate.equals(20));
  assert.equal((await guardarPeriodoIva({ rate: "21", validFrom: "2003-10-01", validTo: "2029-12-31" }, { id: closed.id, version: closed.version })).ok, false);
  assert.equal((await guardarPeriodoIva({ rate: "19", validFrom: "2003-09-30", validTo: "2029-12-31" }, { id: closed.id, version: closed.version })).ok, false);
  assert.equal((await guardarPeriodoIva({ rate: "19", validFrom: "2003-10-01", validTo: "2009-12-31" }, { id: closed.id, version: closed.version })).ok, false);
  await assert.rejects(prisma.vatRatePeriod.update({ where: { id: closed.id }, data: { rate: "21", version: { increment: 1 } } }));
  await assert.rejects(prisma.vatRatePeriod.update({ where: { id: closed.id }, data: { validTo: new Date("2009-12-31Z"), version: { increment: 1 } } }));
  assert.equal((await eliminarPeriodoIva({ id: closed.id, version: closed.version })).ok, false);
  assert((await guardarPeriodoIva({ rate: "19", validFrom: "2003-10-01", validTo: "2025-12-31" }, { id: closed.id, version: closed.version })).ok);
  await assert.rejects(capturar("2027-01-01")); // No inventar una tasa en un hueco.
  const updated = await prisma.vatRatePeriod.findUniqueOrThrow({ where: { id: closed.id } });
  assert((await guardarPeriodoIva({ rate: "19", validFrom: "2003-10-01", validTo: "2029-12-31" }, { id: updated.id, version: updated.version })).ok);
  assert((await guardarPeriodoIva({ rate: "18", validFrom: "1900-01-01", validTo: "2003-09-30" })).ok);
  assert((await capturar("2003-09-30")).vatRate.equals(18));
  assert.equal((await guardarPeriodoIva({ rate: "18", validFrom: "1890-01-01", validTo: "1900-01-01" })).ok, false); // Inclusividad del día compartido.
  const hist = await prisma.vatRatePeriod.findFirstOrThrow({ where: { validFrom: new Date("1900-01-01Z") } }); assert((await eliminarPeriodoIva({ id: hist.id, version: hist.version })).ok);
  const abierta = await prisma.vatRatePeriod.findFirstOrThrow({ where: { validTo: null } });
  const antes = JSON.stringify(await prisma.vatRatePeriod.findMany({ orderBy: { id: "asc" } }));
  await prisma.$executeRawUnsafe('CREATE FUNCTION prueba_iva_fallo() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION \'Fallo IVA de prueba\'; END $$');
  await prisma.$executeRawUnsafe('CREATE TRIGGER prueba_iva_fallo BEFORE INSERT ON "VatRatePeriod" FOR EACH ROW EXECUTE FUNCTION prueba_iva_fallo()');
  try { assert.equal((await guardarPeriodoIva({ rate: "22", validFrom: "2040-01-01", validTo: null }, undefined, { id: abierta.id, version: abierta.version })).ok, false); assert.equal(JSON.stringify(await prisma.vatRatePeriod.findMany({ orderBy: { id: "asc" } })), antes); }
  finally { await prisma.$executeRawUnsafe('DROP TRIGGER prueba_iva_fallo ON "VatRatePeriod"'); await prisma.$executeRawUnsafe('DROP FUNCTION prueba_iva_fallo()'); }
  const carreras = await Promise.all([guardarPeriodoIva({ rate: "22", validFrom: "2040-01-01", validTo: null }, undefined, { id: abierta.id, version: abierta.version }), guardarPeriodoIva({ rate: "23", validFrom: "2050-01-01", validTo: null }, undefined, { id: abierta.id, version: abierta.version })]); assert.equal(carreras.filter(r => r.ok).length, 1);
  assert.equal(await prisma.vatRatePeriod.count({ where: { validTo: null } }), 1);
  const copy = await prisma.quote.findUniqueOrThrow({ where: { id: q.id } }); assert(copy.vatRate?.equals(19)); assert.equal(copy.vatRatePeriodId, inicial.id);
  await prisma.quote.update({ where: { id: q.id }, data: { status: "APROBADA" } });
  await assert.rejects(prisma.quote.update({ where: { id: q.id }, data: { date: new Date("2011-01-01Z") } }));
  await assert.rejects(prisma.quote.update({ where: { id: q.id }, data: { status: "PENDIENTE" } }));
  await assert.rejects(prisma.quote.delete({ where: { id: q.id } }));
  const lista = await listarPeriodosIva(); assert.equal(lista.find(p => p.id === inicial.id)?.documentos, 1);
  console.log("OK: IVA inicial, selección por fecha, límites inclusivos, huecos/solapamientos, período abierto único, protección usada, snapshot terminal, versiones, concurrencia y rollback del cierre/alta.");
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
