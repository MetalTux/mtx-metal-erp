import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="space-y-6" role="status" aria-label="Cargando condiciones de pago"><PageHeader titulo="Condiciones de Pago" descripcion="Cargando el catálogo…" /><div className="space-y-4 rounded-lg border border-border bg-card p-4"><Skeleton className="h-9 w-full max-w-sm" />{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div></div>;
}
