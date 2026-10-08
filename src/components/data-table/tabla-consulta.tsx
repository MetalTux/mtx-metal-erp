"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { BotonConAyuda } from "@/components/formularios/boton-con-ayuda";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PaginaConsulta } from "@/lib/tipos/inventario";

export type ColumnaConsulta<T> = { id: string; titulo: string; orden?: string; contenido: (fila: T) => ReactNode };
/** Tabla de consultas paginadas y ordenadas en PostgreSQL, sin filtrar sólo la página visible. */
export function TablaConsulta<T extends { id: number }>({ nombre, pagina, columnas, orden, sentido, pendiente, onOrden, onPagina, onTamano, vacio, ayudasBotones = false }: {
  ayudasBotones?: boolean; nombre: string; pagina: PaginaConsulta<T>; columnas: ColumnaConsulta<T>[]; orden: string; sentido: "asc" | "desc";
  pendiente: boolean; onOrden: (orden: string) => void; onPagina: (pagina: number) => void; onTamano: (tamano: string) => void; vacio: ReactNode;
}) {
  const paginas = Math.max(1, Math.ceil(pagina.total / pagina.tamano));
  return <div aria-busy={pendiente}>
    <Table aria-label={nombre}>
      <TableHeader className="bg-card-header/30"><TableRow>{columnas.map(columna => <TableHead key={columna.id} className="h-11 px-4 text-[13px]" aria-sort={columna.orden ? columna.orden === orden ? sentido === "asc" ? "ascending" : "descending" : "none" : undefined}>
        {columna.orden ? <BotonConAyuda ayuda={ayudasBotones ? `Ordena por ${columna.titulo}; pulsa de nuevo para invertir el orden.` : undefined} variant="ghost" className="-ml-2 h-8 px-2 text-[13px]" disabled={pendiente} onClick={() => onOrden(columna.orden!)}>{columna.titulo}{columna.orden === orden ? sentido === "asc" ? <ArrowUp aria-hidden="true" /> : <ArrowDown aria-hidden="true" /> : <ArrowUpDown aria-hidden="true" />}</BotonConAyuda> : columna.titulo}
      </TableHead>)}</TableRow></TableHeader>
      <TableBody>{pagina.datos.length ? pagina.datos.map(fila => <TableRow key={fila.id}>{columnas.map(columna => <TableCell key={columna.id} className="h-11 px-4 tabular-nums">{columna.contenido(fila)}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columnas.length} className="h-48 text-center">{vacio}</TableCell></TableRow>}</TableBody>
    </Table>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 text-xs text-muted-foreground">
      <span role="status" className="tabular-nums">{pagina.total ? (pagina.pagina - 1) * pagina.tamano + 1 : 0}–{Math.min(pagina.pagina * pagina.tamano, pagina.total)} de {pagina.total} registros</span>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">Filas por página<select aria-label="Filas por página" value={pagina.tamano} disabled={pendiente} onChange={event => onTamano(event.target.value)} className="h-8 rounded-md border border-border bg-card px-2 focus-visible:outline-ring">{[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
        <span className="tabular-nums">Página {pagina.pagina} de {paginas}</span>
        <BotonConAyuda variant="outline" size="sm" disabled={pendiente || pagina.pagina <= 1} ayuda={ayudasBotones ? "Muestra la página anterior de compras." : undefined} onClick={() => onPagina(pagina.pagina - 1)}>Anterior</BotonConAyuda>
        <BotonConAyuda variant="outline" size="sm" disabled={pendiente || pagina.pagina >= paginas} ayuda={ayudasBotones ? "Muestra la página siguiente de compras." : undefined} onClick={() => onPagina(pagina.pagina + 1)}>Siguiente</BotonConAyuda>
      </div>
    </div>
  </div>;
}
