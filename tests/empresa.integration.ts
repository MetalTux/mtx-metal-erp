// Usar sólo una copia temporal: DATABASE_URL debe apuntar a mtx_validacion_*.
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { consultarEmpresa, guardarEmpresa } from "../src/lib/servicios/empresa";
import type { ResultadoEmpresa } from "../src/lib/tipos/empresa";
import { readdir } from "node:fs/promises";
import sharp from "sharp";
import { guardarEmpresaConLogo } from "../src/lib/servicios/empresa";
import { almacenLogo, prepararLogo, URL_LOGO } from "../src/lib/almacenamiento/logo-empresa";
function registro(resultado: ResultadoEmpresa) { assert(resultado.ok && resultado.empresa);return resultado.empresa; }
async function main() {
  assert(new URL(process.env.DATABASE_URL!).pathname.startsWith("/mtx_validacion_"), "Se requiere una copia temporal mtx_validacion_*.");
  assert.equal(await prisma.companyProfile.count(), 0, "La prueba requiere perfil inicialmente vacío en la copia.");
  assert(process.env.EMPRESA_LOGO_DIR?.startsWith("/tmp/mtx-empresa-logos-"), "Se requiere almacenamiento temporal para pruebas.");
  try {
    assert.equal(await consultarEmpresa(), null);assert.equal(await prisma.companyProfile.count(), 0);
    for (const rut of ["12345678-9", "0-0", "texto"]) assert.equal((await guardarEmpresa({ rut })).ok, false);
    assert.equal((await guardarEmpresa({ email: "correo incorrecto" })).ok, false);
    for (const [campo, limite] of [["legalName",150],["tradeName",150],["businessActivity",200],["address",250],["commune",100],["city",100],["email",254],["phone",40]] as const) assert.equal((await guardarEmpresa({ [campo]: "x".repeat(limite+1) })).ok, false);
    assert.equal((await guardarEmpresa({ legalName: "Empresa" }, null)).ok, false);
    const carreras = await Promise.all([guardarEmpresa({ legalName: "Empresa A" }),guardarEmpresa({ legalName: "Empresa B" })]);
    assert.equal(carreras.filter(r=>r.ok).length, 1);assert.equal(await prisma.companyProfile.count(), 1);
    const ganador = registro(carreras.find(r=>r.ok)!);assert.equal((await consultarEmpresa())?.legalName, ganador.legalName);
    assert.equal((await guardarEmpresa({ legalName: "No sobrescribir" })).ok, false);assert.equal((await consultarEmpresa())?.legalName, ganador.legalName);
    let actual = registro(await guardarEmpresa({ legalName: "  Metal de prueba  ", rut: "12.345.678-5", email: "  contacto@example.cl  ", phone: "  +56 9 1234 5678  " }, ganador));
    assert.equal(actual.legalName, "Metal de prueba");assert.equal(actual.rut, "12345678-5");assert.equal(actual.email,"contacto@example.cl");assert.equal(actual.phone,"+56 9 1234 5678");assert.equal(actual.createdAt,ganador.createdAt);
    assert.equal((await guardarEmpresa({ legalName: "Versión vieja" },ganador)).ok,false);
    for(const rut of ["6.000.000-k","10.000.004-0"]){actual=registro(await guardarEmpresa({ rut },actual));assert.equal(actual.rut,rut==='6.000.000-k'?'6000000-K':'10000004-0')}
    actual=registro(await guardarEmpresa({ legalName:" ",rut:" ",email:" ",phone:" " },actual));assert.equal(actual.legalName,null);assert.equal(actual.rut,null);assert.equal(actual.email,null);assert.equal(actual.phone,null);
    assert.equal(actual.id,1);assert.equal(await prisma.companyProfile.count(),1);
    const bytes = await sharp({ create: { width: 800, height: 600, channels: 4, background: "#4477aa" } }).png().toBuffer();
    const archivo = new File([new Uint8Array(bytes)], "logo.png", { type: "image/png" });
    for (const formato of ["jpeg", "webp"] as const) {
      const contenido = await sharp(bytes).toFormat(formato).toBuffer();
      const salida = await prepararLogo(new File([new Uint8Array(contenido)], `logo.${formato}`, { type: `image/${formato}` }));
      assert.equal((await sharp(salida).metadata()).format, "png");
    }
    for (const malo of [new File([], "vacio.png", { type: "image/png" }),new File(["texto"], "falso.png", { type: "image/png" }),new File(['<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>'], "falso.png", { type: "image/png" }),new File([new Uint8Array(bytes)], "imagen.svg", { type: "image/svg+xml" }),new File([new Uint8Array(2*1024*1024+1)], "grande.png", { type: "image/png" })]) {
      assert.equal((await guardarEmpresaConLogo({},actual,malo)).ok,false);
    }
    actual=registro(await guardarEmpresaConLogo({legalName:"Con logo"},actual,archivo));
    assert(actual.logoUrl && actual.logoUrl.startsWith(URL_LOGO));
    const primero=actual.logoUrl.slice(URL_LOGO.length);
    const metadata=await sharp(await almacenLogo().leer(primero)).metadata();
    assert.equal(metadata.format,"png");assert.equal(metadata.width,512);assert.equal(metadata.height,384);assert.equal(metadata.exif,undefined);
    const antes=(await readdir(process.env.EMPRESA_LOGO_DIR!)).length;
    assert.equal((await guardarEmpresaConLogo({},ganador,archivo)).ok,false);
    assert.equal((await readdir(process.env.EMPRESA_LOGO_DIR!)).length,antes,"Conflicto elimina el nuevo archivo sin asociar.");
    assert.equal((await consultarEmpresa())?.logoUrl,actual.logoUrl);
    actual=registro(await guardarEmpresa({legalName:"Conservar logo"},actual));assert.equal(actual.logoUrl,URL_LOGO+primero);
    actual=registro(await guardarEmpresaConLogo({},actual,archivo));assert.notEqual(actual.logoUrl,URL_LOGO+primero);
    assert((await almacenLogo().leer(primero)).length>0,"Conservar versiones anteriores.");
    assert.equal((await guardarEmpresaConLogo({},actual,archivo,true)).ok,false);
    actual=registro(await guardarEmpresaConLogo({},actual,undefined,true));assert.equal(actual.logoUrl,null);
    await assert.rejects(almacenLogo().leer("../../.env"));
    console.log("Correcto: carga PNG/JPEG/WebP, normalización a PNG 512px, rechazo de vacío/SVG/falso/exceso de tamaño, conservación/reemplazo/quitar, limpieza ante conflicto y bloqueo de rutas fuera del directorio.");
    console.log("Correcto: consulta sin crear, perfil parcial/vacío, normalización, RUT K/0/DV inválido, correo/límites, primera creación concurrente sin sobrescritura y control de versión.");
  } finally { await prisma.companyProfile.deleteMany(); }
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect());
