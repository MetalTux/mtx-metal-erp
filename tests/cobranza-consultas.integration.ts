import "dotenv/config";
import { probarC3 } from "./fixtures/cobranza-c3";
import { probarC2 } from "./fixtures/cobranza-c2";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { conServidorValidacion } from "./fixtures/servidor-validacion";
import { credencialServidor } from "../src/lib/seguridad/acceso";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { consultarCobranza } from "../src/lib/consultas/cobranza";
import { guardarCotizacion } from "../src/lib/servicios/cotizaciones";
import { registrarOrdenCompraCliente, hoyOrden, anularOrdenCompraCliente } from "../src/lib/servicios/ordenes-compra-cliente";
import { documentoVacioCotizacion } from "../src/lib/validaciones/texto-cotizacion";
const u = new URL(process.env.DATABASE_URL!);
assert(["localhost", "127.0.0.1"].includes(u.hostname) && /^\/mtx_validacion_cobranza_c1_\d{8}$/.test(u.pathname), "Sólo copia local descartable C1");
function ok<T extends { ok: boolean }>(r: T): Extract<T,{ok:true}> { assert(r.ok, JSON.stringify(r)); return r as Extract<T,{ok:true}>; }
async function main() {
  const origen = await prisma.quote.findFirstOrThrow({ where: { clientBranchId: { not: null }, paymentConditionId: { not: null } } });
  const unidad = await prisma.unitMeasure.findFirstOrThrow();
  const marca = `C1-${randomUUID()}`;
  async function crear() {
    const q = ok(await guardarCotizacion({ date: hoyOrden(), validUntil: null, clientId: origen.clientId, clientBranchId: origen.clientBranchId!, paymentConditionId: origen.paymentConditionId!, bankAccountId: null, discount: { modo: "SIN_DESCUENTO" }, technicalDescription: documentoVacioCotizacion,
      lines: [{ kind: "SERVICIO", productId: null, rawMaterialId: null, unitMeasureId: unidad.id, description: marca, quantity: "1", unitPrice: "1000" }] },randomUUID()));
    const linea = await prisma.quoteDetail.findFirstOrThrow({ where: { quoteId: q.id } });
    return ok(await registrarOrdenCompraCliente({ quoteId: q.id, quoteVersion: q.version, date: hoyOrden(), customerOrderNumber: null, customerOrderDate: null, pdfEmissionId: null, technicalDescription: documentoVacioCotizacion, scopeReviewed: true, lines: [{ quoteDetailId: linea.id, quantity: "1" }] },randomUUID()));
  }
  const venta = await crear(), cuenta = await prisma.accountReceivable.findUniqueOrThrow({ where: { salesOrderId: venta.id } });
  const folio = (await prisma.documentFolio.findUniqueOrThrow({ where: { id: (await prisma.salesOrder.findUniqueOrThrow({ where:{id:venta.id} })).folioId! } })).folio;
  await prisma.payment.create({ data: { accountReceivableId: cuenta.id, amount: "250.25", method: "Transferencia", idempotencyKey: randomUUID() } });
  await prisma.payment.create({ data: { accountReceivableId: cuenta.id, amount: "100", method: "Efectivo", idempotencyKey: randomUUID(), voidedAt: new Date(), voidReason: "Abono de prueba anulado" } });
  const antes = await prisma.payment.findMany({ where:{accountReceivableId:cuenta.id} });
  let consulta = await consultarCobranza({ q: folio, cuenta: cuenta.id });
  assert.equal(consulta.total,1);assert.equal(consulta.pendiente,"749.75");assert.equal(consulta.vencido,"0.00");assert.equal(consulta.detalle!.abonado,"250.25");assert.equal(consulta.detalle!.totalAbonos,2);assert.equal(consulta.detalle!.dueDate,null);
  assert.equal((await consultarCobranza({q:folio,estado:"PARCIAL"})).total,1);
  assert.equal((await consultarCobranza({q:folio,estado:"PAGADA"})).total,0);
  assert.equal((await consultarCobranza({q:folio,vencimiento:"SIN_FECHA"})).total,1);
  assert.equal((await consultarCobranza({q:folio,vencimiento:"VENCIDA"})).total,0);
  assert.equal((await consultarCobranza({q:"%' OR TRUE --"})).total,0);
  assert.equal((await consultarCobranza({q:"%"})).filas.some(c=>c.id===cuenta.id),false,"El comodín se busca literalmente");
  for(let i=0;i<21;i++)await prisma.payment.create({data:{accountReceivableId:cuenta.id,amount:"1",method:"Otro",idempotencyKey:randomUUID()}});
  consulta=await consultarCobranza({q:folio,cuenta:cuenta.id,abonos:999,pagina:999});
  assert.equal(consulta.filtros.pagina,1);assert.equal(consulta.detalle!.paginaAbonos,2);assert.equal(consulta.detalle!.abonos.length,3);assert.equal(consulta.detalle!.saldo,"728.75");
  const anulable=await crear();const orden=await prisma.salesOrder.findUniqueOrThrow({where:{id:anulable.id}});
  // Contrato de anulación vigente; no se inventa una deuda ni se borran pagos.
  const anulada=await anularOrdenCompraCliente({referencia:{id:orden.id,version:orden.version},motivo:"Cuenta C1 sin actividad"},randomUUID());
  assert(anulada.ok,JSON.stringify(anulada));
  const cuentaAnulada=await prisma.accountReceivable.findUniqueOrThrow({where:{salesOrderId:orden.id}});
  assert.equal((await consultarCobranza({estado:"ANULADA",cuenta:cuentaAnulada.id})).detalle!.voidReason,"Cuenta C1 sin actividad");
  const pagosAntes=await prisma.payment.count();await consultarCobranza({cuenta:cuenta.id});assert.equal(await prisma.payment.count(),pagosAntes);
  for(const p of antes)assert.deepEqual(await prisma.payment.findUniqueOrThrow({where:{id:p.id}}),p);
  await probarC2(cuenta.id);
  const adjunto=await probarC3(cuenta.id,antes[0].id);
  const token = await credencialServidor();assert(token);
  const totalUI=await prisma.payment.count({where:{accountReceivableId:cuenta.id}});
  await conServidorValidacion(()=>{
    const ui=spawnSync(process.execPath,["--import","tsx","tests/cobranza-consultas.ui.ts"],{env:{...process.env,C1_TOKEN:token,C1_FOLIO:folio,C1_CUENTA:String(cuenta.id),C1_ABONOS:String(totalUI),C3_ADJUNTO:adjunto.id,C3_BYTES:adjunto.bytes},encoding:"utf8",timeout:60000});
    process.stdout.write(ui.stdout??"");process.stderr.write(ui.stderr??"");assert.equal(ui.status,0,"C1 Chromium");
  });
  const pagoUI=await prisma.payment.findFirstOrThrow({where:{accountReceivableId:cuenta.id,reference:"C2-UI"}});
  const autoresUI=await prisma.securityOperationAuthor.findMany({where:{resourceType:"Payment",resourceId:String(pagoUI.id)}});
  assert.deepEqual(autoresUI.map(a=>a.action).sort(),["REGISTRAR_ABONO","ADJUNTAR_COMPROBANTE","ANULAR_ABONO"].sort());
  assert.equal(new Set(autoresUI.map(a=>a.operationKey)).size,3,"Alta, comprobante y anulación tienen identidades diferentes");
  console.log("C1: saldos decimales, exclusión de anulados, filtros literales, cuenta única, detalle y paginación de abonos sin escrituras correctos.");
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
