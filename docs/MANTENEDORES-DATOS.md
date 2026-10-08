# Mantenedores de datos: plan y avances

Referencia: esquema actual de Prisma y [guía de interfaz](GUIA-INTERFAZ.md). Fecha de inicio: 06-10-2026.

## Orden de desarrollo

Se termina y valida un mantenedor antes de avanzar al siguiente. Dentro de cada módulo se comienza por consultar y listar los datos existentes; después se incorporan las operaciones del formulario y la eliminación.

1. **Unidades de medida (`UnitMeasure`)** — nombre único y abreviatura. Es el catálogo más pequeño y la dependencia de Materias primas. Ruta: `/mantenedores/unidades`.
2. **Bodegas (`Warehouse`)** — nombre y ubicación opcional. Sus relaciones con stock, movimientos, compras y consumos requieren controlar la eliminación. Ruta: `/mantenedores/bodegas`.
3. **Proveedores (`Supplier`)** — RUT único, nombre y datos opcionales de contacto. Requiere validación de RUT/correo y conservar los proveedores usados en compras. Ruta: `/mantenedores/proveedores`.
4. **Clientes (`Client`)** — RUT único, nombre y datos opcionales de contacto. Comparte complejidad con Proveedores; aprovecha sus validaciones y controla las referencias de cotizaciones. Ruta: `/mantenedores/clientes`.
5. **Materias primas (`RawMaterial`)** — código único, nombre, descripción opcional y unidad obligatoria. Depende del catálogo de unidades y tiene relaciones con inventario y documentos. Ruta: `/mantenedores/materiales`.

6. **Tipos de documentos de compra** — catálogo fijo cargado: Factura de Compra, Boleta de Compra y Guía de Compra. Por decisión del usuario no tendrá CRUD de momento. Plan en [HITO-COMPRAS.md](HITO-COMPRAS.md).

El stock mínimo pertenece al material **por bodega** (`WarehouseStock.minStock`); su configuración corresponde a Inventario y no se añadirá como un campo de `RawMaterial`.

## Patrón común de interfaz

- [x] Registrar el orden de desarrollo y los requisitos del usuario.
- [x] Tabla reutilizable con filtro superior, orden y paginación.
- [x] Botón **Crear** en la cabecera y acciones **Ver**, **Editar** y **Eliminar** por registro.
- [x] Formulario dentro de un diálogo o panel sobre el listado, conservando la ruta, filtro y página al abrir/cerrar.
- [x] Títulos específicos: «Crear …», «Ver …» y «Editar …»; modo Ver con controles de solo lectura.
- [x] Componente reutilizable de confirmación con **Cancelar** y **Eliminar**, nombre del registro y foco accesible.
- [x] Componente reutilizable para mensajes de éxito, error y aviso del sistema.
- [x] Evitar `window.alert`, `window.confirm` y `window.prompt` en todas las pantallas.
- [x] Validaciones compartidas entre formulario y servidor, campos obligatorios y errores junto al control.
- [x] Estados de carga, tabla vacía, filtro sin resultados y error de consulta.
- [x] Desactivar acciones durante el guardado/eliminación y actualizar el listado tras una operación exitosa.
- [x] Rechazar eliminaciones de registros relacionados con un mensaje comprensible; no borrar sus dependencias en cascada.
- [x] Validar escritorio, móvil y teclado, respetando la paleta y estructura existente.

- [x] Registrar el requisito de búsqueda interna en todos los selectores dependientes.
- [x] Implementar y validar `SelectorBuscable`: primer uso en Unidad de Materias primas, con filtro interno por nombre/abreviatura, búsqueda sin acentos, teclado y estados vacíos. Reutilizarlo en los futuros selectores dependientes. Bodegas, Proveedores y Clientes no tienen dependencias de selección.

## Checklist por mantenedor

| Mantenedor | Listado y filtro | Ver | Crear | Editar | Eliminar y confirmar | Validación final |
| --- | --- | --- | --- | --- | --- | --- |
| Unidades de medida | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Bodegas | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Proveedores | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Clientes | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Materias primas | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### 1. Unidades de medida

- [x] Consulta real, listado y filtro por nombre/abreviatura.
- [x] Ver registro en formulario de solo lectura.
- [x] Crear con validación de nombre único y abreviatura obligatoria.
- [x] Editar con validación y actualización del listado.
- [x] Eliminar con confirmación y bloqueo cuando haya materiales asociados.
- [x] Validar funcionamiento, errores, cancelación y componentes reutilizables.

### 2. Bodegas

- [x] Consulta real, listado y filtro por nombre/ubicación.
- [x] Ver registro.
- [x] Crear registro.
- [x] Editar registro.
- [x] Eliminar con confirmación y control de relaciones existentes.
- [x] Validar CRUD completo.

### 3. Proveedores

- [x] Consulta real, listado y filtro por nombre/RUT.
- [x] Ver registro.
- [x] Crear con normalización y validación de RUT y correo opcional.
- [x] Editar conservando unicidad de RUT.
- [x] Eliminar con confirmación y bloqueo si tiene compras.
- [x] Validar CRUD completo.

### 4. Clientes

- [x] Consulta real, listado y filtro por nombre/RUT.
- [x] Ver registro.
- [x] Crear con normalización y validación de RUT y correo opcional.
- [x] Editar conservando unicidad de RUT.
- [x] Eliminar con confirmación y bloqueo si tiene cotizaciones.
- [x] Validar CRUD completo.

### 5. Materias primas

- [x] Consulta real, listado y filtro por código/nombre/unidad.
- [x] Ver registro y unidad.
- [x] Crear con código único y selección de unidad existente.
- [x] Editar: permitir cambiar la unidad únicamente sin stock, movimientos, compras, trabajos ni cotizaciones (regla confirmada por el usuario).
- [x] Eliminar con confirmación y bloqueo si tiene existencias o referencias en movimientos/documentos.
- [x] Validar CRUD completo.

## Datos maestros fuera de esta primera serie

- **Empresa (`CompanyProfile`)**: perfil único en `/configuracion/empresa`; requiere un formulario de configuración, no un CRUD de varias empresas. Su edición se aborda por separado.
- **Roles (`Role`) y Usuarios (`User`)**: mantenedores administrativos previstos para la fase de autenticación. Usuarios depende de Roles, contraseñas seguras y autorización. No se incluyen todavía en el menú ni en esta primera serie.

Compras, cotizaciones, órdenes, despachos, cuentas por cobrar, pagos, stock y kardex son procesos o registros del dominio, no mantenedores básicos de esta etapa.

## Primera entrega: Unidades de medida

El usuario confirmó el CRUD completo. Implementado y validado en `/mantenedores/unidades`, con los seis registros existentes como base de revisión en una copia temporal de PostgreSQL.

- El formulario limpia espacios y exige nombre de hasta 100 caracteres y abreviatura de hasta 20. La unicidad del nombre mantiene la regla exacta de PostgreSQL (sensible a mayúsculas); no se cambió el esquema.
- Ver y Editar consultan el registro actualizado antes de abrir. Ver es de solo lectura. Las fechas se muestran en `es-CL`, zona `America/Santiago`.
- Guardar y Eliminar comprueban `updatedAt` para detectar un registro cambiado desde su consulta. La FK impide eliminar unidades con materiales, también ante asociaciones concurrentes.
- La tabla conserva filtro, orden y página al abrir/cerrar formularios y actualizar datos; al borrar la última fila de una página muestra la página válida más cercana.
- Filtro y paginación son locales para este catálogo pequeño; el servidor obtiene los registros y el conteo de materiales asociados, sin cargar los materiales completos. Revisar paginación en servidor al abordar catálogos grandes.
- `DataTable`, `ConfirmarEliminacion`, `Aviso` y `Notificaciones` son reutilizables. Los avisos de éxito/error usan Sonner; las confirmaciones usan Radix AlertDialog. No se usan diálogos nativos.
- Pasaron `pnpm lint`, `pnpm build`, pruebas de integración contra PostgreSQL temporal y el ciclo completo en Chromium (escritorio y móvil). Se comprobaron duplicados, campos obligatorios, cancelación, edición concurrente, eliminación protegida, búsqueda sin coincidencias y tabla vacía.
- Prueba de integración versionada: `tests/unidades-medida.integration.ts`. Requiere `DATABASE_URL` de una copia temporal cuyo nombre empiece por `mtx_validacion_`; ejecutar con `pnpm exec tsx tests/unidades-medida.integration.ts`. No carga `.env` automáticamente ni admite la base habitual.
- El servidor de validación utiliza 3031 y se detiene al terminar. El servidor previo del usuario en 3030 se conserva.

Unidades de medida está completo; Bodegas se detalla en la segunda entrega. Autenticación y autorización siguen pendientes de su fase; este módulo todavía no incorpora protección por usuario/rol.

## Segunda entrega: Bodegas

Implementado y validado el CRUD completo en `/mantenedores/bodegas`.

- Nombre obligatorio (hasta 100 caracteres) y ubicación opcional (hasta 200). Se limpian espacios y la ubicación vacía se guarda como `null`.
- Se mantiene el esquema actual: `Warehouse.name` no es único; no se añadió una restricción ni se cambiaron las migraciones.
- Tabla con filtro por nombre/ubicación, orden, paginación y las acciones Crear, Ver, Editar y Eliminar. Los formularios se muestran sobre el listado, con modo Ver de solo lectura.
- Ver y Editar consultan los datos actuales. El formulario muestra los conteos de registros de stock, movimientos, líneas de compra y líneas de trabajo, sin cargar los documentos completos.
- Guardar y Eliminar verifican `updatedAt`. Las cuatro FK bloquean la eliminación de una bodega relacionada, incluso si el stock tiene saldo cero; no se eliminan sus referencias en cascada.
- Se reutilizan `DataTable`, `ConfirmarEliminacion`, `Aviso` y `Notificaciones`. Los botones conservan el cursor pointer global y los estados de operación pendiente.
- Bodegas no necesita selectores dependientes: tiene sólo nombre y ubicación. La búsqueda interna de esos selectores queda registrada como requisito para los módulos que sí los utilicen.
- Pasaron `pnpm lint`, `pnpm build` y `tests/bodegas.integration.ts` contra una copia temporal de PostgreSQL. Se probaron por separado las cuatro relaciones, datos inválidos, ubicación opcional, nombres repetidos permitidos y versiones obsoletas.
- Chromium verificó el ciclo CRUD, consulta, cancelación, búsqueda por ubicación sin acentos, tabla vacía, orden, paginación, ajuste de página al eliminar su última fila, confirmación y móvil, sin diálogos nativos ni errores de consola/JavaScript/hidratación.
- Los datos originales de Bodegas y sus cuatro tablas relacionadas conservaron sus conteos y huellas. Las pruebas se hicieron sobre una copia restaurada del dump; el servidor temporal en 3031 se detuvo y liberó el puerto, y se retiró esa base. Se preservó el servidor del usuario en 3030.
- Respaldos, capturas y resultados: `backups/20261006_173602_crud_bodegas`, excluido de git. No se modificaron Prisma, seed ni dependencias.

La prueba versionada exige `DATABASE_URL` de una copia temporal `mtx_validacion_*`. Ejecutar `pnpm exec tsx tests/bodegas.integration.ts` con esa variable ya configurada; no carga `.env` automáticamente ni admite la base habitual.

Bodegas está completo; Proveedores se detalla en la tercera entrega. Autenticación y autorización continúan pendientes de su fase.

## Tercera entrega: Proveedores

Implementado y validado el CRUD completo en `/mantenedores/proveedores`.

- Tabla con filtro de nombre, RUT (con puntos, con guion o compacto), correo y teléfono; orden, paginación y acciones Crear, Ver, Editar y Eliminar.
- Formulario modal sobre el listado: RUT y nombre obligatorios, correo y teléfono opcionales. Ver es de solo lectura y no guarda al presionar Enter; se conservan ruta, filtro y página al cerrar.
- RUT validado con módulo 11, incluyendo DV `K` y `0`; guardado sin puntos, con guion y DV mayúsculo, y mostrado con puntos. Las funciones de `src/lib/validaciones/rut.ts` quedan disponibles para Clientes y Empresa. La validación comprueba formato y dígito, no existencia en el SII.
- Nombre de hasta 150 caracteres, correo de hasta 254 con formato válido, teléfono de hasta 40. Se limpian espacios exteriores y contactos vacíos se guardan como `null`. El teléfono admite prefijos y separadores sin imponer un país.
- Unicidad de RUT: se comprueban equivalencias con formatos heredados sin modificar registros existentes automáticamente. El índice único protege las creaciones simultáneas del formato canónico. Para el catálogo actual se consulta sólo id/RUT al comprobar equivalencias; evaluar un índice normalizado y paginación en servidor cuando crezca.
- Ver y Editar consultan el registro actual; se muestran conteo de compras y fechas. Editar/Eliminar verifican `updatedAt`. La FK bloquea el borrado con compras, incluidas asociaciones posteriores a abrir la confirmación.
- Se reutilizan tabla, notificaciones, avisos y confirmación; los botones conservan cursor pointer. No se requieren selectores dependientes. El requisito de filtro interno sigue pendiente para Materias primas y otros módulos con selecciones relacionadas.
- Pasaron `pnpm lint`, `pnpm build` y `tests/proveedores.integration.ts` contra la copia temporal de PostgreSQL. Se probaron validación, duplicados equivalentes/heredados, creación concurrente, opcionales, conflictos de versión y protección de compras.
- Chromium verificó el CRUD completo, cancelación/Escape, foco accesible, búsquedas, orden, paginación conservada y ajuste tras borrar la última fila, escritorio y móvil; sin diálogos nativos ni errores de consola/JavaScript. Capturas revisadas visualmente.
- Las huellas y conteos de proveedores/compras/detalles originales se mantuvieron idénticos. La copia temporal fue retirada y el servidor de pruebas liberó 3031; el servidor previo del usuario en 3030 se conservó.
- Respaldos de originales, dump, pruebas, capturas y resultados: `backups/20261006_182209_crud_proveedores`, excluido de git. No se cambiaron esquema, migraciones, seed ni dependencias.

Ejecutar la integración con `pnpm exec tsx tests/proveedores.integration.ts` y `DATABASE_URL` ya configurada para una copia `mtx_validacion_*`. La prueba no carga `.env` ni admite la base habitual.

Proveedores está completo; Clientes se detalla en la cuarta entrega. Autenticación y autorización continúan pendientes de su fase.

## Cuarta entrega: Clientes

Implementado y validado el CRUD completo en `/mantenedores/clientes`.

- Tabla de datos reales con filtro por nombre, RUT (con puntos/guion o compacto), persona de contacto, correo y teléfono; orden, paginación y acciones Crear, Ver, Editar y Eliminar.
- Formularios modales sobre el listado, con títulos específicos y modo Ver de solo lectura, incluido Enter. Se conservan ruta, filtro y página, con foco accesible al cerrar.
- RUT obligatorio y único: se reutiliza `rutSchema` para validar el dígito verificador tanto en formulario como en servidor. Se guarda sin puntos, con guion y DV mayúsculo; se muestra con puntos. Se rechazan equivalencias con formatos heredados sin modificar los registros existentes automáticamente. El índice único resuelve las nuevas creaciones concurrentes canónicas.
- Nombre obligatorio hasta 150 caracteres. Persona de contacto opcional hasta 150, correo hasta 254 con formato válido y teléfono hasta 40; espacios exteriores eliminados y opcionales vacíos guardados como `null`.
- Ver y Editar consultan el registro actual. Se muestran conteo de cotizaciones y fechas; Editar/Eliminar verifican `updatedAt`. La FK bloquea el borrado de clientes con cotizaciones, incluidas asociaciones posteriores a abrir la confirmación.
- Se reutilizan `DataTable`, `ConfirmarEliminacion`, `Aviso` y Notificaciones, manteniendo cursor pointer y controles deshabilitados durante operaciones. Clientes no requiere selectores dependientes; Persona de contacto es texto propio del cliente.
- Pasaron `pnpm lint`, `pnpm build` y `tests/clientes.integration.ts` en la copia temporal de PostgreSQL: validación de RUT/correo, límites, contacto, opcionales, duplicados heredados/equivalentes/concurrentes, conflictos de versión y protección de cotizaciones.
- Chromium verificó el CRUD completo, búsquedas sin acentos y en tres formatos de RUT, contacto/correo/teléfono, cancelación/Escape, foco, orden, paginación, ajuste al borrar su última fila, cursor y móvil. Sin diálogos nativos ni errores de consola/JavaScript; capturas revisadas visualmente.
- Conteos y huellas de `Client`, `Quote`, `QuoteDetail` y `SalesOrder` originales permanecieron idénticos. La base temporal fue retirada, el servidor de validación liberó 3031 y el servidor previo del usuario en 3030 se conservó.
- Originales, dump, pruebas, capturas y resultados en `backups/20261006_183227_crud_clientes`, excluido de git. No se cambiaron Prisma, migraciones, seed, dependencias ni la guía visual.

Ejecutar `pnpm exec tsx tests/clientes.integration.ts` con `DATABASE_URL` ya configurada para una copia temporal `mtx_validacion_*`; no carga `.env` ni admite la base habitual. La búsqueda/paginación y la comprobación de equivalencias de RUT conservan el enfoque de Proveedores para el catálogo actual; evaluar su escala al crecer los datos.

Clientes está completo; Materias primas se detalla en la quinta entrega. Autenticación y autorización continúan pendientes de su fase.

## Quinta entrega: Materias primas

Implementado y validado el CRUD completo en `/mantenedores/materiales`. La primera serie de cinco mantenedores queda completada.

- Listado real con filtro por código, nombre, unidad o abreviatura, orden, paginación y acciones Crear, Ver, Editar y Eliminar. Formularios sobre el listado, con consulta de solo lectura (incluido Enter), títulos específicos y descripción opcional.
- Código obligatorio/único hasta 50 caracteres (unicidad exacta existente de PostgreSQL), nombre obligatorio hasta 150 y descripción hasta 2000. Espacios exteriores eliminados y descripción vacía como `null`. La Unidad es obligatoria y debe existir; sin unidades disponibles se muestra un aviso y se impide guardar.
- `src/components/formularios/selector-buscable.tsx` reutiliza Popover/Command existentes: filtro interno por nombre o abreviatura, sin distinción de acentos/mayúsculas, navegación con flechas/Enter, Escape y mensajes sin coincidencias/opciones. Validado con 207 unidades en la copia temporal y en móvil. No se incorporaron dependencias.
- **Decisión confirmada por el usuario:** cambiar Unidad sólo cuando no existan registros de stock (incluso cero), movimientos, líneas de compra, trabajo ni cotización. El formulario conserva la unidad en modo de solo lectura si hay referencias; otros campos se pueden editar. El servidor vuelve a verificar las referencias al guardar, también si se agregaron después de abrir el formulario.
- Editar y Eliminar verifican `updatedAt`. Se bloquea la fila con SQL parametrizado `FOR UPDATE` antes de leer referencias y escribir dentro de la misma transacción. La eliminación rechaza las cinco relaciones. `QuoteDetail.rawMaterialId` es opcional y la FK permite desvincularlo: la comprobación explícita evita perder ese vínculo histórico al borrar.
- Se muestran cinco conteos y fechas de registro/actualización, sin cargar los documentos completos. Stock mínimo permanece en Inventario, no en este formulario.
- Pasaron `pnpm lint`, `pnpm build` y `tests/materiales.integration.ts`, probando CRUD, duplicados, unidad inexistente, límites, opcionales, conflictos, cada relación por separado, cambio de unidad libre/protegido y conservación de cotizaciones.
- Chromium comprobó el ciclo CRUD, errores/cancelación, consulta, filtro, selector/búsqueda/teclado, referencia posterior a abrir Editar, otros campos editables con unidad bloqueada, borrado protegido, orden/paginación conservada y ajuste de página, cursor y móvil, y ausencia de unidades. Sin diálogos nativos ni errores de JavaScript/consola.
- Conteos y huellas de materiales, unidades y sus cinco tablas relacionadas originales: idénticos. Respaldos, dump, scripts, resultados y capturas en `backups/20261006_183628_crud_materiales` (excluido de git). No se modificaron Prisma, migraciones, seed, dependencias ni la guía visual.

La integración requiere `DATABASE_URL` ya configurada para una copia temporal `mtx_validacion_*`: `pnpm exec tsx tests/materiales.integration.ts`. No carga `.env` ni admite la base habitual. Filtro/paginación son locales; revisar paginación de servidor al crecer el catálogo. Los futuros procesos que lean cantidades/unidad deben coordinar sus escrituras transaccionales con el material para mantener la coherencia.

La base temporal fue retirada y el servidor de validación liberó 3031; se conservó el servidor previo del usuario en 3030. Empresa, autenticación y los procesos continúan pendientes fuera de esta primera serie.

## Próximo hito planificado

- [x] Confirmación del usuario de que la primera serie de mantenedores funciona correctamente.
- [x] Preparar [Configuración de Empresa por etapas](HITO-EMPRESA.md) como siguiente hito recomendado.
- [x] Desarrollar y validar localmente Configuración de Empresa, con carga local de logo y protección concurrente; seguimiento en [HITO-EMPRESA.md](HITO-EMPRESA.md).
- [ ] Completar comprobación del túnel y revisión funcional del usuario antes de avanzar al siguiente proceso.

## Reglas de cierre y seguimiento

Respaldar archivos existentes antes de modificarlos. Registrar las entregas en [CAMBIOS.md](CAMBIOS.md) y actualizar este checklist. Detener los servidores iniciados para validar y comprobar que liberen su puerto; preservar los servidores previos del usuario.

## Continuación: inventario y Compras

- [x] Consultas de Stock por bodega y Kardex, con selectores buscables y paginación/orden de servidor.
- [x] Preparar [Compras por etapas](HITO-COMPRAS.md), conservando los pendientes de cierre de Empresa.
- [x] Recibir y documentar reglas principales de recepción parcial, valor por presentación, documento, bodega, anulación, redondeo y cierre de pendientes.
- [x] Resolver precisiones y validar estructura/migración de Compras; detalles en [HITO-COMPRAS.md](HITO-COMPRAS.md).
- [ ] Implementar operaciones de compra, recepción, cierre y anulación según el hito.
- [x] Cargar tres tipos documentales fijos; CRUD descartado para esta entrega por decisión del usuario.
- [ ] Revisión funcional del usuario de las consultas.

Estas pantallas consultan operaciones/existencias y no son CRUD de catálogos. No se ofrecen Crear/Editar/Eliminar movimientos históricos.


## 08-10-2026 — dependencia comercial: Condiciones de Pago

- [x] Estructura PaymentCondition, migración, cliente generado y bases Al día/30/60/90 días.
- [x] CRUD completo en `/mantenedores/condiciones-pago`, tabla con búsqueda, orden/paginación y formularios sobre listado.
- [x] Confirmación/descarte/ayudas reutilizables, control de versión y referencias protegidas.
- [x] Validación en copia, lint/TypeScript/build y navegador escritorio/móvil.
- [ ] Aprobación funcional del usuario.
- [ ] Integrar condición y plazo histórico en Cotizaciones/Orden de Compra Cliente; calcular vencimiento al finalizar trabajo con factura.

No hay relación obligatoria entre condición y abonos. Ver [Hito de Cotizaciones](HITO-COTIZACIONES.md) para dependencias, reglas y evidencias.


## 08-10-2026 — ampliación de Clientes: Sucursales

- [x] ClientBranch y migración conservadora de Casa Central; datos/contactos históricos copiados sin inventar direcciones.
- [x] Casa Central obligatoria y otras sucursales dentro de Crear/Editar y acción del listado.
- [x] Dirección y Ciudad obligatorias, sin Comuna; nombre/teléfono de contacto general y de sucursal obligatorios, correo opcional.
- [x] Guardado atómico, pertenencia, versión, eliminación protegida por cotizaciones y confirmaciones/descarte reutilizables.
- [x] Validación de migración normal/heredada en copias, pruebas de dominio/regresión, navegador escritorio/móvil y lint/TypeScript/build.
- [ ] Revisión funcional del usuario.
- [ ] Seleccionar sucursal con búsqueda y guardar copia histórica al implementar Cotizaciones.

Detalles y evidencia en [Hito de Cotizaciones](HITO-COTIZACIONES.md). No se emitieron PDFs ni se implementaron procesos comerciales futuros.
