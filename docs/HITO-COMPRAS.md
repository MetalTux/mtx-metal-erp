# Hito: consultas de inventario y Compras

Fecha: 06-10-2026. Desarrollo autorizado por el usuario. Estado: **consultas de Stock/Kardex implementadas y validadas; reglas principales de Compras aprobadas y plan detallado documentado; estructura de Compras migrada y validada; catálogo fijo cargado; listado/formulario y registro de Compras implementados; Compras con recepción, cierre de pendientes y anulación implementados y validados; funcionalidades existentes aprobadas por el usuario; ayudas de botones y cierre de pendientes incorporadas, pendientes de revisión visual**.

Referencias: [guía visual](GUIA-INTERFAZ.md), [mantenedores](MANTENEDORES-DATOS.md), [Empresa](HITO-EMPRESA.md), [decisiones de dominio](PROPUESTAS-DOMINIO.md) y `prisma/schema.prisma`.

## Objetivo y secuencia

Conectar proveedores, materiales, unidades y bodegas mediante compras que generen entradas trazables. Primero se implementan consultas de Stock y Kardex para observar las existencias y los movimientos antes de desarrollar sus escrituras.

Orden de trabajo: consultas de inventario → Compras → mínimos/ajustes de inventario → Cotizaciones/Órdenes de venta → Producción/Despachos → Cobranza. Autenticación y roles conservan su fase pendiente. Empresa sigue pendiente de revisión funcional y comprobación autorizada del túnel; no se marca su cierre por inferencia.

## Decisiones solicitadas al usuario

Las preguntas se enviaron antes de implementar operaciones de compra. **La autorización para desarrollar no elige ninguna de estas alternativas. No se adoptarán respuestas por defecto ni por tiempo transcurrido.**

| Decisión | Alternativas o definición necesaria | Estado |
| --- | --- | --- |
| Compra y recepción | Registrar compra completa y admitir recepciones parciales, con pendiente por línea | Acordado |
| Importes | Cantidad y precio unitario por presentación comprada; total calculado desde detalles, sin gestión de impuestos/descuentos | Acordado |
| Presentación | Registrar descripción y factor de contenido en unidad de inventario en cada detalle; preservar su valor histórico | Acordado |
| Bodega | Seleccionar una bodega al registrar la compra, común para sus líneas y recepciones; selector con búsqueda interna | Acordado |
| Documento del proveedor | Mantenedor de tipos; identidad única por proveedor identificado por RUT, tipo y número | Acordado |
| Anulación | Compra completa; bloquear consumo, traslado o ajuste negativo posterior en combinaciones recibidas, incluso con reposición | Acordado |
| Edición/correcciones | Bloquear material, presentación, factor, cantidad y bodega tras la primera recepción; permitir cerrar pendientes con motivo sin alterar lo comprado | Acordado |
| Redondeo | Redondear cada importe de línea a dos decimales y sumar las líneas; aritmética decimal. Empates hacia arriba: 1,005 → 1,01 | Acordado |
| Precio histórico | Inmutable desde guardar la compra; confirmación reutilizable previa con advertencia de que no podrá modificarse | Acordado |
| Fracciones | Admitidas si el equivalente en unidad de inventario es exacto con hasta tres decimales | Acordado |
| Número documental | Texto, ceros iniciales conservados, espacios exteriores retirados y comparación sin distinguir mayúsculas | Acordado |
| Eliminación posterior | Lógica después de anular; conservar documento, recepciones y Kardex. No liberar su identidad para duplicados | Acordado |
| Reintentos | UUID/huella/resultados para creación, recepción, cierre, anulación y eliminación | Implementado |

No se calcularán impuestos ni se asumirá una tasa. No se crearán compras, recepciones, anulaciones, saldos iniciales ni ajustes mientras dependan de estas decisiones.

## Reglas acordadas y alcance pendiente

Cada compra selecciona una bodega de recepción. Su formulario utilizará un selector con búsqueda interna. La redistribución a otras bodegas se realizará mediante traslados en una etapa posterior de Inventario; no se presenta esa operación como implementada.

El detalle conserva la presentación comprada, su cantidad, precio por presentación y factor de contenido expresado en la unidad del material. Por ejemplo, 3 cajas de 20 unidades equivalen a 60 unidades de inventario; recibir 1 caja ingresa 20 y deja 40 pendientes. El factor pertenece al detalle histórico y no cambia si después cambia una presentación comercial. El stock conserva la unidad única del material; este factor convierte la presentación de compra a esa unidad, sin introducir conversiones generales entre unidades de inventario.

La anulación no se habilita por el mero saldo actual: queda bloqueada ante consumo posterior en las combinaciones recibidas, incluso con reposición posterior. El cierre de pendientes con motivo está aprobado. La primera entrega anulará compras completas y bloqueará ante consumos, traslados o ajustes negativos posteriores; no implementará reversión individual de recepción. El servicio de anulación ya comprueba estas reglas bajo bloqueos y control de versión.

Prisma y PostgreSQL ya incorporan la estructura descrita en la entrega del 07-10-2026. Los tipos se mantienen como catálogo fijo. Listado, formulario, guardado y recepciones de compras están implementados; cierre de pendientes y anulación operativos ya están implementados. Precios inmutables desde guardar, redondeo por línea con empates hacia arriba y fracciones exactas están acordados; la confirmación previa al guardado ya está implementada; las reglas de recepción están implementadas; cierre y anulación están implementados en la etapa 6.

## Estructura revisada antes de esta migración

- `Purchase`: fecha, proveedor, total, líneas y fechas de registro/modificación. Actualmente carece de estado, tipo/número de documento y clave de idempotencia.
- `PurchaseDetail`: material, cantidad, precio unitario y bodega de recepción por línea. No tiene un modelo separado de recepción parcial.
- `WarehouseStock`: saldo y mínimo opcional por combinación única material/bodega.
- `StockMovement`: cantidades con signo, tipo, fecha/motivo y referencias opcionales a detalle de compra o trabajo. Los movimientos históricos se conservan.
- Dinero `Decimal(14,2)` y cantidades `Decimal(14,3)`. Los cálculos futuros usarán `Prisma.Decimal`; ningún total agrupará cantidades de unidades diferentes.
- Las consultas actuales aprovechan el esquema existente. Las migraciones de Compras se diseñarán después de resolver las reglas, con respaldo, revisión y validación previa/posterior.

## Etapa 0: preparación y reglas

- [x] Revisar esquema, arquitectura, componentes reutilizables y guía visual.
- [x] Identificar dependencias listas: proveedores, materiales, unidades y bodegas.
- [x] Respaldar archivos existentes afectados y PostgreSQL; preservar los cambios previos de Empresa.
- [x] Solicitar las decisiones de recepción, importes/documento y correcciones.
- [x] Recibir y documentar las respuestas explícitas sobre recepción, valor, documento, anulación, presentación y bodega.
- [x] Documentar aprobación del redondeo por línea, bloqueo estructural tras primera recepción y cierre de pendientes con motivo.
- [x] Desglosar el plan de implementación por etapas y cambios verificables.
- [x] Precisar redondeo, correcciones de esta entrega y diseño de idempotencia.
- [x] Cerrar las reglas de negocio de la primera entrega antes de implementar persistencia de Compras.

## Etapa 1: consultas de Stock y Kardex

- [x] Stock por bodega con material/código, unidad, saldo y mínimo; distinguir `null` de cero.
- [x] Kardex con fecha, tipo, cantidad con signo, material/bodega y referencias al origen.
- [x] Filtros de material y bodega con búsqueda interna; búsqueda textual y filtros de tipo/fecha en Kardex.
- [x] Paginación y orden en PostgreSQL, con orden secundario estable y tamaño limitado.
- [x] Detalles de sólo lectura sobre el listado y enlace de Stock a Kardex conservando material/bodega.
- [x] Fechas completas en `America/Santiago`, incluyendo días de cambio de hora.
- [x] Carga/error/reintento, filtro inválido, vacío, teclado/foco/cursor y móvil.
- [x] Verificar que consultar no cree combinaciones de stock ni modifique cantidades/movimientos.
- [x] ESLint, tipos, build, integración y navegador sobre copia temporal.
- [x] Comparar datos originales, retirar copia temporal y liberar el puerto de validación.
- [x] Registrar evidencias de implementación y validación.
- [ ] Obtener revisión funcional del usuario.

**Criterio de cierre técnico:** consultas útiles y verificadas sin escrituras sobre el inventario real.

## Etapa 2: diseño de datos, compatibilidad y migración

La estructura de esta etapa está implementada. Los controles de formulario y servicios que aparecen pendientes se completarán al desarrollar los módulos; no se presentan como reglas operativas ya ejecutables.

### 2.1 Precisiones antes de modificar Prisma

- [x] Confirmar redondeo a dos decimales por línea con empates hacia arriba (1,005 → 1,01).
- [x] Confirmar fracciones de presentación sólo con equivalente exacto de hasta tres decimales.
- [x] Implementar validación de representabilidad de cantidad × factor sin redondear stock.
- [x] Confirmar precio bloqueado desde guardar, incluso antes de la primera recepción.
- [x] Garantizar precio inmutable desde guardar mediante trigger SQL.
- [x] Implementar confirmación previa al guardado y mensaje de error en el servicio/formulario.
- [x] Delimitar anulación completa sin reversión individual; bloquear consumos/traslados/ajustes negativos posteriores.
- [x] Confirmar número como texto, ceros iniciales y normalización de espacios exteriores/mayúsculas.
- [x] Documentar diseño y crear estructura persistente de idempotencia por operación y versión; comportamiento del servicio pendiente.
- [x] Documentar respuestas y reglas aprobadas antes de modificar la estructura.

### 2.2 Catálogo y cabecera de compra

- [x] Diseñar `DocumentType`: identificación, nombre/código únicos según criterio acordado y relaciones con compras.
- [x] Añadir tipo y número de documento a `Purchase`, con unicidad proveedor/tipo/número normalizado en PostgreSQL.
- [x] Definir cómo conservar la identidad histórica del proveedor/documento frente a cambios del catálogo o RUT.
- [x] Incorporar bodega de recepción en cabecera y hacerla común a todos los detalles/recepciones nuevos.
- [x] Diseñar metadatos de anulación, motivo y control de versión; conservar los documentos históricos.
- [x] Definir estado de recepción derivado de cantidades recibidas y pendientes cerrados, evitando saldos duplicados.

### 2.3 Detalle, recepción y trazabilidad

- [x] Diseñar en `PurchaseDetail` descripción de presentación, cantidad comprada, factor a unidad de inventario y precio por presentación.
- [x] Conservar el significado de campos existentes: no reinterpretar cantidades históricas como cajas sin conversión explícita.
- [x] Definir importe de línea y CHECK de redondeo, con límites de `Decimal(14,2)`.
- [x] Implementar cálculo/suma de total en servidor al guardar la compra.
- [x] Diseñar cabecera de recepción vinculada a compra: fecha del hecho, fecha de registro y relación única a operación idempotente.
- [x] Diseñar detalles de recepción vinculados a líneas de compra, cantidad recibida y equivalente exacto en unidad de inventario.
- [x] Incorporar relaciones de entrada/reversión a detalle de recepción, conservando referencias de compra/trabajo.
- [x] Crear movimientos y comprobar material/bodega/cantidad/origen de forma atómica en el servicio de recepción.
- [x] Diseñar cierre de pendiente por línea con motivo, fecha y cantidad cerrada; conservar la cantidad comprada original.
- [x] Definir pendiente como comprado menos recibido efectivo menos cerrado, con equivalentes en unidad del material y sin agrupar unidades diferentes.
- [x] Diseñar registro de reversión/anulación sin eliminar ni editar movimientos históricos.
- [x] Añadir FK, índices, unicidad y CHECK necesarios: cantidades/factor positivos, importes no negativos y rechazo de `NaN`.
- [x] Identificar invariantes entre filas que requieren servicio transaccional/bloqueos, como impedir sobre-recepciones; no atribuirlas a un CHECK simple.

### 2.4 Compatibilidad y ejecución de migración

- [x] Inventariar compras/entradas existentes y líneas con diferentes bodegas; no asumir que pueden trasladarse a una única cabecera automáticamente.
- [x] Verificar ausencia de compras heredadas en el destino y agregar guardia SQL que detiene la migración si existen; sin inventar documentos.
- [ ] Diseñar transición específica si otro entorno contiene compras históricas; no aplicar allí esta migración automáticamente.
- [x] Respaldar esquema, configuración, migraciones, archivos afectados, cliente generado y PostgreSQL; registrar hashes y procedimiento de recuperación.
- [x] Preparar cambios Prisma y SQL versionado, revisando especialmente unicidad, restricciones y preservación de datos heredados.
- [x] Restaurar una copia local y aplicar la migración; verificar datos, referencias y coherencia de stock antes/después.
- [x] Ejecutar `prisma validate`, generar cliente y verificar tipos; adaptar consultas/pruebas afectadas sin implementar módulos en esta fase.
- [x] Aplicar al destino autorizado sólo tras validar compatibilidad; registrar resultado y versión de migración.
- [x] Ejecutar ESLint/build y documentar evidencias, límites y plan de recuperación.

**Criterio de cierre:** estructura migrada y validada, datos existentes preservados y cliente generado; módulos nuevos todavía pendientes.

## Etapa 3: catálogo fijo de Tipos de documentos

Por decisión del usuario, sustituye el CRUD originalmente planificado. No se desarrollará mantenedor ni acciones Crear/Editar/Eliminar para estos tipos en esta entrega.

- [x] Definir Factura de Compra (`FACTURA_COMPRA`), Boleta de Compra (`BOLETA_COMPRA`) y Guía de Compra (`GUIA_COMPRA`).
- [x] Centralizar opciones en `src/config/tipos-documento-compra.ts`; códigos internos sin significado tributario.
- [x] Incorporar carga idempotente al seed, conservando registros existentes y rechazando nombres incompatibles.
- [x] Disponer de carga exclusiva mediante `pnpm exec tsx prisma/seed.ts --documentos`, sin ejecutar roles/unidades/usuario del seed general.
- [x] Respaldar archivos/PostgreSQL; probar dos cargas en copia y cargar en el destino local.
- [x] Verificar que otras 24 tablas mantienen conteos y huellas; lint/build y limpieza de copia/puertos.
- [x] Integrar únicamente estas opciones en el selector buscable del formulario de Compras y validar código permitido en servidor.

El sistema registra materiales, proveedor, valor y documento de respaldo. No calcula impuestos/descuentos ni interpreta códigos del SII. No se requiere otra migración: utiliza `DocumentType` existente. El catálogo fijo se aplica en la aplicación futura, no mediante prohibición SQL de otros tipos.

## Etapa 4: listado y formulario de Compras

- [x] Listado con filtros, paginación/orden de servidor, proveedor, documento, bodega, fecha, total y situación de recepción.
- [x] Detalle sobre el listado con líneas, presentación, factor, unidad, comprado/recibido/pendiente/cerrado e importes.
- [x] Historial de recepciones y enlaces a movimientos asociados, mostrando motivos de cierre/anulación.
- [x] Formulario Crear/Editar sobre el listado con proveedor, tipo de documento, bodega y material en selectores buscables.
- [x] Añadir/quitar líneas y calcular equivalencias e importes con Decimal en servidor; mostrar precio por presentación claramente.
- [x] Validar datos y recalcular total por línea, sin gestionar impuestos/descuentos ni confiar en totales enviados por el navegador.
- [x] Bloquear campos estructurales tras primera recepción y conservar valores/errores al fallar.
- [x] Reutilizar alertas, confirmación de descarte y estados pendientes; conservar filtros del listado.
- [x] Registrar compra completa sin aumentar stock; recibir mediante operación explícita.
- [x] Guardar cabecera/líneas en transacción, controlar duplicados, reintentos y edición concurrente.
- [x] Habilitar eliminación lógica sólo después de anular, incluso sin recepciones; conservar identidad y origen histórico.

## Etapa 5: recepciones parciales y movimientos

- [x] Formulario de recepción sobre el listado con cantidades pendientes por línea y bodega fija de la compra.
- [x] Admitir recepción de algunas líneas o parte de ellas; mostrar equivalencia a unidad de inventario.
- [x] Rechazar cantidades no positivas, no representables o mayores al pendiente, y compras anuladas/cerradas.
- [x] Registrar recepción/detalles, incrementar stock y crear entradas vinculadas en una única transacción.
- [x] Coordinar bloqueos de compra, material y stock, con orden estable para evitar carreras y deadlocks.
- [x] Aplicar idempotencia: reintentos no duplican recepciones ni entradas; fallos revierten toda la operación.
- [x] Actualizar situación derivada de recepción y mostrar pendientes exactos por línea.
- [x] Conservar snapshot/factor histórico y proteger cambio de unidad del material mientras existan referencias.

## Etapa 6: cierre de pendientes y anulación

- [x] Cerrar pendiente total o por línea según diseño, exigiendo motivo y sin alterar comprado ni stock.
- [x] Impedir nuevas recepciones sobre cantidades cerradas y conservar historial del cierre.
- [x] Anular compra con motivo y confirmación reutilizable, verificando que no hubo consumo posterior, incluso si se repuso el saldo.
- [x] Resolver bajo bloqueos qué operaciones son posteriores: separar fecha manual del hecho y secuencia de registro para impedir evasiones por fechas retroactivas.
- [x] Validar saldo suficiente y restricciones de otras salidas conforme a los bloqueos acordados; no generar saldo negativo al revertir.
- [x] Revertir únicamente cantidades efectivamente recibidas mediante movimientos compensatorios, nunca borrar entradas históricas.
- [x] Ejecutar reversión y anulación de forma atómica e idempotente; excluir operaciones ya anuladas de recepciones/pendientes efectivos.
- [x] Confirmar que esta entrega no expone reversión individual de recepción; cualquier ampliación requiere una nueva decisión.

## Etapa 7: validación y cierre del hito

- [x] Probar compra directa en unidad de inventario y compra por cajas con factor histórico.
- [x] Probar importes fraccionarios, redondeo por línea, suma del total y límites de precisión.
- [x] Probar recepciones múltiples/parciales, líneas distintas, cierre de pendientes y rechazo de sobre-recepción.
- [x] Probar duplicados proveedor/tipo/número y reintentos de compra, recepción y anulación.
- [x] Probar concurrencia, control de versión, rollback total e invariantes de cantidad/stock.
- [x] Probar anulación con recepción, bloqueo tras consumo y bloqueo persistente aunque otra compra reponga saldo.
- [x] Comprobar que stock coincide con movimientos, contemplando entradas heredadas y saldos iniciales; no inventar ajustes para cuadrar diferencias.
- [x] Regresar Stock/Kardex, orígenes, fechas chilenas y ausencia de deprecaciones de pg en desarrollo.
- [x] Verificar flujos en escritorio/móvil, selectores buscables, teclado/foco/cursor y mensajes reutilizables.
- [x] Validar sobre copia PostgreSQL y comparar datos originales antes/después; nunca usar compras ficticias en la base real.
- [x] Detener servidores propios, retirar copias temporales y verificar puertos, preservando servidores del usuario.
- [x] Registrar evidencias y marcar únicamente ítems completados.
- [x] Obtener aprobación funcional del usuario antes del siguiente hito. Aprobado por el usuario el 07-10-2026; las nuevas ayudas se revisan por separado.

## Seguimiento de esta planificación

- [x] Registrar decisiones y aprobación del usuario.
- [x] Desglosar cambios y verificaciones por etapas.
- [x] Respaldar documentos anteriores y revisar coherencia del plan.
- [x] Completar implementación de etapas 3–6 y controles de dominio; ejecutar validaciones técnicas de etapa 7.
- [x] Cerrar etapa 7 con revisión y aprobación funcional del usuario. Aprobado por el usuario el 07-10-2026; las nuevas ayudas se revisan por separado.

La planificación anterior fue exclusivamente documental. La entrega de estructura del 07-10-2026 se describe al final; las etapas 4–6 y la validación técnica de etapa 7 están completas; la aprobación funcional de las funcionalidades existentes fue recibida el 07-10-2026.

## Fuera de esta primera entrega de consultas

Configuración de mínimos, alertas de reposición, ajustes, carga de stock inicial, reservas/traslados, valorización de inventario, compras/recepciones editables, impuestos y Dashboard real. Estos puntos no se presentan como implementados.

## Entrega implementada: consultas de inventario

- `/inventario/stock`: consulta únicamente combinaciones existentes de material/bodega, con código/nombre, unidad, existencias y mínimo. Un mínimo `null` aparece como «Sin configurar»; cero se muestra como cantidad válida. No se crean filas de stock al consultar ni se suman cantidades de unidades diferentes.
- `/inventario/movimientos`: consulta fecha del hecho, tipo, cantidad con signo, material/bodega y referencias a compra/trabajo y sus líneas. La ausencia de referencia aparece como «Sin documento asociado», sin atribuirle un origen ficticio. El motivo y la fecha de registro se muestran en el detalle.
- Filtros por material/bodega con búsqueda interna sin distinción de acentos/mayúsculas y términos de unidad/ubicación. La búsqueda textual en PostgreSQL no distingue mayúsculas, pero conserva la distinción de acentos. Stock busca código/nombre; Kardex agrega motivo, tipo y fechas.
- Aplicar filtros, limpiar, actualizar y navegar conservan los filtros aplicados en la URL. Los controles mantienen sus valores cuando el servidor rechaza un filtro. Desde Stock se abre Kardex con material y bodega seleccionados.
- Paginación/orden en PostgreSQL, tamaños 10/20/50 y orden secundario por ID. La consulta ajusta una página inexistente a la última válida. Cantidades se ordenan como Decimal en la base, no como texto; mínimos nulos se ubican al final. Total y filas se leen en una transacción `RepeatableRead`.
- Fechas mostradas `dd-MM-yyyy HH:mm` y filtros por días completos en `America/Santiago`: inicio inclusivo y comienzo del día siguiente exclusivo, contemplando cambios de hora. Los filtros admiten fechas de 1900-01-01 a 9999-12-30.
- `src/lib/formato.ts` formatea cantidades desde texto decimal, sin convertirlas a `number`. Los resultados serializan Decimal como texto y fechas como ISO antes de enviarse al cliente.
- Tabla reutilizable para consultas con paginación de servidor, avisos existentes, estados de carga/error/reintento y detalles sobre el listado. El reintento solicita datos nuevos al servidor. No existen acciones de escritura en estas pantallas.

## Validación, respaldos y límites

Respaldos: `backups/20261006_213943_consulta_inventario/` (local, excluido de git). Incluye originales con SHA-256, dump PostgreSQL y logos locales existentes, resultados de integración, scripts, capturas y comparación de las 20 tablas originales.

Pasaron `pnpm lint`, `pnpm build` con comprobación de tipos y `tests/inventario.integration.ts` sobre una copia local temporal. Se verificaron decimales grandes/fraccionarios/negativos, mínimos `null`/cero, separación por bodega/material, orden numérico, paginación/clamp, origen de compra/trabajo, filtros inválidos y días de 23/25 horas. Las consultas conservaron las filas de stock y movimientos de prueba.

Chromium verificó filtros y búsqueda interna, teclado/foco, consulta sobre listado, enlace contextual, paginación/orden, recarga, fechas inclusivas, conservación de filtros erróneos, vacío y escritorio/móvil sin desbordamiento. Sin diálogos nativos ni errores de consola/JavaScript durante el flujo normal. Otro servidor temporal con nombre de base inexistente comprobó el aviso de conexión y una nueva petición GET al reintentar en ambas rutas; no se detuvo PostgreSQL para simular el fallo.

En la entrega inicial se observó un aviso de deprecación de `pg` sobre la cola de consultas en el servidor. Se corrigió posteriormente mediante el cambio de consultas descrito abajo; las dependencias mantienen sus versiones.

Las 20 tablas reales conservaron conteos y huellas antes/después. La copia temporal se retiró y todos los servidores iniciados para validar liberaron 3031; el servidor previo del usuario en 3030 se preservó. No se modificaron Prisma, migraciones, seed, dependencias ni GUIA-INTERFAZ en esta entrega; los cambios previos de Empresa se conservaron.

Para repetir integración: `pnpm exec tsx tests/inventario.integration.ts`, con `DATABASE_URL` ya configurada para una **copia local** `mtx_validacion_*`. No carga `.env` ni admite la base habitual. Por defecto retira únicamente sus propios datos de prueba. La conservación explícita mediante `INVENTARIO_CONSERVAR_DATOS=1` y `INVENTARIO_FIXTURE_PATH` sirve para preparar la revisión en navegador de esa copia.

La consulta muestra saldos registrados y movimientos; todavía no implementa un saldo acumulado por línea, conciliación automática, reservas ni valorización. Los catálogos de los selectores se cargan completos; evaluar búsqueda paginada en servidor cuando crezcan. Compras tiene sus reglas principales aprobadas; las precisiones pendientes y el plan están al inicio de este documento.

## 2026-10-06: corrección de la deprecación de pg

- [x] Respaldar archivos afectados y PostgreSQL antes del cambio.
- [x] Reproducir el aviso con el servicio original y registrar su traza.
- [x] Corregir Stock y Movimientos conservando transacciones `RepeatableRead`, filtros, orden y contratos de datos.
- [x] Agregar regresión con consultas simultáneas de Stock, Movimientos y catálogos.
- [x] Validar integración con `NODE_OPTIONS=--throw-deprecation`, ESLint y build/tipos.
- [x] Verificar en Chromium contra Next.js **en desarrollo**, escritorio/móvil y sin errores de consola.
- [x] Comparar las 20 tablas originales; retirar copia PostgreSQL y servidor temporal, liberando 3031 y preservando 3030.

La traza identificó consultas internas paralelas de relaciones hermanas de Prisma sobre un único `PgTransaction`. Aunque el servicio esperaba su `findMany`, Prisma encolaba esas lecturas en el mismo cliente `pg`, generando el aviso. Ahora se consultan primero las filas escalares y luego, con `await` secuencial, lotes de bodegas, materiales, unidades y documentos de origen correspondientes a la página. No se consulta cada relación por fila y todas las lecturas permanecen en el mismo snapshot. El paralelismo entre peticiones y catálogos independientes se conserva fuera de ese cliente de transacción.

Como antecedente relacionado, Prisma registra este comportamiento en [orm#29407](https://github.com/prisma/orm/issues/29407). La corrección local se verificó reproduciendo el servicio respaldado y comparándolo con el servicio corregido; no se ocultaron advertencias ni se cambiaron versiones de dependencias.

Se excluyó `backups` del compilador TypeScript: los originales respaldados son referencias, y sus imports relativos no deben compilarse como código activo. ESLint ya excluía esa carpeta.

Evidencias en `backups/20261006_220615_aviso_pg_inventario/`: originales/SHA-256, dump, trazas antes/después, integración, log de desarrollo, capturas/resultados de navegador y huellas de datos originales. La revisión en desarrollo ejecutó Node con `--throw-deprecation` y verificó paginación/orden, selectores, filtros/fechas, orígenes de compra/trabajo, detalles y consulta móvil sin escrituras. No se modificaron esquema, migraciones ni guía visual. Consultar la tabla de decisiones y el plan actualizado para las precisiones pendientes de Compras.

## 2026-10-07: preparación técnica de Compras

Estado histórico de preparación: las preguntas se enviaron y posteriormente fueron respondidas. Consultar decisiones actuales y entrega de estructura al final.

### Reintentos y concurrencia: diseño para implementar

- Clave UUID generada una vez por intento lógico de compra, recepción, cierre de pendientes o anulación; conservarla al reintentar una petición fallida. Una recepción parcial nueva utiliza otra clave.
- Registrar tipo de operación, clave única, huella del contenido validado/normalizado y referencia al resultado persistido. No guardar secretos ni confiar en importes calculados en el navegador.
- Persistir operación y efectos de negocio en la misma transacción. El resultado sólo queda disponible tras commit; rollback retira ambos. No reservar una clave fuera de la transacción dejando operaciones huérfanas.
- Misma clave, operación y contenido: devolver la referencia al resultado previo sin repetir efectos, incluso si el documento evolucionó desde entonces. Misma clave con otro contenido: conflicto explícito.
- Resolver carreras sobre la unicidad de la clave tras rollback, consultando la operación confirmada; evitar continuar consultas en una transacción PostgreSQL ya abortada.
- La unicidad del documento proveedor/tipo/número es independiente de la idempotencia y protege duplicados con claves distintas.
- Usar versión de compra para rechazar ediciones desde formularios desactualizados; validar versión y bloqueos dentro de la transacción. En reintentos exitosos resolver primero la clave para no rechazar una operación propia ya confirmada.
- Serializar recepciones/cierres/anulaciones por compra, revalidar el pendiente bajo bloqueo y coordinar bloqueos de material/stock en orden estable. Consultas del mismo cliente transaccional con `await` secuencial.

### Próximos pasos inmediatos

- [x] Revisar checkpoints, esquema y configuración Prisma, preservando cambios previos.
- [x] Respaldar documentos afectados y registrar diseño técnico independiente de decisiones abiertas.
- [x] Enviar preguntas pendientes al usuario; no asignar respuestas por tiempo transcurrido.
- [x] Recibir respuestas y documentar cuáles propuestas se aprobaron o modificaron.
- [x] Inventariar datos PostgreSQL existentes mediante lecturas: destino sin compras.
- [x] Preparar esquema/migración y guardia para impedir transición ficticia de compras heredadas.
- [x] Respaldar PostgreSQL antes de aplicar cambios y validar migración en copia local.

Sólo se completó preparación documental en este avance. No se han cambiado Prisma, migraciones, modelo generado ni datos, y no se inició ningún servidor de validación.

## Respuestas confirmadas y eliminación lógica aprobada

El usuario confirmó empates hacia arriba, fracciones representables exactamente y número de documento como texto. También estableció precio inmutable desde guardar y confirmación previa. Aceptó anulación y posterior eliminación bajo los criterios de bloqueo propuestos: consumo, traslado o ajuste negativo posterior en las combinaciones recibidas. Estas aprobaciones no significan funcionalidades implementadas.

- [x] Registrar las respuestas explícitas.
- [x] Confirmar eliminación lógica posterior a anulación, conservando documentos, recepciones y Kardex.
- [x] Confirmar normalización de espacios exteriores/mayúsculas y conservar ceros iniciales.

Recomendación aprobada: eliminación lógica de compras anuladas, manteniendo acceso al origen desde Kardex. La implementación del botón/servicio queda pendiente.

## 2026-10-07: estructura de Compras implementada

- [x] Respaldar archivos, migraciones, cliente generado y PostgreSQL antes de modificar.
- [x] Inventariar destino: cero compras, detalles y movimientos antes de migrar.
- [x] Incorporar `DocumentType`, `PurchaseReceipt`, `PurchaseReceiptDetail`, `PurchasePendingClosure` y `PurchaseOperation`.
- [x] Ampliar compra/detalles con identidad histórica, bodega común, presentación/factor, importes, versión y anulación/eliminación lógica.
- [x] Crear y probar migración `20261007160000_compras_recepciones_parciales`; aplicar primero a copia, luego a PostgreSQL local.
- [x] Validar y generar Prisma; comprobar ausencia de diferencias de esquema y migraciones pendientes.
- [x] Probar restricciones, regresiones de Inventario/Bodegas/Materiales/Proveedores, ESLint, tipos y build.
- [x] Comparar las 20 tablas originales: conteos y huellas iguales; tablas nuevas vacías.
- [x] Retirar copias temporales y comprobar puertos 3030/3031 libres; no iniciar servidores de aplicación.
- [x] Implementar y validar etapa 4: listado, formulario y registro de Compras.

### Contrato de datos y límites

`PurchaseDetail.quantity` conserva su significado de cantidad total en unidad de inventario. `purchasedQuantity × unitFactor` debe equivaler exactamente a ella. `unitPrice` corresponde a la presentación, es inmutable desde el primer guardado y `lineAmount` exige redondeo por línea a dos decimales. El total de compra se calculará sumando líneas en el futuro servicio; no hay un CHECK que compruebe sumas entre filas.

La bodega en cabecera y detalle queda coordinada por FK compuesta. Las recepciones y sus líneas pertenecen a la misma compra mediante FK compuestas; operaciones no pueden enlazar recepciones o cierres de otra compra. El cierre registra cantidad en presentaciones, motivo y fecha. No se guardan saldos pendientes ni estados derivados duplicados.

StockMovement conserva sus referencias previas y agrega vínculos únicos para entrada y reversión de una línea recibida. La reversión se usará para compensar recepciones al anular la compra completa; no habilita una operación de reversión individual. El futuro servicio verificará también igualdad de material/bodega/cantidad entre referencias.

`PurchaseOperation` conserva UUID único, tipo, huella SHA-256 y referencia a resultado. Su unicidad y coherencia de resultado se prueban en PostgreSQL, pero la comparación de contenido y devolución de reintentos requieren servicio. Igualmente, sobre-recepción, inmutabilidad estructural tras recibir, bloqueo de anulación tras salidas, saldo suficiente y actualización stock/movimiento requieren transacciones y bloqueos; no están implementados sólo por este esquema.

`deletedAt` sólo es admisible en compras anuladas. Identidades de documento permanecen únicas incluso después de eliminar lógicamente. El RUT y código de tipo se conservan en la compra para no reescribir su identidad histórica al editar catálogos. La validación de RUT/DV y la construcción de snapshots serán responsabilidad del servicio.

Bodegas cuenta ahora compras desde la cabecera, una vez por documento, y protege la bodega incluso sin líneas. Se adaptaron fixtures de cuatro pruebas existentes sin introducir módulos nuevos.

### Compatibilidad, evidencias y recuperación

Esta migración exige tablas de compras vacías. Incluye bloqueo y guardia al comienzo, y una transacción SQL que revierte el cambio completo ante fallos. Una prueba sobre otro clon con compra antigua confirmó que se detiene antes de alterar estructura/datos. Para otro entorno con historial habrá que diseñar una migración de transición específica; no reiniciar ni borrar ese historial para aplicar ésta.

Respaldo local: `/home/metaltux/Proyectos/mtx-metal-erp/backups/20261007_125837_estructura_compras/`, con originales, SHA-256, cliente generado anterior, dump PostgreSQL, scripts y resultados de pruebas. Para recuperar, primero restaurar el dump en una **base nueva de recuperación**, comparar su contenido y utilizar los originales de esquema/cliente junto con esa estructura. No sobrescribir ni borrar la base habitual automáticamente; recuperar el esquema anterior implica preservar por separado cualquier dato nuevo posterior al respaldo.

Se usó `prisma migrate diff` entre esquema respaldado y nuevo para generar SQL, porque `migrate dev --create-only` rechazó el entorno no interactivo. Se añadieron/revisaron CHECK y trigger antes de ejecutar `migrate deploy` en copia y destino. No se usó `db push`, reset ni seed.

Validación: `tests/compras-estructura.integration.ts` usa PostgreSQL y rollback en copia local; prueba ceros/normalización, duplicados activos/eliminados, factor exacto, fracciones, empate, precio inmutable, FK/bodega, recepción/origen, cierres y UUID. `tests/inventario.integration.ts` pasó con `--throw-deprecation`; también pasaron las regresiones de Bodegas/Materiales/Proveedores. ESLint, comprobación de tipos y build final con BD migrada aprobados. No se desarrolló interfaz ni se modificó GUIA-INTERFAZ.

## 2026-10-07: tres tipos documentales fijos

Se sustituyó el CRUD de Tipos de documentos por el catálogo solicitado. Factura de Compra, Boleta de Compra y Guía de Compra están disponibles en PostgreSQL. Carga transaccional/idempotente con cliente compartido y `update: {}`: conserva registros existentes, sin modificar otros catálogos. No se ejecutó el seed general en el destino.

Respaldo: `/home/metaltux/Proyectos/mtx-metal-erp/backups/20261007_131724_tipos_fijos/`, con originales, hashes, dump y resultados de comparación/carga. Se probó dos veces en copia, se verificaron nombres/códigos y la conservación de otras 24 tablas, luego se cargaron sólo los tipos en el destino. ESLint/build aprobados, copia retirada y puertos libres. No se cambió esquema/migraciones ni se creó interfaz.

## 2026-10-07: listado y formulario de Compras implementados

- [x] Reemplazar página provisional por listado filtrable, paginado y ordenado en PostgreSQL.
- [x] Crear, Ver y Editar mediante formularios sobre el listado y selectores con búsqueda interna.
- [x] Mostrar unidad, presentación/factor, equivalencia, precio por presentación e importe por detalle.
- [x] Validar en cliente/servidor y calcular Decimal con redondeo por línea; total se recalcula al persistir.
- [x] Confirmar datos antes de guardar, advirtiendo que los precios no se podrán modificar.
- [x] Conservar formulario, UUID y mensajes ante fallos; confirmación reutilizable de descarte.
- [x] Registrar documento/líneas/operación en transacción sin crear stock ni movimientos.
- [x] Rechazar duplicados incluso eliminados, claves reutilizadas con distinto contenido, referencias ajenas y cambios de precio.
- [x] Proteger edición concurrente con versión y bloqueo de compra/material; bloquear identidad/bodega/líneas tras recibir.
- [x] Consultar recepciones, cantidades recibidas/cerradas/pendientes y motivos de cierre/anulación; enlace contextual al Kardex por material/bodega.
- [x] Eliminar lógicamente sólo compras anuladas, con confirmación y reintento idempotente, conservando historial.
- [x] Integración en copia, lint/build/tipos y Chromium en producción/desarrollo con deprecaciones estrictas.
- [x] Respaldos, comparación de 25 tablas reales, retiro de copia y liberación de servidores de prueba.
- [x] Revisión funcional del usuario antes de continuar con recepciones (etapa 5). Aprobado por el usuario el 07-10-2026; las nuevas ayudas se revisan por separado.

### Comportamiento disponible

Crear compra registra todo lo comprado, su proveedor/RUT histórico, documento y bodega. No recibe materiales automáticamente. Las cantidades comerciales admiten coma decimal y se normalizan; las equivalencias deben ser exactas con hasta tres decimales. El precio tiene hasta dos decimales y el importe se redondea con `ROUND_HALF_UP`. El control “Revisar y guardar” muestra total y advertencia de precios antes de confirmar.

Editar conserva el precio de cada línea guardada. Antes de recibir se pueden ajustar estructura y cantidades conforme al plan; no se admite reemplazar una línea guardada por otra del mismo material para cambiar el precio en una sola operación. Tras la primera recepción, identidad, bodega y estructura quedan bloqueadas; se puede editar la fecha con control de versión. Los snapshots de RUT/código se conservan al editar con el mismo proveedor/tipo.

La creación y eliminación usan UUID/huella/resultados persistidos para reintentos; la edición se protege con versión, por lo que un formulario desactualizado no sobrescribe datos. Los errores esperados de unicidad/versiones son respuestas controladas, no fallos de las pruebas. Las lecturas dentro de `RepeatableRead` son escalares y secuenciales, con lotes por página; los catálogos independientes usan el pool en paralelo.

Eliminar se habilita sólo si la compra ya está anulada. La operación de anular y sus comprobaciones de consumo/saldo todavía no están disponibles; su interfaz corresponde a la etapa 6. Recepciones y cierres se muestran cuando existen, pero aún no se registran desde la aplicación. Las pruebas usaron fixtures directos **sólo en la copia** para comprobar estados, motivos, bloqueo y eliminación; no equivalen a tener los servicios de recepción/anulación implementados.

Los filtros se aplican al conjunto completo y se conservan en la URL al paginar/ordenar y al guardar. Detalles/formularios mantienen el listado, cursor y foco; sin diálogos nativos. El reintento de la página solicita datos nuevos.

### Archivos, verificaciones y evidencias

Servicios comentados en `src/lib/servicios/compras.ts`, validaciones/tipos en `src/lib/validaciones/compra.ts` y `src/lib/tipos/compra.ts`, interfaz en `src/components/compras/compras.tsx`, rutas/actions/loading/error en `/compras` y confirmación compartida `src/components/alertas/confirmar-accion.tsx`.

`tests/compras.integration.ts` verifica Decimal/fracciones, creación concurrente con misma clave, duplicados, no modificación de stock, precio inmutable, versión, bloqueo tras recepción, cierre/estado, paginación y eliminación con historial. Exige copia local `mtx_validacion_*`; por defecto retira sus fixtures. `COMPRAS_FIXTURE_PATH` permite conservarlos en esa copia para navegador y exige retirar el clon al cerrar.

Chromium verificó Crear/Ver/Editar, filtro/paginación/orden, teclado en selectores, confirmación, precio readonly, descarte y conservación de datos ante duplicado, foco, estado vacío/actualizar/limpiar, escritorio/móvil sin desbordamiento y cursor. La prueba adicional de historial comprobó motivos/cantidades, bloqueo tras recibir y eliminación lógica. El flujo principal pasó también en Next.js dev con `NODE_OPTIONS=--throw-deprecation`, sin errores de consola.

Respaldos/evidencias en `/home/metaltux/Proyectos/mtx-metal-erp/backups/20261007_143849_modulo_compras/`: originales con SHA-256, dump PostgreSQL, resultados/scripts de integración y navegador, capturas y comparación de datos reales. ESLint, tipos y build aprobados. Las 25 tablas originales conservan conteos y huellas; sólo se escribieron fixtures en copia. Servidores/copia retirados, 3030 y 3031 libres. No se cambiaron esquema, migraciones, dependencias del proyecto ni GUIA-INTERFAZ en esta entrega.


## Entrega del 07-10-2026: etapa 5, recepciones de Compras

Continuación autorizada por el usuario. Se incorpora la acción **Recibir** sobre el listado: fecha de recepción en Santiago, observación opcional, bodega fija, pendiente por línea y cantidad en la presentación comprada. Una línea vacía se omite; cero, negativos, cantidades superiores al pendiente y equivalencias que requieren redondear se rechazan. La confirmación reutilizable muestra cantidades y equivalencias antes de escribir. Descarte, errores y reintentos conservan los datos; el foco vuelve a la acción al finalizar el refresco.

`recibirCompra` usa `Prisma.Decimal`, factor histórico y validación del servidor. Bloquea compra, materiales en orden ascendente y saldos en orden estable. Los incrementos de varias líneas del mismo material se acumulan para comprobar el límite del saldo. En una sola transacción registra recepción/detalles, actualiza `WarehouseStock`, crea entradas vinculadas a detalle de compra y recepción, incrementa versión y guarda `PurchaseOperation`. Conserva `minStock`, precios y factores; no cambia unidades ni movimientos anteriores. Los pendientes se derivan de comprado menos recibido y cerrado.

La operación reutiliza UUID y huella del contenido normalizado (incluida la versión original); verifica un reintento antes del control de versión, también después de esperar el bloqueo. Repetir una solicitud exitosa no duplica inventario. Reutilizar su UUID con otro contenido se rechaza. Dos solicitudes distintas sobre una versión producen una recepción y un aviso de actualización. Un error SQL revierte todos los cambios.

- [x] Respaldo de archivos afectados y dump PostgreSQL antes de modificar.
- [x] Formulario y confirmación sobre el listado, escritorio y móvil, sin diálogos nativos.
- [x] Recepción de una parte o algunas líneas, seguida de recepción completa y deshabilitación al agotar pendientes.
- [x] Idempotencia simultánea, control de versión, primera creación concurrente de saldo y varias presentaciones del mismo material.
- [x] Rechazo de sobre-recepción, cero/negativos, línea ajena/repetida, equivalencia inexacta, compra anulada/cerrada y saldo fuera de precisión.
- [x] Conservación de mínimos, precio/factor histórico y bloqueo de cambio de unidad en el mantenedor.
- [x] Fallo SQL inducido al crear el movimiento después de actualizar stock: rollback de saldo, recepción y operación.
- [x] Invariante de stock frente a movimientos por material/bodega y regresiones de Compras e Inventario.
- [x] ESLint, TypeScript y compilación de producción.
- [x] Chromium: confirmación previa sin escritura, parcial/completa, descarte, foco, edición bloqueada y entradas consultables en Stock/Kardex; desarrollo con `--throw-deprecation`, sin errores.
- [x] Datos reales comparados antes/después sin cambios; servidores propios y copia temporal retirados; puertos 3030/3031 libres.
- [x] Revisión funcional del usuario en `/compras`. Aprobado por el usuario el 07-10-2026; las nuevas ayudas se revisan por separado.

**Siguiente etapa:** cierre de pendientes con motivo y anulación completa con controles de consumo/salidas y movimientos compensatorios (etapa 6). No se marca el cierre global de la etapa 7: aún incluye pruebas de estas operaciones pendientes.

No se modifica Prisma, migraciones, dependencias ni la guía visual: se utiliza la estructura aplicada en la entrega anterior. Las pruebas sólo escriben en una copia local descartable. El error SQL provocado y los conflictos de duplicado de las pruebas negativas son evidencias esperadas de validación, no fallos de la entrega.

Respaldos y evidencias: `/home/metaltux/Proyectos/mtx-metal-erp/backups/20261007_153206_recepciones_compras`: originales y huellas SHA-256, `database.dump`, huellas de las 25 tablas reales, resultados de integración, scripts de navegador, capturas y logs del servidor de validación.


## Entrega del 07-10-2026: cierre de pendientes y anulación (etapa 6)

**Estado del hito: desarrollo y validación técnica completos; revisión funcional del usuario pendiente.** Se autorizó explícitamente bloquear la estructura desde el primer cierre, incluso sin recepciones: proveedor, documento, bodega y líneas quedan fijos; la fecha sigue editable. La regla se aplica en servicio y formulario.

**Cerrar pendiente** permite seleccionar una línea con búsqueda interna y cerrar todo su restante, con motivo y confirmación reutilizable. Para cerrar todas las líneas se repite la operación sobre cada pendiente. El servidor calcula comprado menos recibido y previamente cerrado bajo bloqueo de compra; conserva cantidad comprada, precio y factor, registra historial/cantidad cerrada y versión, sin alterar stock ni Kardex. Un UUID y huella vinculan el resultado para reintentos. Lo cerrado ya no se puede recibir.

**Anular compra** exige motivo y confirmación para todo el documento. Bloquea compra, materiales ascendentes y saldos ordenados; comprueba cada recepción contra su entrada y origen exactos. Para cada material/bodega rechaza salidas o ajustes negativos posteriores a la primera entrada de esa compra, aunque exista reposición; comprueba saldo suficiente y concordancia con Kardex. Usa el ID creciente de `StockMovement` como orden de registro bajo bloqueo, no `date` manual ni `createdAt` de transacciones iniciadas antes. Los futuros servicios de consumo/traslado deben conservar el contrato: bloquear material/saldo antes de insertar movimientos, sin reutilizar ni editar IDs históricos.

Sólo se revierte lo recibido: decrementos de stock y un AJUSTE negativo por detalle recibido, con `reversedReceiptDetailId`, fecha actual y motivo. Se conservan entradas, recepciones, cierres y documento. Anulación/versión/operación se guardan junto con movimientos y saldos en una transacción; reintentos no duplican ajustes. Si no hubo recepción, anular no genera movimientos ni crea saldos. No se expone reversión individual ni deshacer anulación.

La eliminación lógica existente ya puede usarse después de anular. Conserva identidad única e historial; la compra desaparece del listado sin liberar proveedor/tipo/número. Las consultas mantienen recibido/cerrado históricos y muestran pendiente efectivo cero para anuladas. El foco vuelve a Ver cuando una acción completada queda deshabilitada.

- [x] Respaldo previo de archivos y PostgreSQL, con originales y SHA-256.
- [x] Cierre parcial del documento por línea, motivo, confirmación e historial; recepción restante bloqueada.
- [x] Bloqueo estructural desde primer cierre y fecha editable, conforme a respuesta explícita.
- [x] Anulación sin recepción y con recepción parcial/cierre; sólo reversión de cantidades recibidas, conservando mínimos.
- [x] Bloqueo por consumo/ajuste negativo, fechas retroactivas y reposición posterior.
- [x] Rechazo de saldo insuficiente o inconsistente; saldo inicial con ajuste previo conservado sin inventar correcciones.
- [x] Idempotencia simultánea, carrera recepción/anulación y rollback SQL inducido tras descontar stock.
- [x] Eliminación posterior lógica, identidad reservada e historial completo.
- [x] Integración de Compras, recepciones, cierre/anulación, restricciones PostgreSQL y consultas Inventario con `--throw-deprecation`.
- [x] Chromium escritorio/móvil: selector buscable, confirmación sin escritura previa, bloqueo conserva datos, descarte, historial, foco tras anular, eliminación y ajuste visible en Kardex; sin errores ni diálogos nativos.
- [x] ESLint, TypeScript, build y revisión del diff.
- [x] Las 25 tablas reales conservan conteos/huellas. Servidor propio detenido, copia retirada y 3030/3031 libres.
- [x] Revisión funcional y aprobación final del usuario. Aprobado por el usuario el 07-10-2026; las nuevas ayudas se revisan por separado.

Pruebas nuevas: `tests/compras-cierre.integration.ts`, exclusivamente sobre copia local descartable. Los fallos SQL inducidos y duplicados rechazados son resultados esperados. No se modificaron esquema, migraciones, dependencias ni `GUIA-INTERFAZ.md`. No se realizaron escrituras ficticias en la base real.

Evidencias y respaldo: `/home/metaltux/Proyectos/mtx-metal-erp/backups/20261007_160647_cierre_compras`, con dump PostgreSQL, archivos originales, huellas antes/después, resultados de integración, script/capturas Chromium y log del servidor. **Siguiente paso:** revisión del usuario en `/compras`; después puede declararse cerrado el Hito de Compras y planificar mínimos/ajustes de inventario.


## Mejora del 07-10-2026: claridad del detalle, ayudas y autocompletado

Cambio solicitado por el usuario después de probar el registro. No cambia la estructura de Prisma ni las reglas del hito.

- [x] Etiquetas: **Presentación de compra**, **Cantidad de presentaciones**, **Unidades del material por presentación** y **Precio por presentación**.
- [x] Ícono “i” de ayuda en cada campo del registro (cabecera y detalle), mediante `AyudaCampo` reutilizable. Se abre con clic, teclado o toque; no depende de hover.
- [x] `TextoAutocompletable` reutilizable: filtra presentaciones guardadas mientras se escribe, ignorando mayúsculas y acentos; muestra hasta ocho coincidencias. Admite elegir con flechas/Enter o toque y escribir un nombre nuevo. Escape cierra sólo sugerencias; Tab mantiene navegación normal.
- [x] Nombres históricos agrupados en PostgreSQL, sin cargar líneas completas. Se eliminan duplicados por mayúsculas/espacios en las opciones; no se reescriben los documentos.
- [x] La sugerencia completa **sólo el nombre de presentación**: no cambia material, cantidad, factor ni precio. Se utilizan nombres de compras existentes, incluso históricas; no se crea un mantenedor de presentaciones.
- [x] Equivalencia visible al editar: `3 Caja × 20 un = 60 un`. Se calcula en servidor con `Prisma.Decimal`, con espera de 350 ms al escribir y descarte de respuestas anteriores. Valores inexactos muestran aviso; guardar vuelve a validar.
- [x] Ayudas con ejemplos de compra por unidad (`contenido 1`) y por caja (`contenido 20`), precio histórico e ingreso de stock mediante Recibir.
- [x] Respaldo de archivos/PostgreSQL y comparación de las 25 tablas reales sin cambios.
- [x] ESLint, TypeScript y build; regresión de Compras y prueba de sugerencias/equivalencias.
- [x] Chromium escritorio/móvil: diez ayudas por compra de una línea, selección por teclado/táctil, Escape, presentación nueva y reutilización posterior, equivalencia, crear/ver/editar, cursor y ausencia de errores/diálogos nativos.
- [x] Servidor de prueba 3031 detenido y copia retirada. Se conservó el servidor del usuario en **3030**, PID 28631, encontrado antes de validar.
- [x] Revisión funcional del usuario; aprobación final del hito sigue pendiente. Aprobado por el usuario el 07-10-2026; las nuevas ayudas se revisan por separado.

Ejemplos de uso: compra de 10 unidades a $2.500 → presentación Unidad, cantidad 10, contenido 1 y precio 2500; compra de 3 cajas de 20 unidades a $50.000 → presentación Caja, cantidad 3, contenido 20 y precio 50000. Guardar registra el documento; Recibir ingresa el material al stock.

Respaldos/evidencias: `/home/metaltux/Proyectos/mtx-metal-erp/backups/20261007_173927_ayudas_compras`. Tests: `tests/compras-ayudas.integration.ts` (sólo lectura sobre copia) y regresión `tests/compras.integration.ts`; scripts/capturas Chromium y huellas de datos reales. El duplicado provocado por la regresión genera un error SQL esperado, devuelto como aviso controlado.


## Mejora del 07-10-2026: ayudas del listado y explicación del cierre

El usuario confirmó que el resto de Compras está validado y funciona correctamente. Se registra esa aprobación sin dar por revisadas las ayudas nuevas.

- [x] Respaldar archivos antes de modificar: `backups/20261007_222449_tooltips_compras`.
- [x] Incorporar `BotonConAyuda` reutilizable con tooltip para ratón y foco de teclado; también permite consultar acciones deshabilitadas.
- [x] Agregar ayudas a Ver, Editar, Recibir, Cerrar pendiente, Anular, Eliminar, Actualizar, Crear, filtros, orden y paginación. La tabla compartida activa estas ayudas opcionalmente para Compras.
- [x] Explicar el cierre en un aviso informativo dentro del formulario: cuándo usarlo, ejemplo de 10 cajas compradas/7 recibidas/3 cerradas, cierre de todo el restante de una línea, motivo, conservación del historial y ausencia de cambios en stock.
- [x] Informar que lo cerrado no podrá recibirse y que el primer cierre bloquea la estructura de la compra.
- [x] Registrar aprobación funcional explícita del usuario para las funcionalidades previas de Compras.
- [x] ESLint, TypeScript y compilación de producción correctos; revisión del diff sin errores.
- [x] Chromium: tooltip de Crear compra visible con ratón y foco de teclado, sin guardar datos.
- [ ] Comprobación visual del formulario de cierre: no había compras con pendiente disponible en la consulta de validación.
- [x] No se iniciaron servidores propios. Se conserva el servidor previo del usuario en 3030 (PID 61346); 3031 libre.
- [ ] Revisión visual del usuario de las nuevas ayudas.

Sin cambios de Prisma, migraciones, reglas de negocio ni escrituras en PostgreSQL.
