import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="space-y-4" role="status" aria-label="Cargando inventario">
      <PageHeader
        titulo="Traslados entre bodegas"
        descripcion="Consultando registros…"
      />
      <div className="space-y-4 rounded-md border border-border bg-card p-4">
        <Skeleton className="h-24 w-full" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
