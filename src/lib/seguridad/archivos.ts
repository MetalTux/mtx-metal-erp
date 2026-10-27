import { headers as cabecerasPeticion } from "next/headers";
import { metadatosSeguridad } from "./metadatos";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { nombreCookieSeguridad } from "./configuracion";
import { consultarSesionSeguridad, registrarDenegacionSeguridad } from "./servicio";
import { tienePermiso, type PermisoSeguridad } from "./permisos";

export async function accesoArchivo(permiso?: PermisoSeguridad) {
  const sesion = await consultarSesionSeguridad((await cookies()).get(nombreCookieSeguridad("sesion"))?.value, true, metadatosSeguridad(await cabecerasPeticion()));
  const headers = { "Cache-Control": "private, no-store" };
  if (!sesion) return { respuesta: new Response(null, { status: 401, headers }), sesion: null };
  if (permiso && !tienePermiso(sesion.roles, permiso)) {await registrarDenegacionSeguridad(sesion.id,permiso,metadatosSeguridad(await cabecerasPeticion()));return { respuesta: new Response(null, { status: 403, headers }), sesion: null };}
  return { respuesta: null, sesion };
}

/** Sólo referencias en documentos que el rol puede consultar, también versiones históricas. */
export async function referenciaArchivoVisible(roles: readonly string[], url: string, tipo: "logo" | "tecnica") {
  const patron = `%${url}%`;
  if (tipo === "logo" && tienePermiso(roles, "configuracion.leer") && await prisma.companyProfile.count({ where: { logoUrl: url } })) return true;
  if (tienePermiso(roles, "cotizaciones.leer")) {
    const rows = tipo === "logo"
      ? await prisma.$queryRaw<{ existe: boolean }[]>`SELECT EXISTS(SELECT 1 FROM "Quote" WHERE "companySnapshot"->>'logoUrl'=${url} UNION ALL SELECT 1 FROM "QuotePdfEmission" WHERE snapshot::text LIKE ${patron}) AS existe`
      : await prisma.$queryRaw<{ existe: boolean }[]>`SELECT EXISTS(SELECT 1 FROM "QuoteImageLink" l JOIN "QuoteImageFile" f ON f.id=l."imageId" WHERE ${url}='/api/cotizaciones/imagenes/'||f."fileKey") AS existe`;
    if (rows[0]?.existe) return true;
  }
  if (tienePermiso(roles, "ordenes_cliente.leer")) {
    const rows = tipo === "logo"
      ? await prisma.$queryRaw<{ existe: boolean }[]>`SELECT EXISTS(SELECT 1 FROM "SalesOrder" WHERE "companySnapshot"->>'logoUrl'=${url}) AS existe`
      : await prisma.$queryRaw<{ existe: boolean }[]>`SELECT EXISTS(SELECT 1 FROM "SalesOrder" WHERE "technicalDescription"::text LIKE ${patron}) AS existe`;
    if (rows[0]?.existe) return true;
  }
  if (tienePermiso(roles, "trabajos.leer")) {
    const rows = tipo === "logo"
      ? await prisma.$queryRaw<{ existe: boolean }[]>`SELECT EXISTS(SELECT 1 FROM "WorkOrderPdfEmission" WHERE snapshot::text LIKE ${patron}) AS existe`
      : await prisma.$queryRaw<{ existe: boolean }[]>`SELECT EXISTS(SELECT 1 FROM "WorkOrder" WHERE "technicalDescription"::text LIKE ${patron}) AS existe`;
    if (rows[0]?.existe) return true;
  }
  if (tipo === "logo" && tienePermiso(roles, "guias.leer")) {
    const rows = await prisma.$queryRaw<{ existe: boolean }[]>`SELECT EXISTS(SELECT 1 FROM "DeliveryNote" WHERE "companySnapshot"->>'logoUrl'=${url}) AS existe`;
    if (rows[0]?.existe) return true;
  }
  return false;
}
