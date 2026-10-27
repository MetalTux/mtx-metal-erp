# Hito — Unificación de grillas de detalle

Fecha de revisión: **27-10-2026**. Estado: **inventario y propuesta de cambios preparados; implementación pendiente por etapas**.

El usuario solicita revisar los módulos que todavía muestran bloques repetidos por detalle y documentar los puntos necesarios para unificar su lectura en grillas. Este documento registra lo encontrado en el código; no autoriza por sí solo la ejecución de todas las etapas ni reemplaza las validaciones funcionales pendientes de otros hitos.

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

- [ ] Sustituir bloques por grilla: material, presentación, comprado, recibido, cerrado, pendiente, cantidad a recibir, equivalencia y acción.
- [ ] Editar la cantidad de cada partida en diálogo y mantener visible el conjunto seleccionado para esta recepción.
- [ ] Conservar filas de origen; dejar sin selección/cantidad equivale a no recibir esa partida, no a borrar el detalle comprado.
- [ ] Deshabilitar recepción sobre pendientes agotados y conservar fecha/observación, previsualización, confirmación e idempotencia.
- [ ] Validar recepción parcial, varias líneas y reintento sin duplicar stock/Kardex.

### GD-02 — OCC: aceptación y consulta

**Prioridad alta · Complejidad media.** La aceptación muestra bloques por línea con checkbox y cantidad aceptada; la consulta muestra tarjetas de cotizado/contratado/no contratado.

Fuentes: [formulario-orden.tsx](../src/components/ordenes-compra-cliente/formulario-orden.tsx) y [ver-orden.tsx](../src/components/ordenes-compra-cliente/ver-orden.tsx).

- [ ] Grilla de aceptación: seleccionar, descripción, unidad, cantidad cotizada, cantidad aceptada, precio según modalidad, importe y Editar cantidad.
- [ ] Mantener deselección como exclusión del alcance contratado; no eliminar ni agregar partidas ajenas a la cotización.
- [ ] Grilla de consulta: cantidad cotizada, contratada, no contratada e importes sólo para roles autorizados.
- [ ] Conservar alcance técnico, revisión explícita, descuento proporcional, IVA histórico y deuda única por total contratado.
- [ ] Probar aceptación completa/parcial con precios netos y cotizaciones históricas con IVA incluido.

### GD-03 — OT: líneas del plan

**Prioridad alta · Complejidad alta.** Cada línea es una sección extensa que combina cantidad, modo de ejecución, fabricación, receta, materiales y abastecimiento.

Fuente: [ordenes-trabajo/formulario.tsx](../src/components/ordenes-trabajo/formulario.tsx), iteración `d.lines`.

- [ ] Grilla principal: partida, tipo/modo, unidad, cantidad, a fabricar, desde stock, estado de distribución y acciones Ver/Configurar.
- [ ] Llevar configuración de una línea a un diálogo, con subgrillas GD-04/GD-05.
- [ ] Agregar/quitar líneas sólo donde hoy se permite para obra propia; una OT comercial conserva el origen y las cantidades contratadas de OCC.
- [ ] Mantener receta histórica, actualización explícita de receta, revisión de redondeos y motivo de revisión del plan.
- [ ] Conservar separación entre Guardar borrador y Confirmar/reservar, faltantes y operaciones inciertas.

### GD-04 — OT: materiales previstos y revisión de receta

**Prioridad alta · Complejidad alta.** Dentro de cada línea hay bloques de necesidad de receta, revisión de redondeos y distribuciones `materials` con bodega/cantidad.

Fuente: [ordenes-trabajo/formulario.tsx](../src/components/ordenes-trabajo/formulario.tsx), `needs`, `roundingReviews` y `l.materials`.

- [ ] Subgrilla de necesidad: material, unidad, cantidad exacta, prevista/revisada, diferencia y estado de revisión.
- [ ] Diálogo específico para cantidad revisada y motivo cuando el cálculo lo exige; no reducir esa revisión a un campo opcional.
- [ ] Subgrilla de distribución: material, bodega, cantidad prevista, disponibilidad y acciones.
- [ ] Conservar distintas distribuciones del mismo material por bodega y validación del total necesario.
- [ ] Mantener materiales a medida distintos de recetas de catálogo; no regenerar recetas históricas automáticamente.

### GD-05 — OT: abastecimiento desde stock

**Prioridad alta · Complejidad media/alta.** `l.supplies` presenta bloques por distribución de bodega y cantidad.

Fuente: [ordenes-trabajo/formulario.tsx](../src/components/ordenes-trabajo/formulario.tsx).

- [ ] Subgrilla por recurso: bodega, cantidad asignada, unidad, stock/reserva/disponible y acciones de borrador.
- [ ] Validar clasificación de bodega y cantidad total que debe abastecerse desde stock.
- [ ] Conservar abastecimiento de materia prima y de producto terminado como recursos distintos.
- [ ] No presentar reservas como stock consumido ni prometer disponibilidad sin revalidación del servidor.

### GD-06 — Producción: consumos reales y revisión de lote

**Prioridad alta · Complejidad alta.** El registro de producción repite bloques de consumos reales y revisiones de redondeo del lote.

Fuente: [produccion.tsx](../src/components/ordenes-trabajo/produccion.tsx), `d.consumptions` y `roundingReviews`.

- [ ] Grilla de consumos reales: material, unidad, bodega, cantidad, información de reserva y acciones de borrador.
- [ ] Mostrar revisiones de redondeo como grilla de diferencias con diálogo de revisión obligatoria cuando corresponda.
- [ ] Mantener avance, cantidad producida, bodega de salida/ingreso según modo y referencia opcional al registro revertido.
- [ ] Convertir los efectos de previsualización a tabla para comparar saldo antes/después y reserva propia/ajena/libre.
- [ ] Mantener inmutabilidad del registro confirmado; corregir con reversión vinculada, no con edición de una fila histórica.
- [ ] Probar rollback, concurrencia, consumo real y reintento con el mismo UUID.

### GD-07 — Preparación de guía de despacho

**Prioridad alta · Complejidad media/alta.** Cada combinación de partida/bodega o conformidad ocupa un bloque con cantidad y, para servicios, nombre/fecha de conformidad.

Fuente: [formulario-salida.tsx](../src/components/guia-despacho/formulario-salida.tsx), iteración `lines`.

- [ ] Grilla: partida, bodega o tipo de prestación, unidad, pendiente, reserva propia, máximo orientativo, cantidad de salida y estado de conformidad.
- [ ] Diálogo para cantidad y conformidad del servicio; mantener campos obligatorios y límites por fecha.
- [ ] Mantener identidad partida+bodega: una misma partida puede distribuirse en varias bodegas.
- [ ] No agregar partidas ajenas a la OT ni cambiar el documento de origen desde la grilla.
- [ ] Grilla de previsualización de lo que efectivamente se confirmará, con revalidación de stock/reservas y protección de reintentos inciertos.

### GD-08 — Corrección/devolución de guía

**Prioridad alta · Complejidad media.** Bloques por partida con bodega original, pendiente de corrección y cantidad a corregir.

Fuente: [formulario-correccion.tsx](../src/components/guia-despacho/formulario-correccion.tsx).

- [ ] Grilla: partida original, bodega, unidad, pendiente retornable y cantidad de esta corrección; diálogo para editar selección/cantidad.
- [ ] Conservar cantidades parciales o completas sin superar lo originalmente entregado y aún no corregido.
- [ ] Mantener confirmación explícita de recepción física en bodega original; servicios revierten entrega acreditada sin inventario.
- [ ] Conservar motivo/fecha y previsualización; no modificar factura, deuda ni abonos por cambiar el diseño.
- [ ] No habilitar edición o borrado de guías confirmadas ni permitir que una devolución elimine dependencias de producción.

### GD-09 — Consulta de OT, reservas y efectos de operaciones

**Prioridad media · Complejidad media.** La consulta contiene secciones repetidas de líneas, recetas, materiales/abastecimiento, registros y reservas. Cierre/reversión presentan sus efectos en bloques.

Fuentes: [ordenes.tsx](../src/components/ordenes-trabajo/ordenes.tsx), [cierre.tsx](../src/components/ordenes-trabajo/cierre.tsx), [correccion.tsx](../src/components/ordenes-trabajo/correccion.tsx).

- [ ] Tablas separadas para partidas, recursos, registros de producción y reservas; no una sola tabla que mezcle niveles y unidades.
- [ ] Diálogo Ver para datos extensos, trazabilidad y motivos; conservar las acciones operativas específicas que ya existen.
- [ ] Tablas de efectos de cierre/reversión con magnitudes antes/después y vínculos de origen.
- [ ] Mantener restricciones de reversión, dependencias de guías, liberación/reserva y permisos; el cambio es de presentación.

### GD-10 — Cobranza: detalle de cuenta e historiales

**Prioridad media · Complejidad media.** El listado de cuentas es tabla, pero el historial de abonos del detalle usa una lista de bloques con comprobantes y acciones. La información de promesas también debe revisarse como detalle asociado.

Fuente principal: [ventas/cobranza/page.tsx](<../src/app/(app)/ventas/cobranza/page.tsx>); operación en [operar-abonos.tsx](../src/components/cobranza/operar-abonos.tsx) y [operar-c3.tsx](../src/components/cobranza/operar-c3.tsx).

- [ ] Grilla paginada de abonos: fecha, importe, medio, referencia, estado y acciones autorizadas; Ver abre comprobantes/datos ampliados.
- [ ] Presentar historial de promesas en tabla y acceso a comprobantes mediante detalle, manteniendo paginación y autoría.
- [ ] Conservar adjuntos anteriores y sus descargas protegidas; no borrar archivos por quitar una fila de presentación.
- [ ] Mantener anulación con motivo, prohibición de sobrepago y cuenta/deuda únicas. No introducir edición directa de abonos registrados.

### GD-11 — Historiales y listas secundarias

**Prioridad baja · Complejidad variable.** No son bloques de captura, pero conviene evaluar su lectura tabular después de los flujos anteriores.

- [ ] Historial de recepciones/cierres dentro de [Compras](../src/components/compras/compras.tsx): tabla de operaciones y Ver para partidas.
- [ ] Emisiones de PDF de [Cotizaciones](../src/components/cotizaciones/historial-pdf-cotizacion.tsx), [OT](../src/components/ordenes-trabajo/historial-pdf.tsx) y [Guías](../src/components/guia-despacho/historial-pdf.tsx): revisión, estado, fecha y Ver/Descargar, sin editar archivos históricos.
- [ ] Historial de revisiones/operaciones de OCC y OT: tabla o detalle expandible tabular, conservando motivos/autoría.
- [ ] Mis sesiones en [panel de usuario](../src/components/seguridad/panel.tsx): evaluar tabla de sesión, inicio, actividad, vencimiento y cierre; conservar sesión actual y revocación individual/de las demás. No es requisito previo para las grillas comerciales.

## 5. Formularios que no necesitan convertirse en grillas de detalle

Ajustes de inventario, inventario inicial de terminado, traslados, configuración de mínimo, cierre de un pendiente de compra y registro individual de abono operan sobre un registro/recurso u operación seleccionada. Sus campos de cabecera no son una colección de detalles; no se propone inventar un proceso masivo para hacerlos tabulares.

También permanecen como formularios la identidad del cliente/proveedor/material, los datos de Empresa, las credenciales y las confirmaciones de seguridad. Imágenes de producto, texto técnico enriquecido, tarjetas de KPI, gráfico del Dashboard, avisos y explicaciones no son partidas comerciales; su diseño no se cambia automáticamente por este hito.

## 6. Secuencia recomendada y seguimiento

| Etapa | Alcance propuesto | Estado |
| --- | --- | --- |
| GD0 | Inventario de componentes, clasificación y propuesta | Documento preparado y referencias comprobadas |
| GD1 | Definir patrón compartido y criterios de aceptación | Pendiente |
| GD2 | Recepción de compras y OCC (GD-01/GD-02) | Pendiente |
| GD3 | Planificación OT y subgrillas (GD-03/GD-04/GD-05) | Pendiente |
| GD4 | Producción y consultas OT (GD-06/GD-09) | Pendiente |
| GD5 | Preparación y corrección de guías (GD-07/GD-08) | Pendiente |
| GD6 | Cobranza e historiales secundarios (GD-10/GD-11) | Pendiente |
| GD7 | Regresión transversal, manual/capturas y revisión funcional | Pendiente |

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

## 7. Verificación de esta entrega documental

- [x] Revisar estado de Git y componentes/páginas afectados sin editar código de aplicación.
- [x] Distinguir captura repetida, consulta/historial, grillas existentes y formularios de un registro.
- [x] Registrar fuentes reales, prioridades, restricciones y checks de trabajo pendiente.
- [x] Comprobar referencias locales y revisión de diff.
- [ ] Implementar etapas GD1–GD7 y validar funcionalmente: no realizado en esta entrega.

Esta entrega sólo modifica documentación: no ejecuta build, no inicia servidores y no toca la base de datos.
