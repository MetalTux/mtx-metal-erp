# Revisión para cerrar la versión 1

Fecha: 20-10-2026. Revisión del código, esquema, rutas, pruebas disponibles y checkpoints de los hitos. Este documento propone el alcance y los criterios de salida; no supone aprobación de nuevas reglas ni autoriza implementar todos los pendientes.

## Resultado

El circuito Cotización → Orden de Compra Cliente → Orden de Trabajo/Producción → Guía de Despacho está implementado. OCC y OT tienen cierre funcional registrado; Guías G0–G6 fue aprobado por el usuario el 20-10-2026. No es necesario reconstruir estos módulos para llegar a V1.

Los principales faltantes comprobados son **cierre operativo en producción y aprobación funcional de seguridad**, **operación de Cobranza**, **Dashboard con consultas reales**, **facilidad de uso y manual completo** y **preparación verificable de la operación en producción**. Además hay revisiones funcionales y documentos antiguos por conciliar.

Se propone una V1 para una empresa, con inventario, compras, ventas, fabricación propia/comercial, despacho y cobranza; documentos internos y registro de factura externa, sin emisión tributaria electrónica. El destino de instalación y los roles concretos deben definirse antes de cerrar sus respectivos bloques. No se encontró una especificación única de V1 previamente cerrada.

## Estado comprobado

| Área | Implementación existente | Qué falta para el cierre |
| --- | --- | --- |
| Mantenedores/configuración | Unidades, bodegas, proveedores, clientes/sucursales, materiales, condiciones de pago, empresa/cuentas, numeración e IVA | Conciliar aprobaciones y configuración inicial del entorno final; no tratarlos como módulos ausentes. |
| Inventario | Stock/Kardex, mínimos, ajustes/iniciales, traslados de materia prima; terminado con iniciales, ajustes, producción y salidas | Revisión funcional pendiente de Traslados y recorrido integral. Traslados de terminado no se deducen de los de materia prima. |
| Compras | Registro, recepción parcial, cierre de pendiente, anulación y ayudas | Funcionalidades previas aprobadas; revisión visual de ayudas/cierre aún documentada como pendiente. |
| Cotizaciones/PDF | Importes, IVA histórico, editor/imágenes, estados y revisiones PDF | PDF aprobado; conciliar revisiones antiguas del formulario/editor. Envío SMTP P6 sin implementar. |
| OCC | Contratación parcial, importes propios, folio, cuenta única y anulación controlada | Hito cerrado. PDF/adjuntos propios no forman parte del alcance cerrado D10. |
| OT/Producción | Plan, reservas, inicio, ejecución, consumos, terminado, reversión, finalización, factura/vencimiento y PDF | Hito cerrado. Permisos integrados en S4; autoría nueva integrada en S5. |
| Guías/Entregas | Salidas, prestaciones, correcciones parciales/completas, consulta/historial y PDF | Hito cerrado. Manual general y mejoras de usabilidad posteriores registradas. |
| Cobranza | Cuenta única desde OCC; abonos/anulaciones, comprobantes privados, promesas con historial, enlaces OCC/OT/guías y resumen agregado | C1/C2 aprobados. C3 habilitado localmente y C4 técnico validado; revisiones funcionales C3/C4 y cierre expreso pendientes. Guía OPERACION-COBRANZAS.md y checkpoint sección 10 de HITO-COBRANZAS.md. |
| Acceso/usuarios | S1 estructura y S2 local: login/activación/recuperación, usuarios/roles, sesiones y factor personal | Google S3 pospuesto; autorización de módulos anteriores S4 implementada/validada técnicamente. S5 implementado/validado técnicamente; S6 validado localmente (48/48) y despliegue preparado por alcance aprobado. Instalación real diferida; S7 pendiente. No hay cierre funcional general. El seed ya no crea credenciales fijas. |
| Inicio/avisos | Dashboard con indicadores reales, consumo/reservas por material/bodega, OT, cotizaciones próximas, cohortes mensuales, movimientos y campana interna por permisos | Revisión funcional D1–D5 y rendimiento con volumen representativo pendientes; ver HITO-DASHBOARD.md. No hay correo automático ni leído/no leído. |

## Bloques pendientes, en orden recomendado

### V1.1 — Acceso, usuarios y permisos

Plan descriptivo y seguimiento: [HITO-INICIO-SESION-SEGURIDAD.md](HITO-INICIO-SESION-SEGURIDAD.md). En revisión; seis roles combinables, correo/contraseña + Google opcional y uso por Internet con equipos personales aprobados el 20-10-2026. Gestión de usuarios exclusiva del Administrador, recuperación por correo con SMTP/asistida y sesión 60 min/8 h también aprobadas. Matriz por empresa, TOTP opcional personal y correcciones por área aprobados (D07/D08/D10); auditoría y recuperación de factor D09/D08-R aprobadas: eventos 12 meses con IP/navegador, acceso sólo Administrador, autoría conservada y códigos personales para todos. Decisiones funcionales resueltas; S1 implementado y validado técnicamente (estructura, bibliotecas, inventario y contrato). S2 local implementado y validado: login/panel/usuarios y sesiones nuevas protegidos. S3 Google pospuesto el 21-10-2026; S4 implementado y validado técnicamente: páginas, acciones, servicios/DTO y archivos protegidos. S5 implementado/validado técnicamente; S6 validado localmente (48/48) y despliegue preparado por alcance aprobado. Instalación real diferida; S7 pendiente. Checkpoint en sección 24 del hito y SEGURIDAD-S6-CONTINUIDAD.md.

Requisito de salida recomendado antes de uso compartido real. Definir perfiles y operaciones permitidas, incluyendo consultas, datos comerciales, configuración, ajustes, anulaciones y pagos.

- [x] S2 local: login, sesión, salida/expiración y administración mínima de usuarios, con validación técnica en copia/navegador; Google pospuesto S3.
- [x] Hash Argon2id y provisión CLI inicial; seed sin creación de credenciales fijas (S1/S2).
- [x] Autorizar en servidor cada lectura/escritura protegida: páginas, Server Actions y rutas de archivos/PDF. Ocultar botones no basta.
- [x] Definir y registrar autoría de operaciones nuevas relevantes, preservando el historial anterior sin inventar usuarios históricos.
- [x] Probar acceso anónimo, permisos insuficientes, acceso directo a acciones/archivos, sesiones vencidas y cambios de permisos.

Evidencia: `src/app/(app)/layout.tsx`, `src/components/layout/app-topbar.tsx`, acciones en `src/app/(app)`, rutas en `src/app/api`, modelos de usuarios y `prisma/seed.ts`. La existencia de esos modelos no implementa protección.

### V1.2 — Cobranza operativa

La cuenta y su vencimiento ya existen; completar la operación sobre ellos. No duplicar deuda por guía ni volver a crear cuenta al cobrar.

- [x] Definir el hito específico de Cobranza y resolver reglas aún abiertas: medios/comprobantes, correcciones/anulaciones, promesas, fechas permitidas y permisos. Anticipos y abonos graduales pertenecen a la cuenta de la OCC.
- [x] Listado paginado con filtros y detalle por cliente/OCC: importe acordado, abonos vigentes, saldo, factura, vencimiento y promesa independiente.
- [x] Registrar anticipos/abonos con UUID estable y control transaccional de sobrepagos/concurrencia; reintento idéntico devuelve el mismo resultado y clave con contenido distinto se rechaza.
- [x] Corregir/anular abonos con motivo, autorización e historial; no borrar pagos confirmados ni cambiar su importe silenciosamente.
- [x] Derivar estado de pago y vencimiento por separado; excluir cuentas anuladas y no usar estados heredados de las guías como pagos.
- [x] Validar pago parcial/completo, anticipo sin factura, vencimiento hoy/Santiago, sobrepago, doble envío, carreras, rollback y conservación de stock/documentos.

Evidencia: `src/app/(app)/ventas/cobranza/page.tsx`, `src/lib/servicios/ordenes-compra-cliente.ts`, `src/lib/servicios/cierre-trabajo.ts`, `AccountReceivable`/`Payment` y [PROPUESTAS-DOMINIO.md](PROPUESTAS-DOMINIO.md). Las decisiones posteriores de OCC/OT/Guías prevalecen sobre propuestas iniciales.

### V1.3 — Inicio y seguimiento con datos reales

- [x] Implementar consultas agregadas para los indicadores visibles: cotizaciones, OT activas, saldo por cobrar y reposición por bodega.
- [x] Conectar requerimientos/disponibilidad, trabajos, cotizaciones por vencer, comparación mensual y últimos movimientos; precisar antes las definiciones de cada indicador.
- [x] Respetar permisos, cantidades/unidades, saldos/reservas y fechas Santiago; distinguir cero de error o falta de configuración.
- [x] Resolver el alcance de la campana: alertas internas mínimas o retirar su promesa provisional de V1. Notificaciones persistentes, correo automático y preferencias pueden ser posteriores.
- [x] Verificar cifras contra datos controlados de módulos de origen en copias y permisos en regresión S4.
- [ ] Medir consultas con un volumen representativo y obtener aprobación funcional del Dashboard.

Evidencia: `src/app/(app)/page.tsx` y `src/components/layout/app-topbar.tsx`. Es un desarrollo pendiente, no un problema de base vacía.

### V1.4 — Facilidad de uso y manual completo

Observación expresa del usuario: algunas funciones son difíciles de identificar y falta facilitar el uso a personas con distintos niveles de experiencia.

- [ ] Revisar recorridos por tarea: comprar/recibir, reservar/fabricar, entregar/devolver y cobrar; hacer visibles las acciones y el siguiente paso.
- [ ] Explicar bloqueos con causa y solución, distinguir hechos independientes (guardar/recibir, producir/entregar, finalizar/facturar/cobrar) y usar términos consistentes.
- [ ] Revisar ayudas de teclado/táctil, foco, móvil, errores y confirmaciones con usuarios representativos; no sustituir esta revisión por pruebas automáticas.
- [x] Primera edición textual del manual por tareas/perfil, con ejemplos, configuración inicial, correcciones y recuperación: MANUAL-USUARIO.md.
- [ ] Preparar capturas con datos ficticios/anonimizados y revisar el manual con usuarios. Existen guías específicas de Seguridad, OT, Guías, Cobranzas y Dashboard; no sustituyen un manual completo del ERP.
- [ ] Validar el manual sobre la interfaz estabilizada, incluyendo Cobranza y acceso/roles.

La revisión puede empezar ahora; las capturas y el manual definitivo deben cerrarse después de estabilizar esos módulos.

### V1.5 — Revisiones y regresión integral

- [ ] Conciliar revisiones pendientes de Traslados, Empresa, Clientes/sucursales, condiciones de pago/IVA y editor de Cotizaciones con las aprobaciones realmente documentadas. No solicitar de nuevo aprobaciones ya registradas ni cerrar por inferencia.
- [ ] Revisar ayudas nuevas de Compras y presentación de Productos/Bodegas donde sus checkpoints aún indican revisión visual pendiente.
- [ ] Ejecutar un recorrido completo en copia descartable: compra/recepción → cotización mixta → OCC/anticipo → OT/reservas → fabricación → entrega parcial → finalización/factura → devolución/reentrega → cobro final. Añadir obra propia sin cuenta ni despacho comercial.
- [ ] Repetir regresiones relevantes de concurrencia, idempotencia, rollback, permisos y archivos; conciliar stock/Kardex, reservas y cuentas al terminar.
- [ ] Proveer comandos reproducibles de validación y copias aisladas. Existen pruebas TypeScript/Playwright; falta un comando general de pruebas en `package.json` y no se encontró un flujo CI versionado.
- [ ] Obtener aceptación funcional global de V1 y registrar incidencias resueltas o expresamente diferidas.

No hay evidencia suficiente para afirmar un cierre funcional completo de todos los módulos sólo por los checks de G6.

### V1.6 — Instalación, respaldo y entrega

- [ ] Definir entorno final, acceso HTTPS, proceso de aplicación, PostgreSQL, variables y almacenamiento persistente; probar los PDF con Chromium y sus dependencias en ese entorno.
- [ ] Documentar instalación/actualización y reemplazar el README genérico (hoy indica puerto 3000; desarrollo real usa 3030).
- [ ] Preparar respaldo programado, retención y **ensayo de restauración conjunta** de PostgreSQL, logos, imágenes y PDF históricos. Los respaldos locales de hitos no acreditan una recuperación operativa del destino final.
- [ ] Verificar recuperación después de reinicio/actualización, registros de errores y control de capacidad; probar el procedimiento de recuperación de una actualización fallida.
- [ ] Configurar empresa, sucursales, cuentas, IVA, folios, usuarios y saldos iniciales reales sin seed ficticio ni cambios retrospectivos de documentos.
- [ ] Revisar el conjunto de cambios actual, preparar la entrega versionada y sus notas; el usuario realiza los envíos a GitHub. `package.json` aún dice `0.1.0`, lo que por sí solo no determina si el producto está listo.

Almacenes identificados: `EMPRESA_LOGO_DIR`, `PRODUCTO_IMAGEN_DIR`, `COTIZACION_IMAGEN_DIR`, `COTIZACION_PDF_DIR`, `TRABAJO_PDF_DIR`, `GUIA_PDF_DIR`, con sus directorios locales predeterminados en `var/`. No es obligatorio migrarlos a S3 para V1 si el destino garantiza persistencia y respaldo coherente.

## Funciones que pueden quedar fuera de V1

Estas exclusiones son una propuesta de alcance, no decisiones nuevas del usuario:

| Función | Tratamiento recomendado |
| --- | --- |
| Envío de cotizaciones por correo (PDF P6) | Diferible si descargar/enviar manualmente cubre la operación. Si se exige en V1: faltan configuración SMTP segura, destinatario/revisión, confirmación e historial/reintentos. No solicitar secretos en documentos. |
| S3 u otro almacenamiento remoto | Diferible; ya existen contratos de almacenamiento local. |
| Guías/facturas tributarias electrónicas y SII | Fuera del alcance implementado. V1 propuesta usa documentos internos y referencia de factura externa; si se requiere emisión legal integrada, el alcance debe ampliarse expresamente. |
| PDF/adjuntos propios de OCC | Ampliación posterior según D10; no confundir con los PDF de cotización, OT y guía ya existentes. |
| Traslados de productos terminados | No implementados como los de materia prima; confirmar necesidad operativa antes de incluirlos. |
| Contabilidad, remuneraciones, rentabilidad/costos avanzados, multiempresa y automatizaciones externas | No identificados como compromisos cerrados de esta entrega. No convertirlos en bloqueos sin definir alcance. |

## Discrepancias documentales detectadas

- `AGENTS.md` y `CLAUDE.md` conservan descripciones iniciales que aún llaman pendientes a Cotizaciones/Producción ya implementadas. Usar los checkpoints recientes de sus hitos y este inventario.
- `HITO-COTIZACIONES.md` termina señalando OT/finalización/Guías como pendientes; OT y Guías tienen hitos posteriores cerrados. Su checklist inicial no es una lista actual de faltantes.
- `HITO-PRODUCTOS.md` aún presenta fabricación/salidas como pendientes; las cubren OT y Guías. Sus revisiones visuales sí deben conciliarse.
- Empresa y algunos mantenedores conservan revisiones pendientes; Compras tiene aprobación posterior de sus funcionalidades, aunque varios checks iniciales siguen abiertos. Se deben consolidar referencias sin inventar aprobaciones.
- Los apartados históricos G4/G5/G6 pueden decir «pendiente» porque describen su momento de entrega; la sección 18 de Guías registra la aprobación posterior y prevalece para su estado actual.

## Criterio de salida propuesto

V1 lista cuando un usuario autorizado pueda completar el circuito comercial y productivo, cobrarlo sin inconsistencias, corregir errores con historial, encontrar sus acciones sin asistencia constante y recuperar la instalación desde respaldo; con pruebas técnicas del conjunto y aprobación funcional global registradas.

**Siguiente paso recomendado:** definir e implementar Acceso/Usuarios/Permisos y el hito de Cobranza, coordinar después Dashboard, usabilidad/manual y cierre operativo. Las decisiones de roles y reglas de pagos se deben resolver en esos hitos; esta auditoría no las fija por defecto.

## Alcance de esta revisión

Validación estática del repositorio y contraste de fuentes. No se ejecutaron pruebas, build, servidores, migraciones ni escrituras en PostgreSQL durante esta revisión. Las validaciones técnicas citadas de hitos anteriores son evidencias previas, no una regresión global ejecutada hoy. Se revisaron enlaces locales y diff de los documentos modificados. No se estiman porcentajes ni plazos sin cerrar el alcance de V1.


Actualización 21-10-2026: S4 validado localmente para seis roles combinables, revocación/expiración, acciones directas, archivos y redacción de DTO financieros. No cierra auditoría/autoría S5, regresión/producción S6 ni aprobación funcional S7. Google es opcional y se mantiene pospuesto.


Actualización S5, 21-10-2026: visor y autoría nueva implementados/validados técnicamente, retención manual y CLI verificadas sin borrar autoría. Pendientes S6/S7, incluida la tarea diaria de retención y el ensayo de producción/restauración. S3 continúa pospuesto.


Actualización S6, 22-10-2026: cierre técnico local aprobado (aún no existe servidor/dominio), 48/48 escenarios, HTTPS/reinicio/restauración locales y plantillas de despliegue/retención preparadas. Base de trabajo y archivos intactos, servidores/copias retirados. No se acredita instalación HTTPS ni tarea diaria reales; quedan diferidas al destino definitivo. S7 y los demás faltantes de V1 siguen pendientes. Ver SEGURIDAD-S6-CONTINUIDAD.md.


## Actualización 24-10-2026 — Inicio de Cobranzas

El usuario autoriza continuar Cobranzas dejando pendientes las validaciones restantes de S7. Seguridad conserva aprobados S7-01/02/03/05/06/07/09 y pendientes S7-04/08/10/11/12; no se declara su cierre global.

Plan activo: [HITO-COBRANZAS.md](HITO-COBRANZAS.md), C0–C4. Aprobados medios de pago, comprobante/referencia opcionales, anticipos/fechas hasta hoy, rechazo de sobrepagos, anulación con motivo y permisos del área, y promesas con historial independiente del vencimiento. C0 completo y C1 implementado/validado técnicamente, pendiente de aprobación funcional; etapas posteriores no se consideran implementadas por esa aprobación. Permanecen Dashboard, usabilidad/manual y cierre integral/operativo de V1.

Actualización C2, 24-10-2026: C1 aprobado por el usuario. C2 abonos/anulaciones, permisos/autoría e interfaz implementados y validados en copia/Chromium; aprobación funcional C2 pendiente. C3 comprobantes/promesas y C4 cierre pendientes. Ver sección 8 de HITO-COBRANZAS.md.

Actualización C3, 24-10-2026: C2 aprobado. C3 comprobantes/promesas implementado y validado en copia (regresiones C1/C2/C3/Chromium), pero migración local no aplicada por rechazo de revisión automática; requiere autorización explícita para habilitarlo. C1/C2 se mantienen disponibles sin la migración. Aprobación funcional C3 y C4 pendientes; checkpoint en sección 9 de HITO-COBRANZAS.md. Respaldar también `COBRANZA_COMPROBANTE_DIR` o `var/cobranza/comprobantes/` junto con PostgreSQL y los otros archivos.

Actualización de habilitación C3, 24-10-2026: usuario autorizó y se aplicó la migración local con respaldo restaurado/verificado; 80 tablas previas sin cambios y nuevas tablas vacías. 38 migraciones al día y cliente regenerado. Comprobantes/promesas disponibles localmente; aprobación funcional C3 y C4 pendientes. El bloqueo de autorización anterior queda resuelto.

Actualización C4, 24-10-2026: Cobranzas tiene enlaces desde OCC/OT/guías, resumen protegido reutilizable y guía `OPERACION-COBRANZAS.md`. Recorrido integral y regresiones C1/C2/C3 correctos en copia (2/2). C1/C2 aprobados; C3 habilitado y C4 técnico completo, pendientes de revisión funcional del usuario, sin cierre global aún. Dashboard sigue sin implementar. Evidencia/continuidad en sección 10 de HITO-COBRANZAS.md.


Actualización Dashboard, 24-10-2026: definiciones D-D01–D-D07 aprobadas e implementación técnica D1–D4 con cifras reales y campana por permisos. Prueba Dashboard y regresión S4 correctas en copias, con origen/archivos intactos; lint/build/tipos correctos. Guía OPERACION-DASHBOARD.md y checkpoint en HITO-DASHBOARD.md. Pendientes D5 funcional, medición representativa, C3/C4 de Cobranzas, validaciones restantes S7 y demás cierre V1. No se presenta esta entrega como aprobación global.


Actualización manual/usabilidad, 24-10-2026: primera edición textual completa del manual entregada, README orientado al ERP y guías OT/Guías conciliadas con permisos actuales. Doce hallazgos registrados; dos accesos por rol corregidos y validados en copia/Chromium (cobranza-cierre 1/1). Pendientes ayuda integrada, capturas anonimizadas, revisión funcional de facilidad de uso/manual y demás validaciones V1. Fuente de continuidad: HITO-MANUAL-USABILIDAD.md.
