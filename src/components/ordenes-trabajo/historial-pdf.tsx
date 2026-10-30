"use client";
import { GrillaHistorial } from "@/components/grilla-historial";
import { usePermiso } from "@/components/seguridad/permisos";
import { useEffect, useRef, useState } from "react";
import { emitirPdfTrabajo, consultarPdfsTrabajo } from "@/app/(app)/trabajos/ordenes/actions";
import type { historialPdfTrabajo } from "@/lib/servicios/pdfs-trabajo";
import { Button } from "@/components/ui/button";
import { ConfirmarAccion } from "@/components/alertas/confirmar-accion";
import { formatearFecha } from "@/lib/formato";
type Fila=Awaited<ReturnType<typeof historialPdfTrabajo>>[number];
export function HistorialPdfTrabajo({referencia,onBloqueo}:{referencia:{id:number;version:number};onBloqueo:(v:boolean)=>void}){
 const operar = usePermiso("trabajos.operar");

 const [filas,setFilas]=useState<Fila[]>([]),[cargando,setCargando]=useState(true),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false),[confirm,setConfirm]=useState(false),[error,setError]=useState<string>(),[selected,setSelected]=useState<Fila>();
 const request=useRef<{referencia:typeof referencia;clave:string}|undefined>(undefined),running=useRef(false),button=useRef<HTMLButtonElement>(null);
 useEffect(()=>{let active=true;consultarPdfsTrabajo(referencia.id).then(r=>{if(!active)return;if(r.ok)setFilas(r.filas);else setError(r.mensaje);}).catch(()=>{if(active)setError("No se pudo consultar el historial PDF.");}).finally(()=>{if(active)setCargando(false);});return()=>{active=false;};},[referencia.id]);
 const current=filas.find(f=>f.workOrderVersion===referencia.version),url=(f:Fila)=>`/api/trabajos/pdfs/${f.id}`;
 async function emitir(){if(running.current)return;running.current=true;setBusy(true);onBloqueo(true);const s=request.current??{referencia:{...referencia},clave:crypto.randomUUID()};request.current=s;try{
  const r=await emitirPdfTrabajo(s.referencia,s.clave);if(!r.ok){setError(r.mensaje);setUncertain(Boolean(r.incierto));onBloqueo(Boolean(r.incierto));setConfirm(false);return;}
  const h=await consultarPdfsTrabajo(referencia.id);if(!h.ok){setUncertain(true);setError("La emisión fue confirmada; reintenta para recuperar su historial.");setConfirm(false);onBloqueo(true);return;}
  setFilas(h.filas);setSelected(h.filas.find(f=>f.id===r.id));setConfirm(false);setUncertain(false);setError(undefined);onBloqueo(false);
 }catch{setError("No se pudo comprobar la emisión. Reintenta conservando la solicitud.");setConfirm(false);setUncertain(true);onBloqueo(true);}finally{running.current=false;setBusy(false);}}
 return <section aria-label="PDF y versiones de OT" className="min-w-0 space-y-3 rounded-md border border-border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">PDF y versiones</h3>{(operar || current) && <Button ref={button} className="h-auto min-h-9 max-w-full whitespace-normal" disabled={busy||cargando} onClick={()=>{if(uncertain){void emitir();return;}if(current){setSelected(current);return;}setError(undefined);setConfirm(true);onBloqueo(true);}}>{uncertain?"Reintentar emisión sin cambiar solicitud":current?"Ver PDF de esta revisión":"Generar PDF de esta revisión"}</Button>}</div><p className="text-[13px] text-muted-foreground">Carta · Revisión {referencia.version}. Documento interno con plan y ejecución históricos; cada PDF archivado conserva sus bytes originales.</p>
 {error&&<p role="alert" className="break-words text-sm text-destructive">{error}</p>}{cargando?<p className="text-sm">Cargando emisiones…</p>:!filas.length?<p className="text-sm text-muted-foreground">Sin emisiones archivadas.</p>:<GrillaHistorial titulo="Emisiones de OT" columnas={["Revisión","Estado al emitir","Fecha de emisión","Acciones"]} filas={filas.map(f=>({id:f.id,celdas:[f.workOrderVersion,f.status,formatearFecha(f.createdAt),<div key="acciones" className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy||uncertain} onClick={()=>setSelected(f)}>Ver PDF revisión {f.workOrderVersion}</Button><Button asChild size="sm" variant="outline"><a href={`${url(f)}?descargar=1`}>Descargar revisión {f.workOrderVersion}</a></Button></div>]}))}/>}
 {selected&&<div className="min-w-0 space-y-2"><iframe title={`PDF OT ${selected.folio}, revisión ${selected.workOrderVersion}`} src={url(selected)} className="h-[55dvh] w-full min-w-0 rounded-md border border-border"/><a className="text-sm underline" href={url(selected)} target="_blank" rel="noopener noreferrer">Abrir PDF en otra pestaña</a><Button variant="outline" onClick={()=>setSelected(undefined)}>Cerrar vista previa PDF</Button></div>}
 <ConfirmarAccion abierto={confirm} titulo="Generar PDF de OT" descripcion="Se archivará el plan y la ejecución de esta revisión. La emisión conserva el folio, estado, existencias y cuenta comercial de la OT." accion="Generar PDF" pendiente={busy} onConfirmar={()=>void emitir()} onAbiertoChange={v=>{if(!busy&&!uncertain){setConfirm(v);onBloqueo(v);}}} onDevolverFoco={()=>button.current?.focus()}/></section>;
}
