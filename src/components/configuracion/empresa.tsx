"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, LoaderCircle, Pencil, RefreshCw, Save } from "lucide-react";
import { consultarPerfilEmpresa, guardarPerfilEmpresa } from "@/app/(app)/configuracion/empresa/actions";
import type { Empresa, ResultadoEmpresa } from "@/lib/tipos/empresa";
import { empresaSchema, type DatosEmpresa } from "@/lib/validaciones/empresa";
import { formatearRut } from "@/lib/validaciones/rut";
import { Aviso } from "@/components/alertas/aviso";
import { ConfirmarDescarte } from "@/components/alertas/confirmar-descarte";
import { notificar } from "@/components/alertas/notificaciones";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Campo = keyof DatosEmpresa;
const grupos: { titulo: string; campos: { nombre: Campo; titulo: string; limite: number; tipo?: "email" | "tel"; placeholder?: string }[] }[] = [
  { titulo: "Identificación", campos: [
    { nombre: "legalName", titulo: "Razón social", limite: 150 }, { nombre: "tradeName", titulo: "Nombre comercial", limite: 150 },
    { nombre: "rut", titulo: "RUT", limite: 20, placeholder: "Ej.: 12.345.678-5" }, { nombre: "businessActivity", titulo: "Giro o actividad", limite: 200 },
  ] },
  { titulo: "Dirección", campos: [{ nombre: "address", titulo: "Dirección", limite: 250 }, { nombre: "commune", titulo: "Comuna", limite: 100 }, { nombre: "city", titulo: "Ciudad", limite: 100 }] },
  { titulo: "Contacto", campos: [{ nombre: "email", titulo: "Correo", tipo: "email", limite: 254 }, { nombre: "phone", titulo: "Teléfono", tipo: "tel", limite: 40 }] },
];
function VistaLogo({ url }: { url: string | null }) {
  const [fallo, setFallo] = useState(false);
  return url && !fallo ? <Image src={url} alt="Logo de la empresa" width={160} height={160} unoptimized onError={() => setFallo(true)} className="h-32 w-40 rounded border bg-white object-contain p-2" /> : <p className="text-sm text-muted-foreground">{fallo ? "No se pudo cargar el logo." : "Sin logo configurado"}</p>;
}
const fecha = (valor: string) => new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(valor));

function EditorEmpresa({ perfil, pendiente, onCerrar, onGuardar, onRestaurarFoco }: { perfil: Empresa | null; pendiente: boolean; onCerrar: () => void; onGuardar: (datos: DatosEmpresa, archivo?: File, quitarLogo?: boolean) => Promise<ResultadoEmpresa>; onRestaurarFoco: () => void }) {
  const [error, setError] = useState<string>();
  const [confirmarDescarte, setConfirmarDescarte] = useState(false);
  const [archivo, setArchivo] = useState<File>();
  const [quitarLogo, setQuitarLogo] = useState(false);
  const [errorLogo, setErrorLogo] = useState<string>();
  const [preview, setPreview] = useState<string>();
  const archivoInput = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function seleccionarLogo(nuevo?: File) {
    setErrorLogo(undefined);
    if (!nuevo) return;
    if (!nuevo.size || nuevo.size > 2 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(nuevo.type)) {
      setErrorLogo("Selecciona un PNG, JPG o WebP de hasta 2 MB, que no esté vacío.");
      if (archivoInput.current) archivoInput.current.value = "";
      return;
    }
    setArchivo(nuevo);setPreview(URL.createObjectURL(nuevo));setQuitarLogo(false);
  }
  function quitar() { setArchivo(undefined);setPreview(undefined);setQuitarLogo(Boolean(perfil?.logoUrl));setErrorLogo(undefined);if (archivoInput.current) archivoInput.current.value = ""; }
  const { register, handleSubmit, setError: errorCampo, formState: { errors, isDirty } } = useForm<DatosEmpresa>({ resolver: zodResolver(empresaSchema), defaultValues: {
    legalName: perfil?.legalName ?? "", tradeName: perfil?.tradeName ?? "", rut: perfil?.rut ? formatearRut(perfil.rut) : "", businessActivity: perfil?.businessActivity ?? "", address: perfil?.address ?? "", commune: perfil?.commune ?? "", city: perfil?.city ?? "", email: perfil?.email ?? "", phone: perfil?.phone ?? "",
  } });
  function cerrar() { if (pendiente) return; if (isDirty || archivo || quitarLogo) setConfirmarDescarte(true); else onCerrar(); }
  const submit = handleSubmit(async datos => {
    setError(undefined);const resultado = await onGuardar(datos, archivo, quitarLogo);
    if (!resultado.ok) {
      setError(resultado.mensaje);
      for (const grupo of grupos) for (const campo of grupo.campos) if (resultado.campos?.[campo.nombre]?.[0]) errorCampo(campo.nombre, { message: resultado.campos[campo.nombre]![0] }, { shouldFocus: true });
    }
  });
  return <>
    <Dialog open onOpenChange={abierto => { if (!abierto) cerrar(); }}>
      <DialogContent showCloseButton={!pendiente} className="max-h-[90dvh] overflow-y-auto rounded-lg sm:max-w-2xl" onInteractOutside={event => event.preventDefault()} onEscapeKeyDown={event => { event.preventDefault(); cerrar(); }} onCloseAutoFocus={event => { event.preventDefault(); onRestaurarFoco(); }}>
        <DialogHeader><DialogTitle>{perfil ? "Editar Empresa" : "Configurar empresa"}</DialogTitle><DialogDescription>Todos los campos son opcionales. Puedes completar la configuración gradualmente.</DialogDescription></DialogHeader>
        <form onSubmit={submit} noValidate aria-busy={pendiente} className="space-y-5">
          {error && <Aviso titulo={error} />}
          {grupos.map(grupo => <fieldset key={grupo.titulo} disabled={pendiente} className="space-y-3"><legend className="mb-3 text-sm font-medium">{grupo.titulo}</legend><div className="grid gap-4 sm:grid-cols-2">
            {grupo.campos.map(campo => <div key={campo.nombre} className="space-y-2"><Label htmlFor={`empresa-${campo.nombre}`}>{campo.titulo}</Label><Input id={`empresa-${campo.nombre}`} type={campo.tipo ?? "text"} {...register(campo.nombre)} maxLength={campo.limite} placeholder={campo.placeholder} autoComplete="off" aria-invalid={Boolean(errors[campo.nombre])} aria-describedby={errors[campo.nombre] ? `empresa-${campo.nombre}-error` : campo.nombre === "rut" ? "empresa-rut-ayuda" : undefined} className="h-9" />{campo.nombre === "rut" && <p id="empresa-rut-ayuda" className="text-xs text-muted-foreground">Con o sin puntos y guion; el dígito verificador debe ser correcto.</p>}{errors[campo.nombre] && <p id={`empresa-${campo.nombre}-error`} role="alert" className="text-sm">{errors[campo.nombre]?.message}</p>}</div>)}
          </div></fieldset>)}
          <fieldset disabled={pendiente} className="space-y-3"><legend className="mb-3 text-sm font-medium">Identidad visual</legend>
            <VistaLogo key={archivo ? preview : quitarLogo ? "sin-logo" : perfil?.logoUrl} url={archivo ? preview ?? null : quitarLogo ? null : perfil?.logoUrl ?? null} />
            <Label htmlFor="empresa-logo">Logo</Label><Input ref={archivoInput} id="empresa-logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => seleccionarLogo(event.target.files?.[0])} aria-describedby="empresa-logo-ayuda" aria-invalid={Boolean(errorLogo)} />
            <p id="empresa-logo-ayuda" className="text-xs text-muted-foreground">PNG, JPG o WebP, hasta 2 MB. Se guarda al confirmar el formulario.</p>
            {errorLogo && <p role="alert" className="text-sm">{errorLogo}</p>}
            {(archivo || (perfil?.logoUrl && !quitarLogo)) && <Button type="button" variant="outline" onClick={quitar}>Quitar logo</Button>}
          </fieldset>
          <DialogFooter><Button type="button" variant="outline" disabled={pendiente} onClick={cerrar}>Cancelar</Button><Button type="submit" disabled={pendiente}>{pendiente ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Save aria-hidden="true" />}{pendiente ? "Guardando…" : "Guardar Empresa"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <ConfirmarDescarte abierto={confirmarDescarte} onAbiertoChange={setConfirmarDescarte} onConfirmar={() => { setConfirmarDescarte(false); onCerrar(); }} />
  </>;
}

export function ConfiguracionEmpresa({ perfilInicial }: { perfilInicial: Empresa | null }) {
  const router = useRouter();
  const [perfil, setPerfil] = useState(perfilInicial);
  const [editor, setEditor] = useState(false);
  const [pendiente, setPendiente] = useState(false);
  const botonPrincipal = useRef<HTMLButtonElement>(null);
  function restaurarFoco() { botonPrincipal.current?.focus(); }
  async function actualizar(editar = false) {
    setPendiente(true);
    try { const resultado = await consultarPerfilEmpresa();if (resultado.ok) { setPerfil(resultado.empresa);if (editar) setEditor(true); } else notificar.error(resultado.mensaje); }
    catch { notificar.error("No se pudieron consultar los datos de Empresa. Inténtalo nuevamente."); }
    finally { setPendiente(false); }
  }
  async function guardar(datos: DatosEmpresa, archivo?: File, quitarLogo = false): Promise<ResultadoEmpresa> {
    setPendiente(true);
    try {
      const formulario = new FormData();
      formulario.set("datos", JSON.stringify(datos));
      if (perfil) formulario.set("referencia", JSON.stringify({ updatedAt: perfil.updatedAt }));
      if (archivo) formulario.set("logo", archivo);
      if (quitarLogo) formulario.set("quitarLogo", "true");
      const resultado = await guardarPerfilEmpresa(formulario);
      if (resultado.ok) { setPerfil(resultado.empresa);setEditor(false);notificar.exito(resultado.mensaje);router.refresh(); }
      return resultado;
    } catch { return { ok: false, mensaje: "No se pudo guardar Empresa. Revisa la conexión e inténtalo nuevamente." }; }
    finally { setPendiente(false); }
  }
  const incompleto = perfil && (!perfil.legalName || !perfil.rut);
  return <div className="space-y-6">
    <PageHeader titulo="Empresa" descripcion="Configura los datos de la empresa que utiliza el ERP." acciones={<><Button variant="outline" disabled={pendiente} onClick={() => actualizar()}><RefreshCw aria-hidden="true" />Actualizar</Button><Button ref={botonPrincipal} disabled={pendiente} onClick={() => actualizar(true)}>{pendiente ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Pencil aria-hidden="true" />}{perfil ? "Editar Empresa" : "Configurar empresa"}</Button></>} />
    {!perfil ? <SectionCard titulo="Datos de Empresa"><EmptyState icono={Building2} titulo="Configurar empresa" descripcion="Todavía no hay un perfil guardado. Completa los datos que tengas disponibles para comenzar." /></SectionCard> : <>
      {incompleto && <Aviso tipo="informacion" titulo="Perfil incompleto">Puedes seguir completando los datos. Los requisitos para emitir documentos se definirán en el módulo de Ventas.</Aviso>}
      <div className="grid gap-6 lg:grid-cols-2">{grupos.map(grupo => <SectionCard key={grupo.titulo} titulo={grupo.titulo}><dl className="space-y-4">{grupo.campos.map(campo => <div key={campo.nombre}><dt className="text-xs text-muted-foreground">{campo.titulo}</dt><dd className="mt-1 break-words text-sm">{perfil[campo.nombre] ? campo.nombre === "rut" ? formatearRut(perfil.rut!) : perfil[campo.nombre] : <span className="text-muted-foreground">Sin configurar</span>}</dd></div>)}</dl></SectionCard>)}<SectionCard titulo="Identidad visual"><VistaLogo key={perfil.logoUrl} url={perfil.logoUrl} /></SectionCard></div>
      <p className="text-xs text-muted-foreground">Registro: {fecha(perfil.createdAt)} · Última actualización: {fecha(perfil.updatedAt)}</p>
    </>}
    {editor && <EditorEmpresa perfil={perfil} pendiente={pendiente} onCerrar={() => setEditor(false)} onGuardar={guardar} onRestaurarFoco={restaurarFoco} />}
  </div>;
}
