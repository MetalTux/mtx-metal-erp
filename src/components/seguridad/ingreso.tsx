"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, Eye, EyeOff, LoaderCircle, ShieldCheck } from "lucide-react";
import { notificar } from "@/components/alertas/notificaciones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LONGITUD_MINIMA_CLAVE, LONGITUD_MAXIMA_CLAVE, DESCRIPCION_LONGITUD_CLAVE } from "@/config/politica-contrasenas";
import { solicitarAcceso } from "./cliente";

export function Ingreso({ modo = "login", disponible }: { modo?: "login" | "activate" | "reset"; disponible: boolean }) {
  const router = useRouter();
  const factorPrevio = useRef(false);
  const correo = useRef<HTMLInputElement>(null), codigo = useRef<HTMLInputElement>(null), respuesta = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [repeat, setRepeat] = useState(""), [code, setCode] = useState("");
  const [factor, setFactor] = useState(false), [token, setToken] = useState(""), [enlaceRevisado, setEnlaceRevisado] = useState(false);
  const [visible, setVisible] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState(false);
  const nuevaClave = modo !== "login", sinEnlace = nuevaClave && enlaceRevisado && !token;
  const bloqueado = busy || !disponible || (nuevaClave && !token);

  useEffect(() => {
    if (modo === "login") {
      const acceso = new URLSearchParams(location.search).get("acceso");
      if (acceso === "activado" || acceso === "recuperado") {
        const aviso = acceso === "activado" ? "Cuenta activada. Inicia sesión con tu contraseña." : "Contraseña guardada. Inicia sesión; tu doble factor se conserva.";
        queueMicrotask(() => { setMessage(aviso); notificar.exito(aviso); });
        history.replaceState(null, "", location.pathname);
      }
      return;
    }
    const consumir = () => {
      const value = new URLSearchParams(location.hash.slice(1)).get("token");
      if (value) history.replaceState(null, "", location.pathname);
      queueMicrotask(() => { if (value) setToken(value); setEnlaceRevisado(true); });
    };
    consumir(); window.addEventListener("hashchange", consumir);
    return () => window.removeEventListener("hashchange", consumir);
  }, [modo]);

  useEffect(() => {
    if (factor) codigo.current?.focus();
    else if (factorPrevio.current) correo.current?.focus();
    factorPrevio.current = factor;
  }, [factor]);
  useEffect(() => { if (error && message) respuesta.current?.focus(); }, [error, message]);

  function informar(aviso: string, fallo: boolean) {
    setMessage(aviso); setError(fallo);
    if (fallo) notificar.error(aviso);
  }
  async function enviar(e: FormEvent) {
    e.preventDefault(); if (bloqueado) return;
    if (nuevaClave && password !== repeat) { informar("Las contraseñas no coinciden. Revisa ambos campos.", true); return; }
    setBusy(true); setError(false); setMessage("");
    const r = await solicitarAcceso(factor ? { action: "factor-login", code } : modo === "login" ? { action: "login", email, password } : { action: modo, token, password });
    setBusy(false);
    informar(r.message ?? (r.ok ? "Datos confirmados." : "No se pudo ingresar."), !r.ok);
    if (r.ok && r.factor) {
      setFactor(true); setPassword(""); setVisible(false);
      setMessage("Ingresa el código de tu aplicación o un código personal de respaldo.");
    } else if (r.ok && modo === "login") {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Descarta el estado y caché de la identidad anterior al cambiar de sesión.
      location.assign("/");
    } else if (r.ok) {
      setPassword(""); setRepeat(""); setToken("");
      router.replace(`/ingresar?acceso=${modo === "activate" ? "activado" : "recuperado"}`);
    }
  }
  async function recuperar() {
    if (busy || !disponible || !correo.current?.reportValidity()) return;
    setBusy(true); setError(false); setMessage("");
    const r = await solicitarAcceso({ action: "recover", email });
    setBusy(false);
    const aviso = r.message ?? "Revisa el correo y vuelve a intentar.";
    informar(aviso, !r.ok); if (r.ok) notificar.informacion(aviso);
  }

  return <section aria-labelledby="acceso-titulo" className="mx-auto w-full max-w-[26rem] rounded-lg border border-border bg-card p-5 sm:p-6">
    <header className="mb-5 space-y-2">
      <h1 id="acceso-titulo" className="text-[23px] leading-tight font-semibold">{factor ? "Verificar tu identidad" : modo === "activate" ? "Activar acceso" : modo === "reset" ? "Recuperar contraseña" : "Iniciar sesión"}</h1>
      <p className="text-[13px] leading-normal text-muted-foreground">{factor ? "Completa el segundo paso para entrar a tu espacio de trabajo." : nuevaClave ? "Define una contraseña para tu cuenta personal autorizada." : "Ingresa con tu cuenta personal autorizada."}</p>
    </header>
    {!disponible && <div role="alert" className="mb-4 rounded-md border border-warning/50 bg-warning/10 p-3 text-sm">El acceso aún no está configurado. Contacta al Administrador.</div>}
    {sinEnlace && <div role="alert" className="mb-4 rounded-md border border-warning/50 bg-warning/10 p-3 text-sm">Falta el enlace de {modo === "activate" ? "activación" : "recuperación"}. Abre el enlace completo recibido. Si ya no está disponible, {modo === "activate" ? "solicita uno nuevo al Administrador" : "solicita uno nuevo desde el inicio de sesión"}.</div>}
    <form onSubmit={enviar} aria-busy={busy} className="space-y-4">
      {modo === "login" && !factor && <label className="block space-y-1.5 text-sm" htmlFor="acceso-correo"><span>Correo</span><Input ref={correo} id="acceso-correo" name="email" className="h-10" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={e => setEmail(e.target.value)} required disabled={busy || !disponible} /></label>}
      {!factor && <div className="space-y-1.5">
        <label htmlFor="acceso-clave" className="text-sm">{nuevaClave ? "Contraseña nueva" : "Contraseña"}</label>
        <div className="relative"><Input id="acceso-clave" name="password" className="h-10 pr-12" type={visible ? "text" : "password"} autoComplete={nuevaClave ? "new-password" : "current-password"} aria-describedby={nuevaClave ? "acceso-requisitos" : undefined} minLength={nuevaClave ? LONGITUD_MINIMA_CLAVE : undefined} maxLength={LONGITUD_MAXIMA_CLAVE} value={password} onChange={e => setPassword(e.target.value)} required disabled={bloqueado} /><Button type="button" variant="ghost" size="icon" className="absolute top-0 right-0 h-10 w-10" aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={visible} aria-controls="acceso-clave" disabled={bloqueado} onClick={() => setVisible(!visible)}>{visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</Button></div>
      </div>}
      {nuevaClave && <><p id="acceso-requisitos" className="text-[13px] text-muted-foreground">Usa de {DESCRIPCION_LONGITUD_CLAVE}. Puedes usar una frase.</p><label className="block space-y-1.5 text-sm" htmlFor="acceso-repetir"><span>Repetir contraseña</span><Input id="acceso-repetir" name="password-confirmation" className="h-10" type="password" autoComplete="new-password" maxLength={LONGITUD_MAXIMA_CLAVE} value={repeat} onChange={e => setRepeat(e.target.value)} required disabled={bloqueado} /></label></>}
      {factor && <label className="block space-y-1.5 text-sm" htmlFor="acceso-codigo"><span>Código de aplicación o respaldo</span><Input ref={codigo} id="acceso-codigo" name="code" className="h-10 font-mono" autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} value={code} onChange={e => setCode(e.target.value)} required disabled={busy} /><span className="block text-[13px] text-muted-foreground">También puedes usar uno de tus códigos personales de un solo uso.</span></label>}
      <Button className="h-10 w-full" disabled={bloqueado}>{busy && <LoaderCircle aria-hidden="true" className="animate-spin" />}{busy ? "Comprobando…" : factor ? "Verificar código" : modo === "login" ? "Ingresar" : "Guardar contraseña"}</Button>
    </form>
    {message && <div ref={respuesta} tabIndex={-1} role={error ? "alert" : "status"} className={`mt-4 flex gap-2 rounded-md border p-3 text-sm break-words focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${error ? "border-destructive/50 bg-destructive/10" : "border-border bg-info text-info-foreground"}`}>{error ? <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}<p className="min-w-0">{message}</p></div>}
    {modo === "login" && !factor && <div className="mt-3"><Button variant="link" className="h-auto min-h-10 whitespace-normal px-0 disabled:text-muted-foreground disabled:opacity-100" disabled={busy || !email || !disponible} onClick={recuperar}>Olvidé mi contraseña</Button><p className="text-[13px] text-muted-foreground">Ingresa tu correo para solicitar recuperación. Si necesitas ayuda, contacta al Administrador.</p></div>}
    {factor && <Button variant="outline" className="mt-4 h-10 w-full" disabled={busy} onClick={() => { setFactor(false); setCode(""); setMessage(""); setError(false); }}>Volver a ingresar</Button>}
    {nuevaClave && <Link className="mt-4 block py-2 text-sm text-link underline underline-offset-4" href="/ingresar">Volver al inicio de sesión</Link>}
    <details className="mt-5 border-t border-border pt-4 text-[13px]"><summary className="w-fit cursor-pointer text-link">¿Cómo ingreso?</summary><p className="mt-2 leading-normal text-muted-foreground">El Administrador debe habilitar tu cuenta. Si pierdes tu móvil, usa tus códigos personales de respaldo. Recuperar la contraseña no desactiva el doble factor. El ingreso con Google se habilitará en una etapa posterior.</p></details>
  </section>;
}
