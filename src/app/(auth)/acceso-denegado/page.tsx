import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
export default function AccesoDenegado() {
  return <section aria-labelledby="acceso-denegado-titulo" className="mx-auto w-full max-w-[26rem] space-y-4 rounded-lg border border-border bg-card p-5 sm:p-6"><ShieldAlert aria-hidden="true" className="size-6 text-warning" /><h1 id="acceso-denegado-titulo" className="text-[23px] leading-tight font-semibold">Acceso no permitido</h1><p className="text-sm text-muted-foreground">Tu sesión no tiene permiso para esta tarea. Si necesitas acceso, consulta al Administrador.</p><Link href="/" className={buttonVariants({ className: "h-10" })}>Volver al Dashboard</Link></section>;
}
