"use client";

import { useId, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export type OpcionSelector = { valor: string; etiqueta: string; busqueda?: string };
const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL");

/** Selector relacionado con búsqueda interna por etiqueta y términos adicionales. */
export function SelectorBuscable({ id, opciones, valor, onChange, onBlur, nombre, placeholder, disabled, invalido, descripcionId, ref }: {
  id: string; opciones: OpcionSelector[]; valor: string; onChange: (valor: string) => void;
  onBlur?: () => void; nombre: string; placeholder: string; disabled?: boolean;
  invalido?: boolean; descripcionId?: string; ref?: React.Ref<HTMLButtonElement>;
}) {
  const [abierto, setAbierto] = useState(false);
  const listaId = useId();
  const seleccionada = opciones.find((opcion) => opcion.valor === valor);
  return <Popover open={abierto} onOpenChange={(estado) => { setAbierto(estado); if (!estado) onBlur?.(); }}>
    <PopoverTrigger asChild>
      <Button ref={ref} id={id} type="button" variant="outline" role="combobox" aria-expanded={abierto} aria-haspopup="listbox" aria-controls={abierto ? listaId : undefined} aria-invalid={invalido} aria-describedby={descripcionId} disabled={disabled} className="h-9 w-full justify-between font-normal" onKeyDown={(event) => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setAbierto(true); } }}>
        <span className={`truncate ${seleccionada ? "" : "text-muted-foreground"}`}>{seleccionada?.etiqueta ?? placeholder}</span><ChevronsUpDown aria-hidden="true" className="shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
      <Command filter={(valorItem, filtro, keywords) => normalizar(`${valorItem} ${(keywords ?? []).join(" ")}`).includes(normalizar(filtro.trim())) ? 1 : 0}>
        <CommandInput aria-label={`Buscar ${nombre}`} placeholder={`Buscar ${nombre}…`} />
        <CommandList id={listaId} aria-label={`Opciones de ${nombre}`}>
          <CommandEmpty>{opciones.length ? "No hay coincidencias." : "No hay opciones disponibles."}</CommandEmpty>
          <CommandGroup>{opciones.map((opcion) => <CommandItem key={opcion.valor} value={opcion.valor} keywords={[opcion.etiqueta, opcion.busqueda ?? ""]} data-checked={opcion.valor === valor} className="cursor-pointer" onSelect={() => { onChange(opcion.valor); setAbierto(false); onBlur?.(); }}>{opcion.etiqueta}</CommandItem>)}</CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>;
}
