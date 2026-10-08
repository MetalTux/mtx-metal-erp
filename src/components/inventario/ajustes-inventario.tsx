"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CatalogosInventario } from "@/lib/tipos/inventario";
import type {
  consultarAjustes,
  FilaAjuste,
} from "@/lib/consultas/ajustes-inventario";
import { motivosAjuste } from "@/config/motivos-ajuste";
import { FormularioAjuste } from "@/components/inventario/formulario-ajuste";
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
export function AjustesInventario({
  consulta,
  catalogos,
}: {
  consulta: Awaited<ReturnType<typeof consultarAjustes>>;
  catalogos: CatalogosInventario;
}) {
  const router = useRouter(),
    params = useSearchParams();
  const [pendiente, startTransition] = useTransition();
  const [texto, setTexto] = useState(params.get("texto") ?? "");
  const [material, setMaterial] = useState(params.get("rawMaterialId") ?? "");
  const [bodega, setBodega] = useState(params.get("warehouseId") ?? "");
  const [motivo, setMotivo] = useState(params.get("reason") ?? "");
  const [desde, setDesde] = useState(params.get("desde") ?? ""),
    [hasta, setHasta] = useState(params.get("hasta") ?? "");
  const [formulario, setFormulario] = useState<{
    inicial: boolean;
    corregido?: FilaAjuste;
    uuid: string;
  }>();
  const [vista, setVista] = useState<FilaAjuste>();
  const ultimoBoton = useRef<HTMLButtonElement | null>(null),
    actualizar = useRef<HTMLButtonElement | null>(null);
  function navegar(cambios: Record<string, string>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(cambios)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    startTransition(() => router.push(`/inventario/ajustes?${p}`));
  }
  function cerrar() {
    setFormulario(undefined);
    requestAnimationFrame(() => {
      (ultimoBoton.current?.isConnected
        ? ultimoBoton.current
        : actualizar.current
      )?.focus();
    });
  }
  function abrir(
    e: React.MouseEvent<HTMLButtonElement>,
    inicial: boolean,
    corregido?: FilaAjuste,
  ) {
    ultimoBoton.current = e.currentTarget;
    setFormulario({ inicial, corregido, uuid: crypto.randomUUID() });
  }
  const columnas: ColumnaConsulta<FilaAjuste>[] = [
    { id: "id", titulo: "Ajuste", orden: "id", contenido: (a) => `#${a.id}` },
    {
      id: "fecha",
      titulo: "Fecha",
      orden: "date",
      contenido: (a) => a.fecha.split("-").reverse().join("-"),
    },
    { id: "material", titulo: "Materia prima", contenido: (a) => a.material },
    { id: "bodega", titulo: "Bodega", contenido: (a) => a.bodega },
    {
      id: "motivo",
      titulo: "Motivo",
      contenido: (a) => motivosAjuste[a.motivo as keyof typeof motivosAjuste],
    },
    {
      id: "diferencia",
      titulo: "Diferencia",
      contenido: (a) => `${formatearCantidad(a.diferencia)} ${a.unidad}`,
    },
    {
      id: "final",
      titulo: "Saldo final registrado",
      contenido: (a) => `${formatearCantidad(a.final)} ${a.unidad}`,
    },
    {
      id: "acciones",
      titulo: "Acciones",
      contenido: (a) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={pendiente}
            onClick={(e) => {
              ultimoBoton.current = e.currentTarget;
              setVista(a);
            }}
          >
            Ver
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pendiente}
            onClick={(e) => abrir(e, false, a)}
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
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ajustes de stock</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conteos físicos, carga inicial y correcciones con historial
            conservado.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            ref={actualizar}
            variant="outline"
            disabled={pendiente}
            onClick={() => startTransition(() => router.refresh())}
          >
            Actualizar
          </Button>
          <Button
            variant="outline"
            disabled={pendiente}
            onClick={(e) => abrir(e, true)}
          >
            Inventario inicial
          </Button>
          <Button disabled={pendiente} onClick={(e) => abrir(e, false)}>
            Registrar ajuste
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
            warehouseId: bodega,
            reason: motivo,
            desde,
            hasta,
            pagina: "1",
          });
        }}
      >
        <div>
          <Label htmlFor="ajustes-buscar">Buscar</Label>
          <Input
            id="ajustes-buscar"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={150}
            placeholder="Material, bodega u observación"
          />
        </div>
        <div>
          <Label htmlFor="ajustes-material">Materia prima</Label>
          <SelectorBuscable
            placeholder="Seleccionar opción"
            id="ajustes-material"
            nombre="filtro de materia prima"
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
          <Label htmlFor="ajustes-bodega">Bodega</Label>
          <SelectorBuscable
            placeholder="Seleccionar opción"
            id="ajustes-bodega"
            nombre="filtro de bodega"
            valor={bodega}
            onChange={setBodega}
            opciones={[
              { valor: "", etiqueta: "Todas las bodegas" },
              ...catalogos.bodegas.map((b) => ({
                valor: String(b.id),
                etiqueta: b.name,
              })),
            ]}
          />
        </div>
        <div>
          <Label htmlFor="ajustes-motivo">Motivo</Label>
          <SelectorBuscable
            placeholder="Seleccionar opción"
            id="ajustes-motivo"
            nombre="filtro de motivo"
            valor={motivo}
            onChange={setMotivo}
            opciones={[
              { valor: "", etiqueta: "Todos los motivos" },
              ...Object.entries(motivosAjuste).map(([valor, etiqueta]) => ({
                valor,
                etiqueta,
              })),
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="ajustes-desde">Desde</Label>
            <Input
              id="ajustes-desde"
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ajustes-hasta">Hasta</Label>
            <Input
              id="ajustes-hasta"
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
              setBodega("");
              setMotivo("");
              setDesde("");
              setHasta("");
              startTransition(() => router.push("/inventario/ajustes"));
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
            nombre="Ajustes de inventario"
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
            vacio="No hay ajustes para estos filtros."
          />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Los saldos mostrados son históricos. Consulta Stock por bodega para ver
        existencias actuales. Los ajustes no se editan ni eliminan.
      </p>
      {formulario && (
        <FormularioAjuste
          {...formulario}
          catalogos={catalogos}
          hoy={hoy}
          onCerrar={cerrar}
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
              requestAnimationFrame(() => ultimoBoton.current?.focus());
            }
          }}
        >
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ver ajuste #{vista.id}</DialogTitle>
              <DialogDescription>
                Documento histórico de sólo lectura.
              </DialogDescription>
            </DialogHeader>
            <dl className="min-w-0 space-y-3 text-sm break-words">
              {Object.entries({
                "Materia prima": vista.material,
                Bodega: vista.bodega,
                "Fecha del conteo": vista.fecha.split("-").reverse().join("-"),
                Registrado: new Intl.DateTimeFormat("es-CL", {
                  timeZone: "America/Santiago",
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(vista.registrado)),
                Motivo:
                  motivosAjuste[vista.motivo as keyof typeof motivosAjuste],
                "Saldo anterior": `${formatearCantidad(vista.anterior)} ${vista.unidad}`,
                "Saldo final": `${formatearCantidad(vista.final)} ${vista.unidad}`,
                Diferencia: `${formatearCantidad(vista.diferencia)} ${vista.unidad}`,
                Observación: vista.observacion,
                Movimiento: `#${vista.movimientoId}`,
                "Corrige ajuste": vista.corregidoId
                  ? `#${vista.corregidoId}`
                  : "No corresponde",
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
                requestAnimationFrame(() => ultimoBoton.current?.focus());
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
