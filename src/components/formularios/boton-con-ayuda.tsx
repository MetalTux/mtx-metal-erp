"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** El contenedor permite consultar la ayuda incluso cuando la acción está deshabilitada. */
export function BotonConAyuda({ ayuda, ...props }: ComponentProps<typeof Button> & { ayuda?: string }) {
  if (!ayuda) return <Button {...props} />;
  return (
    <Tooltip disableHoverableContent>
      <TooltipTrigger asChild>
        <span className="inline-flex self-end rounded-lg focus-visible:outline-2 focus-visible:outline-ring" tabIndex={props.disabled ? 0 : undefined} aria-label={props.disabled ? `${props["aria-label"] ?? "Acción no disponible"}. ${ayuda}` : undefined}>
          <Button {...props} />
        </span>
      </TooltipTrigger>
      <TooltipContent data-ayuda-boton="" className="pointer-events-none" side="top" sideOffset={6}>{ayuda}</TooltipContent>
    </Tooltip>
  );
}
