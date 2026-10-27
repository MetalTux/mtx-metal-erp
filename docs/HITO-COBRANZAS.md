# Hito — Cobranzas

Fecha de inicio: **24-10-2026**. Autorizado por el usuario: preparar el plan e iniciar el desarrollo. Las validaciones restantes de seguridad S7 quedan pendientes, sin impedir este trabajo ni dar por cerrado ese hito.

## 1. Objetivo y estado

Completar el cobro del circuito Cotización → OCC → OT/Producción → Despacho, usando la cuenta única que ya se crea al confirmar la OCC. La deuda se cobra independientemente de las entregas; la factura externa registrada en OT determina el vencimiento con el plazo histórico.

**C0 completo; C1/C2 aprobados por el usuario. C3 habilitado localmente y C4 técnico completado, ambos pendientes de aprobación funcional.** La sección 10 contiene el checkpoint vigente y la guía operativa permite realizar la revisión cuando el usuario tenga disponibilidad.

## 2. Contratos existentes que se conservan

- `AccountReceivable.salesOrderId` único; importe aceptado histórico de la OCC. No crear deuda desde cotizaciones, guías ni obras propias.
- `Payment` pertenece a una cuenta; importes con Decimal(14,2), positivos y UUID único estable. Sólo pagos no anulados reducen el saldo. La cuenta puede tener importe cero.
- El vencimiento contractual y la promesa son fechas de calendario independientes. Deuda vencida sólo si tiene saldo positivo y vencimiento anterior a hoy en Santiago; si vence hoy, no es vencida.
- Corrección de factura conserva los abonos; devolución de guía no altera deuda. Cuenta anulada excluida del total por cobrar.
- Anulación de OCC sigue su regla vigente: sin trabajo, sin abonos incluso anulados ni hitos posteriores. Este hito no añade una anulación independiente de cuentas ni renegocia el importe contratado.
- Conservar campos heredados de pago de guías; no convertir sus estados en abonos ficticios.
- Permisos acumulables por empresa: Cobranza/Administrador operan su área; Ventas y Consulta/Gerencia tienen las consultas autorizadas. Validar servidor, no sólo botones. Registrar autoría nueva sin inventar responsables del pasado.

## 3. Decisiones aprobadas el 24-10-2026

| ID | Decisión aprobada |
| --- | --- |
| C-D01 | Medios: Transferencia, Efectivo, Tarjeta, Cheque y Otro. Referencia opcional y comprobante adjunto opcional. |
| C-D02 | Fecha de pago de hoy o pasada según Santiago; anticipos sin factura permitidos. Rechazar sobrepagos, también concurrentes. |
| C-D03 | Corregir anulando el abono con motivo y registrando otro; sin borrar ni modificar silenciosamente el original. Cobranza y Administrador pueden hacerlo. |
| C-D04 | Promesa opcional editable por Cobranza/Administrador, con historial y sin modificar el vencimiento contractual. |
| C-D05 | Cheque reduce la deuda sólo cuando esté efectivamente cobrado; no registrar recepción pendiente como abono. |
| C-D06 | JPG, PNG o PDF hasta 5 MB por comprobante; adjuntar al registrar o después, conservar anteriores y consultar/descargar sólo con acceso a Cobranzas. |
| C-D07 | Cambiar/quitar promesa exige motivo e historial con fecha anterior/nueva y autor. Nuevas fechas desde hoy Santiago; promesas históricas vencidas conservadas. |

Los detalles de formatos/límites de adjuntos se especificarán en C3 antes de activarlos. La recepción y gestión de cheques pendientes/rechazados no forman parte del registro de abonos aprobado. Para Cheque, la fecha del pago corresponde al cobro efectivo. No se implementan créditos a favor, devoluciones de dinero, cuotas ni un pago distribuido entre varias OCC sin una decisión adicional.

## 4. Etapas y seguimiento

Marcar implementado y validado sólo con evidencia; aprobación funcional del usuario por separado.

### C0 — Alcance y preparación

- [x] Revisar esquema y contratos de OCC, OT/factura, guías y seguridad.
- [x] Obtener aprobación C-D01–C-D05 y registrarla.
- [x] Establecer etapas, pruebas y pendientes de seguridad separados.

### C1 — Consulta de cuentas y abonos

- [x] Sustituir la pantalla provisional por listado paginado en PostgreSQL.
- [x] Buscar cliente/OCC/factura; filtrar sin abonos, parcial, pagada, anulada y vencimiento.
- [x] Calcular abonos vigentes y saldo decimal sin duplicación por guías; totales del filtro excluyen anuladas y saldos no positivos.
- [x] Detalle sobre listado: cliente/sucursal, OCC, factura, importe, abonos, saldo, vencimiento y promesa. Historial paginado con abonos anulados, referencias y motivos; no exponer URLs heredadas arbitrarias.
- [x] Proteger consultas en servidor, usar snapshot consistente y no escribir cuentas/pagos al consultar.
- [x] Validación técnica de C1 en copia descartable y lint/build.
- [x] Aprobación funcional C1 por el usuario, 24-10-2026.

### C2 — Registro y anulación de abonos

- [x] Servicio transaccional con bloqueo de cuenta compatible con factura y OCC; verificar saldo y estado bajo bloqueo.
- [x] UUID estable y huella: mismo contenido devuelve resultado previo, contenido distinto se rechaza; conservar resultado después de anular el abono.
- [x] Registro parcial/total/anticipo y validación de fechas/importes/medios; Decimal en todo cálculo.
- [x] Anulación idempotente con motivo y autoría; historial inmutable y corrección por nuevo pago. Sin tocar stock, guías, factura ni importe de cuenta.
- [x] Formulario accesible, selectores buscables cuando corresponda, revisión antes de confirmar, avisos visibles y respuesta incierta con reintento seguro.
- [x] Permisos Cobranza/Administrador en acciones y transacción; consultas siguen disponibles a roles autorizados.
- [x] Pruebas: sobrepago/carreras, doble envío, clave distinta, rollback, cuentas anuladas/cero, pagos anulados y anticipos sin factura.
- [x] Aprobación funcional C2 por el usuario, 24-10-2026.

### C3 — Comprobantes y promesas

- [x] Definir y validar formatos/tamaño de adjuntos; almacenamiento privado local, descarga autorizada, integridad y respaldo; sin aceptar rutas o URLs libres.
- [x] Asociar comprobante opcional sin huérfanos ante fallo ni alteración del documento original; política explícita de corrección y conservación.
- [x] Actualizar/quitar promesa con control de concurrencia, historial y autoría; no mover el vencimiento ni ocultar deuda vencida.
- [x] Probar permisos, archivo inválido/ajeno, rollback y concurrencia de promesas.
- [x] Aplicar migración al entorno local autorizado y verificar habilitación, 24-10-2026.
- [ ] Aprobación funcional C3.

### C4 — Integración y cierre

- [x] Enlaces de cuenta desde OCC/OT/guías sin duplicar deuda ni exponer importes a roles sin permiso.
- [x] Consultas compartidas para Dashboard posterior; Dashboard no se considera implementado por tener este listado.
- [x] Guía funcional/operativa y respaldo de comprobantes.
- [x] Recorrido en copia: OCC → anticipo → producción/entrega/factura → pago final → anulación/corrección; obra propia sin cuenta.
- [x] Regresión de concurrencia, permisos, auditoría y stock/documentos; limpieza de copias/servidores.
- [ ] Aprobación expresa del usuario y cierre funcional del hito (C3/C4 pendientes).

## 5. Validación y continuidad

No ejecutar pruebas destructivas en la base real. El ejecutor existente `pnpm seguridad:validar-s6 cobranza-consultas` prepara una copia local descartable, credencial real de prueba y comparación de origen/archivos antes/después; elimina la copia al terminar. Su nombre histórico S6 no significa que esta prueba cierre Seguridad ni sustituya los otros escenarios.

C1 no requiere migración. Para C2/C3 revisar si hacen falta operaciones idempotentes, historial de promesas y almacenamiento de comprobantes adicionales: toda ampliación tendrá migración versionada y ensayo en destino autorizado.

Siguiente etapa tras C1: C2. Pendientes S7-04/08/10/11/12 conservados en [GUIA-PRUEBAS-SEGURIDAD-S7.md](GUIA-PRUEBAS-SEGURIDAD-S7.md). Otros faltantes V1: Dashboard, usabilidad/manual y cierre operativo/integral según [CIERRE-VERSION-1.md](CIERRE-VERSION-1.md).

## 6. Recorrido funcional C1

1. Ingresar con un perfil autorizado y abrir **Ventas → Cobranza**.
2. Buscar por cliente, folio de OCC o factura; combinar pago/vencimiento y pulsar **Filtrar**. **Limpiar filtros** vuelve a las cuentas vigentes.
3. Comparar importe, abonos vigentes y saldo con una OCC conocida. Las tarjetas suman sólo el filtro actual; **Anuladas** permite consultar historia sin sumarla a deuda.
4. Abrir **Ver cuenta**: revisar sucursal, factura, fechas e historial. Los pagos anulados se muestran con motivo, sin reducir el saldo. Usar la paginación si hay más de veinte abonos.
5. Cerrar con **Cerrar detalle**, la cruz o Escape; se conserva el filtro del listado. Una cuenta sin abonos muestra su estado vacío.
6. Confirmar comportamiento en ventana estrecha. La tabla se desplaza horizontalmente dentro de su contenedor.

Informar «C1 aprobado» o las observaciones concretas. No registrar pagos por SQL para probar la interfaz; el registro desde el ERP pertenece a C2. Las pruebas automáticas con pagos de ejemplo se realizan únicamente en copias descartables.


## 7. Checkpoint C1 — 24-10-2026

C0/C1 implementados y comprobados. Archivos principales: `src/lib/consultas/cobranza.ts`, `src/app/(app)/ventas/cobranza/page.tsx` y `src/components/cobranza/detalle-cuenta.tsx`. No hay migraciones nuevas ni escrituras de cuentas/abonos desde esta etapa.

Validación: `pnpm lint`, `pnpm build`, tipos y cobertura estática S4 correctos (120 entradas de servicios/consultas autorizadas). Integración C1 correcta en copia: saldos con centavos, anulados, cuenta única, búsqueda literal/inyección, filtros y límites de paginación, conservación de pagos al consultar. Chromium C1 correcto: tabla/detalle, páginas de abonos, Escape, vacío, acceso anónimo y 320/375/768/1440 sin desbordamientos ni errores JS. Se corrigen el contenedor relativo de la tabla y la compactación de la barra superior en anchos intermedios. Regresión S4 de roles/páginas/acciones/archivos y Chromium también correcta.

Evidencia privada C1 final: `backups/20261024_seguridad_s6/1792818441250/` (1/1). Evidencia S4: `backups/20261024_seguridad_s6/1792818235579/seguridad-s4.log`; en ese ensayo C1 visual aún fallaba, corregido y repetido en la evidencia final. La base y almacenes originales coinciden antes/después en ambos ensayos; no se atribuyen aprobaciones funcionales a sus resultados. Un ensayo anterior detectó variación de `SecuritySession` en el origen durante la validación, sin dar por válida esa comparación; las repeticiones finales sí pasaron.

Continuar con **C2: abonos y anulaciones**. Reglas resueltas C-D01–C-D05; Cheque sólo al cobro efectivo. Próximo diseño: operación idempotente con huella, anulación trazable y bloqueo de cuenta compatible con OCC/factura; no editar historia ni usar los medios heredados de guías como pagos. Comprobantes/promesas son C3. El usuario puede revisar C1 con el recorrido de la sección 6 sin bloquear el análisis siguiente; su aprobación no se inventa.


## 8. C2 — Abonos y anulaciones, 24-10-2026

C1 aprobado expresamente por el usuario. C2 incorpora `src/lib/servicios/cobranza.ts`, acciones de servidor en Cobranza y `OperarAbonos` dentro del detalle de cuenta. Registrar exige importe positivo (hasta dos decimales), fecha hasta hoy Santiago, medio aprobado y referencia opcional. Los cheques se registran sólo cobrados. El formulario revisa antes de confirmar y conserva datos/UUID ante respuesta incierta; los rechazos confirmados permiten editar.

No se necesita una tabla de operaciones nueva: el UUID único de `Payment` identifica el alta y los datos originales inmutables en el servicio proporcionan la comparación canónica de contenido (cuenta, importe Decimal, instante del día de Santiago, medio y referencia normalizada). El reintento se reconoce antes de validar saldo/estado/fecha actuales, incluso después de anular. Otro contenido con la misma clave se rechaza. Anulación naturalmente idempotente por ID de abono + motivo: repetir devuelve el resultado existente sin escribir ni duplicar autoría; otro motivo no reescribe la historia. No se permite editar importe, medio, referencia, fecha u origen ni borrar abonos mediante este módulo.

Las operaciones bloquean cuenta antes de calcular el saldo o anular. No adquieren después bloqueos de OCC/OT, manteniendo compatibilidad con sus servicios de factura/anulación. Todo pago y autoría se confirma o revierte en la misma transacción. Nuevas acciones exigen origen y `cobranza.operar`, comprobado otra vez dentro de la transacción. El visor de autoría incorpora recurso Payment y acciones REGISTRAR_ABONO/ANULAR_ABONO; los pagos anteriores no reciben autores ficticios.

### Recorrido funcional C2

1. Como Cobranza o Administrador, abrir **Ver cuenta → Registrar abono**. Completar importe, fecha, medio y referencia opcional.
2. Pulsar **Revisar operación**; comprobar el resumen, usar **Volver a editar** o **Confirmar operación**. Verificar saldo y abono nuevo.
3. Probar un anticipo sin factura, pago parcial y saldo completo con cuentas de prueba. Rechazar sobrepago y fecha futura; no crear pagos ficticios en cuentas reales para probar.
4. En un abono vigente, pulsar **Anular abono #…**, indicar motivo, revisar y confirmar. El historial conserva el original, el saldo vuelve a aumentar y se puede registrar el pago corregido con una operación nueva.
5. Si falta respuesta, mantener el formulario y pulsar **Reintentar misma operación**; no iniciar otro pago. Los datos quedan bloqueados mientras el resultado es incierto. Si persiste, consultar desde otra pestaña antes de abandonar el formulario.
6. Con Ventas o Consulta/Gerencia comprobar sólo lectura; no deben existir botones de registrar o anular. Adjuntos y cambios de promesa se incorporan en C3.

Aprobación funcional C2 pendiente; no se deduce de la aprobación C1. Próximo hito C3 tras el cierre técnico C2. No hay migraciones ni cambios al importe/vencimiento/factura, stock o entregas por registrar o anular un abono.


### Checkpoint final C2

- [x] Lint/build/tipos y coberturas estáticas S4/S5 correctos (90 acciones, 122 servicios/consultas y 63 puntos de autoría).
- [x] Integración C1/C2 en copia: registro decimal, UUID/reintentos concurrentes y contenido distinto, reintento después de anular, motivo inmutable, pago completo, cuenta anulada, sobrepagos concurrentes, fecha/importe inválidos, permisos Ventas/Cobranza, sesión inválida y autoría sin duplicados.
- [x] Fallo inducido al insertar autoría después de escribir Payment demuestra rollback del abono; retirar el trigger permite reintentar la misma clave. Trigger sólo en copia descartable.
- [x] Chromium: recorrido C1 y alta/anulación C2 con revisión/confirmación y saldo/historial actualizados, sin errores JS. C1 conserva anchos 320/375/768/1440.
- [x] Base/archivos originales sin cambios; copia/fixtures y servidor 3031 retirados, servidor previo del usuario 3030 conservado. Evidencia privada: `backups/20261024_seguridad_s6/1792819206115/`, resultado 1/1 del escenario ampliado. No se repitió toda la batería S6 ni se cierra S7.
- [x] Aprobación funcional C2 por el usuario, 24-10-2026.

**Continuar desde C3**, comprobantes opcionales e historial de promesas. No hace falta reconstruir C1/C2 ni crear migraciones retroactivas para ellos. Las correcciones de abono consisten en anular el original y registrar uno nuevo; la anulación no es una devolución de dinero ni una cancelación del contrato.


## 9. C3 — Comprobantes y promesas (24-10-2026)

C2 aprobado expresamente por el usuario. C-D06/C-D07 aprobadas durante C3. Nueva migración `20261024053000_cobranza_comprobantes_promesas`: `PaymentAttachment` y `PaymentPromiseChange`, con FK Restrict/indexadas, UUID estable, huella y CHECK; historial de ambas tablas inmutable por trigger. No modifica ni inventa promesas/archivos anteriores, importe ni vencimiento. El autor se registra en el diario de autoría existente en la misma transacción.

Almacenamiento privado: `COBRANZA_COMPROBANTE_DIR` o `var/cobranza/comprobantes/`, fuera de `public/`. Archivos originales conservados, nombres internos UUID, tamaño/huella/mime en BD. Imágenes decodificadas para validar formato/tamaño en píxeles; PDF con firma y terminación reconocibles, servido sólo como descarga, sin ejecutar ni previsualizar contenido activo. La verificación no equivale a un antivirus ni a un parser completo de PDF.

Subida requiere Cobranza/Administrador y abono existente; también permite documentar abonos históricos anulados. Cada archivo añadido conserva los anteriores; no hay reemplazo ni borrado desde el módulo. Reintento con mismo UUID/contenido/pago/nombre devuelve resultado anterior; otra intención se rechaza. Fallo confirmado sin referencia elimina el archivo recién creado; ante imposibilidad de comprobar un commit se conserva hasta conciliación, para no borrar un comprobante confirmado.

En el registro de abono, primero se confirma el pago y luego su adjunto opcional. Si falla sólo el archivo, el formulario informa explícitamente que el abono está registrado y permite reintentar únicamente la subida o adjuntar después desde el historial. No se revierte dinero ni duplica el pago por un problema del archivo.

Promesas: UUID/huella, bloqueo de cuenta, versión combinada `updatedAt` + cantidad de cambios inmutables (evita colisiones de milisegundos), motivo obligatorio, historial anterior/nuevo y autoría atómicos; cambiar/quitar no altera factura ni vencimiento. Fechas históricas vencidas se conservan, las nuevas no pueden ser pasadas. Sin cambio real no se escribe historia. En lectura, la historia se pagina por veinte cambios; el visor de auditoría del Administrador permite consultar la autoría.

### Recorrido funcional C3

1. **Registrar abono:** opcionalmente seleccionar JPG/PNG/PDF hasta 5 MB; revisar y confirmar. Comprobar el pago y su enlace de descarga.
2. **Ver cuenta → abono → Adjuntar comprobante:** agregar otro archivo, revisar y confirmar. Deben conservarse ambos enlaces; no cambia saldo ni importe.
3. Descargar y comparar con el original. Una persona sin acceso a Cobranza no puede obtenerlo ni mediante URL directa. No compartir los enlaces con terceros.
4. **Cambiar promesa:** elegir hoy o fecha futura y motivo; revisar y confirmar. Comprobar promesa actual e **Historial de promesas**. Vencimiento y estado vencido siguen su regla contractual.
5. Quitar promesa dejando fecha vacía e indicando motivo. Si otra persona modificó la cuenta, actualizar antes de volver a confirmar; no sobrescribir con una versión antigua.
6. La aprobación funcional C3 queda pendiente hasta el resultado del usuario. Los comprobantes y promesas no cierran las validaciones de seguridad S7 pendientes.

### Respaldo y recuperación

Respaldar conjuntamente PostgreSQL y `COBRANZA_COMPROBANTE_DIR` (o su carpeta predeterminada), además de los otros almacenes del ERP. Conservar bytes originales y claves/configuración privadas. Restaurar primero en un destino aislado, verificar referencias, tamaño/huella y descarga autorizada antes de abrir el acceso. No reconstruir comprobantes desde URLs heredadas ni borrar archivos por no reconocer su nombre.

Los archivos conservados por una respuesta incierta se concilian contra `PaymentAttachment.fileKey` con el servicio detenido y respaldo previo; no hay borrado automático. No reemplazar una versión histórica para corregirla: agregar otro comprobante identificado por el usuario.


### Checkpoint C3 — habilitación local completada

- [x] Prisma validado y cliente generado; migración 38 `20261024053000_cobranza_comprobantes_promesas` generada y aplicada únicamente a copias descartables.
- [x] Lint/build/tipos y coberturas S4/S5 correctos: 92 acciones, 124 entradas de servicios/consultas, siete rutas de archivos y 65 puntos de autoría.
- [x] Regresiones C1/C2 y C3 en copia: archivos JPG/PNG/PDF, límites/formato/UUID, descarga privada sin caché, 401 anónimo/403 Bodega/404 inexistente, inmutabilidad, fechas/versiones/promesas concurrentes, vencimiento intacto y rollback/limpieza tras fallo inducido.
- [x] Chromium: adjuntar durante el alta y después, descargar, cambiar promesa e historia, registrar/anular abonos y consulta paginada; sin errores JS y listado en 320/375/768/1440.
- [x] Corrección de la prueba pendiente: abono y comprobante usan UUID independientes. Reutilizar el UUID del abono colisionaba con la autoría del adjunto sobre Payment; se verifica que alta, adjunto y anulación tengan tres identidades distintas.
- [x] Compatibilidad sin migración comprobada en copia: C1/C2 siguen disponibles; comprobantes/promesas aparecen pendientes de habilitación, sin consultar tablas inexistentes. No se escriben ni modifican esquemas automáticamente desde la aplicación.
- [x] Copias, almacenamiento temporal y servidores retirados; puertos 3030/3031 libres al cierre. Respaldo preparatorio conservado en `backups/20261024_cobranza_c3/antes.dump`; archivo privado de conexión de copia retirado.
- [x] Autorización explícita recibida y migración C3 aplicada a `mtx_metal_erp` local el 24-10-2026, con respaldo reciente restaurado/verificado y comparación de datos existentes. El rechazo automático anterior quedó resuelto tras esa autorización.
- [x] Verificación de habilitación local: 38 migraciones al día y tablas C3 presentes.
- [ ] Aprobación funcional C3 por el usuario.

Evidencia final: `backups/20261024_seguridad_s6/1792857793317/`, escenario ampliado 1/1 y origen/almacenes sin cambios. Antes de corregir el UUID, los servicios pasaban pero el alta con adjunto fallaba en Chromium; esos ensayos anteriores no acreditan el cierre. No se repitieron los 48 escenarios completos S6 ni se cerró S7.

**Para retomar:** comprobar autorización del usuario y `pnpm prisma migrate status`; la última comprobación mostraba 38 migraciones versionadas, 37 aplicadas y C3 pendiente en el destino local. Si se autoriza, crear respaldo reciente, aplicar sólo las migraciones revisadas, verificar datos previos y nuevas tablas vacías. La copia preparatoria ya no existe; no usar su antigua conexión. No repetir todo C1/C2 ni confundir el código probado en copia con disponibilidad local.


### Aplicación local autorizada — 24-10-2026

El usuario solicitó aplicar C3 evitando pérdida de datos. Se verificó el destino local `mtx_metal_erp` y que C3 fuera la única migración pendiente. Antes de escribir se creó un nuevo `pg_dump` completo y se restauró en una copia descartable; las huellas de todas las filas coincidieron con el origen.

`prisma migrate deploy` aplicó únicamente `20261024053000_cobranza_comprobantes_promesas`. La comparación posterior confirmó que **las 80 tablas anteriores conservan exactamente las mismas filas**; sólo se agregaron PaymentAttachment y PaymentPromiseChange, ambas vacías. La metadata `_prisma_migrations` cambia según lo previsto; no se ejecutó seed, reset ni carga de ejemplos. La copia de restauración se retiró y se conservó el respaldo.

Evidencia privada: `backups/20261024_cobranza_c3/aplicacion_1792859912558/`, con dump, huellas antes/después, verificación del respaldo, log y resumen. Prisma validado, cliente regenerado y 38 migraciones al día. C3 queda habilitado localmente para el recorrido funcional de esta sección; falta sólo su aprobación funcional y después C4.

Comprobaciones posteriores a la aplicación local: `pnpm prisma validate`, `pnpm prisma generate`, `pnpm prisma migrate status`, `pnpm lint` y `pnpm build` correctos. No se iniciaron servidores de aplicación ni se registraron pagos/comprobantes de prueba en la base local.


## 10. C4 — Integración y cierre técnico, 24-10-2026

Implementado y validado técnicamente; **no se cierra funcionalmente el hito**: el usuario no puede realizar pruebas por ahora y mantiene pendientes las revisiones C3/C4.

- Enlace compartido **Ver cuenta por cobrar** desde consulta de OCC, OT comercial y guía. Se muestra sólo con `cobranza.leer` y `precios.leer`, respeta bloqueos de navegación y no existe para obra propia sin OCC.
- `/ventas/cobranza?orden=<id>` resuelve la cuenta existente de esa OCC dentro de la consulta protegida; no genera cuenta ni deuda, y el detalle conserva paginación/historial. Una referencia inexistente informa que no se encontró la cuenta.
- `consultarResumenCobranza()` ofrece resumen de empresa por cuentas vigentes, saldo positivo por cobrar, saldo y cantidad vencidos, con la misma agregación usada por el listado. Permisos en servidor/transacción, Decimal y día Santiago. No carga filas del listado ni implementa el Dashboard.
- Guía por tareas y operación en [OPERACION-COBRANZAS.md](OPERACION-COBRANZAS.md): accesos, anticipos/abonos, correcciones, adjuntos, promesas, respuesta incierta, permisos y respaldo/restauración de comprobantes junto a PostgreSQL y archivos previos.

### Evidencia y validación

`pnpm lint`, `pnpm build`, tipos y coberturas S4/S5 correctos: 92 acciones, 125 entradas de servicio/consulta, siete rutas de archivos y 65 puntos de autoría. Sin migraciones C4 ni escrituras de prueba sobre la base de trabajo.

`pnpm seguridad:validar-s6 cobranza-consultas cobranza-cierre` correcto **2/2**. El primero repite C1/C2/C3, formatos/límites, permisos/descargas, UUID, concurrencia y rollback de pagos/promesas/archivos. El nuevo escenario integra OCC/cuenta → anticipo sin factura → reservas/fabricación y servicios → entrega parcial/completa → finalización/factura → pago final → anulación/corrección de abono → devolución parcial/reentrega. Verifica una sola cuenta, saldo/vencimiento, stock/Kardex/reservas conciliados y documentos físicos intactos durante operaciones de cobro; obra propia sin cuenta. Resumen compartido cotejado contra las variaciones de deuda.

Chromium C4 navega desde OCC, OT y guía a la misma cuenta, verifica obra propia sin enlace, Producción sin controles financieros y URL directa de Cobranza denegada; sin errores JS. La regresión de consulta mantiene pruebas en 320/375/768/1440. Evidencia privada: `backups/20261024_seguridad_s6/1792860383179/`. Origen/almacenes comparados sin cambios; copias, credenciales y servidores propios retirados. Es una batería específica de Cobranzas, no los 48 escenarios completos de S6 ni aprobación funcional de Seguridad.

### Continuidad

- [x] C1 y C2 aprobados previamente; C3 habilitado localmente con migración 38 ya aplicada y datos anteriores verificados.
- [x] C4 técnico completado y guía disponible; se puede revisar posteriormente sin repetir desarrollo.
- [ ] Usuario revisa C3 (adjuntos/promesas) y C4 (integración/recorrido), registra incidencias o aprobación expresa; no se inventa aceptación por las pruebas automáticas.
- [ ] Cierre funcional general de Cobranzas después de esa revisión.

Para retomar, partir de esta sección y la guía operativa. Dashboard real, manual completo del ERP, validaciones S7 restantes y despliegue definitivo siguen como entregas/puntos pendientes de V1; este cierre técnico no los da por terminados.
