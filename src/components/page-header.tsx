import type { ReactNode } from "react";

export function PageHeader({ titulo, descripcion, acciones }: { titulo: string; descripcion?: string; acciones?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 [overflow-wrap:anywhere]"><h1 className="text-[23px] leading-tight font-semibold">{titulo}</h1>{descripcion && <p className="mt-1.5 text-[13px] leading-normal text-muted-foreground">{descripcion}</p>}</div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  );
}
