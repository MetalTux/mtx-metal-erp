"use client";
import { useEffect, useState } from "react";
import {
  obtenerConfiguracionMinimo,
  guardarDatosMinimo,
} from "@/app/(app)/inventario/stock/actions";
import type {
  CatalogosInventario,
  StockInventario,
} from "@/lib/tipos/inventario";
import { minimoInventarioSchema } from "@/lib/validaciones/inventario";
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

type ConsultaMinimo = Awaited<ReturnType<typeof obtenerConfiguracionMinimo>>;
/** Consulta fresca y sin escrituras al abrir; descartar respuestas de una combinación anterior. */
export function ConfigurarMinimo({
  fila,
  catalogos,
  onCerrar,
  onExito,
}: {
  fila?: StockInventario;
  catalogos: CatalogosInventario;
  onCerrar: () => void;
  onExito: () => void;
}) {
  const [material, setMaterial] = useState(
      fila ? String(fila.material.id) : "",
    ),
    [bodega, setBodega] = useState(fila ? String(fila.bodega.id) : "");
  const [minimo, setMinimo] = useState("");
  const [sucio, setSucio] = useState(false),
    [ocupado, setOcupado] = useState(false),
    [descarte, setDescarte] = useState(false),
    [confirmar, setConfirmar] = useState(false),
    [intento, setIntento] = useState(0);
  const [error, setError] = useState<string>();
  const [consulta, setConsulta] = useState<{
    clave: string;
    resultado: ConsultaMinimo;
  }>();
  const materia = catalogos.materiales.find((m) => String(m.id) === material);
  const unitMeasureId = materia?.unitMeasureId ?? 0;
  const clave = JSON.stringify([material, bodega, unitMeasureId, intento]);
  const resultado = consulta?.clave === clave ? consulta.resultado : undefined;
  const configuracion = resultado?.ok ? resultado.configuracion : undefined;
  useEffect(() => {
    if (!material || !bodega || !unitMeasureId) return;
    let vigente = true;
    void obtenerConfiguracionMinimo({
      rawMaterialId: Number(material),
      warehouseId: Number(bodega),
      unitMeasureId,
    })
      .then((r) => {
        if (vigente) {
          setConsulta({
            clave: JSON.stringify([material, bodega, unitMeasureId, intento]),
            resultado: r,
          });
          if (r.ok) {
            setMinimo(r.configuracion.minimo ?? "");
            setSucio(false);
            setError(undefined);
          }
        }
      })
      .catch(() => {
        if (vigente)
          setConsulta({
            clave: JSON.stringify([material, bodega, unitMeasureId, intento]),
            resultado: {
              ok: false,
              mensaje:
                "No se pudo consultar la configuración. Reintenta la consulta.",
            },
          });
      });
    return () => {
      vigente = false;
    };
  }, [material, bodega, unitMeasureId, intento]);
  function cerrar() {
    if (ocupado) return;
    if (sucio) setDescarte(true);
    else onCerrar();
  }
  async function guardar() {
    if (!configuracion) return;
    const datos = {
      rawMaterialId: Number(material),
      warehouseId: Number(bodega),
      unitMeasureId,
      minStock: minimo,
    };
    if (!minimoInventarioSchema.safeParse(datos).success) {
      setError(
        "Indica un mínimo no negativo con hasta tres decimales; vacío significa sin configurar.",
      );
      return;
    }
    if (minimo.trim() === "" && configuracion.minimo !== null && !confirmar) {
      setConfirmar(true);
      return;
    }
    setOcupado(true);
    setError(undefined);
    try {
      const r = await guardarDatosMinimo(datos, configuracion.referencia);
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
        "No se pudo confirmar el guardado. Conservamos los datos para reintentar.",
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
              {fila
                ? "Configurar mínimo"
                : "Configurar mínimo por material y bodega"}
            </DialogTitle>
            <DialogDescription>
              Define cuándo reponer esta combinación. El mínimo no cambia las
              existencias ni genera movimientos.
            </DialogDescription>
          </DialogHeader>
          <form
            className="min-w-0 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void guardar();
            }}
          >
            {error && <Aviso titulo={error} />}
            {resultado && !resultado.ok && (
              <>
                <Aviso titulo={resultado.mensaje} />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIntento((i) => i + 1)}
                >
                  Reintentar consulta
                </Button>
              </>
            )}
            <div>
              <div className="flex items-center gap-1">
                <Label htmlFor="minimo-material">Materia prima</Label>
                <AyudaCampo
                  nombre="Materia prima del mínimo"
                  texto="El mínimo se expresa en la unidad definida para el material; se configura por separado para cada bodega."
                />
              </div>
              <SelectorBuscable
                id="minimo-material"
                nombre="materia prima del mínimo"
                valor={material}
                onChange={setMaterial}
                disabled={ocupado || Boolean(fila)}
                opciones={catalogos.materiales.map((m) => ({
                  valor: String(m.id),
                  etiqueta: `${m.code} · ${m.name}`,
                  busqueda: m.unidad.name,
                }))}
                placeholder="Seleccionar material"
              />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <Label htmlFor="minimo-bodega">Bodega</Label>
                <AyudaCampo
                  nombre="Bodega del mínimo"
                  texto="Existencias en otra bodega no eliminan la necesidad de reponer aquí. Seleccionar no crea registros; guardar un mínimo crea la combinación si todavía no existe, con saldo cero."
                />
              </div>
              <SelectorBuscable
                id="minimo-bodega"
                nombre="bodega del mínimo"
                valor={bodega}
                onChange={setBodega}
                disabled={ocupado || Boolean(fila)}
                opciones={catalogos.bodegas.map((b) => ({
                  valor: String(b.id),
                  etiqueta: b.name,
                }))}
                placeholder="Seleccionar bodega"
              />
            </div>
            {configuracion && (
              <div className="rounded-md border border-border p-3 text-sm">
                <p>
                  Unidad: {materia?.unidad.name} ({materia?.unidad.abbreviation}
                  )
                </p>
                <p className="tabular-nums">
                  Existencias: {formatearCantidad(configuracion.cantidad)}{" "}
                  {materia?.unidad.abbreviation}
                </p>
                <p>
                  Mínimo actual:{" "}
                  {configuracion.minimo === null
                    ? "Sin configurar"
                    : `${formatearCantidad(configuracion.minimo)} ${materia?.unidad.abbreviation}`}
                </p>
                {!configuracion.referencia && (
                  <p className="mt-2 text-muted-foreground">
                    Esta combinación aún no existe. Al guardar un mínimo se
                    registrará con saldo cero, sin movimiento.
                  </p>
                )}
              </div>
            )}
            {material && bodega && !resultado && (
              <p role="status" className="text-sm text-muted-foreground">
                Consultando configuración…
              </p>
            )}
            <div>
              <div className="flex items-center gap-1">
                <Label htmlFor="minimo-valor">Mínimo de reposición</Label>
                <AyudaCampo
                  nombre="Mínimo de reposición"
                  texto="Reposición cuando el saldo sea menor al mínimo; igualdad no alerta. Vacío significa sin configurar. Cero es un mínimo válido. Admite hasta tres decimales. Quitar el mínimo conserva la fila y el historial."
                />
              </div>
              <Input
                id="minimo-valor"
                value={configuracion ? minimo : ""}
                inputMode="decimal"
                placeholder="Sin configurar"
                disabled={ocupado || !configuracion}
                onChange={(e) => {
                  setMinimo(e.target.value);
                  setSucio(true);
                }}
              />
            </div>
            {configuracion?.minimo !== null && configuracion && (
              <Button
                type="button"
                variant="outline"
                disabled={ocupado}
                onClick={() => {
                  setMinimo("");
                  setSucio(true);
                }}
              >
                Quitar configuración
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              No se eliminan combinaciones al quitar el mínimo. Una combinación
              de stock, incluso con saldo cero, impide cambiar la unidad del
              material.
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={ocupado}
                onClick={cerrar}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={ocupado || !configuracion}>
                {ocupado ? "Guardando…" : "Guardar mínimo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmarAccion
        abierto={confirmar}
        onAbiertoChange={setConfirmar}
        titulo="Quitar mínimo de reposición"
        descripcion="La combinación quedará sin mínimo configurado y dejará de activar reposición por ese criterio. Existencias, fila de stock e historial se conservan."
        accion="Quitar mínimo"
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
