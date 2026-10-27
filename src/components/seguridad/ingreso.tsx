"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notificar } from "@/components/alertas/notificaciones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LONGITUD_MINIMA_CLAVE, LONGITUD_MAXIMA_CLAVE, DESCRIPCION_LONGITUD_CLAVE } from "@/config/politica-contrasenas";
import { solicitarAcceso } from "./cliente";
export function Ingreso({modo="login",disponible}:{modo?:"login"|"activate"|"reset";disponible:boolean}){
 const router=useRouter();
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[repeat,setRepeat]=useState(""),[code,setCode]=useState(""),[factor,setFactor]=useState(false),[token,setToken]=useState(""),[visible,setVisible]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{
  if(modo==="login"){
   const acceso=new URLSearchParams(location.search).get("acceso");
   if(acceso==="activado"||acceso==="recuperado"){
    const aviso=acceso==="activado"?"Cuenta activada. Inicia sesión con tu contraseña.":"Contraseña guardada. Inicia sesión; tu doble factor se conserva.";
    queueMicrotask(()=>{setMessage(aviso);notificar.exito(aviso);});history.replaceState(null,"",location.pathname);
   }
   return;
  }
  const consumir=()=>{const value=new URLSearchParams(location.hash.slice(1)).get("token");if(value){history.replaceState(null,"",location.pathname);queueMicrotask(()=>setToken(value));}};
  consumir();window.addEventListener("hashchange",consumir);return()=>window.removeEventListener("hashchange",consumir);
 },[modo]);
 async function enviar(e:FormEvent){e.preventDefault();if(busy)return;if(modo!=="login"&&password!==repeat){setMessage("Las contraseñas no coinciden.");notificar.error("Las contraseñas no coinciden.");return;}
 setBusy(true);const r=await solicitarAcceso(factor?{action:"factor-login",code}:modo==="login"?{action:"login",email,password}:{action:modo,token,password});setBusy(false);const aviso=r.message??(r.ok?"Datos confirmados.":"No se pudo ingresar.");setMessage(aviso);if(!r.ok)notificar.error(aviso);
// eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Recargar el documento descarta el estado y caché de la identidad anterior al cambiar de sesión.
 if(r.ok&&r.factor){setFactor(true);setPassword("");setMessage("Ingresa el código de tu aplicación o un código personal de respaldo.");}else if(r.ok&&modo==="login"){location.assign("/");}else if(r.ok){setPassword("");setRepeat("");setToken("");router.replace(`/ingresar?acceso=${modo==="activate"?"activado":"recuperado"}`);}
 }
 async function recuperar(){setBusy(true);const r=await solicitarAcceso({action:"recover",email});setBusy(false);const aviso=r.message??"Revisa el correo y vuelve a intentar.";setMessage(aviso);if(r.ok)notificar.informacion(aviso);else notificar.error(aviso);}
 return <section className="mx-auto w-full max-w-md space-y-5 rounded-xl border border-border bg-card p-6 shadow-lg">
 <h1 className="text-2xl font-semibold">{modo==="activate"?"Activar acceso":modo==="reset"?"Recuperar contraseña":"Iniciar sesión"}</h1>
 <p className="text-sm text-muted-foreground">MTX Metal ERP · Usa tu cuenta personal autorizada.</p>
 {!disponible&&<p role="alert" className="text-sm">El acceso aún no está configurado. Contacta al Administrador.</p>}
 <form onSubmit={enviar} className="space-y-4">
 {modo==="login"&&!factor&&<label className="block space-y-2 text-sm">Correo<Input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required disabled={busy||!disponible}/></label>}
 {!factor&&<><label className="block space-y-2 text-sm">{modo==="login"?"Contraseña":"Contraseña nueva"}<Input type={visible?"text":"password"} autoComplete={modo==="login"?"current-password":"new-password"} minLength={modo==="login"?undefined:LONGITUD_MINIMA_CLAVE} maxLength={LONGITUD_MAXIMA_CLAVE} value={password} onChange={e=>setPassword(e.target.value)} required disabled={busy||!disponible}/></label><Button type="button" variant="ghost" size="sm" onClick={()=>setVisible(!visible)}>{visible?"Ocultar contraseña":"Mostrar contraseña"}</Button></>}
 {modo!=="login"&&<><p className="text-xs text-muted-foreground">Usa de {DESCRIPCION_LONGITUD_CLAVE}. Puedes usar una frase.</p><label className="block space-y-2 text-sm">Repetir contraseña<Input type="password" autoComplete="new-password" value={repeat} onChange={e=>setRepeat(e.target.value)} required disabled={busy||!disponible}/></label></>}
 {factor&&<label className="block space-y-2 text-sm">Código de aplicación o respaldo<Input autoComplete="one-time-code" value={code} onChange={e=>setCode(e.target.value)} required disabled={busy}/></label>}
 <Button className="w-full" disabled={busy||!disponible||(modo!=="login"&&!token)}>{busy?"Comprobando…":factor?"Verificar código":modo==="login"?"Ingresar":"Guardar contraseña"}</Button>
 </form>
 {message&&<p role="status" className="break-words text-sm">{message}</p>}
 {modo==="login"&&!factor&&<Button variant="link" className="h-auto whitespace-normal px-0 text-info-foreground" disabled={busy||!email||!disponible} onClick={recuperar}>Olvidé mi contraseña</Button>}
 {factor&&<Button variant="outline" onClick={()=>{setFactor(false);setCode("");setMessage("");}}>Volver a ingresar</Button>}
 {modo!=="login"&&<Link className="block text-sm text-info-foreground underline" href="/ingresar">Volver al inicio de sesión</Link>}
 <details className="text-sm"><summary className="cursor-pointer">¿Cómo ingreso?</summary><p className="mt-2 text-muted-foreground">El Administrador debe habilitar tu cuenta. Si pierdes tu móvil, usa tus códigos personales de respaldo. Recuperar la contraseña no desactiva el doble factor. El ingreso con Google se habilitará en una etapa posterior.</p></details>
 </section>;
}
