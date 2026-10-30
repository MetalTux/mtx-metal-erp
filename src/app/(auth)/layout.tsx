import { Hexagon } from "lucide-react";
import { SelectorTema } from "@/components/tema/selector-tema";
import { Notificaciones } from "@/components/alertas/notificaciones";
export const metadata = { referrer: "no-referrer" as const, robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <><Notificaciones /><div className="flex min-h-dvh flex-col bg-background">
    <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6"><div className="flex min-w-0 items-center gap-2 text-sm"><Hexagon aria-hidden="true" className="size-5 shrink-0 text-brand" /><span className="truncate"><strong className="font-semibold">MTX</strong> Metal ERP</span></div><SelectorTema /></header>
    <main id="contenido-principal" className="flex flex-1 items-center justify-center px-4 py-6 sm:py-10">{children}</main>
    <footer className="px-4 pb-4 text-center text-xs text-muted-foreground">Gestión para la fabricación de estructuras metálicas</footer>
  </div></>;
}
