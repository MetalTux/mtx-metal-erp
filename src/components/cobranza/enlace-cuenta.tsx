"use client";
import Link from "next/link";
import type { MouseEventHandler } from "react";
import { Permiso } from "@/components/seguridad/permisos";
import { Button } from "@/components/ui/button";
export function EnlaceCuenta({ordenId,disabled,onClick}:{ordenId?:number|null;disabled?:boolean;onClick?:MouseEventHandler<HTMLAnchorElement>}){
 if(!ordenId)return null;
 return <Permiso permiso="cobranza.leer"><Permiso permiso="precios.leer"><Button asChild variant="outline" disabled={disabled}><Link href={`/ventas/cobranza?orden=${ordenId}`} onClick={onClick}>Ver cuenta por cobrar</Link></Button></Permiso></Permiso>;
}
