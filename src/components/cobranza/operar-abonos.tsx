"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { registrar, anular, adjuntar } from "@/app/(app)/ventas/cobranza/actions";
import { mediosCobranza } from "@/config/medios-cobranza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { notificar } from "@/components/alertas/notificaciones";
export function OperarAbonos({cuentaId,hoy,pagoId,comprobantes=true}:{cuentaId:number;hoy:string;pagoId?:number;comprobantes?:boolean}) {
 const router=useRouter();
 const [claveComprobante,setClaveComprobante]=useState("");
 const [archivo,setArchivo]=useState<File>(),[pagoGuardado,setPagoGuardado]=useState<number>();
 const [abierto,setAbierto]=useState(false),[revisar,setRevisar]=useState(false),[busy,setBusy]=useState(false),[pendiente,setPendiente]=useState(false),[clave,setClave]=useState(""),[importe,setImporte]=useState(""),[fecha,setFecha]=useState(hoy),[medio,setMedio]=useState<string>("Transferencia"),[referencia,setReferencia]=useState(""),[motivo,setMotivo]=useState("");
 function abrir(){setClaveComprobante(crypto.randomUUID());setArchivo(undefined);setPagoGuardado(undefined);setClave(crypto.randomUUID());setAbierto(true);setRevisar(false);setPendiente(false);setImporte("");setMotivo("");setReferencia("");setFecha(hoy);}
 async function confirmar(){
  if(busy)return;setBusy(true);setPendiente(true);
  try {
   let r=pagoId?await anular({pagoId,motivo}):pagoGuardado?{ok:true,pagoId:pagoGuardado,mensaje:"Abono ya registrado."}:await registrar({cuentaId,importe:importe.replace(",","."),fecha,medio,referencia:referencia||null,clave});
   if(r.ok&&!pagoId&&archivo){const id=r.pagoId!;setPagoGuardado(id);const form=new FormData();form.set("pagoId",String(id));form.set("clave",claveComprobante);form.set("archivo",archivo);const subida=await adjuntar(form);if(!subida.ok){setPendiente(Boolean(subida.incierto));notificar.error(`Abono #${id} registrado. Comprobante pendiente: ${subida.mensaje}`);return;}r={...r,mensaje:"Abono y comprobante registrados."};}
   if(r.ok){setPendiente(false);notificar.exito(r.mensaje);setAbierto(false);router.refresh();}
   else {if(!r.incierto)setPendiente(false);notificar.error(r.mensaje);}
  }catch{notificar.error("No se recibió confirmación. Conserva este formulario y reintenta con los mismos datos.");}
  finally{setBusy(false);}
 }
 return <><Button size="sm" variant={pagoId?"outline":"default"} onClick={abrir}>{pagoId?`Anular abono #${pagoId}`:"Registrar abono"}</Button><Dialog open={abierto} onOpenChange={v=>{if(!busy&&!pendiente)setAbierto(v);}}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{pagoId?`Anular abono #${pagoId}`:"Registrar abono"}</DialogTitle><DialogDescription>{pagoId?"El abono se conserva en el historial y deja de reducir el saldo. Para corregirlo, registra después uno nuevo.":"Registra dinero efectivamente recibido. Para cheques, usa la fecha de cobro efectivo. No se permiten sobrepagos."}</DialogDescription></DialogHeader>
 <form className="space-y-4" onSubmit={e=>{e.preventDefault();setRevisar(true);}}><fieldset disabled={busy||revisar||pendiente||Boolean(pagoGuardado)} className="space-y-3">{pagoId?<label className="block text-sm">Motivo de anulación<Input required maxLength={1000} value={motivo} onChange={e=>setMotivo(e.target.value)}/></label>:<><label className="block text-sm">Importe recibido (CLP)<Input required inputMode="decimal" pattern="[0-9]{1,12}([.,][0-9]{1,2})?" value={importe} onChange={e=>setImporte(e.target.value)}/></label><label className="block text-sm">Fecha del pago<Input required type="date" max={hoy} value={fecha} onChange={e=>setFecha(e.target.value)}/></label><label className="block text-sm">Medio de pago<select className="mt-1 block w-full rounded border bg-background p-2" value={medio} onChange={e=>setMedio(e.target.value)}>{mediosCobranza.map(m=><option key={m}>{m}</option>)}</select></label><label className="block text-sm">Referencia (opcional)<Input maxLength={150} value={referencia} onChange={e=>setReferencia(e.target.value)}/></label></>}</fieldset>
 {!pagoId&&comprobantes&&<label className="block text-sm">Comprobante opcional (JPG, PNG o PDF, hasta 5 MB)<Input type="file" accept="image/jpeg,image/png,application/pdf" disabled={busy||revisar||pendiente} onChange={e=>setArchivo(e.target.files?.[0])}/></label>}
 {pagoGuardado&&<p role="status">Abono #{pagoGuardado} ya registrado; sólo se reintentará adjuntar el comprobante. También puedes cerrarlo y adjuntarlo después desde el historial.</p>}
 {revisar&&<p role="status" className="rounded border p-3 text-sm">{pagoId?`Se anulará el abono #${pagoId}. Motivo: ${motivo}`:`Se registrarán $${importe} mediante ${medio}, con fecha ${fecha.split("-").reverse().join("-")}.`} {archivo?`Comprobante: ${archivo.name}. `:""}Revisa los datos antes de confirmar.</p>}
 {pendiente&&<p role="alert" className="text-sm">La solicitud ya fue enviada. Los datos se conservan para un reintento seguro. Si sigue fallando, revisa el resultado desde otra pestaña antes de iniciar otra operación.</p>}
 <div className="flex flex-wrap justify-end gap-2">{!pendiente&&<Button type="button" variant="outline" onClick={()=>revisar?setRevisar(false):setAbierto(false)}>{revisar?"Volver a editar":pagoGuardado?"Cerrar (abono ya registrado)":"Cancelar"}</Button>}{revisar?<Button type="button" disabled={busy} onClick={confirmar}>{busy?"Confirmando…":pendiente?"Reintentar misma operación":"Confirmar operación"}</Button>:<Button>Revisar operación</Button>}</div></form></DialogContent></Dialog></>;
}
