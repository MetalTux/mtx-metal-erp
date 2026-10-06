"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from "lucide-react";
import { createPaginatedRowModel, createSortedRowModel, rowPaginationFeature, rowSortingFeature, sortFn_alphanumeric, tableFeatures, useTable, type ColumnDef, type RowData, type PaginationState } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const features = tableFeatures({ rowSortingFeature, rowPaginationFeature, sortedRowModel: createSortedRowModel(), paginatedRowModel: createPaginatedRowModel(), sortFns: { alphanumeric: sortFn_alphanumeric } });
export type ColumnaDatos<T extends RowData> = ColumnDef<typeof features, T>;

function normalizar(texto: string) { return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL"); }

export function DataTable<T extends { id: number }>({ datos, columnas, textoBusqueda, filtroPlaceholder, nombre, acciones, vacio }: {
  datos: T[]; columnas: ColumnaDatos<T>[]; textoBusqueda: (dato: T) => string;
  filtroPlaceholder: string; nombre: string; acciones?: React.ReactNode; vacio: React.ReactNode;
}) {
  const [filtro, setFiltro] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const filtrados = useMemo(() => datos.filter((dato) => normalizar(textoBusqueda(dato)).includes(normalizar(filtro.trim()))), [datos, filtro, textoBusqueda]);
  // Al borrar la última fila de una página, conserva la página válida más cercana.
  const paginas = Math.max(1, Math.ceil(filtrados.length / pagination.pageSize));
  const paginacionActual = useMemo(() => ({ ...pagination, pageIndex: Math.min(pagination.pageIndex, paginas - 1) }), [pagination, paginas]);
  const table = useTable({ features, data: filtrados, columns: columnas, getRowId: (fila) => String(fila.id), autoResetPageIndex: false, defaultColumn: { sortFn: "alphanumeric" }, state: { pagination: paginacionActual }, onPaginationChange: setPagination });
  const cambiarFiltro = (valor: string) => { setFiltro(valor); table.setPageIndex(0); };
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" aria-hidden="true" />
        <Input aria-label={`Filtrar ${nombre}`} placeholder={filtroPlaceholder} value={filtro} onChange={(event) => cambiarFiltro(event.target.value)} className="h-9 pr-10 pl-9" />
        {filtro && <Button variant="ghost" size="icon-sm" className="absolute top-0.5 right-1" aria-label="Limpiar filtro" onClick={() => cambiarFiltro("")}><X aria-hidden="true" /></Button>}
      </div>
      {acciones}
    </div>
    <Table aria-label={nombre}>
      <TableHeader className="bg-card-header/30">{table.getHeaderGroups().map((grupo) => <TableRow key={grupo.id}>{grupo.headers.map((header) => <TableHead key={header.id} className="h-11 px-4 text-[13px]" aria-sort={header.column.getCanSort() ? (header.column.getIsSorted() === "asc" ? "ascending" : header.column.getIsSorted() === "desc" ? "descending" : "none") : undefined}>
        {header.isPlaceholder ? null : header.column.getCanSort() ? <Button variant="ghost" className="-ml-2 h-8 px-2 text-[13px]" onClick={() => { header.column.toggleSorting(); table.setPageIndex(0); }}><table.FlexRender header={header} />{header.column.getIsSorted() === "asc" ? <ArrowUp aria-hidden="true" /> : header.column.getIsSorted() === "desc" ? <ArrowDown aria-hidden="true" /> : <ArrowUpDown aria-hidden="true" />}</Button> : <table.FlexRender header={header} />}
      </TableHead>)}</TableRow>)}</TableHeader>
      <TableBody>{table.getRowModel().rows.length ? table.getRowModel().rows.map((fila) => <TableRow key={fila.id}>{fila.getAllCells().map((celda) => <TableCell key={celda.id} className="h-11 px-4 tabular-nums"><table.FlexRender cell={celda} /></TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columnas.length} className="h-48 text-center">{datos.length === 0 ? vacio : <div><p className="font-medium">No hay coincidencias</p><p className="mt-1 text-muted-foreground">Prueba otro filtro o limpia la búsqueda.</p></div>}</TableCell></TableRow>}</TableBody>
    </Table>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 text-xs text-muted-foreground">
      <span role="status" className="tabular-nums">{filtrados.length} de {datos.length} registros</span>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">Filas por página<select aria-label="Filas por página" value={table.state.pagination.pageSize} onChange={(event) => { table.setPageSize(Number(event.target.value)); table.setPageIndex(0); }} className="h-8 rounded-md border border-border bg-card px-2 focus-visible:outline-ring">{[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
        <span className="tabular-nums">Página {Math.min(table.state.pagination.pageIndex + 1, paginas)} de {paginas}</span>
        <Button variant="outline" size="sm" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>Anterior</Button>
        <Button variant="outline" size="sm" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>Siguiente</Button>
      </div>
    </div>
  </>;
}
