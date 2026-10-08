"use client";
import { useState } from "react";
import type { Compra } from "@/lib/tipos/compra";
import {
  cerrarDatosPendienteCompra,
  anularDatosCompra,
} from "@/app/(app)/compras/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectorBuscable } from "@/components/formularios/selector-buscable";
import { ConfirmarAccion } from "@/components/alertas/confirmar-accion";
import { ConfirmarDescarte } from "@/components/alertas/confirmar-descarte";
import { Aviso } from "@/components/alertas/aviso";
import { notificar } from "@/components/alertas/notificaciones";
import { formatearCantidad } from "@/lib/formato";

/** La clave se conserva en errores de red para que un reintento no repita cierres o reversiones. */
export function FinalizarCompra({
  compra,
  modo,
  onCerrar,
  onExito,
}: {
  compra: Compra;
  modo: "cerrar" | "anular";
  onCerrar: () => void;
  onExito: () => void;
}) {
  const [clave] = useState(() => crypto.randomUUID());
  const [motivo, setMotivo] = useState("");
  const [linea, setLinea] = useState("");
  const [ocupado, setOcupado] = useState(false),
    [confirmar, setConfirmar] = useState(false),
    [descarte, setDescarte] = useState(false);
  const [error, setError] = useState<string>();
  const pendientes = compra.lines.filter((l) => l.pendiente !== "0"),
    seleccionada = pendientes.find((l) => String(l.id) === linea);
  function cerrar() {
    if (ocupado) return;
    if (motivo || linea) setDescarte(true);
    else onCerrar();
  }
  async function guardar() {
    setOcupado(true);
    setError(undefined);
    try {
      const ref = { id: compra.id, version: compra.version };
      const r =
        modo === "cerrar"
          ? await cerrarDatosPendienteCompra(
              { reason: motivo, purchaseDetailId: Number(linea) },
              ref,
              clave,
            )
          : await anularDatosCompra({ reason: motivo }, ref, clave);
      if (r.ok) {
        notificar.exito(r.mensaje);
        onExito();
      } else {
        setConfirmar(false);
        setError(r.mensaje);
      }
    } catch {
      setConfirmar(false);
      setError(
        "No se pudo confirmar el resultado. Reintenta sin cambiar los datos para conservar la operación.",
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
          className="max-h-[90dvh] overflow-y-auto"
          onEscapeKeyDown={(e) => {
            if (ocupado) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (ocupado) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {modo === "cerrar" ? "Cerrar pendiente" : "Anular compra"}{" "}
              {compra.documentNumber}
            </DialogTitle>
            <DialogDescription>
              {compra.proveedor} · {compra.bodega}.{" "}
              {modo === "cerrar"
                ? "Cierra todo el pendiente de una línea sin modificar lo comprado ni el stock. Puedes repetirlo para otras líneas."
                : "Anula la compra completa. Se conservarán el documento y las recepciones, generando ajustes por el material recibido."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!motivo.trim() || (modo === "cerrar" && !seleccionada)) {
                setError("Indica un motivo y selecciona la línea pendiente.");
                return;
              }
              setError(undefined);
              setConfirmar(true);
            }}
          >
            {modo === "cerrar" && (
              <Aviso tipo="informacion" titulo="¿Cuándo cerrar un pendiente?">
                <div className="space-y-2">
                  <p>Usa esta acción sólo cuando la cantidad restante de una línea ya no llegará. Si todavía esperas recibirla, deja el pendiente abierto.</p>
                  <p>Por ejemplo: compraste 10 cajas y recibiste 7. Si el proveedor no entregará las 3 restantes, cierra ese pendiente e indica el motivo.</p>
                  <p>Se cierra todo el restante de la línea seleccionada. Lo comprado, recibido y cerrado se conserva en el historial: no cambia el stock ni se anula lo recibido. La cantidad cerrada ya no podrá recibirse.</p>
                  <p>Desde el primer cierre se bloquean proveedor, documento, bodega y líneas; la fecha sigue editable. Puedes repetir el cierre para otras líneas.</p>
                </div>
              </Aviso>
            )}
            {error && <Aviso titulo={error} />}
            {modo === "cerrar" && (
              <div>
                <Label htmlFor="cierre-linea">Línea pendiente</Label>
                <SelectorBuscable
                  id="cierre-linea"
                  nombre="línea pendiente"
                  opciones={pendientes.map((l) => ({
                    valor: String(l.id),
                    etiqueta: `${l.material} · ${l.presentation} · ${formatearCantidad(l.pendiente)} pendientes`,
                  }))}
                  valor={linea}
                  onChange={setLinea}
                  disabled={ocupado}
                  placeholder="Seleccionar línea"
                />
              </div>
            )}
            <div>
              <Label htmlFor="finalizar-motivo">Motivo obligatorio</Label>
              <Input
                id="finalizar-motivo"
                value={motivo}
                maxLength={1000}
                disabled={ocupado}
                onChange={(e) => setMotivo(e.target.value)}
                required
              />
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
                {modo === "cerrar" ? "Revisar cierre" : "Revisar anulación"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmarAccion
        abierto={confirmar}
        onAbiertoChange={setConfirmar}
        titulo={
          modo === "cerrar"
            ? "Confirmar cierre de pendiente"
            : "Confirmar anulación de compra"
        }
        descripcion={
          modo === "cerrar"
            ? `Se cerrarán ${seleccionada ? formatearCantidad(seleccionada.pendiente) : ""} ${seleccionada?.presentation ?? ""} de ${seleccionada?.material ?? ""}. No ingresarán a stock. Motivo: ${motivo}. El cierre se conservará en el historial.`
            : `Se anulará toda la compra ${compra.documentNumber} y se revertirá únicamente lo recibido en ${compra.bodega}. Se bloqueará si hubo consumo, traslado o ajuste negativo posterior, aunque se haya repuesto stock. Motivo: ${motivo}. Esta acción no se puede deshacer.`
        }
        accion={modo === "cerrar" ? "Cerrar pendiente" : "Anular compra"}
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
