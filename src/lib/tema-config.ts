/** Preferencia visual local: independiente de cuentas, sesiones y cookies de seguridad. */
export const CLAVE_TEMA = "mtx-apariencia";
export type PreferenciaTema = "oscuro" | "claro" | "sistema";
export type TemaEfectivo = "oscuro" | "claro";
export function esPreferenciaTema(valor: unknown): valor is PreferenciaTema {
  return valor === "oscuro" || valor === "claro" || valor === "sistema";
}

// Script constante y autocontenido: se ejecuta en head antes del contenido visible.
// No interpolar datos del usuario. Si falta almacenamiento/media query, usar Oscuro.
export const SCRIPT_INICIAL_TEMA = `(()=>{let p="oscuro";try{const v=localStorage.getItem("${CLAVE_TEMA}");if(v==="oscuro"||v==="claro"||v==="sistema")p=v;}catch{}let d=p!=="claro";if(p==="sistema"){try{d=typeof matchMedia==="function"?matchMedia("(prefers-color-scheme: dark)").matches:true;}catch{d=true;}}const r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";r.dataset.temaPreferencia=p;})();`;
