"use client";
import { SelectorTema } from "@/components/tema/selector-tema";
import { Permiso } from "@/components/seguridad/permisos";

import Link from "next/link";
import type { AvisosDashboard } from "@/lib/consultas/dashboard";
import { useState } from "react";
import { solicitarAcceso } from "@/components/seguridad/cliente";
import { notificar } from "@/components/alertas/notificaciones";
import { Bell, Building2, ChevronDown, LogOut, UserRound } from "lucide-react";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { CommandMenu } from "@/components/layout/command-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

export function AppTopbar({sesion,avisos}:{sesion?:{name:string;roles:string[]}|null;avisos?:AvisosDashboard}) {
  const [cerrando, setCerrando] = useState(false);
  async function cerrarSesion() {
    if (cerrando) return;
    setCerrando(true);
    const resultado = await solicitarAcceso({ action: "logout" });
    if (resultado.ok) {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Descartar el estado y caché de la identidad al cerrar sesión.
      window.location.assign("/ingresar");
      return;
    }
    setCerrando(false);
    notificar.error(resultado.message ?? "No se pudo cerrar la sesión. Vuelve a intentar.");
  }
  const { state, isMobile, openMobile } = useSidebar();
  const abierto = isMobile ? openMobile : state === "expanded";
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-topbar px-4 md:gap-3 md:px-6">
      <SidebarTrigger className="size-9 shrink-0" aria-label={abierto ? "Contraer menú" : "Expandir menú"} aria-expanded={abierto} aria-keyshortcuts="Control+b Meta+b" />
      <Separator orientation="vertical" className="mr-1 h-4!" />
      <AppBreadcrumbs />
      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
        <CommandMenu />
        <SelectorTema />
        <Popover>
          <PopoverTrigger asChild><Button variant="ghost" size="icon-lg" aria-label="Notificaciones" title="Avisos internos"><Bell className="size-5" aria-hidden="true" /></Button></PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-4"><h2 className="mb-2 font-medium">Notificaciones</h2>{avisos?.datos?<ul className="space-y-3 text-sm">{avisos.datos.filter(a=>a.cantidad>0).map(a=><li key={a.ruta}><Link className="underline" href={a.ruta}>{a.titulo}: <strong className="tabular-nums">{a.cantidad}</strong></Link></li>)}{!avisos.datos.some(a=>a.cantidad>0)&&<li>Sin avisos pendientes para tus áreas.</li>}</ul>:<p role="status" className="text-sm">{avisos?.error??"No se pudieron consultar los avisos."}</p>}<p className="mt-3 text-xs text-muted-foreground">Se actualizan al navegar o recargar. No envían correos ni tienen estado de lectura.</p></PopoverContent>
        </Popover>
        <Separator orientation="vertical" className="hidden h-6! sm:block" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 px-1.5" aria-label="Menú de usuario">
              <Avatar className="size-8"><AvatarFallback className="border border-border bg-muted"><UserRound className="size-4" aria-hidden="true" /></AvatarFallback></Avatar>
              <span className="hidden text-left leading-tight lg:flex lg:flex-col"><span>{sesion?.name??"Usuario"}</span><span className="mt-0.5 text-xs font-normal text-muted-foreground">{sesion?"Sesión personal":"Sin sesión iniciada"}</span></span>
              <ChevronDown className="hidden size-3 text-muted-foreground sm:block" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>Espacio de trabajo</DropdownMenuLabel>
            <DropdownMenuItem asChild><Link href={sesion?"/mi-acceso":"/ingresar"}>{sesion?"Mi acceso y seguridad":"Iniciar sesión"}</Link></DropdownMenuItem>
            {sesion?.roles.includes("ADMINISTRADOR")&&<DropdownMenuItem asChild><Link href="/administracion/usuarios">Usuarios y roles</Link></DropdownMenuItem>}
            <Permiso permiso="auditoria.leer"><DropdownMenuItem asChild><Link href="/administracion/auditoria">Auditoría y autoría</Link></DropdownMenuItem></Permiso>
            <DropdownMenuSeparator />
            <Permiso permiso="configuracion.leer"><DropdownMenuItem asChild><Link href="/configuracion/empresa"><Building2 aria-hidden="true" />Datos de la empresa</Link></DropdownMenuItem></Permiso>
          </DropdownMenuContent>
        </DropdownMenu>
        {sesion && <Button variant="outline" disabled={cerrando} onClick={cerrarSesion} aria-label={cerrando ? "Cerrando sesión" : "Cerrar sesión"} title="Cerrar sesión actual" className="shrink-0 px-2 sm:px-3">
          <LogOut className="size-4" aria-hidden="true" />
          <span className="hidden lg:inline">{cerrando ? "Cerrando…" : "Cerrar sesión"}</span>
        </Button>}
      </div>
    </header>
  );
}
