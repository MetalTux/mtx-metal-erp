import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { normalizarRut } from "@/lib/validaciones/rut";
import { empresaSchema, referenciaEmpresaSchema } from "@/lib/validaciones/empresa";
import type { Empresa, ResultadoEmpresa } from "@/lib/tipos/empresa";
import { almacenLogo, prepararLogo, URL_LOGO } from "@/lib/almacenamiento/logo-empresa";

const seleccion = { id: true, legalName: true, tradeName: true, rut: true, businessActivity: true, address: true, commune: true, city: true, email: true, phone: true, logoUrl: true, createdAt: true, updatedAt: true } satisfies Prisma.CompanyProfileSelect;
function serializar(empresa: Prisma.CompanyProfileGetPayload<{ select: typeof seleccion }>): Empresa {
  return { ...empresa, createdAt: empresa.createdAt.toISOString(), updatedAt: empresa.updatedAt.toISOString() };
}
function errorOperacion(error: unknown): ResultadoEmpresa {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { ok: false, mensaje: "Otra sesión ya configuró la empresa. Actualiza los datos antes de editar." };
    if (error.code === "P2025") return { ok: false, mensaje: "Los datos de Empresa cambiaron o ya no existen. Actualiza los datos antes de editar." };
  }
  console.error("Error en Empresa:", error);
  return { ok: false, mensaje: "No se pudo completar la operación. Inténtalo nuevamente." };
}
export async function consultarEmpresa(): Promise<Empresa | null> {
  const perfil = await prisma.companyProfile.findUnique({ where: { id: 1 }, select: seleccion });
  return perfil ? serializar(perfil) : null;
}
export async function obtenerEmpresa(): Promise<ResultadoEmpresa> {
  try { return { ok: true, mensaje: "Datos de Empresa consultados.", empresa: await consultarEmpresa() }; }
  catch (error) { return errorOperacion(error); }
}
export async function guardarEmpresa(datos: unknown, referencia?: unknown, logoUrl?: string | null): Promise<ResultadoEmpresa> {
  const validacion = empresaSchema.safeParse(datos);
  if (!validacion.success) return { ok: false, mensaje: "Revisa los campos del formulario.", campos: validacion.error.flatten().fieldErrors };
  const version = referencia === undefined ? undefined : referenciaEmpresaSchema.safeParse(referencia);
  if (version && !version.success) return { ok: false, mensaje: "La referencia del perfil no es válida. Actualiza los datos." };
  const { rut, ...campos } = validacion.data;
  const data = { legalName: campos.legalName || null, tradeName: campos.tradeName || null, rut: rut ? normalizarRut(rut) : null, businessActivity: campos.businessActivity || null, address: campos.address || null, commune: campos.commune || null, city: campos.city || null, email: campos.email || null, phone: campos.phone || null, ...(logoUrl !== undefined && { logoUrl }) };
  try {
    // Crear explícitamente: un upsert podría sobrescribir una primera configuración concurrente.
    const perfil = version?.success
      ? await prisma.companyProfile.update({ where: { id: 1, updatedAt: new Date(version.data.updatedAt) }, data: { ...data, updatedAt: new Date(Math.max(Date.now(), new Date(version.data.updatedAt).getTime() + 1)) }, select: seleccion })
      : await prisma.companyProfile.create({ data: { ...data, id: 1 }, select: seleccion });
    return { ok: true, mensaje: "Datos de Empresa guardados.", empresa: serializar(perfil) };
  } catch (error) { return errorOperacion(error); }
}

export async function guardarEmpresaConLogo(datos: unknown, referencia?: unknown, archivo?: File, quitarLogo = false): Promise<ResultadoEmpresa> {
  // Validar antes de escribir archivos; guardarEmpresa vuelve a validar al persistir.
  const validacion = empresaSchema.safeParse(datos);
  if (!validacion.success) return { ok: false, mensaje: "Revisa los campos del formulario.", campos: validacion.error.flatten().fieldErrors };
  if (referencia !== undefined && !referenciaEmpresaSchema.safeParse(referencia).success) return { ok: false, mensaje: "La referencia del perfil no es válida. Actualiza los datos." };
  if (archivo && quitarLogo) return { ok: false, mensaje: "Selecciona un nuevo logo o quita el existente, sin combinar ambas opciones." };
  let nuevoArchivo: string | undefined;
  const almacen = almacenLogo();
  try {
    if (archivo) {
      const contenido = await prepararLogo(archivo);
      nuevoArchivo = await almacen.guardar(contenido);
    }
    const resultado = await guardarEmpresa(datos, referencia, nuevoArchivo ? URL_LOGO + nuevoArchivo : quitarLogo ? null : undefined);
    if (!resultado.ok && nuevoArchivo) await almacen.eliminar(nuevoArchivo);
    // Las versiones anteriores se conservan para referencias y respaldos futuros.
    return resultado;
  } catch (error) {
    if (nuevoArchivo) {
      try { await almacen.eliminar(nuevoArchivo); } catch (limpieza) { console.error("No se pudo retirar un logo sin asociar:", limpieza); }
    }
    console.error("Error al guardar logo de Empresa:", error);
    return { ok: false, mensaje: error instanceof Error && (error.message.startsWith("El logo") || error.message.startsWith("Selecciona un logo")) ? error.message : "No se pudo almacenar el logo. Revisa los permisos del directorio e inténtalo nuevamente." };
  }
}
