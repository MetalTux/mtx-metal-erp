"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { PageHeader } from "@/components/page-header";
import { Aviso } from "@/components/alertas/aviso";
import { Button } from "@/components/ui/button";
export default function ErrorInventario({ reset }: { reset: () => void }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  return <div className="space-y-6"><PageHeader titulo="Stock por bodega" descripcion="Consulta de inventario." /><Aviso titulo="No se pudieron cargar los datos de inventario">Comprueba la conexión e inténtalo nuevamente.</Aviso><Button disabled={pendiente} onClick={() => iniciar(() => { router.refresh();reset(); })}>{pendiente ? "Reintentando…" : "Reintentar"}</Button></div>;
}
