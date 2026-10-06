// Ejecutar solamente contra una copia temporal: DATABASE_URL debe apuntar a mtx_validacion_*.
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { consultarUnidad, eliminarUnidad, guardarUnidad, listarUnidades } from "../src/lib/servicios/unidades-medida";
import type { UnidadMedida } from "../src/lib/tipos/unidad-medida";

async function main() {
  const destino = new URL(process.env.DATABASE_URL!);
  assert(destino.pathname.startsWith("/mtx_validacion_"), "Las pruebas requieren una base temporal mtx_validacion_*.");
  const nombre = `Unidad prueba ${Date.now()}`;
  const ids: number[] = [];
  let materialId: number | undefined;
  const registrar = async (name: string): Promise<UnidadMedida> => {
    const resultado = await guardarUnidad({ name, abbreviation: "pr" });
    assert(resultado.ok && resultado.unidad);
    ids.push(resultado.unidad.id);
    return resultado.unidad;
  };
  try {
    const iniciales = await listarUnidades();
    assert(iniciales.every((unidad) => typeof unidad.updatedAt === "string" && Number.isInteger(unidad.materiales)));
    assert.equal((await guardarUnidad({ name: "   ", abbreviation: " " })).ok, false);
    assert.equal((await guardarUnidad({ name: "A".repeat(101), abbreviation: "m" })).ok, false);
    assert.equal((await guardarUnidad({ name: nombre, abbreviation: 42 })).ok, false);
    assert.equal((await consultarUnidad("1")).ok, false);
    assert.equal((await eliminarUnidad({ id: -1, updatedAt: "ayer" })).ok, false);

    const unidad = await registrar(`  ${nombre}  `);
    assert.equal(unidad.name, nombre);
    assert.equal((await consultarUnidad(unidad.id)).ok, true);
    const duplicado = await guardarUnidad({ name: nombre, abbreviation: "ot" });
    assert(!duplicado.ok && duplicado.campos?.name);

    const editada = await guardarUnidad({ name: `${nombre} editada`, abbreviation: "ed" }, { id: unidad.id, updatedAt: unidad.updatedAt });
    assert(editada.ok && editada.unidad);
    assert.equal(editada.unidad.abbreviation, "ed");
    const obsoleta = await guardarUnidad({ name: "No debe sobrescribir", abbreviation: "no" }, { id: unidad.id, updatedAt: unidad.updatedAt });
    assert(!obsoleta.ok);
    assert.equal((await eliminarUnidad({ id: unidad.id, updatedAt: unidad.updatedAt })).ok, false);
    const leida = await consultarUnidad(unidad.id);
    assert(leida.ok && leida.unidad?.name === `${nombre} editada`);

    const otra = await registrar(`${nombre} relacionada`);
    materialId = (await prisma.rawMaterial.create({ data: { code: `PR-${Date.now()}`, name: "Material temporal de prueba", unitMeasureId: otra.id } })).id;
    const relacionada = await consultarUnidad(otra.id);
    assert(relacionada.ok && relacionada.unidad?.materiales === 1);
    const bloqueo = await eliminarUnidad({ id: otra.id, updatedAt: otra.updatedAt });
    assert(!bloqueo.ok && bloqueo.mensaje.includes("materiales asociados"));
    assert(await prisma.unitMeasure.findUnique({ where: { id: otra.id } }));

    const carrera = await Promise.all([guardarUnidad({ name: `${nombre} concurrente`, abbreviation: "c" }), guardarUnidad({ name: `${nombre} concurrente`, abbreviation: "c" })]);
    assert.equal(carrera.filter((resultado) => resultado.ok).length, 1);
    for (const resultado of carrera) if (resultado.ok && resultado.unidad) ids.push(resultado.unidad.id);

    assert.equal((await eliminarUnidad({ id: unidad.id, updatedAt: editada.unidad.updatedAt })).ok, true);
    assert.equal((await consultarUnidad(unidad.id)).ok, false);
    assert.equal((await eliminarUnidad({ id: unidad.id, updatedAt: editada.unidad.updatedAt })).ok, false);
    console.log("Correcto: validación, listado, consulta, creación, edición, unicidad concurrente, conflictos de edición y borrado protegido.");
  } finally {
    if (materialId !== undefined) await prisma.rawMaterial.delete({ where: { id: materialId } });
    await prisma.unitMeasure.deleteMany({ where: { id: { in: ids } } });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
