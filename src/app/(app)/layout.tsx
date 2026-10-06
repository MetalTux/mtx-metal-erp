import { cookies } from "next/headers";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function ApplicationLayout({ children }: { children: React.ReactNode }) {
  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false";
  return (
    <TooltipProvider delayDuration={150}>
      <SidebarProvider defaultOpen={defaultOpen}>
        <a href="#contenido-principal" className="sr-only fixed top-2 left-2 z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only">Saltar al contenido</a>
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-background">
          <AppTopbar />
          <div id="contenido-principal" tabIndex={-1} className="flex-1 p-4 outline-none md:p-6">{children}</div>
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-4 py-3 text-xs text-muted-foreground md:px-6">
            <span>MTX Metal ERP</span><span>Gestión para la fabricación de estructuras metálicas</span>
          </footer>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
