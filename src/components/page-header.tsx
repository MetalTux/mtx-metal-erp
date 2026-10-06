import type { ReactNode } from "react";

export function PageHeader({ titulo, descripcion, acciones }: { titulo: string; descripcion?: string; acciones?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0"><h1 className="text-3xl font-semibold tracking-tight">{titulo}</h1>{descripcion && <p className="mt-1.5 leading-relaxed text-muted-foreground">{descripcion}</p>}</div>
      {acciones && <div className="flex shrink-0 items-center gap-2">{acciones}</div>}
    </div>
  );
}
