"use client";

import { Aviso } from "@/components/alertas/aviso";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function ErrorProveedores({ reset }: { reset: () => void }) {
  return <div className="space-y-6"><PageHeader titulo="Proveedores" descripcion="Catálogo de proveedores y datos de contacto." /><Aviso titulo="No se pudo cargar el listado">Comprueba la conexión e inténtalo nuevamente.</Aviso><Button onClick={reset}>Reintentar</Button></div>;
}
