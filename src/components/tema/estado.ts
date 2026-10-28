"use client";
import { useSyncExternalStore } from "react";
import { CLAVE_TEMA, esPreferenciaTema, type PreferenciaTema, type TemaEfectivo } from "@/lib/tema-config";

type EstadoTema = Readonly<{ preferencia: PreferenciaTema; efectivo: TemaEfectivo; listo: boolean; temporal: boolean }>;
const servidor: EstadoTema = { preferencia: "oscuro", efectivo: "oscuro", listo: false, temporal: false };
let actual = servidor;
let sinPersistencia = false;
const suscriptores = new Set<() => void>();
let media: MediaQueryList | undefined;

function temaEfectivo(preferencia: PreferenciaTema): TemaEfectivo {
  if (preferencia !== "sistema") return preferencia;
  return media ? media.matches ? "oscuro" : "claro" : "oscuro";
}
function aplicar(preferencia: PreferenciaTema) {
  const efectivo = temaEfectivo(preferencia);
  const raiz = document.documentElement;
  raiz.classList.toggle("dark", efectivo === "oscuro");
  raiz.style.colorScheme = efectivo === "oscuro" ? "dark" : "light";
  raiz.dataset.temaPreferencia = preferencia;
  if (actual.listo && actual.preferencia === preferencia && actual.efectivo === efectivo && actual.temporal === sinPersistencia) return;
  actual = { preferencia, efectivo, listo: true, temporal: sinPersistencia };
  for (const notificar of suscriptores) notificar();
}
function cambioSistema() { if (actual.preferencia === "sistema") aplicar("sistema"); }
function cambioAlmacenamiento(evento: StorageEvent) {
  if (evento.key !== CLAVE_TEMA && evento.key !== null) return;
  try { if (evento.storageArea !== window.localStorage) return; } catch { return; }
  sinPersistencia = false;
  aplicar(esPreferenciaTema(evento.newValue) ? evento.newValue : "oscuro");
}
function iniciar() {
  try { media = window.matchMedia("(prefers-color-scheme: dark)"); } catch { media = undefined; }
  let preferencia: PreferenciaTema = actual.listo ? actual.preferencia : esPreferenciaTema(document.documentElement.dataset.temaPreferencia) ? document.documentElement.dataset.temaPreferencia : "oscuro";
  if (!actual.listo || !sinPersistencia) {
    try { const guardada = window.localStorage.getItem(CLAVE_TEMA); preferencia = esPreferenciaTema(guardada) ? guardada : "oscuro"; } catch { sinPersistencia = true; }
  }
  aplicar(preferencia);
  media?.addEventListener("change", cambioSistema);
  window.addEventListener("storage", cambioAlmacenamiento);
}
function suscribir(notificar: () => void) {
  suscriptores.add(notificar);
  if (suscriptores.size === 1) iniciar();
  return () => {
    suscriptores.delete(notificar);
    if (!suscriptores.size) { media?.removeEventListener("change", cambioSistema); window.removeEventListener("storage", cambioAlmacenamiento); media = undefined; }
  };
}
const leer = () => actual;
const leerServidor = () => servidor;
export function useTema() { return useSyncExternalStore(suscribir, leer, leerServidor); }
export function elegirTema(preferencia: PreferenciaTema) {
  if (!esPreferenciaTema(preferencia)) return;
  try { window.localStorage.setItem(CLAVE_TEMA, preferencia); sinPersistencia = false; } catch { sinPersistencia = true; }
  aplicar(preferencia);
}
