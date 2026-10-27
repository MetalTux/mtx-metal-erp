import { metadatosSeguridad } from "./metadatos";
import { fijarActorTransaccion } from "./autoria";
import type { Prisma } from "@/generated/prisma/client";
import { AsyncLocalStorage } from "node:async_hooks";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { nombreCookieSeguridad, configuracionSeguridad } from "./configuracion";
import { consultarSesionSeguridad, autorizarSesionEnTransaccion, registrarDenegacionSeguridad } from "./servicio";
import { tienePermiso, type PermisoSeguridad } from "./permisos";
import { origenSeguridadPermitido } from "./origen";

const credencialInterna = new AsyncLocalStorage<string>();
/** Adaptador de procesos de servidor: sólo transporta una credencial que se valida en DB. */
export function conCredencialSeguridad<T>(token: string, tarea: () => T): T {
  return credencialInterna.run(token, tarea);
}
export async function credencialServidor() {
  return credencialInterna.getStore() ?? (await cookies()).get(nombreCookieSeguridad("sesion", await headers()))?.value;
}
export async function exigirAccesoEnTransaccion(tx: Prisma.TransactionClient, permiso: PermisoSeguridad) {
  const actor = await autorizarSesionEnTransaccion(tx, await credencialServidor(), permiso);
  fijarActorTransaccion(tx, actor.id);
  return actor;
}
/** Siempre consulta la sesión vigente: no se confía en roles ni actor del formulario. */
export async function metadatosPeticion() {
  try { return metadatosSeguridad(await headers()); } catch { return {}; }
}
export async function exigirAcceso(permiso?: PermisoSeguridad, registrarActividad = false) {
  const sesion = await consultarSesionSeguridad(await credencialServidor(), registrarActividad, await metadatosPeticion());
  if (!sesion) redirect("/ingresar");
  if (permiso && !tienePermiso(sesion.roles, permiso)) {
    await registrarDenegacionSeguridad(sesion.id,permiso,await metadatosPeticion());
    redirect("/acceso-denegado");
  }
  return sesion;
}

/** Defensa adicional al origen que comprueba Next en Server Actions. */
export async function exigirOrigenAccion() {
  const h = await headers();
  if (!origenSeguridadPermitido(h, configuracionSeguridad().origin)) {
    redirect("/acceso-denegado");
  }
}
