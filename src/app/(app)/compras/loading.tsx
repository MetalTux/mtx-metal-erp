import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div role="status" aria-label="Cargando compras" className="space-y-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
