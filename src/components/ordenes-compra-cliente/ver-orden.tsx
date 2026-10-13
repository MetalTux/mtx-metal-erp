"use client";
import Link from "next/link";
import type { OrdenConsultada } from "@/lib/consultas/ordenes-compra-cliente";
import { EditorCotizacion } from "@/components/formularios/editor-cotizacion";
import { formatearCantidad, formatearFecha } from "@/lib/formato";
import { Button } from "@/components/ui/button";
import { monedaOrden, fechaOrden } from "./formulario-orden";
const ignorar = () => {};
export function VerOrden({ orden: o, onCerrar }: { orden: OrdenConsultada; onCerrar: () => void }) {
  const cliente = o.clientSnapshot as Record<string, string | null>, empresa = o.companySnapshot as Record<string, string | null>, banco = o.bankSnapshot as Record<string, string | null>;
  return <div className="min-w-0 space-y-5">
    <div className="grid min-w-0 gap-3 rounded-md border border-border p-3 text-sm sm:grid-cols-2">
      <p>Estado: <strong>{o.status === "ANULADA" ? "Anulada" : "Confirmada"}</strong> · {fechaOrden(o.date)}</p><p>Cotización {o.quoteFolio} · Revisión aceptada {o.quoteVersion}</p>
      <p className="break-words">Cliente: {o.clientName} · {cliente.rut}</p><p className="break-words">Sucursal: {o.branchName} · {cliente.address}, {cliente.city}</p>
      <p className="break-words">Contacto: {cliente.branchContact} · {cliente.branchPhone} · {cliente.branchEmail || "Sin correo"}</p><p className="break-words">Emisor: {empresa.legalName} · {empresa.rut}</p>
      <p className="whitespace-pre-wrap break-words">OC del cliente: {o.customerOrderNumber || "Sin número externo"}</p><p>Fecha OC cliente: {o.customerOrderDate ? fechaOrden(o.customerOrderDate) : "Sin fecha externa"}</p>
      <p>Condición: {o.paymentConditionName} · {o.paymentTermDays} días desde factura</p><p className="break-words">Banco: {banco.name ? `${banco.name} · ${banco.type} · ${banco.number} · ${banco.holder}` : "Sin datos bancarios"}</p>
    </div>
    {o.voidReason && <p className="rounded-md bg-muted p-3 text-sm">Motivo de anulación: {o.voidReason}</p>}
    <div className="min-w-0 space-y-3"><h3 className="font-medium">Cotizado, contratado y no contratado</h3>{o.lines.map(l => <div key={l.id} className="min-w-0 rounded-md border border-border p-3 text-sm"><p className="break-words font-medium">{l.description}</p><div className="mt-1 grid min-w-0 gap-2 tabular-nums sm:grid-cols-3"><p>Cotizado: {formatearCantidad(l.offeredQuantity)} {l.unitName}</p><p>Contratado: {formatearCantidad(l.acceptedQuantity)} {l.unitName}</p><p>No contratado: {formatearCantidad(l.excludedQuantity)} {l.unitName}</p></div><p>Precio final: {monedaOrden(l.unitPrice)} · Importe contratado: {monedaOrden(l.lineAmount)}</p></div>)}</div>
    <div className="grid min-w-0 gap-2 rounded-md border border-border p-3 text-sm tabular-nums sm:grid-cols-2"><p>Total ofrecido: {monedaOrden(o.offeredTotal)}</p><p>Subtotal contratado: {monedaOrden(o.subtotal)}</p><p>Descuento: {monedaOrden(o.discountAmount)}</p><p>Neto: {monedaOrden(o.netAmount)}</p><p>IVA {o.vatRate}%: {monedaOrden(o.vatAmount)}</p><p className="font-semibold">Total contratado: {monedaOrden(o.totalAmount)}</p></div>
    <div className="min-w-0 rounded-md bg-muted/30 p-3 text-sm"><p className="font-medium">Cuenta por cobrar {o.cuenta.anulada ? "anulada" : "vigente"}</p><p>Importe acordado: {monedaOrden(o.cuenta.amount)} · Abonado: {formatearCantidad(o.cuenta.abonado)} pesos · Saldo por cobrar: {formatearCantidad(o.cuenta.saldo)} pesos</p><p>{o.cuenta.dueDate ? `Vencimiento: ${fechaOrden(o.cuenta.dueDate)}` : "Sin vencimiento: se determina desde la fecha de factura al finalizar el trabajo."}</p>{o.workOrderId && <p>Trabajo asociado: #{o.workOrderId}</p>}</div>
    {o.commercialTerms && <div className="min-w-0 text-sm"><h3 className="font-medium">Condiciones comerciales</h3><p className="whitespace-pre-wrap break-words">{o.commercialTerms}</p></div>}
    <div className="min-w-0 space-y-2"><h3 className="font-medium">Alcance contratado</h3><EditorCotizacion valor={o.technicalDescription} onChange={ignorar} draftKey="" soloLectura etiqueta="Alcance técnico contratado" onBloqueo={ignorar} onValidez={ignorar} /></div>
    <details className="min-w-0 rounded-md border border-border p-3"><summary className="cursor-pointer text-sm">Consultar alcance técnico de la oferta original</summary><EditorCotizacion valor={o.originalTechnicalDescription} onChange={ignorar} draftKey="" soloLectura etiqueta="Alcance técnico original" onBloqueo={ignorar} onValidez={ignorar} /></details>
    {o.pdfEmissionId && <p className="text-sm"><a className="text-primary underline" href={`/api/cotizaciones/pdfs/${o.pdfEmissionId}`} target="_blank" rel="noreferrer">Ver PDF de la revisión ofrecida</a> · El estado impreso corresponde al momento de emisión.</p>}
    <div className="text-sm"><h3 className="font-medium">Historial</h3>{o.operaciones.map(op => <p key={op.version}>Revisión {op.version} · {op.type === "CONFIRMAR" ? "Confirmación" : "Anulación"} · {formatearFecha(op.createdAt)}</p>)}</div>
    <div className="flex flex-wrap justify-end gap-2"><Button asChild variant="outline"><Link href={`/ventas/cotizaciones?q=${encodeURIComponent(o.quoteFolio)}`}>Consultar cotización</Link></Button><Button variant="outline" onClick={onCerrar}>Cerrar</Button></div>
  </div>;
}
