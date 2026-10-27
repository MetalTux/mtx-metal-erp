export default function Loading() {
  return <div role="status" aria-live="polite" className="space-y-4"><h1 className="text-3xl font-semibold">Guías de Despacho</h1><p className="text-sm text-muted-foreground">Cargando documentos y disponibilidad de entrega…</p><div aria-hidden className="h-48 animate-pulse rounded-lg bg-muted" /></div>;
}
