"use client";
import { Button } from "@/components/ui/button";
export default function ErrorDespachos({ reset }: { reset: () => void }) {
  return <section className="space-y-4"><h1 className="text-[23px] leading-tight font-semibold">No se pudieron cargar los despachos</h1><p role="alert" className="text-sm text-muted-foreground">Comprueba la conexión y vuelve a intentar. Si una confirmación tuvo resultado incierto, conserva sus datos y UUID antes de iniciar otra operación.</p><Button onClick={reset}>Volver a cargar</Button></section>;
}
