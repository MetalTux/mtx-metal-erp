"use client";
import { useState } from "react";
import Link from "next/link";
import { depurarEventos } from "@/app/(app)/administracion/auditoria/actions";
import { ConfirmarAccion } from "@/components/alertas/confirmar-accion";
import { Button } from "@/components/ui/button";
export function DepurarAuditoria(){
 const [abierto,setAbierto]=useState(false),[pendiente,setPendiente]=useState(false),[mensaje,setMensaje]=useState("");
 return <section className="space-y-3 rounded-md border border-border p-4"><h2 className="font-medium">Retención de eventos</h2><p className="text-sm text-muted-foreground">Se conservan los últimos 12 meses de eventos de seguridad. La depuración elimina únicamente eventos que ya cumplieron ese plazo; conserva toda la autoría documental. Los respaldos anteriores mantienen su propia retención.</p><p className="text-sm">Antes de depurar, <Link href="/mi-acceso" className="underline">confirma tu identidad en Mi acceso</Link>.</p><Button variant="outline" disabled={pendiente} onClick={()=>setAbierto(true)}>Depurar eventos antiguos</Button>{mensaje&&<p role="status" className="text-sm">{mensaje}</p>}<ConfirmarAccion abierto={abierto} onAbiertoChange={setAbierto} titulo="Depurar eventos antiguos" descripcion="Se eliminarán los eventos de seguridad que hayan cumplido 12 meses. Esta acción no elimina la autoría de documentos ni modifica sus archivos históricos." accion="Depurar eventos" pendiente={pendiente} onConfirmar={async()=>{setPendiente(true);try{const r=await depurarEventos();setMensaje(r.mensaje);setAbierto(false);}catch{setMensaje("No se pudo confirmar la depuración. Actualiza la consulta antes de volver a intentarlo.");}finally{setPendiente(false);}}}/></section>;
}
