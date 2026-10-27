import assert from "node:assert/strict";
import { origenesSeguridad, origenPeticionSeguridad } from "../src/lib/seguridad/origenes-desarrollo";
import { origenSeguridadPermitido } from "../src/lib/seguridad/origen";
import { nombreCookieSeguridad } from "../src/lib/seguridad/configuracion";
const publico = "https://b1315pk2-3030.brs.devtunnels.ms", local = "http://localhost:3030";
const h = (host: string, origin: string, site = "same-origin") => new Headers({ host, "x-forwarded-host": host, origin, "sec-fetch-site": site });
assert.deepEqual(origenesSeguridad(publico, "development", local), [publico, local]);
assert.deepEqual(origenesSeguridad(publico, "production", local), [publico]);
assert.deepEqual(origenesSeguridad(publico, "test", local), [publico]);
for (const extra of ["http://192.168.1.137:3030", "https://*.devtunnels.ms", "https://otro.example", `${local}/ruta`, `${local}?x=1`, `${local}#x`, "https://usuario:clave@uno.devtunnels.ms", "no-es-url", `${local},`]) assert.throws(() => origenesSeguridad(publico, "development", extra));
const localhost = h("localhost:3030", local), tunel = h(new URL(publico).host, "http://localhost:3030");
assert(origenSeguridadPermitido(localhost, publico, "development", local));
assert(origenSeguridadPermitido(tunel, publico, "development", local));
assert(origenSeguridadPermitido(h(new URL(publico).host, publico), publico, "development", local));
assert(!origenSeguridadPermitido(localhost, publico, "production", local));
assert(!origenSeguridadPermitido(h(new URL(publico).host, publico, "cross-site"), publico, "development", local));
assert(!origenSeguridadPermitido(h(new URL(publico).host, "https://ajeno.example"), publico, "development", local));
assert(!origenSeguridadPermitido(h("otro.devtunnels.ms", "https://localhost:3030"), publico, "development", local));
assert.equal(origenPeticionSeguridad(localhost, publico, "development", local), local);
assert.equal(origenPeticionSeguridad(tunel, publico, "development", local), publico);
assert.equal(origenPeticionSeguridad(localhost, publico, "production", local), publico);
const anterior = { NODE_ENV: process.env.NODE_ENV, SEGURIDAD_ORIGEN: process.env.SEGURIDAD_ORIGEN, SEGURIDAD_ORIGENES_DESARROLLO: process.env.SEGURIDAD_ORIGENES_DESARROLLO };
try {
  Object.assign(process.env, { NODE_ENV: "development", SEGURIDAD_ORIGEN: publico, SEGURIDAD_ORIGENES_DESARROLLO: local });
  assert.equal(nombreCookieSeguridad("sesion", localhost), "mtx_sesion");
  assert.equal(nombreCookieSeguridad("sesion", tunel), "__Host-mtx_sesion");
  assert.equal(nombreCookieSeguridad("desafio", localhost), "mtx_desafio");
  assert.equal(nombreCookieSeguridad("desafio", tunel), "__Host-mtx_desafio");
  Object.assign(process.env, { NODE_ENV: "production" });
  assert.equal(nombreCookieSeguridad("sesion", localhost), "__Host-mtx_sesion");
} finally {
  for (const [key, value] of Object.entries(anterior)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
}
console.log("Orígenes simultáneos: localhost/túnel autorizados sólo en desarrollo; cookies por host, configuración inválida, cross-site y producción verificados.");
