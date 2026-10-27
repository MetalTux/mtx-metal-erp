import { ZodError } from "zod";
import { ErrorConfiguracionSeguridad } from "./configuracion";
import { DESCRIPCION_LONGITUD_CLAVE } from "@/config/politica-contrasenas";
const mensajesPermitidos=new Set([
 "Ejecuta en una terminal local interactiva.",
 "La provisión inicial exige destino PostgreSQL local verificado.",
 "Falta DATABASE_URL o su formato no es válido.",
 "Las contraseñas no coinciden",
 "Ya existe un Administrador activo. Usa Administración → Usuarios.",
 "La cuenta no admite provisión inicial.",
 "No se puede reemplazar un factor existente.",
 "La cuenta no admite recuperación administrativa local.",
 "La cuenta no es un Administrador activo.",
]);
/** Mensajes controlados: nunca imprimir errores crudos de URL, Zod o Prisma. */
export function mensajeErrorProvision(error:unknown){
 if(error instanceof ErrorConfiguracionSeguridad)return error.message;
 if(error instanceof ZodError){
  if(error.issues.some(i=>i.path[0]==="password"))return `La contraseña debe tener ${DESCRIPCION_LONGITUD_CLAVE}.`;
  if(error.issues.some(i=>i.path[0]==="email"))return "Ingresa un correo válido de hasta 254 caracteres.";
  return "Revisa el nombre (2 a 100 caracteres) y los datos del titular.";
 }
 if(error instanceof Error&&mensajesPermitidos.has(error.message))return error.message;
 const code=typeof error==="object"&&error!==null&&"code" in error?String(error.code):"";
 if(code==="P1000")return "PostgreSQL rechazó la conexión. Revisa las credenciales de DATABASE_URL sin compartirlas.";
 if(code==="P1001"||code==="ECONNREFUSED")return "No se pudo conectar a PostgreSQL. Comprueba que el servicio local esté disponible.";
 if(code==="P2021"||code==="P2022")return "La estructura de seguridad no está disponible. Revisa pnpm prisma migrate status.";
 if(code==="P2002")return "El correo ya está registrado. Revisa la cuenta existente antes de provisionar otra.";
 return "No se pudo completar la provisión. Comprueba PostgreSQL y pnpm prisma migrate status; no se muestran detalles internos para proteger credenciales.";
}
