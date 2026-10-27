import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { exigirAcceso,exigirAccesoEnTransaccion } from "@/lib/seguridad/acceso";
import { tienePermiso,type PermisoSeguridad } from "@/lib/seguridad/permisos";
import { hoyOrden } from "@/lib/servicios/ordenes-compra-cliente";
import { consultarResumenCobranza } from "./cobranza";
type Bloque<T>={datos:T;error?:never}|{datos:null;error:string};
async function capturar<T>(tarea:()=>Promise<T>):Promise<Bloque<T>>{try{return {datos:await tarea()};}catch(e){if(e instanceof Error&&e.message.includes('NEXT_REDIRECT'))throw e;console.error('No se pudo consultar un bloque del Dashboard.');return {datos:null,error:'No se pudo consultar este bloque. Vuelve a cargar la página.'};}}
function sumarDias(dia:string,n:number){const d=new Date(dia+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
const planes=Prisma.sql`WITH planes AS (SELECT w.*,COALESCE(p."planConfirmed",false) confirmado FROM "WorkOrder" w LEFT JOIN LATERAL(SELECT "planConfirmed" FROM "WorkOrderOperation" WHERE "workOrderId"=w.id AND type IN ('CREAR','EDITAR_PLAN') ORDER BY version DESC LIMIT 1)p ON true), activas AS(SELECT * FROM planes WHERE "schemaVersion" IS NOT NULL AND (status='EN_PROCESO' OR(status='PENDIENTE' AND confirmado)))`;
const interno={
 async tx<T>(permiso:PermisoSeguridad,tarea:(tx:Prisma.TransactionClient)=>Promise<T>){return prisma.$transaction(async tx=>{await exigirAccesoEnTransaccion(tx,permiso);return tarea(tx);},{isolationLevel:'RepeatableRead'});},
 async ofertas(hoy:string,precios:boolean){return this.tx('cotizaciones.leer',async tx=>{
  if(precios)await exigirAccesoEnTransaccion(tx,'precios.leer');
  const fecha=new Date(hoy+'T00:00:00Z'),hasta=new Date(sumarDias(hoy,7)+'T00:00:00Z'),where={deletedAt:null,status:'PENDIENTE' as const};
  const legadas=await tx.quote.count({where:{...where,folioId:null}});
  const pendientes=await tx.quote.count({where}),vencidas=await tx.quote.count({where:{...where,validUntil:{lt:fecha}}});
  const porVencer=await tx.quote.count({where:{...where,validUntil:{gte:fecha,lte:hasta}}});
  const proximas=await tx.quote.findMany({where:{...where,validUntil:{gte:fecha,lte:hasta}},orderBy:[{validUntil:'asc'},{id:'desc'}],take:6,select:{id:true,clientName:true,validUntil:true,folioId:true}});
  const folios=await tx.documentFolio.findMany({where:{id:{in:proximas.flatMap(q=>q.folioId?[q.folioId]:[])}},select:{id:true,folio:true}});
  let monto:string|undefined,meses:{mes:string;cotizado:string;contratado:string}[]|undefined;
  if(precios){monto=(await tx.quote.aggregate({where,_sum:{totalAmount:true}}))._sum.totalAmount?.toFixed(2)??'0.00';
   const [y,m]=hoy.split('-').map(Number),inicio=new Date(Date.UTC(y,m-6,1)).toISOString().slice(0,10),fin=new Date(Date.UTC(y,m,1)).toISOString().slice(0,10);
   const rows=await tx.$queryRaw<{mes:string;cotizado:Prisma.Decimal;contratado:Prisma.Decimal}[]>`SELECT to_char(q.date,'YYYY-MM') mes,SUM(q."totalAmount") cotizado,COALESCE(SUM(s."totalAmount") FILTER(WHERE s.status='CONFIRMADA'),0::numeric) contratado FROM "Quote" q LEFT JOIN "SalesOrder" s ON s."quoteId"=q.id WHERE q."deletedAt" IS NULL AND q.date>=${inicio}::date AND q.date<${fin}::date GROUP BY 1 ORDER BY 1`;
   meses=Array.from({length:6},(_,i)=>{const mes=new Date(Date.UTC(y,m-6+i,1)).toISOString().slice(0,7),r=rows.find(r=>r.mes===mes);return {mes,cotizado:r?.cotizado.toFixed(2)??'0.00',contratado:r?.contratado.toFixed(2)??'0.00'};});
  }
  return {pendientes,legadas,vencidas,vigentes:pendientes-vencidas,porVencer,...(precios?{monto,meses}:{}),proximas:proximas.map(q=>({id:q.id,legada:q.folioId===null,cliente:q.clientName??'Sin copia histórica de cliente',fecha:q.validUntil!.toISOString().slice(0,10),folio:folios.find(f=>f.id===q.folioId)?.folio??`Cotización #${q.id}`}))};
 });},
 async trabajos(){return this.tx('trabajos.leer',async tx=>{
  const [r]=await tx.$queryRaw<{preparacion:bigint;produccion:bigint;borradores:bigint;legadas:bigint}[]>(Prisma.sql`${planes} SELECT COUNT(*) FILTER(WHERE "schemaVersion" IS NOT NULL AND status='PENDIENTE' AND confirmado) preparacion,COUNT(*) FILTER(WHERE "schemaVersion" IS NOT NULL AND status='EN_PROCESO') produccion,COUNT(*) FILTER(WHERE "schemaVersion" IS NOT NULL AND status='PENDIENTE' AND NOT confirmado) borradores,COUNT(*) FILTER(WHERE "schemaVersion" IS NULL AND status IN ('PENDIENTE','EN_PROCESO')) legadas FROM planes`);
  const filas=await tx.$queryRaw<{id:number;productName:string;status:string;date:Date|null;cliente:string;folio:string}[]>(Prisma.sql`${planes} SELECT a.id,a."productName",a.status,a.date,CASE WHEN a."salesOrderId" IS NULL THEN 'Obra propia' ELSE COALESCE(s."clientName",'Sin cliente histórico') END cliente,COALESCE(f.folio,'OT #'||a.id::text) folio FROM activas a LEFT JOIN "SalesOrder" s ON s.id=a."salesOrderId" LEFT JOIN "DocumentFolio" f ON f.id=a."folioId" ORDER BY a."targetDate" ASC NULLS LAST,a.date,a.id LIMIT 6`);
  return {preparacion:Number(r.preparacion),produccion:Number(r.produccion),borradores:Number(r.borradores),legadas:Number(r.legadas),filas:filas.map(f=>({...f,date:f.date?.toISOString().slice(0,10)??null}))};
 });},
 async inventario(){return this.tx('inventario.leer',async tx=>{
  const [bajo]=await tx.$queryRaw<{cantidad:bigint}[]>`SELECT COUNT(*) cantidad FROM "WarehouseStock" WHERE "minStock" IS NOT NULL AND quantity<"minStock"`;
  const demanda=Prisma.sql`${planes}, demanda AS(SELECT d.id,d."rawMaterialId",d."warehouseId",public.demanda_pendiente_requerimiento(d.id) pendiente,COALESCE((SELECT SUM(public.reserva_activa_asignacion(a.id)) FROM "StockReservationAllocation" a WHERE a."plannedDetailId"=d.id),0::numeric) reservado FROM "WorkOrderDetail" d JOIN activas w ON w.id=d."workOrderId" WHERE d."retiredAt" IS NULL), grupos AS(SELECT "rawMaterialId","warehouseId",SUM(pendiente) requerido,SUM(reservado) reservado FROM demanda GROUP BY 1,2 HAVING SUM(pendiente)>0), saldos AS(SELECT g.*,COALESCE(s.quantity,0::numeric) fisico,COALESCE(s.quantity,0::numeric)-public.reserva_activa_recurso(g."rawMaterialId",NULL,g."warehouseId") libre,GREATEST(g.requerido-g.reservado,0) por_reservar FROM grupos g LEFT JOIN "WarehouseStock" s ON s."rawMaterialId"=g."rawMaterialId" AND s."warehouseId"=g."warehouseId")`;
  const rows=await tx.$queryRaw<{rawMaterialId:number;warehouseId:number;material:string;bodega:string;unidad:string;requerido:Prisma.Decimal;reservado:Prisma.Decimal;fisico:Prisma.Decimal;libre:Prisma.Decimal;por_reservar:Prisma.Decimal;faltante:Prisma.Decimal;total:bigint}[]>(Prisma.sql`${demanda} SELECT s.*,r.name material,w.name bodega,u.abbreviation unidad,GREATEST(s.por_reservar-GREATEST(s.libre,0),0) faltante,COUNT(*) OVER() total FROM saldos s JOIN "RawMaterial" r ON r.id=s."rawMaterialId" JOIN "Warehouse" w ON w.id=s."warehouseId" JOIN "UnitMeasure" u ON u.id=r."unitMeasureId" ORDER BY faltante DESC,s.por_reservar DESC,r.name,w.name LIMIT 10`);
  const movimientos=await tx.$queryRaw<{id:number;origen:string;name:string;bodega:string;unidad:string;quantity:Prisma.Decimal;type:string;date:Date;createdAt:Date}[]>`SELECT * FROM(SELECT m.id,'Materia prima'::text origen,r.name,w.name bodega,u.abbreviation unidad,m.quantity,m.type::text,m.date,m."createdAt" FROM "StockMovement" m JOIN "RawMaterial" r ON r.id=m."rawMaterialId" JOIN "Warehouse" w ON w.id=m."warehouseId" JOIN "UnitMeasure" u ON u.id=r."unitMeasureId" UNION ALL SELECT m.id,'Producto terminado',p.name,w.name,u.abbreviation,m.quantity,m.type::text,m.date,m."createdAt" FROM "ProductStockMovement" m JOIN "Product" p ON p.id=m."productId" JOIN "Warehouse" w ON w.id=m."warehouseId" JOIN "UnitMeasure" u ON u.id=p."unitMeasureId") t ORDER BY "createdAt" DESC,origen,id DESC LIMIT 10`;
  return {bajo:Number(bajo.cantidad),totalRequerimientos:Number(rows[0]?.total??0),requerimientos:rows.map(r=>({materialId:r.rawMaterialId,bodegaId:r.warehouseId,material:r.material,bodega:r.bodega,unidad:r.unidad,requerido:r.requerido.toFixed(3),reservado:r.reservado.toFixed(3),fisico:r.fisico.toFixed(3),libre:r.libre.toFixed(3),porReservar:r.por_reservar.toFixed(3),faltante:r.faltante.toFixed(3)})),movimientos:movimientos.map(m=>({...m,quantity:m.quantity.toFixed(3),date:m.date.toISOString().slice(0,10),createdAt:m.createdAt.toISOString()}))};
 });}
};
export async function consultarDashboard(){
 const s=await exigirAcceso(),hoy=hoyOrden(),puede=(p:PermisoSeguridad)=>tienePermiso(s.roles,p);
 const ofertas=puede('cotizaciones.leer')?await capturar(()=>interno.ofertas(hoy,puede('precios.leer'))):null;
 const trabajos=puede('trabajos.leer')?await capturar(()=>interno.trabajos()):null;
 const inventario=puede('inventario.leer')?await capturar(()=>interno.inventario()):null;
 const cobranza=puede('cobranza.leer')&&puede('precios.leer')?await capturar(()=>consultarResumenCobranza()):null;
 return {hoy,ofertas,trabajos,inventario,cobranza};
}
export async function consultarAvisosDashboard(){
 const s=await exigirAcceso(),hoy=hoyOrden(),puede=(p:PermisoSeguridad)=>tienePermiso(s.roles,p);
 return capturar(()=>prisma.$transaction(async tx=>{
  const avisos:{titulo:string;cantidad:number;ruta:string}[]=[];
  if(puede('inventario.leer')){await exigirAccesoEnTransaccion(tx,'inventario.leer');const [r]=await tx.$queryRaw<{n:bigint}[]>`SELECT COUNT(*) n FROM "WarehouseStock" WHERE "minStock" IS NOT NULL AND quantity<"minStock"`;avisos.push({titulo:'Combinaciones material/bodega bajo mínimo',cantidad:Number(r.n),ruta:'/inventario/stock?reposicion=reposicion'});}
  if(puede('cotizaciones.leer')){await exigirAccesoEnTransaccion(tx,'cotizaciones.leer');const n=await tx.quote.count({where:{deletedAt:null,status:'PENDIENTE',validUntil:{gte:new Date(hoy+'T00:00:00Z'),lte:new Date(sumarDias(hoy,7)+'T00:00:00Z')}}});avisos.push({titulo:'Cotizaciones que vencen hoy o en siete días',cantidad:n,ruta:'/ventas/cotizaciones?estado=PENDIENTE'});}
  if(puede('cobranza.leer')&&puede('precios.leer')){await exigirAccesoEnTransaccion(tx,'cobranza.leer');await exigirAccesoEnTransaccion(tx,'precios.leer');const [r]=await tx.$queryRaw<{n:bigint}[]>`SELECT COUNT(*) n FROM "AccountReceivable" a WHERE a."voidedAt" IS NULL AND a."dueDate"<${hoy}::date AND a.amount>COALESCE((SELECT SUM(p.amount) FROM "Payment" p WHERE p."accountReceivableId"=a.id AND p."voidedAt" IS NULL),0::numeric)`;avisos.push({titulo:'Cuentas vencidas con saldo pendiente',cantidad:Number(r.n),ruta:'/ventas/cobranza?vencimiento=VENCIDA'});}
  return avisos;
 },{isolationLevel:'RepeatableRead'}));
}
export type DatosDashboard=Awaited<ReturnType<typeof consultarDashboard>>;
export type AvisosDashboard=Awaited<ReturnType<typeof consultarAvisosDashboard>>;
