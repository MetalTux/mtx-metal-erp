import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() { return <div role="status" aria-label="Cargando Empresa" className="space-y-6"><PageHeader titulo="Empresa" descripcion="Cargando los datos…" /><div className="grid gap-6 lg:grid-cols-2">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-64 w-full rounded-lg" />)}</div></div>; }
