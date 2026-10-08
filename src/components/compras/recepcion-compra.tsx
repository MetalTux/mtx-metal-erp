"use client";
import { useState } from "react";
import {
  registrarRecepcionCompra,
  calcularRecepcionCompra,
} from "@/app/(app)/compras/actions";
import type { Compra } from "@/lib/tipos/compra";
import { formatearCantidad } from "@/lib/formato";
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
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string>();
  const [previa, setPrevia] = useState<VistaPrevia>();
  const [descarte, setDescarte] = useState(false);
  const [sucio, setSucio] = useState(false);
  const referencia = { id: compra.id, version: compra.version };
  // Vacío significa no recibir esta línea. Un cero escrito es un error, no una omisión silenciosa.
  const datos = () => ({
    date: fecha,
    note: nota,
    lines: compra.lines
      .filter((l) => cantidades[l.id]?.trim())
      .map((l) => ({
        purchaseDetailId: l.id,
        receivedQuantity: cantidades[l.id],
      })),
  });
  function cerrar() {
    if (ocupado) return;
    if (sucio) setDescarte(true);
    else onCerrar();
  }
  async function preparar() {
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
            if (ocupado) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (ocupado) e.preventDefault();
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
                  disabled={ocupado}
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
                  disabled={ocupado}
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
            <div className="space-y-3">
              {compra.lines.map((l) => (
                <div key={l.id} className="rounded-md border border-border p-4">
                  <p className="font-medium">{l.material}</p>
                  <p className="text-sm text-muted-foreground">
                    {l.presentation} · contenido:{" "}
                    {formatearCantidad(l.unitFactor)} {l.unidad} · pendiente:{" "}
                    {formatearCantidad(l.pendiente)} {l.presentation}
                  </p>
                  <Label htmlFor={`recepcion-cantidad-${l.id}`}>
                    Cantidad a recibir de {l.material} ({l.presentation})
                  </Label>
                  <Input
                    id={`recepcion-cantidad-${l.id}`}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="Sin recepción"
                    value={cantidades[l.id] ?? ""}
                    disabled={ocupado || l.pendiente === "0"}
                    onChange={(e) => {
                      setCantidades((c) => ({ ...c, [l.id]: e.target.value }));
                      setSucio(true);
                    }}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={ocupado}
                onClick={cerrar}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={ocupado}>
                {ocupado ? "Procesando…" : "Revisar recepción"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmarAccion
        abierto={Boolean(previa)}
        onAbiertoChange={(v) => {
          if (!v && !ocupado) setPrevia(undefined);
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
