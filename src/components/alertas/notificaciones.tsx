"use client";

import { Toaster, toast } from "sonner";
import { CheckCircle2, CircleAlert, Info } from "lucide-react";

export const notificar = {
  exito: (mensaje: string) => toast.success(mensaje),
  error: (mensaje: string) => toast.error(mensaje),
  informacion: (mensaje: string) => toast.info(mensaje),
};

export function Notificaciones() {
  return <Toaster theme="dark" position="bottom-right" closeButton containerAriaLabel="Avisos del sistema" toastOptions={{ closeButtonAriaLabel: "Cerrar aviso", style: { background: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }, className: "font-sans" }} icons={{ success: <CheckCircle2 className="size-4 text-success" />, error: <CircleAlert className="size-4 text-destructive" />, info: <Info className="size-4 text-ring" /> }} />;
}
