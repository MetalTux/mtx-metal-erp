"use server";
import { revalidatePath } from "next/cache";
import { cambiarEstadoCuenta, guardarCuentaBancaria, listarCuentasBancarias, marcarCuentaPrincipal } from "@/lib/servicios/cuentas-bancarias";
import type { ResultadoCuentaBancaria } from "@/lib/tipos/cuenta-bancaria";
function actualizar(resultado: ResultadoCuentaBancaria) {
  if (resultado.ok) revalidatePath("/configuracion/empresa");
  return resultado;
}
export async function consultarCuentasEmpresa() { return listarCuentasBancarias(); }
export async function guardarCuentaEmpresa(datos: unknown, referencia?: unknown) { return actualizar(await guardarCuentaBancaria(datos, referencia)); }
export async function cambiarPrincipalEmpresa(referencia: unknown) { return actualizar(await marcarCuentaPrincipal(referencia)); }
export async function cambiarEstadoCuentaEmpresa(referencia: unknown, activa: unknown) { return actualizar(await cambiarEstadoCuenta(referencia, activa)); }
