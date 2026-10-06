import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { elementosNavegacion } from "@/config/navegacion";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export function ModulePlaceholder({ ruta }: { ruta: string }) {
  const elemento = elementosNavegacion.find((item) => item.ruta === ruta);
  if (!elemento) notFound();
  return <>
    <PageHeader titulo={elemento.titulo} descripcion={elemento.descripcion} acciones={<Button variant="outline" className="h-9" asChild><Link href="/"><ArrowLeft aria-hidden="true" />Volver al inicio</Link></Button>} />
    <SectionCard titulo={elemento.titulo}>
      <EmptyState icono={elemento.icono} titulo="Próximamente" descripcion="Este módulo estará disponible en una próxima etapa. Puedes explorar las otras secciones desde el menú lateral." className="min-h-80" />
    </SectionCard>
  </>;
}
