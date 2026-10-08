"use client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
/** Confirmación reutilizable que conserva el diálogo ante errores y bloquea cierre mientras persiste. */
export function ConfirmarAccion({
  abierto,
  onAbiertoChange,
  titulo,
  descripcion,
  accion,
  pendiente,
  onConfirmar,
  onDevolverFoco,
}: {
  abierto: boolean;
  onAbiertoChange: (v: boolean) => void;
  titulo: string;
  descripcion: string;
  accion: string;
  pendiente: boolean;
  onConfirmar: () => void;
  onDevolverFoco?: () => void;
}) {
  return (
    <AlertDialog
      open={abierto}
      onOpenChange={(v) => {
        if (!pendiente) onAbiertoChange(v);
      }}
    >
      <AlertDialogContent
        onCloseAutoFocus={(e) => {
          if (onDevolverFoco) {
            e.preventDefault();
            onDevolverFoco();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (pendiente) e.preventDefault();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descripcion}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pendiente}>
            Revisar datos
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={pendiente}
            onClick={(e) => {
              e.preventDefault();
              onConfirmar();
            }}
          >
            {pendiente ? "Procesando…" : accion}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
