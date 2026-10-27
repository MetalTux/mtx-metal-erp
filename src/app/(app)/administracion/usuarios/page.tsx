import { nombreCookieSeguridad } from "@/lib/seguridad/configuracion";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { consultarSesionSeguridad } from "@/lib/seguridad/servicio";
import { tienePermiso } from "@/lib/seguridad/permisos";
import { UsuariosSeguridad } from "@/components/seguridad/usuarios";
export default async function Page(){const user=await consultarSesionSeguridad((await cookies()).get(nombreCookieSeguridad("sesion"))?.value);if(!user)redirect("/ingresar");if(!tienePermiso(user.roles,"usuarios.administrar"))return <p role="alert">Tu perfil no permite administrar usuarios.</p>;return <UsuariosSeguridad/>;}
