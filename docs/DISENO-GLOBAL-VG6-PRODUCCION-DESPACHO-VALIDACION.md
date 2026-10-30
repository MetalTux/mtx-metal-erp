# VG6.2 Producción y VG6.3 Despacho — validación

Fecha: **29-10-2026**. Completa la implementación visual de VG6 tras [VG6.1 Trabajos](DISENO-GLOBAL-VG6-TRABAJOS-VALIDACION.md). **Revisión funcional del usuario pendiente.**

## Cambios

- Producción: ayudas de 13 px, acciones que se distribuyen en varias líneas y contención del editor de consumo/consulta anidada. Grillas de ejecución, recursos, reservas y trazabilidad mantienen columnas y cifras.
- Cierre, factura externa y reversiones mantienen componentes, condiciones y confirmaciones existentes; heredan la base global. Se revisan con fixtures; no se reescriben sus reglas.
- Despacho: título de 23 px, espaciado compacto, paginación adaptable, encabezados/cifras alineados. Listado, preparación, partidas y compromiso comercial tienen regiones horizontales enfocables con anillo visible.
- Consulta/editor de guía: mínimo de ancho y overscroll controlados, trazabilidad de 13 px. El texto sobre permisos se corrige porque la aplicación ya los verifica.
- Historiales PDF mantienen enlaces y bytes archivados; sólo se ajustan presentación de ayudas y distribución de acciones.

No cambia esquema, consultas de dominio, servicios, stock, reservas, UUID de operaciones, deuda, facturas, pagos ni permisos. Sin migraciones o escrituras en PostgreSQL. Manual actualizado y PDF regenerado.

## Comprobaciones ejecutadas

| Comprobación | Resultado y alcance |
| --- | --- |
| `pnpm lint` | Correcto |
| `pnpm build` | Bloqueado por restricción del entorno al crear proceso/puerto interno de Turbopack; no es un error de TypeScript |
| `pnpm exec next build --webpack` | Correcto: compilación, tipos y generación de rutas |
| `pnpm exec tsx tests/diseno-global-vg6-produccion-despacho.ui.ts` | 78 escenarios: 13 superficies × Claro/Oscuro × 360/768/1280 px; sin errores de navegador ni desborde horizontal de documento |
| Contraste compuesto de textos visibles en la galería | 2304 mediciones; mínimo 5,79:1. Incluye celdas, botones habilitados, títulos, etiquetas y enlaces; no equivale a auditoría exhaustiva de cada estado |
| `pnpm grillas:validar var/validacion/diseno-global-vg6-produccion-despacho/grillas` | 7/7 ensayos correctos con tema oscuro |
| `GRILLAS_TEMA=claro pnpm grillas:validar var/validacion/diseno-global-vg6-produccion-despacho/grillas-claro` | 7/7 ensayos correctos con tema claro |
| `pnpm manual:pdf` | Manual PDF actualizado |

Galería: producción, consulta, consulta de sólo lectura, cierre, factura, reversión, anulación de obra propia, historial PDF, salida, devolución, consulta de guía, listado y listado vacío. Renderiza componentes reales; reemplaza acceso, consultas y acciones por fixtures. El bloqueo explícito de importación de Prisma impide conectar a la base real. No se emiten documentos.

Regresiones GD4/GD5: revisión obligatoria, identidad de consumos/distribuciones, descarte y reemplazo, límites conjuntos, conformidad, devolución parcial y recepción física; conservan payload y UUID ante respuesta incierta. GD6 cubre consulta anidada/foco, historial PDF y permisos con transporte simulado. Cobertura estática S4 conserva 93 acciones, 25 páginas, 7 rutas y 127 entradas asíncronas. No acredita autorización de servidor mediante sesiones reales.

Evidencia completa y resultados JSON en `var/validacion/diseno-global-vg6-produccion-despacho/` (local, ignorada por Git). Capturas seleccionadas en [capturas/diseno-global-vg6-produccion-despacho](capturas/diseno-global-vg6-produccion-despacho/):

- [Consulta de producción en Claro](capturas/diseno-global-vg6-produccion-despacho/claro-consulta-1280.png).
- [Producción en Oscuro](capturas/diseno-global-vg6-produccion-despacho/oscuro-produccion-1280.png).
- [Listado móvil en Claro](capturas/diseno-global-vg6-produccion-despacho/claro-listado-360.png).
- [Consulta móvil de guía en Oscuro](capturas/diseno-global-vg6-produccion-despacho/oscuro-guia-360.png).

Se inspeccionaron capturas renderizadas de consulta, guía y listado móvil; las columnas anchas se desplazan dentro de sus tablas. No se inició servidor de validación. No se detuvo ningún servidor del usuario; al cierre no se detectaron escuchas en 3030/3031/3032.

## Pendientes y continuidad

- [ ] Conformidad visual/funcional del usuario con datos y perfiles reales, sin dar por aprobadas validaciones anteriores.
- [ ] Zoom real al 200%, lector de pantalla y recorrido completo de teclado con tecnologías de asistencia. La galería comprueba disponibilidad de foco y la regresión controla diálogos; no sustituye esas revisiones.
- [ ] Emisión/descarga real de PDF y operaciones reales de producción/devolución en entorno de prueba autorizado, si se necesita renovar esa evidencia.

**Siguiente desarrollo: VG7 Cobranzas.** No reabrir servicios o recalcular documentos para continuar el cambio visual.
