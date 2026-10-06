"use client";

import Link from "next/link";
import { Bell, Building2, ChevronDown, UserRound } from "lucide-react";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { CommandMenu } from "@/components/layout/command-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

export function AppTopbar() {
  const { state, isMobile, openMobile } = useSidebar();
  const abierto = isMobile ? openMobile : state === "expanded";
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-topbar px-4 md:gap-3 md:px-6">
      <SidebarTrigger className="size-9 shrink-0" aria-label={abierto ? "Contraer menú" : "Expandir menú"} aria-expanded={abierto} aria-keyshortcuts="Control+b Meta+b" />
      <Separator orientation="vertical" className="mr-1 h-4!" />
      <AppBreadcrumbs />
      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
        <CommandMenu />
        <Popover>
          <PopoverTrigger asChild><Button variant="ghost" size="icon-lg" aria-label="Notificaciones"><Bell className="size-5" aria-hidden="true" /></Button></PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-4"><h2 className="mb-2 font-medium">Notificaciones</h2><p className="text-sm leading-relaxed text-muted-foreground">Las alertas de stock y vencimientos estarán disponibles próximamente.</p></PopoverContent>
        </Popover>
        <Separator orientation="vertical" className="hidden h-6! sm:block" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 px-1.5" aria-label="Menú de usuario">
              <Avatar className="size-8"><AvatarFallback className="border border-border bg-muted"><UserRound className="size-4" aria-hidden="true" /></AvatarFallback></Avatar>
              <span className="hidden text-left leading-tight lg:flex lg:flex-col"><span>Usuario</span><span className="mt-0.5 text-xs font-normal text-muted-foreground">Sin sesión iniciada</span></span>
              <ChevronDown className="hidden size-3 text-muted-foreground sm:block" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>Espacio de trabajo</DropdownMenuLabel>
            <p className="px-2 py-1 text-xs leading-relaxed text-muted-foreground">El inicio de sesión estará disponible próximamente.</p>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/configuracion/empresa"><Building2 aria-hidden="true" />Datos de la empresa</Link></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
