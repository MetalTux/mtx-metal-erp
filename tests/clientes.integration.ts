// DATABASE_URL debe apuntar a una copia temporal mtx_validacion_*; no carga .env.
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { consultarCliente, eliminarCliente, guardarCliente, listarClientes } from "../src/lib/servicios/clientes";
import { formatearRut, normalizarRut, rutValido } from "../src/lib/validaciones/rut";
import type { Cliente, ResultadoCliente } from "../src/lib/tipos/cliente";

function registro(resultado: ResultadoCliente): Cliente {
  assert(resultado.ok && resultado.cliente);
  return resultado.cliente;
}
async function main() {
  assert(new URL(process.env.DATABASE_URL!).pathname.startsWith("/mtx_validacion_"), "Las pruebas requieren una copia temporal mtx_validacion_*.");
  const nombre = `Cliente prueba ${Date.now()}`;
  const ids: number[] = [];
  let cotizacionId: number | undefined;
  const crear = async (rut: string) => {
    const cliente = registro(await guardarCliente({ name: `  ${nombre}  `, rut }));
    ids.push(cliente.id);return cliente;
  };
  try {
    for (const rut of ["12.345.678-5", "123456785", "6.000.000-k", "10.000.004-0"]) assert(rutValido(rut), rut);
    for (const rut of ["0-0", "12.345.678-9", "abc", "1234567890", "1..234.567-4", "12-3456785"]) assert(!rutValido(rut), rut);
    assert.equal(normalizarRut(" 06.000.000-k "), "6000000-K");
    assert.equal(formatearRut("6000000-K"), "6.000.000-K");
    assert.equal((await guardarCliente({ rut: "12345678-5", name: " " })).ok, false);
    assert.equal((await guardarCliente({ rut: "12345678-9", name: nombre })).ok, false);
    assert.equal((await guardarCliente({ rut: "12345678-5", name: nombre, email: "incorrecto" })).ok, false);
    for (const [campo, limite] of [["contact", 150], ["name", 150], ["email", 254], ["phone", 40]] as const) {
      assert.equal((await guardarCliente({ rut: "12345678-5", name: nombre, [campo]: "x".repeat(limite + 1) })).ok, false);
    }
    assert.equal((await guardarCliente({ rut: "12345678-5", name: nombre }, null)).ok, false);
    assert.equal((await consultarCliente("1")).ok, false);
    assert.equal((await eliminarCliente({ id: -1, updatedAt: "ayer" })).ok, false);
    const cliente = await crear("12.345.678-5");
    assert.equal(cliente.rut, "12345678-5");assert.equal(cliente.name, nombre);
    assert.equal(cliente.contact, null);assert.equal(cliente.email, null);assert.equal(cliente.phone, null);
    assert((await listarClientes()).some(p => p.id === cliente.id && p.cotizaciones === 0 && typeof p.updatedAt === "string"));
    assert.equal(registro(await consultarCliente(cliente.id)).rut, cliente.rut);
    for (const rut of ["123456785", "12.345.678-5"]) {
      const duplicado = await guardarCliente({ rut, name: nombre });assert(!duplicado.ok && duplicado.campos?.rut);
    }
    const editado = registro(await guardarCliente({ rut: "12345678-5", name: `${nombre} editado`, contact: "  María Pérez  ", email: "  ventas@example.cl  ", phone: "  +56 9 1234 5678  " }, cliente));
    assert.equal(editado.contact, "María Pérez");assert.equal(editado.email, "ventas@example.cl");assert.equal(editado.phone, "+56 9 1234 5678");
    assert.equal((await guardarCliente({ rut: "12345678-5", name: "No sobrescribir" }, cliente)).ok, false);
    assert.equal((await eliminarCliente(cliente)).ok, false);
    const vacios = registro(await guardarCliente({ rut: "12345678-5", name: editado.name, contact: " ", email: " ", phone: " " }, editado));
    assert.equal(vacios.contact, null);assert.equal(vacios.email, null);assert.equal(vacios.phone, null);
    const segundo = await crear("6.000.000-k");
    assert.equal(segundo.rut, "6000000-K");
    assert.equal((await guardarCliente({ rut: "12345678-5", name: nombre }, segundo)).ok, false);
    // Un formato heredado no se migra automáticamente ni permite un duplicado equivalente.
    const heredado = await prisma.client.create({ data: { rut: "10.000.004-0", name: nombre } });ids.push(heredado.id);
    assert.equal((await guardarCliente({ rut: "100000040", name: nombre })).ok, false);
    assert.equal((await prisma.client.findUniqueOrThrow({ where: { id: heredado.id } })).rut, "10.000.004-0");
    const normalizado = registro(await guardarCliente({ rut: "10000004-0", name: nombre }, { id: heredado.id, updatedAt: heredado.updatedAt.toISOString() }));
    assert.equal(normalizado.rut, "10000004-0");
    // Misma clave canónica bajo dos creaciones simultáneas: la restricción única resuelve la carrera.
    const simultaneos = await Promise.all([guardarCliente({ rut: "11111111-1", name: nombre }), guardarCliente({ rut: "11.111.111-1", name: nombre })]);
    assert.equal(simultaneos.filter(r => r.ok).length, 1);
    for (const r of simultaneos) if (r.ok && r.cliente) ids.push(r.cliente.id);
    // Asociación posterior a abrir la confirmación: la FK debe conservar cliente y cotización.
    cotizacionId = (await prisma.quote.create({ data: { clientId: vacios.id, totalAmount: "1" } })).id;
    assert.equal(registro(await consultarCliente(vacios.id)).cotizaciones, 1);
    const protegido = await eliminarCliente(vacios);assert(!protegido.ok && protegido.mensaje.includes("cotizaciones"));
    assert(await prisma.quote.findUnique({ where: { id: cotizacionId } }));
    await prisma.quote.delete({ where: { id: cotizacionId } });cotizacionId = undefined;
    assert.equal((await eliminarCliente(vacios)).ok, true);
    assert.equal((await consultarCliente(vacios.id)).ok, false);
    assert.equal((await eliminarCliente(vacios)).ok, false);
    console.log("Correcto: CRUD, RUT canónico/DV K y 0, correo, límites, opcionales, duplicados heredados y concurrentes, control de versión y cotización posterior a la confirmación.");
  } finally {
    if (cotizacionId !== undefined) await prisma.quote.delete({ where: { id: cotizacionId } });
    await prisma.client.deleteMany({ where: { id: { in: ids } } });
  }
}
main().catch(e => { console.error(e);process.exitCode = 1; }).finally(() => prisma.$disconnect());
