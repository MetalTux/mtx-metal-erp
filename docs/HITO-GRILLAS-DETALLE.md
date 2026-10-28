# Hito — Unificación de grillas de detalle

Fecha de revisión: **27-10-2026**. Estado: **GD0 aprobado por el usuario; GD1 definido; GD2 implementado con pruebas de interacción, revisión funcional y build pendientes**.

El usuario solicita revisar los módulos que todavía muestran bloques repetidos por detalle y documentar los puntos necesarios para unificar su lectura en grillas. El usuario aprobó este documento y los hitos definidos el 27-10-2026, y solicitó comenzar por GD1. Esta aprobación no reemplaza las validaciones funcionales pendientes de otros hitos.

## 1. Resultado de la revisión

Compras ya utiliza grilla y diálogo de detalle. Persisten bloques con campos en recepción de compras, aceptación de OCC, planificación de OT, distribución de materiales/stock, registros de producción y preparación/corrección de guías. También hay consultas de detalles e historiales que se muestran en tarjetas o listas.

No todo `grid` de CSS representa una grilla de detalle: muchos organizan campos de cabecera. Tampoco todo `fieldset` requiere modificación: Recetas y Sucursales ya contienen tablas y diálogos. Se revisó el contenido repetido y sus acciones, además de esos patrones de código.

Esta es una revisión estática de componentes y páginas. No se ejecutó una prueba visual de todos los módulos ni se certificó accesibilidad o comportamiento móvil.

## 2. Patrón funcional propuesto

| Clase de detalle | Interfaz objetivo | Acciones permitidas |
| --- | --- | --- |
| Borrador con filas propias | Grilla de resumen y diálogo de alta/edición | Agregar, Ver, Editar y Quitar con confirmación, según permisos |
| Partidas heredadas de otro documento | Grilla con selección de partidas y edición de cantidades permitidas | Seleccionar y Editar cantidad/datos de ejecución; no inventar ni eliminar partidas del origen |
| Documento confirmado o histórico | Grilla de consulta y diálogo de detalle | Ver y operaciones específicas existentes; sin edición/borrado de historia |
| Distribución por bodega | Subgrilla dentro del detalle de origen | Agregar/editar/quitar distribuciones del borrador, respetando límites y referencias |

Reglas comunes para implementar:

- [ ] Mantener un borrador independiente por detalle; Aceptar aplica a la grilla y Cancelar conserva la fila anterior.
- [ ] Evitar filas vacías permanentes; mostrar estado sin detalles y una acción visible cuando agregar esté permitido.
- [ ] Confirmar descarte de cambios y eliminación de filas; aclarar cuándo se modifica sólo el borrador y cuándo se confirma una operación real.
- [ ] Conservar IDs de filas, UUID de reintento, versiones, vínculos y errores por partida; no identificar documentos por el índice visual de la fila.
- [ ] Validar en servidor importes, cantidades, equivalencias, reservas y permisos antes de confirmar; no duplicar cálculos financieros en el navegador.
- [ ] Mostrar unidad junto a cantidades; no totalizar cantidades de unidades distintas. Los totales monetarios respetan la modalidad histórica y el permiso de precios/costos.
- [ ] Usar acciones con texto o ayuda accesible, cabeceras claras, foco de retorno y navegación con teclado.
- [ ] Definir tabla semántica y comportamiento móvil: desplazamiento horizontal controlado o representación por filas con etiquetas, manteniendo el editor en diálogo.
- [ ] Conservar el contenido de cabecera y otras filas al abrir/cerrar diálogos o dar de alta un catálogo.
- [ ] No habilitar Editar/Quitar genéricos en registros inmutables. Anular, devolver o revertir siguen siendo operaciones propias con sus validaciones.

## 3. Módulos que ya tienen la base del patrón

Estos son estados observados en código, no aprobaciones funcionales nuevas.

| Área | Estado actual | Ajuste eventual |
| --- | --- | --- |
| Compras: documento/factura | Tabla de detalles con Agregar, Ver, Editar, Quitar y alta de materia prima dentro del editor | Usar como referencia reciente; su revisión visual por el usuario sigue pendiente |
| Cotizaciones | Grilla visual de filas construida con CSS, editor de línea en diálogo y confirmación al quitar | Revisar semántica/accesibilidad y alineación con el estándar; no necesita reconstrucción del flujo de detalle |
| Productos: receta | Tabla de materiales, cantidad, unidad y acciones; diálogo de detalle | Reutilizar patrón y comprobar consistencia de textos, foco y descarte |
| Clientes: sucursales | Tabla con acciones y diálogo, incluida Casa Central | Mantener reglas de Casa Central y datos obligatorios; comprobar funcionamiento cuando se crea cliente desde Cotizaciones |
| Empresa: cuentas bancarias | DataTable y formulario en diálogo | Ya tiene patrón tabular; respetar principal y baja/reactivación |
| Listados principales | CRUD básicos, Inventario, Compras, OCC, OT, cuentas por cobrar, Usuarios y Auditoría tienen listados tabulares | Que el listado sea tabular no implica que sus detalles internos también lo sean |
| Guías: consulta de partidas | Tabla de partidas con cantidad, bodega/conformidad y trazabilidad | Mantener consulta inmutable y referencias a movimientos/reservas |

Referencias: [Compras](../src/components/compras/compras.tsx), [Cotizaciones](../src/components/cotizaciones/formulario-cotizacion.tsx), [Receta](../src/components/mantenedores/receta-producto.tsx), [Sucursales](../src/components/mantenedores/sucursales-cliente.tsx), [Cuentas bancarias](../src/components/configuracion/cuentas-bancarias-empresa.tsx), [Consulta de guía](../src/components/guia-despacho/consulta-guia.tsx).

## 4. Puntos de modificación por flujo

Prioridad y complejidad son estimaciones de esta revisión, no compromisos de plazo.

### GD-01 — Recepción de compras

**Prioridad alta · Complejidad media.** Hoy cada material ocupa un bloque con presentación, contenido, pendiente e input de cantidad a recibir.

Fuente: [recepcion-compra.tsx](../src/components/compras/recepcion-compra.tsx), iteración `compra.lines`.

- [x] Sustituir bloques por grilla: material, presentación, comprado, recibido, cerrado, pendiente, cantidad a recibir, equivalencia y acción.
- [x] Editar la cantidad de cada partida en diálogo y mantener visible el conjunto seleccionado para esta recepción.
- [x] Conservar filas de origen; dejar sin selección/cantidad equivale a no recibir esa partida, no a borrar el detalle comprado.
- [x] Deshabilitar recepción sobre pendientes agotados y conservar fecha/observación, previsualización, confirmación e idempotencia.
- [ ] Validar recepción parcial, varias líneas y reintento sin duplicar stock/Kardex.

### GD-02 — OCC: aceptación y consulta

**Prioridad alta · Complejidad media.** La aceptación muestra bloques por línea con checkbox y cantidad aceptada; la consulta muestra tarjetas de cotizado/contratado/no contratado.

Fuentes: [formulario-orden.tsx](../src/components/ordenes-compra-cliente/formulario-orden.tsx) y [ver-orden.tsx](../src/components/ordenes-compra-cliente/ver-orden.tsx).

- [x] Grilla de aceptación: seleccionar, descripción, unidad, cantidad cotizada, cantidad aceptada, precio según modalidad, importe y Editar cantidad.
- [x] Mantener deselección como exclusión del alcance contratado; no eliminar ni agregar partidas ajenas a la cotización.
- [x] Grilla de consulta: cantidad cotizada, contratada, no contratada e importes sólo para roles autorizados.
- [x] Conservar alcance técnico, revisión explícita, descuento proporcional, IVA histórico y deuda única por total contratado.
- [ ] Probar aceptación completa/parcial con precios netos y cotizaciones históricas con IVA incluido.

### GD-03 — OT: líneas del plan

**Prioridad alta · Complejidad alta.** Cada línea es una sección extensa que combina cantidad, modo de ejecución, fabricación, receta, materiales y abastecimiento.

Fuente: [ordenes-trabajo/formulario.tsx](../src/components/ordenes-trabajo/formulario.tsx), iteración `d.lines`.

- [x] Grilla principal: partida, tipo/modo, unidad, cantidad, a fabricar, desde stock, estado de distribución y acciones Ver/Configurar.
- [x] Llevar configuración de una línea a un diálogo, con subgrillas GD-04/GD-05.
- [x] Agregar/quitar líneas sólo donde hoy se permite para obra propia; una OT comercial conserva el origen y las cantidades contratadas de OCC.
- [x] Mantener receta histórica, actualización explícita de receta, revisión de redondeos y motivo de revisión del plan.
- [x] Conservar separación entre Guardar borrador y Confirmar/reservar, faltantes y operaciones inciertas.

### GD-04 — OT: materiales previstos y revisión de receta

**Prioridad alta · Complejidad alta.** Dentro de cada línea hay bloques de necesidad de receta, revisión de redondeos y distribuciones `materials` con bodega/cantidad.

Fuente: [ordenes-trabajo/formulario.tsx](../src/components/ordenes-trabajo/formulario.tsx), `needs`, `roundingReviews` y `l.materials`.

- [x] Subgrilla de necesidad: material, unidad, cantidad exacta, prevista/revisada, diferencia y estado de revisión.
- [x] Diálogo específico para cantidad revisada y motivo cuando el cálculo lo exige; no reducir esa revisión a un campo opcional.
- [x] Subgrilla de distribución: material, bodega, cantidad prevista, disponibilidad y acciones.
- [x] Conservar distintas distribuciones del mismo material por bodega y validación del total necesario.
- [x] Mantener materiales a medida distintos de recetas de catálogo; no regenerar recetas históricas automáticamente.

### GD-05 — OT: abastecimiento desde stock

**Prioridad alta · Complejidad media/alta.** `l.supplies` presenta bloques por distribución de bodega y cantidad.

Fuente: [ordenes-trabajo/formulario.tsx](../src/components/ordenes-trabajo/formulario.tsx).

- [x] Subgrilla por recurso: bodega, cantidad asignada, unidad, stock/reserva/disponible y acciones de borrador.
- [x] Validar clasificación de bodega y cantidad total que debe abastecerse desde stock.
- [x] Conservar abastecimiento de materia prima y de producto terminado como recursos distintos.
- [x] No presentar reservas como stock consumido ni prometer disponibilidad sin revalidación del servidor.

### GD-06 — Producción: consumos reales y revisión de lote

**Prioridad alta · Complejidad alta.** El registro de producción repite bloques de consumos reales y revisiones de redondeo del lote.

Fuente: [produccion.tsx](../src/components/ordenes-trabajo/produccion.tsx), `d.consumptions` y `roundingReviews`.

- [x] Grilla de consumos reales: material, unidad, bodega, cantidad, información de reserva y acciones de borrador.
- [x] Mostrar revisiones de redondeo como grilla de diferencias con diálogo de revisión obligatoria cuando corresponda.
- [x] Mantener avance, cantidad producida, bodega de salida/ingreso según modo y referencia opcional al registro revertido.
- [x] Convertir los efectos de previsualización a tabla para comparar saldo antes/después y reserva propia/ajena/libre.
- [x] Mantener inmutabilidad del registro confirmado; corregir con reversión vinculada, no con edición de una fila histórica.
- [x] Probar conservación de datos y UUID en reintento de interfaz con acciones simuladas.
- [ ] Probar rollback, concurrencia y consumo real sobre copia descartable de PostgreSQL.

### GD-07 — Preparación de guía de despacho

**Prioridad alta · Complejidad media/alta.** Cada combinación de partida/bodega o conformidad ocupa un bloque con cantidad y, para servicios, nombre/fecha de conformidad.

Fuente: [formulario-salida.tsx](../src/components/guia-despacho/formulario-salida.tsx), iteración `lines`.

- [x] Grilla: partida, bodega o tipo de prestación, unidad, pendiente, reserva propia, máximo orientativo, cantidad de salida y estado de conformidad.
- [x] Diálogo para cantidad y conformidad del servicio; mantener campos obligatorios y límites por fecha.
- [x] Mantener identidad partida+bodega: una misma partida puede distribuirse en varias bodegas.
- [x] No agregar partidas ajenas a la OT ni cambiar el documento de origen desde la grilla.
- [x] Grilla de previsualización de lo que efectivamente se confirmará, con revalidación de stock/reservas y protección de reintentos inciertos.

### GD-08 — Corrección/devolución de guía

**Prioridad alta · Complejidad media.** Bloques por partida con bodega original, pendiente de corrección y cantidad a corregir.

Fuente: [formulario-correccion.tsx](../src/components/guia-despacho/formulario-correccion.tsx).

- [x] Grilla: partida original, bodega, unidad, pendiente retornable y cantidad de esta corrección; diálogo para editar selección/cantidad.
- [x] Conservar cantidades parciales o completas sin superar lo originalmente entregado y aún no corregido.
- [x] Mantener confirmación explícita de recepción física en bodega original; servicios revierten entrega acreditada sin inventario.
- [x] Conservar motivo/fecha y previsualización; no modificar factura, deuda ni abonos por cambiar el diseño.
- [x] No habilitar edición o borrado de guías confirmadas ni permitir que una devolución elimine dependencias de producción.

### GD-09 — Consulta de OT, reservas y efectos de operaciones

**Prioridad media · Complejidad media.** La consulta contiene secciones repetidas de líneas, recetas, materiales/abastecimiento, registros y reservas. Cierre/reversión presentan sus efectos en bloques.

Fuentes: [ordenes.tsx](../src/components/ordenes-trabajo/ordenes.tsx), [cierre.tsx](../src/components/ordenes-trabajo/cierre.tsx), [correccion.tsx](../src/components/ordenes-trabajo/correccion.tsx).

- [x] Tablas separadas para partidas, recursos, registros de producción y reservas; no una sola tabla que mezcle niveles y unidades.
- [x] Diálogo Ver para datos extensos, trazabilidad y motivos; conservar las acciones operativas específicas que ya existen.
- [x] Tablas de efectos de cierre/reversión con magnitudes antes/después y vínculos de origen.
- [x] Mantener restricciones de reversión, dependencias de guías, liberación/reserva y permisos; el cambio es de presentación.

### GD-10 — Cobranza: detalle de cuenta e historiales

**Prioridad media · Complejidad media.** El listado de cuentas es tabla, pero el historial de abonos del detalle usa una lista de bloques con comprobantes y acciones. La información de promesas también debe revisarse como detalle asociado.

Fuente principal: [ventas/cobranza/page.tsx](<../src/app/(app)/ventas/cobranza/page.tsx>); operación en [operar-abonos.tsx](../src/components/cobranza/operar-abonos.tsx) y [operar-c3.tsx](../src/components/cobranza/operar-c3.tsx).

- [x] Grilla paginada de abonos: fecha, importe, medio, referencia, estado y acciones autorizadas; Ver abre comprobantes/datos ampliados.
- [x] Presentar historial de promesas en tabla y acceso a comprobantes mediante detalle, manteniendo paginación y autoría.
- [x] Conservar adjuntos anteriores y sus descargas protegidas; no borrar archivos por quitar una fila de presentación.
- [x] Mantener anulación con motivo, prohibición de sobrepago y cuenta/deuda únicas. No introducir edición directa de abonos registrados.

### GD-11 — Historiales y listas secundarias

**Prioridad baja · Complejidad variable.** No son bloques de captura, pero conviene evaluar su lectura tabular después de los flujos anteriores.

- [x] Historial de recepciones/cierres dentro de [Compras](../src/components/compras/compras.tsx): tabla de operaciones y Ver para partidas.
- [x] Emisiones de PDF de [Cotizaciones](../src/components/cotizaciones/historial-pdf-cotizacion.tsx), [OT](../src/components/ordenes-trabajo/historial-pdf.tsx) y [Guías](../src/components/guia-despacho/historial-pdf.tsx): revisión, estado, fecha y Ver/Descargar, sin editar archivos históricos.
- [x] Historial de revisiones/operaciones de OCC y OT: tabla o detalle expandible tabular, conservando motivos/autoría.
- [x] Mis sesiones en [panel de usuario](../src/components/seguridad/panel.tsx): evaluar tabla de sesión, inicio, actividad, vencimiento y cierre; conservar sesión actual y revocación individual/de las demás. No es requisito previo para las grillas comerciales.

## 5. Formularios que no necesitan convertirse en grillas de detalle

Ajustes de inventario, inventario inicial de terminado, traslados, configuración de mínimo, cierre de un pendiente de compra y registro individual de abono operan sobre un registro/recurso u operación seleccionada. Sus campos de cabecera no son una colección de detalles; no se propone inventar un proceso masivo para hacerlos tabulares.

También permanecen como formularios la identidad del cliente/proveedor/material, los datos de Empresa, las credenciales y las confirmaciones de seguridad. Imágenes de producto, texto técnico enriquecido, tarjetas de KPI, gráfico del Dashboard, avisos y explicaciones no son partidas comerciales; su diseño no se cambia automáticamente por este hito.

## 6. Secuencia recomendada y seguimiento

| Etapa | Alcance propuesto | Estado |
| --- | --- | --- |
| GD0 | Inventario de componentes, clasificación y propuesta | Aprobado por el usuario el 27-10-2026 |
| GD1 | Definir patrón compartido y criterios de aceptación | Completado: [patrón y criterios](PATRON-GRILLAS-DETALLE.md); aplicación pendiente en GD2–GD7 |
| GD2 | Recepción de compras y OCC (GD-01/GD-02) | Implementado; [verificación y pendientes](GRILLAS-GD2-VALIDACION.md) |
| GD3 | Planificación OT y subgrillas (GD-03/GD-04/GD-05) | Implementado; [verificación y pendientes](GRILLAS-GD3-VALIDACION.md) |
| GD4 | Producción y consultas OT (GD-06/GD-09) | Implementado; [verificación y pendientes](GRILLAS-GD4-VALIDACION.md) |
| GD5 | Preparación y corrección de guías (GD-07/GD-08) | Implementado; [verificación y pendientes](GRILLAS-GD5-VALIDACION.md) |
| GD6 | Cobranza e historiales secundarios (GD-10/GD-11) | Implementado; [verificación y pendientes](GRILLAS-GD6-VALIDACION.md) |
| GD7 | Regresión transversal, manual/capturas y revisión funcional | Regresión de componentes 7/7 y manual/PDF entregados; [cierre funcional pendiente](GRILLAS-GD7-VALIDACION.md) |

Antes de abstraer componentes, contrastar los patrones ya existentes: tabla, selector buscable, acciones con ayuda, confirmación/descarte y diálogo. Compartir estructura visual y manejo de foco; conservar formularios y validaciones específicas por dominio. No iniciar una biblioteca genérica que obligue a reescribir todos los módulos de una vez.

Para cada etapa:

- [ ] Implementar un flujo acotado conservando los cambios previos del repositorio.
- [ ] Verificar Agregar/Editar/Cancelar/Quitar o sus equivalentes permitidos para partidas de origen.
- [ ] Probar permisos, documentos bloqueados, historial y respuesta incierta.
- [ ] Revisar descripciones largas, varias filas, unidades/decimales, móvil y teclado; evitar formularios anidados y pérdida de foco.
- [ ] Ejecutar lint/build y pruebas pertinentes. Si el entorno bloquea la compilación, registrar la limitación sin marcarla como correcta.
- [ ] Cuando existan escrituras de ensayo, usar copias descartables y archivos aislados; conservar base y documentos reales.
- [ ] Actualizar manual y estado del hito; regenerar PDF del manual cuando se acuerde entregar la nueva edición.
- [ ] Obtener la revisión funcional del usuario sin dar por aprobados otros hitos pendientes.

No se anticipan migraciones para la conversión visual. Si un flujo necesita un nuevo DTO o acción de lectura, inventariar su permiso/origen y actualizar la cobertura de seguridad. Si aparece una necesidad real de esquema o cambio de reglas, documentarla y evaluarla por separado.

## 7. Verificación de la entrega inicial GD0

- [x] Revisar estado de Git y componentes/páginas afectados sin editar código de aplicación.
- [x] Distinguir captura repetida, consulta/historial, grillas existentes y formularios de un registro.
- [x] Registrar fuentes reales, prioridades, restricciones y checks de trabajo pendiente.
- [x] Comprobar referencias locales y revisión de diff.
- [ ] Implementar módulos GD2–GD7 y validar funcionalmente: pendiente; GD1 se registra en el checkpoint siguiente.

Esta entrega sólo modifica documentación: no ejecuta build, no inicia servidores y no toca la base de datos.


## 8. Checkpoint GD1 — 27-10-2026

- [x] Registrar aprobación del usuario del documento y los hitos.
- [x] Entregar [PATRON-GRILLAS-DETALLE.md](PATRON-GRILLAS-DETALLE.md): composición con componentes existentes, cuatro clases de detalle, estados/identidades, foco y formularios, permisos y recuperación de respuestas inciertas.
- [x] Definir contrato de recepción/OCC para GD2 y 18 criterios de aceptación con forma de verificación.
- [x] Resolver reutilización: Table/Dialog/confirmaciones/selectores actuales; sin nuevo motor genérico, dependencias ni cambios a módulos en GD1.
- [x] Revisar referencias locales y diff. Sólo documentación; no se ejecutó build ni se inició servidor o modificó BD.
- [ ] GD2: aplicar el patrón a recepción de compras y aceptación/consulta de OCC, con criterios pertinentes y revisión funcional.

GD1 queda completado como definición. Las verificaciones de navegador y las conversiones funcionales aún no se han ejecutado por este hito.


## 9. Checkpoint GD2 — 27-10-2026

- [x] Recepción, aceptación de OCC y consulta histórica convertidas a tablas con diálogo por partida.
- [x] Reutilizar editor de cantidad/descarte y contenedor accesible de Table; conservar IDs, origen, permisos y validación de servidor.
- [x] Mantener datos y UUID bloqueados cuando no se puede comprobar la confirmación de recepción/OCC; reintento idéntico.
- [x] Lint/tipos, cobertura S4 y pruebas puras de importes correctas. Chromium con API simulada correcto; sin BD ni servidor.
- [ ] Build final: ejecutado pero bloqueado por permiso de puerto interno de Turbopack.
- [ ] Revisión funcional y visual del usuario; no se sustituyen por el ensayo simulado.

Detalle exacto, criterios CA aplicados y comando de reproducción: [GRILLAS-GD2-VALIDACION.md](GRILLAS-GD2-VALIDACION.md). GD3 no iniciado.


## 10. Checkpoint GD3 — 27-10-2026

- [x] Paso 1: grilla principal de planificación y diálogo independiente por partida; identidad estable, consulta y restricciones comerciales/obra propia.
- [x] Paso 2: necesidades de receta, revisión obligatoria con motivo y distribuciones de materias primas en subgrillas.
- [x] Paso 3: abastecimiento desde stock en subgrilla con bodegas compatibles y disponibilidad orientativa.
- [x] Conservar borradores, receta histórica, validaciones de servidor, confirmación/reservas e idempotencia sin cambiar servicios ni esquema.
- [x] Lint/tipos, requisitos puros, cobertura S4 y ensayo de componentes reales en Chromium con guardado simulado correctos.
- [ ] Compilación final: build ejecutado y bloqueado por permiso de puerto interno de Turbopack.
- [ ] Revisión funcional del usuario y visual con estilos reales, teclado completo, zoom y dispositivos; integración de guardado/reservas real pendiente.

Los checks GD-03/GD-04/GD-05 corresponden a implementación; no equivalen a aprobación funcional. Evidencia y recorrido: [GRILLAS-GD3-VALIDACION.md](GRILLAS-GD3-VALIDACION.md). GD4 no iniciado. Sin migraciones ni escrituras de ensayo en BD.


## 11. Checkpoint GD4 — 27-10-2026

- [x] Grilla de consumos reales con Agregar/Editar/Quitar, borrador independiente, descarte, claves estables y confirmación de reemplazo.
- [x] Necesidades y revisión obligatoria del lote en tabla/diálogo; efectos de producción tabulares.
- [x] Consultas de partidas, recursos, registros, reservas y planificación con Ver para historia y motivos; acciones operativas conservadas.
- [x] Preparación al cierre y efectos de reversión en tablas con orígenes y saldos disponibles.
- [x] Sin cambios de esquema, servicios ni acciones; avance y manual Markdown actualizados.
- [x] Lint/tipos, requisitos puros, cobertura S4 y Chromium con acciones simuladas correctos.
- [ ] Aprobación funcional, pruebas con PostgreSQL y revisión visual/teclado completa.
- [ ] Build exitoso: ejecutado pero bloqueado por permisos internos de Turbopack.

Los checks de implementación no equivalen a aprobación funcional. Continuidad exacta en [GRILLAS-GD4-VALIDACION.md](GRILLAS-GD4-VALIDACION.md). GD5 no iniciado; PDF del manual sin regenerar.


## 12. Checkpoint GD5 — 27-10-2026

- [x] Preparación en grilla por partida/bodega con editor de cantidad/conformidad, límites orientativos conjuntos, descarte y exclusión sin borrar origen.
- [x] Corrección en grilla por partida original, con pendiente retornable, edición de cantidad y recepción física conservada.
- [x] Previsualizaciones tabulares, revisión previa de corrección y copias de datos/UUID estables ante resultado incierto.
- [x] Lint/tipos, cobertura S4 y Chromium con acciones/router simulados correctos; prueba integral G6 adaptada, no ejecutada.
- [x] Manual Markdown y registro de arquitectura actualizados. Sin servicios nuevos, esquema, migraciones ni escrituras de ensayo en BD.
- [ ] Build exitoso: ejecutado pero bloqueado por permiso interno de Turbopack.
- [ ] Aprobación funcional, estilos/teclado/zoom completos y pruebas reales en copia de PostgreSQL.

Los checks GD-07/GD-08 corresponden a implementación y ensayo de interfaz, no a aprobación funcional ni prueba transaccional. Continuidad: [GRILLAS-GD5-VALIDACION.md](GRILLAS-GD5-VALIDACION.md). GD6 no iniciado; PDF del manual sin regenerar.


## 13. Checkpoint GD6 — 27-10-2026

- [x] Abonos/promesas en grillas paginadas con Ver para comprobantes, motivos y autoría; acciones/permisos conservados.
- [x] Compras: cierres/recepciones tabulares con detalle histórico; OCC: operaciones en tabla. OT conserva lo implementado en GD4.
- [x] Emisiones PDF de cotizaciones/OT/guías en tablas con rutas y acciones existentes.
- [x] Evaluar y aplicar tabla a Mis sesiones, con actividad, vencimiento y revocación de otras sesiones.
- [x] Auxiliares visuales GrillaHistorial/VerDetalleHistorial, sin cambios de consultas/servicios, esquema, migraciones ni acciones.
- [x] Lint/tipos, cobertura S4 y Chromium con transporte simulado correctos; manual Markdown actualizado.
- [ ] Build exitoso: ejecutado y bloqueado por permiso interno de Turbopack.
- [ ] Aprobación funcional, estilos/teclado/zoom y pruebas reales con Next/PostgreSQL/archivos/sesiones.

Checks GD-10/GD-11 de implementación, no de aprobación funcional. Continuidad: [GRILLAS-GD6-VALIDACION.md](GRILLAS-GD6-VALIDACION.md). GD7 pendiente; PDF del manual sin regenerar. Sin servidores de aplicación ni escrituras de ensayo en BD.


## 14. Checkpoint GD7 — 27-10-2026

- [x] Ejecutar regresión GD2–GD6 con CSS real y transporte simulado: 7/7 comprobaciones y 15 capturas responsive correctas.
- [x] Corregir desborde móvil del fieldset de configuración OT, reforzar retorno de foco y sincronizar pruebas con animaciones/tablas actuales.
- [x] Entregar ejecutor reproducible `pnpm grillas:validar`, soporte visual y resumen de evidencia sin servidor/BD.
- [x] Actualizar manual Markdown/PDF y tres ejemplos visuales ficticios; exportación local reproducible con `pnpm manual:pdf`.
- [x] Entregar [guía funcional GD7](GUIA-PRUEBAS-GRILLAS-GD7.md) con catorce casos y criterios CA, todos pendientes de aprobación del usuario.
- [x] Lint/tipos, referencias y diff correctos.
- [ ] Build exitoso e integración real con Next/PostgreSQL/archivos/sesiones.
- [ ] Recorrido completo de teclado, zoom 200%, contraste y aceptación con usuarios.

GD7 queda avanzado técnicamente, **sin cierre funcional**. No marcar aprobados GD2–GD6 ni otras validaciones por haber pasado el ensayo simulado. Continuidad exacta: [GRILLAS-GD7-VALIDACION.md](GRILLAS-GD7-VALIDACION.md). Sin migraciones ni escrituras de ensayo en BD; navegadores cerrados y ningún servidor de aplicación iniciado.
