# VG9.7 — Flujos y grillas

Fecha: **29-10-2026**. **Completado técnicamente con componentes reales y transporte simulado. Integración y aceptación funcional pendientes.**

## Alcance

Se revisaron flujos representativos de documentos, borradores, confirmaciones, descartes, reintentos y consultas anidadas en Claro y Oscuro. No se modificaron componentes de producción, reglas de negocio, servicios, permisos ni datos durante esta etapa.

Se corrigió **el soporte de validación** `tests/soporte/grillas-navegador.ts`: ahora carga IBM Plex Sans local 400/600 en las pruebas de grillas, guarda la preferencia Claro/Oscuro en la clave real del ERP, define el idioma español y comprueba fuente y tema al capturar. Antes imponía Arial y sólo cambiaba la clase de tema, lo que no garantizaba una preferencia coherente al montar componentes que la consultan. No se atribuyen retrospectivamente estas condiciones a las capturas anteriores.

## Recorridos ejecutados

| Suite | Flujos y comprobaciones representativas |
| --- | --- |
| GD2 | Recepción de Compra: cantidad inválida, seguir editando, descarte, foco y revisión. Respuesta incierta y reintento con mismo contenido. Aceptación parcial de OCC, alcance confirmado, reintento idéntico, modalidad neta/histórica y consulta sin precios. |
| GD3 | Planificación de OT comercial/obra propia: quitar y editar conservando identidad, restricciones comerciales, receta histórica, revisión de mínimos con motivo y distribución por bodega. Descarte de cambios y reintento del borrador idéntico. |
| GD4 | Producción: consumos con identidad y bodega conservadas, revisión obligatoria, reemplazo confirmado, descarte y reintento de lote idéntico. Consultas históricas, perfil de lectura y tablas de cierre/reversión. |
| GD5 | Preparación de entrega: cantidades/conformidad, selección por partida/bodega, descarte y exclusión sin borrar origen. Corrección parcial, recepción física exigida para restituir bienes y reintentos con mismo contenido. |
| GD6 | Historial de abonos/promesas: paginación, consulta anidada y retorno de foco, comprobantes anteriores y corregidos. Enlaces/vistas previas PDF y revocación de otras sesiones, con transporte ficticio. |
| Ventas VG5 | Cotizaciones/OCC: modalidades neta e histórica, edición/corrección, consulta sin precios, detalle técnico y alta de cliente sin perder el borrador principal. |
| Cobranzas VG7 | Abonar, anular, adjuntar y cambiar promesa: revisión, volver a editar, cambio de apariencia sin perder datos, respuesta incierta y reintento conservando argumentos. Escape no descarta una operación incierta. Abono confirmado con adjunto todavía pendiente conserva su referencia en el reintento. |
| Piloto Compras/Dashboard | Acciones visibles y menú Más, consulta, edición y recepción. Errores asociados a campos y foco inicial, altas de proveedor/materia prima anidadas sin sustituir el borrador, cierre protegido y accesos de Dashboard. |

Los límites y las confirmaciones probados son **los de la interfaz con respuestas ficticias**. Reutilizar UUID y argumentos en el cliente no demuestra idempotencia transaccional, stock, deuda o concurrencia del servidor.

## Resultados

- [x] `pnpm grillas:validar`: **7/7** en Oscuro y **7/7** en Claro. Cada ejecución incluye cinco suites de navegador GD2–GD6, requisitos puros de producción y cobertura estática S4; no son catorce flujos independientes.
- [x] **30 capturas de grillas**, a 360/768/1280 px, con CSS del proyecto, IBM Plex Sans local y tema comprobados. Sin formularios anidados ni desborde horizontal de página/diálogo en esas capturas.
- [x] Ventas VG5: **92 entradas** de evidencia correctas.
- [x] Cobranzas VG7: **88 entradas** correctas.
- [x] Piloto Compras/Dashboard: **22 entradas** correctas, incluidas ventanas de 1440/768/360/640 px. Su caso de 640 px es reflow, no zoom de navegador.
- [x] `pnpm lint`, sin advertencias.
- [x] Compilación alternativa `pnpm exec next build --webpack`, tipos y rutas correctos.
- [x] Huellas SHA-256, enlaces y diff revisados.

Se intentó el comando habitual `pnpm build` bajo un límite de **90 segundos** para evitar repetir la espera de VG9.6. Permaneció en compile y se agotó el límite (salida 124 del limitador; el proceso hijo terminó por SIGTERM). Se validó Webpack sin cambiar package.json. No se afirma un error EPERM no observado.

## Evidencia y reproducción

```bash
pnpm grillas:validar var/validacion/diseno-global-vg9-7/grillas-oscuro
GRILLAS_TEMA=claro pnpm grillas:validar var/validacion/diseno-global-vg9-7/grillas-claro
DISENO_EVIDENCIA_DIR=var/validacion/diseno-global-vg9-7/ventas pnpm exec tsx tests/diseno-global-vg5.ui.ts
DISENO_EVIDENCIA_DIR=var/validacion/diseno-global-vg9-7/cobranza pnpm exec tsx tests/diseno-global-vg7.ui.ts
DISENO_EVIDENCIA_DIR=var/validacion/diseno-global-vg9-7/compras-piloto pnpm exec tsx tests/piloto-visual.ui.ts
pnpm lint
pnpm build
# Alternativa usada después del límite de espera:
pnpm exec next build --webpack
```

Índice e informes: `var/validacion/diseno-global-vg9-7/resultado.json` y sus subdirectorios. El índice registra 116 huellas de fuentes/componentes, pruebas y fuentes tipográficas: **una huella no significa que se haya ejecutado cada componente**. Los informes originales de las suites permanecen separados; no se suman las capturas como si fueran casos independientes de negocio.

Capturas seleccionadas, exclusivamente ficticias:

- [Corrección de entrega, Oscuro móvil](capturas/diseno-global-vg9-7/gd5-oscuro-360.png).
- [Compra en edición, Claro móvil](capturas/diseno-global-vg9-7/formulario-claro-360.png).
- [Abono con resultado incierto, Oscuro](capturas/diseno-global-vg9-7/oscuro-abono-incierto.png).
- [Alta de cliente anidada, Claro](capturas/diseno-global-vg9-7/claro-alta-cliente.png).

Las capturas GD incluyen botones del panel de pruebas para abrir escenarios; no representan navegación completa del ERP ni nuevos controles de producción.

## Límites y pendientes

- [ ] Recorridos autenticados con Next, cuentas y roles reales, en un entorno de ensayo autorizado.
- [ ] Guardados/idempotencia/concurrencia reales en una copia descartable de PostgreSQL; comprobar efectos de stock, deuda y documentos.
- [ ] Carga/descarga y contenido real de comprobantes/PDF, persistencia de archivos y revocación efectiva de sesiones del servidor.
- [ ] Aceptación del usuario; lector de pantalla real de VG9.4 y dispositivos físicos/otros motores de VG9.5.

Estas pruebas sustituyen acciones, consultas, router o API según cada suite. Los enlaces PDF e iframe comprobados no demuestran integridad de archivos reales. No se ejecutó un flujo integral Cotización→OCC→OT→Guía→Cobranza sobre una misma base; cada tramo usa contratos ficticios explícitos. No se cierra por arrastre GD7, S7, Cobranzas ni validaciones funcionales de otros hitos.

Sin migraciones, seed, provisión de usuarios, cambios de credenciales ni escrituras en PostgreSQL. No se inició servidor de aplicación para estos fixtures. Manual/PDF final queda en VG9.10.

**Siguiente: VG9.8 — Conservación de reglas y documentos.**
