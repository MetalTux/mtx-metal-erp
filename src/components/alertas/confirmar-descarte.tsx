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

export function ConfirmarDescarte({
  abierto,
  onAbiertoChange,
  onConfirmar,
  onDevolverFoco,
}: {
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
  onConfirmar: () => void;
  onDevolverFoco?: () => void;
}) {
  return (
    <AlertDialog open={abierto} onOpenChange={onAbiertoChange}>
      <AlertDialogContent
        className="rounded-lg"
        onCloseAutoFocus={(e) => {
          if (onDevolverFoco) {
            e.preventDefault();
            onDevolverFoco();
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Descartar cambios</AlertDialogTitle>
          <AlertDialogDescription>
            Hay cambios sin guardar. ¿Quieres descartarlos y conservar los datos
            guardados?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Seguir editando</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmar}>
            Descartar cambios
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
