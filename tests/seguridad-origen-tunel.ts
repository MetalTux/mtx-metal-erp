import assert from "node:assert/strict";
import { origenSeguridadPermitido } from "../src/lib/seguridad/origen";

const origen = "https://b1315pk2-3030.brs.devtunnels.ms";
const base = {
  origin: "http://localhost:3030",
  "sec-fetch-site": "same-origin",
  "x-forwarded-host": new URL(origen).host,
};
const permite = (valores: Record<string, string>, entorno = "development", url = origen) =>
  origenSeguridadPermitido(new Headers(valores), url, entorno);

assert(permite(base));
assert(permite({ ...base, origin: "https://localhost:3030" }));
assert(permite({ origin: base.origin, "sec-fetch-site": "same-origin", host: base["x-forwarded-host"] }));
assert(permite({ origin: origen }, "production"));
assert(permite({ origin: "http://localhost:3030" }, "development", "http://localhost:3030"));
assert(!permite(base, "production"));
assert(!permite(base, "test"));
for (const sitio of ["cross-site", "same-site", "none", ""]) {
  assert(!permite({ ...base, "sec-fetch-site": sitio }));
}
for (const host of ["otro.devtunnels.ms", "localhost:3030", `${base["x-forwarded-host"]}, otro`, ""]) {
  assert(!permite({ ...base, "x-forwarded-host": host }));
}
for (const recibido of ["https://malicioso.example", "null", "", "http://localhost:3000"]) {
  assert(!permite({ ...base, origin: recibido }));
}
assert(!permite({ ...base, origin: origen, "sec-fetch-site": "cross-site" }));
assert(!permite(base, "development", "https://erp.example.cl"));
assert(!permite(base, "development", "https://falso.devtunnels.ms.example.cl"));
console.log("Origen: túnel en desarrollo permitido; producción, otros hosts y solicitudes ajenas rechazados.");
