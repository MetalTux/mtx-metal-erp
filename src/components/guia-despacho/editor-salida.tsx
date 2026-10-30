"use client";
import { useRef, useState } from "react";
import { Prisma } from "@/generated/prisma/browser";
import { guiaDespachoSchema, type DatosGuiaDespacho } from "@/lib/validaciones/guia-despacho";
import { formatearCantidad } from "@/lib/formato";
import { ConfirmarDescarte } from "@/components/alertas/confirmar-descarte";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
type Entrada = DatosGuiaDespacho["lines"][number];
export function EditorSalidaGuia({ inicial, descripcion, origen, unidad, maximo, fechaSalida, onAceptar, onCerrar, devolverFoco }: {
  inicial: Entrada; descripcion: string; origen: string; unidad: string; maximo: string; fechaSalida: string;
  onAceptar: (linea: Entrada) => void; onCerrar: () => void; devolverFoco: () => void;
}) {
  const [d,setD] = useState(() => ({...inicial})), [error,setError] = useState<string>(), [descarte,setDescarte] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  function cerrar() { if (descarte) return; if (JSON.stringify(d) !== JSON.stringify(inicial)) setDescarte(true); else onCerrar(); }
  function aceptar() {
    if (!d.quantity.trim()) { onAceptar({...d,quantity:""}); return; }
    const r = guiaDespachoSchema.shape.lines.element.safeParse(d);
    if (!r.success) { setError(r.error.issues[0].message); return; }
    if (new Prisma.Decimal(r.data.quantity).gt(maximo)) { setError(`La cantidad supera el máximo orientativo disponible: ${formatearCantidad(maximo)} ${unidad}.`); return; }
    if (r.data.warehouseId === null && (!r.data.conformityName?.trim() || !r.data.conformityDate || r.data.conformityDate > fechaSalida)) { setError("Indica nombre y fecha de conformidad, sin superar la fecha de salida."); return; }
    onAceptar(r.data);
  }
  return <><Dialog open onOpenChange={v=>{if(!v)cerrar();}}><DialogContent showCloseButton={false} className="max-h-[90dvh] min-w-0 overflow-y-auto overscroll-contain" onInteractOutside={e=>e.preventDefault()} onEscapeKeyDown={e=>{e.preventDefault();cerrar();}} onCloseAutoFocus={e=>{e.preventDefault();devolverFoco();}}>
    <DialogHeader><DialogTitle>Editar partida de salida</DialogTitle><DialogDescription>Aceptar modifica sólo el borrador. Dejar la cantidad vacía excluye esta distribución; no elimina la partida de origen.</DialogDescription></DialogHeader>
    <form className="space-y-4" onSubmit={e=>{e.preventDefault();e.stopPropagation();aceptar();}}>
      <p className="whitespace-pre-wrap break-words font-medium">{descripcion}</p><p className="text-sm">{origen} · Máximo orientativo {formatearCantidad(maximo)} {unidad}. Se revalidará al confirmar.</p>
      {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
      <label className="block space-y-2 text-sm">Cantidad de salida ({unidad})<Input ref={entrada} aria-label="Cantidad de salida del detalle" inputMode="decimal" value={d.quantity.replace(".",",")} onChange={e=>{setD({...d,quantity:e.target.value});setError(undefined);}}/></label>
      {d.warehouseId===null&&<><label className="block space-y-2 text-sm">Nombre de quien da conformidad<Input aria-label="Nombre de conformidad" maxLength={150} value={d.conformityName??""} onChange={e=>{setD({...d,conformityName:e.target.value});setError(undefined);}}/></label><label className="block space-y-2 text-sm">Fecha de conformidad<Input aria-label="Fecha de conformidad" type="date" max={fechaSalida} value={d.conformityDate??""} onChange={e=>{setD({...d,conformityDate:e.target.value});setError(undefined);}}/></label></>}
      <DialogFooter><Button type="button" variant="outline" onClick={cerrar}>Cancelar detalle</Button><Button type="submit">Aceptar detalle</Button></DialogFooter>
    </form>
  </DialogContent></Dialog><ConfirmarDescarte abierto={descarte} onAbiertoChange={setDescarte} onConfirmar={onCerrar} onDevolverFoco={()=>entrada.current?.focus()}/></>;
}
