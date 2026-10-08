"use client";
import { useEffect, useState } from "react";
import {
  obtenerSaldosTraslado,
  prepararConfirmacionTraslado,
  guardarDatosTraslado,
} from "@/app/(app)/inventario/traslados/actions";
import type { CatalogosInventario } from "@/lib/tipos/inventario";
import type { FilaTraslado } from "@/lib/consultas/traslados-inventario";
import { SelectorBuscable } from "@/components/formularios/selector-buscable";
import { AyudaCampo } from "@/components/formularios/ayuda-campo";
import { ConfirmarAccion } from "@/components/alertas/confirmar-accion";
import { ConfirmarDescarte } from "@/components/alertas/confirmar-descarte";
import { Aviso } from "@/components/alertas/aviso";
import { notificar } from "@/components/alertas/notificaciones";
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
import { formatearCantidad } from "@/lib/formato";
type Saldos = Awaited<ReturnType<typeof obtenerSaldosTraslado>>;
export function FormularioTraslado({
  catalogos,
  corregido,
  hoy,
  uuid,
  onCerrar,
  onDevolverFoco,
  onExito,
}: {
  catalogos: CatalogosInventario;
  corregido?: FilaTraslado;
  hoy: string;
  uuid: string;
  onCerrar: () => void;
  onDevolverFoco: () => void;
  onExito: () => void;
}) {
  const [material, setMaterial] = useState(
    corregido ? String(corregido.materialId) : "",
  );
  const [origen, setOrigen] = useState(
      corregido ? String(corregido.destinoId) : "",
    ),
    [destino, setDestino] = useState(
      corregido ? String(corregido.origenId) : "",
    );
  const [cantidad, setCantidad] = useState(corregido?.cantidad ?? ""),
    [fecha, setFecha] = useState(hoy),
    [nota, setNota] = useState("");
  const [sucio, setSucio] = useState(false),
    [ocupado, setOcupado] = useState(false),
    [descarte, setDescarte] = useState(false),
    [incierto, setIncierto] = useState(false),
    [intento, setIntento] = useState(0);
  const [error, setError] = useState<string>(),
    [consulta, setConsulta] = useState<{ clave: string; resultado: Saldos }>();
  const [confirmacion, setConfirmacion] = useState<{
    datos: unknown;
    origenFinal: string;
    destinoFinal: string;
  }>();
  const materia = catalogos.materiales.find((m) => String(m.id) === material),
    unidad = materia?.unitMeasureId ?? 0;
  const clave = JSON.stringify([material, origen, destino, unidad, intento]);
  const resultado = consulta?.clave === clave ? consulta.resultado : undefined,
    saldos = resultado?.ok ? resultado : undefined;
  useEffect(() => {
    if (!material || !origen || !destino || !unidad) return;
    let vigente = true;
    void obtenerSaldosTraslado({
      rawMaterialId: Number(material),
      unitMeasureId: unidad,
      sourceWarehouseId: Number(origen),
      destinationWarehouseId: Number(destino),
    })
      .then((r) => {
        if (vigente)
          setConsulta({
            clave: JSON.stringify([material, origen, destino, unidad, intento]),
            resultado: r,
          });
      })
      .catch(() => {
        if (vigente)
          setConsulta({
            clave: JSON.stringify([material, origen, destino, unidad, intento]),
            resultado: {
              ok: false,
              mensaje: "No se pudieron consultar ambas bodegas. Reintenta.",
            },
          });
      });
    return () => {
      vigente = false;
    };
  }, [material, origen, destino, unidad, intento]);
  function cerrar() {
    if (ocupado) return;
    if (sucio || incierto) setDescarte(true);
    else onCerrar();
  }
  async function revisar() {
    if (!saldos) return;
    const datos = {
      rawMaterialId: Number(material),
      unitMeasureId: unidad,
      sourceWarehouseId: Number(origen),
      destinationWarehouseId: Number(destino),
      quantity: cantidad,
      date: fecha,
      note: nota,
      correctedTransferId: corregido?.id ?? null,
      idempotencyKey: uuid,
      sourceReference: saldos.origen,
      destinationReference: saldos.destino,
    };
    setOcupado(true);
    setError(undefined);
    try {
      const r = await prepararConfirmacionTraslado(datos);
      if (r.ok)
        setConfirmacion({
          datos,
          origenFinal: r.origenFinal,
          destinoFinal: r.destinoFinal,
        });
      else setError(r.mensaje);
    } catch {
      setError("No se pudo preparar la confirmación. Reintenta.");
    } finally {
      setOcupado(false);
    }
  }
  async function guardar() {
    if (!confirmacion) return;
    setOcupado(true);
    setError(undefined);
    try {
      const r = await guardarDatosTraslado(confirmacion.datos);
      if (r.ok) {
        notificar.exito(r.mensaje);
        onExito();
      } else {
        setError(r.mensaje);
        if ("incierto" in r && r.incierto) {
          // No cambiar UUID/contenido si el servidor no pudo confirmar el resultado.
          setIncierto(true);
        } else {
          setConfirmacion(undefined);
          setIncierto(false);
        }
      }
    } catch {
      setIncierto(true);
      setError(
        "No se pudo confirmar el resultado. Reintenta la misma operación antes de iniciar otro traslado.",
      );
    } finally {
      setOcupado(false);
    }
  }
  const bloqueado = ocupado || incierto;
  const bodegas = catalogos.bodegas.map((b) => ({
    valor: String(b.id),
    etiqueta: b.name,
  }));
  function ayuda(id: string, titulo: string, texto: string) {
    return (
      <div className="flex items-center gap-1">
        <Label htmlFor={id}>{titulo}</Label>
        <AyudaCampo nombre={titulo} texto={texto} />
      </div>
    );
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
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            onDevolverFoco();
          }}
          className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"
          onEscapeKeyDown={(e) => {
            if (ocupado) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (ocupado) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {corregido
                ? `Corregir traslado #${corregido.id}`
                : "Registrar traslado"}
            </DialogTitle>
            <DialogDescription>
              Descuenta de la bodega de origen e ingresa al destino al
              confirmar. Se conservan ambos movimientos.
            </DialogDescription>
          </DialogHeader>
          <form
            className="min-w-0 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void revisar();
            }}
            onChange={() => setSucio(true)}
          >
            {error && <Aviso titulo={error} />}{" "}
            {resultado && !resultado.ok && <Aviso titulo={resultado.mensaje} />}
            {ayuda(
              "traslado-material",
              "Materia prima",
              "Traslada cantidad en la unidad del material, no cajas ni presentaciones de compra.",
            )}
            <SelectorBuscable
              id="traslado-material"
              nombre="materia prima del traslado"
              placeholder="Seleccionar material"
              valor={material}
              onChange={(v) => {
                setMaterial(v);
                setSucio(true);
              }}
              disabled={bloqueado || Boolean(corregido)}
              opciones={catalogos.materiales.map((m) => ({
                valor: String(m.id),
                etiqueta: `${m.code} · ${m.name}`,
                busqueda: m.unidad.name,
              }))}
            />
            {ayuda(
              "traslado-origen",
              "Bodega de origen",
              "Desde aquí se descuenta. Debe tener saldo suficiente y ser distinta del destino.",
            )}
            <SelectorBuscable
              id="traslado-origen"
              nombre="bodega de origen del traslado"
              placeholder="Seleccionar origen"
              valor={origen}
              onChange={(v) => {
                setOrigen(v);
                setSucio(true);
              }}
              disabled={bloqueado || Boolean(corregido)}
              opciones={bodegas}
            />
            {ayuda(
              "traslado-destino",
              "Bodega de destino",
              "Aquí ingresa inmediatamente. Si no tiene registros del material, se crea stock sólo al guardar; no se copia el mínimo del origen.",
            )}
            <SelectorBuscable
              id="traslado-destino"
              nombre="bodega de destino del traslado"
              placeholder="Seleccionar destino"
              valor={destino}
              onChange={(v) => {
                setDestino(v);
                setSucio(true);
              }}
              disabled={bloqueado || Boolean(corregido)}
              opciones={bodegas}
            />
            {material && origen && destino && !resultado && (
              <p role="status">Consultando ambas bodegas…</p>
            )}
            {saldos && (
              <div className="rounded-md border p-3 text-sm tabular-nums">
                <p>Unidad: {materia?.unidad.name}</p>
                <p>
                  Saldo en origen: {formatearCantidad(saldos.origen.quantity)}{" "}
                  {materia?.unidad.abbreviation}
                </p>
                <p>
                  Saldo en destino: {formatearCantidad(saldos.destino.quantity)}{" "}
                  {materia?.unidad.abbreviation}
                </p>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={bloqueado || !material || !origen || !destino}
              onClick={() => setIntento((i) => i + 1)}
            >
              Volver a consultar saldos
            </Button>
            {ayuda(
              "traslado-cantidad",
              "Cantidad a trasladar",
              "Cantidad positiva con hasta tres decimales. Una corrección devuelve toda la cantidad del traslado original, con saldo suficiente.",
            )}
            <Input
              id="traslado-cantidad"
              inputMode="decimal"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              disabled={bloqueado || Boolean(corregido)}
              required
            />
            {ayuda(
              "traslado-fecha",
              "Fecha del traslado",
              "Fecha actual o pasada, nunca futura. La fecha de registro es automática.",
            )}
            <Input
              id="traslado-fecha"
              type="date"
              max={hoy}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              disabled={bloqueado}
              required
            />
            <p className="text-sm">Motivo: Traslado entre bodegas</p>
            {ayuda(
              "traslado-nota",
              "Observación",
              "Explica el traslado o su corrección; obligatoria, hasta 2000 caracteres.",
            )}
            <textarea
              id="traslado-nota"
              className="min-h-24 w-full rounded-md border border-input bg-transparent p-3 text-sm focus-visible:outline-ring"
              maxLength={2000}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              disabled={bloqueado}
              required
            />
            {corregido && (
              <p className="text-sm">
                Devolución completa vinculada al traslado #{corregido.id}. El
                documento original se conserva. Cada traslado admite una
                corrección directa; el historial muestra la cadena de
                devoluciones.
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={ocupado}
                onClick={cerrar}
              >
                Cancelar
              </Button>
              <Button
                id="traslado-revisar"
                type="submit"
                disabled={bloqueado || !saldos}
              >
                Revisar traslado
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {confirmacion && (
        <ConfirmarAccion
          abierto
          onAbiertoChange={(v) => {
            if (!v && !incierto) setConfirmacion(undefined);
          }}
          titulo="Confirmar traslado entre bodegas"
          descripcion={`Cantidad: ${formatearCantidad(cantidad.replace(",", "."))} ${materia?.unidad.abbreviation}. Origen (${catalogos.bodegas.find((b) => String(b.id) === origen)?.name}): ${formatearCantidad(saldos?.origen.quantity ?? "0")} → ${formatearCantidad(confirmacion.origenFinal)}. Destino (${catalogos.bodegas.find((b) => String(b.id) === destino)?.name}): ${formatearCantidad(saldos?.destino.quantity ?? "0")} → ${formatearCantidad(confirmacion.destinoFinal)}. La salida bloqueará anulación de compras recibidas antes en esa combinación; devolver después el material no elimina ese bloqueo histórico. ${incierto ? "Reintenta la misma operación para confirmar su resultado." : "Verifica los datos: no se podrán editar ni eliminar los movimientos."}`}
          accion={incierto ? "Reintentar confirmación" : "Registrar traslado"}
          pendiente={ocupado}
          onConfirmar={() => void guardar()}
          onDevolverFoco={() => {
            const boton = document.getElementById("traslado-revisar");
            if (boton) boton.focus();
            else onDevolverFoco();
          }}
        />
      )}
      <ConfirmarDescarte
        abierto={descarte}
        onAbiertoChange={setDescarte}
        onConfirmar={onCerrar}
        onDevolverFoco={() => {
          const boton = document.getElementById("traslado-revisar");
          if (boton) boton.focus();
          else onDevolverFoco();
        }}
      />
    </>
  );
}
