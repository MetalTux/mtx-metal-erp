import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function Aviso({ titulo, children, tipo = "error" }: { titulo: string; children?: React.ReactNode; tipo?: "error" | "exito" | "informacion" }) {
  const Icono = tipo === "exito" ? CircleCheck : tipo === "informacion" ? Info : CircleAlert;
  return <div role={tipo === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-md border p-4 text-sm", tipo === "error" ? "border-destructive/50 bg-destructive/10" : tipo === "exito" ? "border-success/50 bg-success/10" : "border-ring/40 bg-info")}>
    <Icono aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
    <div><p className="font-medium">{titulo}</p>{children && <div className="mt-1 text-muted-foreground">{children}</div>}</div>
  </div>;
}
