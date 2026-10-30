import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <main className="flex min-h-[60svh] items-center justify-center p-6">
    <section aria-labelledby="pagina-no-encontrada" className="w-full max-w-md space-y-4">
      <h1 id="pagina-no-encontrada" className="text-[23px] leading-tight font-semibold">Página no encontrada</h1>
      <p className="text-sm text-muted-foreground">Revisa la dirección o vuelve al Dashboard para continuar.</p>
      <Button asChild><Link href="/">Volver al Dashboard</Link></Button>
    </section>
  </main>;
}
