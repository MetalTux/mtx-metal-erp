"use client";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { esPreferenciaTema } from "@/lib/tema-config";
import { elegirTema, useTema } from "./estado";
const etiquetas = { oscuro: "Oscuro", claro: "Claro", sistema: "Según el sistema" };
export function SelectorTema() {
  const { preferencia, efectivo, listo, temporal } = useTema();
  const Icono = preferencia === "sistema" ? Monitor : efectivo === "claro" ? Sun : Moon;
  const nombre = listo ? `Apariencia: ${etiquetas[preferencia]}` : "Apariencia";
  return <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" disabled={!listo} aria-label={nombre} title={nombre} className="h-9 shrink-0 gap-2 px-2"><Icono aria-hidden="true" className="size-4"/><span className="hidden xl:inline">{listo ? etiquetas[preferencia] : "Apariencia"}</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-60"><DropdownMenuLabel>Apariencia</DropdownMenuLabel><p className="px-2 py-1 text-xs text-muted-foreground">Actual: {etiquetas[efectivo]}</p><DropdownMenuSeparator/><DropdownMenuRadioGroup value={preferencia} onValueChange={v => { if (esPreferenciaTema(v)) elegirTema(v); }}><DropdownMenuRadioItem value="claro">Claro</DropdownMenuRadioItem><DropdownMenuRadioItem value="oscuro">Oscuro</DropdownMenuRadioItem><DropdownMenuRadioItem value="sistema">Según el sistema</DropdownMenuRadioItem></DropdownMenuRadioGroup><DropdownMenuSeparator/><p className="px-2 py-1 text-xs text-muted-foreground">{temporal ? "No se pudo guardar: se aplica sólo durante esta visita." : "Se recuerda en este navegador."}</p></DropdownMenuContent></DropdownMenu>;
}
