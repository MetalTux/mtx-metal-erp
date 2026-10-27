import { nombreCookieSeguridad } from "@/lib/seguridad/configuracion";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { consultarSesionSeguridad } from "@/lib/seguridad/servicio";
import { PanelAcceso } from "@/components/seguridad/panel";
export default async function Page(){if(!await consultarSesionSeguridad((await cookies()).get(nombreCookieSeguridad("sesion"))?.value))redirect("/ingresar");return <PanelAcceso/>;}
