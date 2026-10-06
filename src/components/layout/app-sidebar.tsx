"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Hexagon, Settings2, X } from "lucide-react";
import { navegacion, rutaEstaActiva } from "@/config/navegacion";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const pathname = usePathname();
  const { state, setOpenMobile, isMobile } = useSidebar();
  const [gruposAbiertos, setGruposAbiertos] = useState<Record<string, boolean>>({});
  const cerrarEnMovil = () => setOpenMobile(false);

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="h-14 shrink-0 justify-center border-b border-border p-2">
        <div className="flex items-center justify-between gap-1">
          <Link href="/" onClick={cerrarEnMovil} aria-label="MTX Metal ERP — Inicio" className="flex min-w-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-card-header text-brand"><Hexagon className="size-5" aria-hidden="true" /></span>
            <span className="truncate text-base font-semibold tracking-tight group-data-[collapsible=icon]:hidden">MTX <span className="font-normal text-muted-foreground">Metal ERP</span></span>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Cerrar menú" onClick={cerrarEnMovil}><X aria-hidden="true" /></Button>
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-1 py-2">
        <nav aria-label="Navegación principal">
          {navegacion.map((grupo) => {
            const activo = grupo.elementos.some((item) => rutaEstaActiva(pathname, item.ruta));
            const contraido = state === "collapsed" && !isMobile;
            return (
              <Collapsible key={grupo.titulo} open={contraido || activo || (gruposAbiertos[grupo.titulo] ?? true)} onOpenChange={(open) => setGruposAbiertos((actual) => ({ ...actual, [grupo.titulo]: open }))}>
                <SidebarGroup className="py-1">
                  <SidebarGroupLabel asChild className="mb-1 text-xs uppercase tracking-wider text-muted-foreground group-data-[collapsible=icon]:hidden">
                    <CollapsibleTrigger disabled={activo} className="group/grupo justify-between">
                      {grupo.titulo}<ChevronDown aria-hidden="true" className="size-3! transition-transform group-data-[state=closed]/grupo:-rotate-90" />
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu className="gap-0.5">
                        {grupo.elementos.map((item) => (
                          <SidebarMenuItem key={item.ruta}>
                            <SidebarMenuButton asChild isActive={rutaEstaActiva(pathname, item.ruta)} tooltip={item.titulo} className="h-9 gap-3 text-muted-foreground data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground data-active:hover:bg-sidebar-primary/90 data-active:active:bg-sidebar-primary/90">
                              <Link href={item.ruta} onClick={cerrarEnMovil} aria-current={rutaEstaActiva(pathname, item.ruta) ? "page" : undefined}>
                                <item.icono aria-hidden="true" /><span>{item.titulo}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            );
          })}
        </nav>
      </SidebarContent>
      <SidebarFooter className="border-t border-border p-2">
        <SidebarMenu><SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="Configurar empresa" className="h-12">
            <Link href="/configuracion/empresa" onClick={cerrarEnMovil}>
              <Settings2 aria-hidden="true" />
              <span className="flex flex-col"><span className="font-medium">Espacio de trabajo</span><span className="text-xs text-muted-foreground">MTX Metal ERP</span></span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem></SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
