"use client";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
/** Ayuda accesible con clic/teclado y en dispositivos táctiles; nunca depende sólo del hover. */
export function AyudaCampo({
  nombre,
  texto,
}: {
  nombre: string;
  texto: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Información sobre ${nombre}`}
          className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Info className="size-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-w-[calc(100vw-2rem)] text-sm" side="top">
        <p className="font-medium">{nombre}</p>
        <p className="mt-1 text-muted-foreground">{texto}</p>
      </PopoverContent>
    </Popover>
  );
}
