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
