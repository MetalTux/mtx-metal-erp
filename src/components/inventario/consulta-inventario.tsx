"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ConfigurarMinimo } from "@/components/inventario/configurar-minimo";
import {
  ArrowLeftRight,
  Eye,
  LoaderCircle,
  PackageSearch,
  Settings2,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { EmptyState } from "@/components/empty-state";
import { Aviso } from "@/components/alertas/aviso";
import {
  TablaConsulta,
  type ColumnaConsulta,
} from "@/components/data-table/tabla-consulta";
import { SelectorBuscable } from "@/components/formularios/selector-buscable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatearCantidad, formatearFecha } from "@/lib/formato";
import type {
  FiltrosMovimientos,
  FiltrosStock,
} from "@/lib/validaciones/inventario";
import type {
  CatalogosInventario,
  MovimientoInventario,
  ResultadoConsulta,
  StockInventario,
} from "@/lib/tipos/inventario";

const nombresTipo = { ENTRADA: "Entrada", SALIDA: "Salida", AJUSTE: "Ajuste" };
const clasesTipo = {
  ENTRADA: "border-success/50 text-success",
  SALIDA: "border-destructive/50 text-destructive",
  AJUSTE: "border-warning/50 text-warning",
};
function TipoMovimiento({ tipo }: { tipo: MovimientoInventario["tipo"] }) {
  return (
    <span
      className={`inline-flex rounded border px-2 py-0.5 text-xs ${clasesTipo[tipo]}`}
    >
      {nombresTipo[tipo]}
    </span>
  );
}
const rutaMovimientos = (fila: StockInventario) =>
  `/inventario/movimientos?bodega=${fila.bodega.id}&material=${fila.material.id}`;
function origen(fila: MovimientoInventario) {
  const referencias = [
    fila.trasladoId && `Traslado entre bodegas #${fila.trasladoId}`,
    fila.ajusteId &&
      `${fila.ajusteMotivo === "INVENTARIO_INICIAL" ? "Inventario inicial" : fila.ajusteMotivo === "CORRECCION_REGISTRO" ? "Corrección de inventario" : "Ajuste de inventario"} #${fila.ajusteId}`,
    fila.compra &&
      `Compra #${fila.compra.id} · Línea #${fila.compra.detalleId}`,
    fila.trabajo &&
      `Trabajo #${fila.trabajo.id} · Línea #${fila.trabajo.detalleId}`,
  ].filter(Boolean);
  return referencias.join(" / ") || "Sin documento asociado";
}

function FiltrosConsulta({
  filtros,
  borrador,
  catalogos,
  movimientos,
  pendiente,
  onAplicar,
  onLimpiar,
}: {
  filtros: FiltrosStock | FiltrosMovimientos;
  catalogos: CatalogosInventario;
  movimientos: boolean;
  pendiente: boolean;
  borrador: Record<string, string>;
  onAplicar: (valores: Record<string, string>) => void;
  onLimpiar: () => void;
}) {
  const [q, setQ] = useState(borrador.q ?? filtros.q);
  const [bodega, setBodega] = useState(
    borrador.bodega ?? (filtros.bodega ? String(filtros.bodega) : ""),
  );
  const [material, setMaterial] = useState(
    borrador.material ?? (filtros.material ? String(filtros.material) : ""),
  );
  const [reposicion, setReposicion] = useState(
    borrador.reposicion ??
      ("reposicion" in filtros ? filtros.reposicion : "todos"),
  );
  const [tipo, setTipo] = useState(
    borrador.tipo ?? ("tipo" in filtros ? (filtros.tipo ?? "") : ""),
  );
  const [desde, setDesde] = useState(
    borrador.desde ?? ("desde" in filtros ? (filtros.desde ?? "") : ""),
  );
  const [hasta, setHasta] = useState(
    borrador.hasta ?? ("hasta" in filtros ? (filtros.hasta ?? "") : ""),
  );
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onAplicar({
          q,
          bodega,
          material,
          ...(movimientos ? { tipo, desde, hasta } : { reposicion }),
        });
      }}
      className="space-y-4 border-b border-border p-4"
    >
      <fieldset
        disabled={pendiente}
        className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div className="min-w-0 space-y-2">
          <Label htmlFor="inventario-busqueda">Buscar</Label>
          <Input
            id="inventario-busqueda"
            aria-label={movimientos ? "Buscar movimientos" : "Buscar stock"}
            value={q}
            onChange={(event) => setQ(event.target.value)}
            maxLength={150}
            placeholder={
              movimientos
                ? "Código, material o motivo…"
                : "Código o nombre del material…"
            }
            className="h-9"
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="inventario-bodega">Bodega</Label>
          <SelectorBuscable
            id="inventario-bodega"
            nombre="bodega"
            valor={bodega}
            onChange={setBodega}
            placeholder={
              bodega ? `Bodega no disponible (#${bodega})` : "Todas las bodegas"
            }
            disabled={pendiente}
            opciones={[
              { valor: "", etiqueta: "Todas las bodegas" },
              ...catalogos.bodegas.map((item) => ({
                valor: String(item.id),
                etiqueta: item.name,
                busqueda: item.location ?? "",
              })),
            ]}
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="inventario-material">Material</Label>
          <SelectorBuscable
            id="inventario-material"
            nombre="material"
            valor={material}
            onChange={setMaterial}
            placeholder={
              material
                ? `Material no disponible (#${material})`
                : "Todos los materiales"
            }
            disabled={pendiente}
            opciones={[
              { valor: "", etiqueta: "Todos los materiales" },
              ...catalogos.materiales.map((item) => ({
                valor: String(item.id),
                etiqueta: `${item.code} · ${item.name}`,
                busqueda: `${item.unidad.name} ${item.unidad.abbreviation}`,
              })),
            ]}
          />
        </div>
        {!movimientos && (
          <div className="space-y-2">
            <Label htmlFor="inventario-reposicion">Mostrar existencias</Label>
            <select
              id="inventario-reposicion"
              value={reposicion}
              onChange={(e) => setReposicion(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm focus-visible:outline-ring"
            >
              <option value="todos">Todas las combinaciones</option>
              <option value="reposicion">Requieren reposición</option>
            </select>
          </div>
        )}
        {movimientos && (
          <>
            <div className="space-y-2">
              <Label htmlFor="inventario-tipo">Tipo de movimiento</Label>
              <select
                id="inventario-tipo"
                value={tipo}
                onChange={(event) => setTipo(event.target.value as typeof tipo)}
                className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm focus-visible:outline-ring"
              >
                <option value="">Todos los tipos</option>
                {Object.entries(nombresTipo).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inventario-desde">Desde</Label>
              <Input
                id="inventario-desde"
                type="date"
                value={desde}
                onChange={(event) => setDesde(event.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inventario-hasta">Hasta</Label>
              <Input
                id="inventario-hasta"
                type="date"
                value={hasta}
                onChange={(event) => setHasta(event.target.value)}
                className="h-9"
              />
            </div>
          </>
        )}
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pendiente}>
          <Search aria-hidden="true" />
          Aplicar filtros
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pendiente}
          onClick={onLimpiar}
        >
          <X aria-hidden="true" />
          Limpiar filtros
        </Button>
      </div>
      {movimientos && (
        <p className="text-xs text-muted-foreground">
          Desde y Hasta incluyen el día completo en la zona horaria de Santiago.
        </p>
      )}
    </form>
  );
}

export function ConsultaInventario({
  modo,
  consulta,
  filtros,
  borrador,
  catalogos,
}: {
  modo: "stock" | "movimientos";
  consulta:
    | ResultadoConsulta<StockInventario>
    | ResultadoConsulta<MovimientoInventario>;
  filtros: FiltrosStock | FiltrosMovimientos;
  catalogos: CatalogosInventario;
  borrador: Record<string, string>;
}) {
  const movimientos = modo === "movimientos";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendiente, iniciar] = useTransition();
  const [detalle, setDetalle] = useState<
    StockInventario | MovimientoInventario
  >();
  const [configurar, setConfigurar] = useState<{ fila?: StockInventario }>();
  const restaurarFoco = useRef(false);
  const retornoFoco = useRef<HTMLElement | null>(null);
  const botonActualizar = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!pendiente && !configurar && restaurarFoco.current) {
      restaurarFoco.current = false;
      requestAnimationFrame(() =>
        (retornoFoco.current?.isConnected
          ? retornoFoco.current
          : botonActualizar.current
        )?.focus(),
      );
    }
  }, [pendiente, configurar]);
  function configurarMinimo(fila?: StockInventario) {
    retornoFoco.current = document.activeElement as HTMLElement;
    setConfigurar({ fila });
  }
  function cerrarConfiguracion() {
    setConfigurar(undefined);
    restaurarFoco.current = true;
  }
  const pagina = consulta.ok
    ? consulta.pagina
    : { datos: [], total: 0, pagina: 1, tamano: filtros.tamano };
  function navegar(cambios: Record<string, string>, limpiar = false) {
    const parametros = limpiar
      ? new URLSearchParams()
      : new URLSearchParams(searchParams);
    for (const [nombre, valor] of Object.entries(cambios)) {
      if (valor) parametros.set(nombre, valor);
      else parametros.delete(nombre);
    }
    const query = parametros.toString();
    iniciar(() =>
      router.replace(`${pathname}${query ? `?${query}` : ""}`, {
        scroll: false,
      }),
    );
  }
  function ver(fila: StockInventario | MovimientoInventario) {
    retornoFoco.current = document.activeElement as HTMLElement;
    setDetalle(fila);
  }
  const cantidad = (fila: StockInventario | MovimientoInventario) =>
    `${formatearCantidad(fila.cantidad)} ${fila.material.unidad.abbreviation}`;
  const columnas: ColumnaConsulta<StockInventario | MovimientoInventario>[] = [
    ...(movimientos
      ? [
          {
            id: "fecha",
            titulo: "Fecha",
            orden: "fecha",
            contenido: (fila: StockInventario | MovimientoInventario) =>
              "fecha" in fila ? (
                <span className="whitespace-nowrap">
                  {formatearFecha(fila.fecha)}
                </span>
              ) : null,
          },
          {
            id: "tipo",
            titulo: "Tipo",
            orden: "tipo",
            contenido: (fila: StockInventario | MovimientoInventario) =>
              "tipo" in fila ? <TipoMovimiento tipo={fila.tipo} /> : null,
          },
        ]
      : []),
    {
      id: "material",
      titulo: "Material",
      orden: "material",
      contenido: (fila) => (
        <div>
          <p className="font-medium">{fila.material.name}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {fila.material.code}
          </p>
        </div>
      ),
    },
    {
      id: "bodega",
      titulo: "Bodega",
      orden: "bodega",
      contenido: (fila) => fila.bodega.name,
    },
    {
      id: "cantidad",
      titulo: movimientos ? "Cantidad (+/−)" : "Existencias",
      orden: "cantidad",
      contenido: (fila) => (
        <span className="whitespace-nowrap">{cantidad(fila)}</span>
      ),
    },
    ...(movimientos
      ? [
          {
            id: "origen",
            titulo: "Origen",
            contenido: (fila: StockInventario | MovimientoInventario) =>
              "tipo" in fila ? origen(fila) : null,
          },
        ]
      : [
          {
            id: "minimo",
            titulo: "Mínimo",
            orden: "minimo",
            contenido: (fila: StockInventario | MovimientoInventario) =>
              "minimo" in fila ? (
                fila.minimo === null ? (
                  <span className="text-muted-foreground">Sin configurar</span>
                ) : (
                  `${formatearCantidad(fila.minimo)} ${fila.material.unidad.abbreviation}`
                )
              ) : null,
          },
        ]),
    ...(!movimientos
      ? [
          {
            id: "estado",
            titulo: "Situación",
            contenido: (fila: StockInventario | MovimientoInventario) =>
              "minimo" in fila ? (
                <div className="space-y-1">
                  <span
                    className={`inline-flex rounded border px-2 py-0.5 text-xs ${fila.estado === "Saldo negativo: revisar" ? "border-destructive/50 text-destructive" : fila.requiereReposicion ? "border-warning/50 text-warning" : "border-border text-muted-foreground"}`}
                  >
                    {fila.estado}
                  </span>
                  {fila.requiereReposicion && (
                    <p className="text-xs text-warning">Requiere reposición</p>
                  )}
                </div>
              ) : null,
          },
        ]
      : []),
    {
      id: "acciones",
      titulo: "Acciones",
      contenido: (fila) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={pendiente}
            aria-label={`Ver ${movimientos ? "movimiento" : "stock"} ${fila.id}`}
            onClick={() => ver(fila)}
          >
            <Eye aria-hidden="true" />
            Ver
          </Button>
          {!movimientos && "minimo" in fila && (
            <Button
              variant="ghost"
              size="sm"
              disabled={pendiente}
              aria-label={`Configurar mínimo ${fila.id}`}
              onClick={() => configurarMinimo(fila)}
            >
              <Settings2 aria-hidden="true" />
              Mínimo
            </Button>
          )}
          {!movimientos && "minimo" in fila && (
            <Button variant="ghost" size="sm" disabled={pendiente} asChild>
              <Link
                href={rutaMovimientos(fila)}
                aria-disabled={pendiente}
                onClick={(event) => {
                  if (pendiente) event.preventDefault();
                }}
                aria-label={`Ver movimientos de ${fila.material.name} en ${fila.bodega.name}`}
              >
                <ArrowLeftRight aria-hidden="true" />
                Movimientos
              </Link>
            </Button>
          )}
        </div>
      ),
    },
  ];
  const titulo = movimientos ? "Movimientos" : "Stock por bodega";
  return (
    <div className="space-y-6">
      <PageHeader
        titulo={titulo}
        descripcion={
          movimientos
            ? "Consulta entradas, salidas y ajustes de materiales en el kardex."
            : "Consulta existencias, configura mínimos y detecta reposición por material y bodega."
        }
        acciones={
          <>
            <Button
              ref={botonActualizar}
              variant="outline"
              disabled={pendiente}
              onClick={() => iniciar(() => router.refresh())}
            >
              <RefreshCw aria-hidden="true" />
              Actualizar
            </Button>
            {!movimientos && (
              <Button disabled={pendiente} onClick={() => configurarMinimo()}>
                <Plus aria-hidden="true" />
                Configurar mínimo
              </Button>
            )}
          </>
        }
      />
      {!consulta.ok && (
        <Aviso titulo="No se pudo completar la consulta">
          {consulta.mensaje}
        </Aviso>
      )}
      <SectionCard
        titulo={
          movimientos ? "Kardex de materiales" : "Existencias registradas"
        }
        descripcion={
          movimientos
            ? "Las cantidades tienen signo: positivo ingresa y negativo descuenta."
            : "Cada saldo se expresa en la unidad de su material."
        }
        contentClassName="p-0"
      >
        <FiltrosConsulta
          key={JSON.stringify([filtros, borrador])}
          filtros={filtros}
          borrador={borrador}
          catalogos={catalogos}
          movimientos={movimientos}
          pendiente={pendiente}
          onAplicar={(valores) => navegar({ ...valores, pagina: "1" })}
          onLimpiar={() => navegar({}, true)}
        />
        <TablaConsulta
          nombre={movimientos ? "movimientos" : "stock por bodega"}
          pagina={pagina}
          columnas={columnas}
          orden={filtros.orden}
          sentido={filtros.sentido}
          pendiente={pendiente}
          onOrden={(orden) =>
            navegar({
              orden,
              sentido:
                orden === filtros.orden && filtros.sentido === "asc"
                  ? "desc"
                  : "asc",
              pagina: "1",
            })
          }
          onPagina={(numero) => navegar({ pagina: String(numero) })}
          onTamano={(tamano) => navegar({ tamano, pagina: "1" })}
          vacio={
            <EmptyState
              icono={movimientos ? ArrowLeftRight : PackageSearch}
              titulo={
                consulta.ok
                  ? "No hay registros para esta consulta"
                  : "Consulta pendiente"
              }
              descripcion={
                consulta.ok
                  ? "Prueba otros filtros. Sólo se muestran registros existentes; consultar no crea existencias ni movimientos."
                  : "Corrige los filtros o vuelve a intentar la consulta."
              }
            />
          }
        />
      </SectionCard>
      {pendiente && (
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          Consultando inventario…
        </p>
      )}
      {configurar && (
        <ConfigurarMinimo
          fila={configurar.fila}
          catalogos={catalogos}
          onCerrar={cerrarConfiguracion}
          onExito={() => {
            cerrarConfiguracion();
            iniciar(() => router.refresh());
          }}
        />
      )}
      <Dialog
        open={Boolean(detalle)}
        onOpenChange={(abierto) => {
          if (!abierto) setDetalle(undefined);
        }}
      >
        <DialogContent
          className="max-h-[90dvh] overflow-y-auto rounded-lg sm:max-w-xl"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            (retornoFoco.current?.isConnected
              ? retornoFoco.current
              : botonActualizar.current
            )?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {detalle && "tipo" in detalle ? "Ver movimiento" : "Ver stock"}
            </DialogTitle>
            <DialogDescription>
              Consulta de sólo lectura del registro seleccionado.
            </DialogDescription>
          </DialogHeader>
          {detalle && (
            <div className="space-y-4">
              <dl className="grid gap-4 sm:grid-cols-2">
                {[
                  [
                    "Material",
                    `${detalle.material.code} · ${detalle.material.name}`,
                  ],
                  ["Bodega", detalle.bodega.name],
                  [
                    "Unidad",
                    `${detalle.material.unidad.name} (${detalle.material.unidad.abbreviation})`,
                  ],
                  ["Cantidad", cantidad(detalle)],
                  ...("minimo" in detalle
                    ? [
                        [
                          "Mínimo",
                          detalle.minimo === null
                            ? "Sin configurar"
                            : `${formatearCantidad(detalle.minimo)} ${detalle.material.unidad.abbreviation}`,
                        ],
                        [
                          "Última actualización",
                          formatearFecha(detalle.updatedAt),
                        ],
                      ]
                    : [
                        ["Fecha del movimiento", formatearFecha(detalle.fecha)],
                        ["Tipo", nombresTipo[detalle.tipo]],
                        ["Origen", origen(detalle)],
                        ["Motivo", detalle.nota ?? "Sin motivo registrado"],
                      ]),
                  ["Fecha de registro", formatearFecha(detalle.createdAt)],
                ].map(([etiqueta, valor]) => (
                  <div key={etiqueta} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">
                      {etiqueta}
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words text-sm tabular-nums">
                      {valor}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetalle(undefined)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
