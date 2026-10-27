import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { exigirAcceso, exigirAccesoEnTransaccion } from "@/lib/seguridad/acceso";
import { anotarMutacion } from "@/lib/seguridad/autoria";
import { fechaCalendarioValida, inicioDiaChile } from "@/lib/fechas-chile";
import { hoyOrden } from "@/lib/servicios/ordenes-compra-cliente";
const id = z.number().int().positive().safe();
import { mediosCobranza } from "@/config/medios-cobranza";
const alta = z.object({ cuentaId: id, importe: z.string().regex(/^\d{1,12}(?:\.\d{1,2})?$/).refine(v=>new Prisma.Decimal(v).gt(0)), fecha: z.string().refine(fechaCalendarioValida), medio: z.enum(mediosCobranza), referencia: z.string().trim().max(150).nullable(), clave: z.string().uuid().transform(v=>v.toLowerCase()) }).strict();
const baja = z.object({ pagoId: id, motivo: z.string().trim().min(1).max(1000) }).strict();
export type ResultadoCobro = { ok: boolean; mensaje: string; pagoId?: number; incierto?: boolean };
class Rechazo extends Error {}
function exigir(v: unknown, mensaje: string): asserts v { if (!v) throw new Rechazo(mensaje); }
function fallo(e: unknown): ResultadoCobro {
  if (e instanceof Rechazo) return {ok:false,mensaje:e.message};
  if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
  return {ok:false,incierto:true,mensaje:"No se pudo confirmar el resultado. Conserva los datos y reintenta la misma operación; no registres otra para reemplazarla."};
}
export async function registrarAbono(entrada: unknown): Promise<ResultadoCobro> {
  await exigirAcceso("cobranza.operar");
  const p=alta.safeParse(entrada);if(!p.success)return {ok:false,mensaje:"Revisa importe positivo, fecha, medio y referencia (máximo 150 caracteres)."};
  const d=p.data, importe=new Prisma.Decimal(d.importe), paidAt=inicioDiaChile(d.fecha), reference=d.referencia||null;
  try { return await prisma.$transaction(async tx=>{
    await exigirAccesoEnTransaccion(tx,"cobranza.operar");
    // El bloqueo de cuenta serializa pagos y es compatible con OCC/factura: no se adquieren sus bloqueos después.
    await tx.$queryRaw`SELECT id FROM "AccountReceivable" WHERE id=${d.cuentaId} FOR UPDATE`;
    const anterior=await tx.payment.findUnique({where:{idempotencyKey:d.clave}});
    if(anterior){
      exigir(anterior.accountReceivableId===d.cuentaId&&anterior.amount.eq(importe)&&anterior.paidAt.getTime()===paidAt.getTime()&&anterior.method===d.medio&&anterior.reference===reference,"La clave de este abono ya fue utilizada con otros datos. Recupera el resultado original.");
      return {ok:true,pagoId:anterior.id,mensaje:"Abono ya registrado; se conserva su estado actual, incluida una eventual anulación."};
    }
    exigir(d.fecha<=hoyOrden(),"La fecha del pago no puede ser futura según Santiago.");
    const cuenta=await tx.accountReceivable.findUnique({where:{id:d.cuentaId}});
    exigir(cuenta&&!cuenta.voidedAt,"La cuenta no existe o está anulada.");
    const suma=await tx.payment.aggregate({where:{accountReceivableId:cuenta.id,voidedAt:null},_sum:{amount:true}});
    const saldo=cuenta.amount.minus(suma._sum.amount??0);
    exigir(saldo.gte(importe),"El abono supera el saldo disponible. Actualiza y revisa los pagos antes de continuar.");
    const pago=await anotarMutacion(tx,"payment","create",await tx.payment.create({data:{accountReceivableId:cuenta.id,amount:importe,paidAt,method:d.medio,reference,idempotencyKey:d.clave}}));
    return {ok:true,pagoId:pago.id,mensaje:"Abono registrado. El saldo se actualizó sin modificar factura ni entregas."};
  },{timeout:30000}); } catch(e){return fallo(e);}
}
export async function anularAbono(entrada: unknown): Promise<ResultadoCobro> {
  await exigirAcceso("cobranza.operar");
  const p=baja.safeParse(entrada);if(!p.success)return {ok:false,mensaje:"Indica el abono y un motivo de anulación (hasta 1000 caracteres)."};
  const d=p.data;
  try {return await prisma.$transaction(async tx=>{
    await exigirAccesoEnTransaccion(tx,"cobranza.operar");
    const origen=await tx.payment.findUnique({where:{id:d.pagoId},select:{accountReceivableId:true}});exigir(origen,"No se encontró el abono.");
    await tx.$queryRaw`SELECT id FROM "AccountReceivable" WHERE id=${origen.accountReceivableId} FOR UPDATE`;
    const pago=await tx.payment.findUniqueOrThrow({where:{id:d.pagoId}});
    if(pago.voidedAt){exigir(pago.voidReason===d.motivo,"El abono ya fue anulado con otro motivo; su historial se conserva.");return {ok:true,pagoId:pago.id,mensaje:"La anulación ya estaba registrada."};}
    const cuenta=await tx.accountReceivable.findUniqueOrThrow({where:{id:pago.accountReceivableId}});exigir(!cuenta.voidedAt,"La cuenta está anulada; requiere revisión antes de operar.");
    await anotarMutacion(tx,"payment","update",await tx.payment.update({where:{id:pago.id},data:{voidedAt:new Date(),voidReason:d.motivo}}));
    // Identidad natural de anulación: un único abono y motivo inmutable; repetir no vuelve a escribir ni atribuir autoría.
    return {ok:true,pagoId:pago.id,mensaje:"Abono anulado. Se conserva el historial y su importe vuelve a quedar pendiente."};
  },{timeout:30000});}catch(e){return fallo(e);}
}
