"use client";
import { Permiso } from "@/components/seguridad/permisos";
import { formatearCantidad } from "@/lib/formato";
import { useRef, useState } from "react";
import { Prisma } from "@/generated/prisma/browser";
import type { PlanTrabajo, LineaPlanTrabajo } from "@/lib/validaciones/orden-trabajo";
import type { CatalogosTrabajo, TrabajoConsultado } from "@/lib/consultas/ordenes-trabajo";
import { calcularRequerimientosProduccion } from "@/lib/servicios/requerimientos-produccion";
import { guardar } from "@/app/(app)/trabajos/ordenes/actions";
import { SelectorBuscable } from "@/components/formularios/selector-buscable";
import { ConfirmarAccion } from "@/components/alertas/confirmar-accion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
const cero = new Prisma.Decimal(0);
const q=(v:string)=>{try{return new Prisma.Decimal(v.replace(",","."));}catch{return cero;}};
export function FormularioTrabajo({initial,catalogos:c,historico,onGuardado,onCerrar,onCambio,onBloqueo}:{initial:PlanTrabajo;catalogos:CatalogosTrabajo;historico?:TrabajoConsultado;
 onGuardado:(id:number)=>Promise<void>;onCerrar:()=>void;onCambio:()=>void;onBloqueo:(b:boolean)=>void}){
 const [d,setD]=useState(initial),[error,setError]=useState<string>(),[confirmacion,setConfirmacion]=useState<PlanTrabajo>(),[busy,setBusy]=useState(false),[incierto,setIncierto]=useState(false);
 const solicitud=useRef<{plan:PlanTrabajo;key:string}|undefined>(undefined),ocupado=useRef(false);
 function cambiar(next:PlanTrabajo){setD(next);solicitud.current=undefined;setError(undefined);onCambio();}
 function linea(i:number,changes:Partial<LineaPlanTrabajo>){cambiar({...d,lines:d.lines.map((l,n)=>n===i?{...l,...changes}:l)});}
 const bloqueado=busy||Boolean(confirmacion)||incierto;
 function guardarModal(confirmPlan:boolean){const plan={...d,confirmPlan};if(d.id&&!d.reason.trim()){setError("Indica el motivo de la revisión.");return;}setConfirmacion(plan);onBloqueo(true);}
 async function confirmar(){
  if(ocupado.current)return;ocupado.current=true;setBusy(true);onBloqueo(true);
  const s=solicitud.current??{plan:confirmacion!,key:crypto.randomUUID()};solicitud.current=s;
  try{const r=await guardar(s.plan,s.key);if(!r.ok){setError(r.mensaje);setIncierto(Boolean(r.incierto));setConfirmacion(undefined);onBloqueo(Boolean(r.incierto));return;}setIncierto(false);setConfirmacion(undefined);await onGuardado(r.id);}
  catch{setError("No se pudo comprobar el resultado. Reintenta sin cambiar los datos.");setIncierto(true);setConfirmacion(undefined);onBloqueo(true);}
  finally{ocupado.current=false;setBusy(false);}
 }
 const bodegas=(producto:boolean)=>c.warehouses.filter(w=>w.classification==="MIXTA"||w.classification===(producto?"PRODUCTO_TERMINADO":"MATERIA_PRIMA")).map(w=>({valor:String(w.id),etiqueta:w.name}));
 function disponibilidad(raw:number|null,product:number|null,wh:number){const s=c.stock.find(s=>s.rawMaterialId===raw&&s.productId===product&&s.warehouseId===wh);return s?`Físico ${formatearCantidad(s.quantity)} · Reservado ${formatearCantidad(s.reserved)} · Libre ${formatearCantidad(s.free)}`:"Físico 0 · Reservado 0 · Libre 0";}
 function agregar(tipo:"CATALOGO"|"A_MEDIDA"){cambiar({...d,lines:[...d.lines,{id:null,sourceDetailId:null,kind:tipo==="CATALOGO"?"PRODUCTO":"SERVICIO",executionMode:tipo,productId:null,rawMaterialId:null,unitMeasureId:0,description:"",quantity:"1.000",quantityToProduce:tipo==="CATALOGO"?"1.000":"0.000",productVersion:null,refreshRecipe:false,supplies:[],materials:[],roundingReviews:[]}]});}
 return <div className="min-w-0 space-y-4">
  {error&&<p role="alert" className="break-words text-sm text-destructive">{error}</p>}
  <fieldset disabled={bloqueado} className="min-w-0 space-y-4">
   <div className="grid min-w-0 gap-3 sm:grid-cols-2">
    <label className="text-sm">Título de la OT<Input value={d.productName} maxLength={150} onChange={e=>cambiar({...d,productName:e.target.value})}/></label>
    <label className="text-sm">Fecha de la OT<Input type="date" value={d.date} disabled={Boolean(d.id)} onChange={e=>cambiar({...d,date:e.target.value})}/></label>
    {!d.salesOrderId&&<label className="text-sm">Finalidad de obra propia<Textarea value={d.ownPurpose??""} maxLength={1000} onChange={e=>cambiar({...d,ownPurpose:e.target.value})}/></label>}
    <label className="text-sm">Fecha objetivo (opcional)<Input type="date" value={d.targetDate??""} onChange={e=>cambiar({...d,targetDate:e.target.value||null})}/></label>
   </div>
   <label className="block text-sm">Instrucciones internas<Textarea value={d.internalInstructions} maxLength={5000} onChange={e=>cambiar({...d,internalInstructions:e.target.value})}/></label>
   {!d.id&&!d.salesOrderId&&<div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={()=>agregar("CATALOGO")}>Agregar producto</Button><Button type="button" variant="outline" onClick={()=>agregar("A_MEDIDA")}>Agregar trabajo a medida</Button></div>}
   {d.lines.map((l,i)=>{
    const p=c.products.find(p=>p.id===l.productId),hist=historico?.historicalRecipes.filter(r=>r.workOrderLineId===l.id);
    const receta=hist?.length&&!l.refreshRecipe?hist:p?.recipe??[];
    let needs:ReturnType<typeof calcularRequerimientosProduccion>["materials"]=[],calcError="";
    if(l.executionMode==="CATALOGO"&&q(l.quantityToProduce).gt(0)){try{needs=calcularRequerimientosProduccion(l.quantityToProduce,receta).materials;}catch(e){calcError=e instanceof Error?e.message:"Cantidad no válida.";}}
    const stockQty=l.kind==="PRODUCTO"?q(l.quantity).minus(q(l.quantityToProduce)):l.kind==="MATERIA_PRIMA"?q(l.quantity):cero;
    return <section key={l.id??i} className="min-w-0 space-y-3 rounded-md border border-border p-3" aria-label={`Plan línea ${i+1}`}>
     <p className="break-words font-medium">Línea {i+1} · {l.description||"Seleccionar producto o describir trabajo"}</p>
     {!l.id&&!d.salesOrderId&&l.executionMode==="CATALOGO"&&<SelectorBuscable id={`producto-trabajo-${i}`} nombre="producto" placeholder="Buscar producto…" valor={l.productId?String(l.productId):""} disabled={bloqueado} opciones={c.products.map(p=>({valor:String(p.id),etiqueta:`${p.name} · ${p.code}`}))} onChange={v=>{const p=c.products.find(p=>p.id===Number(v))!;linea(i,{productId:p.id,unitMeasureId:p.unitMeasureId,description:p.name,productVersion:p.version,materials:[],roundingReviews:[]});}}/>}
     {!l.id&&!d.salesOrderId&&l.executionMode==="A_MEDIDA"&&<div className="space-y-2"><label className="block text-sm">Descripción del trabajo<Input value={l.description} onChange={e=>linea(i,{description:e.target.value})}/></label><SelectorBuscable id={`unidad-trabajo-${i}`} nombre="unidad de ejecución" placeholder="Unidad de ejecución…" valor={l.unitMeasureId?String(l.unitMeasureId):""} disabled={bloqueado} opciones={c.units.map(u=>({valor:String(u.id),etiqueta:`${u.name} (${u.abbreviation})`}))} onChange={v=>linea(i,{unitMeasureId:Number(v)})}/></div>}
     <div className="grid min-w-0 gap-3 sm:grid-cols-2"><label className="text-sm">Cantidad {d.salesOrderId?"contratada":"prevista"} · {c.units.find(u=>u.id===l.unitMeasureId)?.name??"unidad pendiente"}<Input aria-label={`Cantidad línea ${i+1}`} value={l.quantity.replace(".",",")} readOnly={Boolean(d.salesOrderId)} inputMode="decimal" onChange={e=>linea(i,{quantity:e.target.value,...(!d.salesOrderId&&l.kind==="PRODUCTO"?{quantityToProduce:e.target.value}:{}),roundingReviews:[]})}/></label>
      {l.kind==="PRODUCTO"&&<label className="text-sm">Cantidad a fabricar<Input aria-label={`Cantidad a fabricar línea ${i+1}`} value={l.quantityToProduce.replace(".",",")} readOnly={!d.salesOrderId} inputMode="decimal" onChange={e=>linea(i,{quantityToProduce:e.target.value,productVersion:l.productVersion??p?.version??null,roundingReviews:[]})}/><span className="tabular-nums text-muted-foreground">Desde stock: {formatearCantidad(stockQty.toFixed(3))}</span></label>}
      {l.kind==="SERVICIO"&&d.salesOrderId&&<label className="text-sm">Modo de ejecución<select className="block h-9 w-full rounded-md border border-input bg-card px-2" value={l.executionMode} onChange={e=>linea(i,{executionMode:e.target.value as "SERVICIO"|"A_MEDIDA",materials:[]})}><option value="SERVICIO">Servicio sin materiales</option><option value="A_MEDIDA">Trabajo a medida con materiales</option></select></label>}
     </div>
     {l.kind==="PRODUCTO"&&q(l.quantityToProduce).gt(0)&&<div className="space-y-2 text-sm"><p>Receta {hist?.length&&!l.refreshRecipe?`histórica (revisión ${l.productVersion})`:`de catálogo (revisión ${p?.version??"no disponible"})`}. No se actualiza automáticamente.</p>
      {l.id&&p&&<label className="flex items-center gap-2"><input type="checkbox" checked={l.refreshRecipe} onChange={e=>linea(i,{refreshRecipe:e.target.checked,productVersion:e.target.checked?p.version:initial.lines[i].productVersion,roundingReviews:[]})}/>Actualizar receta explícitamente al guardar</label>}
      {calcError&&<p className="text-destructive">{calcError}</p>}
      {needs.map(n=>{const m=c.raws.find(m=>m.id===n.rawMaterialId),rr=l.roundingReviews.find(r=>r.rawMaterialId===n.rawMaterialId);return <div key={n.rawMaterialId} className="min-w-0 rounded-md bg-muted/30 p-2"><p className="break-words tabular-nums">{m?.name??`Material ${n.rawMaterialId}`} · Necesidad {formatearCantidad(n.expectedQuantity)} · Exacto {formatearCantidad(n.expectedExactQuantity)} · Diferencia {formatearCantidad(n.roundingDifference)}</p>
       {n.requiresReview&&<div className="grid gap-2 sm:grid-cols-2"><label>Cantidad positiva revisada<Input aria-label={`Revisión material ${n.rawMaterialId}`} value={rr?.quantity??""} onChange={e=>linea(i,{roundingReviews:[...l.roundingReviews.filter(r=>r.rawMaterialId!==n.rawMaterialId),{rawMaterialId:n.rawMaterialId,quantity:e.target.value,reason:rr?.reason??""}]})}/></label><label>Motivo de revisión<Input value={rr?.reason??""} onChange={e=>linea(i,{roundingReviews:[...l.roundingReviews.filter(r=>r.rawMaterialId!==n.rawMaterialId),{rawMaterialId:n.rawMaterialId,quantity:rr?.quantity??"",reason:e.target.value}]})}/></label></div>}
       <Button type="button" size="sm" variant="outline" onClick={()=>linea(i,{materials:[...l.materials,{rawMaterialId:n.rawMaterialId,warehouseId:0,quantity:rr?.quantity??n.expectedQuantity}]})}>Distribuir {m?.name??"material"}</Button></div>;})}
     </div>}
     {l.executionMode==="A_MEDIDA"&&<SelectorBuscable id={`agregar-material-${i}`} nombre="material del trabajo a medida" placeholder="Agregar materia prima…" valor="" disabled={bloqueado} opciones={c.raws.map(m=>({valor:String(m.id),etiqueta:`${m.code} · ${m.name} · ${m.unitName}`}))} onChange={v=>linea(i,{materials:[...l.materials,{rawMaterialId:Number(v),warehouseId:0,quantity:"1.000"}]})}/>}
     {l.materials.map((m,j)=><div key={j} className="min-w-0 space-y-2 rounded-md bg-muted/20 p-2"><p className="break-words text-sm">{c.raws.find(r=>r.id===m.rawMaterialId)?.name??"Material histórico"} · {c.raws.find(r=>r.id===m.rawMaterialId)?.unitName}</p><div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_auto]"><SelectorBuscable id={`material-bodega-${i}-${j}`} nombre="bodega de consumo" placeholder="Bodega de consumo…" valor={m.warehouseId?String(m.warehouseId):""} disabled={bloqueado} opciones={bodegas(false)} onChange={v=>linea(i,{materials:l.materials.map((m,n)=>n===j?{...m,warehouseId:Number(v)}:m)})}/><Input aria-label={`Consumo previsto línea ${i+1} fila ${j+1}`} inputMode="decimal" value={m.quantity.replace(".",",")} onChange={e=>linea(i,{materials:l.materials.map((m,n)=>n===j?{...m,quantity:e.target.value}:m)})}/><Button type="button" variant="outline" onClick={()=>linea(i,{materials:l.materials.filter((_,n)=>n!==j)})}>Quitar</Button></div><p className="break-words text-xs tabular-nums text-muted-foreground">{disponibilidad(m.rawMaterialId,null,m.warehouseId)} · La disponibilidad se verifica al confirmar.</p></div>)}
     {stockQty.gt(0)&&<Button type="button" size="sm" variant="outline" onClick={()=>linea(i,{supplies:[...l.supplies,{warehouseId:0,quantity:stockQty.toFixed(3)}]})}>Distribuir abastecimiento desde stock</Button>}
     {l.supplies.map((s,j)=><div key={j} className="min-w-0 space-y-2 rounded-md bg-muted/20 p-2"><div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_auto]"><SelectorBuscable id={`stock-bodega-${i}-${j}`} nombre="bodega de abastecimiento" placeholder="Bodega de abastecimiento…" valor={s.warehouseId?String(s.warehouseId):""} disabled={bloqueado} opciones={bodegas(l.kind==="PRODUCTO")} onChange={v=>linea(i,{supplies:l.supplies.map((s,n)=>n===j?{...s,warehouseId:Number(v)}:s)})}/><Input aria-label={`Abastecimiento línea ${i+1} fila ${j+1}`} inputMode="decimal" value={s.quantity.replace(".",",")} onChange={e=>linea(i,{supplies:l.supplies.map((s,n)=>n===j?{...s,quantity:e.target.value}:s)})}/><Button type="button" variant="outline" onClick={()=>linea(i,{supplies:l.supplies.filter((_,n)=>n!==j)})}>Quitar</Button></div><p className="text-xs tabular-nums text-muted-foreground">{disponibilidad(l.rawMaterialId,l.productId,s.warehouseId)}</p></div>)}
     {!d.id&&!d.salesOrderId&&<Button type="button" variant="outline" onClick={()=>cambiar({...d,lines:d.lines.filter((_,n)=>n!==i)})}>Quitar línea</Button>}
    </section>;
   })}
   {d.id&&<label className="block text-sm">Motivo de revisión<Textarea value={d.reason} maxLength={1000} onChange={e=>cambiar({...d,reason:e.target.value})}/></label>}
  </fieldset>
  <p className="text-sm text-muted-foreground">Guardar borrador conserva el plan sin reservas activas. Confirmar exige distribución completa e intenta reservar lo disponible; muestra faltantes sin mover existencias.</p>
  <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={bloqueado} onClick={onCerrar}>Cancelar</Button>{incierto?<Button disabled={busy} onClick={()=>void confirmar()}>Reintentar sin cambiar datos</Button>:<><Permiso permiso="trabajos.operar"><Button variant="outline" disabled={bloqueado||!d.lines.length} onClick={()=>guardarModal(false)}>Guardar borrador</Button></Permiso><Button disabled={bloqueado||!d.lines.length} onClick={()=>guardarModal(true)}>Confirmar y reservar plan</Button></>}</div>
  <ConfirmarAccion abierto={Boolean(confirmacion)} titulo={confirmacion?.confirmPlan?"Confirmar plan y reservas":"Guardar borrador de OT"} descripcion={confirmacion?.confirmPlan?"Se guardará el plan y se reservará parcialmente el stock disponible. Los faltantes seguirán pendientes. No se consumen materiales ni se fabrica todavía.":"Se guardará sin reservas activas. Las reservas anteriores se liberarán con el motivo de esta revisión."} accion="Confirmar" pendiente={busy} onConfirmar={()=>void confirmar()} onAbiertoChange={v=>{if(!v&&!busy){setConfirmacion(undefined);onBloqueo(false);}}}/>
 </div>;
}
