import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { guardarCliente, consultarCliente, eliminarCliente } from "../src/lib/servicios/clientes";
import type { Cliente, ResultadoCliente } from "../src/lib/tipos/cliente";
import type { DatosCliente } from "../src/lib/validaciones/cliente";

function registro(r: ResultadoCliente): Cliente { assert(r.ok && r.cliente); return r.cliente; }
const central = { name: "Casa Central", isHeadOffice: true, address: "Calle 1", city: "Curicó", contact: "Contacto central", phone: "+56 9 1234 5678", email: "" };
const otra = { ...central, name: "Sucursal Norte", isHeadOffice: false };
const datos = (c: Cliente): DatosCliente => ({ rut: c.rut, name: c.name, contact: c.contact!, phone: c.phone!, email: c.email ?? "", branches: c.branches.map(b => ({ id: b.id, name: b.name, isHeadOffice: b.isHeadOffice, address: b.address!, city: b.city!, contact: b.contact!, phone: b.phone!, email: b.email ?? "" })) });
async function main() {
  const u = new URL(process.env.DATABASE_URL!);
  assert(["localhost", "127.0.0.1"].includes(u.hostname) && u.pathname.startsWith("/mtx_validacion_sucursales_"));
  const ids: number[] = []; let quoteId: number | undefined;
  const base = { rut: "12345678-5", name: "Cliente sucursales", contact: "Contacto general", phone: "+56 9 1111 1111", email: "", branches: [central, otra] };
  try {
    assert.equal((await guardarCliente({ ...base, branches: [] })).ok, false);
    for (const campo of ["address", "city", "contact", "phone"] as const) assert.equal((await guardarCliente({ ...base, branches: [{ ...central, [campo]: " " }] })).ok, false);
    assert.equal((await guardarCliente({ ...base, branches: [central, { ...otra, name: " casa central " }] })).ok, false);
    let c = registro(await guardarCliente(base)); ids.push(c.id); assert.equal(c.branches.length, 2);
    const inicial = c;
    const b = c.branches.find(b => !b.isHeadOffice)!;
    const segunda = registro(await guardarCliente({ ...base, rut: "6000000-K", name: "Otro cliente", branches: [central] })); ids.push(segunda.id);
    assert.equal((await guardarCliente({ ...datos(c), branches: [datos(c).branches[0], { ...otra, id: segunda.branches[0].id }] }, c)).ok, false);
    assert.equal((await guardarCliente({ ...datos(c), branches: [otra] }, c)).ok, false);
    await assert.rejects(prisma.clientBranch.delete({ where: { id: c.branches.find(b => b.isHeadOffice)!.id } }));
    const q = { clientId: c.id, clientBranchId: b.id, totalAmount: "4800000", branchName: b.name, branchAddress: b.address, branchCity: b.city, branchContact: b.contact, branchPhone: b.phone, branchEmail: b.email };
    await assert.rejects(prisma.quote.create({ data: { ...q, clientId: segunda.id } }));
    quoteId = (await prisma.quote.create({ data: q })).id;
    const cambio = datos(c); cambio.branches.find(b => !b.isHeadOffice)!.city = "Talca";
    c = registro(await guardarCliente(cambio, c));
    assert.equal((await prisma.quote.findUniqueOrThrow({ where: { id: quoteId } })).branchCity, "Curicó");
    const antes = c.updatedAt;
    assert.equal((await guardarCliente({ ...datos(c), name: "No persistir", branches: datos(c).branches.filter(b => b.isHeadOffice) }, c)).ok, false);
    const sinCambios = registro(await consultarCliente(c.id)); assert.equal(sinCambios.name, c.name); assert.equal(sinCambios.updatedAt, antes); assert.equal(sinCambios.branches.length, 2);
    assert.equal((await guardarCliente(datos(inicial), inicial)).ok, false);
    const carreras = await Promise.all([guardarCliente({ ...datos(c), name: "Cambio A" }, c), guardarCliente({ ...datos(c), name: "Cambio B" }, c)]);
    assert.equal(carreras.filter(r => r.ok).length, 1);
    c = registro(await consultarCliente(c.id)); assert.equal((await eliminarCliente(c)).ok, false);
    await prisma.quote.delete({ where: { id: quoteId } }); quoteId = undefined;
    c = registro(await guardarCliente({ ...datos(c), branches: datos(c).branches.filter(b => b.isHeadOffice) }, c)); assert.equal(c.branches.length, 1);
    assert((await eliminarCliente(c)).ok); assert.equal(await prisma.clientBranch.count({ where: { clientId: c.id } }), 0);
    console.log("Sucursales: contactos/dirección obligatorios, Casa Central, pertenencia, snapshots, concurrencia y rollback correctos.");
  } finally {
    if (quoteId) await prisma.quote.delete({ where: { id: quoteId } });
    await prisma.client.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
