import type { ReactNode } from "react";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/** Presentación de historia ya consultada; la paginación y las acciones pertenecen al módulo. */
export function GrillaHistorial({ titulo, columnas, numericas = [], filas, vacio = "Sin registros en esta página." }: {
  titulo: string; columnas: string[]; numericas?: string[]; filas: { id: string | number; celdas: ReactNode[] }[]; vacio?: string;
}) {
  return <Table containerProps={{ role: "region", "aria-label": titulo, tabIndex: 0, className: "rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" }}>
    <TableCaption className="caption-top pb-2 text-left"><span className="font-medium text-foreground">{titulo}</span><span className="block text-[13px]">Desplaza horizontalmente para consultar todas las columnas.</span></TableCaption>
    <TableHeader><TableRow>{columnas.map(c => <TableHead key={c} scope="col" className={numericas.includes(c) ? "text-right" : undefined}>{c}</TableHead>)}</TableRow></TableHeader>
    <TableBody>{filas.length ? filas.map(f => <TableRow key={f.id}>{f.celdas.map((v,i) => <TableCell key={columnas[i]} className={numericas.includes(columnas[i]) ? "text-right whitespace-nowrap tabular-nums" : "min-w-24 max-w-sm whitespace-normal break-words"}>{v}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columnas.length}>{vacio}</TableCell></TableRow>}</TableBody>
  </Table>;
}
