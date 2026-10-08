"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AyudaCampo } from "@/components/formularios/ayuda-campo";
import { TextoAutocompletable } from "@/components/formularios/texto-autocompletable";
import { EquivalenciaCompra } from "@/components/compras/equivalencia-compra";
import { FinalizarCompra } from "@/components/compras/finalizar-compra";
import { RecepcionCompra } from "@/components/compras/recepcion-compra";
import {
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  PackageCheck,
  ListX,
  Ban,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import {
  TablaConsulta,
  type ColumnaConsulta,
} from "@/components/data-table/tabla-consulta";
import { SelectorBuscable } from "@/components/formularios/selector-buscable";
import { Aviso } from "@/components/alertas/aviso";
import { ConfirmarAccion } from "@/components/alertas/confirmar-accion";
import { ConfirmarDescarte } from "@/components/alertas/confirmar-descarte";
import { notificar } from "@/components/alertas/notificaciones";
import { Button } from "@/components/ui/button";
import { BotonConAyuda } from "@/components/formularios/boton-con-ayuda";
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
import {
  obtenerCompra,
  guardarDatosCompra,
  calcularDatosCompra,
  eliminarDatosCompra,
} from "@/app/(app)/compras/actions";
import { formatearCantidad, formatearFecha } from "@/lib/formato";
import {
  compraSchema,
  type DatosCompra,
  type FiltrosCompra,
} from "@/lib/validaciones/compra";
import type {
  CatalogosCompra,
  Compra,
  CalculoCompra,
} from "@/lib/tipos/compra";
import type { PaginaConsulta } from "@/lib/tipos/inventario";
const dinero = (v: string) => {
  const [entero, fraccion = "00"] = v.split(".");
  return `$ ${formatearCantidad(entero)},${fraccion.padEnd(2, "0")}`;
};
const ayudas: Record<string, string> = {
  Proveedor:
    "Selecciona a quién compraste los materiales. Puedes buscar por nombre o RUT.",
  "Tipo de documento":
    "Documento que entregó el proveedor: Factura, Boleta o Guía de Compra. No se calculan impuestos.",
  Bodega:
    "Aquí ingresarán todas las recepciones de esta compra. Para distribuir después a otras bodegas se requerirá un traslado.",
  presentation:
    "Cómo viene vendido el material: Unidad, Caja, Paquete, etc. Puedes elegir una presentación usada antes o escribir una nueva. Sólo se completa el nombre; contenido y precio se ingresan por separado.",
  purchasedQuantity:
    "Cuántas presentaciones compraste: 10 unidades o 3 cajas, por ejemplo. Admite fracciones cuando equivalen exactamente a la unidad del material.",
  unitFactor:
    "Cuánta cantidad en la unidad del material contiene cada presentación. Si compras por unidad, indica 1. Una caja de 20 unidades tiene contenido 20.",
  unitPrice:
    "Valor de una presentación: precio por unidad si compras unidades, o precio por caja si compras cajas. El precio quedará fijo después de guardar.",
};
const nuevaLinea = () => ({
  rawMaterialId: 0,
  presentation: "Unidad",
  purchasedQuantity: "1",
  unitFactor: "1",
  unitPrice: "0",
});
type Editor = {
  modo: "crear" | "ver" | "editar";
  compra?: Compra;
};
/** Mantener el editor montado conserva valores y UUID cuando una petición falla. */
function FormularioCompra({
  editor,
  catalogos,
  onCerrar,
  onExito,
}: {
  editor: Editor;
  catalogos: CatalogosCompra;
  onCerrar: () => void;
  onExito: () => void;
}) {
  const c = editor.compra;
  const consulta = editor.modo === "ver";
  const bloqueada = consulta || Boolean(c?.recibida || c?.closures.length);
  const [datos, setDatos] = useState<DatosCompra>(() =>
    c
      ? {
          date: c.dia,
          supplierId: c.supplierId,
          documentTypeId: c.documentTypeId,
          documentNumber: c.documentNumber,
          warehouseId: c.warehouseId,
          lines: c.lines.map((l) => ({
            id: l.id,
            rawMaterialId: l.rawMaterialId,
            presentation: l.presentation,
            purchasedQuantity: l.purchasedQuantity,
            unitFactor: l.unitFactor,
            unitPrice: l.unitPrice,
          })),
        }
      : {
          date: new Intl.DateTimeFormat("sv-SE", {
            timeZone: "America/Santiago",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date()),
          supplierId: 0,
          documentTypeId: 0,
          documentNumber: "",
          warehouseId: 0,
          lines: [nuevaLinea()],
        },
  );
  const [clave] = useState(() => crypto.randomUUID());
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string>();
  const [calculo, setCalculo] = useState<CalculoCompra>();
  const [confirmar, setConfirmar] = useState(false);
  const [descarte, setDescarte] = useState(false);
  const [sucio, setSucio] = useState(false);
  function cambiar<K extends keyof DatosCompra>(
    campo: K,
    valor: DatosCompra[K],
  ) {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setSucio(true);
    setCalculo(undefined);
  }
  function cerrar() {
    if (ocupado) return;
    if (sucio && !consulta) setDescarte(true);
    else onCerrar();
  }
  async function preparar() {
    setError(undefined);
    const v = compraSchema.safeParse(datos);
    if (!v.success) {
      setError(
        "Completa proveedor, documento, bodega y líneas con valores válidos. Revisa decimales y fecha.",
      );
      return;
    }
    setOcupado(true);
    try {
      const r = await calcularDatosCompra(datos);
      if (r.ok) {
        setCalculo(r.calculo);
        setConfirmar(true);
      } else setError(r.mensaje);
    } catch {
      setError(
        "No se pudo verificar la compra. Reintenta conservando los datos.",
      );
    } finally {
      setOcupado(false);
    }
  }
  async function guardar() {
    setOcupado(true);
    try {
      const r = await guardarDatosCompra(
        datos,
        clave,
        c ? { id: c.id, version: c.version } : undefined,
      );
      if (r.ok) {
        notificar.exito(r.mensaje);
        onExito();
      } else {
        setError(r.mensaje);
        setConfirmar(false);
      }
    } catch {
      setError(
        "No se pudo guardar. Reintenta: el formulario conserva la identificación de esta operación.",
      );
      setConfirmar(false);
    } finally {
      setOcupado(false);
    }
  }
  function selector(
    campo: "supplierId" | "documentTypeId" | "warehouseId",
    nombre: string,
    opciones: {
      id: number;
      name: string;
      rut?: string;
    }[],
  ) {
    return (
      <div className="min-w-0 space-y-2">
        <div className="flex items-center gap-1">
          <Label htmlFor={campo}>{nombre}</Label>
          <AyudaCampo nombre={nombre} texto={ayudas[nombre]} />
        </div>
        <SelectorBuscable
          id={campo}
          nombre={nombre.toLowerCase()}
          opciones={opciones.map((o) => ({
            valor: String(o.id),
            etiqueta: o.name,
            busqueda: o.rut,
          }))}
          valor={String(datos[campo] || "")}
          onChange={(v) => cambiar(campo, Number(v))}
          placeholder={`Seleccionar ${nombre.toLowerCase()}`}
          disabled={bloqueada || ocupado}
        />
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
          className="max-h-[90dvh] overflow-y-auto rounded-lg sm:max-w-4xl"
          onEscapeKeyDown={(e) => {
            // Radix escucha Escape antes que el input: primero cerrar sus sugerencias, no el formulario.
            const destino = e.target;
            if (
              ocupado ||
              (destino instanceof HTMLElement &&
                destino.getAttribute("role") === "combobox" &&
                destino.getAttribute("aria-expanded") === "true")
            )
              e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (ocupado) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {consulta ? "Ver compra" : c ? "Editar compra" : "Crear compra"}
            </DialogTitle>
            <DialogDescription>
              Compra completa; las entradas de materiales se registran mediante
              recepciones. Los precios guardados no pueden modificarse.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void preparar();
            }}
            className="space-y-5"
            noValidate
            aria-busy={ocupado}
          >
            {error && <Aviso titulo={error} />}
            {(c?.recibida || Boolean(c?.closures.length)) && !consulta && (
              <Aviso
                tipo="informacion"
                titulo="Compra con recepciones o cierres: identidad, bodega y líneas bloqueadas."
              />
            )}
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              {selector("supplierId", "Proveedor", catalogos.proveedores)}
              {selector("documentTypeId", "Tipo de documento", catalogos.tipos)}
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="compra-numero">Número de documento</Label>
                  <AyudaCampo
                    nombre="Número de documento"
                    texto="Copia el número del documento del proveedor, incluidos ceros iniciales. La combinación proveedor, tipo y número no puede repetirse."
                  />
                </div>
                <Input
                  id="compra-numero"
                  value={datos.documentNumber}
                  readOnly={bloqueada}
                  disabled={ocupado}
                  maxLength={100}
                  onChange={(e) => cambiar("documentNumber", e.target.value)}
                />
              </div>
              {selector("warehouseId", "Bodega", catalogos.bodegas)}
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="compra-fecha">Fecha de compra</Label>
                  <AyudaCampo
                    nombre="Fecha de compra"
                    texto="Fecha del documento de compra. Guardar la compra no ingresa stock; después debes registrar lo recibido mediante Recibir."
                  />
                </div>
                <Input
                  id="compra-fecha"
                  type="date"
                  value={datos.date}
                  readOnly={consulta}
                  disabled={ocupado}
                  onChange={(e) => cambiar("date", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-4">
              {datos.lines.map((l, i) => (
                <fieldset
                  key={l.id ?? `nueva-${i}`}
                  className="min-w-0 space-y-3 rounded-md border border-border p-4"
                  disabled={ocupado}
                >
                  <legend className="px-1 text-sm font-medium">
                    Detalle {i + 1}
                  </legend>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-1">
                        <Label htmlFor={`material-${i}`}>
                          Materia prima {i + 1}
                        </Label>
                        <AyudaCampo
                          nombre={`Materia prima ${i + 1}`}
                          texto="Selecciona el material comprado. Su unidad de inventario ya está definida en Materias primas; el contenido de la presentación se expresa en esa unidad."
                        />
                      </div>
                      <SelectorBuscable
                        id={`material-${i}`}
                        nombre={`materia prima ${i + 1}`}
                        opciones={catalogos.materiales.map((m) => ({
                          valor: String(m.id),
                          etiqueta: `${m.code} · ${m.name} (${m.unidad})`,
                        }))}
                        valor={String(l.rawMaterialId || "")}
                        onChange={(v) =>
                          cambiar(
                            "lines",
                            datos.lines.map((a, n) =>
                              n === i ? { ...a, rawMaterialId: Number(v) } : a,
                            ),
                          )
                        }
                        placeholder="Seleccionar materia prima"
                        disabled={bloqueada || ocupado}
                      />
                    </div>
                    {(
                      [
                        ["presentation", "Presentación de compra"],
                        ["purchasedQuantity", "Cantidad de presentaciones"],
                        [
                          "unitFactor",
                          "Unidades del material por presentación",
                        ],
                        ["unitPrice", "Precio por presentación"],
                      ] as const
                    ).map(([campo, titulo]) => (
                      <div key={campo} className="space-y-2">
                        <div className="flex items-center gap-1">
                          <Label htmlFor={`${campo}-${i}`}>
                            {titulo} {i + 1}
                          </Label>
                          <AyudaCampo
                            nombre={`${titulo} ${i + 1}`}
                            texto={ayudas[campo]}
                          />
                        </div>
                        {campo === "presentation" ? (
                          <TextoAutocompletable
                            id={`${campo}-${i}`}
                            valor={l.presentation}
                            opciones={catalogos.presentaciones}
                            readOnly={bloqueada}
                            disabled={ocupado}
                            onChange={(valor) =>
                              cambiar(
                                "lines",
                                datos.lines.map((a, n) =>
                                  n === i ? { ...a, presentation: valor } : a,
                                ),
                              )
                            }
                          />
                        ) : (
                          <Input
                            id={`${campo}-${i}`}
                            inputMode="decimal"
                            value={l[campo]}
                            readOnly={
                              bloqueada ||
                              (campo === "unitPrice" && Boolean(l.id))
                            }
                            onChange={(e) =>
                              cambiar(
                                "lines",
                                datos.lines.map((a, n) =>
                                  n === i
                                    ? { ...a, [campo]: e.target.value }
                                    : a,
                                ),
                              )
                            }
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Contenido expresado en{" "}
                    {catalogos.materiales.find((m) => m.id === l.rawMaterialId)
                      ?.unidad ?? "la unidad del material"}
                    . {l.id && "Precio guardado: no editable."}
                  </p>
                  <EquivalenciaCompra
                    cantidad={l.purchasedQuantity}
                    factor={l.unitFactor}
                    presentacion={l.presentation}
                    unidad={
                      catalogos.materiales.find((m) => m.id === l.rawMaterialId)
                        ?.unidad ?? "unidad del material"
                    }
                  />
                  {calculo && (
                    <p className="text-sm tabular-nums">
                      Equivalente:{" "}
                      {formatearCantidad(calculo.lineas[i].cantidad)} · Importe:{" "}
                      {dinero(calculo.lineas[i].importe)}
                    </p>
                  )}
                  {consulta && c && (
                    <div className="space-y-1 text-sm">
                      <p>
                        Importe: {dinero(c.lines[i].lineAmount)} · Equivalente:{" "}
                        {formatearCantidad(c.lines[i].quantity)}{" "}
                        {c.lines[i].unidad}
                      </p>
                      <p>
                        Recibido: {c.lines[i].recibido} · Cerrado:{" "}
                        {c.lines[i].cerrado} · Pendiente: {c.lines[i].pendiente}{" "}
                        presentaciones
                      </p>
                      <Link
                        className="text-primary underline"
                        href={`/inventario/movimientos?material=${l.rawMaterialId}&bodega=${c.warehouseId}`}
                      >
                        Ver movimientos del material en esta bodega
                      </Link>
                    </div>
                  )}
                  {!bloqueada && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={datos.lines.length <= 1}
                      onClick={() =>
                        cambiar(
                          "lines",
                          datos.lines.filter((_, n) => n !== i),
                        )
                      }
                    >
                      Quitar detalle {i + 1}
                    </Button>
                  )}
                </fieldset>
              ))}
            </div>
            {!bloqueada && (
              <Button
                type="button"
                variant="outline"
                disabled={ocupado || datos.lines.length >= 50}
                onClick={() => cambiar("lines", [...datos.lines, nuevaLinea()])}
              >
                Agregar detalle
              </Button>
            )}
            {consulta && c && (
              <div className="space-y-2">
                <p className="font-medium">
                  {c.estado} · Total: {dinero(c.totalAmount)}
                </p>
                {c.voidReason && <p>Motivo de anulación: {c.voidReason}</p>}
                {c.closures.map((r) => (
                  <div
                    key={r.id}
                    className="rounded border border-border p-3 text-sm"
                  >
                    Pendiente cerrado: {r.material} · {r.cantidad}{" "}
                    presentaciones · {formatearFecha(r.fecha)}
                    <p>Motivo: {r.motivo}</p>
                  </div>
                ))}
                <p>Recepciones: {c.receipts.length}</p>
                {c.receipts.map((r) => (
                  <div
                    key={r.id}
                    className="rounded border border-border p-3 text-sm"
                  >
                    Recepción #{r.id} · {formatearFecha(r.fecha)}
                    {r.lineas.map((l, i) => (
                      <p key={i}>
                        {l.material}: {l.cantidad} presentaciones →{" "}
                        {l.equivalente} en unidad de inventario
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {calculo && (
              <p className="font-medium tabular-nums">
                Total a guardar: {dinero(calculo.total)}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={ocupado}
                onClick={cerrar}
              >
                {consulta ? "Cerrar" : "Cancelar"}
              </Button>
              {!consulta && (
                <Button type="submit" disabled={ocupado}>
                  {ocupado ? "Verificando…" : "Revisar y guardar"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmarAccion
        abierto={confirmar}
        onAbiertoChange={setConfirmar}
        titulo="Confirmar datos de compra"
        descripcion={`¿Los datos ingresados son correctos? Total: ${calculo ? dinero(calculo.total) : ""}. Los precios de los detalles no podrán modificarse después de guardar. Guardar no ingresa materiales al stock.`}
        accion="Confirmar y guardar"
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
export function Compras({
  catalogos,
  consulta,
  filtros,
}: {
  catalogos: CatalogosCompra;
  consulta:
    | {
        ok: true;
        pagina: PaginaConsulta<Compra>;
      }
    | {
        ok: false;
        mensaje: string;
      };
  filtros: FiltrosCompra;
}) {
  const router = useRouter(),
    params = useSearchParams();
  const [pendiente, iniciar] = useTransition();
  const [q, setQ] = useState(filtros.q);
  const [editor, setEditor] = useState<Editor>();
  const [recepcion, setRecepcion] = useState<Compra>();
  const [finalizacion, setFinalizacion] = useState<{
    compra: Compra;
    modo: "cerrar" | "anular";
  }>();
  const [error, setError] = useState<string>();
  const [cargando, setCargando] = useState(false);
  const [eliminacion, setEliminacion] = useState<{
    compra: Compra;
    clave: string;
  }>();
  const foco = useRef<HTMLElement | null>(null);
  const devolverFoco = useRef(false);
  // El refresco deshabilita las acciones: devolver el foco cuando vuelvan a estar disponibles.
  useEffect(() => {
    if (
      !pendiente &&
      !editor &&
      !recepcion &&
      !finalizacion &&
      devolverFoco.current
    ) {
      devolverFoco.current = false;
      requestAnimationFrame(() => {
        const origen = foco.current;
        // Una compra completada/anulada deshabilita su acción; volver a Ver en esa misma fila.
        const destino =
          origen instanceof HTMLButtonElement && origen.disabled
            ? origen
                .closest("tr")
                ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
            : origen;
        destino?.focus();
      });
    }
  }, [pendiente, editor, recepcion, finalizacion]);
  function navegar(valores: Record<string, string>) {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(valores)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    iniciar(() => router.replace(`/compras?${p}`, { scroll: false }));
  }
  function cerrar() {
    setEditor(undefined);
    setRecepcion(undefined);
    setFinalizacion(undefined);
    devolverFoco.current = true;
  }
  async function abrir(
    c: Compra,
    modo: "ver" | "editar" | "recibir" | "cerrar" | "anular",
  ) {
    foco.current = document.activeElement as HTMLElement;
    setCargando(true);
    setError(undefined);
    try {
      const r = await obtenerCompra(c.id);
      if (r.ok && r.compra && !r.compra.deletedAt) {
        if (modo === "recibir") setRecepcion(r.compra);
        else if (modo === "cerrar" || modo === "anular")
          setFinalizacion({ compra: r.compra, modo });
        else setEditor({ modo, compra: r.compra });
      } else
        setError(r.ok ? "La compra fue eliminada del listado." : r.mensaje);
    } catch {
      setError("No se pudo cargar la compra.");
    } finally {
      setCargando(false);
    }
  }
  async function eliminar() {
    if (!eliminacion) return;
    setCargando(true);
    try {
      const r = await eliminarDatosCompra(
        { id: eliminacion.compra.id, version: eliminacion.compra.version },
        eliminacion.clave,
      );
      if (r.ok) {
        setEliminacion(undefined);
        notificar.exito(r.mensaje);
        iniciar(() => router.refresh());
      } else {
        setError(r.mensaje);
        setEliminacion(undefined);
      }
    } catch {
      setError("No se pudo eliminar. Reintenta conservando la operación.");
    } finally {
      setCargando(false);
    }
  }
  const columnas: ColumnaConsulta<Compra>[] = [
    {
      id: "fecha",
      titulo: "Fecha",
      orden: "fecha",
      contenido: (c) => c.dia.split("-").reverse().join("-"),
    },
    {
      id: "documento",
      titulo: "Documento",
      orden: "documento",
      contenido: (c) => (
        <div>
          {c.documento}
          <p className="font-mono text-xs">{c.documentNumber}</p>
        </div>
      ),
    },
    {
      id: "proveedor",
      titulo: "Proveedor",
      contenido: (c) => (
        <div>
          {c.proveedor}
          <p className="text-xs text-muted-foreground">{c.rut}</p>
        </div>
      ),
    },
    { id: "bodega", titulo: "Bodega", contenido: (c) => c.bodega },
    {
      id: "total",
      titulo: "Total",
      orden: "total",
      contenido: (c) => dinero(c.totalAmount),
    },
    {
      id: "estado",
      titulo: "Recepción",
      contenido: (c) => (
        <span className="rounded border border-border px-2 py-1 text-xs">
          {c.estado}
        </span>
      ),
    },
    {
      id: "acciones",
      titulo: "Acciones",
      contenido: (c) => (
        <div className="flex gap-1">
          <BotonConAyuda
            variant="ghost"
            size="icon"
            aria-label={`Ver compra ${c.documentNumber}`}
            ayuda="Consulta los datos, recepciones y cierres de esta compra."
            disabled={cargando || pendiente}
            onClick={() => void abrir(c, "ver")}
          >
            <Eye />
          </BotonConAyuda>
          <BotonConAyuda
            variant="ghost"
            size="icon"
            aria-label={`Editar compra ${c.documentNumber}`}
            ayuda="Edita los datos permitidos. El precio queda fijo al guardar; la estructura se bloquea desde la primera recepción o cierre."
            disabled={cargando || pendiente || Boolean(c.voidedAt)}
            onClick={() => void abrir(c, "editar")}
          >
            <Pencil />
          </BotonConAyuda>
          <BotonConAyuda
            variant="ghost"
            size="icon"
            aria-label={`Recibir compra ${c.documentNumber}`}
            ayuda="Registrar recepción parcial o completa"
            disabled={
              cargando ||
              pendiente ||
              Boolean(c.voidedAt) ||
              !c.lines.some((l) => l.pendiente !== "0")
            }
            onClick={() => void abrir(c, "recibir")}
          >
            <PackageCheck />
          </BotonConAyuda>
          <BotonConAyuda
            variant="ghost"
            size="icon"
            aria-label={`Cerrar pendiente compra ${c.documentNumber}`}
            ayuda="Cierra la cantidad restante de una línea que ya no llegará. No modifica el stock ni anula lo recibido."
            disabled={
              cargando ||
              pendiente ||
              Boolean(c.voidedAt) ||
              !c.lines.some((l) => l.pendiente !== "0")
            }
            onClick={() => void abrir(c, "cerrar")}
          >
            <ListX />
          </BotonConAyuda>
          <BotonConAyuda
            variant="ghost"
            size="icon"
            aria-label={`Anular compra ${c.documentNumber}`}
            ayuda="Anula la compra completa y revierte lo recibido si cumple las condiciones de stock e historial."
            disabled={cargando || pendiente || Boolean(c.voidedAt)}
            onClick={() => void abrir(c, "anular")}
          >
            <Ban />
          </BotonConAyuda>
          <BotonConAyuda
            variant="ghost"
            size="icon"
            aria-label={`Eliminar compra ${c.documentNumber}`}
            disabled={cargando || pendiente || !c.voidedAt}
            ayuda={
              c.voidedAt
                ? "Ocultar del listado conservando el historial"
                : "Primero debes anular la compra"
            }
            onClick={() =>
              setEliminacion({ compra: c, clave: crypto.randomUUID() })
            }
          >
            <Trash2 />
          </BotonConAyuda>
        </div>
      ),
    },
  ];
  const pagina = consulta.ok
    ? consulta.pagina
    : { datos: [], total: 0, pagina: 1, tamano: filtros.tamano };
  return (
    <>
      <PageHeader
        titulo="Compras"
        descripcion="Materiales comprados, proveedor, valor y documento de respaldo."
        acciones={
          <>
            <BotonConAyuda
              ayuda="Vuelve a consultar las compras y actualiza el listado."
              variant="outline"
              disabled={pendiente || cargando}
              onClick={() => iniciar(() => router.refresh())}
            >
              <RefreshCw />
              Actualizar
            </BotonConAyuda>
            <BotonConAyuda
              ayuda="Registra una compra. El ingreso a stock se realiza después mediante Recibir."
              disabled={pendiente || cargando}
              onClick={() => {
                foco.current = document.activeElement as HTMLElement;
                setEditor({ modo: "crear" });
              }}
            >
              <Plus />
              Crear compra
            </BotonConAyuda>
          </>
        }
      />
      {error && (
        <div className="mb-4">
          <Aviso titulo={error} />
        </div>
      )}
      {!consulta.ok && <Aviso titulo={consulta.mensaje} />}
      <SectionCard titulo="Documentos de compra" contentClassName="p-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navegar({ q, pagina: "1" });
          }}
          className="flex flex-wrap gap-3 border-b border-border p-4"
        >
          <div className="min-w-0 flex-1">
            <Label htmlFor="compras-buscar">
              Buscar proveedor, RUT o número
            </Label>
            <Input
              id="compras-buscar"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              maxLength={150}
            />
          </div>
          <BotonConAyuda ayuda="Busca compras por proveedor, RUT o número de documento." type="submit" disabled={pendiente} className="self-end">
            Aplicar filtros
          </BotonConAyuda>
          <BotonConAyuda
            ayuda="Quita la búsqueda y muestra nuevamente todas las compras."
            type="button"
            variant="outline"
            disabled={pendiente}
            className="self-end"
            onClick={() => {
              setQ("");
              navegar({ q: "", pagina: "1" });
            }}
          >
            Limpiar filtros
          </BotonConAyuda>
        </form>
        <TablaConsulta
          nombre="Compras"
          ayudasBotones
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
          onPagina={(pagina) => navegar({ pagina: String(pagina) })}
          onTamano={(tamano) => navegar({ tamano, pagina: "1" })}
          vacio={
            <div className="text-muted-foreground">
              No hay compras para esta consulta.
            </div>
          }
        />
      </SectionCard>
      <ConfirmarAccion
        abierto={Boolean(eliminacion)}
        onAbiertoChange={(v) => {
          if (!v) setEliminacion(undefined);
        }}
        titulo="Eliminar compra del listado"
        descripcion="La compra anulada se ocultará del listado. Sus documentos, recepciones y movimientos se conservarán."
        accion="Eliminar"
        pendiente={cargando}
        onConfirmar={() => void eliminar()}
      />
      {finalizacion && (
        <FinalizarCompra
          compra={finalizacion.compra}
          modo={finalizacion.modo}
          onCerrar={cerrar}
          onExito={() => {
            cerrar();
            iniciar(() => router.refresh());
          }}
        />
      )}
      {recepcion && (
        <RecepcionCompra
          compra={recepcion}
          onCerrar={cerrar}
          onExito={() => {
            cerrar();
            iniciar(() => router.refresh());
          }}
        />
      )}
      {editor && (
        <FormularioCompra
          key={`${editor.modo}-${editor.compra?.id ?? "nueva"}`}
          editor={editor}
          catalogos={catalogos}
          onCerrar={cerrar}
          onExito={() => {
            cerrar();
            iniciar(() => router.refresh());
          }}
        />
      )}
    </>
  );
}
