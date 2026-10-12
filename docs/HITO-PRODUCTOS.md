# Hito: catálogo de productos y recetas

**Estado:** catálogo, recetas e imágenes implementados; validación técnica completa y migración aplicada a PostgreSQL local. Catálogo validado funcionalmente; revisión visual de la reorganización pendiente. P5 de stock inicial validado funcionalmente por el usuario. P6 de ajustes/correcciones implementado y validado técnica y funcionalmente por el usuario. Fabricación y salidas siguen pendientes.

## Alcance y decisiones

- [x] Revisar checkpoints de Cotizaciones y estructura previa al cambio: no existía modelo Product.
- [x] Productos terminados separados de materias primas; cotizaciones mixtas aprobadas.
- [x] Usar unidades del mantenedor, con Unidades por defecto; no crear una unidad duplicada ni forzar cantidades enteras.
- [x] Receta de referencia por producto; producir consume materia prima e ingresa terminado, vender descuenta sólo terminado.
- [x] Conservar copia de la receta usada al producir, sin reescribir consumos históricos.
- [x] Campos aprobados: código obligatorio único generado automáticamente por el sistema (UUID, no editable), nombre obligatorio, descripción opcional, unidad obligatoria y precio sugerido opcional, final con IVA incluido y sin decimales CLP. Precio de venta independiente del costo de materiales.
- [x] Aprobada receta por una unidad de producto, cantidades por material con hasta tres decimales y sin bodega fija en la receta; seleccionar origen en producción.
- [x] Aprobado guardar/cotizar productos sin receta, impidiendo fabricarlos hasta completarla.
- [x] Aprobado bloqueo de cambio de unidad cuando haya receta, referencias comerciales/producción o stock/movimientos, incluso stock cero.

## Ampliación aprobada — 11-10-2026

- [x] Código generado por el sistema, nunca solicitado al usuario; usar UUID único e inmutable, independiente de numeración documental.
- [x] Permitir una o varias imágenes por producto; subir archivos, sin exigir imágenes para guardar un producto.
- [x] Incorporar carga inicial de stock de producto terminado existente, sin consumir materia prima actual ni simular fabricación.
- [x] Confirmar almacenamiento local de imágenes con contrato para futura migración a S3, siguiendo el enfoque de logos.
- [x] Confirmar carga inicial sólo por combinación producto/bodega sin movimientos anteriores y saldo cero; posteriores diferencias como ajustes, sin repetir carga inicial.

La entrada inicial debe tener documento y movimiento propios de producto terminado, con motivo/fecha y trazabilidad, idempotencia y transacción de saldo/Kardex. Puede registrar productos sin receta: representa existencias anteriores, no una fabricación nueva. No toca WarehouseStock ni StockMovement de materias primas.

## P1 — modelo y migración

- [x] Recibir aprobación explícita de los cuatro puntos del catálogo/receta.
- [x] Recibir respuestas sobre imágenes locales y elegibilidad de carga inicial; el usuario pedirá un reseteo posteriormente, no se ejecuta ahora.
- [x] Respaldar esquema, archivos afectados y PostgreSQL antes de editar.
- [x] Diseñar producto y receta, con FK/índices, cantidades positivas finitas y precio opcional no negativo/finito al peso.
- [x] Incorporar código UUID único e inmutable y registros de imágenes vinculadas al producto.
- [x] Proteger identidad y referencias; evitar duplicar un material dentro de una misma receta.
- [x] Preparar referencia de producto/unidad histórica en Cotizaciones, sin inferir tipos ni productos para documentos anteriores.
- [x] Revisar protecciones del cambio de unidad en Materias primas/Unidades para incluir referencias nuevas de recetas.
- [x] Probar SQL en copia, validar Prisma y generar cliente; aplicar migración local después de validar.

## P2 — catálogo

- [x] Incorporar ruta y menú centralizados, tabla/filtro y Crear/Ver/Editar/baja según referencias.
- [x] Formularios sobre listado, consulta readonly y selector de unidad con búsqueda interna.
- [x] Validar campos, precios al peso, código y cambios de unidad según reglas aprobadas.
- [x] Confirmaciones/alertas/descarte reutilizables, ayudas, cursor, errores y control de versión.

## P2b — imágenes

- [x] Implementar almacenamiento según respuesta, con contrato reemplazable para S3.
- [x] Validar contenido real, tamaño y formato; usar nombres generados y rutas controladas, sin URLs/rutas libres.
- [x] Mostrar galería y selección de imagen principal; vista previa y selección de varias imágenes en formulario.
- [x] Guardar referencias junto con producto; limpiar archivos nuevos si falla el guardado, conservar archivos históricos según política documentada.
- [x] Respaldar archivos junto con PostgreSQL y documentar almacenamiento/restauración.
- [x] Probar cargas múltiples, reemplazo/retirada, errores, cancelación y conflictos sin referencias rotas.

## P3 — recetas

- [x] Gestionar receta dentro del módulo sin salir del listado.
- [x] Selector buscable de materiales, mostrar unidad y cantidades por una unidad de producto.
- [x] Guardar producto/receta con transacción, control de versión y referencias concurrentes.
- [x] Edición con versión y baja lógica; cotizaciones referenciadas bloquean baja. Código, archivos y snapshots existentes conservados.
- [ ] Al implementar producción, copiar la receta usada en cada fabricación para conservar consumos históricos.
- [x] Consultar cantidades decimales de receta por unidad, enviadas como texto; no sumar unidades distintas.
- [ ] Calcular requerimientos para un lote de fabricación con Decimal al implementar producción.
- [x] Guardar una receta no modifica stock ni genera movimientos.

## P4 — validación y revisión

- [x] Validar duplicados, precios, cantidades, unidades, referencias, concurrencia y rollback en copia local.
- [x] Probar CRUD/recetas, búsqueda, ayudas, descarte y escritorio/móvil.
- [x] Ejecutar lint/build, revisar diff y comprobar conservación de datos anteriores.
- [x] Documentar esquema/arquitectura y actualizar checks sólo tras validación.
- [x] Retirar copias/servidores propios; comprobar puertos preservando procesos del usuario.
- [x] Funcionalidad del catálogo/recetas validada por el usuario; solicita reorganizar visualmente el detalle.

## P5 — stock inicial de producto terminado

- [x] Clasificación aprobada e implementada: Materia prima, Producto terminado y Mixta; existentes sin clasificar hasta elección explícita. Terminado futuro admite sólo Producto terminado o Mixta.
- [x] Diseñar stock/Kardex/documento propios, con precisión, FK/índices y restricciones; respaldar y validar migración.
- [x] Registrar cantidad inicial no negativa en la unidad del producto, fecha actual/pasada y observación; sin consumo de materias primas.
- [x] Aplicar regla de elegibilidad según respuesta; control de versión, bloqueos e idempotencia, con saldo y movimiento atómicos.
- [x] Tabla/formulario de carga inicial con selectores buscables y confirmaciones reutilizables.
- [x] Probar saldo/Kardex, concurrencia, rollback, reintentos y ausencia de cambios en materia prima.
- [x] Documentar y completar validación técnica de P5.
- [x] Validación funcional del usuario de P5; solicita corregir errores mediante ajustes. Fabricación/venta continúan pendientes.

## Almacenamiento y operación

Ruta: **Mantenedores → Productos**, `/mantenedores/productos`. El UUID se genera al guardar. Precio sugerido opcional, final con IVA y pesos enteros; cero y sin precio son distintos. La receta corresponde a una unidad del producto y guardar no altera existencias. Sin receta el catálogo permite guardar; la fabricación futura deberá exigirla.

Imágenes en `var/productos/imagenes/`, o directorio absoluto indicado por `PRODUCTO_IMAGEN_DIR`. Contrato `AlmacenImagenesProducto` en `src/lib/almacenamiento/imagenes-producto.ts`; reemplazar la fábrica para S3 manteniendo claves y rutas del ERP. Hasta diez imágenes PNG/JPG/WebP de 2 MB cada una; se valida contenido real, hasta 16 megapíxeles, y se reprocesa como PNG de máximo 1600×1600, sin ampliar. La primera es principal. Retirar/bajar conserva archivos históricos; sólo archivos nuevos de un guardado fallido se retiran. Respaldar y restaurar la carpeta configurada junto con PostgreSQL, conservando nombres y permisos. Las consultas y cancelaciones no escriben archivos.

Creación idempotente con UUID/huella; edición y baja con versión entera. Bloqueos materiales ascendentes → producto; cantidades positivas Decimal(14,3), precio nullable Decimal(14,2) con CHECK de pesos enteros. Restricciones SQL protegen código, receta/unidad, imágenes y referencias. La baja es lógica y mantiene identidad; una unidad utilizada por materiales o productos no se elimina. La unidad y la baja del producto quedan bloqueadas también por inventario asociado, incluido saldo cero.

**Decisión P5 aprobada:** clasificar bodegas como Materia prima, Producto terminado o Mixta. Clasificación implementada sin asignar tipo a las actuales automáticamente. P5 implementa modelos, saldo, Kardex y carga inicial; no habilita fabricación ni salidas.

## Continuación

Integrar productos en Cotizaciones después de completar esta dependencia. Producción, clasificación de bodegas y stock/Kardex de producto terminado se desglosan antes de habilitar entradas/salidas; la carga inicial aprobada está implementada en P5 y no se presenta como fabricación. No cargar existencias de terminado inventadas ni descontar materiales al guardar un producto o cotización.

Los envíos a GitHub quedan a cargo del usuario; no hacer push.


## Entrega técnica — 11-10-2026

- [x] Originales y dump PostgreSQL en `backups/20261011_112454_catalogo_productos`.
- [x] Migración `20261011143500_catalogo_productos_recetas_imagenes` probada en copia, aplicada localmente; Prisma format/validate/generate y migrate status correctos.
- [x] Pruebas específicas `tests/productos.integration.ts`: idempotencia/concurrencia, UUID, cantidades/precios, unidades/recetas, imágenes reales/múltiples, retirada, archivos, rollback, referencias/snapshots y stock intacto.
- [x] Chromium escritorio/móvil: crear, consultar readonly sin guardar con Enter, editar, baja/cancelación, búsqueda/vacío, receta decimal, carga múltiple/API/principal/retirada, descarte, cursor y ayuda.
- [x] Corregir y comprobar ausencia de desbordamiento horizontal del formulario móvil.
- [x] ESLint, TypeScript y build contra la copia migrada correctos, sin dependencias nuevas del proyecto.
- [x] Huellas/conteos de las 33 tablas anteriores iguales; QuoteDetail excluye únicamente los cuatro campos nuevos, sin inferir productos históricos.
- [x] Copia descartable retirada; servidor propio 3031 detenido y puerto libre. Se conserva servidor previo del usuario 3030/PID 43873.
- [x] Funcionalidad de Mantenedores → Productos aprobada por el usuario; revisión visual de la nueva grilla pendiente.
- [x] Respuesta explícita P5: clasificación de bodegas aprobada; implementación y revisión separadas del stock inicial.

Las imágenes/fixtures de validación permanecen únicamente dentro del respaldo de pruebas; no se cargaron productos de ejemplo en la base real. Compras y productos no se resetean. Cotizaciones, producción y stock de terminado siguen pendientes; el catálogo constituye su base.


## Clasificación de bodegas — 11-10-2026

- [x] Aprobar enumerador interno WarehouseClassification: MATERIA_PRIMA, PRODUCTO_TERMINADO y MIXTA, con etiquetas en español.
- [x] Respaldar originales/PostgreSQL en `backups/20261011_122855_clasificacion_bodegas` antes de editar; preservar avances del catálogo.
- [x] Migración `20261011164000_clasificacion_bodegas` probada en copia y aplicada localmente; cliente generado.
- [x] Campo nullable sin default: existentes aparecen Sin clasificar. Crear/guardar desde Bodegas exige escoger uno de los tres tipos; no se ofrece quitar una clasificación ya guardada.
- [x] Tabla y búsqueda incluyen clasificación; formulario con selector buscable/ayuda y Ver en sólo lectura.
- [x] Impedir tipo exclusivo Producto terminado si hay referencias de materias primas, incluido stock cero, mínimos e historial. Materia prima y Mixta admiten las referencias actuales.
- [x] Excluir exclusivas de terminado de selectores de Compras/inventario de materias primas; proteger escrituras también con triggers SQL bajo bloqueo de bodega, incluso ante solicitudes antiguas o simultáneas.
- [x] Mantener operativas las heredadas sin clasificar hasta elección explícita, sin tocar saldos/Kardex ni borrar documentos.
- [x] Regresión de Bodegas y tests/bodegas-clasificacion.integration.ts: obligatorios, tipos, legado, versión, selectores, stock cero, restricciones SQL y carrera reclasificación/stock.
- [x] Chromium escritorio/móvil, consulta readonly/Enter, ayudas, cursor, filtro, CRUD; lint/tipos/build correctos.
- [x] Las 36 tablas anteriores conservan conteos/huellas, excluyendo sólo nueva columna classification; no hay clasificaciones asignadas por la migración.
- [x] Copia de pruebas retirada y servidor propio 3031 detenido/puerto libre; servidor previo 3030/PID43873 conservado.
- [ ] Revisión completa del usuario de Bodegas y Productos.
- [x] Implementar P5 por solicitud posterior explícita del usuario; clasificación por sí sola no habilitaba entradas.

Las imágenes locales de productos se excluyen ahora de git, al igual que los logos; continúan siendo datos persistentes a respaldar junto con la base. No se resetean compras/productos ni se hacen envíos a GitHub.


## Receta en grilla y diálogo — 11-10-2026

- [x] Registrar aprobación funcional de Productos y solicitud de reorganizar el formulario antes de P5.
- [x] Respaldar archivos afectados en `backups/20261011_125503_grilla_receta_productos`; mantener intactos esquema, servicios y avances previos.
- [x] Mostrar receta como grilla: materia prima/código, cantidad por unidad de producto, unidad del material y acciones Ver/Editar/Quitar.
- [x] Agregar/editar mediante diálogo modal con selector buscable, cantidad positiva de hasta tres decimales y ayuda informativa.
- [x] Excluir del selector materiales usados en otras filas, conservando la validación de duplicados del servidor.
- [x] Botón Agregar materia prima debajo de la grilla; volver el foco al botón/fila al cerrar el diálogo, sin subir hasta el inicio del detalle.
- [x] Mantener cambios como borrador hasta Guardar producto; impedir que Enter dentro del diálogo envíe el formulario principal.
- [x] Consulta readonly, cancelación/descarte de cambios del detalle y confirmación reutilizable para quitar una fila.
- [x] Chromium en copia aislada: ocho altas sucesivas, foco/botón visible, búsqueda/duplicados, cantidades, editar/ver/quitar, cancelación/descarte, persistencia al guardar y móvil.
- [x] Lint/build con tipos correctos; sin cambios de Prisma/migraciones ni escrituras sobre datos reales.
- [x] Retirar copia aislada y servidor propio 3031; puerto libre, servidor previo del usuario 3030/PID43873 conservado.
- [ ] Revisión visual específica de grilla/modal pendiente; el usuario autorizó posteriormente continuar con P5.

La receta guarda el mismo contrato de datos y conserva las reglas del catálogo. Agregar al detalle aplica sólo al borrador; Guardar producto sigue siendo la operación que registra producto, imágenes y receta conjuntamente. Esta mejora no implementa producción ni carga inicial.


## P5 — entrega técnica 11-10-2026

Ruta **Inventario → Productos terminados**, `/inventario/productos-terminados`. Consultas: Stock por bodega, Ingresos iniciales y Movimientos de terminado, con filtros, búsqueda interna de selectores, paginación y orden en servidor. Las cantidades conservan su unidad; no se suman unidades distintas. El histórico muestra copias del nombre, UUID y unidad al ingresar, aunque posteriormente cambie el catálogo.

Para ingresar: pulsar **Inventario inicial**, seleccionar producto y bodega, **Revisar saldo**, indicar cantidad física, fecha y observación, y confirmar. Sólo admite bodegas Mixta o Producto terminado, explícitamente clasificadas, y producto activo. Cada combinación producto/bodega permite una carga inicial sólo con saldo cero y sin movimientos. Puede tener una fila cero previa y no necesita receta. Cantidad cero no crea saldo, documento, movimiento ni operación. Fechas de calendario actuales/pasadas de Santiago, sin futuras; cantidades Decimal(14,3).

- [x] Respaldo de archivos y PostgreSQL antes de cambios: `backups/20261011_132503_stock_inicial_terminado`.
- [x] Cuatro modelos propios: ProductWarehouseStock, ProductInitialStock, ProductStockMovement y ProductInventoryOperation; migración `20261011180000_stock_inicial_producto_terminado`.
- [x] Bloqueos UUID → producto → bodega → stock, versiones, reintentos con huella e ingreso atómico.
- [x] SQL conserva historia inmutable, saldo = suma del Kardex, documento completo y clasificación compatible; bloquea cambio de unidad/baja con inventario y reclasificación incompatible incluso con saldo cero.
- [x] Pruebas `tests/stock-terminado.integration.ts` sólo en copia local `mtx_validacion_terminado_*`: consultas sin escritura, cero, precisión, fecha, referencias/versiones, UUID/concurrencia, snapshots, inmutabilidad y rollback provocado. Verificación de materias primas intactas.
- [x] Migración aplicada a PostgreSQL local, estado al día y 36 tablas previas verificadas por huella/conteo; cuatro tablas nuevas sin fixtures.
- [x] Lint, tipos/build y Chromium escritorio/móvil: alta en Mixta, selectores buscables, confirmación, saldo, documento readonly, movimientos y bloqueo de repetición.
- [x] Copia de pruebas y servidor propios retirados; 3031 libre y servidor previo 3030/PID 43873 conservado.
- [x] Revisión funcional del usuario de inventario inicial; solicita desarrollar ajustes/correcciones.

No se consume WarehouseStock ni se genera StockMovement de materia prima. El ID del ingreso es interno; no usa folios comerciales configurados. Documentos y movimientos iniciales no se editan ni eliminan. P6 amplía el CHECK de origen de ProductStockMovement para admitir ajustes tipados. Fabricación y salidas siguen requiriendo etapas posteriores y nuevas migraciones antes de habilitarse. No usar otra carga inicial para corregir un saldo ni cambiar la receta para simular consumo.


## P6 — ajustes y correcciones de producto terminado

El usuario aprueba conservar el inventario inicial y corregir mediante un conteo del saldo físico actual. No eliminar documentos ni revertir automáticamente su cantidad histórica: cualquier movimiento posterior se considera en el saldo revisado. Se usa el patrón aprobado para ajustes de materias primas, con tablas y transacciones propias de terminado.

- [x] Respaldar archivos afectados y PostgreSQL antes de modificar: `backups/20261011_180503_ajustes_terminado`.
- [x] ProductInventoryAdjustment con saldo anterior/final, diferencia con signo Decimal(14,3), fecha de calendario, motivo, observación y snapshots.
- [x] Vincular opcionalmente la corrección a un ProductInitialStock o ProductInventoryAdjustment del mismo producto/bodega; exactamente un origen cuando el motivo es CORRECCION_REGISTRO.
- [x] Migración `20261011220000_ajustes_producto_terminado` amplía ProductStockMovement/ProductInventoryOperation sin editar migraciones anteriores ni liberar identidades iniciales.
- [x] SQL protege cantidades no negativas/no NaN, diferencia exacta no cero, referencias compuestas, un origen por movimiento/UUID y documentos/movimientos inmutables.
- [x] Servicio con bloqueos UUID → producto → bodega → stock, versión/saldo/último movimiento y Kardex coherentes; escritura atómica y reintentos reconocidos antes de validar el saldo actual.
- [x] Sin diferencia no crea documento, movimiento ni UUID. Ajustar a cero conserva el historial y no habilita otra carga inicial.
- [x] Vista previa sin escritura calculada con Decimal en servidor; se vuelve a verificar bajo bloqueo al confirmar.
- [x] Formulario sobre listado: Ajustar stock/Ajustar desde stock, Corregir desde ingreso/ajuste/movimiento, selectores con búsqueda, fecha sin futuro, cantidad física final, motivo y observación.
- [x] Motivos internos existentes: conteo físico, merma/pérdida, deterioro/daño, corrección de registro u otro; no crear un mantenedor de motivos ni usar INVENTARIO_INICIAL para ajustar.
- [x] Consulta Ajustes de terminado y Kardex con variación, saldos anterior/final, histórico readonly y documento que se corrige.
- [x] Pruebas de dominio en copia local: 10→8, positivos, cero, sin diferencia, referencias ajenas, fechas/precisión, snapshots, reintentos/concurrencia, restricciones SQL y rollback provocado; materia prima e ingreso inicial intactos.
- [x] Regresión de carga inicial después de ampliar sus orígenes.
- [x] Cierre final lint/tipos/build y Chromium escritorio/móvil, incluida verificación de foco inicial del diálogo.
- [x] Migración aplicada a PostgreSQL local tras validación; estado al día, datos anteriores de 40 tablas conservados por huella/conteo (excluidas únicamente nuevas columnas nullable de terminado). Sin fixtures de ajustes en la base real; ruta actual responde HTTP 200.
- [x] Retirar copia y servidor propios, verificar puertos y registrar comprobaciones; 3031 libre y servidor previo 3030/PID43873 conservado.
- [x] Revisión funcional del usuario de P6; confirma funcionamiento y solicita reorganizar Clientes/Sucursales antes de continuar.

### Uso

En **Inventario → Productos terminados → Ingresos iniciales**, pulsar **Corregir** en el documento equivocado. Producto y bodega quedan fijos; **Revisar saldo** carga el saldo vigente y documentos disponibles. El motivo Corrección de registro y el ingreso de origen se proponen automáticamente. Indicar cantidad física final, fecha y observación; **Revisar y confirmar ajuste** muestra saldo anterior, final y diferencia. Ej.: de 10 a 8 genera −2; de 8 a 12 genera +4; final cero descuenta el saldo vigente completo. Se conservan todos los documentos y sus vínculos.

Para una diferencia de conteo ordinaria, usar **Ajustar** desde Stock o **Ajustar stock**, con motivo correspondiente. Para corregir un ajuste anterior, usar **Corregir** desde Ajustes de terminado; también puede elegirse un origen con búsqueda interna. El saldo usado siempre es el actual, aunque el documento corregido sea anterior a otros ajustes. Sólo permite combinaciones con stock e historial registrado; antes del primer ingreso, usar Inventario inicial. No exige receta y no toca existencias de materia prima.

Producción, traslados y salidas de terminado siguen pendientes. Los ajustes confirmados no se editan ni eliminan: otro error requiere un nuevo conteo/corrección vinculado. Una respuesta incierta se reintenta con el mismo UUID y datos. Los folios comerciales configurados no se usan para estos IDs internos de inventario.
