# S6 — Validación técnica y operación

Fecha: 22-10-2026. **Completado en el alcance local aprobado por el usuario: validar localmente y dejar el despliegue preparado.** Todavía no existe servidor/dominio definitivo. No se instaló un servicio público ni un timer real. S3 Google continúa pospuesto; S7 requiere aprobación funcional del usuario.

## Checklist terminado

- [x] Regresión completa: **48/48 escenarios correctos**, cada uno con copia PostgreSQL independiente y credencial real cuando corresponde.
- [x] Autenticación, contraseña 8–128, TOTP/códigos/concurrencia, recuperación asistida y SMTP TLS local, sesiones/revocación y último Administrador.
- [x] Seis roles y unión Ventas/Cobranza; páginas, acciones, DTO y archivos protegidos. Chromium S4/S5 correcto.
- [x] Auditoría/autoría, rollback inducido, idempotencia y retención a 12 meses; sin autoría ficticia ni eliminación de autoría histórica.
- [x] Regresión comercial/productiva/inventario y tres familias PDF; invariantes y archivos históricos conservados.
- [x] Referencias de planes sin stock/movimientos y legado preparado antes de OT, reproduciendo después las migraciones SQL versionadas. No desactivar triggers.
- [x] HTTPS/proxy local: cookies Secure/HttpOnly/SameSite y `__Host-`, tamaño, origen/límite/no-store, TOTP, reinicio, revocación y anchos 320/375/768/1440 sin errores JavaScript.
- [x] Repetición HTTPS tras corregir la normalización del origen: `HTTPS` en mayúsculas conserva el prefijo seguro. Política/configuración también verificadas por pruebas unitarias.
- [x] Respaldo/restauración de PostgreSQL, configuración/claves y seis almacenes, con huellas/manifiestos. Sesión y factor recuperados desde una copia real antes de probar su revocación.
- [x] CLI `seguridad:revocar-restauracion`: simulación/aplicación, rollback atómico, enlaces/desafíos invalidados y factores/códigos/roles/contraseñas/autoría conservados.
- [x] Plantillas de servicio, proxy y timer diario preparadas, sin instalarlas. Sintaxis systemd verificada en copias temporales con Node adaptado.
- [x] Dependencias actualizadas; instalación con `--frozen-lockfile`, lint, build, tipos, Prisma validate/generate/status y coberturas correctos. 37 migraciones existentes al día; ninguna migración S6.
- [x] Auditoría: **0 avisos de producción**. Queda **1 aviso de desarrollo**, `braces` 3.0.3, GHSA-vfj7-8cjw-p6xm; sin versión corregida informada. No se oculta el aviso ni se fuerza una versión inexistente.
- [x] Operación, restauración/conciliación e incidencias documentadas; hito, CAMBIOS, interfaz, cierre V1 y AGENTS actualizados.
- [x] Copias/fixtures/certificados/servidores propios retirados; puertos de validación libres. Base, entorno privado y archivos de trabajo sin cambios. Respaldos/evidencias privados conservados e ignorados por git.

## Evidencia y rutas para retomar

El barrido final válido está en `backups/20261022_seguridad_s6/1792669373949/`: `resultados.json` y `resumen.json` registran 48/48, restauración y origen/almacenes sin cambios. La repetición final de HTTPS está en `1792670501584/`, 1/1. Las primeras ejecuciones contienen fallos de fixtures posteriormente corregidos: no son el resultado final. Los directorios son privados; contienen datos/configuración y no deben publicarse.

- Ejecutor: `scripts/validar-seguridad-s6.ts`, comando `pnpm seguridad:validar-s6`; admite nombres de escenarios para repetir sólo afectados. Requiere base local de referencia configurada, Docker, cliente generado, build y Chromium. No ejecutar mientras se escribe en el origen.
- Restauración: `src/lib/seguridad/restauracion.ts`, `scripts/revocar-accesos-restauracion.ts`; `pnpm seguridad:revocar-restauracion` simula y `--aplicar` ejecuta. Nunca usar el comando contra la base de trabajo para comprobarlo.
- Pruebas nuevas: `referencias-plan.integration.ts`, `seguridad-restauracion.integration.ts`, agregadores de recuperación/navegador S6 y `seguridad-s6.ui.ts`; fixtures de credencial/plan/servidor bajo `tests/fixtures/`.
- Dependencias: Next/ESLint 16.3.8, Sharp 0.35.5, Prisma 7.10.1 y parches transitivos compatibles. `tsx`/`dotenv` son dependencias de producción para los comandos operativos; shadcn sólo de desarrollo.
- Operación: `docs/OPERACION-SEGURIDAD.md`; plantillas e instrucciones en `deploy/seguridad/README.md`.

Se conservan cambios previos G/S1–S5 sin commit. Sin push ni cambios de cuentas reales. No hace falta volver a investigar S1–S5 para continuar: el siguiente trabajo funcional es S7.

## Verificación futura del despliegue real

El usuario confirmó que todavía no hay servidor y pidió dejarlo preparado. Estos puntos quedan **diferidos**, sin presentarlos como ejecutados:

- [ ] Adaptar dominio, usuario, Node, rutas, almacenes y Chromium al destino. Este host usa NVM; `/usr/bin/node` de las plantillas requiere adaptación. Nginx requiere validación en el destino real; el proxy funcional del ensayo fue local.
- [ ] Instalar/verificar HTTPS público, proxy, certificados, firewall, arranque/reinicio y recuperación conjunta en el servidor definitivo.
- [ ] Habilitar y verificar el timer diario de retención y establecer la política/responsables de respaldos del destino.
- [ ] Conciliar bajas, permisos y factores cambiados después de cualquier respaldo antes de reabrir acceso. Cada titular regenera sus códigos personales bajo mantenimiento controlado; ningún Administrador desactiva factores ajenos.
- [ ] Validar SMTP real si se configura; Google sigue fuera del alcance mientras S3 permanezca pospuesto.

La aprobación funcional general S7 sigue pendiente y no se obtiene por aprobar pruebas técnicas.
