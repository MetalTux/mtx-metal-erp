"use client";
import { useEffect, useState } from "react";
import {
  obtenerSaldoAjuste,
  prepararConfirmacionAjuste,
  guardarDatosAjuste,
} from "@/app/(app)/inventario/ajustes/actions";
import type { CatalogosInventario } from "@/lib/tipos/inventario";
import type { FilaAjuste } from "@/lib/consultas/ajustes-inventario";
import { motivosAjuste } from "@/config/motivos-ajuste";
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
type Saldo = Awaited<ReturnType<typeof obtenerSaldoAjuste>>;
export function FormularioAjuste({
  catalogos,
  inicial,
  corregido,
  hoy,
  uuid,
  onCerrar,
  onExito,
}: {
  catalogos: CatalogosInventario;
  uuid: string;
  inicial: boolean;
  corregido?: FilaAjuste;
  hoy: string;
  onCerrar: () => void;
  onExito: () => void;
}) {
  const [material, setMaterial] = useState(
    corregido ? String(corregido.materialId) : "",
  );
  const [bodega, setBodega] = useState(
    corregido ? String(corregido.bodegaId) : "",
  );
  const [motivo, setMotivo] = useState(
    inicial
      ? "INVENTARIO_INICIAL"
      : corregido
        ? "CORRECCION_REGISTRO"
        : "CONTEO_FISICO",
  );
  const [cantidad, setCantidad] = useState(""),
    [fecha, setFecha] = useState(hoy),
    [nota, setNota] = useState("");
  const [sucio, setSucio] = useState(false),
    [ocupado, setOcupado] = useState(false),
    [descarte, setDescarte] = useState(false);
  const [error, setError] = useState<string>(),
    [intento, setIntento] = useState(0);
  const [consulta, setConsulta] = useState<{
    clave: string;
    resultado: Saldo;
  }>();
  const [confirmacion, setConfirmacion] = useState<{
    datos: unknown;
    diferencia: string;
  }>();
  // Tras una respuesta incierta, impedir cambiar el contenido: reintentar exactamente el mismo UUID/datos.
  const [incierto, setIncierto] = useState(false);
  const materia = catalogos.materiales.find((m) => String(m.id) === material);
  const unitMeasureId = materia?.unitMeasureId ?? 0;
  const clave = JSON.stringify([material, bodega, unitMeasureId, intento]);
  const resultado = consulta?.clave === clave ? consulta.resultado : undefined;
  const saldo = resultado?.ok ? resultado : undefined;
  useEffect(() => {
    if (!material || !bodega || !unitMeasureId) return;
    let vigente = true;
    void obtenerSaldoAjuste({
      rawMaterialId: Number(material),
      warehouseId: Number(bodega),
      unitMeasureId,
    })
      .then((r) => {
        if (vigente)
          setConsulta({
            clave: JSON.stringify([material, bodega, unitMeasureId, intento]),
            resultado: r,
          });
      })
      .catch(() => {
        if (vigente)
          setConsulta({
            clave: JSON.stringify([material, bodega, unitMeasureId, intento]),
            resultado: {
              ok: false,
              mensaje: "No se pudo consultar el saldo. Reintenta.",
            },
          });
      });
    return () => {
      vigente = false;
    };
  }, [material, bodega, unitMeasureId, intento]);
  function cerrar() {
    if (ocupado) return;
    if (sucio || incierto) setDescarte(true);
    else onCerrar();
  }
  async function revisar() {
    if (!saldo || !uuid) return;
    const datos = {
      rawMaterialId: Number(material),
      warehouseId: Number(bodega),
      unitMeasureId,
      reason: motivo,
      finalQuantity: cantidad,
      date: fecha,
      note: nota,
      correctedAdjustmentId: corregido?.id ?? null,
      idempotencyKey: uuid,
      reference: saldo.referencia,
    };
    setOcupado(true);
    setError(undefined);
    try {
      const r = await prepararConfirmacionAjuste(datos);
      if (r.ok) setConfirmacion({ datos, diferencia: r.diferencia });
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
      const r = await guardarDatosAjuste(confirmacion.datos);
      if (r.ok) {
        notificar.exito(r.mensaje);
        onExito();
      } else {
        setError(r.mensaje);
        setConfirmacion(undefined);
        setIncierto(false);
      }
    } catch {
      setIncierto(true);
      setError(
        "No se pudo confirmar el resultado. Reintenta con los mismos datos antes de iniciar otra operación.",
      );
    } finally {
      setOcupado(false);
    }
  }
  const titulo = inicial
    ? "Registrar inventario inicial"
    : corregido
      ? `Corregir ajuste #${corregido.id}`
      : "Registrar ajuste de stock";
  const bloqueado = ocupado || incierto;
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
          className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"
          onEscapeKeyDown={(e) => {
            if (ocupado) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (ocupado) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription>
              Registra la cantidad física real. El documento y sus movimientos
              se conservan en el historial.
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
            {error && <Aviso titulo={error} />}
            {resultado && !resultado.ok && <Aviso titulo={resultado.mensaje} />}
            {ayuda(
              "ajuste-material",
              "Materia prima",
              "Las cantidades se expresan en la unidad del material, sin conversiones ni presentaciones de compra.",
            )}
            <SelectorBuscable
              placeholder="Seleccionar opción"
              id="ajuste-material"
              nombre="materia prima del ajuste"
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
              "ajuste-bodega",
              "Bodega",
              "El conteo y su diferencia se aplican sólo a esta bodega.",
            )}
            <SelectorBuscable
              placeholder="Seleccionar opción"
              id="ajuste-bodega"
              nombre="bodega del ajuste"
              valor={bodega}
              onChange={(v) => {
                setBodega(v);
                setSucio(true);
              }}
              disabled={bloqueado || Boolean(corregido)}
              opciones={catalogos.bodegas.map((b) => ({
                valor: String(b.id),
                etiqueta: b.name,
              }))}
            />
            {material && bodega && !resultado && (
              <p role="status">Consultando saldo…</p>
            )}
            {saldo && (
              <div className="rounded-md border p-3 text-sm tabular-nums">
                <p>
                  Saldo registrado:{" "}
                  {formatearCantidad(saldo.referencia.quantity)}{" "}
                  {materia?.unidad.abbreviation}
                </p>
                <p>Unidad: {materia?.unidad.name}</p>
                {inicial && !saldo.puedeInicial && (
                  <Aviso titulo="Esta combinación no admite carga inicial: tiene historial o saldo previo." />
                )}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={bloqueado || !material || !bodega}
              onClick={() => {
                setIntento((i) => i + 1);
                setConfirmacion(undefined);
              }}
            >
              Volver a consultar saldo
            </Button>
            {ayuda(
              "ajuste-cantidad",
              "Cantidad física final",
              "Indica cuánto material existe realmente, no cuánto sumar o restar. Máximo tres decimales. Si no hay diferencia, no se genera ajuste.",
            )}
            <Input
              id="ajuste-cantidad"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              inputMode="decimal"
              disabled={bloqueado}
              required
            />
            {ayuda(
              "ajuste-motivo",
              "Motivo",
              "Selecciona el motivo del conteo. Para corregir un ajuste usa su acción Corregir, que conserva el vínculo histórico.",
            )}
            <SelectorBuscable
              placeholder="Seleccionar opción"
              id="ajuste-motivo"
              nombre="motivo del ajuste"
              valor={motivo}
              onChange={(v) => {
                setMotivo(v);
                setSucio(true);
              }}
              disabled={bloqueado || inicial || Boolean(corregido)}
              opciones={Object.entries(motivosAjuste)
                .filter(([v]) =>
                  inicial
                    ? v === "INVENTARIO_INICIAL"
                    : corregido
                      ? v === "CORRECCION_REGISTRO"
                      : !["INVENTARIO_INICIAL", "CORRECCION_REGISTRO"].includes(
                          v,
                        ),
                )
                .map(([valor, etiqueta]) => ({ valor, etiqueta }))}
            />
            {ayuda(
              "ajuste-fecha",
              "Fecha del conteo",
              "Fecha actual o pasada; no admite fechas futuras. La fecha de registro se conserva automáticamente.",
            )}
            <Input
              id="ajuste-fecha"
              type="date"
              max={hoy}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              disabled={bloqueado}
              required
            />
            {ayuda(
              "ajuste-nota",
              "Observación",
              "Explica el motivo específico de este ajuste. Obligatoria, hasta 2000 caracteres.",
            )}
            <textarea
              id="ajuste-nota"
              className="min-h-24 w-full rounded-md border border-input bg-transparent p-3 text-sm focus-visible:outline-ring"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              maxLength={2000}
              required
              disabled={bloqueado}
            />
            {corregido && (
              <p className="text-sm">
                Vinculado al ajuste #{corregido.id}. Se usa el saldo actual; no
                se revierte automáticamente su diferencia histórica.
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
                type="submit"
                disabled={
                  bloqueado ||
                  !saldo ||
                  !uuid ||
                  (inicial && !saldo.puedeInicial)
                }
              >
                Revisar ajuste
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
          titulo="Confirmar ajuste de inventario"
          descripcion={`Saldo anterior: ${formatearCantidad(saldo?.referencia.quantity ?? "0")}. Saldo final: ${formatearCantidad(cantidad.replace(",", "."))}. Diferencia: ${formatearCantidad(confirmacion.diferencia)} ${materia?.unidad.abbreviation}. Un ajuste negativo bloqueará la anulación de compras recibidas antes en esta combinación. ${incierto ? "Resultado pendiente de confirmar: reintenta la misma operación." : "Verifica los datos; el historial no se podrá editar ni eliminar."}`}
          accion={incierto ? "Reintentar confirmación" : "Registrar ajuste"}
          pendiente={ocupado}
          onConfirmar={() => void guardar()}
        />
      )}
      <ConfirmarDescarte
        abierto={descarte}
        onAbiertoChange={setDescarte}
        onConfirmar={onCerrar}
      />
    </>
  );
}
