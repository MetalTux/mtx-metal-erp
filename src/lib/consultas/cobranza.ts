import { esquemaCobranzaC3 } from "./esquema-cobranza-c3";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { exigirAcceso, exigirAccesoEnTransaccion } from "@/lib/seguridad/acceso";
import { hoyOrden } from "@/lib/servicios/ordenes-compra-cliente";

const esquema = z.object({
  q: z.string().trim().max(150).catch(""),
  estado: z.enum(["TODOS", "PENDIENTE", "PARCIAL", "PAGADA", "ANULADA"]).catch("TODOS"),
  vencimiento: z.enum(["TODOS", "VENCIDA", "HOY", "SIN_FECHA"]).catch("TODOS"),
  pagina: z.coerce.number().int().positive().safe().catch(1),
  orden: z.coerce.number().int().positive().safe().optional().catch(undefined),
  cuenta: z.coerce.number().int().positive().safe().optional().catch(undefined),
  promesas: z.coerce.number().int().positive().safe().catch(1),
  abonos: z.coerce.number().int().positive().safe().catch(1),
});
type CuentaSql = { id: number; salesOrderId: number; cliente: string; sucursal: string; folio: string; importe: Prisma.Decimal; abonado: Prisma.Decimal; saldo: Prisma.Decimal; dueDate: Date | null; paymentPromiseDate: Date | null; voidedAt: Date | null; voidReason: string | null; factura: string | null; invoiceDate: Date | null };
const dia = (v: Date | null) => v?.toISOString().slice(0, 10) ?? null;
const texto = (c: CuentaSql) => ({ ...c, importe: c.importe.toFixed(2), abonado: c.abonado.toFixed(2), saldo: c.saldo.toFixed(2), dueDate: dia(c.dueDate), paymentPromiseDate: dia(c.paymentPromiseDate), voidedAt: c.voidedAt?.toISOString() ?? null, invoiceDate: dia(c.invoiceDate) });
// Agregar pagos antes de unir documentos evita multiplicar la deuda por guías o abonos.
const base = Prisma.sql`WITH cuentas AS (
 SELECT a.id, a."salesOrderId", COALESCE(s."clientName", 'Cliente histórico sin nombre') AS cliente,
 COALESCE(s."branchName", 'Sin sucursal histórica') AS sucursal, COALESCE(f.folio, 'OCC #' || s.id::text) AS folio,
 a.amount AS importe, COALESCE(p.abonado, 0::numeric) AS abonado, a.amount - COALESCE(p.abonado, 0::numeric) AS saldo,
 a."dueDate", a."paymentPromiseDate", a."voidedAt", a."voidReason", i."invoiceNumber" AS factura, i."invoiceDate"
 FROM "AccountReceivable" a JOIN "SalesOrder" s ON s.id = a."salesOrderId"
 LEFT JOIN "DocumentFolio" f ON f.id = s."folioId"
 LEFT JOIN (SELECT "accountReceivableId", SUM(amount) AS abonado FROM "Payment" WHERE "voidedAt" IS NULL GROUP BY "accountReceivableId") p ON p."accountReceivableId" = a.id
 LEFT JOIN "WorkOrder" w ON w."salesOrderId" = s.id
 LEFT JOIN "WorkOrderInvoiceReference" i ON i.id = w."currentInvoiceReferenceId"
)`;
export async function consultarCobranza(entrada: unknown) {
  await exigirAcceso("cobranza.leer");
  await exigirAcceso("precios.leer");
  const f = esquema.parse(entrada), hoy = hoyOrden();
  const condiciones: Prisma.Sql[] = [Prisma.sql`TRUE`];
  if (f.q) {
    const patron = `%${f.q.replace(/[\\%_]/g, "\\$&")}%`;
    condiciones.push(Prisma.sql`(cliente ILIKE ${patron} OR folio ILIKE ${patron} OR factura ILIKE ${patron})`);
  }
  if (f.estado === "ANULADA") condiciones.push(Prisma.sql`"voidedAt" IS NOT NULL`);
  else {
    condiciones.push(Prisma.sql`"voidedAt" IS NULL`);
    if (f.estado === "PAGADA") condiciones.push(Prisma.sql`saldo = 0`);
    if (f.estado === "PARCIAL") condiciones.push(Prisma.sql`saldo > 0 AND abonado > 0`);
    if (f.estado === "PENDIENTE") condiciones.push(Prisma.sql`saldo > 0 AND abonado = 0`);
  }
  if (f.vencimiento !== "TODOS") condiciones.push(Prisma.sql`saldo > 0 AND "voidedAt" IS NULL`);
  if (f.vencimiento === "VENCIDA") condiciones.push(Prisma.sql`"dueDate" < ${hoy}::date`);
  if (f.vencimiento === "HOY") condiciones.push(Prisma.sql`"dueDate" = ${hoy}::date`);
  if (f.vencimiento === "SIN_FECHA") condiciones.push(Prisma.sql`"dueDate" IS NULL`);
  const where = Prisma.sql`WHERE ${Prisma.join(condiciones, " AND ")}`;
  return prisma.$transaction(async tx => {
    await exigirAccesoEnTransaccion(tx, "cobranza.leer");
    await exigirAccesoEnTransaccion(tx, "precios.leer");
    const [resumen] = await tx.$queryRaw<ResumenSql[]>(resumenSql(where,hoy));
    const total = Number(resumen.total), paginas = Math.max(1, Math.ceil(total / 20)), pagina = Math.min(f.pagina, paginas);
    const filas = await tx.$queryRaw<CuentaSql[]>(Prisma.sql`${base} SELECT * FROM cuentas ${where} ORDER BY "dueDate" ASC NULLS LAST, id DESC LIMIT 20 OFFSET ${(pagina - 1) * 20}`);
    const c3Disponible=await esquemaCobranzaC3.disponible(tx);
    const origenCuenta=!f.cuenta&&f.orden?await tx.accountReceivable.findUnique({where:{salesOrderId:f.orden},select:{id:true}}):null;
    const cuentaId=f.cuenta??origenCuenta?.id;
    let detalle;
    if (cuentaId) {
      const [cuenta] = await tx.$queryRaw<CuentaSql[]>(Prisma.sql`${base} SELECT * FROM cuentas WHERE id = ${cuentaId}`);
      if (cuenta) {
        const totalAbonos = await tx.payment.count({ where: { accountReceivableId: cuenta.id } });
        const paginasAbonos = Math.max(1, Math.ceil(totalAbonos / 20)), paginaAbonos = Math.min(f.abonos, paginasAbonos);
        const abonos = await tx.payment.findMany({ where: { accountReceivableId: cuenta.id }, orderBy: [{ paidAt: "desc" }, { id: "desc" }], skip: (paginaAbonos - 1) * 20, take: 20,
          select: { id: true, amount: true, paidAt: true, method: true, reference: true, voidedAt: true, voidReason: true, createdAt: true } });
        const adjuntos=c3Disponible?await tx.paymentAttachment.findMany({where:{paymentId:{in:abonos.map(p=>p.id)}},select:{id:true,paymentId:true,originalName:true,createdAt:true},orderBy:[{createdAt:"desc"},{id:"desc"}]}):[];
        const version=await tx.accountReceivable.findUniqueOrThrow({where:{id:cuenta.id},select:{updatedAt:true}});
        const totalPromesas=c3Disponible?await tx.paymentPromiseChange.count({where:{accountReceivableId:cuenta.id}}):0,paginasPromesas=Math.max(1,Math.ceil(totalPromesas/20)),paginaPromesas=Math.min(f.promesas,paginasPromesas);
        const promesas=c3Disponible?await tx.paymentPromiseChange.findMany({where:{accountReceivableId:cuenta.id},orderBy:[{createdAt:"desc"},{id:"desc"}],skip:(paginaPromesas-1)*20,take:20,select:{id:true,previousDate:true,newDate:true,reason:true,createdAt:true}}):[];
        detalle = { ...texto(cuenta), versionPromesa:`${version.updatedAt.toISOString()}|${totalPromesas}`, totalPromesas,paginasPromesas,paginaPromesas,promesas:promesas.map(p=>({...p,previousDate:dia(p.previousDate),newDate:dia(p.newDate),createdAt:p.createdAt.toISOString()})), totalAbonos, paginasAbonos, paginaAbonos, abonos: abonos.map(p => ({ ...p, adjuntos:adjuntos.filter(a=>a.paymentId===p.id).map(a=>({...a,createdAt:a.createdAt.toISOString()})), amount: p.amount.toFixed(2), paidAt: p.paidAt.toISOString(), createdAt: p.createdAt.toISOString(), voidedAt: p.voidedAt?.toISOString() ?? null })) };
      }
    }
    return { c3Disponible, filtros: { ...f, cuenta:cuentaId, pagina }, hoy, total, paginas, pendiente: resumen.pendiente.toFixed(2), vencido: resumen.vencido.toFixed(2), filas: filas.map(texto), detalle, cuentaNoEncontrada: Boolean((f.cuenta||f.orden) && !detalle) };
  }, { isolationLevel: "RepeatableRead" });
}
export type ConsultaCobranza = Awaited<ReturnType<typeof consultarCobranza>>;


type ResumenSql={total:bigint;pendiente:Prisma.Decimal;vencido:Prisma.Decimal;cuentasVencidas:bigint};
function resumenSql(where:Prisma.Sql,hoy:string){return Prisma.sql`${base}
 SELECT COUNT(*) AS total, COALESCE(SUM(saldo) FILTER (WHERE "voidedAt" IS NULL AND saldo>0),0::numeric) AS pendiente,
 COALESCE(SUM(saldo) FILTER (WHERE "voidedAt" IS NULL AND saldo>0 AND "dueDate"<${hoy}::date),0::numeric) AS vencido,
 COUNT(*) FILTER (WHERE "voidedAt" IS NULL AND saldo>0 AND "dueDate"<${hoy}::date) AS "cuentasVencidas" FROM cuentas ${where}`;}
/** Resumen de toda la empresa; preparado para consumidores futuros, sin cargar filas del listado. */
export async function consultarResumenCobranza(){
 await exigirAcceso("cobranza.leer");await exigirAcceso("precios.leer");const hoy=hoyOrden();
 return prisma.$transaction(async tx=>{
  await exigirAccesoEnTransaccion(tx,"cobranza.leer");await exigirAccesoEnTransaccion(tx,"precios.leer");
  const [r]=await tx.$queryRaw<ResumenSql[]>(resumenSql(Prisma.sql`WHERE "voidedAt" IS NULL`,hoy));
  return {hoy,cuentasVigentes:Number(r.total),cuentasVencidas:Number(r.cuentasVencidas),porCobrar:r.pendiente.toFixed(2),vencido:r.vencido.toFixed(2)};
 },{isolationLevel:"RepeatableRead"});
}
