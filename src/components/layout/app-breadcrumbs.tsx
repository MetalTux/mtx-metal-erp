"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { obtenerNavegacion } from "@/config/navegacion";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

export function AppBreadcrumbs() {
  const { elemento, grupo } = obtenerNavegacion(usePathname());
  return (
    <Breadcrumb aria-label="Ruta actual" className="min-w-0">
      <BreadcrumbList className="flex-nowrap overflow-hidden">
        <BreadcrumbItem className="hidden shrink-0 lg:inline-flex"><BreadcrumbLink asChild><Link href="/">Inicio</Link></BreadcrumbLink></BreadcrumbItem>
        <BreadcrumbSeparator className="hidden lg:block" />
        {grupo && grupo.titulo !== "Inicio" && <><BreadcrumbItem className="hidden shrink-0 sm:inline-flex"><span>{grupo.titulo}</span></BreadcrumbItem><BreadcrumbSeparator className="hidden sm:block" /></>}
        <BreadcrumbItem className="min-w-0"><BreadcrumbPage className="truncate">{elemento?.titulo ?? "Página"}</BreadcrumbPage></BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
