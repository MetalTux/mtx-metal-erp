"use client";
import { GrillaHistorial } from "@/components/grilla-historial";
import { EnlaceCuenta } from "@/components/cobranza/enlace-cuenta";
import { EnlaceAutoria } from "@/components/seguridad/enlace-autoria";
import { useRef, useState } from "react";
import { usePermiso, Permiso } from "@/components/seguridad/permisos";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Link from "next/link";
import type { OrdenConsultada } from "@/lib/consultas/ordenes-compra-cliente";
import { EditorCotizacion } from "@/components/formularios/editor-cotizacion";
import { formatearCantidad, formatearFecha } from "@/lib/formato";
import { Button } from "@/components/ui/button";
import { monedaOrden, fechaOrden } from "./formulario-orden";
const ignorar = () => {};
export function VerOrden({ orden: o, onCerrar, onBloqueo }: { orden: OrdenConsultada; onCerrar: () => void; onBloqueo?: (valor: boolean) => void }) {
  const verPrecios = usePermiso("precios.leer");
  const [detalle, setDetalle] = useState<number>();
  const focoDetalle = useRef<HTMLElement | null>(null);
  function cerrarPartida() { setDetalle(undefined); onBloqueo?.(false); }
  const actual = o.lines.find(l => l.id === detalle);
  const cliente = o.clientSnapshot as Record<string, string | null>, empresa = o.companySnapshot as Record<string, string | null>, banco = o.bankSnapshot as Record<string, string | null>;
  return <div className="min-w-0 space-y-5"><EnlaceAutoria tipo="SalesOrder" id={o.id}/>
    <div className="grid min-w-0 gap-3 rounded-md border border-border p-3 text-sm sm:grid-cols-2">
      <p>Estado: <strong>{o.status === "ANULADA" ? "Anulada" : "Confirmada"}</strong> · {fechaOrden(o.date)}</p><p>Cotización {o.quoteFolio} · Revisión aceptada {o.quoteVersion}</p>
      <p className="break-words">Cliente: {o.clientName} · {cliente.rut}</p><p className="break-words">Sucursal: {o.branchName} · {cliente.address}, {cliente.city}</p>
      <p className="break-words">Contacto: {cliente.branchContact} · {cliente.branchPhone} · {cliente.branchEmail || "Sin correo"}</p><p className="break-words">Emisor: {empresa.legalName} · {empresa.rut}</p>
      <p className="whitespace-pre-wrap break-words">OC del cliente: {o.customerOrderNumber || "Sin número externo"}</p><p>Fecha OC cliente: {o.customerOrderDate ? fechaOrden(o.customerOrderDate) : "Sin fecha externa"}</p>
      <Permiso permiso="precios.leer"><p>Condición: {o.paymentConditionName} · {o.paymentTermDays} días desde factura</p><p className="break-words">Banco: {banco.name ? `${banco.name} · ${banco.type} · ${banco.number} · ${banco.holder}` : "Sin datos bancarios"}</p></Permiso>
    </div>
    {o.voidReason && <p className="rounded-md bg-muted p-3 text-sm">Motivo de anulación: {o.voidReason}</p>}
    <section className="min-w-0 space-y-3"><h3 className="font-medium">Cotizado, contratado y no contratado</h3>
      <Table containerProps={{ role: "region", tabIndex: 0, "aria-label": "Partidas contratadas; desplazar horizontalmente para ver todas las columnas" }}>
        <TableCaption>Detalle histórico de la OCC; las cantidades excluidas no se contratan.</TableCaption>
        <TableHeader><TableRow>{["Descripción", "Unidad", "Cotizado", "Contratado", "No contratado", ...(verPrecios ? [o.pricesIncludeVat ? "Precio con IVA" : "Precio neto", "Importe contratado"] : []), "Acciones"].map(t => <TableHead key={t} scope="col">{t}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{o.lines.map(l => <TableRow key={l.id}>
          <TableCell className="min-w-48 whitespace-normal font-medium">{l.description}</TableCell><TableCell>{l.unitName}</TableCell>
          {[l.offeredQuantity, l.acceptedQuantity, l.excludedQuantity].map((cantidad, i) => <TableCell className="text-right tabular-nums" key={i}>{formatearCantidad(cantidad)}</TableCell>)}
          {verPrecios && <><TableCell className="text-right tabular-nums">{monedaOrden(l.unitPrice)}</TableCell><TableCell className="text-right tabular-nums">{monedaOrden(l.lineAmount)}</TableCell></>}
          <TableCell><Button type="button" variant="outline" size="sm" onClick={() => { focoDetalle.current = document.activeElement as HTMLElement; setDetalle(l.id); onBloqueo?.(true); }}>Ver {l.description}</Button></TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </section>
    {actual && <Dialog open onOpenChange={abierto => { if (!abierto) cerrarPartida(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto" onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => { e.preventDefault(); cerrarPartida(); }} onCloseAutoFocus={e => { e.preventDefault(); focoDetalle.current?.focus(); }}><DialogHeader><DialogTitle>Ver partida contratada</DialogTitle><DialogDescription>{actual.description}</DialogDescription></DialogHeader><div className="space-y-2 text-sm"><div>Unidad: {actual.unitName}</div><div>Cotizado: {formatearCantidad(actual.offeredQuantity)}</div><div>Contratado: {formatearCantidad(actual.acceptedQuantity)}</div><div>No contratado: {formatearCantidad(actual.excludedQuantity)}</div>{verPrecios && <><div>{o.pricesIncludeVat ? "Precio con IVA" : "Precio neto"}: {monedaOrden(actual.unitPrice)}</div><div>Importe contratado: {monedaOrden(actual.lineAmount)}</div></>}</div><Button type="button" variant="outline" onClick={cerrarPartida}>Cerrar partida</Button></DialogContent></Dialog>}
    <Permiso permiso="precios.leer"><div className="grid min-w-0 gap-2 rounded-md border border-border p-3 text-sm tabular-nums sm:grid-cols-2"><p>Total ofrecido: {monedaOrden(o.offeredTotal)}</p><p>Subtotal contratado: {monedaOrden(o.subtotal)}</p><p>Descuento: {monedaOrden(o.discountAmount)}</p><p>Neto: {monedaOrden(o.netAmount)}</p><p>IVA {formatearCantidad(o.vatRate)}%: {monedaOrden(o.vatAmount)}</p><p className="font-semibold">Total contratado: {monedaOrden(o.totalAmount)}</p></div></Permiso>
    {o.cuenta && <div className="min-w-0 rounded-md bg-muted/30 p-3 text-sm"><EnlaceCuenta ordenId={o.id}/><p className="font-medium">Cuenta por cobrar {o.cuenta.anulada ? "anulada" : "vigente"}</p><p>Importe acordado: {monedaOrden(o.cuenta.amount)} · Abonado: {formatearCantidad(o.cuenta.abonado)} pesos · Saldo por cobrar: {formatearCantidad(o.cuenta.saldo)} pesos</p><p>{o.cuenta.dueDate ? `Vencimiento: ${fechaOrden(o.cuenta.dueDate)}` : "Sin vencimiento: se determina desde la fecha de factura al finalizar el trabajo."}</p>{o.workOrderId && <p>Trabajo asociado: #{o.workOrderId}</p>}</div>}
    {o.commercialTerms && <div className="min-w-0 text-sm"><h3 className="font-medium">Condiciones comerciales</h3><p className="whitespace-pre-wrap break-words">{o.commercialTerms}</p></div>}
    <div className="min-w-0 space-y-2"><h3 className="font-medium">Alcance contratado</h3><EditorCotizacion valor={o.technicalDescription} onChange={ignorar} draftKey="" soloLectura etiqueta="Alcance técnico contratado" onBloqueo={ignorar} onValidez={ignorar} /></div>
    <details className="min-w-0 rounded-md border border-border p-3"><summary className="cursor-pointer text-sm">Consultar alcance técnico de la oferta original</summary><EditorCotizacion valor={o.originalTechnicalDescription} onChange={ignorar} draftKey="" soloLectura etiqueta="Alcance técnico original" onBloqueo={ignorar} onValidez={ignorar} /></details>
    {o.pdfEmissionId && <p className="text-sm"><a className="text-link underline" href={`/api/cotizaciones/pdfs/${o.pdfEmissionId}`} target="_blank" rel="noreferrer">Ver PDF de la revisión ofrecida</a> · El estado impreso corresponde al momento de emisión.</p>}
    <GrillaHistorial titulo="Historial de OCC" columnas={["Revisión","Operación","Registro"]} filas={o.operaciones.map(op=>({id:op.version,celdas:[op.version,op.type==="CONFIRMAR"?"Confirmación":"Anulación",formatearFecha(op.createdAt)]}))}/>

    <div className="flex flex-wrap justify-end gap-2">{o.status === "CONFIRMADA" && (o.workOrderId ? <Permiso permiso="trabajos.leer"><Button asChild variant="outline"><Link href={`/trabajos/ordenes?ver=${o.workOrderId}`}>Ver trabajo</Link></Button></Permiso> : <Permiso permiso="trabajos.operar"><Button asChild variant="outline"><Link href={`/trabajos/ordenes?crear=${o.id}`}>Crear trabajo</Link></Button></Permiso>)}<Button asChild variant="outline"><Link href={`/ventas/cotizaciones?q=${encodeURIComponent(o.quoteFolio)}`}>Consultar cotización</Link></Button>{o.status === "CONFIRMADA" && o.workOrderId && <Button asChild variant="outline"><Link href={`/trabajos/despachos?ot=${o.workOrderId}`}>Guías y entregas</Link></Button>}<Button variant="outline" onClick={onCerrar}>Cerrar</Button></div>
  </div>;
}
