"use client";
import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

export function VerDetalleHistorial({ titulo, children }: { titulo: string; children: ReactNode }) {
  const [abierto,setAbierto]=useState(false);
  const boton=useRef<HTMLButtonElement>(null);
  return <Dialog open={abierto} onOpenChange={setAbierto}><DialogTrigger asChild><Button ref={boton} type="button" size="sm" variant="outline" aria-label={`Ver ${titulo}`}>Ver</Button></DialogTrigger><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl" onCloseAutoFocus={e=>{e.preventDefault();boton.current?.focus();}} onInteractOutside={e=>e.preventDefault()} onEscapeKeyDown={e=>{e.preventDefault();e.stopPropagation();setAbierto(false);}}><DialogHeader><DialogTitle>{titulo}</DialogTitle><DialogDescription>Consulta histórica. Los datos y documentos registrados se conservan.</DialogDescription></DialogHeader><div className="min-w-0 space-y-3 whitespace-normal break-words text-sm">{children}</div><div className="flex justify-end"><Button type="button" variant="outline" onClick={()=>setAbierto(false)}>Cerrar detalle</Button></div></DialogContent></Dialog>;
}
