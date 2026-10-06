import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionCard({ titulo, descripcion, acciones, children, className, contentClassName }: {
  titulo: string; descripcion?: string; acciones?: ReactNode; children: ReactNode; className?: string; contentClassName?: string;
}) {
  return (
    <section aria-label={titulo} className={cn("min-w-0 overflow-hidden rounded-lg border border-border bg-card", className)}>
      <div className="section-card-header flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0"><h2 className="text-base font-medium">{titulo}</h2>{descripcion && <p className="mt-0.5 text-xs text-muted-foreground">{descripcion}</p>}</div>
        {acciones}
      </div>
      <div className={cn("p-4", contentClassName)}>{children}</div>
    </section>
  );
}
