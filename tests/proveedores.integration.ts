// DATABASE_URL debe apuntar a una copia temporal mtx_validacion_*; no carga .env.
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { consultarProveedor, eliminarProveedor, guardarProveedor, listarProveedores } from "../src/lib/servicios/proveedores";
import { formatearRut, normalizarRut, rutValido } from "../src/lib/validaciones/rut";
import type { Proveedor, ResultadoProveedor } from "../src/lib/tipos/proveedor";

function registro(resultado: ResultadoProveedor): Proveedor {
  assert(resultado.ok && resultado.proveedor);
  return resultado.proveedor;
}
async function main() {
  assert(new URL(process.env.DATABASE_URL!).pathname.startsWith("/mtx_validacion_"), "Las pruebas requieren una copia temporal mtx_validacion_*.");
  const nombre = `Proveedor prueba ${Date.now()}`;
  let tipoDocumentoId: number | undefined;
  let bodegaCompraId: number | undefined;
  const ids: number[] = [];
  let compraId: number | undefined;
  const crear = async (rut: string) => {
    const proveedor = registro(await guardarProveedor({ name: `  ${nombre}  `, rut }));
    ids.push(proveedor.id);return proveedor;
  };
  try {
    for (const rut of ["12.345.678-5", "123456785", "6.000.000-k", "10.000.004-0"]) assert(rutValido(rut), rut);
    for (const rut of ["0-0", "12.345.678-9", "abc", "1234567890", "1..234.567-4", "12-3456785"]) assert(!rutValido(rut), rut);
    assert.equal(normalizarRut(" 06.000.000-k "), "6000000-K");
    assert.equal(formatearRut("6000000-K"), "6.000.000-K");
    assert.equal((await guardarProveedor({ rut: "12345678-5", name: " " })).ok, false);
    assert.equal((await guardarProveedor({ rut: "12345678-9", name: nombre })).ok, false);
    assert.equal((await guardarProveedor({ rut: "12345678-5", name: nombre, email: "incorrecto" })).ok, false);
    for (const [campo, limite] of [["name", 150], ["email", 254], ["phone", 40]] as const) {
      assert.equal((await guardarProveedor({ rut: "12345678-5", name: nombre, [campo]: "x".repeat(limite + 1) })).ok, false);
    }
    assert.equal((await guardarProveedor({ rut: "12345678-5", name: nombre }, null)).ok, false);
    assert.equal((await consultarProveedor("1")).ok, false);
    assert.equal((await eliminarProveedor({ id: -1, updatedAt: "ayer" })).ok, false);
    const proveedor = await crear("12.345.678-5");
    assert.equal(proveedor.rut, "12345678-5");assert.equal(proveedor.name, nombre);
    assert.equal(proveedor.email, null);assert.equal(proveedor.phone, null);
    assert((await listarProveedores()).some(p => p.id === proveedor.id && p.compras === 0 && typeof p.updatedAt === "string"));
    assert.equal(registro(await consultarProveedor(proveedor.id)).rut, proveedor.rut);
    for (const rut of ["123456785", "12.345.678-5"]) {
      const duplicado = await guardarProveedor({ rut, name: nombre });assert(!duplicado.ok && duplicado.campos?.rut);
    }
    const editado = registro(await guardarProveedor({ rut: "12345678-5", name: `${nombre} editado`, email: "  ventas@example.cl  ", phone: "  +56 9 1234 5678  " }, proveedor));
    assert.equal(editado.email, "ventas@example.cl");assert.equal(editado.phone, "+56 9 1234 5678");
    assert.equal((await guardarProveedor({ rut: "12345678-5", name: "No sobrescribir" }, proveedor)).ok, false);
    assert.equal((await eliminarProveedor(proveedor)).ok, false);
    const vacios = registro(await guardarProveedor({ rut: "12345678-5", name: editado.name, email: " ", phone: " " }, editado));
    assert.equal(vacios.email, null);assert.equal(vacios.phone, null);
    const segundo = await crear("6.000.000-k");
    assert.equal(segundo.rut, "6000000-K");
    assert.equal((await guardarProveedor({ rut: "12345678-5", name: nombre }, segundo)).ok, false);
    // Un formato heredado no se migra automáticamente ni permite un duplicado equivalente.
    const heredado = await prisma.supplier.create({ data: { rut: "10.000.004-0", name: nombre } });ids.push(heredado.id);
    assert.equal((await guardarProveedor({ rut: "100000040", name: nombre })).ok, false);
    assert.equal((await prisma.supplier.findUniqueOrThrow({ where: { id: heredado.id } })).rut, "10.000.004-0");
    const normalizado = registro(await guardarProveedor({ rut: "10000004-0", name: nombre }, { id: heredado.id, updatedAt: heredado.updatedAt.toISOString() }));
    assert.equal(normalizado.rut, "10000004-0");
    // Misma clave canónica bajo dos creaciones simultáneas: la restricción única resuelve la carrera.
    const simultaneos = await Promise.all([guardarProveedor({ rut: "11111111-1", name: nombre }), guardarProveedor({ rut: "11.111.111-1", name: nombre })]);
    assert.equal(simultaneos.filter(r => r.ok).length, 1);
    for (const r of simultaneos) if (r.ok && r.proveedor) ids.push(r.proveedor.id);
    // Asociación posterior a abrir la confirmación: la FK debe conservar proveedor y compra.
    bodegaCompraId = (await prisma.warehouse.create({data:{name:nombre}})).id;
    const codigoDocumento = `PRUEBA-${Date.now()}`;
    tipoDocumentoId = (await prisma.documentType.create({data:{code:codigoDocumento,name:nombre}})).id;
    compraId = (await prisma.purchase.create({ data: { supplierId: vacios.id, supplierRut:"11111111-1", documentTypeId:tipoDocumentoId, documentTypeCode:codigoDocumento, documentNumber:"001", documentNumberNormalized:"001", warehouseId:bodegaCompraId, totalAmount: "1" } })).id;
    assert.equal(registro(await consultarProveedor(vacios.id)).compras, 1);
    const protegido = await eliminarProveedor(vacios);assert(!protegido.ok && protegido.mensaje.includes("compras"));
    assert(await prisma.purchase.findUnique({ where: { id: compraId } }));
    await prisma.purchase.delete({ where: { id: compraId } });compraId = undefined;
    assert.equal((await eliminarProveedor(vacios)).ok, true);
    assert.equal((await consultarProveedor(vacios.id)).ok, false);
    assert.equal((await eliminarProveedor(vacios)).ok, false);
    console.log("Correcto: CRUD, RUT canónico/DV K y 0, correo, límites, opcionales, duplicados heredados y concurrentes, control de versión y compra posterior a la confirmación.");
  } finally {
    if (compraId !== undefined) await prisma.purchase.delete({ where: { id: compraId } });
    if(tipoDocumentoId)await prisma.documentType.delete({where:{id:tipoDocumentoId}});
    if(bodegaCompraId)await prisma.warehouse.delete({where:{id:bodegaCompraId}});
    await prisma.supplier.deleteMany({ where: { id: { in: ids } } });
  }
}
main().catch(e => { console.error(e);process.exitCode = 1; }).finally(() => prisma.$disconnect());
