"use client";
import { useRef, useState } from "react";
import {
  registrarRecepcionCompra,
  calcularRecepcionCompra,
} from "@/app/(app)/compras/actions";
import type { Compra } from "@/lib/tipos/compra";
import { formatearCantidad } from "@/lib/formato";
import { DialogoCantidadDetalle } from "@/components/formularios/dialogo-cantidad-detalle";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Aviso } from "@/components/alertas/aviso";
import { ConfirmarAccion } from "@/components/alertas/confirmar-accion";
import { ConfirmarDescarte } from "@/components/alertas/confirmar-descarte";
import { notificar } from "@/components/alertas/notificaciones";

type VistaPrevia = Extract<
  Awaited<ReturnType<typeof calcularRecepcionCompra>>,
  { ok: true }
>;
/** Se conserva el UUID mientras el formulario está abierto, incluso si la red falla al guardar. */
export function RecepcionCompra({
  compra,
  onCerrar,
  onExito,
}: {
  compra: Compra;
  onCerrar: () => void;
  onExito: () => void;
}) {
  const [clave] = useState(() => crypto.randomUUID());
  const [fecha, setFecha] = useState(() =>
    new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Santiago" }).format(
      new Date(),
    ),
  );
  const [nota, setNota] = useState("");
  const [cantidades, setCantidades] = useState<Record<number, string>>({});
  const [equivalencias, setEquivalencias] = useState<Record<number, string>>({});
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string>();
  const [previa, setPrevia] = useState<VistaPrevia>();
  const [descarte, setDescarte] = useState(false);
  const [sucio, setSucio] = useState(false);
  const [editor, setEditor] = useState<{ id: number; consulta: boolean }>();
  const [incierto, setIncierto] = useState(false);
  const focoDetalle = useRef<HTMLElement | null>(null);
  const tabla = useRef<HTMLDivElement>(null);
  const bloqueado = ocupado || incierto;
  const actual = compra.lines.find(l => l.id === editor?.id);
  function abrir(id: number, consulta: boolean) { focoDetalle.current = document.activeElement as HTMLElement; setEditor({ id, consulta }); }
  function modificar(id: number, valor: string) { setEquivalencias(v => { const siguientes = { ...v }; delete siguientes[id]; return siguientes; }); setCantidades(c => ({ ...c, [id]: valor })); setSucio(true); setPrevia(undefined); }
  const referencia = { id: compra.id, version: compra.version };
  // Vacío significa no recibir esta línea. Un cero escrito es un error, no una omisión silenciosa.
  const datos = (valores = cantidades) => ({
    date: fecha,
    note: nota,
    lines: compra.lines
      .filter((l) => valores[l.id]?.trim())
      .map((l) => ({
        purchaseDetailId: l.id,
        receivedQuantity: valores[l.id],
      })),
  });
  function cerrar() {
    if (bloqueado || editor || previa || descarte) return;
    if (sucio) setDescarte(true);
    else onCerrar();
  }
  async function preparar() {
    if (bloqueado || editor) return;
    setOcupado(true);
    setError(undefined);
    try {
      const r = await calcularRecepcionCompra(datos(), referencia);
      if (r.ok) setPrevia(r);
      else setError(r.mensaje);
    } catch {
      setError(
        "No se pudo verificar la recepción. Conservamos los datos para reintentar.",
      );
    } finally {
      setOcupado(false);
    }
  }
  async function guardar() {
    setOcupado(true);
    setError(undefined);
    try {
      const r = await registrarRecepcionCompra(datos(), referencia, clave);
      if (r.ok) {
        notificar.exito(r.mensaje);
        onExito();
      } else {
        setPrevia(undefined);
        setError(r.mensaje);
      }
    } catch {
      setIncierto(true);
      setPrevia(undefined);
      setError(
        "No se pudo confirmar el resultado. Reintenta sin cambiar los datos para conservar la misma operación.",
      );
    } finally {
      setOcupado(false);
    }
  }
  return (
    <>
      <Dialog
        open
        onOpenChange={(v) => {
          if (!v) cerrar();
        }}
      >
        <DialogContent
          className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl"
          onEscapeKeyDown={(e) => {
            if (bloqueado || editor || previa || descarte) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (bloqueado || editor || previa || descarte) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Recibir compra {compra.documentNumber}</DialogTitle>
            <DialogDescription>
              {compra.proveedor} · {compra.documento}. El material ingresará a{" "}
              {compra.bodega}.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void preparar();
            }}
            className="space-y-4"
          >
            {error && <Aviso titulo={error} />}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="recepcion-fecha">Fecha de recepción</Label>
                <Input
                  id="recepcion-fecha"
                  type="date"
                  value={fecha}
                  disabled={bloqueado}
                  onChange={(e) => {
                    setFecha(e.target.value);
                    setSucio(true);
                  }}
                  required
                />
              </div>
              <div>
                <Label htmlFor="recepcion-nota">Observación (opcional)</Label>
                <Input
                  id="recepcion-nota"
                  value={nota}
                  maxLength={1000}
                  disabled={bloqueado}
                  onChange={(e) => {
                    setNota(e.target.value);
                    setSucio(true);
                  }}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Indica cantidades en la presentación comprada. Deja vacías las
              líneas que no recibes. El contenido y los precios se conservan.
            </p>
            <Table containerProps={{ ref: tabla, role: "region", tabIndex: 0, "aria-label": "Detalle de recepción; desplazar horizontalmente para ver todas las columnas" }}>
              <TableCaption>Partidas de origen de la compra; sólo se reciben las seleccionadas con cantidad válida.</TableCaption>
              <TableHeader><TableRow>{["Recibir", "Material / presentación", "Contenido", "Comprado", "Recibido", "Cerrado", "Pendiente", "Esta recepción", "Equivalencia", "Acciones"].map(t => <TableHead scope="col" key={t}>{t}</TableHead>)}</TableRow></TableHeader>
              <TableBody>{compra.lines.map(l => {
                const agotada = !/[1-9]/.test(l.pendiente);
                const cantidad = cantidades[l.id] ?? "";
                const equivalente = previa?.lineas.find(v => v.id === l.id)?.equivalente ?? equivalencias[l.id];
                return <TableRow key={l.id}>
                  <TableCell><input type="checkbox" aria-label={`Recibir ${l.material}`} checked={Boolean(cantidad.trim())} disabled={bloqueado || agotada} onChange={e => { if (e.target.checked) abrir(l.id, false); else modificar(l.id, ""); }} /></TableCell>
                  <TableCell className="min-w-48 whitespace-normal"><p className="font-medium">{l.material}</p><p className="text-xs text-muted-foreground">{l.presentation}</p></TableCell>
                  <TableCell className="text-right tabular-nums">{formatearCantidad(l.unitFactor)} {l.unidad}</TableCell>
                  {[l.purchasedQuantity, l.recibido, l.cerrado, l.pendiente].map((valor, i) => <TableCell key={i} className="text-right tabular-nums">{formatearCantidad(valor)} {l.presentation}</TableCell>)}
                  <TableCell className="text-right tabular-nums">{cantidad ? `${formatearCantidad(cantidad)} ${l.presentation}` : agotada ? "Sin pendiente" : "No seleccionada"}</TableCell>
                  <TableCell className="text-right tabular-nums">{!cantidad ? "—" : equivalente ? `${formatearCantidad(equivalente)} ${l.unidad}` : "Revisar recepción"}</TableCell>
                  <TableCell><div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={bloqueado} onClick={() => abrir(l.id, true)}>Ver {l.material}</Button><Button type="button" size="sm" variant="outline" disabled={bloqueado || agotada} onClick={() => abrir(l.id, false)}>Editar cantidad de {l.material}</Button></div></TableCell>
                </TableRow>;
              })}</TableBody>
            </Table>
            <p className="text-xs text-muted-foreground">Puedes desplazar la tabla horizontalmente. No se agregan ni eliminan partidas de la compra desde una recepción.</p>
            {incierto && <Aviso titulo="Resultado de recepción pendiente de comprobar">Conservamos los datos y el UUID del intento. Reintenta sin cambios para evitar una recepción duplicada.<Button type="button" disabled={ocupado} onClick={() => void guardar()}>Reintentar la misma recepción</Button></Aviso>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={bloqueado}
                onClick={cerrar}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={bloqueado}>
                {ocupado ? "Procesando…" : "Revisar recepción"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {editor && actual && <DialogoCantidadDetalle key={`${editor.id}-${editor.consulta}`} titulo={editor.consulta ? "Ver partida de recepción" : "Editar cantidad a recibir"} descripcion={`${actual.material} · Contenido ${formatearCantidad(actual.unitFactor)} ${actual.unidad} por ${actual.presentation}. Comprado ${actual.purchasedQuantity}, recibido ${actual.recibido}, cerrado ${actual.cerrado}, pendiente ${actual.pendiente}. Se revalidará al confirmar.`} etiqueta={`Cantidad a recibir de ${actual.material} (${actual.presentation})`} inicial={cantidades[actual.id] ?? ""} consulta={editor.consulta} permitirVacio onCerrar={() => setEditor(undefined)} devolverFoco={() => (focoDetalle.current?.isConnected ? focoDetalle.current : tabla.current)?.focus()} onAceptar={async valor => {
        const siguientes = { ...cantidades, [actual.id]: valor };
        let equivalente: string | undefined;
        if (valor) { const r = await calcularRecepcionCompra(datos(siguientes), referencia); if (!r.ok) return r.mensaje; equivalente = r.lineas.find(l => l.id === actual.id)?.equivalente; }
        modificar(actual.id, valor);
        if (equivalente) setEquivalencias(v => ({ ...v, [actual.id]: equivalente }));
        setEditor(undefined);
      }} />}
      <ConfirmarAccion
        abierto={Boolean(previa)}
        onAbiertoChange={(v) => {
          if (!v && !bloqueado) setPrevia(undefined);
        }}
        titulo="Confirmar recepción de materiales"
        descripcion={`Se registrarán en ${compra.bodega}: ${previa?.lineas.map((l) => `${l.material}: ${formatearCantidad(l.cantidad)} ${l.presentacion} → ${formatearCantidad(l.equivalente)} ${l.unidad}`).join("; ") ?? ""}. Las recepciones no se editan ni se eliminan individualmente. Revisa las cantidades antes de confirmar.`}
        accion="Registrar recepción"
        pendiente={ocupado}
        onConfirmar={() => void guardar()}
      />
      <ConfirmarDescarte
        abierto={descarte}
        onAbiertoChange={setDescarte}
        onConfirmar={onCerrar}
      />
    </>
  );
}
