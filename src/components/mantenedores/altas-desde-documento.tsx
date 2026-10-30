"use client";

import { useState } from "react";
import { guardarDatosCliente } from "@/app/(app)/mantenedores/clientes/actions";
import { guardarDatosProveedor } from "@/app/(app)/mantenedores/proveedores/actions";
import type { Cliente } from "@/lib/tipos/cliente";
import type { Proveedor } from "@/lib/tipos/proveedor";
import { notificar } from "@/components/alertas/notificaciones";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormularioCliente } from "./clientes";
import { FormularioProveedor } from "./proveedores";

// Los formularios viven fuera del formulario del documento para no propagar su envío.
export function AltaProveedor({ abierto, onCerrar, onCreado }: { abierto: boolean; onCerrar: () => void; onCreado: (proveedor: Proveedor) => void }) {
  const [pendiente, setPendiente] = useState(false);
  return <Dialog open={abierto}>
    <DialogContent showCloseButton={false} className="max-h-[90dvh] min-w-0 overflow-y-auto overscroll-contain" onEscapeKeyDown={e => e.preventDefault()} onInteractOutside={e => e.preventDefault()}>
      <DialogHeader><DialogTitle>Crear proveedor para la compra</DialogTitle><DialogDescription>Se seleccionará al guardar. El proveedor se conserva en el mantenedor aunque canceles la compra.</DialogDescription></DialogHeader>
      {abierto && <FormularioProveedor editor={{ modo: "crear" }} pendiente={pendiente} onCerrar={onCerrar} onGuardar={async datos => {
        setPendiente(true);
        try {
          const r = await guardarDatosProveedor(datos);
          if (r.ok && r.proveedor) { onCreado(r.proveedor); notificar.exito("Proveedor creado y seleccionado."); }
          return r;
        } catch { return { ok: false, mensaje: "No se pudo confirmar la creación. Comprueba el RUT en Proveedores antes de reintentar. La compra conserva sus datos." }; }
        finally { setPendiente(false); }
      }} />}
    </DialogContent>
  </Dialog>;
}

export function AltaCliente({ abierto, onCerrar, onCreado }: { abierto: boolean; onCerrar: () => void; onCreado: (cliente: Cliente) => void }) {
  const [pendiente, setPendiente] = useState(false);
  return <Dialog open={abierto}>
    <DialogContent showCloseButton={false} className="max-h-[90dvh] min-w-0 overflow-y-auto overscroll-contain sm:max-w-3xl" onEscapeKeyDown={e => e.preventDefault()} onInteractOutside={e => e.preventDefault()}>
      <DialogHeader><DialogTitle>Crear cliente para la cotización</DialogTitle><DialogDescription>Completa también Casa Central. El cliente se conserva en el mantenedor aunque canceles la cotización.</DialogDescription></DialogHeader>
      {abierto && <FormularioCliente editor={{ modo: "crear" }} pendiente={pendiente} onCerrar={onCerrar} onGuardar={async datos => {
        setPendiente(true);
        try {
          const r = await guardarDatosCliente(datos);
          if (r.ok && r.cliente) { onCreado(r.cliente); notificar.exito("Cliente creado y Casa Central seleccionada."); }
          return r;
        } catch { return { ok: false, mensaje: "No se pudo confirmar la creación. Comprueba el RUT en Clientes antes de reintentar. La cotización conserva sus datos." }; }
        finally { setPendiente(false); }
      }} />}
    </DialogContent>
  </Dialog>;
}
