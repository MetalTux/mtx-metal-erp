import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { guardarCuentaBancaria, listarCuentasBancarias, cambiarEstadoCuenta, marcarCuentaPrincipal, datosBancariosParaCotizacion, listarCuentasParaCotizacion } from "../src/lib/servicios/cuentas-bancarias";
import { guardarCliente } from "../src/lib/servicios/clientes";
async function main() {
  const u = new URL(process.env.DATABASE_URL!);
  assert(["localhost", "127.0.0.1"].includes(u.hostname) && u.pathname.startsWith("/mtx_validacion_bancos_"), "Usar sólo copia local descartable de cuentas bancarias.");
  const resultadosRut = await prisma.$queryRaw<{ normal: boolean; k: boolean; cero: boolean; invalido: boolean }[]>`SELECT rut_bancario_valido('12345678-5') AS normal, rut_bancario_valido('6000000-K') AS k, rut_bancario_valido('1100001-0') AS cero, rut_bancario_valido('12345678-0') AS invalido`;
  assert.deepEqual(resultadosRut[0], { normal: true, k: true, cero: true, invalido: false });
  const datos = { bankName: "Banco de prueba", accountType: "Cuenta corriente", accountNumber: "001234", holderName: "Titular prueba", holderRut: "12.345.678-5", email: "" };
  assert.equal((await listarCuentasBancarias()).length, 0);
  // Perfil ausente: no crearlo implícitamente. Restaurarlo después sólo en esta copia.
  const perfil = await prisma.companyProfile.findUnique({ where: { id: 1 } });
  if (perfil) await prisma.companyProfile.delete({ where: { id: 1 } });
  assert.equal((await guardarCuentaBancaria(datos)).ok, false);
  assert.deepEqual(await prisma.$transaction(tx => datosBancariosParaCotizacion(tx)), {});
  await prisma.companyProfile.create({ data: perfil ?? { id: 1 } });
  for (const campo of ["bankName", "accountType", "accountNumber", "holderName"] as const) assert.equal((await guardarCuentaBancaria({ ...datos, [campo]: " " })).ok, false);
  assert.equal((await guardarCuentaBancaria({ ...datos, holderRut: "12345678-0" })).ok, false);
  assert.equal((await guardarCuentaBancaria({ ...datos, email: "incorrecto" })).ok, false);
  const altas = await Promise.all([guardarCuentaBancaria(datos), guardarCuentaBancaria({ ...datos, accountNumber: "000567" })]);
  assert(altas.every(r => r.ok));
  let filas = await listarCuentasBancarias(); assert.equal(filas.filter(c => c.isPrimary).length, 1);
  assert.equal(filas.find(c => c.accountNumber === "001234")?.holderRut, "12345678-5");
  assert.equal((await guardarCuentaBancaria({ ...datos, bankName: " BANCO DE PRUEBA ", accountType: "cuenta corriente" })).ok, false);
  const p = filas.find(c => c.isPrimary)!, otra = filas.find(c => !c.isPrimary)!;
  assert.equal((await cambiarEstadoCuenta(p, false)).ok, false);
  assert.equal((await marcarCuentaPrincipal({ ...otra, principalId: 999999 })).ok, false);
  await assert.rejects(prisma.companyBankAccount.update({ where: { id: p.id }, data: { isPrimary: false, isActive: false } }));
  await assert.rejects(prisma.companyBankAccount.update({ where: { id: otra.id }, data: { isPrimary: true } }));
  await assert.rejects(prisma.companyBankAccount.create({ data: { ...datos, holderRut: "12345678-0", accountNumber: "INVALIDO" } }));
  await assert.rejects(prisma.companyBankAccount.delete({ where: { id: otra.id } }));
  await assert.rejects(prisma.companyProfile.delete({ where: { id: 1 } }));
  const cliente = await guardarCliente({ rut: "6000000-K", name: "Cliente prueba banco", contact: "Contacto", phone: "123456789", email: "", branches: [{ name: "Casa Central", isHeadOffice: true, address: "Calle 1", city: "Curicó", contact: "Contacto central", phone: "123456789", email: "" }] });
  assert(cliente.ok && cliente.cliente);
  const clienteId = cliente.cliente.id;
  const quote = await prisma.$transaction(async tx => {
    const snapshot = await datosBancariosParaCotizacion(tx);
    assert.equal(snapshot.bankAccountId, p.id);
    return tx.quote.create({ data: { clientId: clienteId, totalAmount: "0", ...snapshot } });
  });
  assert.deepEqual(await prisma.$transaction(tx => datosBancariosParaCotizacion(tx, null)), {});
  assert.equal((await prisma.$transaction(tx => datosBancariosParaCotizacion(tx, otra.id))).bankAccountId, otra.id);
  await assert.rejects(prisma.quote.create({ data: { clientId: clienteId, totalAmount: "0", bankAccountId: otra.id } }));
  assert((await marcarCuentaPrincipal({ ...otra, principalId: p.id })).ok);
  assert.equal((await marcarCuentaPrincipal({ ...p, principalId: p.id })).ok, false);
  filas = await listarCuentasBancarias(); const antes = filas.find(c => c.id === p.id)!;
  assert((await guardarCuentaBancaria({ ...datos, accountNumber: p.accountNumber, holderName: "Titular nuevo", email: "correo@ejemplo.cl" }, antes)).ok);
  assert.equal((await prisma.quote.findUniqueOrThrow({ where: { id: quote.id } })).bankHolderName, "Titular prueba");
  let vigente = (await listarCuentasBancarias()).find(c => c.id === p.id)!;
  const carreras = await Promise.all([guardarCuentaBancaria({ ...datos, accountNumber: p.accountNumber, holderName: "Edición A" }, vigente), guardarCuentaBancaria({ ...datos, accountNumber: p.accountNumber, holderName: "Edición B" }, vigente)]);
  assert.equal(carreras.filter(r => r.ok).length, 1);
  vigente = (await listarCuentasBancarias()).find(c => c.id === p.id)!;
  assert((await cambiarEstadoCuenta(vigente, false)).ok);
  assert(!(await listarCuentasParaCotizacion()).some(c => c.id === p.id));
  await assert.rejects(prisma.$transaction(tx => datosBancariosParaCotizacion(tx, p.id)), /ya no está disponible/);
  assert.equal((await prisma.quote.findUniqueOrThrow({ where: { id: quote.id } })).bankAccountId, p.id);
  vigente = (await listarCuentasBancarias()).find(c => c.id === p.id)!;
  assert((await cambiarEstadoCuenta(vigente, true)).ok);
  // Tres candidatas: el mismo principal esperado impide sobrescribir otra elección concurrente.
  assert((await guardarCuentaBancaria({ ...datos, accountNumber: "000999" })).ok);
  filas = await listarCuentasBancarias(); const principal = filas.find(c => c.isPrimary)!, candidatas = filas.filter(c => !c.isPrimary);
  const cambios = await Promise.all(candidatas.map(c => marcarCuentaPrincipal({ ...c, principalId: principal.id })));
  assert.equal(cambios.filter(r => r.ok).length, 1);
  filas = await listarCuentasBancarias(); assert.equal(filas.filter(c => c.isPrimary).length, 1);
  // Error al marcar la nueva principal revierte también la desmarcación de la anterior.
  const elegido = filas.find(c => !c.isPrimary)!, principalAntes = filas.find(c => c.isPrimary)!;
  await prisma.$executeRawUnsafe(`CREATE FUNCTION prueba_banco_rollback() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."isPrimary" AND NOT OLD."isPrimary" THEN RAISE EXCEPTION 'Fallo inyectado'; END IF; RETURN NEW; END $$`);
  await prisma.$executeRawUnsafe(`CREATE TRIGGER prueba_banco_rollback BEFORE UPDATE ON "CompanyBankAccount" FOR EACH ROW EXECUTE FUNCTION prueba_banco_rollback()`);
  try { assert.equal((await marcarCuentaPrincipal({ ...elegido, principalId: principalAntes.id })).ok, false); }
  finally { await prisma.$executeRawUnsafe(`DROP TRIGGER prueba_banco_rollback ON "CompanyBankAccount"`); await prisma.$executeRawUnsafe(`DROP FUNCTION prueba_banco_rollback()`); }
  assert.equal((await listarCuentasBancarias()).find(c => c.isPrimary)?.id, principalAntes.id);
  console.log("OK: obligatorios, RUT, ceros, duplicados, principal, concurrencia, versiones, rollback, baja/reactivación y snapshot histórico.");
}
main().finally(() => prisma.$disconnect()).catch(e => { console.error(e); process.exitCode = 1; });
