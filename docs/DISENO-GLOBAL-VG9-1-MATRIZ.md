# VG9.1 — Matriz de rutas y evidencia

Fecha: **29-10-2026**. **Inventario y artefactos verificados; aceptación final pendiente.**

## Resultado

- 29 páginas existentes, todas asignadas a una etapa visual.
- 26 límites de carga/error y un límite 404 incluidos.
- 25 entradas de navegación con página; las cuatro páginas públicas de acceso quedan fuera del menú.
- 224 PNG comprobados por existencia, firma y ancho: Claro/Oscuro × móvil/escritorio. Resultados JSON previos con `ok: true`; alias contrastados con los casos de sus ensayos.
- Ocho rutas HTTP: siete de archivos y una API de seguridad; no son pantallas adicionales.
- Incidencias de inventario/artefactos: **0**.

## Cómo leer la matriz

**F**: componentes reales con consultas/API/acciones simuladas. **P**: GET público real de producción; no acredita sesión ni operaciones. **F/P**: ambas clases de evidencia. Las páginas de activar/recuperar usan GET públicos para sus capturas y también tienen casos de formulario simulados en VG2.

**C/O**: ambas apariencias comprobadas en los archivos. La evidencia previa se ha localizado, no regenerado. No existe una huella de todas las dependencias de cada ensayo: VG9.1 no certifica que cada captura coincida píxel a píxel con el árbol actual. Los cambios compartidos posteriores se deben cubrir en la regresión final VG9.9.

**Aceptación G/P**: conformidad general del piloto registrada, aprobación final pendiente. **P**: revisión visual/final pendiente. Autorizar la etapa siguiente o aprobar una función del dominio no se interpreta como aceptar toda su interfaz. No se marca ninguna página con aceptación final.

## Páginas

| Ruta | Hito / alcance | Móvil C/O | Escritorio C/O | Fuente / alias | Aceptación |
| --- | --- | --- | --- | --- | --- |
| `/administracion/auditoria` | VG8 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg8` / `auditoria` | P |
| `/administracion/usuarios` | VG8 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg8` / `usuarios` | P |
| `/compras` | Piloto/VG1 · F | 360 px ✓ | 1440 px ✓ | `piloto-visual` / `compras` | G/P |
| `/configuracion/empresa` | VG3 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg3` / `empresa` | P |
| `/configuracion/iva` | VG3 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg3` / `iva` | P |
| `/configuracion/numeracion` | VG3 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg3` / `numeracion` | P |
| `/inventario/ajustes` | VG4 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg4` / `ajustes` | P |
| `/inventario/movimientos` | VG4 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg4` / `movimientos` | P |
| `/inventario/productos-terminados` | VG4 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg4` / `terminado` | P |
| `/inventario/stock` | VG4 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg4` / `stock` | P |
| `/inventario/traslados` | VG4 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg4` / `traslados` | P |
| `/mantenedores/bodegas` | VG3 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg3` / `bodegas` | P |
| `/mantenedores/clientes` | VG3 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg3` / `clientes` | P |
| `/mantenedores/condiciones-pago` | VG3 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg3` / `condiciones` | P |
| `/mantenedores/materiales` | VG3 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg3` / `materiales` | P |
| `/mantenedores/productos` | VG3 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg3` / `productos` | P |
| `/mantenedores/proveedores` | VG3 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg3` / `proveedores` | P |
| `/mantenedores/unidades` | VG3 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg3` / `unidades` | P |
| `/mi-acceso` | VG8 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg8` / `panel` | P |
| `/` | Piloto/VG1 · F | 360 px ✓ | 1440 px ✓ | `piloto-visual` / `dashboard` | G/P |
| `/trabajos/despachos` | VG6 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg6-produccion-despacho` / `listado` | P |
| `/trabajos/ordenes` | VG6 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg6-trabajos` / `listado` | P |
| `/ventas/cobranza` | VG7 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg7` / `listado` | P |
| `/ventas/cotizaciones` | VG5 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg5` / `cotizaciones` | P |
| `/ventas/ordenes` | VG5 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg5` / `ordenes` | P |
| `/acceso-denegado` | VG2/VG8 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg8` / `denegado` | P |
| `/activar` | VG2 · P | 360 px ✓ | 1280 px ✓ | `piloto-visual/next` / `activar` | P |
| `/ingresar` | VG2 · F | 360 px ✓ | 1280 px ✓ | `diseno-global-vg2` / `ingreso` | P |
| `/recuperar` | VG2 · P | 360 px ✓ | 1280 px ✓ | `piloto-visual/next` / `recuperar` | P |

Las fuentes están en `var/validacion/<fuente>/`; sus nombres de archivo exactos, dimensiones y SHA-256 figuran en el informe local `var/validacion/diseno-global-vg9-1/resultado.json`. Las capturas locales están ignoradas por Git. Para revisión portable se conservan las muestras de las etapas, enlazadas debajo.

## Documentos y muestras permanentes

- [Piloto: alcance y validación](HITO-PILOTO-VISUAL.md) · [capturas](capturas/piloto-visual/).
- [VG2: alcance y validación](DISENO-GLOBAL-VG2-VALIDACION.md) · [capturas](capturas/diseno-global-vg2/).
- [VG3: alcance y validación](DISENO-GLOBAL-VG3-VALIDACION.md) · [capturas](capturas/diseno-global-vg3/).
- [VG4: alcance y validación](DISENO-GLOBAL-VG4-VALIDACION.md) · [capturas](capturas/diseno-global-vg4/).
- [VG5: alcance y validación](DISENO-GLOBAL-VG5-VALIDACION.md) · [capturas](capturas/diseno-global-vg5/).
- [VG6 Trabajos: alcance y validación](DISENO-GLOBAL-VG6-TRABAJOS-VALIDACION.md) · [capturas](capturas/diseno-global-vg6-trabajos/).
- [VG6 Producción/Despacho: alcance y validación](DISENO-GLOBAL-VG6-PRODUCCION-DESPACHO-VALIDACION.md) · [capturas](capturas/diseno-global-vg6-produccion-despacho/).
- [VG7: alcance y validación](DISENO-GLOBAL-VG7-VALIDACION.md) · [capturas](capturas/diseno-global-vg7/).
- [VG8: alcance y validación](DISENO-GLOBAL-VG8-VALIDACION.md) · [capturas](capturas/diseno-global-vg8/).

## Estados y pantallas complementarias

| Estado | Archivo | Evidencia |
| --- | --- | --- |
| `estado-0` | `src/app/(app)/compras/error.tsx` | VG8 · C/O · 360/1280 px |
| `estado-1` | `src/app/(app)/compras/loading.tsx` | VG8 · C/O · 360/1280 px |
| `estado-2` | `src/app/(app)/configuracion/empresa/error.tsx` | VG8 · C/O · 360/1280 px |
| `estado-3` | `src/app/(app)/configuracion/empresa/loading.tsx` | VG8 · C/O · 360/1280 px |
| `estado-4` | `src/app/(app)/inventario/ajustes/error.tsx` | VG8 · C/O · 360/1280 px |
| `estado-5` | `src/app/(app)/inventario/ajustes/loading.tsx` | VG8 · C/O · 360/1280 px |
| `estado-6` | `src/app/(app)/inventario/movimientos/error.tsx` | VG8 · C/O · 360/1280 px |
| `estado-7` | `src/app/(app)/inventario/movimientos/loading.tsx` | VG8 · C/O · 360/1280 px |
| `estado-8` | `src/app/(app)/inventario/stock/error.tsx` | VG8 · C/O · 360/1280 px |
| `estado-9` | `src/app/(app)/inventario/stock/loading.tsx` | VG8 · C/O · 360/1280 px |
| `estado-10` | `src/app/(app)/inventario/traslados/error.tsx` | VG8 · C/O · 360/1280 px |
| `estado-11` | `src/app/(app)/inventario/traslados/loading.tsx` | VG8 · C/O · 360/1280 px |
| `estado-12` | `src/app/(app)/mantenedores/bodegas/error.tsx` | VG8 · C/O · 360/1280 px |
| `estado-13` | `src/app/(app)/mantenedores/bodegas/loading.tsx` | VG8 · C/O · 360/1280 px |
| `estado-14` | `src/app/(app)/mantenedores/clientes/error.tsx` | VG8 · C/O · 360/1280 px |
| `estado-15` | `src/app/(app)/mantenedores/clientes/loading.tsx` | VG8 · C/O · 360/1280 px |
| `estado-16` | `src/app/(app)/mantenedores/condiciones-pago/error.tsx` | VG8 · C/O · 360/1280 px |
| `estado-17` | `src/app/(app)/mantenedores/condiciones-pago/loading.tsx` | VG8 · C/O · 360/1280 px |
| `estado-18` | `src/app/(app)/mantenedores/materiales/error.tsx` | VG8 · C/O · 360/1280 px |
| `estado-19` | `src/app/(app)/mantenedores/materiales/loading.tsx` | VG8 · C/O · 360/1280 px |
| `estado-20` | `src/app/(app)/mantenedores/proveedores/error.tsx` | VG8 · C/O · 360/1280 px |
| `estado-21` | `src/app/(app)/mantenedores/proveedores/loading.tsx` | VG8 · C/O · 360/1280 px |
| `estado-22` | `src/app/(app)/mantenedores/unidades/error.tsx` | VG8 · C/O · 360/1280 px |
| `estado-23` | `src/app/(app)/mantenedores/unidades/loading.tsx` | VG8 · C/O · 360/1280 px |
| `estado-24` | `src/app/(app)/trabajos/despachos/error.tsx` | VG8 · C/O · 360/1280 px |
| `estado-25` | `src/app/(app)/trabajos/despachos/loading.tsx` | VG8 · C/O · 360/1280 px |
| `404 (sin URL propia)` | `src/app/not-found.tsx` | VG8 · C/O · 360/1280 px |

El 404 también conserva GET real con estado HTTP 404 en ambos temas y ancho 360 px (`diseno-global-vg8/http/resultado.json` y capturas de VG8). Su render no otorga permisos al Dashboard.

## Rutas HTTP, separadas de la matriz visual

- `src/app/api/cobranza/comprobantes/[id]/route.ts`.
- `src/app/api/cotizaciones/imagenes/[archivo]/route.ts`.
- `src/app/api/cotizaciones/pdfs/[emision]/route.ts`.
- `src/app/api/empresa/logo/[archivo]/route.ts`.
- `src/app/api/guias/pdfs/[emision]/route.ts`.
- `src/app/api/productos/imagenes/[archivo]/route.ts`.
- `src/app/api/seguridad/route.ts`.
- `src/app/api/trabajos/pdfs/[emision]/route.ts`.

Se conserva el alcance de seguridad y de documentos de sus hitos: inventariar una descarga no verifica autorización, bytes ni estados HTTP de todas las APIs. No se ejecutaron peticiones en esta etapa.

## Brechas y continuación

- [x] Páginas, navegación, límites, fuentes y artefactos cotejados.
- [x] Estado de aceptación explícito: dos conformidades generales del piloto; 29 aprobaciones finales pendientes.
- [ ] VG9.2: tema predeterminado/persistencia/Sistema, navegación y pestañas.
- [ ] VG9.3–VG9.8: contraste, teclado/lector/zoom, responsive/contenido, perfiles, flujos y conservación de reglas/documentos.
- [ ] VG9.9: ejecutar regresión sobre el estado final; no reemplazarla por los resultados anteriores localizados aquí.
- [ ] VG9.10–VG9.11: documentación final y conformidad del usuario.

**VG9.1 completado como auditoría de cobertura. Siguiente VG9.2.** No cambia aplicación, pruebas, datos ni manual; no se ejecutan build, servidores, migraciones o suites por este cambio documental. Los pendientes de S7/Cobranzas/Inventario conservan su estado.
