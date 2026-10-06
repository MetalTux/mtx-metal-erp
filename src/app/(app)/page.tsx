import Link from "next/link";
import { ArrowRight, Banknote, ChartColumn, Clock3, FileText, Hammer, History, PackageSearch } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

const indicadores = [
  { titulo: "Cotizaciones pendientes", icono: FileText, detalle: "Ofertas por confirmar", color: "text-ring" },
  { titulo: "Órdenes de trabajo activas", icono: Hammer, detalle: "Producción en curso", color: "text-info-foreground" },
  { titulo: "Por cobrar", icono: Banknote, detalle: "Saldos pendientes por venta", color: "text-brand" },
  { titulo: "Materiales con stock bajo", icono: PackageSearch, detalle: "Reposición por bodega", color: "text-warning" },
];

function EnlaceSeccion({ ruta }: { ruta: string }) {
  return <Button asChild variant="ghost" className="h-7 shrink-0 px-2 text-xs text-muted-foreground"><Link href={ruta} aria-label="Abrir módulo">Ver módulo<ArrowRight className="size-3" aria-hidden="true" /></Link></Button>;
}

export default function DashboardPage() {
  return <>
    <PageHeader titulo="Dashboard" descripcion="Una vista general de tu taller, tus materiales y tus trabajos." acciones={<Button asChild className="h-9 gap-2 rounded-md"><Link href="/ventas/cotizaciones"><FileText aria-hidden="true" />Ver cotizaciones</Link></Button>} />
    <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {indicadores.map((indicador) => <section key={indicador.titulo} aria-label={indicador.titulo} className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3"><h2 className="text-sm font-medium text-muted-foreground">{indicador.titulo}</h2><indicador.icono className={`size-4 shrink-0 ${indicador.color}`} aria-hidden="true" /></div>
        <p className="mt-4 text-3xl font-semibold tabular-nums" aria-label="Indicador disponible próximamente">—</p>
        <p className="mt-1 text-xs text-muted-foreground">{indicador.detalle}</p>
      </section>)}
    </div>
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <SectionCard titulo="Requerimiento de materiales vs stock" acciones={<EnlaceSeccion ruta="/inventario/stock" />} className="md:col-span-2" contentClassName="p-0">
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Disponibilidad de materiales requeridos por los trabajos</caption><thead className="border-b border-border bg-muted/30 text-[13px] text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Material</th><th className="px-4 py-3 text-right font-medium">Requerido</th><th className="px-4 py-3 text-right font-medium">Disponible</th><th className="px-4 py-3 font-medium">Estado</th></tr></thead><tbody><tr><td colSpan={4}><EmptyState icono={PackageSearch} titulo="Materiales, siempre a la vista" descripcion="Aquí podrás comparar lo que necesitan tus trabajos con las existencias de cada bodega." /></td></tr></tbody></table></div>
      </SectionCard>
      <SectionCard titulo="Órdenes de trabajo activas" acciones={<EnlaceSeccion ruta="/trabajos/ordenes" />}><EmptyState icono={Hammer} titulo="Tu producción en un solo lugar" descripcion="Aquí verás tus trabajos en curso, para clientes y obras propias." /></SectionCard>
      <SectionCard titulo="Cotizado vs aprobado" descripcion="Últimos 6 meses" className="md:col-span-2"><EmptyState icono={ChartColumn} titulo="El avance de tus cotizaciones" descripcion="El resumen mensual estará disponible al habilitar la gestión de ventas." /></SectionCard>
      <SectionCard titulo="Cotizaciones por vencer" acciones={<EnlaceSeccion ruta="/ventas/cotizaciones" />}><EmptyState icono={Clock3} titulo="Anticípate a los vencimientos" descripcion="Aquí se destacarán las cotizaciones pendientes que vencen en los próximos 7 días." /></SectionCard>
      <SectionCard titulo="Últimos movimientos de stock" acciones={<EnlaceSeccion ruta="/inventario/movimientos" />} className="md:col-span-2 lg:col-span-3"><EmptyState icono={History} titulo="Cada movimiento, registrado" descripcion="Consulta aquí las entradas, salidas y ajustes de tus materiales." className="min-h-36" /></SectionCard>
    </div>
  </>;
}
