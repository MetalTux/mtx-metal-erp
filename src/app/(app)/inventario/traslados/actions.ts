"use server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { trasladoSchema } from "@/lib/validaciones/traslado";
import {
  consultarSaldosTraslado,
  registrarTrasladoInventario,
} from "@/lib/servicios/traslados-inventario";
import { inicioDiaChile } from "@/lib/fechas-chile";
export async function obtenerSaldosTraslado(entrada: unknown) {
  return consultarSaldosTraslado(entrada);
}
/** Previsión con Decimal en servidor; registrar vuelve a comprobar referencias y saldos bajo bloqueo. */
export async function prepararConfirmacionTraslado(entrada: unknown) {
  const v = trasladoSchema.safeParse(entrada);
  if (!v.success)
    return {
      ok: false as const,
      mensaje:
        "Completa material, dos bodegas distintas, fecha, cantidad y observación.",
    };
  const d = v.data,
    q = new Prisma.Decimal(d.quantity),
    origen = new Prisma.Decimal(d.sourceReference.quantity).minus(q),
    destino = new Prisma.Decimal(d.destinationReference.quantity).plus(q);
  if (!q.gt(0) || origen.lt(0) || destino.gt("99999999999.999"))
    return {
      ok: false as const,
      mensaje:
        "Revisa cantidad positiva, saldo disponible en origen y límite de destino.",
    };
  if (inicioDiaChile(d.date) > new Date())
    return { ok: false as const, mensaje: "La fecha no puede ser futura." };
  return {
    ok: true as const,
    origenFinal: origen.toString(),
    destinoFinal: destino.toString(),
  };
}
export async function guardarDatosTraslado(entrada: unknown) {
  const r = await registrarTrasladoInventario(entrada);
  if (r.ok)
    for (const ruta of [
      "/inventario/traslados",
      "/inventario/stock",
      "/inventario/movimientos",
      "/inventario/ajustes",
      "/compras",
      "/mantenedores/materiales",
      "/mantenedores/bodegas",
    ])
      revalidatePath(ruta);
  return r;
}
