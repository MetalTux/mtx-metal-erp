"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CatalogosInventario } from "@/lib/tipos/inventario";
import type {
  consultarTraslados,
  FilaTraslado,
} from "@/lib/consultas/traslados-inventario";
import { FormularioTraslado } from "@/components/inventario/formulario-traslado";
import {
  TablaConsulta,
  type ColumnaConsulta,
} from "@/components/data-table/tabla-consulta";
import { SelectorBuscable } from "@/components/formularios/selector-buscable";
import { Aviso } from "@/components/alertas/aviso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatearCantidad } from "@/lib/formato";
export function TrasladosInventario({
  consulta,
  catalogos,
}: {
  consulta: Awaited<ReturnType<typeof consultarTraslados>>;
  catalogos: CatalogosInventario;
}) {
  const router = useRouter(),
    params = useSearchParams();
  const [pendiente, startTransition] = useTransition();
  const [texto, setTexto] = useState(params.get("texto") ?? ""),
    [material, setMaterial] = useState(params.get("rawMaterialId") ?? "");
  const [origen, setOrigen] = useState(params.get("sourceWarehouseId") ?? ""),
    [destino, setDestino] = useState(
      params.get("destinationWarehouseId") ?? "",
    );
  const [desde, setDesde] = useState(params.get("desde") ?? ""),
    [hasta, setHasta] = useState(params.get("hasta") ?? "");
  const [formulario, setFormulario] = useState<{
      uuid: string;
      corregido?: FilaTraslado;
    }>(),
    [vista, setVista] = useState<FilaTraslado>();
  const ultimoBoton = useRef<HTMLButtonElement | null>(null),
    actualizar = useRef<HTMLButtonElement | null>(null);
  function navegar(cambios: Record<string, string>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(cambios)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    startTransition(() => router.push(`/inventario/traslados?${p}`));
  }
  function foco() {
    requestAnimationFrame(() => {
      (ultimoBoton.current?.isConnected
        ? ultimoBoton.current
        : actualizar.current
      )?.focus();
    });
  }
  function cerrar() {
    setFormulario(undefined);
    foco();
  }
  function abrir(
    e: React.MouseEvent<HTMLButtonElement>,
    corregido?: FilaTraslado,
  ) {
    ultimoBoton.current = e.currentTarget;
    setFormulario({ uuid: crypto.randomUUID(), corregido });
  }
  const columnas: ColumnaConsulta<FilaTraslado>[] = [
    { id: "id", titulo: "Traslado", orden: "id", contenido: (t) => `#${t.id}` },
    {
      id: "fecha",
      titulo: "Fecha",
      orden: "date",
      contenido: (t) => t.fecha.split("-").reverse().join("-"),
    },
    { id: "material", titulo: "Materia prima", contenido: (t) => t.material },
    { id: "origen", titulo: "Origen", contenido: (t) => t.origen },
    { id: "destino", titulo: "Destino", contenido: (t) => t.destino },
    {
      id: "cantidad",
      titulo: "Cantidad",
      contenido: (t) => `${formatearCantidad(t.cantidad)} ${t.unidad}`,
    },
    {
      id: "vinculo",
      titulo: "Corrección",
      contenido: (t) =>
        t.correccionId
          ? `Corregido por #${t.correccionId}`
          : t.corregidoId
            ? `Devuelve #${t.corregidoId}`
            : "Sin corrección",
    },
    {
      id: "acciones",
      titulo: "Acciones",
      contenido: (t) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={pendiente}
            onClick={(e) => {
              ultimoBoton.current = e.currentTarget;
              setVista(t);
            }}
          >
            Ver
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pendiente || t.correccionId !== null}
            onClick={(e) => abrir(e, t)}
          >
            Corregir
          </Button>
        </div>
      ),
    },
  ];
  const hoy = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const bodegas = [
    { valor: "", etiqueta: "Todas las bodegas" },
    ...catalogos.bodegas.map((b) => ({
      valor: String(b.id),
      etiqueta: b.name,
    })),
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Traslados entre bodegas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Un material por documento, con salida e ingreso inmediato y
            trazabilidad.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            ref={actualizar}
            variant="outline"
            disabled={pendiente}
            onClick={() => startTransition(() => router.refresh())}
          >
            Actualizar
          </Button>
          <Button disabled={pendiente} onClick={(e) => abrir(e)}>
            Registrar traslado
          </Button>
        </div>
      </div>
      <form
        className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          navegar({
            texto,
            rawMaterialId: material,
            sourceWarehouseId: origen,
            destinationWarehouseId: destino,
            desde,
            hasta,
            pagina: "1",
          });
        }}
      >
        <div>
          <Label htmlFor="traslados-buscar">Buscar</Label>
          <Input
            id="traslados-buscar"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={150}
            placeholder="Material, bodega u observación"
          />
        </div>
        <div>
          <Label htmlFor="traslados-material">Materia prima</Label>
          <SelectorBuscable
            id="traslados-material"
            nombre="filtro de materia prima"
            placeholder="Todos los materiales"
            valor={material}
            onChange={setMaterial}
            opciones={[
              { valor: "", etiqueta: "Todos los materiales" },
              ...catalogos.materiales.map((m) => ({
                valor: String(m.id),
                etiqueta: `${m.code} · ${m.name}`,
              })),
            ]}
          />
        </div>
        <div>
          <Label htmlFor="traslados-origen">Bodega de origen</Label>
          <SelectorBuscable
            id="traslados-origen"
            nombre="filtro de bodega de origen"
            placeholder="Todas las bodegas"
            valor={origen}
            onChange={setOrigen}
            opciones={bodegas}
          />
        </div>
        <div>
          <Label htmlFor="traslados-destino">Bodega de destino</Label>
          <SelectorBuscable
            id="traslados-destino"
            nombre="filtro de bodega de destino"
            placeholder="Todas las bodegas"
            valor={destino}
            onChange={setDestino}
            opciones={bodegas}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="traslados-desde">Desde</Label>
            <Input
              id="traslados-desde"
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="traslados-hasta">Hasta</Label>
            <Input
              id="traslados-hasta"
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" disabled={pendiente}>
            Filtrar
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pendiente}
            onClick={() => {
              setTexto("");
              setMaterial("");
              setOrigen("");
              setDestino("");
              setDesde("");
              setHasta("");
              startTransition(() => router.push("/inventario/traslados"));
            }}
          >
            Limpiar
          </Button>
        </div>
      </form>
      {!consulta.ok ? (
        <Aviso titulo={consulta.mensaje} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <TablaConsulta
            nombre="Traslados de inventario"
            pagina={consulta.pagina}
            columnas={columnas}
            orden={params.get("orden") ?? "id"}
            sentido={params.get("sentido") === "asc" ? "asc" : "desc"}
            pendiente={pendiente}
            onOrden={(orden) =>
              navegar({
                orden,
                sentido:
                  params.get("orden") === orden &&
                  params.get("sentido") !== "asc"
                    ? "asc"
                    : "desc",
                pagina: "1",
              })
            }
            onPagina={(pagina) => navegar({ pagina: String(pagina) })}
            onTamano={(tamano) => navegar({ tamano, pagina: "1" })}
            vacio="No hay traslados para estos filtros."
          />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Cada traslado conserva sus dos movimientos. Las correcciones registran
        una devolución completa; no eliminan el historial ni el bloqueo
        histórico de anulación de Compras.
      </p>
      {formulario && (
        <FormularioTraslado
          {...formulario}
          catalogos={catalogos}
          hoy={hoy}
          onCerrar={cerrar}
          onDevolverFoco={foco}
          onExito={() => {
            cerrar();
            startTransition(() => router.refresh());
          }}
        />
      )}
      {vista && (
        <Dialog
          open
          onOpenChange={(v) => {
            if (!v) {
              setVista(undefined);
              foco();
            }
          }}
        >
          <DialogContent
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              foco();
            }}
            className="max-h-[90dvh] overflow-y-auto"
          >
            <DialogHeader>
              <DialogTitle>Ver traslado #{vista.id}</DialogTitle>
              <DialogDescription>
                Documento histórico de sólo lectura. Motivo: Traslado entre
                bodegas.
              </DialogDescription>
            </DialogHeader>
            <dl className="min-w-0 space-y-3 break-words text-sm">
              {Object.entries({
                "Materia prima": vista.material,
                Fecha: vista.fecha.split("-").reverse().join("-"),
                Registrado: new Intl.DateTimeFormat("es-CL", {
                  timeZone: "America/Santiago",
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(vista.registrado)),
                "Bodega de origen": vista.origen,
                "Saldo origen anterior/final": `${formatearCantidad(vista.anteriorOrigen)} → ${formatearCantidad(vista.finalOrigen)} ${vista.unidad}`,
                "Bodega de destino": vista.destino,
                "Saldo destino anterior/final": `${formatearCantidad(vista.anteriorDestino)} → ${formatearCantidad(vista.finalDestino)} ${vista.unidad}`,
                Cantidad: `${formatearCantidad(vista.cantidad)} ${vista.unidad}`,
                Observación: vista.observacion,
                "Movimiento de salida": `#${vista.salidaId}`,
                "Movimiento de entrada": `#${vista.entradaId}`,
                "Devuelve traslado": vista.corregidoId
                  ? `#${vista.corregidoId}`
                  : "No corresponde",
                "Corregido por": vista.correccionId
                  ? `#${vista.correccionId}`
                  : "Sin corrección",
              }).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="whitespace-pre-wrap tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <Button
              variant="outline"
              onClick={() => {
                setVista(undefined);
                foco();
              }}
            >
              Cerrar
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
