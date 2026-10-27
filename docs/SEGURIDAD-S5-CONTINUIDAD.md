# S5 — Checkpoint de implementación

Fecha: 21-10-2026. **S5 terminado técnicamente y validado. Limpieza completada. Siguiente hito: S6.**

## Alcance autorizado

Auditoría consultable sólo por Administrador, eventos sin secretos con retención de 12 meses y autoría permanente de nuevas operaciones. Google S3 continúa pospuesto. No se atribuye historia anterior a los usuarios nuevos ni se modifican PDF históricos.

## Cambios terminados

- [x] Validar `src/lib/seguridad/autoria.ts`: actor fijado por la guarda dentro de la tx; autoría después del hecho y antes del commit; UUID original de los diarios de operación; sin reasignar autor en reintentos.
- [x] Validar los 61 puntos de registro en servicios: diarios de Compras/Inventario/Terminado/Cotizaciones/OCC/OT/Guías; PDF/imagen nuevos; CRUD/configuración/mínimos. Los hijos, saldos y folios automáticos quedan bajo el hecho padre, sin atribución duplicada.
- [x] Validar `metadatos.ts`, `servicio.ts`, `acceso.ts` y `archivos.ts`: tipo de navegador clasificado, IP sólo con proxy confiable, expiración de sesión una sola vez y denegaciones limitadas; sin cuerpos, tokens ni códigos.
- [x] Validar `/administracion/auditoria`: eventos/autoría, filtros y paginación; acceso sólo Administrador; búsqueda de documentos anteriores muestra «Sin autoría registrada».
- [x] Validar depuración: control de origen, permiso y reautenticación de cinco minutos dentro de la tx; corte PostgreSQL de 12 meses; conservar autoría y registrar la ejecución.
- [x] Validar accesos desde menú/buscador y enlaces desde documentos al visor, con rótulos en español.
- [x] Ejecutar integración/Chromium/cobertura y regresiones pertinentes, lint/build; registrar resultados exactos.
- [x] Retirar copia/fixtures/servidor propios; revisar diff y puertos; actualizar hito/CAMBIOS/operación/AGENTS y dejar siguiente paso explícito.

## Para continuar sin releer el desarrollo

1. S5 no requiere más implementación. Leer este checkpoint y sección 23 de `HITO-INICIO-SESION-SEGURIDAD.md`; S3 continúa pospuesto.
2. Siguiente hito: **S6**, regresión integral de negocio y preparación operativa. S7 mantiene la aprobación funcional del usuario.
3. No hubo cambios de esquema/migraciones en S5; se reutilizaron tablas, índices y triggers de conservación S1.
4. Pendiente de instalación S6: tarea diaria `pnpm seguridad:depurar-auditoria --aplicar`, proxy/IP confiable, HTTPS y restauración conjunta. El comando sin `--aplicar` sólo simula. No configurar ni ejecutar fixtures sobre producción para repetir estas pruebas.
5. Conservar los cambios anteriores de G/S1/S2/S4 al revisar git; no hacer push. La prueba compartida G6 sólo amplió su guarda a copias locales S5 para reutilizar el circuito de pruebas, sin permitir la base real.

## Resultados ya obtenidos

Integración S5 correcta en copia: actor del formulario ignorado; fallo inducido en autoría revierte el hecho; reintentos de producto/guía desde otro Administrador conservan autor; ciclo con PRODUCTO/MATERIA_PRIMA/SERVICIO/A_MEDIDA, producción/devolución y tres PDF nuevos con autor; invariantes de stock/Kardex/reservas; OCC anterior sigue sin autoría. Retención conserva evento de 11 meses y autoría de 13 meses, retira evento de 13 meses y exige reautenticación. CLI probado en simulación y con `--aplicar`, sólo en la copia. Expiración se registra una vez y el historial no contiene contraseñas, tokens ni UA crudo. Cobertura S4 actualizada: 25 páginas/88 acciones/seis archivos/119 servicios; cobertura S5: 61 puntos. Regresión S1 correcta. Lint y tipos correctos.

Cierre de validación: se corrigieron el localizador del selector en Chromium y el literal BigInt del test, usando `BigInt(1)` conforme al target TypeScript. Build/lint/tipos y Chromium completo correctos: visor exclusivo, filtros, enlaces, historia anterior, confirmación/reautenticación, acción HTTP directa denegada y vistas 375/1440 sin errores JS. La numeración registra MODIFICAR y no atribuye los folios automáticos como ediciones manuales. No se instaló tarea periódica en el servidor del usuario; programarla corresponde a S6.


## Cierre y evidencia

- [x] Build, lint y tipos finales correctos, con el literal BigInt corregido.
- [x] Chromium completo y comprobación adicional de Ctrl+K: Administrador accede; Ventas no encuentra Auditoría.
- [x] Copia `mtx_validacion_seguridad_s5_20261021`, dump, claves/credenciales y PDF temporales eliminados; servidor propio detenido. Puertos 3030/3031 libres.
- [x] Hito/checks, CAMBIOS, operación, avances de interfaz, cierre V1 y AGENTS actualizados.

Evidencias locales privadas en `backups/20261021_seguridad_s5/`, ignoradas por git. El log de integración incluye el fallo inducido de rollback previsto por la prueba; la comprobación final pasó. Base/cuentas de trabajo y archivos históricos sin escrituras; sin migraciones, seed ni push.

**Pendientes reales: S6** (regresión integral, HTTPS/proxy, tarea diaria de retención y restauración) **y S7** (aprobación funcional). No hace falta reconstruir ni repetir la implementación S5 para continuar.
