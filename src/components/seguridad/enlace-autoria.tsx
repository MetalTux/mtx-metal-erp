"use client";
import Link from "next/link";
import { Permiso } from "./permisos";
export function EnlaceAutoria({tipo,id}:{tipo:string;id:number|string}){
 return <Permiso permiso="auditoria.leer"><p className="text-sm"><Link className="text-info-foreground underline" href={`/administracion/auditoria?vista=autoria&tipo=${encodeURIComponent(tipo)}&recurso=${encodeURIComponent(String(id))}`}>Consultar autoría registrada</Link></p></Permiso>;
}
