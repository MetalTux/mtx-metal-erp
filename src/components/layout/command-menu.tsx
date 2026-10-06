"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { navegacion } from "@/config/navegacion";
import { Button } from "@/components/ui/button";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useSidebar } from "@/components/ui/sidebar";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        setOpen((actual) => !actual);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return <>
    <Button variant="outline" className="h-9 w-9 justify-center px-0 text-muted-foreground sm:w-60 sm:justify-start sm:gap-2 sm:px-3" onClick={() => setOpen(true)} aria-label="Buscar página" aria-haspopup="dialog" aria-keyshortcuts="Control+k Meta+k">
      <Search aria-hidden="true" /><span className="hidden sm:inline">Buscar página…</span>
      <kbd className="ml-auto hidden rounded border border-border px-1.5 py-0.5 font-sans text-[10px] sm:inline">Ctrl K</kbd>
    </Button>
    <CommandDialog open={open} onOpenChange={setOpen} title="Buscar página" description="Busca una sección de MTX Metal ERP y pulsa Enter para abrirla.">
      <Command>
      <CommandInput placeholder="Buscar una sección…" aria-label="Buscar una sección" />
      <CommandList>
        <CommandEmpty>No se encontraron páginas.</CommandEmpty>
        {navegacion.map((grupo) => <CommandGroup key={grupo.titulo} heading={grupo.titulo}>
          {grupo.elementos.map((item) => <CommandItem key={item.ruta} value={`${grupo.titulo} ${item.titulo}`} onSelect={() => { setOpen(false); setOpenMobile(false); router.push(item.ruta); }}>
            <item.icono aria-hidden="true" /><span>{item.titulo}</span>
          </CommandItem>)}
        </CommandGroup>)}
      </CommandList>
      </Command>
    </CommandDialog>
  </>;
}
