import { nombreCookieSeguridad } from "@/lib/seguridad/configuracion";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { consultarSesionSeguridad } from "@/lib/seguridad/servicio";
import { PanelAcceso } from "@/components/seguridad/panel";
export default async function Page(){if(!await consultarSesionSeguridad((await cookies()).get(nombreCookieSeguridad("sesion", await headers()))?.value))redirect("/ingresar");return <PanelAcceso/>;}
