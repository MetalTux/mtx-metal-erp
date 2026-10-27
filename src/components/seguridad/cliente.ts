export type UsuarioSeguridad={id:number;name:string;email:string;roles:string[];version:number;factor:boolean;localAllowed:boolean};
export type FilaUsuario={userId:number;name:string;normalizedEmail:string;roles:string[];status:string;securityVersion:number;lastLoginAt:string|null};
export type SesionPropia={id:string;current:boolean;createdAt:string;lastActivityAt:string;expiresAt:string};
export type ResultadoAcceso={ok:boolean;loginRequired?:boolean;reauthRequired?:boolean;message?:string;factor?:boolean;user?:UsuarioSeguridad;sessions?:SesionPropia[];rows?:FilaUsuario[];total?:number;codes?:string[];secret?:string;setup?:string;uri?:string;link?:string};
export async function solicitarAcceso(datos:Record<string,unknown>):Promise<ResultadoAcceso>{
// eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Recargar el documento descarta el estado y caché de la identidad anterior al cambiar de sesión.
 try{const r=await fetch("/api/seguridad",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(datos),cache:"no-store"});const result:ResultadoAcceso=await r.json();if(result.loginRequired)window.location.assign("/ingresar");return result;}
 catch{return {ok:false,message:"No se recibió respuesta. Consulta el estado antes de repetir; una operación puede haberse confirmado."};}
}
export const nombresRoles:Record<string,string>={ADMINISTRADOR:"Administrador",VENTAS:"Ventas",COMPRAS_BODEGA:"Compras y Bodega",PRODUCCION_DESPACHO:"Producción y Despacho",COBRANZA:"Cobranza",CONSULTA_GERENCIA:"Consulta/Gerencia"};
