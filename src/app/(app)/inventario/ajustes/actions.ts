"use server";
import { exigirAcceso, exigirOrigenAccion } from "@/lib/seguridad/acceso";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { ajusteSchema } from "@/lib/validaciones/ajuste";
import {
  consultarSaldoAjuste,
  registrarAjusteInventario,
} from "@/lib/servicios/ajustes-inventario";
export async function obtenerSaldoAjuste(entrada: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("ajustes.leer", true);

  return consultarSaldoAjuste(entrada);
}
/** La diferencia de la confirmación también se calcula con Decimal en servidor. */
export async function prepararConfirmacionAjuste(entrada: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("ajustes.operar", true);

  const v = ajusteSchema.safeParse(entrada);
  if (!v.success)
    return {
      ok: false as const,
      mensaje:
        "Completa fecha, cantidad, motivo y observación (hasta 2000 caracteres).",
    };
  return {
    ok: true as const,
    diferencia: new Prisma.Decimal(v.data.finalQuantity)
      .minus(v.data.reference.quantity)
      .toString(),
  };
}
export async function guardarDatosAjuste(entrada: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("ajustes.operar", true);

  const r = await registrarAjusteInventario(entrada);
  if (r.ok)
    for (const ruta of [
      "/inventario/ajustes",
      "/inventario/stock",
      "/inventario/movimientos",
      "/compras",
      "/mantenedores/materiales",
      "/mantenedores/bodegas",
    ])
      revalidatePath(ruta);
  return r;
}
