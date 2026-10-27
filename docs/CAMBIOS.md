# Registro de cambios

## 2026-10-06: Planificación del siguiente hito — Empresa

Tras la confirmación funcional del usuario de los cinco mantenedores, se propone Configuración de Empresa como siguiente entrega. [HITO-EMPRESA.md](HITO-EMPRESA.md) registra revisión inicial completada y etapas pendientes de reglas/preparación, consulta, formulario, persistencia, validación y cierre. Incluye criterios por etapa y secuencia posterior propuesta de procesos.

Se conserva el perfil único y los campos opcionales existentes. El RUT se validará cuando tenga contenido; se contemplan conflictos de edición/primera creación. La opción de logo está pendiente de acuerdo y la emisión/PDFs se resolverá con Ventas. No se desarrolló el módulo ni se marcaron sus funciones como completadas.

Se actualizaron enlaces de seguimiento en AGENTS, MANTENEDORES-DATOS y AVANCES-INTERFAZ. Originales con SHA-256 en `backups/20261006_184716_plan_empresa`. Validación documental de enlaces, contenido y diff; sin ejecutar servicios, build, migraciones ni escrituras en PostgreSQL.

## 2026-10-06: CRUD de Materias primas y selector buscable

Quinto mantenedor completo en `/mantenedores/materiales`. Listado real con filtro por código/nombre/unidad, orden y paginación; formularios modales Crear, Ver y Editar, y eliminación con confirmación. Ver es de solo lectura y no guarda al presionar Enter.

- Código único, nombre, descripción opcional y Unidad obligatoria validada en cliente/servidor. Límites: 50/150/2000 caracteres. Código mantiene la unicidad exacta del esquema; descripción vacía como `null`. Sin unidades se muestra aviso y se impide guardar.
- Nuevo `SelectorBuscable` reutilizable sobre Popover/Command: filtro interno por etiqueta/abreviatura, normalización de acentos, teclado y estados vacíos. Primer uso en Unidad de medida, sin dependencias nuevas.
- El usuario confirmó que la Unidad cambia sólo sin stock, movimientos ni referencias en compras, trabajos o cotizaciones; stock cero también bloquea. En uso, el formulario conserva Unidad en consulta y permite editar los demás datos.
- `src/lib/servicios/materiales.ts` reutiliza Prisma, serializa fechas y obtiene cinco conteos. Editar/Eliminar verifican versión y bloquean el material antes de revisar referencias y escribir en una transacción. SQL parametrizado `FOR UPDATE` coordina la fila con las referencias FK. El servidor rechaza un cambio de unidad si aparecen referencias después de abrir Editar.
- La eliminación comprueba explícitamente también cotizaciones: su FK opcional permite desvincular el material, y el servicio evita perder ese vínculo histórico. Se mantienen las FK existentes sin cambios de esquema.

### Hitos y validación

- [x] Respaldar los seis originales afectados y PostgreSQL; SHA-256 y dump restaurado en copia temporal.
- [x] Confirmar y registrar la regla de cambio de Unidad.
- [x] Implementar listado, Crear, Ver, Editar, Eliminar y selector con filtro interno.
- [x] Pasar `pnpm lint` y `pnpm build`.
- [x] Pasar `tests/materiales.integration.ts` en copia temporal: cinco relaciones probadas individualmente, stock cero, cotizaciones sin desvincular, código único, unidad inexistente, descripción opcional/límites y versiones obsoletas.
- [x] Chromium: CRUD, selector con 207 opciones/búsqueda/teclado, vacío, unidad bloqueada por referencia posterior, otros campos editables, cancelación, orden/paginación, cursor, móvil y ausencia de unidades. Sin diálogos nativos ni errores JavaScript/consola.
- [x] Comparar huellas/conteos de materiales, unidades y cinco tablas relacionadas originales: idénticos.
- [x] Cerrar servidor temporal 3031 y retirar la copia; se comprobó con `ss` que 3031 queda libre y se preservó el servidor previo del usuario en 3030 (PID 87043).
- [x] Marcar los cinco mantenedores de la primera serie completos en MANTENEDORES-DATOS y actualizar AVANCES-INTERFAZ.

Respaldos y evidencias en `backups/20261006_183628_crud_materiales`, excluido de git. Sin cambios en esquema, migraciones, seed, dependencias ni la guía visual. Los futuros procesos deben coordinar las lecturas de unidad/cantidades con sus escrituras transaccionales.


## 2026-10-06: CRUD de Clientes

Cuarto mantenedor implementado en `/mantenedores/clientes`. Se reemplaza la página provisional por listado real y CRUD, reutilizando tabla, confirmación, avisos y notificaciones. El filtro incluye nombre, RUT y datos de contacto. Los formularios se muestran sobre el listado y Ver es de solo lectura, incluso al presionar Enter.

- `clienteSchema` reutiliza la validación compartida del dígito verificador del RUT en formulario/servidor. Nombre y RUT obligatorios; persona de contacto, correo y teléfono opcionales. Límites de nombre/contacto 150, correo 254 y teléfono 40; espacios exteriores eliminados y opcionales vacíos como `null`.
- `src/lib/servicios/clientes.ts` reutiliza Prisma, serializa fechas y obtiene conteos de cotizaciones. Guarda RUT canónico y detecta duplicados equivalentes heredados sin migrar registros automáticamente. La unicidad de PostgreSQL protege las creaciones concurrentes canónicas.
- Editar/Eliminar comparan `updatedAt`; la FK protege clientes con cotizaciones, también ante asociaciones posteriores a la apertura de la confirmación. No se borran documentos en cascada.
- Clientes no tiene selectores dependientes; Persona de contacto es texto. El requisito de búsqueda interna se aplicará al selector de Unidad de Materias primas.

### Hitos y validación

- [x] Respaldar los seis archivos existentes a modificar y la base local; originales con SHA-256 y dump en `backups/20261006_183227_crud_clientes`.
- [x] Implementar listado y filtro, Crear, Ver, Editar, Eliminar y confirmación.
- [x] Pasar `pnpm lint` y `pnpm build`.
- [x] Pasar `tests/clientes.integration.ts` contra copia temporal: RUT K/0, DV inválido, correo, límites/contacto, opcionales, duplicados equivalentes/heredados/concurrentes, conflictos de versión y protección por cotización.
- [x] Validar en Chromium: ciclo CRUD, modos/títulos, consulta sin escrituras, filtros de RUT/contactos sin acentos, errores/cancelación, foco, orden, paginación, cursor y móvil; sin diálogos nativos ni errores JavaScript/consola.
- [x] Comparar conteos y huellas originales de Clientes, Cotizaciones, sus detalles y Órdenes de venta: idénticos.
- [x] Detener el servidor temporal y comprobar con `ss` que 3031 queda libre; retirar la base temporal y conservar el servidor previo del usuario en 3030 (PID 87043).
- [x] Marcar los avances en MANTENEDORES-DATOS y AVANCES-INTERFAZ. Próximo módulo: Materias primas.

No se modificaron esquema, migraciones, seed, dependencias ni la guía visual. La comprobación de equivalencias de RUT consulta id/RUT del catálogo actual, como Proveedores; revisar su escala junto con la paginación en servidor cuando crezca.


## 2026-10-06: CRUD de Proveedores

Tercer mantenedor implementado en `/mantenedores/proveedores`, con la tabla y formularios modales del sistema. Se listan los datos reales y se filtran nombre, RUT y contactos, con orden y paginación. Los formularios conservan el listado y Ver es de solo lectura, incluido Enter.

- RUT obligatorio y validado; normalización al guardar y formato chileno al mostrar mediante utilidades reutilizables en `src/lib/validaciones/rut.ts`. Nombre obligatorio, correo/teléfono opcionales y errores por campo compartidos entre formulario y servidor. Límites de interfaz: 150/254/40 caracteres respectivamente; los opcionales vacíos se guardan como `null`.
- Las Server Actions delegan en `src/lib/servicios/proveedores.ts`, que reutiliza Prisma, serializa fechas y obtiene conteos de compras. La unicidad detecta RUT equivalentes heredados sin migrar los datos automáticamente; nuevas escrituras usan la clave canónica y el índice único de PostgreSQL. La comprobación de equivalencia consulta sólo id/RUT del catálogo actual; revisar su escala junto con la paginación en servidor futura.
- Editar/Eliminar requieren la versión `updatedAt`. La FK conserva los proveedores con compras, incluso si la compra se asocia después de abrir la confirmación. Avisos, notificaciones y confirmación son componentes existentes; no se usan diálogos nativos.
- Proveedores no tiene campos de selección relacionados. Se mantiene el requisito de filtro interno para los futuros selectores dependientes.

### Hitos y comprobaciones

- [x] Respaldar los seis archivos existentes a modificar y PostgreSQL antes de editar; manifiesto SHA-256 y dump en `backups/20261006_182209_crud_proveedores`.
- [x] Implementar listado, Crear, Ver, Editar y Eliminar con confirmación.
- [x] Validar con `pnpm lint` y `pnpm build`.
- [x] Ejecutar `tests/proveedores.integration.ts` en copia temporal: RUT con DV K/0, correo, límites, opcionales, duplicados heredados/equivalentes/concurrentes, conflictos de versión y FK de compras.
- [x] Validar en Chromium: CRUD, errores y cancelación, Enter en consulta, foco accesible, filtro en tres formatos de RUT y sin acentos, contactos, orden, paginación, cursor pointer, escritorio y móvil. Sin errores de JavaScript/consola ni diálogos nativos.
- [x] Comparar conteos y huellas de `Supplier`, `Purchase` y `PurchaseDetail` originales: idénticos antes/después.
- [x] Cerrar el servidor temporal de 3031 y retirar la base temporal; conservar el servidor previo del usuario en 3030 (PID 87043). Se verificó con `ss` que 3031 quedó libre.
- [x] Marcar avances en MANTENEDORES-DATOS y AVANCES-INTERFAZ; próximo mantenedor: Clientes.

Sin cambios en Prisma, migraciones, seed, dependencias ni la guía visual. Fuente de la regla de dígito verificador: [documentación técnica del SII](https://www.sii.cl/ccp/formato_envio_cp_electronico_052022.pdf), módulo 11 y K mayúscula. La validación local no comprueba la existencia tributaria.


## 2026-10-06: Server Actions a través de devtunnels

**Causa:** las solicitudes del túnel llegaban con `x-forwarded-host: b1315pk2-3030.brs.devtunnels.ms` y `Origin: http://localhost:3030`. Next.js rechazaba las acciones por la diferencia de origen antes de consultar PostgreSQL.

**Cambio:** `next.config.ts` configura, únicamente cuando `NODE_ENV` es `development`, `allowedDevOrigins` para el dominio exacto del túnel y `experimental.serverActions.allowedOrigins` para ese dominio y `localhost:3030`. Esta última excepción permite el origen reescrito por el túnel. No se agregan comodines ni excepciones en producción. Si cambia la URL del túnel, actualizar `dominioTunel` y reiniciar `pnpm dev`. La conexión de PostgreSQL permanece local.

### Hitos y validación

- [x] Respaldar `next.config.ts` y este documento antes de editar, con huellas SHA-256 en `backups/20261006_180948_devtunnels` (excluido de git).
- [x] Detener el servidor anterior del proyecto, autorizado por el usuario, y comprobar que 3030 quedó libre antes del reinicio.
- [x] Aplicar la configuración y reiniciar mediante `pnpm dev` en 3030.
- [x] Ejecutar `pnpm lint` y `pnpm build`: ambas comprobaciones pasaron.
- [x] Verificar que la configuración de producción no incorpora excepciones; los hosts exactos de desarrollo están permitidos y otros dominios/puertos son rechazados.
- [x] Chromium: consulta real con las cabeceras observadas en el túnel, respuesta HTTP 200 y formulario de solo lectura. Una solicitud con `Origin: https://externo.example` fue rechazada (HTTP 500 esperado por Next.js).
- [x] Validar desde la URL pública real: listado de Unidades, consultas Ver y Editar con HTTP 200, formulario Crear y confirmación Eliminar abiertos y cancelados; sin errores de JavaScript. Se aceptó el aviso inicial de Microsoft para acceder al túnel.
- [x] Conservar los datos existentes: no se guardaron ni eliminaron registros. No se repitieron escrituras del CRUD para esta corrección de transporte.
- [x] Detener el servidor de validación y comprobar con `ss` que 3030 queda libre.

Resultados y capturas en el respaldo. Para volver a usar la aplicación por el túnel, ejecutar `pnpm dev` y mantener el reenvío de 3030 activo. Referencias: [Server Actions](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions) y [allowedDevOrigins](https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins).

## 2026-10-06: CRUD de Bodegas

**Alcance:** segundo mantenedor completo en `/mantenedores/bodegas`. Se mantiene el diseño y los componentes compartidos existentes. No se modifica Prisma, las migraciones, el seed ni las dependencias.

### Comportamiento y estructura

- Se reemplazó la página provisional por el listado real con filtro de nombre/ubicación, orden, paginación y acciones Crear, Ver, Editar y Eliminar. Los formularios modales conservan la ruta, el filtro y la página; Ver usa controles de solo lectura.
- `src/lib/validaciones/bodega.ts` comparte las reglas Zod entre formulario y servidor: nombre obligatorio de hasta 100 caracteres, ubicación opcional de hasta 200, espacios exteriores eliminados y ubicación vacía guardada como `null`. Se conserva que `Warehouse.name` no es único.
- `src/lib/servicios/bodegas.ts` reutiliza el cliente Prisma y selecciona datos y conteos de las cuatro relaciones, serializando fechas ISO. Las Server Actions validan y revalidan la ruta después de guardar/eliminar.
- Editar/Eliminar comparan `updatedAt` para evitar escrituras sobre un registro que cambió. Las FK de `WarehouseStock`, `StockMovement`, `PurchaseDetail` y `WorkOrderDetail` impiden borrar una bodega referenciada, incluso con saldo cero o asociaciones posteriores a abrir la confirmación. No hay borrado en cascada.
- Se reutilizan tabla, avisos y confirmación de eliminación. Se añadieron carga, vacío y error con reintento para la ruta. Se conserva el cursor pointer de botones y la navegación por teclado.
- Bodegas no tiene selector dependiente. Se registró en `AGENTS.md` y el checklist que todo selector dependiente futuro debe tener búsqueda interna; su implementación se valida al desarrollar el módulo que lo necesite.

### Respaldo y validación

- Originales y dump local en `backups/20261006_173602_crud_bodegas`, excluido de git. Se validó el catálogo del dump y se restauró en una base temporal para ensayar las operaciones.
- Pasaron `pnpm lint`, `pnpm build` y las pruebas versionadas de `tests/bodegas.integration.ts`. Se comprobaron creación, consulta, edición, eliminación, ubicación opcional, límites, referencias inválidas, nombres repetidos permitidos y conflictos concurrentes. Cada una de las cuatro FK se probó de forma independiente, incluido stock cero.
- Chromium verificó ciclo CRUD, formularios de solo lectura, cancelación, filtro por nombre/ubicación, búsqueda sin acentos, orden, paginación, eliminación de la última fila de una página, confirmación, cursor y móvil. No hubo diálogos nativos ni errores de JavaScript/hidratación/consola. Capturas y resultados están en el respaldo.
- Se compararon conteos y huellas de Bodegas y sus cuatro tablas relacionadas en la base original: no cambiaron. La copia temporal se retiró y el servidor de pruebas liberó 3031. El servidor previo del usuario en 3030 se preservó.
- Hitos marcados en [MANTENEDORES-DATOS.md](MANTENEDORES-DATOS.md) y [AVANCES-INTERFAZ.md](AVANCES-INTERFAZ.md). Próximo mantenedor: Proveedores.

## 2026-10-06: Cursor de los botones habilitados

- Se agregó una regla global en `src/app/globals.css` para mostrar `cursor: pointer` en botones habilitados y controles con `role="button"`. Se aplica al CRUD, orden/paginación, formularios, confirmaciones y barra superior.
- Se excluyen controles con `disabled` o `aria-disabled="true"`, conservando sus estados de inactividad y las utilidades específicas de cursor de otros controles.
- Pasaron `pnpm lint` y `pnpm build`. En Chromium se verificó el cursor calculado de los botones del listado, barra superior, formulario y confirmación, incluidos los botones deshabilitados. No se guardaron ni eliminaron datos ni se inició un servidor adicional.
- Los originales se respaldaron en `backups/20261006_162338_cursor_botones`, excluido de git.

## 2026-10-06: CRUD de Unidades de medida

**Alcance:** primer mantenedor completo, autorizado por el usuario. Se conserva la guía visual y no se modifica Prisma, las migraciones ni el seed. Checklist en [MANTENEDORES-DATOS.md](MANTENEDORES-DATOS.md).

### Comportamiento y estructura

- `/mantenedores/unidades` consulta el catálogo real y sus conteos de materiales. La tabla tiene filtro superior por nombre/abreviatura, orden, paginación y acciones Crear, Ver, Editar y Eliminar. Los formularios modales conservan ruta, filtro y página del listado.
- Ver y Editar recuperan el registro actualizado. El modo Ver usa controles de solo lectura. Crear/Editar aplican el mismo esquema Zod en cliente y servidor, con React Hook Form, errores por campo y límites de 100/20 caracteres. Los nombres conservan la unicidad exacta del esquema existente.
- Las Server Actions delegan en `src/lib/servicios/unidades-medida.ts` y reutilizan `@/lib/prisma`. Tras guardar/eliminar se revalida la ruta. Los datos enviados al cliente contienen fechas ISO y conteos, sin objetos Prisma.
- Editar y Eliminar comparan `updatedAt` en la escritura para detectar cambios concurrentes. La FK protege los materiales asociados al borrar. Los errores de unicidad, dependencia y registro obsoleto se presentan con mensajes comprensibles; las operaciones fallidas conservan el formulario/confirmación.
- Se agregaron `DataTable` (TanStack Table 9), `ConfirmarEliminacion` (Radix AlertDialog), `Aviso` y `Notificaciones` (Sonner), reutilizables. No hay `alert`, `confirm` ni `prompt` nativos. Se controlan operaciones pendientes, Escape, retorno del foco y traducciones accesibles de avisos.
- Se incorporaron estados de carga, catálogo vacío, filtro sin coincidencias y error de consulta con reintento. La tabla se desplaza horizontalmente dentro de su panel en móvil.
- ESLint excluye `backups/**` para no analizar las copias locales y scripts históricos como código de la aplicación. Se actualizaron dependencias y lockfile; no se instalaron dependencias del resto de módulos.

### Respaldo y validación

- Originales y dump PostgreSQL previo en `backups/20261006_155645_crud_unidades`, excluido de git. El catálogo del dump se verificó con `pg_restore --list`; el respaldo se restauró en `mtx_validacion_unidades_20261006` para ensayar las operaciones sin modificar la base habitual.
- Pasaron ESLint y compilación de producción, incluida la comprobación de tipos. `tests/unidades-medida.integration.ts` verificó validación, consulta, creación, edición, duplicados concurrentes, versiones obsoletas y borrado restringido. La prueba exige una base `mtx_validacion_*`.
- Chromium verificó el ciclo CRUD, formularios de solo lectura, cancelación, confirmación, errores de duplicado/concurrencia/FK, filtro, orden, paginación, catálogo vacío y vista móvil. No hubo diálogos nativos ni errores de JavaScript/hidratación/consola. Capturas y resultados se conservan en el respaldo local.
- El servidor de producción temporal en 3031 se cierra al finalizar; se conserva el servidor del usuario en 3030. La base temporal se retira después de las pruebas. Los catálogos originales conservan seis unidades y cero materiales.

### Continuación

Bodegas será el siguiente mantenedor. Empresa, procesos, Dashboard con datos y autenticación/autorización permanecen pendientes. El catálogo de unidades usa filtro/paginación local; los catálogos grandes requerirán consultas paginadas en servidor.

## 2026-10-06: Plan de mantenedores de datos

- Se creó [MANTENEDORES-DATOS.md](MANTENEDORES-DATOS.md) con el orden de los cinco catálogos básicos y checks por listado, consulta, creación, edición, eliminación y validación.
- Se registró el patrón solicitado: tabla con filtro, formularios sobre el listado y componentes reutilizables de confirmación/alertas, sin diálogos nativos de JavaScript.
- Empresa se documenta como perfil único; Roles y Usuarios quedan para autenticación. No se confunden los catálogos básicos con los procesos de inventario, venta o cobranza.
- Se actualizaron las instrucciones de agentes y el seguimiento de interfaz. Esta planificación todavía no implementa funciones CRUD.

## 2026-10-06: Puerto de desarrollo 3030

- Se cambió el script `dev` en `package.json` de `next dev -p 1657` a `next dev -p 3030`, a petición del usuario.
- `pnpm dev` sirve la aplicación en `http://localhost:3030`. Se actualizaron las referencias de ejecución en `AGENTS.md` y `CLAUDE.md`.
- Los originales de los archivos modificados se conservaron en `backups/20261006_150938_puerto_dev_3030`, excluido de git.
- Se reinició el servidor con `pnpm dev` y se verificó una respuesta HTTP 200 en el puerto 3030.

## 2026-10-06: Tema oscuro y layout del ERP

**Alcance:** fases de tema y estructura de la aplicación según [GUIA-INTERFAZ.md](GUIA-INTERFAZ.md), sin modificar esa guía. Checklist y pendientes en [AVANCES-INTERFAZ.md](AVANCES-INTERFAZ.md).

### Qué cambió y por qué

- Se reemplazó la página inicial de Next.js por el grupo `src/app/(app)/`, con layout compartido, sidebar responsive y barra superior. La cookie conserva la expansión del menú entre recargas; su lectura en el servidor hace dinámicas estas rutas.
- Se inicializó shadcn/ui con Radix y preset Nova. Se agregaron los componentes necesarios para navegación, diálogos y menús, conservando el código en `src/components/ui/`. Se actualizaron `package.json`, el lockfile, `components.json` y `src/lib/utils.ts`.
- Se aplicaron los tokens de la guía, Inter y Geist Mono, modo oscuro, acentos azul/naranjo y cabeceras metálicas discretas. Se incorporaron foco, nombres accesibles, salto al contenido y respeto al movimiento reducido.
- `src/config/navegacion.ts` centraliza 16 rutas para sidebar, breadcrumbs y buscador Ctrl+K. Las páginas de módulos muestran su título y estado «Próximamente»; se incluyeron Cobranza y Empresa conforme a las decisiones de dominio.
- El Dashboard presenta cuatro indicadores y los paneles previstos, con estados vacíos explícitos. No hay métricas ficticias, consultas a Prisma, cambios de esquema ni escrituras en PostgreSQL. Alertas, búsqueda de registros, autenticación y módulos siguen pendientes.
- Se crearon `PageHeader`, `SectionCard`, `EmptyState` y `ModulePlaceholder` para reutilizar la estructura en las próximas pantallas. Los componentes que requieren interacción son cliente; las páginas y el layout mantienen renderizado en el servidor.
- Se adaptó el hook móvil a `useSyncExternalStore` para cumplir las reglas de React y mantener el breakpoint de 768 px. El buscador incluye el contenedor `Command` de cmdk y sus textos accesibles dentro del diálogo.

### Respaldo y verificación

Originales previos a la edición en `backups/20261006_142412_layout/`, excluidos de git, con manifiesto de hashes, capturas y resultados. Incluye la antigua página inicial, estilos, layout raíz, dependencias y documentación modificada.

Pasaron ESLint, generación de tipos de rutas, TypeScript y compilación de producción. La prueba en Chromium recorrió las 16 rutas, contracción/expansión y persistencia del sidebar, Ctrl+B, Ctrl+K, menús y navegación móvil. Se revisaron anchos de 1440, 375 y 768 px, sin desbordamiento horizontal ni errores de JavaScript/hidratación.

## 2026-10-06: Cuentas por cobrar y abonos

**Alcance:** estructura del punto 3 de Cobranza, migración PostgreSQL y cliente Prisma. Se conservaron los cambios anteriores de Stock Mínimo y Empresa. No se implementaron servicios, pantallas, generación automática de deuda ni operaciones de cobro.

### Qué cambió y por qué

- Se agregaron `AccountReceivable` y `Payment` en la sección 8 del esquema. `SalesOrder.accountReceivable` es una relación inversa opcional; `AccountReceivable.salesOrderId` es obligatorio y único, para evitar duplicar deuda por los despachos de una misma venta.
- La cuenta conserva `amount` como `Decimal(14,2)`, `issuedAt`, un vencimiento opcional `dueDate` y una promesa opcional `paymentPromiseDate`. Las dos últimas son fechas de calendario (`@db.Date`), independientes entre sí.
- El importe de la cuenta puede ser cero; los abonos deben ser positivos. Ambos rechazan `NaN` mediante CHECK SQL. No hay saldo ni estado de pago almacenados: se calcularán desde la cuenta y los abonos vigentes.
- Cada abono registra fecha, medio de pago obligatorio y no vacío, referencia y comprobante opcionales, y `idempotencyKey` UUID obligatorio y único. No tiene default: la aplicación debe conservar la misma clave al reintentar una operación. El medio es texto, sin imponer un catálogo de opciones todavía.
- Cuentas y abonos tienen `voidedAt` y `voidReason` opcionales, con CHECK que exige ambos juntos y un motivo no vacío. Permiten conservar el registro anulado y excluirlo de los cálculos futuros. Todos los modelos nuevos incluyen `createdAt` y `updatedAt`.
- Se indexaron el vencimiento y la consulta de pagos por cuenta, anulación y fecha. La unicidad de `salesOrderId` cubre el índice de esa FK; ambas relaciones usan `onDelete: Restrict` para impedir borrar ventas con cuenta o cuentas con abonos.
- Se creó y aplicó [20261006155755_cuentas_por_cobrar_y_abonos](../prisma/migrations/20261006155755_cuentas_por_cobrar_y_abonos/migration.sql). Usa una transacción explícita para crear ambas tablas, cinco CHECK, índices y relaciones de forma atómica. Conservar los CHECK en SQL: no se representan como atributos de Prisma.
- Se regeneró el cliente Prisma 7.9.1, con modelos `AccountReceivable` y `Payment` y accesos `prisma.accountReceivable` / `prisma.payment`.

### Transición y límites de esta etapa

- La revisión previa encontró **0 guías de despacho** en la base local; no hubo pagos históricos que conciliar. No se dedujeron deudas desde cotizaciones ni se insertaron pagos ficticios. Las tablas nuevas quedan vacías.
- Se conservan `DeliveryNote.paymentStatus`, `paymentPromiseDate` y `voucherUrl` como campos heredados; las nuevas operaciones se construirán sobre cuentas y abonos. Revisar de nuevo los datos antes de retirar esos campos o migrar otra base.
- La clave única permite rechazar operaciones duplicadas, pero la respuesta idempotente al cliente debe implementarse en el servicio. La estructura no impide por sí sola sobrepagos, pagos a cuentas anuladas, edición/borrado de abonos o cambios de un importe confirmado.
- Quedan pendientes la creación de la cuenta al confirmar una venta, la composición del importe, validaciones de entrada, registro de pagos con control de concurrencia, autorización y autoría de anulaciones, sobrepagos/devoluciones, cálculo de saldos/estados y KPIs. Cuotas y pagos repartidos entre ventas siguen fuera del alcance inicial.

### Respaldos previos

Carpeta local, excluida de git: `backups/20261006_125530_cobranza/`.

- `files/`, `cliente-prisma-anterior.tar.gz`, estado de git y diff previo: originales de los archivos editados, configuración, las tres migraciones anteriores y cliente con Stock Mínimo/Empresa.
- `database.dump`: respaldo completo de PostgreSQL anterior a Cobranza. Se verificó su catálogo con `pg_restore --list`, guardado en `database-catalog.txt`; no se realizó una restauración completa de ensayo.
- `manifest.json` y `SHA256SUMS`: comprobación de integridad de los archivos.
- `datos-antes.json` / `datos-despues.json`: conteos y huellas de las 18 tablas previas y sus secuencias, sin excluir columnas del dominio.
- `revision-guias.json`: revisión agregada de guías previas. `README.md`: contenido y recuperación del respaldo en otra base.

### Cómo se verificó

- Antes de aplicar, se validó el esquema y se probó el SQL en tablas temporales de ventas, cuentas y pagos, con IDs explícitos y `ROLLBACK`, sin alterar datos ni secuencias reales.
- Se verificaron cuenta única por venta, claves de operación duplicadas, importes decimales exactos, rechazo de importes negativos/`NaN`, abonos cero y medios vacíos, anulaciones incompletas, relaciones inválidas y borrado restringido.
- Un ejemplo SQL verificó el saldo con varios abonos y la exclusión de un abono anulado, conservando el historial. Es una comprobación del modelo de datos; no implementa las consultas ni los servicios de la aplicación.
- Después de migrar, se comprobaron directamente tipos, fechas, UUID sin default, cinco CHECK nuevos, dos FK, cuatro índices secundarios y conservación de los CHECK de Stock Mínimo y Empresa. Las tablas nuevas están vacías y los campos heredados siguen presentes.
- Las huellas y secuencias de las 18 tablas previas coinciden antes/después. Las dos nuevas secuencias pertenecen a las tablas de Cobranza; el historial de migraciones cambia como corresponde.
- `pnpm prisma generate`, `pnpm prisma validate`, `pnpm prisma migrate status` (cuatro migraciones aplicadas) y `pnpm prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`: correctos. El diff compara los elementos representados por Prisma; los CHECK se revisaron directamente.
- `pnpm lint` y `pnpm build`, incluida la comprobación TypeScript: correctos. El build tuvo acceso autorizado a Google Fonts.

Las pruebas se conservan en el respaldo como `verificacion-migracion-cobranza.sql` y `verificacion-estructura.sql`. Se actualizaron `AGENTS.md`, `CLAUDE.md` y la checklist de [PROPUESTAS-DOMINIO.md](PROPUESTAS-DOMINIO.md). La guía de interfaz permanece intacta; no se ejecutó seed ni se reinició la base.

---

## 2026-10-06: Perfil único de empresa

**Alcance:** estructura de datos del punto 2, migración PostgreSQL y regeneración del cliente Prisma. Se validó la migración antes de aplicarla y se respaldó el estado posterior a Stock Mínimo. No se desarrollaron módulos, pantallas ni generación de documentos.

### Qué cambió y para qué sirve

- Se agregó `CompanyProfile` en la sección 7 de `prisma/schema.prisma`, para los datos de la empresa que usa el ERP.
- Incluye `legalName`, `tradeName`, `rut`, `businessActivity`, `address`, `commune`, `city`, `email`, `phone` y `logoUrl`, todos `String?`. Permite completar el perfil gradualmente; los requisitos para emitir documentos se implementarán en la aplicación.
- Incluye `createdAt @default(now())` y `updatedAt @updatedAt`, siguiendo la convención existente.
- `id` es `Int @id @default(1)`, sin autoincremento. La PK y el CHECK SQL `CompanyProfile_singleton_check` permiten como máximo una fila, cuyo identificador debe ser `1`. No se agrega una secuencia ni índices redundantes.
- Se creó y aplicó [20261006154719_perfil_unico_empresa](../prisma/migrations/20261006154719_perfil_unico_empresa/migration.sql) en PostgreSQL local. La migración solo crea la tabla y sus restricciones; no inserta datos ficticios ni modifica tablas anteriores.
- Se regeneró el cliente Prisma 7.9.1, que expone el modelo `CompanyProfile` y el acceso `prisma.companyProfile`.
- Se actualizaron las reglas de `AGENTS.md` y `CLAUDE.md`, y los avances en [PROPUESTAS-DOMINIO.md](PROPUESTAS-DOMINIO.md).

**Reglas para el desarrollo posterior:** la tabla puede estar vacía o contener un perfil incompleto. El futuro módulo deberá normalizar/validar el RUT, definir campos requeridos antes de emitir documentos y conservar los datos de los documentos históricos. No se añadieron validadores de RUT, relaciones con documentos, almacenamiento de logos ni permisos en esta etapa. El CHECK de perfil único se mantiene en SQL, pues no se representa como atributo en Prisma.

### Respaldos previos

Carpeta local, excluida de git: `backups/20261006_124537_empresa/`.

- `files/`: originales de los archivos modificados, configuración Prisma y las dos migraciones anteriores, incluida Stock Mínimo.
- `cliente-prisma-anterior.tar.gz`: cliente generado anterior.
- `database.dump`: respaldo completo de `mtx_metal_erp` en formato custom de PostgreSQL. Su catálogo se verificó con `pg_restore --list` y quedó en `database-catalog.txt`; no se ensayó una restauración completa.
- `manifest.json`, `SHA256SUMS`, estado de git y diff previo: permiten comprobar los originales y distinguir el trabajo anterior de este cambio.
- `datos-antes.json` / `datos-despues.json`: conteos y huellas de las 17 tablas anteriores, incluido `minStock`, y sus secuencias.
- `README.md`: contenido del respaldo y referencia para recuperar una copia en otra base.

### Cómo se verificó

- Antes de aplicar: `pnpm prisma validate`, revisión del SQL generado y prueba de la migración en una tabla temporal, dentro de una transacción con `ROLLBACK`.
- La prueba verificó perfil incompleto, ID predeterminado `1`, campos y fechas, actualización de los datos, eliminación del logo mediante `NULL`, rechazo de un segundo perfil, rechazo de IDs `-1`, `0` y `2`, y rechazo de cambiar el ID a `2`.
- Después de aplicar: comprobación directa de las 13 columnas, nulabilidad de los diez campos de datos, tipo/default del ID, PK, CHECK validado y tabla vacía. También se comprobó que siguiera validado el CHECK de Stock Mínimo.
- Comparación de las 17 tablas anteriores y sus secuencias: datos idénticos. El registro de migraciones cambia como corresponde y la tabla nueva queda vacía.
- `pnpm prisma generate` y `pnpm prisma validate`: correctos; modelo y acceso generados disponibles.
- `pnpm prisma migrate status`: tres migraciones aplicadas. `pnpm prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`: sin diferencias en los elementos representados por Prisma. Los CHECK se verificaron directamente en PostgreSQL.
- `pnpm lint` y `pnpm build`, incluida la comprobación TypeScript del build: correctos. La compilación se ejecutó con acceso autorizado a las fuentes de Google usadas por la plantilla.

Las pruebas SQL están en el respaldo: `verificacion-migracion-empresa.sql` y `verificacion-estructura.sql`. No se ejecutó seed ni se reinició la base. La guía de interfaz conserva su contenido anterior.

---

## 2026-10-06: Stock mínimo por material y bodega

**Alcance:** estructura de datos, migración PostgreSQL y regeneración del cliente Prisma. El usuario autorizó avanzar con Stock Mínimo y pidió respaldos previos. Las pantallas, formularios, alertas y KPIs se implementarán en una etapa posterior.

### Qué cambió y por qué

- Se agregó `WarehouseStock.minStock` como `Decimal? @db.Decimal(14, 3)`, en la unidad del material. Se configura por combinación de material y bodega porque cada bodega puede necesitar un umbral diferente.
- No tiene valor predeterminado: `NULL` representa **sin configurar**, y cero es un mínimo válido. Las filas existentes quedan en `NULL`.
- Se creó y aplicó la migración [20261006150652_stock_minimo_por_bodega](../prisma/migrations/20261006150652_stock_minimo_por_bodega/migration.sql) en la base local `mtx_metal_erp` de PostgreSQL 15.
- La migración agrega el campo y el CHECK `WarehouseStock_minStock_nonnegative_check` en una sola sentencia `ALTER TABLE`. Rechaza mínimos negativos y `NaN`; PostgreSQL admite este último en columnas `numeric`, pero no tiene sentido como umbral.
- El CHECK se mantiene en el SQL de la migración, porque no se representa como atributo en el esquema Prisma. Conservarlo en migraciones futuras; la comparación de esquemas de Prisma por sí sola no valida esta restricción.
- Se regeneró `src/generated/prisma/` con Prisma 7.9.1. El modelo generado expone `minStock` como `Decimal | null`.
- Se conservaron la unicidad de bodega/material, los índices, las cantidades, el kardex y las fechas anteriores. Configurar un mínimo no es un movimiento de existencias.
- Se actualizaron `AGENTS.md`, `CLAUDE.md` y la checklist de [PROPUESTAS-DOMINIO.md](PROPUESTAS-DOMINIO.md). La ubicación en `WarehouseStock` reemplaza la propuesta inicial de `RawMaterial.minStock` de la guía, que permanece sin editar.

### Respaldos previos

Carpeta local, excluida de git: `backups/20261006_120436_stock_minimo/`.

- `files/`: copia previa de `prisma/schema.prisma`, `prisma.config.ts`, las migraciones existentes, `AGENTS.md`, `CLAUDE.md`, `docs/CAMBIOS.md` y `docs/PROPUESTAS-DOMINIO.md`.
- `cliente-prisma-anterior.tar.gz`: cliente generado anterior.
- `database.dump`: respaldo completo de la base en formato custom de `pg_dump`. Se verificó la lectura de su catálogo con `pg_restore --list`; no se realizó una restauración completa de ensayo.
- `manifest.json` y `SHA256SUMS`: huellas para verificar las copias y los archivos del respaldo.
- `datos-antes.json` / `datos-despues.json`: conteos y huellas de los datos originales y valores de las secuencias.
- `README.md`: alcance del respaldo, comandos para revisar/restaurar en otra base y resultados de validación.

### Cómo se verificó

- `pnpm prisma validate`: esquema válido.
- `pnpm prisma generate`: cliente regenerado correctamente.
- `pnpm prisma migrate status`: las dos migraciones están aplicadas.
- `pnpm prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`: sin diferencias en los elementos representados por Prisma.
- Comprobación directa en PostgreSQL de `numeric(14,3)`, nulabilidad, ausencia de default y CHECK validado en la tabla real.
- Prueba de la migración sobre una tabla temporal con datos previos: mínimos inicialmente nulos, cero, fracciones de tres decimales, valor máximo, rechazo de negativos, `NaN` y exceso de precisión, mínimos independientes en dos bodegas y conservación de la unicidad. También se verificó volver a `NULL` y conservar saldos y fechas. La prueba usa IDs explícitos y termina con `ROLLBACK`.
- Comparación de las 17 tablas del dominio y sus secuencias antes/después: datos anteriores idénticos. Se excluyó únicamente el campo nuevo de las huellas y el registro de migraciones, que cambia al aplicar la migración.
- `pnpm lint`, `pnpm exec tsc --noEmit` y `pnpm build`: correctos. El primer build dentro del sandbox falló al descargar Geist desde Google Fonts; el segundo, con acceso de red autorizado, terminó correctamente.

Las pruebas SQL reproducibles quedan en la carpeta de respaldo como `verificacion-stock-minimo.sql` y `verificacion-estructura.sql`. No se cargó seed ni se reinició la base.

### Pendientes para los módulos

- Formularios y validación de entrada, consultas de stock bajo, indicadores y pruebas de sus reglas de negocio.
- Política de saldos negativos y selección de combinaciones a monitorear. Este cambio restringe el **mínimo**, no el saldo disponible.
- Empresa y Cobranza mantienen el estado de propuesta.

---

## 2026-10-05 (segunda parte): Fechas de registro y migración inicial

Completa los dos puntos que habían quedado pendientes en la revisión anterior (ver más abajo). Con esto, la base de datos local queda al día con el esquema.

### 9. Fechas de registro y vencimiento de la cotización

**Qué cambió:**
- **Todos los modelos** tienen `createdAt` (fecha de registro), que se llena sola al crear el registro y no cambia después.
- **Todos los modelos, salvo `StockMovement`,** tienen `updatedAt` (última modificación), que Prisma actualiza solo en cada cambio. `StockMovement` no lo tiene porque un movimiento de stock no se edita: si hubo un error, se corrige con un nuevo movimiento de tipo `AJUSTE`.
- **`Quote`** tiene un nuevo campo opcional, `validUntil`: la fecha hasta la que se mantiene la oferta.

**Por qué:**
- **Fechas de registro:** no había forma de saber cuándo se creó o se modificó un cliente, un material o una orden de trabajo.
- **Vencimiento:** en estructuras metálicas los precios del acero cambian seguido, así que una cotización sin vencimiento puede obligar a respetar precios desactualizados.

**Para qué sirve:**
- **Ordenar y filtrar:** por ejemplo, "materiales creados este mes" o "órdenes modificadas hoy".
- **Revisión:** detectar registros modificados después de lo esperado.
- **Vencimiento:** mostrar en la cotización "válida hasta" y detectar las vencidas.

**Diferencia entre `date` y `createdAt`:** varios modelos (`Purchase`, `Quote`, `SalesOrder`, `DeliveryNote`, `StockMovement`) ya tenían `date`. Son dos fechas distintas:
- `date` es la **fecha del documento o del hecho**, y se puede indicar a mano. Por ejemplo, una factura de compra del lunes que se ingresa al sistema el miércoles.
- `createdAt` es **cuándo se ingresó al sistema**, y no se puede cambiar.

### 10. Migración inicial

**Qué cambió:** se creó la primera migración, `prisma/migrations/20261006004602_correccion_de_estructura_de_datos_y_uso_de_tipos_de_datos_mas_logicos/`. Prisma convierte el nombre pedido ("Corrección de estructura de datos y uso de tipos de datos más lógicos") a un formato válido para carpetas: sin tildes ni espacios, y con la fecha y hora de creación al inicio.

Para aplicarla se reinició la base local, lo que borró los datos de prueba, y se volvió a ejecutar el seed.

**Por qué:** la base se había creado con `prisma db push`, que aplica el esquema directamente sin dejar registro. Así no había forma de repetir los cambios en otra base (otro computador o el servidor de producción) ni de saber qué versión del esquema tenía cada una.

**Para qué sirve:**
- **Archivo SQL:** cada cambio de esquema queda guardado en `prisma/migrations/` y se sube a git junto con el código.
- **Otras bases:** cualquier base nueva se deja al día con un solo comando:
  ```bash
  pnpm prisma migrate deploy   # en producción: aplica las migraciones pendientes sin borrar datos
  pnpm prisma migrate dev      # en desarrollo: además detecta cambios nuevos en el esquema
  ```

**Cómo se trabaja desde ahora:**
1. Editar `prisma/schema.prisma`.
2. Ejecutar `pnpm prisma migrate dev --name <descripción del cambio>`.
3. Ejecutar `pnpm prisma generate`. **En Prisma 7, `migrate dev` ya no lo hace solo.** Si se omite, el código sigue usando el cliente antiguo. Pasó durante esta migración: el seed falló porque el cliente no conocía `updatedAt`, y funcionó después de regenerarlo.
4. No volver a usar `prisma db push` en esta base, porque deja el historial de migraciones desalineado.

### Cómo se verificó

- **Migración:** `prisma migrate status` indica que la base está al día. El SQL crea las 17 tablas con sus 27 índices, las columnas `DECIMAL` y las fechas `createdAt`/`updatedAt`.
- **Seed:** se ejecutó correctamente (3 roles, 6 unidades, 1 usuario) y las fechas se llenaron solas.
- **Código:** pasaron sin errores `tsc --noEmit`, `pnpm lint` y `pnpm build`.

### Pendientes

- **Seguridad, inicio de sesión y roles:** quedan para una etapa posterior. Esto incluye las contraseñas en texto plano del seed.

---

## 2026-10-05: Revisión del modelo de datos y la configuración base

Esta revisión corrige problemas encontrados en el código inicial, antes de construir pantallas y lógica sobre él. La numeración sigue la de la revisión original. Los puntos 9 (fechas de registro) y 10 (migraciones) quedaron pendientes a propósito.

> **Nota:** los puntos 9 y 10 se completaron después, en la sección "segunda parte" de arriba. La base de datos local ya tiene todos estos cambios.

### Resumen

| # | Cambio | Archivo |
|---|--------|---------|
| 1 | Las órdenes de trabajo pueden ser de obra propia (sin cliente) | `prisma/schema.prisma` |
| 2 | Nuevo modelo `QuoteDetail`: líneas de la cotización | `prisma/schema.prisma` |
| 3 | Compras y consumos indican su bodega | `prisma/schema.prisma` |
| 4 | Nuevo modelo `StockMovement`: historial de stock (kardex) | `prisma/schema.prisma` |
| 5 | Montos y cantidades pasan de `Float` a `Decimal` | `prisma/schema.prisma` |
| 6 | Regla clara de unidades: una unidad por material | `prisma/schema.prisma` |
| 7 | Nombre de unidad de medida único; el seed usa `upsert` | `prisma/schema.prisma`, `prisma/seed.ts` |
| 8 | Índices en todas las claves foráneas | `prisma/schema.prisma` |
| 11 | `dotenv` agregado como dependencia | `package.json`, `prisma/seed.ts` |
| 12 | Cliente de base de datos más robusto | `src/lib/prisma.ts` |
| 13 | Generador `prisma-client` de Prisma 7 | `prisma/schema.prisma`, `src/lib/prisma.ts` |
| 14 | Limpieza de restos de plantilla | `src/app/layout.tsx`, `docker-compose.yml` |

---

### 1. Órdenes de trabajo de obra propia

**Qué cambió:** en `WorkOrder`, el campo `salesOrderId` ahora es opcional. También se agregó `description` (opcional) para detallar el trabajo.

**Por qué:** antes, toda orden de trabajo tenía que colgar de una orden de venta, y esta de una cotización y un cliente. No se podía registrar una estructura fabricada por iniciativa propia, como un trabajo para stock, para uso interno o para un proyecto personal.

**Para qué sirve:**
- Con `salesOrderId` → es un trabajo encargado por un cliente.
- Con `salesOrderId` vacío (`null`) → es una **obra propia**.

Ambos tipos consumen materiales de bodega de la misma forma. Para listar solo las obras propias:

```ts
prisma.workOrder.findMany({ where: { salesOrderId: null } })
```

### 2. Líneas de detalle en la cotización (`QuoteDetail`)

**Qué cambió:** se agregó el modelo `QuoteDetail`, que se relaciona con `Quote` mediante `details`. Cada línea tiene descripción, cantidad, precio unitario y, si corresponde, un material del catálogo.

**Por qué:** `Quote` solo guardaba el monto total. No quedaba registro de qué se había cotizado, y no se podía armar el PDF de la cotización ni saber qué materiales iba a requerir el trabajo.

**Para qué sirve:**
- **Línea con `rawMaterialId`** → un material del catálogo (por ejemplo, "Plancha 3 mm, 2,5 kg").
- **Línea sin `rawMaterialId`** → un ítem libre, como mano de obra, flete, instalación o pintura.
- **Total:** `totalAmount` se mantiene en `Quote`. Al crear la cotización desde la aplicación debe calcularse como la suma de `quantity × unitPrice` de sus líneas.

### 3. Bodega en compras y consumos

**Qué cambió:** se agregó `warehouseId` (obligatorio) a:
- `PurchaseDetail`: la bodega donde **se recibe** el material comprado.
- `WorkOrderDetail`: la bodega de la que **se descuenta** el material usado.

**Por qué:** había varias bodegas, pero ni las compras ni los consumos decían cuál usar. Al recibir una compra no se sabía qué stock aumentar, y al iniciar un trabajo no se sabía qué stock descontar.

**Para qué sirve:** es lo que permite mantener correcto el stock por bodega. Se definió por línea, y no por compra completa, para que una misma compra pueda repartirse en distintas bodegas.

### 4. Historial de movimientos de stock (`StockMovement`)

**Qué cambió:** se agregó el modelo `StockMovement` y el enum `StockMovementType`, con tres tipos:
- `ENTRADA`: compra recibida.
- `SALIDA`: consumo de una orden de trabajo.
- `AJUSTE`: corrección manual, como inventario, merma o pérdida.

Cada movimiento guarda la fecha, la bodega, el material y la cantidad **con signo**: positiva suma y negativa resta. Opcionalmente guarda su origen (`purchaseDetailId` o `workOrderDetailId`) y una nota.

**Por qué:** `WarehouseStock` solo guarda el saldo actual. Si el número no cuadraba con lo que había físicamente en bodega, no había forma de saber qué pasó ni cuándo.

**Para qué sirve:**
- **Kardex:** ver el historial completo de un material en una bodega.
- **Revisión:** cada ajuste queda registrado, con su motivo en `note`.
- **Recálculo:** el stock se puede reconstruir sumando los movimientos.

**Regla para el desarrollo futuro:** cada vez que cambie `WarehouseStock.quantity`, hay que crear el `StockMovement` correspondiente **dentro de la misma transacción** (`prisma.$transaction`). Así el saldo y el historial nunca quedan desalineados.

### 5. `Decimal` en lugar de `Float`

**Qué cambió:** todos los montos y cantidades pasaron a `Decimal`:
- **Dinero** (`totalAmount`, `unitPrice`): `Decimal(14, 2)`, es decir, hasta 12 dígitos enteros y 2 decimales.
- **Cantidades** (`quantity`, `quantityNeeded`): `Decimal(14, 3)`, que permite fracciones como 2,5 m o 0,125 kg.

**Por qué:** `Float` guarda los números de forma aproximada. Por ejemplo, `0.1 + 0.2` da `0.30000000000000004`. Al sumar muchas compras, consumos o líneas de cotización, esos errores se acumulan y aparecen descuadres de centavos o de gramos. Se eligió `Decimal` también para el dinero, en vez de `Int`, para no impedir precios con decimales (por ejemplo, el precio por kilo) ni otras monedas en el futuro.

**Para qué sirve:** las cuentas son exactas. Se comprobó en una base de prueba: `0.1 + 0.2` dio `0.3`.

**Cómo se usa en el código:** Prisma devuelve estos campos como objetos `Prisma.Decimal`, no como `number`.
- **Para escribirlos:** se pueden pasar como texto (`'1050.30'`) o como número.
- **Para operar:** se usan sus métodos (`.plus()`, `.times()`, etc.), no `+` ni `*`.
- **Para mostrarlos:** se usa `.toString()` o `.toNumber()`.

### 6. Una unidad de medida por material

**Qué cambió:** se eliminó el comentario de `WarehouseStock` que decía que la cantidad se guardaba "en la unidad mínima (ej. gramos)". En su lugar, `RawMaterial` documenta la regla.

**Por qué:** ese comentario contradecía el resto del sistema. El catálogo tiene Kilos, Litros y Metros, pero no hay factores de conversión entre unidades.

**Para qué sirve:** la regla queda así: **cada material se maneja siempre en una sola unidad, la de su `unitMeasure`**. Stock, compras, consumos y cotizaciones de ese material se expresan en esa unidad. Por ejemplo, si el perfil "Tubo 40×40" se define en metros, todo lo que tenga que ver con él va en metros.

### 7. Nombre de unidad de medida único

**Qué cambió:** `UnitMeasure.name` ahora es `@unique`. En `prisma/seed.ts`, la búsqueda manual con `findFirst` + `create` se reemplazó por `upsert`, igual que en los roles.

**Por qué:** sin la restricción, la base aceptaba dos unidades llamadas "Kilos". El seed tenía que verificarlo a mano, y la aplicación tendría que haber hecho lo mismo.

**Para qué sirve:** es la base de datos la que impide duplicados, y el seed queda más corto. Se comprobó que el seed puede ejecutarse dos veces seguidas sin duplicar datos.

### 8. Índices en claves foráneas

**Qué cambió:** se agregó `@@index` a todas las claves foráneas, por ejemplo `clientId` en `Quote` y `workOrderId` en `WorkOrderDetail`. `StockMovement` tiene además un índice compuesto (bodega, material, fecha) para consultar el kardex.

**Por qué:** PostgreSQL crea índices automáticamente para las claves primarias y los campos `@unique`, pero **no** para las claves foráneas.

**Para qué sirve:** consultas como "cotizaciones de este cliente" o "materiales de esta orden de trabajo" siguen siendo rápidas cuando hay miles de registros. Con pocos datos no se nota la diferencia; con muchos, sí.

### 11. Dependencia `dotenv`

**Qué cambió:** se instaló `dotenv` como dependencia de desarrollo. Además, `prisma/seed.ts` ahora lo carga al inicio.

**Por qué:**
- `prisma.config.ts` importaba `dotenv/config`, pero el paquete no estaba instalado; funcionaba solo porque Prisma lo resolvía por su cuenta.
- Al ejecutar el seed directamente con `tsx prisma/seed.ts`, sin pasar por `prisma db seed`, `DATABASE_URL` llegaba vacía.

**Para qué sirve:** la carga del archivo `.env` queda garantizada y el seed funciona de las dos formas.

### 12. Cliente de base de datos (`src/lib/prisma.ts`)

**Qué cambió:**
- **Validación de `DATABASE_URL`:** si falta, ahora lanza un error claro: *"Falta la variable de entorno DATABASE_URL. Revisa el archivo .env."*
- **Log según el entorno:** en desarrollo se muestran las consultas SQL; en producción, solo los errores.
- **Conexiones:** el cliente y su conexión se crean una sola vez y se reutilizan en cada recarga en caliente. Antes se creaba un `Pool` nuevo en cada recarga aunque no se usara. Ahora el adaptador `PrismaPg` recibe la cadena de conexión y administra su propio Pool.

**Por qué:**
- **Sin validación:** si faltaba la variable, la aplicación intentaba conectarse a una base por defecto y fallaba con un error confuso.
- **Log de SQL en producción:** llenaba los registros del servidor y podía exponer datos.

**Para qué sirve:** los errores de configuración se detectan al instante, los logs de producción quedan limpios y no se abren conexiones de más durante el desarrollo.

### 13. Generador `prisma-client` (Prisma 7)

**Qué cambió:**
- **Generador:** pasó de `prisma-client-js` a `prisma-client`.
- **Ubicación:** el cliente se genera en `src/generated/prisma/`, carpeta ignorada por git.
- **Imports:** el cliente se importa desde `src/generated/prisma/client` en vez de `@prisma/client`.

**Por qué:** `prisma-client-js` es el generador antiguo, que se mantiene solo por compatibilidad. `prisma-client` es el recomendado en Prisma 7: genera código TypeScript normal, visible dentro del proyecto, y no depende de `node_modules`.

**Para qué sirve:** el proyecto queda alineado con la versión actual de Prisma, lo que evita una migración forzada más adelante.

**Atención:** como el cliente generado no se sube a git, después de clonar el proyecto o de cambiar el esquema hay que ejecutar `pnpm prisma generate`.

### 14. Restos de la plantilla inicial

**Qué cambió:**
- **`src/app/layout.tsx`:** el idioma pasó de `en` a `es`. El título ahora es "MTX Metal ERP" y la descripción explica el propósito del sistema.
- **`docker-compose.yml`:** se eliminó la línea `version: '3.8'`.

**Por qué:**
- **Idioma:** el navegador y los lectores de pantalla usan el idioma declarado para la ortografía, la traducción automática y la pronunciación.
- **Título:** es el que aparece en la pestaña del navegador.
- **`version`:** Docker Compose ya no usa ese campo y muestra una advertencia cada vez que se ejecuta.

**Para qué sirve:** la aplicación se identifica correctamente y Docker deja de mostrar advertencias.

---

### Cómo se verificó

Para no tocar la base de datos actual, se creó una base temporal en el mismo contenedor de PostgreSQL, que se borró al terminar. En ella:

- **Esquema:** se aplicó el nuevo esquema sin errores.
- **Seed:** se ejecutó dos veces (con `tsx` y con `prisma db seed`) sin duplicar datos.
- **Datos de prueba:** se creó una compra con bodega y su movimiento de stock, una cotización con una línea de material y otra de mano de obra, y una orden de trabajo de obra propia.
- **Error de configuración:** se comprobó el mensaje cuando falta `DATABASE_URL`.

Además, pasaron sin errores `prisma validate`, `tsc --noEmit`, `pnpm lint` y `pnpm build`.

### Pendientes (en ese momento)

- **Puntos 9 y 10:** completados en la segunda parte (ver arriba).
- **Seguridad, inicio de sesión y roles:** quedan para una etapa posterior.

## 2026-10-06 — Módulo Configuración de Empresa

Se sustituyó la página provisional por consulta y configuración del único `CompanyProfile`, con datos parciales, validación compartida de RUT/correo/límites, formulario modal, confirmación reutilizable al descartar y avisos de carga/error. La creación es explícita; PK/CHECK y control de `updatedAt` evitan sobrescribir una primera creación o edición concurrente.

Por decisión del usuario se incluyó **carga local del logo**, con adaptador `AlmacenLogo` preparado para futura sustitución por S3. Sharp 0.34.5 se agregó como dependencia directa (misma versión ya usada por Next.js): decodifica PNG/JPEG/WebP de hasta 2 MB y 16 megapíxeles, genera PNG hasta 512 × 512 y elimina metadatos. La URL lógica del ERP permanece independiente del directorio; su endpoint valida nombres UUID. Next.js admite cuerpos de Server Actions hasta 3 MB, conservando las excepciones del túnel únicamente en desarrollo.

Reemplazar/quitar conserva versiones previas; un fallo de BD retira el archivo nuevo sin asociar. El almacenamiento predeterminado `var/empresa/logos/` está excluido de git y se configura con `EMPRESA_LOGO_DIR`. Respaldarlo junto con PostgreSQL. S3 requerirá un adaptador y traslado de los archivos conservando sus claves; no está implementado todavía.

Respaldos en `backups/20261006_191941_modulo_empresa/`, con originales y SHA-256, dump, integración, capturas y comparación de datos. ESLint, TypeScript, build, integración sobre copia temporal y Chromium local pasaron. Datos originales comparados: sin cambios. Copia de prueba retirada y 3031 libre; servidor previo en 3030 preservado. Prisma, migraciones, seed y guía visual permanecen intactos.

El túnel queda pendiente de autorización específica solicitada después de un rechazo de revisión automática por posible exposición de datos privados. La revisión funcional del usuario también queda pendiente. Checklist y reglas en [HITO-EMPRESA.md](HITO-EMPRESA.md).

## 2026-10-06 — Consultas de Stock/Kardex y preparación de Compras

Se reemplazaron las páginas provisionales de Stock y Movimientos por consultas de sólo lectura con filtros buscables de material/bodega, búsqueda textual, tipo/fechas en Kardex y detalles sobre el listado. Stock distingue mínimos nulos/cero y enlaza a los movimientos de su combinación. La unidad acompaña cada cantidad; los orígenes conservan las referencias a líneas de compra/trabajo.

La tabla reutilizable de consulta pagina y ordena en PostgreSQL, sin limitar la búsqueda a la página visible: tamaños 10/20/50, orden secundario estable, mínimos nulos al final y ajuste de página. Las consultas usan `RepeatableRead` para conservar la coherencia entre total y filas. Decimal se serializa como texto y se formatea sin conversión a `number`; las fechas se muestran en Santiago y los filtros incluyen días completos, incluso en cambios de hora. Filtros rechazados conservan sus controles; Reintentar vuelve a solicitar datos al servidor.

Se creó [HITO-COMPRAS.md](HITO-COMPRAS.md) con etapas y checks. Recepción inmediata/parcial, importes/impuestos/descuentos, documento del proveedor y correcciones fueron consultados al usuario; su persistencia y cambios de esquema esperan respuestas explícitas. No se definieron alternativas por defecto.

Respaldos en `backups/20261006_213943_consulta_inventario/`: originales/SHA-256, PostgreSQL y logos existentes, integración, capturas/scripts y comparación de las 20 tablas originales. ESLint, build/tipos, integración y Chromium pasaron, incluyendo un servidor temporal de fallo de conexión y reintento. Se observó un aviso de deprecación de `pg` en el servidor, sin fallo de las verificaciones de datos. La copia temporal fue retirada y 3031 quedó libre; 3030 conserva el servidor previo del usuario.

No se cambiaron Prisma, migraciones, seed, dependencias ni GUIA-INTERFAZ en esta entrega, y se conservaron los cambios previos de Empresa. Configuración de mínimos, ajustes, alertas, saldo acumulado por movimiento y escrituras de Compras siguen pendientes.

## 2026-10-06 — Corrección de deprecación pg en Stock y Movimientos

La carga de relaciones hermanas dentro de `findMany` originaba consultas internas simultáneas sobre la conexión única de la transacción Prisma. Se reemplazó por consultas escalares y lotes secuenciales de referencias para la página, manteniendo `RepeatableRead`, paginación, orden y resultados. No se suprimen advertencias ni se cambian dependencias.

Se agregó una regresión concurrente en `tests/inventario.integration.ts`, validada con `NODE_OPTIONS=--throw-deprecation`. ESLint y build/tipos pasaron; Chromium comprobó escritorio/móvil contra Next.js en desarrollo, sin errores ni deprecaciones. `tsconfig.json` excluye ahora los originales de `backups` de la compilación. AGENTS registra la regla para evitar reintroducir el problema.

Respaldos y evidencias en `backups/20261006_220615_aviso_pg_inventario/`. Las 20 tablas originales conservaron conteos/huellas; base temporal retirada y 3031 libre. Se preservó el servidor del usuario en 3030. Detalles y checks en [HITO-COMPRAS.md](HITO-COMPRAS.md). Sin cambios de esquema, migraciones o guía visual.

## 2026-10-06 — Plan detallado de Compras aprobado

Se documentaron las reglas acordadas de recepción parcial, bodega única por compra, presentación y factor histórico, identificación del documento, bloqueo tras consumo, redondeo de importes por línea y cierre de pendientes con motivo. [HITO-COMPRAS.md](HITO-COMPRAS.md) desglosa diseño/migración, Tipos de documentos, Compras, recepciones, cierres/anulación y validaciones con checks independientes. Distingue decisiones aprobadas, precisiones pendientes y tareas aún no implementadas.

Se actualizó el seguimiento de mantenedores y AGENTS para reflejar el plan. Originales respaldados en `backups/20261006_231005_plan_compras/`, con SHA-256. Sólo documentación: esquema, migraciones, código y base de datos permanecen sin cambios en esta entrega; revisión de contenido y diff, sin levantar servidores.

## 2026-10-07 — Inicio de preparación técnica de Compras

Se revisaron checkpoints y estructura vigente y se documentó el diseño de idempotencia/control de versión en [HITO-COMPRAS.md](HITO-COMPRAS.md). Se enviaron precisiones pendientes; redondeo en empates, fracciones, precio/correcciones y normalización documental esperan respuestas explícitas. Se preservan los cambios previos.

Respaldo documental con hashes en `backups/20261007_124650_preparacion_compras/`. Revisión de contenido y diff; sin modificaciones de Prisma, migraciones, cliente generado ni BD y sin servidores nuevos.

## 2026-10-07 — Estructura de Compras y recepción parcial

Se incorporaron tipos documentales, bodega única de compra, identidad documental con RUT/código histórico y número textual normalizado, presentación/factor/precio/importe por detalle, recepción parcial, cierre de pendientes y operación idempotente. Compra admite versión, anulación con motivo y eliminación lógica sin liberar su identidad. Se conservaron referencias existentes y se agregaron relaciones de entrada/reversión de recepción.

Migración `20261007160000_compras_recepciones_parciales`: FK compuestas, unicidad, CHECK numéricos/documentales/de anulación y trigger de precio inmutable desde guardar. Fue probada sobre copia y aplicada al PostgreSQL local; no hay diferencias Prisma ni migraciones pendientes. La base tenía cero compras/detalles/movimientos; una guardia transaccional rechaza otros destinos con compras históricas sin inventar datos ni modificar su contenido.

Bodegas cuenta/protege compras desde cabecera incluso sin líneas. Fixtures de cuatro pruebas se adaptaron al nuevo contrato; se agregó validación SQL con rollback. Pasaron restricciones, Inventario sin deprecaciones, Bodegas/Materiales/Proveedores, lint, tipos y build final. Los errores esperados en pruebas negativas de FK/versión/unicidad no son fallos de validación.

Respaldos en `/home/metaltux/Proyectos/mtx-metal-erp/backups/20261007_125837_estructura_compras/`: originales/hashes, migraciones, cliente generado anterior, dump y evidencias. Las 20 tablas originales conservaron conteos y huellas; cinco tablas nuevas vacías. Copias retiradas y puertos 3030/3031 libres. No hubo seed, reset, cambios de dependencias ni guía visual. No se implementaron módulos nuevos: siguiente etapa es CRUD de Tipos de documentos. Las reglas de concurrencia/sobre-recepción/anulación y confirmaciones siguen pendientes del servicio, como detalla [HITO-COMPRAS.md](HITO-COMPRAS.md).

## 2026-10-07 — Tipos documentales fijos de Compras

Por decisión del usuario se reemplazó el CRUD planificado por Factura de Compra, Boleta de Compra y Guía de Compra. Catálogo centralizado y carga transaccional/idempotente integrada al seed, con opción `--documentos` que evita ejecutar sus otras cargas. Se cargaron sólo estos tres tipos en PostgreSQL local después de comprobar dos ejecuciones en copia y conservación de otras 24 tablas. Sin cambios de esquema ni migraciones.

Originales y PostgreSQL respaldados en `/home/metaltux/Proyectos/mtx-metal-erp/backups/20261007_131724_tipos_fijos/`. ESLint/build aprobados; copia retirada y puertos libres. Checkpoints actualizados; siguiente etapa: listado/formulario de Compras, sin mantenedor documental ni funciones contables.

## 2026-10-07 — Listado y registro de Compras

Se reemplazó la página provisional por listado paginado/ordenado en PostgreSQL con filtro por proveedor/RUT/número y formularios Crear/Ver/Editar sobre el listado. Selectores buscables usan los catálogos existentes y los tres tipos fijos. La confirmación compartida advierte precios inmutables; Decimal recalcula equivalencias/importes/total en servidor. Guardar compra no altera stock/Kardex.

Servicios comentados protegen precio, identidad/estructura tras recepción, duplicados, reintentos de creación/eliminación y versión de edición. Eliminación lógica sólo tras anular conserva documentos, recepciones y movimientos. El detalle muestra cantidades, historial/motivos y enlace contextual al Kardex. Registrar recepciones/cierres y anular siguen pendientes de sus etapas.

Respaldos en `/home/metaltux/Proyectos/mtx-metal-erp/backups/20261007_143849_modulo_compras/`. Pasaron integración en copia, lint/build/tipos y Chromium en producción/desarrollo; fixtures de historial/anulación se escribieron sólo en copia. Las 25 tablas reales conservaron huellas/conteos. Copia/servidores retirados y puertos libres. Sin cambios de esquema, migraciones, guía visual o dependencias del proyecto. Checks en [HITO-COMPRAS.md](HITO-COMPRAS.md); siguiente etapa tras revisión funcional: recepciones parciales.


## 07-10-2026 — Recepciones parciales de Compras

Se implementa `recibirCompra` y su formulario sobre el listado, con revisión de equivalencias en servidor y confirmación reutilizable. Stock, recepción, detalle, movimiento de entrada y UUID/huella se persisten juntos bajo bloqueos ordenados y control de versión. Se conserva mínimo, precio, factor y unidad; pendientes derivados sin estados duplicados. La invalidación actualiza Compras, Stock/Kardex y referencias de mantenedores. Sin nueva migración. Validaciones: Decimal/precisión, concurrencia/idempotencia, rollback SQL inducido, regresiones Compras/Inventario, lint/tipos/build y Chromium desktop/móvil con Node `--throw-deprecation`. Respaldo PostgreSQL y archivos previo; datos reales conservados, copia/servidores retirados, 3030/3031 libres. Cierre/anulación operativos pendientes. Ver [checklist](HITO-COMPRAS.md).


## 07-10-2026 — Compras: cierre de pendientes y anulación

Cierre por línea con motivo calculado en servidor, sin alterar lo comprado ni inventario. La decisión explícita del usuario bloquea estructura desde el primer cierre, conservando fecha editable. Anulación completa bajo bloqueos y versión: comprobar entradas exactas, secuencia de registro de salidas/ajustes negativos, saldo suficiente y concordancia con Kardex; generar ajustes compensatorios por recibido junto con stock y operación UUID/huella. Reintentos, rollback y eliminación lógica preservan historia y unicidad documental. Sin cambios de esquema. Lint/tipos/build, suites de integración Compras/recepción/cierre/SQL/Inventario y Chromium desktop/móvil correctos. Respaldo previo y datos reales intactos; copia/servidor retirados, 3030/3031 libres. Desarrollo del hito completo, aprobación funcional pendiente. Ver [checklist](HITO-COMPRAS.md).


## 07-10-2026 — Ayudas y autocompletado en Compras

Clarificación del registro de Compras: etiquetas, ayuda “i” reutilizable en cabecera/detalle y autocompletado editable de presentaciones históricas agrupadas por PostgreSQL. Sólo sugiere el nombre, conservando contenido/precio explícitos. Equivalencia orientativa con Decimal en servidor, debounce y protección de respuestas antiguas; guardar mantiene validación completa. Sin cambios de esquema/dependencias. Lint/tipos/build, regresión Compras, sugerencias/precisión y Chromium desktop/táctil correctos. Archivos/BD respaldados; datos reales intactos; 3031 libre y servidor previo del usuario en 3030 preservado. Ver [checklist](HITO-COMPRAS.md).


## 07-10-2026 — Configuración de mínimos y reposición

Configuración de mínimos por material/bodega en Stock usando el campo existente, sin migración. Servicio transaccional con bloqueos de material/stock, token ID/updatedAt/mínimo anterior, validación de unidad y reintentos no-op. Conserva cantidades/Kardex; combinaciones nuevas con saldo cero sólo al guardar un mínimo y sin borrado automático al quitar. Catálogo incorpora unitMeasureId. Estados derivados y filtro de reposición comparando columnas en PostgreSQL, paginación/total correctos. Formularios sobre listado con búsqueda, ayudas, confirmación de retiro y descarte. Lint/tipos/build, integración de mínimos, regresiones Inventario/Compras y Chromium desktop/móvil aprobados. Base real intacta, respaldo previo; clon/servidor retirados, 3031 libre, servidor previo 3030 preservado. Ver [HITO-INVENTARIO.md](HITO-INVENTARIO.md).


## 07-10-2026 — ajustes e inventario inicial

Se incorporan `InventoryAdjustment` (evidencia del conteo), `InventoryOperation` (UUID/huella/resultado atómicos) y los enums de motivos/operaciones. `StockMovement.inventoryAdjustmentId` es opcional y único: los movimientos existentes conservan origen e historia; una FK compuesta exige mismo material/bodega que el ajuste. Índices cubren fechas, referencias y correcciones. La migración `20261008003000_ajustes_inventario` agrega CHECK de cantidades/diferencia/motivos/vínculo de corrección, valida diferencia del movimiento mediante trigger y bloquea edición/borrado de documentos y claves idempotentes.

El servicio verifica saldo/Kardex, unidad, referencias y versión (ID de stock, timestamp, saldo y último movimiento), bloquea material → stock y registra documento/saldo/AJUSTE/UUID en una transacción. Reintentos se reconocen antes de validar versión; misma clave con otro contenido se rechaza. Mínimos se preservan. Fecha del conteo es calendario (`Date`); fecha del Kardex corresponde al inicio real del día de Santiago. Fecha futura rechazada en servidor.

Las correcciones usan conteo actual vinculado, no reversión histórica. Carga inicial sólo sin movimientos y saldo cero; conteo sin diferencia no escribe. No se introduce proveedor/compra ficticio ni se cambia la interpretación de Compras. Listado paginado/ordenado/filtrado en PostgreSQL y formularios superpuestos con ayudas, búsqueda y confirmación reutilizable; Kardex muestra el origen persistido de ajuste, carga inicial o corrección.

Ver `docs/HITO-INVENTARIO.md` para respaldo, verificaciones, estado de migración y revisión funcional. Traslados y autenticación siguen pendientes.


## 07-10-2026 — traslados entre bodegas

Se incorpora `InventoryTransfer` para traslado inmediato de un material entre dos bodegas distintas. Conserva cantidad, fecha calendario, observación, saldos previos/finales y vínculo único de corrección inversa. El motivo visible es fijo, sin mantenedor nuevo. Las FK usan Restrict e índices; los snapshots son evidencia histórica, no nuevos saldos vigentes.

La migración `20261008010000_traslados_inventario` amplía `InventoryOperation` con `transferId` opcional y operaciones TRASLADAR/REVERTIR_TRASLADO; `adjustmentId` pasa a opcional y un CHECK exige exactamente un origen coherente con el tipo. No modifica documentos de Ajustes anteriores. `StockMovement` agrega vínculos únicos de salida/entrada y FK compuestas que impiden material/bodega incorrectos. CHECK de cantidades, bodegas distintas, observación y origen; triggers verifican cantidades/signo, corrección inversa completa e inmutabilidad. Un trigger diferido exige ambas filas de movimiento y operación al confirmar el documento.

Servicio: bloqueo UUID → material → stock por ID ascendente, lectura secuencial, validación de versiones y saldo/Kardex de ambas bodegas, disponibilidad y límite de destino. Documento, ambos saldos, SALIDA negativa, ENTRADA positiva y UUID/huella se escriben en una sola transacción. Los mínimos se conservan; destino nuevo se crea sólo al guardar. Reintentos iguales retornan el resultado previo; otro contenido con la misma clave se rechaza. Ante resultado incierto, la interfaz conserva clave y datos para reintentar.

Corrección con otro traslado inverso completo vinculado, una corrección directa por documento; si se corrige el inverso se conserva la cadena. No borra historial ni desbloquea anulación de Compras. Incidencias negativas/descuadre se bloquean para revisión previa, sin inventar movimientos que cuadren saldos.

Ruta `/inventario/traslados` en navegación: filtros/paginación/orden SQL, consulta, formulario superpuesto, búsqueda en selectores, ayudas, confirmación y descarte. Kardex muestra origen persistido de traslado. Confirmaciones reutilizables aceptan callback opcional de retorno de foco, utilizado por Traslados sin alterar el comportamiento de consumidores existentes.

Ver `docs/HITO-INVENTARIO.md` para comprobaciones, respaldo, estado de migración y revisión funcional pendiente. No se agregan tránsito, recepciones en destino ni múltiples materiales por documento.


## 07-10-2026 — invalidar cliente Prisma anterior durante HMR

Al entrar a Traslados, `tx.inventoryTransfer` era undefined porque `globalThis.prisma` conservaba una instancia anterior a la generación del modelo. `src/lib/prisma.ts` reutiliza ahora la instancia sólo si coincide el constructor del cliente generado, conservado junto con ella. Si cambia el constructor o hay una caché heredada sin esa referencia, crea el cliente actual y desconecta el pool sustituido. La instancia sigue siendo compartida y sólo este archivo crea PrismaClient; no se cambian esquema, adaptador ni datos.

`tests/prisma-cache.integration.ts` comprueba sustitución de una instancia heredada, invalidación de constructor anterior y reutilización del constructor vigente; no consulta PostgreSQL. La petición de sólo lectura a `/inventario/traslados` en el servidor del usuario devolvió HTTP 200 y listado sin error de modelo ni mensaje de fallo de consulta. Se conserva el proceso del usuario en 3030; no se inició otro servidor para esta validación.

Respaldo previo: `backups/20261007_220650_cliente_prisma_hmr`. Ver checklist de comprobaciones en HITO-INVENTARIO.


## 07-10-2026 — Ayudas del listado de Compras y cierre de pendientes

Se agrega `BotonConAyuda`, reutilizando los tooltips existentes, para describir las acciones del listado, filtros, orden y paginación. Los controles deshabilitados conservan ayuda mediante un contenedor accesible por teclado. `TablaConsulta` permite habilitar las ayudas opcionalmente; se activan para Compras.

El formulario de cierre incluye un `Aviso` informativo que explica cuándo cerrar, qué cantidad afecta, un ejemplo y las consecuencias: conserva el historial, no modifica stock, impide recibir lo cerrado y bloquea la estructura desde el primer cierre. Se registra la aprobación del usuario del resto de funcionalidades en `docs/HITO-COMPRAS.md`; la revisión visual de estas ayudas queda pendiente. Respaldo previo: `backups/20261007_222449_tooltips_compras`. No se modifica el esquema ni la base de datos.

Validación: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build` y revisión del diff correctos. La primera compilación quedó sin progreso en el sandbox y se interrumpió; la repetición fuera de éste finalizó correctamente. Chromium verificó tooltip con ratón y teclado sobre el servidor existente, sin guardar registros; el formulario de cierre no pudo revisarse en navegador por no haber una compra pendiente disponible. No se iniciaron servidores de validación; se conserva el 3030 del usuario y se verificó 3031 libre.


## 07-10-2026 — Inicio del Hito de Cotizaciones

Se crea `docs/HITO-COTIZACIONES.md` con etapas y checklist tras autorización para continuar al siguiente módulo. Se revisaron esquema y checkpoints: la ruta todavía es provisional y las decisiones de líneas cotizadas, precios/impuestos, estados, vigencia y PDF requieren respuesta explícita. No se trasladan automáticamente las reglas de Compras al dominio de ventas ni se marca Inventario cerrado. Sin cambios de código, esquema o datos en esta preparación. Respaldo de este registro antes de editar: `backups/20261007_222858_plan_cotizaciones`.


## 07-10-2026 — Referencia real y decisiones de Cotizaciones

Se revisa el PDF de dos páginas proporcionado por el usuario (texto completo y primera página visual), sin modificarlo ni importar datos. Se actualiza `docs/HITO-COTIZACIONES.md`: sólo productos/servicios, precios finales con IVA y descuentos desglosados, totales sin decimales; estados/vigencia y PDF/venta posterior aprobados. Se identifican campos faltantes de folio, desglose, dirección, condiciones de pago, descripción técnica y datos bancarios; se consultan cálculo, descuento, numeración y alcance antes de implementarlos. No se asume el descuento ni la tasa futura a partir de un solo ejemplo. Respaldo documental previo: `backups/20261007_224151_referencia_cotizacion`. Revisión documental y diff; sin cambios de código, Prisma o PostgreSQL.


## 07-10-2026 — Alcance comercial, pagos y numeración

Se actualiza el Hito de Cotizaciones con las respuestas: cálculo como el PDF, descuento global y alcance de venta de materia prima, productos de catálogo y trabajos a medida. Se registra solicitud de Condiciones de Pago, estados derivados, anticipos de proyecto y numeración configurable. La estructura actual de cuentas/abonos exige una venta; se consulta si basta para los anticipos o se requiere Proyecto/ingreso previo. Catálogo, modalidades de descuento, condiciones y secuencias quedan pendientes de precisión. No hay cambios de código/esquema/datos. Respaldo previo: `backups/20261007_225415_alcance_comercial`; contenido y diff revisados.


## 07-10-2026 — Productos terminados, condiciones y panel de cobranza

Se documentan cotizaciones mixtas, existencias/bodega de producto terminado, materia prima utilizada, condiciones extensibles Al día/30/60/90 días, pagos graduales, referencia de factura de venta y panel de deuda/abonos/vencimiento/saldo. Se registran aprobación de descuento global porcentaje o pesos, numeración configurable sin número inicial definido y bancos en Empresa. Se consulta la entidad de los pagos (orden del cliente/venta/trabajo), cardinalidad, consumo al fabricar y fecha base de vencimiento antes de modificar relaciones. Respaldo: `backups/20261007_234323_productos_y_cobranza`. Sólo documentación; diff revisado, sin escrituras de datos.


## 07-10-2026 — Flujo aprobado de orden cliente, producción y vencimiento

Se registra en HITO-COTIZACIONES el nombre visible Orden de Compra Cliente (SalesOrder técnico conservado), una sola Orden de Trabajo por orden, consumo de materias primas al fabricar y salida de terminado al vender sin doble consumo. Vencimiento desde fecha de factura registrada con folio al finalizar el trabajo, según días de condición; anticipos vinculados a la orden sin crear deuda duplicada ni vencimiento ficticio. Se actualizan checks de decisiones, conservando pendientes de implementación. Próxima dependencia: mantenedor de Condiciones de Pago. Respaldo previo: `backups/20261007_235529_flujo_comercial_aprobado`. Sólo revisión documental y diff; no cambios de Prisma, datos o servidores.


## 08-10-2026 — Condiciones de Pago, primera dependencia de Cotizaciones

Se incorpora PaymentCondition (nombre único normalizado, días enteros no negativos y versión), migración `20261008032000_condiciones_pago`, bases aprobadas y CRUD en `/mantenedores/condiciones-pago`. Quote recibe referencia opcional Restrict y copia opcional de nombre/plazo con CHECK; documentos existentes permanecen sin condición inferida. Modificar el catálogo no modifica acuerdos históricos. La integración al registro de Cotizaciones y vencimiento por factura sigue pendiente.

Interfaz con filtro, orden/paginación, Crear/Ver/Editar/Eliminar, ayudas, confirmación/descarte, foco y errores reutilizables. Pruebas de dominio en copia (duplicados, concurrencia, referencias, snapshots), Chromium escritorio/móvil, lint/TypeScript/build y diff correctos. La ruta dinámica evita acceder al catálogo durante prerender; la compilación inicial previa a migrar mostró tabla inexistente y se repitió tras corregirlo sin errores. Migración probada en copia y aplicada localmente, cliente generado y migrate status actualizado.

Respaldo: `backups/20261008_000000_condiciones_pago`. Las 28 tablas previas conservan huellas/conteos; sólo se añaden cuatro bases de condición. No seed general ni escrituras ficticias en base real. Servidor de prueba 3031 detenido y copia retirada; servidor previo 3030/PID 61346 conservado. El hito permanece en curso: se esperan respuestas sobre unidades de producto y fechas/campos de Cotizaciones.

Comprobación final: envío en modo Ver protegido también frente a Enter/submit programático; lint, TypeScript y build repetidos tras esa protección. GET de la ruta en servidor previo 3030 devuelve 200 y las cuatro bases; puerto de pruebas 3031 sigue libre.


## 08-10-2026 — Definición de sucursales de Clientes

Se registran contactos generales y por sucursal con nombre/teléfono obligatorios, Casa Central por cliente, gestión integrada y snapshot de dirección/contacto en Cotizaciones. Productos admiten unidades del mantenedor, Unidades por defecto. Consulta readonly en PostgreSQL local confirmó cero clientes actuales; sin escrituras. Respaldo documental: `backups/20261008_004000_definicion_sucursales`. La dirección de nuevas sucursales queda pendiente de precisar antes de modificar esquema/formulario.


## 08-10-2026 — Clientes y sucursales integradas

Se incorpora ClientBranch y la migración `20261008065000_sucursales_clientes`. Contactos generales y de sucursal exigen nombre/teléfono; Dirección/Ciudad obligatorias, correo opcional, sin Comuna. Casa Central única por cliente, nombres normalizados únicos y validación diferida al modificar sucursales. La migración copia contactos antiguos a Casa Central con dirección/ciudad pendientes (legacyIncomplete); el CRUD exige completarlas y retira esa excepción al guardar. Los clientes originales no se reescriben.

Cliente/sucursales se crean/editan juntos en transacción bajo bloqueo de cliente y timestamp monotónico. Formularios permiten agregar/editar/quitar sucursales desde Crear/Editar/listado sin navegar, con confirmación/descarte y modo readonly. IDs ajenos o repetidos se rechazan; sucursal con cotizaciones no se elimina y el guardado completo revierte. Quote recibe referencia compuesta al mismo cliente y snapshots opcionales para futuros documentos; no se infieren sucursales históricas.

Prisma validado/generado; migración probada en copia y aplicada localmente. Pruebas específicas de sucursales y regresión de Clientes, caso de migración heredada en segunda copia, Chromium escritorio/móvil y lint/TypeScript/build correctos. Huellas/conteos de 29 tablas previas intactos. Respaldo: `backups/20261008_005221_sucursales_clientes`. Copias retiradas y servidor propio 3031 detenido; 3030/PID 61346 del usuario conservado. Revisión funcional y conexión de sucursal al formulario de Cotizaciones pendientes.


## 10-10-2026 — cabecera de Clientes en sólo lectura al administrar Sucursales

La acción Sucursales conserva los datos generales como contexto de consulta y habilita sólo las sucursales. Editar conserva la edición completa y Ver mantiene sólo lectura. Se adapta descripción del diálogo y marcas de obligatorio. Cambio únicamente de interfaz; sin modificación de esquema/datos. Respaldo previo: `/home/metaltux/Proyectos/mtx-metal-erp/backups/20261010_200520_cabecera_sucursales`. ESLint, build con verificación de tipos y diff correctos; revisión visual pendiente (Playwright temporal anterior no disponible). Sin servidores propios iniciados; se conserva el servidor del usuario en 3030/PID 13696.


## 10-10-2026 — Preparación de Configuración de numeración

Se desglosa en HITO-COTIZACIONES el diseño y checklist de numeración por tipo, configuración sin inicio inventado, asignación transaccional/idempotente y conservación histórica. Se consultan tipos internos/momento de asignación y política de modificación tras uso antes de implementar. Estado real: no hay módulo ni migración de numeración. Respaldo previo: `backups/20261010_201622_plan_numeracion`; revisión documental y diff; sin servidores, build ni escrituras de datos.


## 10-10-2026 — Configuración de numeración documental

Configuración en `/configuracion/numeracion` para Cotización, Orden de Compra Cliente, Orden de Trabajo y Guía de Despacho. Folio al primer guardado, secuencia continua sin reinicio anual, formato bloqueado desde primer uso y sólo avance del próximo número; números externos independientes. Migración `20261011001000_numeracion_documental`: cuatro filas sin inicio inventado, BigInt, versión, registro permanente de folios, UUID/índices únicos, CHECK y triggers de protección/avance. No altera documentos históricos.

Asignador reutilizable bajo bloqueo de UUID y secuencia; llamadas secuenciales con cliente transaccional. El futuro módulo guardará su documento en la misma transacción y validará su contenido/idempotencia. No se conecta aún a módulos pendientes ni se expone reserva de folios desde la interfaz. Rango 1–999999999999999999, ancho mínimo 1–18, prefijo hasta 20 caracteres; agotamiento explícito.

Validación en copia PostgreSQL: concurrencia, reintentos, versiones, rollback, histórico, restricciones SQL y límite. Chromium escritorio/móvil, Prisma validate/generate, lint/tipos/build correctos. Migración aplicada a base local; las 30 tablas anteriores mantienen huellas/conteos; cuatro configuraciones sin número y cero asignaciones reales. Respaldo `backups/20261010_211026_numeracion_documental`; ver checklist en HITO-COTIZACIONES. Servidor propio 3031 detenido; 3030/PID 13696 pertenece al servidor previo y se conserva.


## 10-10-2026 — Cuentas bancarias de Empresa

Empresa admite varias cuentas con una principal activa. Modelo CompanyBankAccount, campos obligatorios banco/tipo/número/titular/RUT, correo opcional y número de cuenta como texto para conservar ceros. Banco/tipo libres por ahora. Principal única y obligatoria desde la primera cuenta, bloqueo del perfil y versión entera para serializar cambios; al cambiar principal se comprueba además la principal anterior esperada. Desactivación/reactivación lógica, sin borrar cuentas; elegir otra antes de desactivar la principal.

Migración `20261011023500_cuentas_bancarias_empresa`, transaccional, sin crear datos bancarios: FK/índices, identidad normalizada única, CHECK de RUT con DV, principal activa, trigger de bloqueo y comprobación diferida de principal. Quote incorpora referencia Restrict y snapshot bancario completo opcional, sin inferir datos antiguos. Servicio preparado para escoger principal/alternativa activa/ninguna dentro de la transacción de Cotizaciones; integración del selector y PDF sigue pendiente.

Configuración en Empresa con tabla, filtro, Crear/Ver/Editar, Principal, Desactivar/Activar, ayudas y componentes reutilizables de confirmación/alerta/descarte. Pruebas de dominio en copia local, incluida concurrencia, rollback e historial; Chromium escritorio/móvil; Prisma validate/generate, tipos/lint/build correctos. Migración aplicada localmente; 32 tablas anteriores conservan huellas (Quote excluye siete nuevas columnas nulas). Copia/servidor 3031 retirados; preservar servidor previo 3030/PID13696. Respaldo `backups/20261010_231031_cuentas_bancarias`; revisión funcional del usuario pendiente.

## 11-10-2026 — Catálogo de productos, recetas e imágenes

Catálogo en `/mantenedores/productos`: tabla/filtro, Crear/Ver/Editar/baja lógica sobre listado, ayudas y confirmaciones reutilizables. Código UUID único, generado al guardar e inmutable; creación con UUID de reintento/huella independiente del código, edición/baja con versión. Nombre/unidad obligatorios, descripción opcional y precio sugerido final con IVA opcional en pesos enteros; cero distinto de sin precio.

Migración `20261011143500_catalogo_productos_recetas_imagenes`: Product, ProductRecipe y ProductImage, FK Restrict e índices; cantidades positivas Decimal(14,3), precio finito no negativo al peso, receta sin material duplicado y galería limitada a diez imágenes. CHECK/triggers protegen identidad, unidad, referencias y retirada lógica. QuoteDetail prepara referencia de producto/código/unidad histórica y exclusión de materia prima en la misma línea; los campos nuevos permanecen nulos en documentos anteriores. Integración del formulario de Cotizaciones pendiente.

Receta por una unidad de producto, sin bodega fija. Guardar no altera stock/Kardex. Transacción con bloqueos materiales ascendentes → producto y consultas secuenciales; cambio de unidad bloqueado por receta/cotizaciones. Materias primas incorpora recetas en consulta, bloqueo de unidad y eliminación; Unidades no elimina unidades con productos. Producción deberá copiar la receta usada y ampliar las protecciones a sus referencias y al stock terminado antes de habilitar operaciones.

Imágenes locales en `var/productos/imagenes/` o `PRODUCTO_IMAGEN_DIR`, con contrato AlmacenImagenesProducto reemplazable por S3. PNG/JPG/WebP, hasta diez de 2 MB, máximo 16 megapíxeles; sharp reprocesa a PNG de hasta 1600×1600. Claves generadas, API controlada y primera imagen principal. Retirar conserva archivo/referencia histórica; un fallo transaccional limpia sólo archivos nuevos. Respaldar/restaurar esta carpeta junto con PostgreSQL. Server Actions admite 22 MB para cargas múltiples, conservando los límites individuales en servidor.

Respaldo previo de originales y PostgreSQL: `backups/20261011_112454_catalogo_productos`. Pruebas específicas en copia: UUID/idempotencia, CRUD, cantidades/precios, unidades/recetas, concurrencia/versiones, imágenes reales/múltiples, retirada, rollback de BD/archivos, snapshots y stock intacto. Validación de interfaz y aplicación, migración local, comparación de datos y limpieza se detallan en [HITO-PRODUCTOS.md](HITO-PRODUCTOS.md).

Carga inicial de producto terminado aprobada sólo sin movimientos y saldo cero, sin consumo de materia prima; etapa P5 pendiente de decisión sobre bodegas. No se resetean datos: el usuario lo solicitará posteriormente. Los envíos a GitHub quedan a cargo del usuario.

Cierre técnico: Prisma validado/generado, migración aplicada y estado al día. ESLint/tipos/build contra copia migrada y Chromium escritorio/móvil correctos; ajuste de ancho del formulario móvil comprobado. Las 33 tablas anteriores conservan huellas/conteos. Copia descartable retirada y servidor propio 3031 detenido/puerto libre; servidor previo del usuario 3030/PID43873 conservado. Catálogo real inicia vacío, sin fixtures; revisión funcional del usuario y P5 pendientes.


## 11-10-2026 — Clasificación de bodegas

WarehouseClassification enum interno con Materia prima, Producto terminado y Mixta. Warehouse.classification nullable sin default conserva las bodegas anteriores sin clasificación; crear/guardar desde el mantenedor exige elegir tipo. Tabla/filtro y formulario incorporan selector buscable, ayuda y consulta readonly. Se impide guardar con Enter en Ver y se usa timestamp monotónico para versiones de edición.

Migración `20261011164000_clasificacion_bodegas` sin backfill, con protección de reclasificación y escrituras de materia prima. Bodegas con stock (incluso cero), mínimos, compras, trabajos o historial no se convierten en exclusivas de terminado. Los selectores de Compras/inventario excluyen terminado exclusivo; las heredadas nulas siguen operativas. Triggers validan y bloquean la fila de bodega ante escrituras/reclasificación concurrentes. No cambian cantidades ni Kardex. Al implementar stock de terminado, ampliar protección recíproca y exigir Mixta/Producto terminado.

Respaldo previo: `backups/20261011_122855_clasificacion_bodegas`. Regresión CRUD y prueba específica de clasificación/concurrencia en copia, Chromium escritorio/móvil, Prisma validate/generate, lint/tipos/build correctos. Migración aplicada localmente y 36 tablas previas con huellas/conteos iguales, excluyendo únicamente classification. Copia/servidor propio 3031 retirados; servidor previo del usuario 3030/PID43873 conservado. Revisión funcional del usuario pendiente. Las imágenes locales de productos se añaden a .gitignore para mantener archivos persistentes fuera del código, con respaldo junto a PostgreSQL.


## 11-10-2026 — Receta del producto en grilla y modal

Se reemplazan tarjetas de edición en línea por la grilla RecetaProducto, con materia prima/código, cantidad, unidad y Ver/Editar/Quitar. Agregar queda debajo del detalle, con retorno de foco tras altas sucesivas. El diálogo tiene selector buscable que excluye materiales repetidos, validación de cantidad compartida, consulta readonly y descarte reutilizable. Enter en el formulario del portal detiene la propagación para no guardar el producto principal. Los cambios permanecen en el borrador hasta Guardar producto, conservando contrato, servicios, transacción, unidades y stock existentes.

Respaldo previo `backups/20261011_125503_grilla_receta_productos`. Sin modificación de Prisma, migraciones ni datos reales. Lint/build con tipos correctos; Chromium sobre copia aislada prueba ocho altas seguidas/foco, búsqueda/duplicados, cantidades, edición/consulta/eliminación, descarte, persistencia y móvil. Revisión visual del usuario pendiente, previa a P5. Ver HITO-PRODUCTOS.

## 11-10-2026 — P5: inventario inicial de producto terminado

La clasificación Mixta habilitaba la compatibilidad de la bodega, pero aún no existía ingreso de producto terminado. Se implementa la carga inicial aprobada y su consulta en `/inventario/productos-terminados`, separadas del inventario de materia prima. Ver [HITO-PRODUCTOS.md](HITO-PRODUCTOS.md).

- [x] Respaldo de archivos afectados y dump de PostgreSQL en `backups/20261011_132503_stock_inicial_terminado`, antes de modificar.
- [x] Migración `20261011180000_stock_inicial_producto_terminado`: ProductWarehouseStock, ProductInitialStock, ProductStockMovement y ProductInventoryOperation; Decimal(14,3), índices/FK Restrict, snapshots y UUID/huella.
- [x] Validación/aplicación primero en copia local y después en PostgreSQL local; conservación exacta por conteos/huellas de las 36 tablas anteriores, incluida clasificación. Cliente Prisma generado.
- [x] Servicio con bloqueos y versiones, reintentos reconocidos antes de versión, escritura atómica y controles SQL de saldo/Kardex/documento completo. Documento, movimiento y operación inmutables.
- [x] Stock incluso cero bloquea cambio de unidad/baja de producto y clasificación incompatible de bodega; selectores de terminado sólo Mixta/Producto terminado.
- [x] Tabla paginada/filtrada en servidor, tres consultas, formulario sobre listado, revisión de saldo, confirmación reutilizable e histórico readonly.
- [x] Pruebas específicas en copia: precisión/fechas, referencias/versiones, ausencia de consumo, cero sin escritura, reintentos/concurrencia, historial y rollback mediante fallo provocado.
- [x] Lint, tipos y build; Chromium escritorio/móvil, búsqueda interna sin coincidencias, alta, consultas y bloqueo de carga repetida.
- [ ] Revisión funcional del usuario de P5.

La cantidad cero no crea documentos ni saldos. Cada combinación admite inicial sólo sin movimientos y saldo cero; no exige receta. Cantidad positiva conserva fecha actual/pasada de Santiago y observación obligatoria. No se generaron fixtures en la base real ni se modificaron datos de compras/materiales. Stock y Kardex anteriores siguen correspondiendo a materias primas. Fabricación, correcciones/ajustes, traslados y salidas de terminado requieren etapas futuras y ampliación del origen tipado de ProductStockMovement mediante migración, antes de habilitar sus escrituras. No reutilizar carga inicial para corregir existencias.

El servidor propio de validación usa 3031 y se retira al terminar; se conserva el servidor previo del usuario en 3030. Los envíos a GitHub continúan a cargo del usuario.


## 11-10-2026 — P6: ajustes y correcciones de terminado

Un conteo inicial equivocado se corrige mediante un nuevo documento que cambia el saldo físico actual; no se elimina ni reescribe el inventario inicial. Se incorpora esa funcionalidad en `/inventario/productos-terminados`, conservando aislamiento respecto de materias primas.

- [x] Respaldo previo de archivos y PostgreSQL: `backups/20261011_180503_ajustes_terminado`.
- [x] ProductInventoryAdjustment con anterior/final/diferencia, motivo existente, fecha, observación, snapshots y vínculos tipados de corrección a ingreso inicial o ajuste.
- [x] Migración `20261011220000_ajustes_producto_terminado` amplía ProductStockMovement/ProductInventoryOperation, con exactamente un origen. No cambia migraciones anteriores.
- [x] CHECK/FK/triggers conservan signo, balance, referencia de mismo producto/bodega, documento completo, clasificación compatible e inmutabilidad.
- [x] Bloqueos/versiones/UUID y confirmación decimal; saldo, AJUSTE, documento y operación atómicos. Sin diferencia no escribe; cero válido conserva historial y no libera otra carga inicial.
- [x] Acciones Ajustar stock/Ajustar/Corregir, formulario modal, búsqueda de motivo/origen, vista previa en servidor y consulta de ajustes/histórico/Kardex.
- [x] Integración `tests/ajustes-terminado.integration.ts` sobre copia `mtx_validacion_terminado_ajustes_*`: negativos/positivos/cero, no-op, fechas/precisión, referencia ajena, versiones, reintentos/concurrencia, inmutabilidad, rollback provocado y ausencia de consumo.
- [x] Regresión de P5, lint/tipos/build y Chromium escritorio/móvil; foco inicial mantiene visible encabezado.
- [x] Aplicación primero en copia y luego en PostgreSQL local; 40 tablas existentes verificadas por conteo/huella sobre sus columnas anteriores (nuevos adjustmentId nullable excluidos sólo en ProductStockMovement/ProductInventoryOperation). Sin fixtures en base real. Migrate status al día; consulta real HTTP 200.
- [x] Copia y servidores propios retirados; 3031 libre, 3030/PID43873 del usuario conservado.
- [ ] Revisión funcional del usuario de P6.

Reglas y uso documentados en [HITO-PRODUCTOS.md](HITO-PRODUCTOS.md). Fabricación, traslados y salidas de terminado continúan pendientes; cada nuevo origen necesita reglas y migración antes de escribir. No se hizo push ni se borraron datos de compras/productos.


## 11-10-2026 — Grilla y diálogo de Sucursales

Clientes mostraba todos los campos de cada sucursal en tarjetas largas. Se reemplazan por una grilla y formularios modales, siguiendo el patrón de Receta de Producto. El botón de agregar queda al pie; Ver/Editar/Quitar se ubican por fila.

- [x] Respaldar componentes/documentación y PostgreSQL antes de modificar en `backups/20261011_182716_sucursales_grilla`.
- [x] Extraer `sucursales-cliente.tsx`: diálogo de detalle con validación compartida, duplicados, consulta readonly, confirmación/descarte y foco.
- [x] Integrar con useFieldArray/useWatch y setValue, conservando IDs y claves/foco de filas; todos los cambios se guardan juntos al guardar el cliente.
- [x] Detener propagación de submit del portal: Enter sólo aplica el detalle. Bloquear cierre/envío principal mientras está abierto un diálogo del detalle.
- [x] Mantener Casa Central obligatoria/fija, datos de contacto/dirección/ciudad y modo Sucursales con cabecera de sólo lectura.
- [x] Navegador en copia: ocho altas, obligatorios/correo/duplicados, editar/ver/quitar, cancelar/descarte/Escape, foco, referencia por cotización con rollback, guardado y completar legado; escritorio/móvil.
- [x] Lint, tipos/build y revisión de diff; sin migraciones/cambios de Prisma o servicios. Datos reales de las 41 tablas intactos por huellas/conteos; copias/servidores propios retirados. Se conserva 3030 del usuario.
- [ ] Revisión del usuario de la nueva presentación.

Avances en [MANTENEDORES-DATOS.md](MANTENEDORES-DATOS.md). P6 de ajustes de terminado quedó validado funcionalmente por el usuario antes de esta mejora. No se hizo push.


## 11-10-2026 — Adaptación responsiva de la grilla de Sucursales

Los mínimos de ancho de las columnas superaban el ancho del diálogo de Clientes y generaban scroll horizontal dentro de la grilla. La tabla de escritorio ahora reparte el ancho disponible y ajusta textos largos; por debajo de 768 px cada fila se muestra apilada, con etiquetas de sus campos. Las acciones usan iconos con nombres accesibles/ayudas. Los campos generales también pueden reducirse al ancho disponible.

- [x] Respaldo previo en `backups/20261011_203604_sucursales_responsive`.
- [x] Chromium mide el diálogo y el contenedor interno de la tabla, además de la página: diez anchos de 320 a 1440 px, incluidos ambos lados del breakpoint y textos al límite. Crear/Editar/Ver comprobados a 320 px.
- [x] Funcionalidades, teclado/foco, descarte y guardado conjunto conservados; lint/build con tipos aprobados.
- [x] Sin modificaciones de esquema, migraciones, servicios o datos reales; 41 tablas verificadas por huellas/conteos. Copia y servidor propios retirados; 3031 libre y 3030 del usuario conservado.
- [ ] Revisión visual del usuario.

Sólo se mantiene desplazamiento vertical en formularios largos. El ajuste no se limita a ocultar una barra horizontal: los elementos y textos caben en el espacio disponible. Checklist en [MANTENEDORES-DATOS.md](MANTENEDORES-DATOS.md).


## 11-10-2026 — inicio técnico C1 de Cotizaciones

- [x] Revisar modelos/dependencias y actualizar el estado del hito, que conservaba pendientes históricos ya resueltos.
- [x] Auditar PostgreSQL en READ ONLY: sin cotizaciones/detalles/órdenes de cliente y numeración de Cotización configurada. No se modificó BD ni contador.
- [x] Respaldar documentos antes de editarlos: `backups/20261011_231809_inicio_cotizaciones`.
- [x] Preparar etapas de estructura/servicios/listado/formularios/estados/validación y recuperar fecha actual/pasada ya aprobada.
- [ ] Esperar respuestas de IVA, precisión del descuento y eliminación/corrección antes de preparar la migración financiera.

No se cambió Prisma, código, dependencias ni la base; no se ejecutaron build/migraciones/seed ni se iniciaron servidores. Revisión documental y diff realizados. El primer SELECT de numeración usó el nombre incorrecto digits; la sesión de sólo lectura se cerró y la consulta se corrigió a padding, sin escrituras. Ver [HITO-COTIZACIONES.md](HITO-COTIZACIONES.md), sección C1.


## Cotizaciones C1 — IVA configurable por períodos

Respuestas registradas: IVA con desde obligatorio/hasta nullable y tasa copiada en documentos; descuento con dos decimales/redondeo al peso; eliminación lógica y corrección por nueva cotización vinculada. Se consulta fecha aplicable, límites/solapamientos, configuración inicial y protección de períodos utilizados antes de diseñar la migración. Respaldo documental: `backups/20261011_234127_decisiones_iva_cotizaciones`. Sin cambios de código, Prisma ni PostgreSQL.


## 12-10-2026 — IVA configurable por períodos

- [x] Modelo VatRatePeriod y migración 20261012001000_iva_por_periodos con tasa inicial 19% desde 01-10-2003 (dato indicado por el usuario, verificado en BCN). Sin tasas anteriores inferidas.
- [x] Rangos inclusivos sin solapamiento, exactamente uno abierto, validación porcentual/fechas/versiones y referencia/copia de tasa opcionales preparadas en Quote.
- [x] Protección de períodos utilizados y copias de IVA mediante CHECK/FK/triggers y bloqueos compartidos/exclusivos; cierres y altas juntos, rollback completo. Cotizaciones tributadas se conservan y sus datos tributarios terminales no se reabren.
- [x] Configuración → IVA, listado/filtro y formularios/confirmaciones; helper transaccional de selección para futuros documentos, sin reservas ni ajustes de stock.
- [x] Pruebas en copia, lint/tipos/build y Chromium escritorio/móvil; migración aplicada localmente, 41 tablas previas intactas, sólo período inicial en la base real.
- [x] Respaldos/evidencias: backups/20261011_235653_iva_periodos; copia/servidor propios retirados, 3031 libre y servidor del usuario en 3030 conservado.
- [ ] Revisión funcional del usuario e integración en registro de Cotizaciones pendiente.

Ver [HITO-COTIZACIONES.md](HITO-COTIZACIONES.md), C1-IVA. No se hizo push ni se implementó emisión tributaria/PDF.


## 12-10-2026 — Cotizaciones: motor de importes y preparación de texto enriquecido

- Validación y cálculo puro de líneas/subtotal/descuento/neto/IVA/total usando Prisma.Decimal, con redondeo al peso por línea y precisión local de 40 dígitos. Precios finales incluyen IVA; tasa configurable suministrada por el servidor. No guarda cotizaciones ni toca stock/folios/BD.
- Prueba `tests/importes-cotizacion.ts`: ejemplo PDF, fracciones/empates, descuentos excluyentes, tasas variables, valores inválidos/límites y conservación. Prueba pura, lint y build correctos. No hubo cambios de esquema/dependencias ni migraciones en este bloque.
- Solicitud de texto enriquecido registrada con etapas en HITO-COTIZACIONES; alcance por campo y almacenamiento de imágenes consultados, sin asumir respuesta. Editor aún pendiente de esas definiciones.
- Respaldo previo: `backups/20261012_113043_cotizaciones_c1`; conserva avances existentes de IVA. No se inició servidor ni se hizo push; 3031 libre y 3030 previo del usuario conservado.


## 12-10-2026 — Cotizaciones operativas y detalle enriquecido

- Modelo comercial Quote/QuoteDetail con folio, UUID, versión/operaciones, importes/descuento/desglose, fechas calendario, copias históricas, líneas mixtas, baja y corrección vinculada. QuoteImageFile/QuoteImageLink separan archivos y documentos. Migración 20261012120000_cotizaciones_documento probada en copia/aplicada localmente; 42 tablas previas intactas, 17 migraciones al día.
- `/ventas/cotizaciones`: listado/filtros/orden/paginación en servidor, formularios sobre listado, detalle en grilla/modal, vista previa/confirmaciones y estados. Cálculo Decimal y selección temporal de IVA, folio en guardado atómico; cotizar no cambia inventario ni cobranza.
- Editor general Tiptap 3.31.4 con JSON validado, títulos/listas/formato/imágenes; almacenamiento local reemplazable por S3 y versiones históricas conservadas. Respaldar `var/cotizaciones/imagenes/` o COTIZACION_IMAGEN_DIR junto con BD. Borradores cancelados no se purgan automáticamente; una limpieza futura requerirá política explícita.
- Mejora compartida de nombre accesible en SelectorBuscable y tooltips informativos que dejan pasar clics, incluido su contenedor; foco/selección del editor conservados.
- Pruebas de importes e integración en copia, regresión IVA, lint/build/tipos y Chromium 320–1440 con texto largo/imagen de 1600 px. Copias y servidores propios retirados; 3030 previo conservado y 3031 libre.
- Respaldo/evidencias: `backups/20261012_114810_cotizaciones_estructura`; dumps inicial y preaplicación, fuentes originales, huellas, logs/capturas. Ver checklist vigente al final de HITO-COTIZACIONES. Pendientes: revisión funcional, PDF, conversión y producción/cobranza. Sin push.


## Editor de Cotizaciones — auditoría de pegado/disposición

Limitaciones comprobadas en código: sin colores/tamaños/alineación/tablas y sin atributos de posición/ancho de imágenes. Alcance y origen del pegado consultados; se espera respuesta explícita. Plan C6 en HITO-COTIZACIONES. Respaldo documental: `backups/20261012_130845_editor_pegado_disposicion`. Sin cambios al editor, dependencias, Prisma o PostgreSQL en esta auditoría.


## C6 — pegado enriquecido y disposición de imágenes

Editor/JSON ampliados para estilos de texto, tablas y posición/ancho de imágenes; normalización de estilos de clase/heredados del portapapeles. Controles nuevos, superficie blanca de documento y adaptación móvil con texto debajo de imágenes. Compatible con JSON previo, sin cambios Prisma/BD real; fuentes sólo se muestran si están disponibles en el dispositivo.

Respaldo: `backups/20261012_133300_editor_c6`. Prueba pura, integración en copia, lint/build y Chromium 320–1440 correctos; copia/servidor propios retirados. Ver entrega C6 al final de HITO-COTIZACIONES; revisión funcional pendiente. Sin push.


## C6.1 — continuidad de listas e imágenes

Corregir globals.css: eliminar clearfix por li y conservarlo al final del editor, para que la imagen flotante permita continuar viñetas/numeración y sublistas sin salto artificial. Compatible con JSON existente; no modifica datos/esquema. Lint/build y Chromium (dos lados, listas simples/numeradas/anidadas, 320–1440) correctos. Respaldo/evidencias: `backups/20261012_170208_listas_imagenes`; validación en borrador con imagen simulada, sin escrituras ni servidores propios al terminar. Revisión funcional pendiente en HITO-COTIZACIONES.


## C6.2 — imágenes redimensionables con el cursor

Se incorpora una vista de imagen de ProseMirror en `imagen-cotizacion-redimensionable.ts`: tiradores en las cuatro esquinas, Pointer Events para ratón/táctil, proporción conservada y ancho porcentual 10–100. Una transacción al soltar permite Deshacer/Rehacer; Escape cancela el gesto antes de que el diálogo procese esa tecla. Flechas/Shift permiten ajuste por teclado. Las vistas de sólo lectura ocultan los tiradores.

El contenedor flota según la disposición guardada, sin interrumpir listas. Se conserva el atributo JSON width existente y el menú admite porcentajes personalizados; no hay cambios Prisma/PostgreSQL ni al archivo de imagen. Los controles visuales no se serializan.

Respaldo previo: `backups/20261012_171954_imagenes_cursor`. Lint/build, prueba pura de contenido, aceptación del JSON por el validador de servidor y Chromium (cursor/táctil, proporción, Escape, historial, readonly, listas y 320–1440) correctos. Pruebas sólo en borradores con imágenes simuladas; sin guardados/subidas. Servidor propio retirado, 3031 libre y 3030 previo conservado. Revisión funcional y guardado/reconsulta del usuario pendientes en C6.2 de HITO-COTIZACIONES. Sin push.


## C6.3 — corregir acceso prematuro a la vista del editor

El constructor de imágenes consultaba editor.view antes de que Tiptap terminara de asignarla, provocando un Runtime Error al abrir contenido con imágenes existentes. addNodeView ahora pasa a crearVistaImagen la vista real recibida de ProseMirror, disponible durante la construcción del nodo. El comentario explica la dependencia de montaje. No se alteran contenido/archivos, esquema ni datos PostgreSQL.

Respaldo previo: `backups/20261012_180142_montaje_imagen_cotizacion`. Error reproducido antes del cambio; ocho montajes con imágenes iniciales (cuatro disposiciones, edición/readonly) pasan después. Regresión de arrastre, historial, cancelación, teclado, JSON y adaptación 320–1440 correcta; lint/build y prueba pura de contenido correctos. Pruebas sin guardados/subidas; 3031 propio libre, 3030 previo conservado. Revisión funcional pendiente en C6.3 de HITO-COTIZACIONES. Sin push.


## C6.4 — arrastre y atajos para mover imágenes

Se habilita arrastre nativo sobre el cuerpo de la imagen con cursor de agarre. ProseMirror reubica el nodo en el documento conservando src/width/placement y formato. Alt + ↑/↓ y los botones de movimiento comparten moverImagenSeleccionada; la función verifica edición, selección de imagen, límites y contenido válido del contenedor. No coloca imágenes delante del párrafo obligatorio de una lista. Los atajos también funcionan desde tiradores, sin cambiar el ancho.

closeHistory separa movimientos de operaciones anteriores para Deshacer/Rehacer. Evitar asignar nuevamente el mismo src impide recargas al seleccionar. Modo readonly bloquea movimiento e inicio de arrastre. Se conservan modelo JSON, archivos y esquema PostgreSQL, sin nuevas dependencias.

Respaldo previo: `backups/20261012_181614_mover_imagenes`. Lint/build, prueba pura de contenido y Chromium correctos: arrastre real sin duplicación, atajos, atributos/texto, historial, listas/límites, readonly, montaje con imágenes iniciales, redimensionado y 320–1440. Validación en borradores sin escrituras/subidas. Servidor propio retirado (3031 libre); 3030 del usuario conservado. Revisión funcional pendiente en C6.4 de HITO-COTIZACIONES. Sin push.


## PDF de Cotizaciones — planificación y decisiones

Aprobados Carta, PDF para Pendientes/Aprobadas/Rechazadas y archivo de versiones con copia completa de los datos que originan cada emisión. Quote.version sigue siendo contador de concurrencia, no historial completo; el plan incorpora snapshot inmutable por revisión emitida y PDF conservado, sin renumerar folios ni reescribir emisiones históricas.

Revisados modelo, servicios/snapshots y PDF de referencia. Consultados datos mínimos del emisor y texto de Condiciones comerciales (por ejemplo anticipo/entrega), distinto del plazo de PaymentCondition. Se esperan respuestas explícitas antes de implementar estas reglas. Etapas P1–P5 en HITO-PDF-COTIZACIONES; no se modificaron código, dependencias, Prisma ni PostgreSQL.

Respaldo documental previo: `backups/20261012_191935_plan_pdf_cotizaciones`. Validación documental de rutas/contenido/diff; no es necesario build ni levantar servidores para esta entrega. Sin push.


## PDF de Cotizaciones — implementación y archivo de revisiones

Aprobados datos obligatorios del emisor (razón social/RUT/dirección/ciudad), logo/banco opcionales y Condiciones comerciales por cotización. Se añade Quote.commercialTerms y modelos QuotePdfEmission/QuotePdfRequest: snapshot completo de origen/documento/recursos, revisión/estado/folio, versiones técnicas y archivo/huella. FK/índices, CHECK y triggers conservan inmutabilidad, identidad y confirmación conjunta. Migración `20261012224528_pdf_cotizaciones_versionadas` aplicada tras validar en copia; cliente generado, 18 migraciones al día, 45 tablas originales intactas respecto de huellas inmediatamente previas y cero emisiones de prueba reales.

Servicio en pdfs-cotizacion.ts captura de forma coherente, renderiza fuera de tx y verifica revisión/huella al confirmar. UUID estable, una emisión equivalente y reconocimiento del reintento antes de versión. Archivo nuevo/rollback/perdedor se elimina sólo al confirmar ausencia de referencia; commit incierto conserva y permite recuperar resultado. Versiones archivadas se descargan como bytes originales con comprobación SHA-256, sin recalcular ni consultar catálogos actuales.

Playwright/Chromium genera Carta desde HTML controlado/JSON validado: formato, listas, tablas, imágenes y paginación. Recursos PNG embebidos, scripts deshabilitados y solicitudes remotas bloqueadas. Almacenamiento local var/cotizaciones/pdfs o COTIZACION_PDF_DIR, contrato reemplazable por S3. Los datos originales de Quote/QuoteDetail/DocumentFolio se serializan incluyendo Decimal/BigInt como texto. Huellas de solicitudes antiguas sin términos comerciales conservadas. Plazos históricos desconocidos no se inventan; validar RUT de campos impresos y bloquear emisor incompleto. La actualización explícita de emisor en Pendientes antiguas continúa esperando decisión; ninguna copia histórica se completó automáticamente.

Interfaz: acción PDF en listado/Ver, historial, visor/descarga, confirmación sólo al emitir y alertas reutilizables; consulta archivada directa. Validación: integración PDF y regresión Cotizaciones en copia, puras texto/importes, Chromium 320–1440, foco, descarga/hash, seis páginas Carta, rollback/concurrencia/commit incierto y preservación de inventario/cobranza; lint/build correctos. Respaldo/dumps/evidencias: `backups/20261012_194112_pdf_cotizaciones`. Copia/servidor propios retirados, 3031 libre y 3030 previo conservado; sin push. Revisión funcional pendiente en HITO-PDF-COTIZACIONES.

## 12-10-2026 — Renovación explícita del emisor de Cotizaciones

Usuario aprueba recuperar Pendientes antiguas con emisor incompleto. Se agrega «Actualizar emisor desde Empresa» en PDF y versiones. Tras confirmación, copia sólo el perfil actual del emisor en una nueva revisión; conserva folio, otras copias históricas, detalle e importes. Empresa debe tener razón social, RUT válido, dirección y ciudad. Documentos terminales, eliminados, versiones obsoletas y referencias a Orden de Compra Cliente quedan protegidos.

El servicio reutiliza QuoteOperation EDITAR con huella específica y UUID estable. Emisor/versión/operación se guardan en una transacción y los reintentos recuperan la operación antes de revisar Empresa. No requiere migración ni cambio de esquema. Los PDF archivados conservan bytes y snapshots; la siguiente emisión corresponde a la nueva revisión.

Respaldo previo: `backups/20261012_213623_emisor_cotizaciones/`, con archivos afectados y dump PostgreSQL. Validaciones y cierre: ver `docs/HITO-PDF-COTIZACIONES.md`.

## 12-10-2026 — Validación funcional del PDF y envío por correo pendiente

El usuario aprueba expresamente la generación de PDF y se cierran los checks funcionales de P1–P5. Se documenta P6 en HITO-PDF-COTIZACIONES: envío al correo actual del contacto de la sucursal indicada, leído desde el mantenedor; si falta, solicitarlo al realizar el envío. Por instrucción del usuario, esta etapa espera los datos SMTP y contraseña de aplicación válidas del usuario final. No se implementa envío ni se almacenan credenciales; tampoco se modifica código/Prisma/BD en esta entrega documental.

Antes de desarrollar se definirá si el correo ingresado se conserva en Sucursal o sólo en el envío, además de revisión PDF/asunto/cuerpo e historial/reintentos. No se asumen respuestas a esos puntos. Respaldos documentales: `backups/20261012_223110_cierre_pdf_plan_correo/`. Validación: contenido, rutas, checks y diff; no corresponde levantar servicios ni ejecutar build para este cambio.

## 12-10-2026 — Plan de Orden de Compra Cliente y aceptación parcial

Se crea `docs/HITO-ORDEN-COMPRA-CLIENTE.md` con revisión del modelo real, definiciones confirmadas, D1–D10 por resolver, propuesta de datos/servicios/interfaz, migración conservadora y etapas OCC0–OCC5 con matriz de validación. El usuario establece una sola orden por cotización y posible aceptación parcial. El esquema todavía admite varias órdenes y no tiene detalle propio: se planifica corregir esa cardinalidad tras auditar datos, guardando cantidades/importe aceptados sin recortar la oferta original.

Se documenta la coordinación entre aprobación, folio, orden, operación y cuenta propuesta; una OT por orden, obras propias, snapshots, IVA/descuento y conservación del PDF. Se distingue aprobación implementada de la conversión aún pendiente. No se aplica ninguna regla comercial propuesta por silencio; OCC1–OCC5 continúan abiertos.

Entrega sólo documental: sin cambios en Prisma/código/BD, migración ni servicios. Respaldos previos de documentos e instrucciones en `backups/20261012_224338_plan_orden_compra_cliente/`. Revisión de enlaces, coherencia y diff; no se requiere build para este cambio.

## 12-10-2026 — OCC1: auditoría y cardinalidades de Orden de Compra Cliente

La solicitud de desarrollo autoriza avanzar en decisiones técnicas. Se implementan las dos cardinalidades comerciales ya confirmadas: `SalesOrder.quoteId @unique` y `WorkOrder.salesOrderId @unique`, con inversas singulares opcionales `Quote.salesOrder` y `SalesOrder.workOrder`. Las obras propias mantienen múltiples NULL. Esto impide duplicar el compromiso de una cotización y sus trabajos; no registra aceptación parcial ni crea documentos/cuentas automáticamente.

Migración `20261013021125_cardinalidad_orden_compra_cliente`: transacción y bloqueo de ambas tablas, precondiciones que rechazan duplicados sin reconciliación automática, sustitución de índices normales por únicos. Conserva FK, CHECK/triggers anteriores, fechas y datos. No se modificaron migraciones aplicadas. Auditoría reutilizable en `scripts/auditar-ordenes-compra-cliente.ts`, con transacción PostgreSQL de sólo lectura y RepeatableRead; informe sin datos personales ni URLs. Se revisaron referencias en servicios/consultas y seed, sin consumidores de las inversas plurales que adaptar.

Auditoría real: cero órdenes/trabajos/cuentas/abonos/guías, una cotización Pendiente y un PDF archivado. Numeración de orden/trabajo aún sin configurar. Respaldo de archivos/dump/evidencias en `backups/20261012_230813_auditoria_orden_compra_cliente/`. Validación en copia local descartable: precondiciones ante duplicados, rollback, unicidades y múltiples obras propias mediante `tests/ordenes-cardinalidad.integration.ts`; las 47 tablas conservan conteos y huellas en copia y base local tras migrar. Cliente regenerado, 19 migraciones al día, Prisma validate/lint/build correctos. Copia retirada y sin servidores de aplicación iniciados. Sin push.

OCC1 sigue parcialmente abierto. D1–D10 se consultaron agrupados y esperan respuesta antes de desarrollar los bloques comerciales dependientes; la autorización técnica no resuelve el descuento fijo, aceptación, referencias externas ni anulación. Estado y recuperación documentados en HITO-ORDEN-COMPRA-CLIENTE.

## 13-10-2026 — Orden de Compra Cliente: registro, consulta y anulación

El usuario aprueba D1–D4 y D6–D10 y precisa D5: conservar literalmente número/fecha de cliente, con número/fecha opcionales y unicidad del número equivalente por espacios/mayúsculas para el mismo cliente. Se implementa aceptación completa/parcial sin renegociar la oferta; IVA/precios/condiciones históricos, porcentaje conservado y monto fijo prorrateado. La aprobación pendiente, folio, cabecera/detalle propios, operación UUID y cuenta por total aceptado (incluso cero, sin vencimiento ni pagos) confirman juntos. Aprobadas anteriores sin orden admitidas aunque haya vencido la oferta; Pendientes vencidas e históricos incompletos bloqueados sin refrescar mantenedores.

`SalesOrder` incorpora identidad/versiones, fecha calendario nueva `acceptanceDate`, referencias externas, copias completas y alcance/importes propios; conserva el timestamp `date` y `pdfUrl` legados sin reinterpretarlos. Nuevos `SalesOrderDetail` y `SalesOrderOperation`; claves compuestas/índices/FK Restrict, CHECK de cantidades/dinero/sumas, origen histórico, folio/tipo/UUID, detalle sólo en tx de creación y confirmación diferida de cuenta/operación. Legados permanecen explícitamente incompletos, sin aceptación/folio/deuda inventados. La referencia externa guarda original y clave interna; incluye espacios no separadores/de cifra/estrechos y queda reservada al anular. Precondiciones detienen claves históricas que requieran conciliación, sin modificarlas automáticamente.

Migraciones `20261013022726_registro_orden_compra_cliente`, `20261013030000_integridad_orden_compra_cliente`, `20261013033000_referencias_orden_cliente_espacios` y `20261013040000_vinculos_cobranza_orden_cliente`, aplicadas tras validar copias; 23 migraciones al día y cliente generado. SQL compara copias de Quote/QuoteDetail/DocumentFolio con tipos nativos y conserva contenido/operaciones. Anulación versionada y con motivo, sólo sin trabajo ni abonos/hitos posteriores; orden/cuenta se anulan juntas. Vínculos de trabajo y abonos no pueden eliminarse/desvincularse para eludir protección; inserción de abono serializada contra anulación. No implementa registro de pagos/sobrepagos. `leerCompromisoParaTrabajo(tx, referencia)` entrega sólo lo contratado, bajo bloqueo y sin trabajo previo, sin crear OT/reserva/consumo.

Interfaz en `/ventas/ordenes`: listado paginado/ordenado/filtrado en PostgreSQL, filtro de cotización buscable, Crear/Ver sobre listado, selección/cantidades, alcance revisado, resumen, cuenta/historial y anulación confirmada. Aceptación también sobre Cotizaciones, con vínculo Ver orden. La acción pública de aprobación independiente se sustituye por aceptación coordinada; helper interno de tx conserva reglas e historial. Editor compartido permite reutilizar imágenes de la oferta sin subidas nuevas; silenciar el evento de contenido al bloquear/desbloquear evita perder preview/errores/revisión del alcance. Valores conservados, errores de cantidad por línea, teclado/foco/readonly y 320–1440 comprobados; contraste básico de textos computados correcto.

Validación: puras de importes, integración comercial/SQL, rollback deliberado en cinco etapas, UUID/carreras (incluidas editar/rechazar y pagar/anular), commit con respuesta perdida recuperado, históricos incompletos bloqueados, copias adulteradas rechazadas y legado conservado. Regresiones completas de Cotizaciones/PDF correctas en copia separada; Prisma validate/generate, lint/build y diff correctos. Las 47 tablas previas conservan conteos/huellas y las nuevas están vacías en la base real. Respaldo/dump/almacenes locales/logs/capturas en `backups/20261012_232400_registro_orden_compra_cliente/`. Copias/3031 propios retirados, 3030 previo preservado; sin push.

OCC1–OCC4 técnicos completos, OCC5 espera revisión funcional del usuario. Numeración de Orden de Compra Cliente aún requiere configurar inicio/dígitos; no se inventaron valores. Producción/despacho/factura/vencimiento, anticipos/abonos, adjuntos/PDF propio y SMTP mantienen sus hitos posteriores.

## 13-10-2026 — Cierre funcional de Orden de Compra Cliente

El usuario confirma «Funciona correctamente». Se cierra OCC5 y el hito OCC1–OCC5, actualizando el checkpoint comercial, los avances de interfaz y las instrucciones del repositorio. La evidencia técnica previa permanece en HITO-ORDEN-COMPRA-CLIENTE; esta confirmación registra aprobación funcional de la entrega, sin atribuir al usuario ejecución individual de cada caso de prueba.

Continúan pendientes Orden de Trabajo/Producción, anticipos/abonos y panel de cobranza, factura/vencimiento y despacho. Adjuntos/PDF propio de la orden son ampliaciones posteriores; correo de cotizaciones espera SMTP/contraseña de aplicación. Esta actualización sólo modifica documentación: revisión de contenido y diff, sin nuevas escrituras de base ni servidores.

## 13-10-2026 — Base de cálculo de requerimientos y cobertura de reservas

D10/D17/D13 confirmadas por el usuario: anulación sólo de obras propias sin ejecución con liberación histórica de reservas; obra propia de catálogo/a medida con título/finalidad/fecha; requerimientos con HALF_UP a tres decimales y revisión si una necesidad positiva redondea a cero. Respuestas registradas en HITO-ORDEN-TRABAJO-PRODUCCION.

Nuevo servicio puro `src/lib/servicios/requerimientos-produccion.ts`: calcula requerimiento por material/unidad desde receta histórica con precisión propia de 40 dígitos y devuelve cantidades exactas/redondeadas/diferencia/revisión como texto. Calcula también reserva parcial máxima, libre y faltante a partir de físico/reserva total/reserva propia coherentes, sin apropiarse de cobertura ajena. Rechaza cantidades y referencias inválidas, duplicados, desbordes y excesos de reserva que requieren conciliación.

Verificación: `node --import tsx tests/requerimientos-produccion.ts`, `pnpm lint` y `pnpm build` correctos. Sin cambios de esquema, dependencias ni datos; no se inició servidor de aplicación. Las funciones no consultan base ni escriben reservas/Kardex. Integración transaccional y módulo de OT todavía pendientes; esto completa la base pura, no la operación productiva.

## 13-10-2026 — Orden de Trabajo: estructura y planificación M1

D09/D12 y D19/D20 aprobadas por el usuario: reversión productiva controlada antes de cierre, daño mediante ajuste, sin reapertura/cierre incompleto, bodegas explícitamente clasificadas y fechas/registro tardío según el plan. Se ratifica factura externa y registro de folio/fecha en OT como fuente del vencimiento; las precisiones financieras restantes se consultan antes de su implementación.

Migración 20261013184612_estructura_orden_trabajo incorpora contrato nuevo de WorkOrder con folio/UUID/version/fecha/snapshots/obra propia, estado ANULADO, cuatro tablas de líneas/receta histórica/abastecimiento/operación y campos nullable en detalle legado. Conserva relaciones y valores previos, único trabajo comercial y obras propias NULL. CHECK/FK compuestas/índices/triggers garantizan fuente aceptada completa, pertenencia, snapshots tipados y operación/documento juntos. Cambiar catálogo no refresca receta histórica; cambiar metadatos de captura exige revisión íntegra. No se implementan todavía reservas o consumo.

Mantenedores de material/producto/unidad/bodega incorporan referencias de planificación y de operaciones históricas; el helper referencias-plan-trabajo.ts evita que quitar componentes del plan libere una referencia anterior. El consumo nuevo no puede usar directamente un requerimiento previsto como documento físico. Inicio/cierre y servicios públicos se habilitarán sólo al integrar los módulos pendientes.

Restauración: se corrige la llamada del normalizador de referencia de OC a public.referencia_orden_cliente_espacios, conservando su algoritmo. La referencia sin esquema impedía restaurar un dump con datos de OC bajo search_path vacío. Se probó restauración por etapas del respaldo anterior y directa del dump corregido; no se modifican migraciones aplicadas del hito OCC.

Validación en copias: integración M1, rollback de documento/folio/contador, recetas/versiones/copias adulteradas, historia de catálogos y conservación de legado con trabajos, consumo y guía/campos de pago. Regresiones de OCC comercial/integridad y carga inicial/ajustes de terminado correctas. Fixtures OCC positivos actualizados mediante helper exclusivo de pruebas. Prisma validate/generate/status correctos y 24 migraciones al día; las 49 tablas anteriores conservan huellas/conteos y tablas M1 nuevas vacías en base real. Respaldo/dump/recursos/huellas/logs en backups/20261013_153522_estructura_orden_trabajo/. MR y M2–M4, interfaz y revisión funcional permanecen pendientes.


Cierre de verificación M1: lint y compilación final de producción correctos después de aplicar la migración; consultas de mantenedores verificadas. Se retiraron las seis copias descartables y se comprobó su ausencia. No se inició servidor propio; se conservó el servidor previo del usuario en 3030 y 3031 quedó libre.

## 13-10-2026 — Acuerdos de factura externa de OT

El usuario aprueba D14/D15/D16: finalizar OT antes de registrar factura, manteniendo vencimiento nulo; folio literal único por RUT emisor sin reinicio anual; corrección histórica con motivo aun con abonos, recalculando sólo vencimiento y conservando importe/pagos. El plan exige identidad del emisor histórica, revisión inmutable y actualización transaccional de referencia vigente y cuenta. Estas respuestas actualizan la planificación; todavía no implementan registro de factura ni cierre en la aplicación. D11/D18 se consultan de forma específica y siguen pendientes.


## 14-10-2026 — Reservas de planificación de OT

D11 aprobada: ejecución completa y preparación respaldada por reservas completas antes de finalizar, sin despacho implícito. D18: PDF propio al final del desarrollo del módulo.

Migración 20261014183729_reservas_stock: asignaciones y eventos inmutables de reserva MP/PT con finalidad/titular/recurso/bodega/unidad/origen/UUID; tipos RESERVAR_STOCK/LIBERAR_RESERVA y snapshot de reservas en operación. Cantidad activa derivada, sin caducidad ni Kardex ficticio; FK diferidas para documento/operación juntos, índices, CHECK y triggers de origen/remanente/demanda/cobertura. Snapshot JSON exacto evita aceptar copias adulteradas que se redondeen a la misma escala. Mantiene compatibilidad de operaciones M1 sin reservas, sin inventar historia.

Nuevo backend reservas-stock.ts: completar parcialmente stock libre en orden determinista, liberar con motivo, idempotencia antes de versión y locks OT/materiales/productos/bodegas/saldos. Helper transaccional para futuro registro/confirmación pública del plan. Ajustes MP/PT, Traslados y anulación de Compra consultan cobertura activa; triggers de stock impiden retiradas comprometidas también por SQL. Guard de UPSERT distingue intento provisional de INSERT del UPDATE real, preservando recepciones positivas. Se conserva historia de Compra, mínimos, versiones y saldos/Kardex.

Pruebas de competencia por stock, UUID, versiones, liberaciones parciales/ajenas/excesivas, rollback inducido, inmutabilidad, snapshots adulterados y anulación de propia, interacción con ajustes/traslados/Compras y reserva parcial de terminado comercial. Regresiones M1, OCC, stock inicial/ajustes de terminado, cierre/anulación de Compras y Traslados correctas en copias separadas. Contrato de errores de línea de previsualización OCC explicitado para resolver la comprobación TypeScript sin cambiar comportamiento comercial.

Prisma validate/generate/status, lint, TypeScript y build correctos. Migración local aplicada: 25 al día, 53 tablas previas con huellas/conteos conservados, sin trabajos ni reservas de prueba en base real. Respaldo restaurado y evidencias en backups/20261014_reservas_stock. Backend del plan implementado; UI/confirmación pública, consumo/reserva del resultado fabricado/reversión, cierre/factura y PDF continúan pendientes. No se afirma que el módulo esté cerrado funcionalmente.

Cierre de validación MR: seis copias descartables retiradas, ausencia verificada y puertos 3030/3031 libres. No se inició servidor de aplicación ni se hizo push.


## 15-10-2026 — Creación y planificación pública de Orden de Trabajo

Migración 20261014191938_revisiones_plan_trabajo aplicada después de pruebas en copia: archivo lógico de receta/requerimiento/abastecimiento mediante retiredAt, revisión explícita del redondeo a cero y decisión/motivo de plan en operación. Triggers exigen distribución completa al confirmar, reservas cero en borrador y conservación de orígenes históricos. Compatibilidad nullable de documentos anteriores sin inventar historia; M1/MR aplicadas no se modifican.

Nuevo guardarPlanTrabajo: OT comercial desde compromiso aceptado completo o propia sin cliente/cuenta ficticios; folio, plan, conciliación de reservas y operación atómicos, versiones e idempotencia con UUID/huella. Receta histórica salvo actualización explícita, necesidades HALF_UP y distribución por bodegas; confirmar reserva stock libre parcialmente, guardar borrador libera con motivo. Bloqueos de origen, materiales/productos/bodegas/saldos y relectura de composición para detectar recursos nuevos antes de escribir. Sin cambio de stock físico/Kardex/importes/cuentas.

/trabajos/ordenes sustituye ruta provisional por listado en servidor, Crear/Ver/Editar sobre listado, buscadores, fuente comercial readonly, planificación de catálogo/a medida/directa/servicio, consulta de cobertura e historial, completar y liberar reservas. OCC enlaza Crear/Ver trabajo. Solicitud incierta conserva datos/UUID; fechas calendario sin desplazamiento horario y cantidades con coma/punto. Líneas guardadas se mantienen en esta primera interfaz.

Integración de plan nueva y regresiones M1/MR/OCC correctas, incluida distribución/decisión inválida por SQL, revisión de cero, recetas/componentes reemplazados, carreras y rollback; copia con legado conserva datos. Chromium creación/edición/reservas/descarte/enlace OCC y liberación parcial con coma, consulta/formulario 320/768/1440 sin desbordamiento ni errores JavaScript. Prisma validate/generate y diff copia/local correctos; lint/build correctos. 26 migraciones al día y 55 tablas anteriores con conteos/huellas conservados antes/después de migrar. Respaldo restaurado, dump actualizado y evidencias en backups/20261014_planificacion_trabajo/.

Numeración OT sigue sin inicio/dígitos en la base local; requiere configuración, sin valores inventados. Inicio, fabricación/avance, consumo/reserva del resultado, reversión/anulación pública, cierre/factura y PDF final pendientes. Revisión funcional del usuario pendiente; no se cierra el módulo.

Cierre: consultas locales de OT/catálogos correctas; checksums de las 26 migraciones coinciden y base real sin OT/reservas/eventos de prueba. Cinco copias descartables retiradas, servidor propio detenido y 3031 libre; servidor previo del usuario en 3030 conservado. Sin push.


## 15-10-2026 — Habilitación de Completar reservas

La consulta de OT habilita «Completar reservas» sólo con plan confirmado y cantidades pendientes, además del estado pendiente y ausencia de operación en curso ya exigidos. Calcula con Decimal por requerimiento/abastecimiento activo y sus reservas propias, sin compensaciones entre orígenes. Muestra texto explícito con/sin cantidades pendientes; sin requisitos de stock la acción queda deshabilitada. Cambio de interfaz sin esquema ni escrituras de base. La prueba funcional del usuario final sigue pendiente.

Validación del ajuste de habilitación: `pnpm lint` y `pnpm build` correctos, con comprobación TypeScript incluida; diff sin errores de espacios. La primera compilación restringida se canceló al quedar en Turbopack; la ejecución posterior fuera de ese entorno terminó correctamente. No se realizaron migraciones, escrituras de base ni se iniciaron servidores para este ajuste.


## 15-10-2026 — Inicio de Orden de Trabajo y reservas en proceso

Habilita transición explícita PENDIENTE → EN_PROCESO con fecha de inicio, plan confirmado, versiones, UUID/huella e historial. La estructura Prisma ya contenía startedDate/estado/tipo de operación: migración SQL 20261015200647_inicio_orden_trabajo amplía sólo funciones/triggers, sin nuevos campos ni relleno de datos. Inicio cambia únicamente estado/fecha/versión/updatedAt y preserva exactamente plan/reservas; SQL rechaza fechas incompatibles, alteración simultánea de plan, operación ausente o de otro tipo y reinicios. Plan/receta/fecha quedan fijos desde inicio.

Completar/liberar reservas se mantiene disponible en proceso para cubrir faltantes posteriores, conservando controles físicos e historial; CONSUMIR continúa bloqueado hasta M2. Backend de plan/reservas/inicio comparte advisory de UUID y canonicalización, sin cambiar el orden de locks de recursos. Reintentos reconocidos antes de versión/estado. UI con fecha, aviso de registro tardío/faltantes, confirmación e historial; acciones Editar/Iniciar desaparecen al iniciar.

Nueva integración de inicio en copia local: plan/fechas/versiones, SQL directo, UUID/carreras, rollback y reintento, propia/servicio comercial, conservación de stock/Kardex/cuentas/folios y reservas en proceso. Regresiones plan/MR/M1 correctas. Chromium cancelación/confirmación/consulta/completar en proceso a 320/768/1440 sin errores JS/desbordamiento. Prisma validate/generate, diff copia/local, lint/tipos/build correctos; 27 migraciones y checksums coherentes. 55 tablas previas con huellas/conteos conservados, OT real sin iniciar automáticamente. Respaldo restaurado/evidencias en backups/20261015_inicio_trabajo/. Fabricación/avance OT5/M2 y revisión funcional final pendientes.

Cierre de inicio OT4: cuatro copias descartables retiradas y ausencia verificada; servidor propio de 3031 detenido, puerto libre y servidor previo del usuario en 3030 conservado. Diff revisado sin errores; sin push.


## 15-10-2026 — Registros de fabricación y avances OT5/M2

Migración 20261015211304_registros_produccion: ProductionRecord, ProductionConsumption y ProductionOutput inmutables; tipos de fabricación/a medida/servicio; orígenes físicos únicos/compuestos en Kardex MP/PT y vínculo de operación al registro. CONSUMIR exige consumo tipado de la misma operación/línea/material/bodega; asignación del resultado comercial añade tercer origen excluyente. CHECK/FK/índices/triggers preservan historia, cantidades, unidad/bodega, límites, operación y efectos completos al commit. Snapshot de reservas omite referencias nuevas nulas para conservar igualdad con historia anterior. Sin backfill de fabricación ni edición de migraciones previas.

registrarProduccion confirma consumo MP + SALIDA + resultado/ENTRADA PT + débitos/liberaciones de reserva + reserva del resultado comercial + operación/versiones en una transacción. Usa stock libre y reserva propia de la línea; conserva mínimos y saldos/Kardex, sin crear otra deuda/folio. Previsión del lote canónica en SQL desde receta/plan históricos, HALF_UP y revisión positiva de cero, diferencias con motivo. La demanda restante deriva de consumo y avance pendiente; completar reservas no vuelve a reservar insumos ejecutados. MP usa inicioDiaChile para fecha de Kardex; documentos y PT conservan fecha calendario.

Interfaz por línea/lote con carga de previsión, consumos reales, preview de sólo lectura, confirmación y UUID estable ante incertidumbre; acumulados e historia en Ver OT. Kardex de ambos inventarios enlaza al registro mediante OT y distingue fabricación de inventario inicial/ajustes. Servicio puro y a medida no crean producto ficticio. Líneas enteramente desde stock no muestran registro de fabricación.

Integración de producción correcta: parciales, modos, variantes, revisión de cero, tipos/unidades/fechas, SQL adulterado/incompleto, stock inicial posterior bloqueado, UUID y carreras, rollback en SALIDA/ENTRADA/operación, competencia de OT y producción contra ajuste negativo/anulación de compra. Regresiones plan/MR/inicio/inventario inicial/ajustes PT correctas. Chromium 320/768/1440 sin desbordamiento/errores JS, preview/descarte sin escrituras, confirmación única, efectos físicos y finanzas/folios intactos, enlaces y fecha de Kardex verificados. Lint/tipos/build y Prisma validate/generate/diff correctos.

28 migraciones locales al día; 55 tablas originales con conteos/huellas preservados, tres tablas nuevas sin fixtures. OT real conserva estado/versión y cero registros productivos. Respaldos restaurados/evidencias en backups/20261015_produccion/. Revisión funcional de Producción pendiente; reversión OT6/M3, cierre/factura OT7/M4 y PDF final aún no implementados.

Cierre M2: consultas locales correctas, checksums de las 28 migraciones coherentes y tres tablas productivas sin fixtures reales. Cinco copias descartables retiradas y ausencia comprobada; servidor temporal de 3031 detenido, puerto libre y servidor previo del usuario en 3030 conservado. Sin push.

## 2026-10-15: OT6/M3 — reversión productiva y anulación de obra propia

Se incorpora una reversión completa por registro de fabricación, servicio o ejecución a medida. `ProductionReversal` y sus detalles conservan el original, las cantidades y copias históricas; los Kardex usan orígenes tipados de restitución MP y retiro PT. FK compuestas, unicidad y triggers inmutables/diferidos impiden cantidades distintas, omisión de consumos/resultado/movimientos y operaciones incompletas. Migración `20261016004629_reversiones_produccion`.

`src/lib/servicios/reversiones-produccion.ts` previsualiza sin escribir y confirma bajo UUID/versión/bloqueos de OT, recursos y saldos. Exige motivo, fecha compatible, ausencia de despacho y confirmación física para fabricación/a medida. Protege reservas ajenas y bloquea salidas/ajustes negativos posteriores aunque se repongan existencias. La devolución de MP no elimina el consumo histórico que bloquea anular Compras.

El avance y la demanda se derivan de registros sin reversión. Las reservas del resultado se liberan, las de requerimientos pendientes se reconstruyen con asignaciones nuevas hasta el libre disponible y Completar reservas excluye resultados revertidos. Un nuevo registro puede enlazar el original revertido mediante `correctsProductionRecordId`; se conserva la huella de M2 cuando ese vínculo no existe.

La anulación pública sólo admite obra propia pendiente sin inicio/ejecución/despacho. Libera reservas y conserva plan, folio e historial sin efectos físicos ni comerciales. No se habilita cancelación contractual comercial ni anulación de OT iniciadas.

Ver OT incorpora previsualización/confirmación, reversión con motivo e historial, avance neto, vínculo de corrección y anulación propia. Ambos Kardex identifican la reversión y permiten volver a la OT; cantidades se muestran en formato chileno. Finalización/factura y PDF siguen pendientes.

Validación técnica: integración M3 con idempotencia, carreras, rollback inducido en MP/PT/operación, restricciones SQL, variantes propias/comerciales y protección de inventario/Compras; regresiones M2, planificación, inicio y reservas en copias descartables. Chromium 320/768/1440 comprobó descarte/preview sin escritura, confirmación única, restitución física, historial, finanzas/folios intactos, navegación y anulación. Revisión funcional del usuario pendiente. Detalle y pasos en `docs/HITO-ORDEN-TRABAJO-PRODUCCION.md`.

Despliegue local: 29 migraciones al día y cliente generado, sin diferencias de esquema ni checksums alterados. Las 58 tablas previas conservan datos originales según conteos/huellas pre/post migración; nuevas tablas M3 sin fixtures. Consultas locales, ESLint y build final correctos. Cuatro copias descartables retiradas; servidor temporal detenido y 3031 libre, conservando 3030 del usuario. Respaldos/evidencias en `backups/20261015_reversiones/`.


## 16-10-2026 — Finalización y factura externa OT7/M4

Migración `20261016184002_finalizacion_factura_trabajo`: cierre inmutable, identidad permanente emisor/folio y revisiones de factura, puntero vigente y operaciones tipadas. FK compuestas/índices/CHECK/triggers protegen origen, sucesión, preparación completa y vencimiento ligado a referencia; no se infieren hechos legados ni se modifican migraciones previas.

`servicios/cierre-trabajo.ts` finaliza desde avance neto y reservas completas de entrega con respaldo físico/Kardex, sin escribir stock ni liberar reservas. Factura externa posterior y corrección con motivo calculan vencimiento desde fecha/plazo históricos, preservando importe/pagos/promesa. UUID/huella antes de versión, locks Quote → orden → OT → cuenta y recursos ascendentes; operaciones/snapshots juntos. Identidades anteriores no se liberan y el emisor histórico no se refresca desde Empresa.

Interfaz Finalizar/Revisar preparación, Registrar/Corregir factura con confirmación y reintento estable; consulta de importe/abonos/saldo/vencimiento/promesa e historia desde Ver OT. Sin reapertura, cierre parcial, guías, emisión tributaria ni registro de pagos. PDF propio queda pendiente al final.

Integración M4 validada en copias locales: propios/comerciales/mixtos, preparación, calendario, identidad, anticipos/saldo cero, condiciones históricas, UUID, carreras, rollback y restricciones SQL. Regresiones de reservas/inicio/plan/producción/reversión y Chromium 320/768/1440 correctos. Respaldo y comparación de las 61 tablas anteriores conservan sus datos originales al migrar localmente. Evidencia en `backups/20261016_finalizacion/`; detalle y revisión funcional pendiente en `docs/HITO-ORDEN-TRABAJO-PRODUCCION.md`.

Cierre técnico local: 30 migraciones al día, checksums/esquema correctos, consultas y lint/tipos/build final correctos. Tablas nuevas M4 sin fixtures y OT real #3 en proceso, versión 3. Siete copias descartables retiradas, 3031 libre y servidor previo 3030 conservado. Sin push; aprobación funcional pendiente.


## 16-10-2026 — OT8/OT9: PDF propio e integración final

Migración `20261017000019_pdf_ordenes_trabajo`: emisiones/solicitudes inmutables de PDF de OT, unicidad por revisión/plantilla, origen/snapshot completos, tamaño/huella e integridad diferida. `snapshot_pdf_trabajo` conserva plan y ejecución históricos con cantidades como texto; no se agrega backfill ni se modifican migraciones aplicadas.

Servicio de emisión captura coherentemente, renderiza fuera de tx y reconfirma revisión/origen bajo bloqueo compartido antes de archivar emisión/UUID. `AlmacenPdfTrabajo` local en `var/trabajos/pdfs` o `TRABAJO_PDF_DIR`, preparado para otro proveedor. Descarga verifica los bytes originales por SHA-256; respaldo de carpeta y recursos junto con PostgreSQL. PDF Carta interno con plan/receta, consumos/resultados, reversiones, cierre y factura externa. Chromium sin JS/red durante render, imágenes locales embebidas y texto escapado. La emisión no cambia revisión, stock, reservas ni cuenta.

Ver OT añade generación confirmada, historial, preview/descarga y reintento estable. Accesibilidad básica: error de cantidad asociado, motivos de acciones bloqueadas y validación de teclado/foco/búsquedas/readonly en 320/375/768/1440. La prueba de consultas de Inventario usa ahora fixtures de documentos vigentes en lugar de insertar OT sin contrato ni eliminar historia; numeración tiene regresión sobre documentos existentes. Flujo integral y regresiones en copias aisladas; manual de operación/recuperación y contratos futuros de Despacho/Cobranza en `docs/OPERACION-ORDENES-TRABAJO.md`. Aprobación funcional integral pendiente, sin marcar por la solicitud de finalizar el desarrollo.

Cierre local OT8/OT9: 31 migraciones, checksums/esquema correctos y 64 tablas anteriores conservadas. Tablas PDF reales vacías y OT #3 conserva EN_PROCESO/versión 3. Lint/tipos/build y 22 suites correctos; comprobación de 17 PDFs de prueba sin huérfanos. Copias y servidor temporal retirados, 3031 libre y 3030 previo conservado. Sin push; aprobación funcional pendiente.

## 17-10-2026 — Compatibilidad de snapshots de OT anteriores a factura

Se corrigió una regresión de M4: `currentInvoiceReferenceId` se agregó nullable a WorkOrder, pero las cabeceras JSON de operaciones anteriores no tienen esa clave. Al registrar producción, la comparación literal interpretaba la ausencia histórica frente al nuevo null como un cambio de plan y rechazaba la transacción. La OT local anterior a M4 permitió confirmar el diagnóstico sin modificarla.

Migración nueva `20261017034142_compatibilidad_snapshots_trabajo`: `normalizar_cabecera_snapshot_trabajo` equipara exclusivamente ausencia y null del campo conocido al comparar cabeceras. Producción, inicio, reservas y reversiones usan la misma normalización. No se elimina la clave ni se ignoran valores no nulos; se conservan diferencias de otros campos, controles de estado/versión, identidad, plan e inventario. No cambia el esquema Prisma ni se reescriben operaciones, snapshots, movimientos o PDFs; las migraciones aplicadas anteriores quedan intactas.

`tests/produccion-snapshots.integration.ts` inserta fixtures válidos con formato JSON anterior a M4 sin deshabilitar triggers ni actualizar historia. Reproduce el rechazo/rollback antes de la corrección y comprueba después catálogo, servicio puro, a medida, inicio, liberación/completado de reservas, reversión, idempotencia y conservación exacta de los snapshots previos. También verifica que valores no nulos, cambios de plan y claves desconocidas siguen siendo distintos. Las pruebas se ejecutan exclusivamente en copia local `mtx_validacion_produccion_snapshots_*`.

Corrección aplicada localmente tras respaldo/restauración de copia y reproducción del error. 32 migraciones al día, checksums y esquema verificados; las 66 tablas conservan conteos/huellas antes/después. La OT real #3 sigue EN_PROCESO, versión 3 y sin producción registrada automáticamente; su cabecera histórica permanece sin el campo nuevo, pero la comparación normalizada es compatible. Regresiones de producción, reversión, inicio y reservas correctas, además de la prueba específica antes/después; lint, tipos y build correctos. Cuatro copias descartables retiradas, sin servidor de aplicación propio iniciado ni push. Evidencias en `backups/20261017_compatibilidad_snapshots/`.

## 18-10-2026 — Aprobación funcional y cierre de OT

El usuario confirma que todo funciona correctamente tras revisar el módulo. Se registra la aprobación funcional general y se cierra OT0–OT9 en el hito, el manual operativo y el seguimiento de interfaz. No se atribuye una ejecución individual de cada escenario. El siguiente hito del flujo es Guías de Despacho / entregas; servicios de Cobranza posteriores e independientes. Cambio documental, sin modificación de esquema, código o base de datos.

## 18-10-2026 — Planificación de Guías de Despacho y Entregas

Se agrega `HITO-GUIAS-DESPACHO-ENTREGAS.md` con dependencias actuales, invariantes propuestas, etapas G0–G6, casos mínimos y criterios de cierre. `OPERACION-ORDENES-TRABAJO.md` enlaza el plan y refleja la regla aprobada de conformidad por línea para servicios/a medida. La planificación queda cerrada funcionalmente tras las cinco respuestas del usuario del 18-10-2026: sólo OCC/clientes, entregas parciales antes de finalizar OT, documento operativo interno, conformidad por línea para servicios/a medida y legado `DeliveryNote` no conciliado. No se modifica esquema, código ni base de datos.

## 18-10-2026 — G0 de Guías de Despacho cerrado

Auditoría local de sólo lectura: cero `DeliveryNote` heredadas, una OT comercial nueva finalizada, ninguna OCC confirmada sin OT, numeración de guías y perfil de Empresa configurados. El usuario aprueba D06–D08: sólo sucursal histórica de la OCC como destino; salida de bodega confirmada acredita entrega y descuenta stock; SERVICIO/A_MEDIDA exige nombre y fecha de conformidad por línea. Se documentan estados y condiciones de emisión. G1–G6 quedan pendientes; sin cambios de esquema, código ni datos.

## 18-10-2026 — G1 de Guías de Despacho: estructura y migración

`prisma/schema.prisma` y la migración `20261019010200_estructura_guias_despacho` agregan partidas de guía, tipo entrega/corrección, folio y operación idempotente, snapshots, conformidad por línea y referencias tipadas a Kardex y reservas. FK compuestas, índices y CHECKs ligan documento, OCC, OT, recursos y bodegas. Una restricción diferida verifica la completitud y cantidades netas de cada guía nueva. El legado `DeliveryNote` se conserva sin folio, líneas ni entregas inventadas, identificado por `schemaVersion = null`; sus campos de pago siguen siendo sólo históricos.

La nueva estructura no habilita emisiones: triggers bloquean inserciones hasta G3, cuando el servicio podrá coordinar en una transacción folio, operación, reservas, stock y movimientos y adaptar los triggers vigentes de OT/reservas. G2 permanece como siguiente etapa de consultas y preparación. Migración aplicada sólo a la base local `mtx_metal_erp` tras verificar su estado; archivo de respaldo en `backups/20261018_guias_g1/base.dump` (excluido de git). La prueba de migración se realizó en una copia local descartable.

## 18-10-2026 — G2 de Guías de Despacho: consultas y preparación

Se reemplaza la ruta provisional `/trabajos/despachos` por una consulta de sólo lectura con listado paginado, filtros de folio/cliente/OT/estado/fechas, aviso y filtro de legado no conciliado, y preparación por OT. `guias-despacho.ts` calcula en `RepeatableRead` cantidades contratadas, ejecución neta, entrega neta sólo desde guías nuevas, pendiente, reserva propia, saldo libre y conciliación Kardex por bodega. La previsualización informa el máximo orientativo y los motivos de inelegibilidad, sin escribir guías, folios, stock ni reservas. G3 deberá revalidar todo bajo bloqueo al confirmar; la barrera de inserción G1 sigue vigente.

## 19-10-2026 — G3 de Guías de Despacho: salida confirmada

`20261019024500_confirmacion_guias_despacho` amplía los triggers de OT/reservas para `DESPACHAR` y abre sólo inserciones de entregas completas; documentos y partidas siguen inmutables, y las correcciones quedan para G4. El servicio `guias-despacho.ts` valida OCC/OT, snapshots, cantidades, ejecución neta, reservas y saldo/Kardex bajo bloqueos ordenados. Folio, guía, partidas, eventos de reserva, SALIDA de inventario físico, versión y operación quedan en una transacción idempotente. El formulario en `/trabajos/despachos` permite cantidades parciales por línea/bodega, conformidad de prestaciones y confirmación explícita de la salida.

La migración se probó en copia local y se aplicó a `mtx_metal_erp` tras respaldo en `backups/20261019_guias_g3/base.dump` (ignorado por git). En copias descartables se confirmó una guía mixta con reintento exacto, se rechazó reutilizar el UUID con otros datos y se indujo una falla final que revirtió guía, folio, eventos y movimientos. No se emitieron guías en la base de desarrollo durante la validación.

## 19-10-2026 — G4 de Guías de Despacho: correcciones y dependencias

D09–D11 aprobadas: correcciones parciales o completas con documento inverso, recepción física en la bodega original para reponer bienes y conservación de deuda/factura/abonos aunque existan documentos posteriores. La migración nueva `20261019040000_correcciones_guias_despacho` habilita `CORREGIR_DESPACHO`, conserva inmutabilidad y límites acumulados por partida, y registra confirmación física. Las reservas reconstruidas referencian la partida inversa y el débito original con FK/índices; conservan recurso y origen de abastecimiento, sin reactivar ni editar historia. Stock, AJUSTE positivo, reserva propia, folio, documento y operación/versionado son atómicos e idempotentes.

`/trabajos/despachos` incorpora preparación, previsualización y confirmación de corrección. Servicios/a medida revierten entrega sin inventario. Completar reservas y cerrar OT consideran entrega neta derivada de documentos/débitos/restituciones, evitando reservar dos veces una entrega previa. La revisión de cierre muestra entregado y pendiente. Se mantienen bloqueos de reversión productiva tras despachos y de anulación contractual de OCC con OT; corregir no modifica cuenta, factura ni pagos.

Pruebas G4 en copias descartables: tipos de línea, parcial/completa, mixtas/bodegas, recepción física, reentrega, factura/pagos, reservas/cierre, UUID, concurrencia, inmutabilidad, rechazo SQL y rollback. Regresión existente de cierre/factura correcta. UI comprobada en Chromium a 320/375/768/1440; servidor temporal 3031 detenido y servidor previo 3030 conservado. Migración aplicada localmente tras respaldo en `backups/20261019_guias_g4/`; conteos/huellas de 67 tablas de negocio intactos. G5/G6 y aprobación funcional final siguen pendientes.

Cierre técnico G4: lint/build y validación/generación Prisma correctos; 35 migraciones al día, sin diferencias de esquema. Tres copias descartables retiradas, respaldo permanente conservado y sin push. La revisión funcional final no se da por aprobada.

## 19-10-2026 — G5 de Guías de Despacho: consulta e historial PDF

Se consolida `/trabajos/despachos` con detalle sobre el listado, datos históricos de emisor/cliente/destino, fechas, partidas/conformidad, cantidades comerciales netas, historial de OT y trazabilidad de movimientos/reservas. OT/OCC incorporan el acceso contextual **Guías y entregas**. La salida presenta su previsualización antes de confirmar, conserva campos/UUID ante resultado incierto y abre la consulta del documento confirmado. Se incorporan carga/error recuperables y foco de consulta/confirmaciones; los roles siguen expresamente pendientes de autenticación.

La migración `20261019060000_pdf_guias_despacho` agrega `DeliveryNotePdfEmission` / `DeliveryNotePdfRequest`, índices/FK Restrict, snapshots exactos, unicidad guía/plantilla, comprobación de solicitud completa e inmutabilidad. Emisión idempotente con render fuera de tx y verificación de origen; concurrencia converge en un archivo archivado, sin alterar folio/inventario/OT/cuenta. PDF de entrega/corrección interno en Carta, con snapshots de la guía y referencia del inverso. Los nombres auxiliares de bodega se capturan al emitir y quedan archivados; no se reconstruyen nombres pasados inexistentes. Cambiar mantenedores o registrar otra corrección no modifica bytes previos.

`AlmacenPdfGuia` usa `var/guias/pdfs/` o `GUIA_PDF_DIR`, excluido de git y a respaldar junto con PostgreSQL y logos históricos. Chromium instalado, `GUIA_CHROMIUM_PATH` opcional, HTML escapado y red/JS deshabilitados. Descarga por `/api/guias/pdfs/[emision]` con verificación de cabecera/tamaño/SHA-256, `nosniff` y sin caché; errores de archivo no regeneran documentos. Plantillas versionadas en `src/config/pdf-guias.ts`, sin purgar emisiones anteriores.

Pruebas `guias-documentos.integration.ts` en copia/almacén descartables: modos de línea, entrega/corrección, consulta/historial, archivo histórico, texto/paginación, UUID/concurrencia, snapshots/bytes adulterados y rollback/limpieza. Chromium valida consulta/móvil, foco/Escape, confirmación, PDF/descarga y accesos OT/OCC. Migración aplicada localmente tras respaldo en `backups/20261019_guias_g5/`; las 67 tablas de negocio previas conservan conteos/huellas. G6 y aprobación funcional final siguen pendientes.

Cierre técnico G5: lint/build y validación/generación Prisma correctos; 36 migraciones al día, sin diferencias de esquema. Copia PostgreSQL G5, almacén PDF y dumps temporales retirados; respaldo permanente conservado. Servidor temporal 3031 detenido y servidor previo 3030 intacto. Sin push.


## 2026-10-20: Guías G6 — validación técnica completa

Se completó la matriz de integración, concurrencia y recuperación en copias locales descartables, con rollback tras 11 etapas de escritura de entrega y 11 de corrección. Se repitieron las regresiones G4/G5 y la transición real desde guías legadas anteriores al contrato de OT, conservando sus campos sin inferir entregas, deuda ni PDF. Chromium valida móvil, foco, teclado, contraste y pérdida de respuesta posterior al commit de entrega/PDF/corrección con recuperación por el mismo UUID.

Se corrige la consulta/interfaz de OT para comparar reservas con el pendiente neto de abastecimientos y resultados fabricados, sin modificar el plan ni persistir saldos nuevos. El formulario de salida rechaza cantidades cero/negativas aunque otra línea sea válida; sólo omite campos vacíos. Los enlaces de guías usan el token informativo existente para mejorar contraste.

Sin cambios de esquema ni migraciones en G6. Lint/build correctos, Prisma válido, 36 migraciones al día y diff de esquema vacío. Copias/archivos descartables retirados y servidor propio detenido, puertos 3030/3031 libres. Evidencia ignorada por git en `backups/20261020_guias_g6/`. Se agrega [manual de operación y recuperación](OPERACION-GUIAS-DESPACHO.md); [G6](HITO-GUIAS-DESPACHO-ENTREGAS.md) queda técnicamente completo, con aprobación funcional final del usuario pendiente. Sin push.


## 2026-10-20: Aprobación funcional de Guías y mejoras posteriores

El usuario aprueba el resultado general («Quedó bien»); se registra cierre funcional G0–G6. Quedan pendientes un manual de usuario completo del ERP y mejoras de usabilidad para que las funcionalidades sean más fáciles de identificar y utilizar con distintos niveles de experiencia. Seguimiento en la sección 18 de [HITO-GUIAS-DESPACHO-ENTREGAS.md](HITO-GUIAS-DESPACHO-ENTREGAS.md). Se actualizan estado y referencias, sin atribuir pruebas individuales al usuario. Cambio sólo documental: contenido, enlaces y diff revisados; sin ejecutar build, servicios ni operaciones en la base.


## 2026-10-20: Revisión de pendientes para V1

Se contrasta código, rutas, esquema, pruebas disponibles y checkpoints de hitos en [CIERRE-VERSION-1.md](CIERRE-VERSION-1.md). El circuito comercial/productivo y despacho ya está implementado; los principales faltantes comprobados son autenticación/permisos, operación de Cobranza y consultas reales del Dashboard. Se propone cerrar además usabilidad/manual, revisiones funcionales y preparación de instalación/respaldo/restauración, con criterios de salida y funciones diferibles. Se distinguen checks históricos desactualizados de desarrollo realmente pendiente.

No se fija por defecto una matriz de roles, reglas de pagos ni nuevo alcance funcional. Revisión estática y documental, enlaces y diff comprobados; sin pruebas de aplicación nuevas, servicios, migraciones ni escrituras en la base.


## 2026-10-20: Preparación de Inicio de Sesión y Seguridad

Se agrega [HITO-INICIO-SESION-SEGURIDAD.md](HITO-INICIO-SESION-SEGURIDAD.md) por solicitud del usuario: descripción completa, propuestas de roles/matriz, acceso local y Google opcional, recuperación, usuarios, sesiones, autorización de páginas/acciones/archivos y auditoría/autoría. Plan S0–S7 con checks, criterios de avance y matriz técnica; D01–D10 requieren validación. Se consultan inicialmente roles, métodos y entorno. Fuentes oficiales de Google/OWASP y condición explícita de no habilitar servicios con gasto adicional sin resolverla.

Se enlaza desde Cierre V1 y AGENTS. Entrega sólo documental para revisión antes del desarrollo: sin instalar paquetes, cambiar esquema, tocar la base ni configurar proveedores. Contenido, enlaces locales y diff revisados.


## 2026-10-20: Primeras decisiones de acceso y roles

El usuario aprueba los seis roles propuestos y asignación múltiple por unión de permisos sin invalidaciones, correo/contraseña más Google opcional y uso por Internet con equipos personales. Se actualizan D01–D03, S0 y referencias del [hito de seguridad](HITO-INICIO-SESION-SEGURIDAD.md); capacidades sensibles y D04–D10 siguen pendientes. Se consultan alta, recuperación y sesiones. Sólo documentación; diff revisado, sin cambios de aplicación o base.


## 2026-10-20: Seguridad — decisiones D04–D06

Se registran respuestas del usuario en [Inicio de Sesión y Seguridad](HITO-INICIO-SESION-SEGURIDAD.md): sólo Administrador gestiona usuarios/roles, sin registro público; recuperación por correo cuando haya SMTP y asistencia del Administrador; inactividad 60 minutos y máximo absoluto 8 horas, manteniendo la propuesta de varias sesiones/cierre de las demás. Se consultan matriz/visibilidad, segundo factor y acciones excepcionales; auditoría/retención sigue pendiente. Sólo documentación, enlaces y diff revisados; sin código, paquetes, servicios ni base de datos.


## 2026-10-20: Seguridad — matriz, doble factor personal y correcciones

Se registran D07/D08/D10 del [hito de seguridad](HITO-INICIO-SESION-SEGURIDAD.md): matriz para toda la empresa, sin límite por bodega y visibilidad según tarea; TOTP voluntario para todos, exclusivamente activable/desactivable por el titular en su panel; correcciones/anulaciones por área y Administrador en todas, sin excepción para gestionar el factor de otra persona. Se detallan recorrido/checks/pruebas del panel y desafíos también con Google. Auditoría/retención D09 y recuperación personal de TOTP D08-R quedan consultadas, sin aprobación inferida. Sólo documentación; enlaces y diff revisados, sin implementación ni base de datos.


## 2026-10-20: Seguridad — decisiones funcionales resueltas

El usuario aprueba D09 y D08-R en [Inicio de Sesión y Seguridad](HITO-INICIO-SESION-SEGURIDAD.md): auditoría de accesos/cambios, autoría nueva, IP/navegador, consulta sólo Administrador y retención de eventos 12 meses conservando la autoría documental; códigos personales de respaldo para recuperar/reconfigurar TOTP tras perder el móvil, iguales para todos, incluidos Administradores. Se actualizan recorridos, checks y referencias; no hay desactivación administrativa del factor ajeno. Decisiones funcionales resueltas; falta revisión final/autorización para desarrollar. Sólo documentación, enlaces y diff comprobados; sin código, servicios ni base de datos.


## 2026-10-20: Seguridad S1 — diseño y estructura implementados

Autorizado S1 por el usuario. Se agregan [contrato técnico](SEGURIDAD-S1-DISENO.md), [inventario](SEGURIDAD-S1-INVENTARIO.md) y catálogo de permisos con unión de roles y titularidad del factor. Se instalan openid-client/jose/argon2/otplib (MIT) con lockfile. La migración `20261020201416_estructura_seguridad_s1` prepara 11 tablas para extensión de usuario, roles múltiples, Google, sesiones/desafíos/tokens, TOTP/códigos, límites, eventos y autoría. Conserva las tablas anteriores y no importa contraseñas heredadas; el seed deja de crear credenciales fijas.

Ensayo en copia descartable, 23 rechazos SQL, pruebas de política y bibliotecas correctos. Aplicación local tras respaldo `backups/20261020_seguridad_s1/`; 69 tablas previas conservan huellas/conteos, un usuario nuevo de seguridad pendiente y cero credenciales habilitadas. Lint/build/validate/generate correctos, 37 migraciones al día y diff de esquema vacío. Copia/dump temporal retirados; sin servidores iniciados, 3031 libre y 3030 ocupado por proceso conservado. Sin push. Checkpoint en sección 18 de [hito](HITO-INICIO-SESION-SEGURIDAD.md). S1 no habilita login ni protege rutas; S2–S7 siguen pendientes.


## 2026-10-20: Seguridad S2 — acceso local, usuarios y panel personal

Se implementan login/activación/recuperación, sesiones revocables 60 min/8 h y desafío TOTP separado; panel propio de contraseña/factor/códigos/sesiones y administración de usuarios con roles múltiples, invitaciones, baja/versionado y protección concurrente del último Administrador. Provisión/recuperación CLI local sin contraseña fija, con entrada sin eco; nunca elimina factor ajeno. Recuperación SMTP opcional TLS verificado y enlaces privados en fragmento. Se añaden nodemailer y sus tipos, API JSON con origen/tamaño/cookies seguros y cabeceras de protección para rutas nuevas. Registro automático SQL/errores crudos Prisma desactivado para proteger secretos del pool compartido.

Validaciones sólo en copia S2: ciclo, activación/códigos/desafíos concurrentes, recuperación sin bypass, revocación/versiones, último Administrador, rollback inducido, expiración y límites. Regresión de cuenta sin hash frente a comparación ficticia, recuperación local administrativa y correo en SMTP TLS local correctos. Chromium valida invitación/activación/roles, cookies/CSRF/tamaño y factor/respaldo/gestión propia en 320/375/768/1440 sin errores JS. Lint/build/TypeScript correctos; sin migraciones nuevas ni usuarios habilitados en base real.

Operación/configuración en [OPERACION-SEGURIDAD.md](OPERACION-SEGURIDAD.md), avances y checkpoint en sección 19 de [hito](HITO-INICIO-SESION-SEGURIDAD.md). No confundir con seguridad completa: Google S3, autorización de módulos anteriores S4, visor/depuración/autoría de negocio S5 y cierre S6/S7 siguen pendientes.


## 2026-10-20: Contraseña mínima 8 y diagnóstico de provisión

El usuario cambia el mínimo a 8 caracteres; se centraliza política 8–128 en `src/config/politica-contrasenas.ts` y se actualizan servidor, formularios, CLI y documentación. Se corrige el diagnóstico del comando: configuración antes de solicitar contraseña, imports diferidos y mensajes seguros por causa en lugar del error genérico.

Auditoría sin mostrar valores detecta ausencia de las tres variables de seguridad. El usuario confirma http://localhost:3030; se configura origen y generan claves locales privadas, sin sobrescribir claves existentes y con respaldo del entorno en `backups/20261020_seguridad_clave8/`. No se habilitan cuentas reales por esta operación. Pruebas de límites/diagnósticos, CLI interactivo sin eco y ciclo con 8 caracteres en copia descartable correctos; 7 se rechaza sin consumir tokens. Lint/build/tipos correctos, sin migraciones.


## 2026-10-20: Dashboard después de iniciar sesión

El ingreso local completo, con o sin segundo factor, redirige a `/` en lugar de `/mi-acceso`. El usuario accede voluntariamente a su panel desde menú/navegación. Se actualizan manual, checkpoint y expectativas del test UI existente; sin cambios de servicios, credenciales ni base de datos.

Lint/build correctos y navegación verificada en Chromium para contraseña y doble factor mediante respuestas simuladas, sin escribir cuentas. Cierre documental del 21-10-2026: puertos 3030/3031 libres y ningún servidor de validación pendiente.


## 2026-10-21: Seguridad S4 — autorización integral del ERP

Google S3 queda pospuesto por decisión del usuario. Se conectan sesión y unión de permisos a 24 páginas, 87 acciones con control de origen, 119 entradas de servicios/consultas y seis rutas de archivos. Las transacciones de escritura revalidan la credencial y comparten cerrojo con la revocación de seguridad; se preservan transacciones de dominio, versiones e idempotencia, sin migraciones. Menú/buscador/Dashboard y controles siguen permisos; los DTO operativos omiten datos financieros restringidos. Editar productos sin permiso de precios conserva el valor existente. Los archivos requieren autorización y dejan de tener caché pública; imágenes/logos comprueban referencias visibles. No se alteran bytes históricos.

Cobertura estática, integración en copia S4 y Chromium correctos: seis roles + unión, URL/acción directa, CSRF, pestaña revocada, expiración 60 min/8 h, revocación concurrente con commit, precio manipulado sin efecto y tres PDF históricos con huellas intactas. Regresión S1, lint/build correctos. Documentación/checkpoint en sección 22 del hito y operación actualizada. S5 (auditoría/autoría), S6 (regresión integral y entorno final) y S7 pendientes; sin cambios en cuentas/base de trabajo ni push.


## 2026-10-21: Seguridad S5 — auditoría y autoría duradera

Se integra autor de servidor en 61 puntos de escritura de los servicios, usando las tablas/triggers S1 sin migraciones. Autoría y hecho comparten transacción; los diarios conservan UUID/autor originales en reintentos. Se cubren documentos nuevos y derivados, inventario, maestros/configuración y PDF; no hay backfill ni cambios de PDF históricos. Los folios automáticos no se registran como edición manual de numeración.

Nuevo visor exclusivo de Administrador, con filtros/paginación, acceso desde menú/buscador y enlaces en Cotización/OCC/OT/Guía. Metadatos de seguridad normalizados, expiraciones únicas y denegaciones limitadas, sin secretos ni UA crudo. Retención de eventos a 12 meses, con reautenticación en UI o comando de servidor (simulación por defecto); conserva autoría y registra ejecución humana o Proceso del sistema. Programar la tarea diaria corresponde a S6.

Cobertura S5/S4, regresión S1, integración del ciclo con cuatro modos/devolución/PDF e invariantes, retención/CLI/rollback/reintento y Chromium correctos. Lint/build/tipos correctos tras corregir el literal BigInt de la prueba. Checkpoint completo en [SEGURIDAD-S5-CONTINUIDAD.md](SEGURIDAD-S5-CONTINUIDAD.md) y sección 23 del hito; operación actualizada. S3 pospuesto, S6/S7 pendientes. Sin push.


Limpieza S5 confirmada: copia/fixtures/PDF temporales retirados, servidor detenido y puertos 3030/3031 libres. Evidencias privadas en `backups/20261021_seguridad_s5/`, ignoradas por git; checkpoint S5 completo para continuar directamente con S6.

## 22-10-2026 — S6: validación y preparación operativa de seguridad

Se añade `seguridad:validar-s6`: respaldo privado de PostgreSQL/configuración y seis almacenes, copias independientes con credencial real, manifiestos/huellas, escenarios de primera configuración con esquema vacío y ensayo histórico de migraciones de guías. Los fixtures anteriores a OT/guías se adaptan al flujo vigente; las referencias de planificación sin stock tienen una prueba propia. No se deshabilitan triggers ni se modifica la base de trabajo.

Nuevo comando `seguridad:revocar-restauracion`, simulación por defecto: revoca sesiones, elimina enlaces/desafíos, incrementa revisiones y registra evento de sistema atómicamente. Conserva factores/códigos personales, contraseñas, roles y autoría. Procedimiento de mantenimiento/conciliación y plantillas de servicio, proxy y retención diaria en operación y `deploy/seguridad/`; no instaladas en un destino real.

Next/ESLint 16.3.8, Sharp 0.35.5 y Prisma 7.10.1, parches transitivos compatibles y shadcn sólo en desarrollo. `tsx` y `dotenv` se declaran de producción porque los comandos de mantenimiento programados los necesitan. Cliente regenerado sin migraciones S6. Auditoría de producción: cero avisos; queda `braces` en herramientas de desarrollo sin parche publicado (GHSA-vfj7-8cjw-p6xm), sin aceptar patrones de usuarios del ERP. No se oculta el aviso. Las fuentes de los parches incluyen los avisos oficiales de [Next.js](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j) y [Sharp](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w).

Cabeceras contra marcos de otros sitios en todo el ERP, manteniendo PDF del mismo origen y DENY en seguridad/administración. Se documenta la excepción ESLint para recargar el documento al cambiar de identidad y descartar el caché anterior. Compilación/lint/Prisma correctos; ensayo HTTPS local correcto. Regresión final 48/48 y repetición HTTPS tras normalizar el origen en mayúsculas correctas. Base/entorno/archivos intactos; copias/fixtures/servidores propios retirados. Resultado y pendientes exactos en [SEGURIDAD-S6-CONTINUIDAD.md](SEGURIDAD-S6-CONTINUIDAD.md). El usuario confirmó cierre S6 local y despliegue preparado, sin servidor todavía. S3 pospuesto; instalación HTTPS/timer reales diferidos y S7 pendiente, sin push.


## 23-10-2026 — S7: guía de revisión funcional para el usuario

Se prepara [GUIA-PRUEBAS-SEGURIDAD-S7.md](GUIA-PRUEBAS-SEGURIDAD-S7.md), contrastada con controles visibles y permisos actuales: ingreso al Dashboard, panel, alta/activación, contraseña y recuperación, seis roles/unión, revocación/baja/sesiones, factor personal, auditoría y usabilidad. Incluye resultados esperados, estados por bloque, incidencias, limpieza y aprobación expresa, sin marcar pruebas del usuario como realizadas.

Operaciones de negocio se reservan a una copia; correo real, tiempos prolongados y cuenta administrativa con factor quedan identificados como condicionados. Se distingue Cobranza pendiente de sus permisos disponibles y se conservan Google/despliegue diferidos. Se enlaza la guía desde el hito y la operación; se actualiza su cabecera de estado. Sólo documentación: sin servidores, cambios en base ni ejecución de build/lint.


## 23-10-2026 — S7: observaciones de activación, avisos y confirmación administrativa

Se registran S7-01/S7-02/S7-05 aprobados por el usuario. La activación y el restablecimiento de contraseña vuelven automáticamente al login con un aviso; no autentican al titular. Se incorpora el contenedor de avisos existente también al layout de acceso, y se notifican los resultados del panel y del mantenedor de usuarios sin exponer enlaces ni códigos en los avisos.

Usuarios permite reautenticar al Administrador en un diálogo local con contraseña y su segundo factor cuando corresponda. Una respuesta tipada `reauthRequired` abre ese diálogo al intentar una operación sin confirmación reciente. Se conservan datos y confirmación, sin reintentar ni guardar automáticamente. La ventana de cinco minutos, permisos, auditoría y validaciones transaccionales siguen aplicándose. S7-03/S7-06 corregidos pendientes de revisión funcional; S7 permanece abierto. Sin migraciones.

Validación técnica de estas correcciones: `pnpm lint`, `pnpm build`, `pnpm exec tsc --noEmit` y `pnpm seguridad:validar-s6 seguridad-acceso` correctos. Este último ejecuta regresiones de acceso/recuperación/correo TLS local y Chromium con activación/reset al login, avisos visibles, identidad vencida sin escritura, formulario conservado al cancelar, contraseña incorrecta, confirmación explícita posterior, reutilización y factor personal en el diálogo. No hubo errores JavaScript. Evidencia privada: `backups/20261023_seguridad_s6/1792804026138/`. Base y archivos de origen sin cambios; copia/fixtures/servidor 3031 retirados, servidor previo del usuario en 3030 conservado. No se repitió toda la regresión S6 de 48 escenarios ni se sustituye la aprobación funcional pendiente.


### 24-10-2026 — S7-07: aprobación y cierre de sesión visible

El usuario confirmó sesiones simultáneas del mismo usuario en dos navegadores y cierre remoto de la otra sesión: S7-07 aprobado. Se incorpora un botón permanente en la barra superior para cerrar la sesión actual desde cualquier sección del ERP: texto en escritorio, icono de salida con nombre accesible y título en pantallas pequeñas. Usa la operación de cierre existente, impide envíos repetidos mientras responde, notifica errores y recarga el documento hacia el login al confirmar. Mi acceso conserva su botón. Revisión de visibilidad por el usuario pendiente; S7 general sigue abierto.

Validación del ajuste: `pnpm lint`, `pnpm build` y revisión del diff correctos. No se iniciaron servidores ni se modificó la base de datos; revisión visual/funcional del botón por el usuario pendiente.


### 24-10-2026 — Aprobaciones funcionales S7

El usuario confirma S7-02/S7-03/S7-06/S7-07 y aprueba S7-09. Se consideran resueltas las observaciones de retorno al login, avisos visibles, diálogo administrativo y cierre visible de sesión. Con las aprobaciones anteriores, quedan aprobados S7-01/02/03/05/06/07/09. Pendientes S7-04/08/10/11/12 según la [guía](GUIA-PRUEBAS-SEGURIDAD-S7.md); S7 sigue abierto. Esta actualización sólo registra resultados del usuario: revisión de contenido, referencias y diff, sin ejecutar pruebas de aplicación, servidores ni operaciones en base.


## 24-10-2026 — Cobranzas C0/C1: plan y consultas

Se prepara `docs/HITO-COBRANZAS.md` con contratos existentes y decisiones C-D01–C-D04 aprobadas. El usuario autoriza avanzar sin cerrar las validaciones S7 restantes.

Se sustituye la pantalla provisional por listado y detalle de cuentas sobre la misma ruta. Consultas protegidas por `cobranza.leer` y `precios.leer`, con nueva comprobación dentro de la transacción RepeatableRead. Agregación de pagos vigentes por cuenta antes de unir documentos; filtros/paginación en PostgreSQL y totales decimales del filtro. Cuenta anulada excluida del cobro, estado de pago separado de vencimiento, hoy de Santiago y promesa independiente. Detalle con factura vigente e historial paginado de abonos incluidos los anulados; se conservan importe y fechas históricas. No se publican URLs heredadas arbitrarias de comprobantes.

No se agregan servicios de pagos ni migraciones en C1. El ejecutor de validación existente incorpora `cobranza-consultas`, con copia descartable y credencial real, comparación de datos/archivos originales y limpieza; no implica repetir o cerrar toda S6. C2–C4 y aprobación funcional C1 pendientes.

La validación visual de C1 detectó dos desbordamientos: el caption accesible de la tabla requería un contenedor relativo y la barra superior necesitaba compactar buscador/cierre en anchos intermedios. Se corrigen ambos manteniendo nombres accesibles y botones disponibles; las etiquetas completas vuelven cuando hay espacio. La cobertura estática S4 incorpora la nueva consulta autorizada: 120 entradas, sin reducir las comprobaciones existentes.

C1 cerrado técnicamente con lint/build/tipos, cobertura estática S4 (120 entradas), integración de consultas y Chromium 320/375/768/1440 correctos. Roles S4 también pasaron. Evidencia C1 final `backups/20261024_seguridad_s6/1792818441250/`; referencias exactas y pruebas visuales previas superadas en sección 7 del hito. C0/C1 marcados, aprobación funcional C1 pendiente, siguiente C2. Sin migraciones ni alteración de datos/archivos originales en los ensayos finales.


## 24-10-2026 — Cobranzas C2: pagos y anulaciones

C1 aprobado por el usuario. C2 implementa alta de abonos con UUID y comparación canónica del contenido original; el reintento conserva resultado tras anulación. La anulación conserva datos originales y usa identidad natural pago/motivo, sin tabla nueva ni migración. Bloqueo de cuenta, saldo Decimal y control de sobrepago atómicos; fechas según Santiago, anticipos sin factura y medios aprobados. Cheques sólo cobrados.

Acciones con origen/permisos y validación transaccional, formularios sobre el detalle con revisión y respuesta incierta protegida. Autoría Payment atómica de alta/anulación, sin atribución histórica. Coberturas estáticas ampliadas sin retirar controles: 90 acciones, 122 servicios/consultas y 63 puntos de autoría. Validación y continuidad exactas en sección 8 de HITO-COBRANZAS.md; C3 adjuntos/promesas y aprobación funcional C2 pendientes.

C2 validado: lint/build/tipos, coberturas S4/S5, integración C1/C2 con rollback después de insertar el abono, concurrencia, permisos y Chromium de registro/anulación correctos. Base y archivos originales intactos, servidor/copia retirados. Evidencia `backups/20261024_seguridad_s6/1792819206115/`; checklist C2 actualizado, aprobación funcional pendiente. Próximo C3.


## 24-10-2026 — Cobranzas C3: comprobantes privados y promesas

C2 aprobado; formatos/límites/conservación y política de promesas C-D06/C-D07 aprobadas. `PaymentAttachment` y `PaymentPromiseChange` incorporan archivos privados y cambios de promesa inmutables con índices/FK, CHECK y autoría transaccional; no se migran datos heredados ni cambian importes/vencimientos. Migración generada/revisada y ensayada en copia local antes del destino real.

Almacén local privado `COBRANZA_COMPROBANTE_DIR`, UUID, huella/tamaño y descarga autorizada sin caché ni contenido inline; subida idempotente y limpieza conservadora tras fallo. Registro con archivo confirma pago y luego adjunto, informa/reintenta sólo la subida si falla. Promesas con motivo, versión, UUID/huella e historial paginado, sin reescribir vencimiento. Detalles operativos/recorrido en sección 9 de HITO-COBRANZAS.md. Cierre técnico y evidencias se registran al terminar las comprobaciones.


C3 validado en copia con el escenario C1/C2/C3 y Chromium (1/1), lint/build/tipos/Prisma y coberturas S4/S5 correctos. Se corrigió el UUID compartido entre alta del pago y adjunto: cada operación conserva ahora su identidad, sin colisión de autoría. Comprobado el modo compatible sin tablas C3 para mantener C1/C2 disponibles.

Evidencia final `backups/20261024_seguridad_s6/1792857793317/`; base/almacenes de origen intactos, copias/archivos temporales/servidores retirados. La migración está probada pero **no aplicada a la base local de trabajo**: revisión automática rechazó esa escritura por la restricción interpretada de usar copias. Se requiere autorización explícita para habilitar C3 localmente. Checkpoint y pasos exactos en sección 9 de HITO-COBRANZAS.md. Aprobación funcional C3 y C4 pendientes.


## 24-10-2026 — C3 aplicado a PostgreSQL local con autorización

Tras autorización explícita del usuario se aplicó únicamente la migración C3 a `mtx_metal_erp`. Respaldo nuevo restaurado en copia y cotejado antes de migrar; comparación posterior de las 80 tablas anteriores idéntica, nuevas tablas vacías y 38 migraciones al día. No se ejecutó seed/reset ni se alteraron abonos o documentos. Copia retirada, respaldo/evidencia conservados en `backups/20261024_cobranza_c3/aplicacion_1792859912558/`. El bloqueo de aprobación anterior queda resuelto. Cliente regenerado y Prisma validado; C3 habilitado localmente, aprobación funcional pendiente.

Comprobaciones posteriores a la aplicación local: `pnpm prisma validate`, `pnpm prisma generate`, `pnpm prisma migrate status`, `pnpm lint` y `pnpm build` correctos. No se iniciaron servidores de aplicación ni se registraron pagos/comprobantes de prueba en la base local.


## 24-10-2026 — Cobranzas C4: integración y cierre técnico

Enlace reutilizable a la cuenta por OCC desde OCC/OT/guías, con permisos financieros y protección de navegación bloqueada. El parámetro `orden` resuelve una cuenta existente; no crea deudas ni usa totales de guías. Consulta `consultarResumenCobranza` agregada/protegida reutiliza el cálculo del listado sin implementar Dashboard. Se incorpora `OPERACION-COBRANZAS.md` con tareas, permisos y respaldo/recuperación.

Nuevo escenario `cobranza-cierre` en el ejecutor aislado: anticipo, producción/servicios, entregas, factura, cobro final, anulación/corrección, devolución/reentrega, deuda única, conciliación física, obra propia y enlaces/permisos en Chromium. C1/C2/C3 y C4 correctos 2/2; lint/build/tipos/coberturas correctos (125 entradas). Sin cambios de esquema ni datos de prueba en origen; evidencia `backups/20261024_seguridad_s6/1792860383179/`, copias/servidores retirados. C3/C4 funcionales pendientes y hito sin cierre expreso; sección 10 del hito es el checkpoint vigente.


## 24-10-2026 — Dashboard: datos reales y avisos

D-D01–D-D07 aprobadas por el usuario. Se crea HITO-DASHBOARD.md y OPERACION-DASHBOARD.md. Inicio conecta indicadores, OT, cotizaciones próximas a vencer, consumo pendiente por material/bodega con reservas, movimientos de materia prima/terminado y comparación mensual cotizado/contratado de cohortes. Usa el resumen de cuentas existente, sin deuda por guía, y cantidades/importes Decimal; gráfico con tabla accesible y sin nuevas dependencias.

Consultas por bloque, con permisos de servidor/transacción y DTO sin áreas no autorizadas; errores distinguibles de cero. Campana interna por permisos sin correo ni estado de lectura, consultada desde layout. Sin cambios de esquema, seed o escrituras de consulta. Nuevo escenario dashboard en ejecutor aislado con fixtures y Chromium de seis roles; detalle y evidencia en sección 6 del hito. Cobertura estática: 127 entradas de servicio/consulta; aceptación funcional y escala representativa pendientes.

Cierre técnico Dashboard D0–D4: escenario propio correcto 1/1 (`backups/20261024_seguridad_s6/1792878086286/`) y regresión S4 por el layout compartido correcta 1/1 (`backups/20261024_seguridad_s6/1792878144191/`). Lint/build/tipos y cobertura correctos. Datos/almacenes originales intactos, copias/servidores retirados. D5 funcional y medición de volumen real pendientes; no se cierran C3/C4/S7 por inferencia.


## 24-10-2026 — Manual transversal y primera revisión de usabilidad

Se entrega primera edición textual MANUAL-USUARIO.md (18 capítulos), HITO-MANUAL-USABILIDAD.md y REVISION-USABILIDAD-V1.md con doce hallazgos priorizados y estados. README deja de ser genérico: acceso al manual, desarrollo en 3030, fuentes operativas y límites actuales. Guías OT/Guías corrigen afirmaciones desactualizadas sobre ausencia de login/roles y apuntan al manual vigente.

Usabilidad: Crear trabajo desde OCC exige trabajos.operar; Ver trabajo existente exige trabajos.leer, sin quedar ligado a editar OCC. Preparar otra entrega exige guias.operar. No se amplían permisos de servidor ni se cambian reglas de negocio.

Lint/build y cobertura S4 correctos; cobranza-cierre ampliado con roles de creación/lectura/despacho correcto 1/1, evidencia `backups/20261024_seguridad_s6/1792883623974/`. 65 enlaces/anclas locales correctos; datos/almacenes originales intactos y ensayo retirado. Capturas anonimizadas, ayuda dentro del ERP y revisión con usuarios siguen pendientes. No se cierran C3/C4, Dashboard ni S7 por esta entrega.


## 26-10-2026 — Origen de seguridad en túneles de desarrollo

Se centraliza la comprobación de origen en `src/lib/seguridad/origen.ts`, usada por `/api/seguridad` y las guardas de Server Actions. Compatibilidad acotada a Dev Tunnels en desarrollo: origen reescrito localhost:3030, navegador same-origin y host público exacto. Producción conserva comparación canónica; no se amplían permisos ni se modifica la BD. Prueba específica de aceptación/rechazo en `tests/seguridad-origen-tunel.ts`; operación y límites documentados en OPERACION-SEGURIDAD.md. Confirmación funcional del túnel pendiente del usuario.

Validación: prueba específica de origen, cobertura S4 (92 acciones, 25 páginas, 7 rutas de archivos y 127 entradas de servicios/consultas), `pnpm lint` y `pnpm build` correctos. Sin iniciar servidores de validación ni ejecutar escrituras en la base.


## 26-10-2026 — Crear materias primas durante el registro de compras

FormularioMaterial se comparte entre mantenedor y diálogo de alta desde cada detalle de Compra. Se reutiliza guardarDatosMaterial (origen, permiso catalogos.operar y servicio transaccional con autoría/validación existentes). El editor conserva la compra y añade el material al selector local con selección en la línea de origen; crear material es independiente de guardar/recibir la compra. El catálogo de Compras incluye unidades existentes y la acción de guardar materiales revalida también /compras. Sin migraciones ni modificaciones de reglas de stock. Manual y checklist de Compras actualizados; revisión funcional pendiente.

Validación: lint/cobertura S4 correctos y compilación inicial correcta; repetición final bloqueada por permisos internos de Turbopack y fallo de --showConfig en la alternativa Webpack. Véase HITO-COMPRAS.md.

Comprobación final independiente `pnpm exec tsc --noEmit`: correcta.


## 26-10-2026 — Altas internas de Proveedores y Clientes

Se comparten FormularioProveedor y FormularioCliente en diálogos de alta desde Compras y Cotizaciones, respectivamente. Se reutilizan acciones/servicios existentes con sus permisos, origen y autoría. Catálogos locales incorporan inmediatamente proveedor o cliente/sucursales devueltos por el servidor y seleccionan el registro nuevo (Casa Central en Cotizaciones), conservando borrador. El alta es independiente del documento: cancelar la compra/cotización no elimina el catálogo creado. Se revalidan /compras y /ventas/cotizaciones tras guardar sus mantenedores. No cambia esquema, permisos ni reglas monetarias. Revisión funcional pendiente.

Validación de las altas internas: `pnpm lint`, `pnpm exec tsc --noEmit`, cobertura S4 (92 acciones, 25 páginas, 7 rutas y 127 entradas) y revisión de diff correctos. `pnpm build` ejecutado y bloqueado por Turbopack al abrir puerto interno (Operation not permitted). No se iniciaron servidores de validación ni se escribieron fixtures en la BD. Prueba funcional de navegador pendiente.


## 26-10-2026 — Cotizaciones netas e IVA sobre neto

Por confirmación explícita del usuario se cambia la base de ingreso: precios unitarios netos, descuento sobre subtotal neto, IVA sobre neto descontado y total como suma. Se añaden `Quote.pricesIncludeVat` y `SalesOrder.pricesIncludeVat` con default true para conservar historia. El servicio crea cotizaciones nuevas/correcciones con false; pendientes previas mantienen modo original. La OCC hereda modo/IVA y mantiene deuda con IVA. La función pura conserva compatibilidad con entradas históricas sin marca. No hay recálculo de importes previos ni cambios de saldo, stock o PDF archivados.

Migración aditiva transaccional `20261026120000_cotizaciones_precios_netos`: amplía CHECK de Quote/SalesOrder conservando reglas existentes y añade triggers que protegen modalidad/coherencia con origen. Se probó y restauró en copia antes de aplicarla localmente con respaldo; 73 tablas de negocio/usuarios verificadas sin alterar valores anteriores. Actividad concurrente en SecuritySession fue excluida explícitamente de la afirmación de invariancia.

DTOs y formulario distinguen histórico/neto; correcciones antiguas proponen conversión explícita con revisión por redondeo. Plantilla PDF v2 y reconocimiento de reintentos v1 sin sustituir archivos existentes. Precio sugerido de Producto sigue con IVA y no se inserta como neto. Nuevas pruebas puras/BD y expectativas de regresiones ajustadas. Evidencia privada y revisión funcional pendiente en HITO-COTIZACIONES.md.

Cierre de verificación: `prisma validate`, `prisma generate`, lint, tipos y cobertura S4 correctos; 39 migraciones locales al día. Pasan pruebas puras históricas/netas, integración nueva con correcciones e idempotencia, regresiones completas de Cotizaciones, OCC y emisión real de PDF Carta con imágenes/versiones/concurrencia. No se iniciaron servidores de aplicación para validar; pruebas de PDF cerraron su navegador. `pnpm build` se ejecutó pero Turbopack quedó bloqueado por el entorno al abrir un puerto interno (Operation not permitted), por lo que no se declara una compilación final exitosa. Se retiran las copias descartables y se conservan respaldo/evidencia privados. Reiniciar desarrollo y recargar el formulario antes de probar.


## 27-10-2026 — Compras: grilla con editor de detalles

La captura de detalles se separa del borrador de cabecera mediante diálogo; la grilla muestra cantidades, equivalencias, precios e importes, y acciones Ver/Editar/Quitar. Cambios de fila se aceptan explícitamente; cancelar conserva el borrador de compra y quitar requiere confirmación. Se mantiene alta de materia prima anidada, permisos y restricciones de precio/recepción/cierre. Se añade calcularDetalleCompra como Server Action protegida de previsualización, reutilizando el cálculo Decimal existente (calcularCompra recibe sólo las líneas que realmente utiliza). No hay cambios de modelo, migración ni escritura adicional en documentos/stock. Cobertura S4 pasa de 92 a 93 acciones; manual y checklist actualizados. Revisión funcional pendiente.
