"use server";
import { exigirAcceso, exigirOrigenAccion } from "@/lib/seguridad/acceso";

import { revalidatePath } from "next/cache";
import { cambiarEstadoCuenta, guardarCuentaBancaria, listarCuentasBancarias, marcarCuentaPrincipal } from "@/lib/servicios/cuentas-bancarias";
import type { ResultadoCuentaBancaria } from "@/lib/tipos/cuenta-bancaria";
function actualizar(resultado: ResultadoCuentaBancaria) {
  if (resultado.ok) revalidatePath("/configuracion/empresa");
  return resultado;
}
export async function consultarCuentasEmpresa() {
  await exigirOrigenAccion();
  await exigirAcceso("configuracion.leer", true);
 return listarCuentasBancarias(); }
export async function guardarCuentaEmpresa(datos: unknown, referencia?: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("configuracion.operar", true);
 return actualizar(await guardarCuentaBancaria(datos, referencia)); }
export async function cambiarPrincipalEmpresa(referencia: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("configuracion.operar", true);
 return actualizar(await marcarCuentaPrincipal(referencia)); }
export async function cambiarEstadoCuentaEmpresa(referencia: unknown, activa: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("configuracion.operar", true);
 return actualizar(await cambiarEstadoCuenta(referencia, activa)); }
