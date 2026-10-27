"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ConfirmarDescarte } from "@/components/alertas/confirmar-descarte";
import { Aviso } from "@/components/alertas/aviso";

/** Editor de cantidad reutilizado por partidas de origen; validar corresponde a cada dominio. */
export function DialogoCantidadDetalle({ titulo, descripcion, etiqueta, inicial, consulta = false, permitirVacio = false, onCerrar, onAceptar, devolverFoco }: {
  titulo: string; descripcion: string; etiqueta: string; inicial: string;
  consulta?: boolean; permitirVacio?: boolean; onCerrar: () => void;
  onAceptar: (cantidad: string) => Promise<string | undefined>;
  devolverFoco: () => void;
}) {
  const [cantidad, setCantidad] = useState(inicial);
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string>();
  const [descartar, setDescartar] = useState(false);
  const enCurso = useRef(false);
  const entrada = useRef<HTMLInputElement>(null);
  function cerrar() {
    if (enCurso.current || descartar) return;
    if (!consulta && cantidad !== inicial) setDescartar(true);
    else onCerrar();
  }
  return <>
    <Dialog open onOpenChange={abierto => { if (!abierto) cerrar(); }}>
      <DialogContent showCloseButton={false} className="max-h-[90dvh] overflow-y-auto" onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => { e.preventDefault(); cerrar(); }} onCloseAutoFocus={e => { e.preventDefault(); devolverFoco(); }}>
        <DialogHeader><DialogTitle>{titulo}</DialogTitle><DialogDescription>{descripcion}</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={async e => {
          e.preventDefault(); e.stopPropagation();
          if (consulta || enCurso.current) return;
          enCurso.current = true; setPendiente(true); setError(undefined);
          try { const mensaje = await onAceptar(cantidad.trim()); if (mensaje) setError(mensaje); }
          catch { setError("No se pudo verificar la cantidad. Conservamos los datos para reintentar."); }
          finally { enCurso.current = false; setPendiente(false); }
        }}>
          {error && <Aviso titulo={error} />}
          <label className="block space-y-2 text-sm"><span>{etiqueta}</span><Input ref={entrada} aria-label={etiqueta} value={cantidad} inputMode="decimal" readOnly={consulta} disabled={pendiente} onChange={e => { setCantidad(e.target.value); setError(undefined); }} /></label>
          {permitirVacio && !consulta && <p className="text-xs text-muted-foreground">Deja la cantidad vacía para no incluir esta partida. Un cero escrito no equivale a omitirla.</p>}
          <DialogFooter><Button type="button" variant="outline" disabled={pendiente} onClick={cerrar}>{consulta ? "Cerrar" : "Cancelar"}</Button>{!consulta && <Button type="submit" disabled={pendiente}>{pendiente ? "Verificando…" : "Aceptar cantidad"}</Button>}</DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <ConfirmarDescarte abierto={descartar} onAbiertoChange={setDescartar} onConfirmar={onCerrar} onDevolverFoco={() => entrada.current?.focus()} />
  </>;
}
