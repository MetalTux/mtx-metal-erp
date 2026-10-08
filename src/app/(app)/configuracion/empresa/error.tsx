"use client";
import { Aviso } from "@/components/alertas/aviso";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
export default function ErrorEmpresa({ reset }: { reset: () => void }) {
  return <div className="space-y-6"><PageHeader titulo="Empresa" descripcion="Datos de la empresa que utiliza el ERP." /><Aviso titulo="No se pudieron cargar los datos de Empresa">Comprueba la conexión e inténtalo nuevamente.</Aviso><Button onClick={reset}>Reintentar</Button></div>;
}
