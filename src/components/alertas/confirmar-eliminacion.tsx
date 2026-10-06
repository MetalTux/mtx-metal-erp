"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Aviso } from "@/components/alertas/aviso";

export function ConfirmarEliminacion({ abierto, onAbiertoChange, nombre, pendiente, error, onConfirmar, onRestaurarFoco }: {
  abierto: boolean; onAbiertoChange: (abierto: boolean) => void; nombre: string;
  pendiente: boolean; error?: string; onConfirmar: () => void; onRestaurarFoco?: () => void;
}) {
  return <AlertDialog open={abierto} onOpenChange={(valor) => { if (!pendiente) onAbiertoChange(valor); }}>
    <AlertDialogContent className="max-h-[90dvh] overflow-y-auto rounded-lg" onCloseAutoFocus={onRestaurarFoco ? (event) => { event.preventDefault(); onRestaurarFoco(); } : undefined} onEscapeKeyDown={(event) => { if (pendiente) event.preventDefault(); }}>
      <AlertDialogHeader><AlertDialogTitle>Confirmar eliminación</AlertDialogTitle><AlertDialogDescription>¿Eliminar «{nombre}»? Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
      {error && <Aviso titulo={error} />}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pendiente}>Cancelar</AlertDialogCancel>
        <AlertDialogAction variant="destructive" disabled={pendiente} onClick={(event) => { event.preventDefault(); onConfirmar(); }}>
          {pendiente ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}{pendiente ? "Eliminando…" : "Eliminar"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
