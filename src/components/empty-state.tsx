import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({ icono: Icono, titulo, descripcion, accion, className }: {
  icono: LucideIcon; titulo: string; descripcion: string; accion?: ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex min-h-44 flex-col items-center justify-center px-4 py-7 text-center", className)}>
      <div className="mb-3 flex size-11 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground"><Icono className="size-5" aria-hidden="true" /></div>
      <p className="font-medium">{titulo}</p><p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{descripcion}</p>
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}
