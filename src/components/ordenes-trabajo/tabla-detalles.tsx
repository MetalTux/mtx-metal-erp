"use client";

import type { ReactNode } from "react";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/** Presentación de consultas de OT; no interpreta cantidades ni modifica filas. */
export function TablaDetallesTrabajo({ titulo, columnas, filas, numericas = [] }: {
  titulo: string; columnas: string[]; numericas?: string[]; filas: { id: string | number; celdas: ReactNode[] }[];
}) {
  return <Table containerProps={{ role: "region", "aria-label": titulo, tabIndex: 0, className: "rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" }}>
    <TableCaption className="caption-top pb-2 text-left"><span className="font-medium text-foreground">{titulo}</span><span className="block text-xs text-muted-foreground">Desplaza horizontalmente para consultar todas las columnas.</span></TableCaption>
    <TableHeader><TableRow>{columnas.map(c => <TableHead key={c} scope="col" className={numericas.includes(c) ? "text-right" : undefined}>{c}</TableHead>)}</TableRow></TableHeader>
    <TableBody>{filas.length ? filas.map(f => <TableRow key={f.id}>{f.celdas.map((c, i) => <TableCell key={columnas[i]} className={numericas.includes(columnas[i]) ? "text-right whitespace-nowrap tabular-nums" : "min-w-24 max-w-sm whitespace-normal break-words"}>{c}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columnas.length} className="text-muted-foreground">Sin registros para esta sección.</TableCell></TableRow>}</TableBody>
  </Table>;
}
