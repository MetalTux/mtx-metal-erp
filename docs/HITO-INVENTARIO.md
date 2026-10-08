# Hito: Inventario — mínimos, ajustes y traslados

Fecha: 07-10-2026 (Chile). **Estado: etapa 1 de mínimos implementada, validada y aprobada funcionalmente por el usuario; ajustes/carga inicial implementados, validados y aprobados funcionalmente por el usuario; traslados implementados y validados técnicamente; revisión funcional pendiente.** El usuario aprobó configurar combinaciones nuevas con saldo cero y avisos/filtro de reposición sólo en Stock, y autorizó implementar esa etapa. Ajustes y carga inicial cuentan con reglas aprobadas. Las cinco decisiones de traslados fueron aprobadas explícitamente por el usuario.

Referencias: [Compras](HITO-COMPRAS.md), [propuestas de dominio](PROPUESTAS-DOMINIO.md), [mantenedores](MANTENEDORES-DATOS.md), [guía de interfaz](GUIA-INTERFAZ.md), [avances de interfaz](AVANCES-INTERFAZ.md), `AGENTS.md`, `prisma/schema.prisma`, `src/lib/consultas/inventario.ts` y `src/lib/servicios/compras.ts`.

## Objetivo y orden

Completar el control básico del inventario: determinar cuándo reponer, registrar diferencias reales y distribuir materiales entre bodegas con trazabilidad. Orden recomendado: **mínimos → ajustes/carga inicial → traslados → validación y aprobación funcional**. Ventas, producción y cobranza conservan sus propios hitos posteriores.

Cada etapa se implementa y revisa antes de continuar. Los checks representan trabajo efectivamente realizado y validado; una propuesta no se marca como implementada.

## Punto de partida verificado

- [x] Revisar esquema y documentación de inventario/Compras.
- [x] Identificar `WarehouseStock`: saldo y mínimo opcional por combinación única de material/bodega, con `updatedAt`.
- [x] Identificar `StockMovement`: cantidad con signo, fecha manual, fecha de registro y orígenes de compra/trabajo/recepción/reversión.
- [x] Identificar consultas existentes de Stock/Kardex: filtros, selectores buscables, paginación y orden en PostgreSQL; lecturas sin escrituras.
- [x] Identificar integración de Compras implementada: recepciones generan stock/entradas; anulación registra ajustes compensatorios.
- [x] Registrar revisión parcial del usuario: compra → recepción → Stock → Movimientos funciona en su ejercicio. No equivale a aprobación final de todos los casos de Compras.
- [x] Identificar pendientes iniciales: edición de mínimos y filtro de reposición (implementados en esta entrega); ajustes manuales y carga inicial implementados después; traslados implementados después, pendientes de aprobación funcional.
- [x] Confirmar que el esquema actual no tiene documento de traslado ni operación genérica idempotente de inventario. `PurchaseOperation` pertenece a Compras y no se reutilizará para estos procesos.

El mínimo admite `null` y cero; su CHECK SQL rechaza negativos y `NaN`. Cantidades usan `Decimal(14,3)`. Cambiar mínimo no cambia saldo ni genera movimiento. El esquema actual no impone una política global de saldo no negativo: esa decisión debe resolverse antes de desarrollar salidas manuales.

## Decisiones a revisar con el usuario

Mínimos, reposición y reglas principales de ajustes/carga inicial fueron **aprobados**. La tabla distingue decisiones pendientes y reglas existentes. Preguntar al abordar su etapa y esperar respuesta; no resolver por silencio ni por tiempo transcurrido.

| Punto | Base existente o recomendación | Estado |
| --- | --- | --- |
| Ubicación y límite del mínimo | Por material/bodega; `null` sin configurar, cero válido; stock bajo cuando saldo < mínimo, no cuando es igual | Regla existente |
| Combinaciones monitoreadas | Recomiendo configurar sólo material/bodega donde se espera mantener existencias; permitir elegir una combinación sin stock y crear saldo cero al configurar el mínimo | Aprobado e implementado |
| Alerta de reposición | Recomiendo alerta visual y filtro dentro de Stock; dejar campana, notificaciones externas y Dashboard para ampliación posterior | Aprobado e implementado |
| Saldos negativos | Bloquear operaciones que dejen saldo negativo; mostrar incidencias existentes sin corrección automática | Aprobado |
| Forma de ajustar | Ingresar cantidad física final; calcular diferencia en servidor y confirmar saldo anterior/final/diferencia, con control concurrente | Aprobado |
| Carga inicial | Sólo sin movimientos previos para material/bodega; una fila cero creada para mínimos no impide la carga. Sin compra/proveedor ficticio | Aprobado |
| Motivos | Ajustes: enum interno fijo y observación obligatoria. Inventario inicial: motivo automático. No crear mantenedor | Aprobado para ajustes; traslados con motivo fijo y observación obligatoria |
| Fecha de operaciones | Ajustes/carga inicial: fecha actual o pasada; rechazar futuro según calendario de Santiago. Registro automático | Aprobado; también fecha actual/pasada sin futuro en traslados |
| Traslado | Inmediato entre dos bodegas distintas, un material por documento, sin recepción posterior ni tránsito | Aprobado |
| Correcciones de operaciones | Incluir ajustes nuevos vinculados al registro corregido, conservando historial. Usar nuevo conteo físico actual para calcular la diferencia | Aprobado: nuevo conteo actual vinculado; sin reversión exacta |
| Resumen de reposición | Si se incorpora: contar materiales distintos y combinaciones afectadas por separado, sin sumar cantidades de unidades diferentes | Regla de cálculo propuesta; alcance pendiente |

## Reglas comunes obligatorias

- Mantener la unidad del material; no convertir metros a unidades, kilos a metros ni presentaciones de compra entre sí. El traslado mueve cantidad de inventario, no cajas de una compra.
- Calcular con `Prisma.Decimal`, máximo tres decimales, sin `number` para cantidades. Validar límites de saldo y movimiento; no redondear cantidades inválidas silenciosamente.
- Todo cambio de saldo crea sus movimientos dentro de la misma transacción usando el mismo cliente. Mínimos son la excepción: configuración sin movimiento.
- Conservar saldo = suma de cantidades con signo del Kardex para cada material/bodega. Detectar diferencias existentes; nunca inventar ajustes para cuadrarlas automáticamente.
- No editar/borrar movimientos históricos ni cambiar los orígenes de Compras. Preservar precios/factores, cierres e identidades documentales.
- Coordinar bloqueos con Compras: materiales ascendentes → filas de stock ordenadas por ID; si un proceso también bloquea compra, hacerlo antes de materiales. Resolver creación simultánea del primer saldo bajo bloqueo de material.
- Insertar movimientos después de adquirir los bloqueos. Su ID establece el orden de registro usado por la anulación de Compras; la fecha manual no modifica ese orden. No reutilizar IDs.
- Una salida por traslado o un ajuste negativo posterior bloquearán la anulación de compras recibidas en esa combinación, incluso tras reposición. Explicarlo en confirmaciones y validar la regresión.
- No ejecutar consultas paralelas sobre un mismo cliente de transacción. Usar la instancia compartida de Prisma y mantener consultas/escrituras en servidor.
- Idempotencia de operaciones con movimientos: UUID estable, huella del contenido normalizado y resultado persistido atómicamente. Mismo UUID/contenido devuelve resultado previo; contenido diferente se rechaza; reconocer reintento antes de rechazar versión vencida.
- Formularios sobre el listado, componentes reutilizables para confirmación/avisos/descarte, ayudas “i”, botones con cursor y foco accesible. Ningún diálogo nativo de JavaScript.
- Selectores de material/bodegas con búsqueda interna y teclado; cifras como texto decimal en cliente, formato chileno y días completos de Santiago.
- Mostrar revisión funcional pendiente hasta contar con respuesta explícita. Autenticación y permisos siguen pendientes; no presentar estas operaciones como restringidas por roles ya implementados.

## Etapa 0 — definición y preparación

- [x] Revisar/aprobar decisiones de mínimos para comenzar la primera entrega.
- [x] Registrar aprobación de mínimos antes de implementar sus funciones.
- [x] Registrar respuestas de ajustes/carga inicial antes de implementar funciones dependientes.
- [x] Registrar respuestas de traslados antes de implementar esa etapa.
- [ ] Mantener visible la revisión pendiente de cierre/anulación/recepción parcial de Compras; registrar su aprobación cuando corresponda.
- [x] Revisar estado de git, archivos y destino PostgreSQL antes de editar.
- [x] Respaldar cada archivo existente que se modifique; respaldar PostgreSQL antes de cambios de datos/esquema.
- [x] Definir fixtures, copia local descartable y evidencia de datos reales antes/después.
- [x] Registrar implementación/decisiones en CAMBIOS y avances de interfaz, enlazando este documento.

**Revisión:** alcance concreto de la primera entrega y decisiones necesarias resueltas; ningún proceso de stock iniciado por defecto.

## Etapa 1 — configuración de mínimos

### Servicio y datos

- [x] Reutilizar `WarehouseStock.minStock` y preservar CHECK/índice único; no migrar únicamente para habilitar su edición.
- [x] Validar mínimo opcional, no negativo, distinto de `NaN`, escala y límite de `Decimal(14,3)`; normalizar coma decimal.
- [x] Guardar mínimo sin modificar cantidad, otros datos de stock ni Kardex; quitar configuración equivale a `null`, no cero.
- [x] Resolver control de versión de la configuración (token `updatedAt` o versión explícita si se justifica): formulario antiguo no sobrescribe cambios; reportar conflictos.
- [x] Si se aprueba configurar combinación nueva, crear únicamente saldo cero y mínimo, con bloqueo/unicidad y sin movimiento ficticio.
- [x] No crear filas al consultar ni desplegar el producto cartesiano de materiales y bodegas.
- [x] Definir comportamiento al quitar mínimo de una fila cero: conservar historial/referencias; no borrar stock automáticamente. Una fila de stock, incluso cero, impide cambiar unidad del material.

### Interfaz y reposición

- [x] Acción **Configurar mínimo** en Stock, formulario con material, unidad, bodega, saldo actual y mínimo.
- [x] Acción para configurar otra combinación sólo si fue aprobada, con selectores buscables.
- [x] Ayuda de `null`, cero, mínimo por bodega y diferencia frente a existencia; validación, errores y descarte reutilizables.
- [x] Derivar estados y filtro en servidor según alcance aprobado; conservar paginación/orden al guardar.
- [x] Distinguir sin mínimo, sin stock, bajo mínimo e incidencia negativa; no sugerir que superar mínimo garantiza materiales suficientes para producción.
- [x] Aplicar reposición sólo al mínimo configurado y saldo menor al mínimo. `saldo=0, mínimo=0` muestra Sin stock, sin alerta de reposición; negativo se destaca como incidencia con tratamiento explícito acordado.
Resumen/KPI diferido, fuera de esta entrega. Si se aprueba después, contará materiales distintos y combinaciones por separado, sin sumar cantidades heterogéneas.

### Validación y revisión

- [x] Probar `null`, cero, positivo, igualdad, saldo inferior, fracciones, límites, negativos/NaN y dos bodegas del mismo material.
- [x] Probar guardados concurrentes y primera combinación creada simultáneamente con una recepción.
- [x] Verificar que cantidades y movimientos quedan intactos al cambiar mínimos y que consultar no escribe.
- [x] Validar formulario/ayudas/búsqueda/teclado/foco en escritorio y móvil.
- [x] Lint/build, comprobaciones de dominio, diff y documentación actualizada.
- [x] Revisión funcional y aprobación del usuario de mínimos antes de continuar (07-10-2026).

## Etapa 2 — diseño de operaciones y estructura necesaria

La estructura de ajustes/carga inicial usa `InventoryAdjustment`, `InventoryOperation` y `InventoryAdjustmentReason`. Traslados requerirá su propio diseño aprobado; no se añaden tablas ni tipos de traslado por anticipado.

- [x] Resolver política de negativos, ajustes, carga inicial, fechas, motivos y correcciones.
- [x] Resolver traslado inmediato o con recepción, una o varias líneas y alcance de reversión/corrección.
- [x] Diseñar documento de ajuste que conserve material, bodega, saldo previo/final, diferencia, fecha y motivo; justificar cada snapshot para auditoría sin crear un segundo saldo vigente.
- [x] Diseñar documento de traslado con origen/destino y cantidad/material (líneas si se aprueban múltiples), y vínculos inequívocos con sus dos movimientos.
- [x] Diseñar operación genérica idempotente y resultado persistido; no usar `PurchaseOperation` ni confiar sólo en botones deshabilitados.
- [x] Distinguir ajustes manuales, inventario inicial y correcciones por documento/motivo enum persistidos en Kardex.
- [x] Incorporar origen de traslado cuando se diseñe esa etapa; conservar referencias de anulación de compra.
- [x] Decidir si se reutilizan ENTRADA/SALIDA/AJUSTE con referencias tipadas; no introducir enums ni nombres de dominio sin revisar el diseño.
- [x] Especificar FK/índices, unicidad, idempotencia, CHECK SQL y conservación histórica para ajustes/carga inicial.
- [x] Especificar restricciones propias de traslados después de sus decisiones.
- [x] Revisar delta fuera de precisión, saldo insuficiente, operación sin cambio y reglas de corrección antes de escribir migración.
- [x] Revisar compatibilidad de movimientos existentes; no asignarles documentos/orígenes inventados ni resetear la base.
- [x] Respaldar esquema y BD; crear migración versionada si hace falta, validar y aplicar en destino autorizado, generar cliente y comprobar restricciones en copia.
- [x] Comparar datos existentes y revisar SQL; actualizar documentación arquitectónica.

**Revisión:** estructura necesaria justificada, reglas resueltas y cambios comprobados; no activar formularios si el servicio aún no protege inventario.

## Etapa 3 — ajustes y carga inicial

- [x] Listado de ajustes con filtros y consulta de detalle; formulario de registro sobre listado, sin CRUD de movimientos históricos.
- [x] Selectores buscables de material/bodega, unidad y saldo actual visibles; motivo y fecha según decisión.
- [x] Si se aprueba conteo físico: usuario ingresa saldo final, servidor calcula diferencia; si saldo cambia desde abrir/revisar, exigir nueva revisión, no aplicar una diferencia antigua.
- [x] Descartar ingreso directo de diferencia: se aprobó ingresar saldo físico final y calcular el signo en servidor.
- [x] Vista previa y confirmación con saldo anterior/final, cantidad/unidad y efecto en anulación de Compras.
- [x] Registrar documento, saldo, AJUSTE con signo y operación idempotente en una transacción; conservar mínimo.
- [x] Rechazar datos fuera de precisión, motivos vacíos, saldo final no permitido y movimiento cero según regla aprobada.
- [x] Implementar carga inicial diferenciada sólo si fue aprobada, validando restricciones de historial sin compras ficticias.
- [x] Implementar corrección compensatoria vinculada si entra en alcance; validar pendientes negativos/consumos posteriores antes de definir reversión automática.
- [x] Invalidar vistas de Stock, Kardex, Compras y mantenedores afectados según referencias.
- [x] Probar ajuste positivo/negativo, conteo sin diferencia, carga inicial, saldo negativo existente y límites, conforme a reglas aprobadas.
- [x] Probar reintentos, UUID con contenido distinto, conflictos de versión, carreras con recepción/anulación y fallo SQL que revierta todo.
- [x] Verificar concordancia saldo/Kardex y que un ajuste negativo posterior bloquea anulación incluso con reposición.
- [x] Lint/build, pruebas de dominio/navegador y documentación de ajustes/carga inicial.
- [x] Revisión funcional del usuario para aprobar ajustes/carga inicial. Aprobado el 07-10-2026.

## Etapa 4 — traslados entre bodegas

- [x] Listado filtrable y consulta de traslado con trazabilidad a ambas bodegas y movimientos.
- [x] Formulario sobre listado: material, unidad, origen, destino, cantidad, motivo/fecha según decisión; selectores buscables y ayudas.
- [x] Rechazar origen=destino, cantidad no positiva/inexacta/fuera de precisión y referencias inexistentes.
- [x] Mostrar saldo disponible en origen y previsión de saldos en origen/destino antes de confirmar; releer bajo bloqueos al guardar.
- [x] Bloquear material y ambas filas de stock en orden común, incluida creación concurrente de destino.
- [x] Validar saldo suficiente según política acordada y límite del destino; conservar mínimos independientes de ambas bodegas.
- [x] Registrar documento, salida negativa en origen, entrada positiva en destino y operación idempotente en la misma transacción.
- [x] No asociar el traslado a una recepción de compra como si fuera otra compra; conservar trazabilidad mediante su documento propio.
- [x] Confirmar alcance de un material por documento; no implementar múltiples líneas.
- [x] Confirmar traslado inmediato; tránsito/recepción posterior quedan fuera del alcance aprobado.
- [x] Implementar correcciones únicamente bajo reglas aprobadas, con operaciones nuevas y vínculo histórico, sin editar pares de movimientos.
- [x] Probar traslado parcial/total, origen vacío, destino nuevo, mínimo distinto, fracciones y conservación de cantidad por material entre bodegas.
- [x] Probar traslados simultáneos/opuestos, recepción concurrente, doble envío/reintento, errores de escritura y saldo insuficiente sin salidas huérfanas.
- [x] Verificar que traslado posterior bloquea anulación de la compra de origen; mover de regreso no desbloquea su historia.
- [x] Lint/build y pruebas de dominio/navegador de Traslados.
- [ ] Revisión funcional del usuario para aprobar Traslados.

## Etapa 5 — integración, validación y cierre

- [x] Ejecutar regresiones de Compras y Stock/Kardex, con orígenes de ajuste/traslado y fechas de Santiago, sin deprecaciones de pg.
- [x] Verificar historial, mínimos, idempotencia y saldo/Kardex de cada combinación; separar diferencias previas de cambios nuevos.
- [ ] Comprobar que se respeta el bloqueo de cambio de unidad del material y la protección de bodegas/materiales referenciados.
- [ ] Validar filtros, orden, paginación, estado vacío, errores de conexión, pérdida de red, doble clic y formulario desactualizado.
- [x] Validar teclado, foco, ayudas “i”, cursor, contraste, escritorio/móvil y ausencia de diálogos nativos.
- [x] Verificar que Dashboard/campana/métricas no afirmen funciones fuera del alcance aprobado; indicadores opcionales requieren consultas agregadas reales.
- [x] Comparar datos originales antes/después; escribir fixtures sólo en copia PostgreSQL descartable.
- [x] Detener sólo servidores propios y comprobar sus puertos libres; conservar servidores previos del usuario y reportarlos. Retirar copia de pruebas.
- [x] Revisar diff y respaldos; documentar comandos realmente ejecutados, evidencia, decisiones y limitaciones.
- [ ] Obtener aprobación funcional explícita y marcar el hito cerrado.
- [ ] Actualizar checkpoints y planificar el siguiente hito de Cotizaciones/Órdenes de venta.

## Fuera del alcance salvo ampliación explícita

Reservas para producción, requerimientos frente a stock, conversiones entre unidades, valorización/costo promedio/FIFO, lotes/series, ubicaciones internas, impuestos/contabilidad, inventarios masivos/importaciones, alertas por correo, automatización de reposición y autenticación/roles. Las propuestas de Dashboard y notificaciones no se implementan por leer la guía.

## Seguimiento de esta planificación

- [x] Crear documento con estado real, etapas, decisiones, validaciones y revisión por etapa.
- [x] Contrastar modelos, restricciones y consultas actuales con referencias del proyecto.
- [x] Revisar decisiones de la etapa 1 con el usuario.
- [x] Obtener autorización para empezar implementación de mínimos.
- [x] Implementar y validar la etapa 1 aprobada; actualizar sus checks.
- [x] Revisar funcionalmente la etapa 1: el usuario confirmó «Validado, continuemos» (07-10-2026).
- [x] Resolver decisiones antes de implementar ajustes/carga inicial.
- [x] Resolver decisiones antes de implementar traslados.

La preparación inicial fue sólo documental. La etapa 1 se implementó después de aprobarse sus decisiones; las etapas siguientes conservan sus pendientes explícitos.


## Entrega del 07-10-2026 — mínimos por material y bodega

**Implementado:** Inventario → Stock por bodega incorpora acción de fila **Mínimo** y botón **Configurar mínimo** para elegir otra combinación. Ambos abren formulario sobre el listado, consultan datos frescos sin escrituras, muestran unidad/existencias/mínimo y emplean selectores buscables y ayudas “i”. Vacío quita la configuración; cero es válido. Quitar un mínimo existente exige confirmación reutilizable; errores/descarte conservan datos y el foco vuelve al listado.

El servicio `src/lib/servicios/minimos-inventario.ts` bloquea material y fila de stock, relee datos y sólo escribe `minStock`. El token combina ID, `updatedAt` y mínimo anterior; una versión antigua que intenta un valor diferente recibe conflicto, sin sobrescribir. Repetir el valor ya vigente es un no-op sin cambiar timestamp. Una combinación nueva se crea con cantidad cero sólo al guardar un mínimo configurado; vacío sin fila es no-op. No se borran filas al quitar mínimo. Una recepción simultánea puede crear la fila antes: configurar conserva sus existencias y no reemplaza otro mínimo ya configurado.

La lectura del catálogo incluye `unitMeasureId` para que consultar/guardar rechacen una unidad cambiada desde cargar opciones. Crear stock cero conserva la regla del mantenedor que impide cambiar unidades de materiales referenciados. No se modifica Prisma, restricciones SQL, migraciones ni datos de Compras.

La tabla muestra **Situación** derivada con Decimal: Sin mínimo configurado, Sin stock, Stock bajo, Sobre el mínimo o Saldo negativo: revisar. La indicación **Requiere reposición** usa mínimo configurado y saldo menor al mínimo; igualdad y saldo cero con mínimo cero no alertan. Los negativos existentes son incidencias; si tienen mínimo y cumplen el criterio también aparecen en reposición, sin que ello apruebe producir saldos negativos.

El filtro **Mostrar existencias → Requieren reposición** compara columnas en PostgreSQL y se aplica tanto a total como a filas, antes de paginar. Se conservan filtros/orden/página al guardar y se ajusta una página vacía. No se incorporan KPI, Dashboard, campana, ajustes ni traslados.

- [x] Respaldo previo de archivos/PostgreSQL y comparación de las 25 tablas reales sin cambios.
- [x] Mínimos `null`/cero/fracciones/límite, rechazo de negativos/NaN/precisión excesiva, valores independientes por bodega.
- [x] Estado derivado, igualdad sin alerta, negativos visibles, filtro SQL con total/paginación y consultas sin escrituras.
- [x] Reintentos inocuos, conflictos simultáneos, referencias inválidas, unidad protegida y primera configuración concurrente con recepción sin perder saldo.
- [x] Chromium: modificar/quitar con confirmación, nueva combinación sólo al guardar, búsquedas/teclado, ayudas, conflicto conserva formulario, descarte, foco/cursor y escritorio/móvil. Ajustado ancho mínimo del formulario; controles dentro del diálogo incluso con nombres largos.
- [x] ESLint, TypeScript, build y regresiones `tests/inventario.integration.ts` y `tests/compras.integration.ts`.
- [x] Servidor de prueba detenido y copia retirada; 3031 libre. Servidor previo del usuario en 3030 (PID 28631) conservado.
- [x] Revisión funcional del usuario en `/inventario/stock`, confirmada el 07-10-2026.

Prueba específica: `tests/minimos-inventario.integration.ts`, sólo sobre copia local `mtx_validacion_minimos_*`; nunca crear fixtures en la base real. Los duplicados de Compras provocados por la regresión son rechazos esperados, no fallos de entrega.

Respaldos/evidencias en `/home/metaltux/Proyectos/mtx-metal-erp/backups/20261007_181843_minimos_inventario`: archivos originales/SHA-256, dump PostgreSQL, huellas de tablas antes/después, resultados de integración, scripts/capturas de navegador y log del servidor. **Siguiente paso:** acordar negativos, forma de ajustar, inventario inicial, motivos, fechas y correcciones de la etapa 2 antes de modificar esquema o servicios. No se adoptan respuestas por defecto.

## 07-10-2026 — aprobación y continuación

El usuario confirmó «Validado, continuemos». Se cierra la revisión funcional de mínimos; esta aprobación no cierra el Hito completo de Inventario ni las revisiones pendientes de Compras. La siguiente entrega corresponde a la estructura y los servicios de ajustes/carga inicial, tras resolver sus decisiones de negocio. Traslados mantiene su etapa posterior.

- [x] Registrar aprobación funcional de mínimos y actualizar avances de interfaz.
- [x] Obtener respuestas explícitas sobre ajustes/carga inicial.
- [x] Respaldar archivos y PostgreSQL antes de implementar los cambios aprobados.
- [x] Implementar estructura y funcionalidades de ajustes/carga inicial de etapas 2 y 3.
- [x] Aprobar funcionalmente la entrega antes de comenzar traslados. Aprobado el 07-10-2026.

## 07-10-2026 — reglas aprobadas de ajustes y carga inicial

El usuario aprobó bloqueo de saldo negativo, conteo físico final, carga inicial sólo sin movimientos, fechas sin futuro y correcciones vinculadas con historial intacto. También aprobó lista fija de motivos con observación obligatoria y su representación mediante enum de Prisma.

Enum implementado `InventoryAdjustmentReason`: `CONTEO_FISICO`, `MERMA_PERDIDA`, `DETERIORO_DANO`, `CORRECCION_REGISTRO`, `OTRO`, `INVENTARIO_INICIAL`. Las etiquetas visibles estarán en español. El último valor se asigna sólo en carga inicial; no es seleccionable para ajustes ordinarios.

- [x] Registrar respuestas explícitas y motivos aprobados.
- [x] Conteo sin diferencia aprobado: informar y no generar documento, movimiento ni operación.
- [x] Corrección aprobada: nuevo conteo actual vinculado, sin reversión exacta del ajuste anterior.
- [x] Diseñar y respaldar esquema, migración y servicios con las precisiones aprobadas.

El usuario aprobó explícitamente ambas precisiones antes de implementar. No se adoptan respuestas por defecto. Traslados conserva sus decisiones pendientes y no se implementa con reglas supuestas.


## Entrega del 07-10-2026 — ajustes e inventario inicial

**Ruta:** `/inventario/ajustes`. Listado filtrable por texto, material, bodega, motivo y fechas; orden/paginación en PostgreSQL. Acciones Registrar ajuste, Inventario inicial, Ver y Corregir. No se ofrecen edición/eliminación del historial. Formularios superpuestos, selectores buscables, ayudas “i”, observación obligatoria y confirmación de saldo anterior/final/diferencia.

La migración `20261008003000_ajustes_inventario` se generó comparando el esquema respaldado con el nuevo, se comprobó en copia y se aplicó mediante `prisma migrate deploy` en PostgreSQL local. Estado de migraciones actualizado; Prisma validado y cliente generado. No se resetearon datos ni se ejecutó seed. La nueva columna de origen queda nula en movimientos existentes; las dos tablas nuevas quedan vacías en la base real.

`InventoryAdjustment` guarda evidencia histórica y vínculo de corrección; `InventoryOperation` conserva UUID/huella/resultado junto con sus efectos. FK compuestas impiden mezclar material/bodega y CHECK/trigger verifican diferencia y motivo. Documento y clave idempotente son inmutables. Se conserva la política de stock mínimo y las restricciones anteriores.

El servicio bloquea material y stock, compara versión/saldo/último movimiento y verifica concordancia con Kardex. Cantidad física final no negativa, diferencia con Decimal y movimiento AJUSTE en transacción. Carga inicial exige saldo cero y ausencia de movimientos; una fila de mínimos cero es válida. Conteo sin diferencia informa y no escribe. Corrección calcula desde el saldo actual y conserva vínculo al documento anterior. No existen reversiones automáticas ni movimientos ficticios.

- [x] Respaldo de archivos originales y dump PostgreSQL previo; manifiesto SHA-256.
- [x] SQL revisado, migración comprobada en copia/aplicada localmente, Prisma validate/generate y migrate status.
- [x] Pruebas de precisión, no-op, fechas futuras, carga inicial, mínimos, incidencia negativa, corrección y referencias.
- [x] Pruebas de reintento simultáneo, misma clave/otro contenido, versión vencida y carreras con recepción/anulación sin perder cantidades.
- [x] Documento inmutable, CHECK de diferencia y rollback total ante fallo controlado en movimiento.
- [x] Regresiones de Stock/Kardex y Compras; paginación/total en PostgreSQL.
- [x] Chromium escritorio/móvil: crear, ver, corregir, búsqueda/teclado, ayudas, conflicto conserva conteo, descarte, cursor y origen en Kardex; sin errores ni diálogos nativos.
- [x] ESLint, TypeScript y compilación de producción; diff revisado.
- [x] Comparación de las 25 tablas previas sin cambios de datos (al comparar movimientos se excluye únicamente la columna nueva nula); tablas nuevas vacías.
- [x] Servidor propio detenido: 3031 libre. Servidor previo del usuario 3030/PID 28631 conservado; copia descartable retirada.
- [x] Revisión funcional del usuario de ajustes/carga inicial. Aprobado el 07-10-2026.
- [x] Definir reglas y desarrollar traslados.
- [ ] Aprobar funcionalmente Traslados y completar cierre del Hito de Inventario.

**Respaldo y evidencia:** `backups/20261007_201622_ajustes_inventario`, con archivos originales, dump, huellas antes/después, logs de migración/integración y capturas Chromium. Prueba específica: `tests/ajustes-inventario.integration.ts`; requiere base local `mtx_validacion_ajustes_*`. Rechazos SQL del historial/CHECK y fallo controlado son casos esperados de la prueba.

Para revisar en el servidor de desarrollo previo, reiniciar `pnpm dev` permite cargar el nuevo cliente Prisma compartido. No se detuvo ese proceso del usuario. Traslados, autenticación y Dashboard con indicadores reales mantienen sus pendientes.


## 07-10-2026 — aprobación de ajustes y preparación de traslados

El usuario confirmó «Funcionamiento OK. Continúa con el siguiente punto». Se registra aprobación funcional de ajustes/carga inicial. La siguiente etapa corresponde a traslados entre bodegas; esta confirmación no resuelve las decisiones de negocio que la planificación dejó pendientes.

- [x] Registrar aprobación y actualizar checkpoints.
- [x] Aprobar traslado inmediato o recepción en destino.
- [x] Aprobar uno o varios materiales por documento.
- [x] Definir motivo/observación y fechas de traslado.
- [x] Aprobar mecanismo de corrección vinculado y restricciones de disponibilidad.
- [x] Respaldar y desarrollar estructura, servicio e interfaz tras resolver estas decisiones.

Recomendaciones pendientes: traslado inmediato, un material por documento inicialmente, motivo fijo «Traslado entre bodegas» con observación obligatoria, fecha actual/pasada sin futuro y corrección mediante documento de traslado inverso completo vinculado, sujeto a saldo disponible en la bodega que devuelve el material. El traslado inverso no borra movimientos ni desbloquea la anulación histórica de Compras. No aplicar recomendaciones por silencio.


## 07-10-2026 — reglas aprobadas de traslados

El usuario confirmó «Me parecen bien» para los cinco puntos: traslado inmediato, un material por documento, motivo fijo «Traslado entre bodegas» con observación obligatoria, fecha actual/pasada sin futuro y corrección mediante traslado inverso completo vinculado, con saldo suficiente en la bodega que devuelve. No hay recepción posterior, tránsito ni conversión de unidades.

Cada documento admite una corrección inversa directa, protegida por unicidad; repetir una devolución exige reconocer el documento ya registrado. Si se corrige el inverso, se registra otro documento vinculado a éste y se conserva toda la cadena. Ninguna devolución borra movimientos ni desbloquea la anulación histórica de Compras. Incidencias negativas o saldo distinto al Kardex requieren revisión mediante conteo físico antes de trasladar; no se corrigen automáticamente.


## Entrega del 07-10-2026 — traslados entre bodegas

**Ruta:** `/inventario/traslados`, incorporada al menú Inventario. Listado con texto/material/bodegas/fechas, orden y paginación PostgreSQL. Registrar traslado, Ver y Corregir sobre el listado, con formularios superpuestos, búsqueda en selectores, ayudas “i”, observación obligatoria y confirmación con saldos previstos. El motivo es fijo por tipo de documento, sin catálogo editable ni campo redundante.

`InventoryTransfer` conserva cantidad, fecha calendario, saldos previos/finales de origen/destino y vínculo de corrección. `InventoryOperation` admite exactamente un ajuste o traslado; nuevos tipos TRASLADAR/REVERTIR_TRASLADO. Los dos vínculos del Kardex son únicos y sus FK compuestas aseguran material/bodega correctos. CHECK validan cantidades, saldos, bodegas distintas y orígenes; triggers verifican cantidades, inverso completo, inmutabilidad y existencia del par de movimientos/operación al confirmar. La migración anterior de Ajustes se conserva intacta.

El servicio consulta sin crear stock, valida ambas versiones (ID/timestamp/saldo/último movimiento), bloquea material y stocks por ID ascendente, verifica saldo/Kardex y límites, y escribe documento/saldos/SALIDA/ENTRADA/UUID en la misma transacción. Mínimos independientes intactos; destino inexistente se crea sólo al guardar. Incidencias negativas/descuadres bloquean la operación y requieren revisión, sin ajustes automáticos. Fecha pasada/actual y cantidades exactas en unidad del material.

Corrección mediante nuevo inverso completo vinculado, sólo con saldo suficiente; una corrección directa por documento y cadena histórica conservada. Reintentos se reconocen antes de evaluar versión; UUID con otro contenido se rechaza. Ante resultado incierto, formulario/confirmación conservan UUID y contenido para reintentar. La devolución no elimina el bloqueo histórico de anulación de Compras.

- [x] Respaldo previo de archivos y PostgreSQL; manifiesto SHA-256.
- [x] Prisma validate/generate; migración `20261008010000_traslados_inventario` revisada, probada en copia y aplicada en PostgreSQL local mediante migrate deploy; migrate status actualizado.
- [x] Precisión/fracciones, cantidades inválidas, futuras, origen=destino, saldo insuficiente, límite de destino, negativos previos y descuadre sin escrituras.
- [x] Traslado parcial/total, destino nuevo, mínimos independientes, saldo/Kardex y conservación de cantidades.
- [x] Corrección completa/vínculo, rechazo de parcial/duplicada, documento y movimientos inmutables; par/operación obligatorios al confirmar.
- [x] UUID simultáneo, otra solicitud con misma clave, versión vencida, traslados opuestos y recepción concurrente; fallo de entrada revierte todo.
- [x] Traslado posterior y devolución conservan bloqueo de anulación de compra, aunque se use fecha manual anterior.
- [x] Regresiones de Stock/Kardex, Compras y Ajustes en copias locales; filtros/total/paginación SQL.
- [x] Chromium escritorio/móvil: registrar, ver, corregir, insuficiencia, búsqueda/teclado, ayudas, conflictos, descarte, foco/cursor y origen en Kardex.
- [x] Pérdida simulada de respuesta tras commit y reintento: mismo resultado, sin duplicar saldos/documento/movimientos. Error de red simulado esperado; sin otros errores ni diálogos nativos.
- [x] Corregir retorno de foco tras descartar; callback opcional en confirmaciones compartidas, conservando comportamiento anterior cuando no se proporciona.
- [x] ESLint, TypeScript y build; comparación de 27 tablas previas sin cambios de datos y nueva tabla de traslados vacía en base real.
- [x] Servidor propio detenido y 3031 libre; servidor previo del usuario 3030/PID 61346 conservado. Copias descartables retiradas.
- [ ] Revisión funcional del usuario de Traslados.
- [ ] Completar revisiones restantes de integración y aprobación final del Hito antes de planificar Cotizaciones/Órdenes de venta.

**Respaldos/evidencias:** `backups/20261007_213325_traslados_inventario`: archivos originales/SHA-256, dump, huellas antes/después, logs de migración/integración y capturas Chromium. Prueba específica: `tests/traslados-inventario.integration.ts`, sólo con base local `mtx_validacion_traslados_*`. Ajustes se comprobó en una segunda copia `mtx_validacion_ajustes_*` retirada al terminar.

Una ejecución paralela inicial de las regresiones de Stock y Compras alteró los conteos globales que Compras compara. Se repitió Compras secuencialmente y pasó; no era un fallo del módulo. Ejecutar pruebas que escriben en una misma copia de forma secuencial, o usar copias distintas.

La comparación excluye sólo nuevas columnas nulas `outgoingTransferId`/`incomingTransferId` en movimientos y `transferId` en operaciones; los 27 conjuntos de datos originales permanecen idénticos. No se ejecutó seed ni reset. Para usar el nuevo modelo en el servidor previo, reiniciar `pnpm dev`; no se detuvo ese proceso del usuario. No se modificó GUIA-INTERFAZ ni se desarrollaron módulos de Ventas, Producción o Autenticación.


## 07-10-2026 — corrección de cliente antiguo al abrir Traslados

- [x] Identificar caché global Prisma anterior al modelo InventoryTransfer como causa de `undefined.count`.
- [x] Respaldar archivos antes de modificar; sin migraciones ni escrituras de datos para esta corrección.
- [x] Reutilizar cliente sólo cuando coincide el constructor generado; desconectar el pool sustituido.
- [x] Probar caché heredada, cambio de constructor y reutilización con `tests/prisma-cache.integration.ts`, sin consultas de base.
- [x] Consultar ruta real `/inventario/traslados`: HTTP 200, listado presente y sin el error reportado, conservando servidor del usuario.
- [x] Lint, TypeScript y build aprobados; 3031 libre y servidor previo 3030/PID 61346 conservado.
- [ ] Mantener revisión funcional del usuario de Traslados antes de cerrar el Hito completo.

Respaldo: `backups/20261007_220650_cliente_prisma_hmr`. La corrección permite que HMR sustituya el cliente antiguo cuando carga el constructor recién generado; no reutilizar indefinidamente una instancia de otro esquema. Un reinicio sigue siendo útil si el entorno no observa los archivos generados, pero no fue necesario para recuperar la ruta comprobada en 3030.
