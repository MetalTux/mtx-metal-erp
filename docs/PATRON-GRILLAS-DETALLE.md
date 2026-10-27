# Patrón compartido de grillas de detalle — GD1

Fecha: **27-10-2026**. Estado: **definición completada**. Aplicación por módulo y pruebas funcionales pendientes en GD2–GD7 de [HITO-GRILLAS-DETALLE.md](HITO-GRILLAS-DETALLE.md).

El usuario aprobó el documento y sus hitos y autorizó comenzar GD1. Este contrato define el comportamiento para las conversiones posteriores. No afirma que todos los módulos actuales ya cumplan el patrón ni introduce componentes nuevos en la aplicación.

## 1. Decisión de reutilización

| Responsabilidad | Base existente | Uso acordado |
| --- | --- | --- |
| Filas, columnas y semántica | [ui/table.tsx](../src/components/ui/table.tsx) | Componer Table/Header/Body/Row/Head/Cell/Caption; no reutilizar un listado paginado del servidor para un borrador local |
| Editor de detalle | [ui/dialog.tsx](../src/components/ui/dialog.tsx) | Un diálogo con formulario específico del dominio; Ver y Editar comparten presentación cuando resulte claro |
| Acciones y explicación | [boton-con-ayuda.tsx](../src/components/formularios/boton-con-ayuda.tsx), Button | Texto visible en las acciones principales; icono decorativo y nombre accesible contextual |
| Selección de catálogos | [selector-buscable.tsx](../src/components/formularios/selector-buscable.tsx) | Búsqueda y teclado existentes; mantener filtros del dominio |
| Descartar borrador | [confirmar-descarte.tsx](../src/components/alertas/confirmar-descarte.tsx) | Seguir editando / Descartar cambios, sin diálogos nativos |
| Quitar una fila | [confirmar-accion.tsx](../src/components/alertas/confirmar-accion.tsx) | Confirmación contextual de que se afecta el borrador; no simular una anulación histórica |
| Errores y resultados | Aviso y [notificaciones.tsx](../src/components/alertas/notificaciones.tsx) | Error persistente junto al formulario y aviso visible; no depender sólo de un toast |

**No se crea en GD1 un motor genérico de formularios, un CRUD universal ni una nueva dependencia.** Los tipos, cálculos, permisos y formularios siguen en cada dominio. Un auxiliar visual podrá extraerse después de probar su reutilización en dos flujos, sin obligar a migrar módulos que ya funcionan.

Las referencias de comportamiento son [RecetaProducto](../src/components/mantenedores/receta-producto.tsx), [SucursalesCliente](../src/components/mantenedores/sucursales-cliente.tsx) y la nueva grilla de [Compras](../src/components/compras/compras.tsx). Son ejemplos existentes, no una certificación automática de todos los criterios de este documento.

## 2. Estructura visual común

1. Cabecera del documento, conservando campos y estado actuales.
2. Sección **Detalles** o nombre específico, con número de filas y acción principal permitida.
3. Grilla con identificación, cantidades/unidades, estado y acciones; importes sólo donde correspondan y estén autorizados.
4. Resumen o previsualización del documento separado de la grilla. Los valores son calculados por el servidor o provienen del snapshot histórico.
5. Acción explícita del documento: Revisar, Guardar borrador, Confirmar recepción, Confirmar salida, etc.

La grilla no guarda por sí sola el documento. **Aceptar detalle** aplica al borrador; la confirmación de la operación real conserva su nombre y efectos del módulo.

### Columnas y presentación

- Identificación a la izquierda: descripción con salto de línea, código secundario y referencia cuando sea necesaria. No truncar información crítica sin acceso a Ver.
- Cantidades y dinero alineados a la derecha, con `tabular-nums`, formato chileno y unidad explícita. No convertir Decimal a number para operar ni sumar unidades diferentes.
- Estado con texto, sin depender sólo de color. Campos obligatorios o pendientes claramente identificados.
- Acciones en una columna estable; cada botón identifica su fila para tecnologías de asistencia.
- Cabeceras semánticas con `scope="col"` y nombre/caption de tabla. Los errores por fila se vinculan por ID estable.
- Estado vacío dentro de la tabla con `colSpan` correcto, explicación y acción si agregar está permitido. No insertar una fila inválida automáticamente.
- No introducir paginación de borradores como requisito general: conservar todos sus detalles y los límites actuales. Las consultas/historiales mantienen su paginación del servidor.
- Una subgrilla conserva el contexto de su partida. No mezclar líneas, recursos, distribuciones y movimientos en una tabla sin jerarquía.

### Móvil y teclado

Se adopta **tabla semántica con desplazamiento horizontal contenido** como base para las nuevas conversiones. El contenedor será accesible con teclado y tendrá nombre e indicación de desplazamiento cuando sea necesaria. El documento no debe desbordar horizontalmente por la tabla.

Los diálogos usan ancho disponible y desplazamiento vertical. Se prueba al menos en 360, 768 y 1280 px, además de descripciones largas y zoom de 200%. Las adaptaciones existentes de filas etiquetadas en móvil pueden mantenerse si conservan contexto y accesibilidad; no se obliga a reescribirlas en GD1.

## 3. Contrato de estado e identidad

Cada editor de dominio administra estas responsabilidades, sin una API de componente genérico obligatoria:

| Dato/estado | Regla |
| --- | --- |
| Filas del documento | Valores aceptados en el borrador padre; no se modifican mientras se escribe en el diálogo |
| Identidad local | UUID o clave estable de fila; nunca posición visual como identidad de negocio |
| Identidad persistida | ID del servidor y vínculos de origen intactos; un nuevo UUID de interfaz no los reemplaza |
| Editor | Modo Agregar/Ver/Editar, clave de fila, copia de valores y marca de cambios |
| Verificación | Estado pendiente y errores; respuestas obsoletas no pueden sustituir valores más recientes |
| Descarte | Estado separado del editor para permitir seguir editando sin perder datos |
| Operación real | UUID estable, versión y snapshot del intento; pertenece al módulo y no a la fila visual |
| Cierre y foco | Disparador original y destino alternativo si la fila fue quitada |

Ordenar, quitar una fila previa o volver a consultar no cambia el origen de otra fila. La posición documental, cuando exista, se conserva o reasigna explícitamente según las reglas del servicio.

## 4. Flujos de interacción

### Agregar/editar detalles propios

1. Abrir una copia local, sin alterar cabecera ni filas aceptadas.
2. Capturar datos con los validadores y selectores del dominio.
3. **Aceptar detalle** valida y, cuando corresponda, consulta cálculo/previsualización de servidor. La grilla cambia sólo después de una respuesta válida.
4. Error conserva el editor y sus valores. En una respuesta incierta de una operación con escritura, mantener el intento y el UUID para consultar/reintentar.
5. Éxito cierra el editor y devuelve el foco al disparador o acción Agregar.
6. Cancelar sin cambios cierra. Cancelar con cambios pide confirmación; Seguir editando conserva todo; Descartar elimina sólo esa edición no aceptada.
7. Quitar pide confirmación e identifica la fila. Se pueden quitar todas las filas del borrador si el flujo lo permite, pero el documento no se confirma vacío cuando su servicio exige al menos una.

### Partidas heredadas: selección y edición permitida

Recepciones, aceptación de OCC y guías muestran partidas de origen. No tienen Agregar/Quitar arbitrarios: se selecciona lo que participará en la operación y se editan cantidades/datos permitidos en diálogo. El checkbox puede cambiar la selección del borrador directamente; no confirma una escritura ni borra la partida de origen.

Los máximos mostrados son orientativos hasta que el servidor revalida pendiente, versión, stock/reservas o cantidad corregible. Deseleccionar no altera documentos anteriores. No inferir una cantidad a operar sólo por abrir Ver.

### Consulta e historia

Ver no dispara escrituras de dominio ni exige permisos de operación; usa consultas autorizadas de lectura. Un documento bloqueado oculta las acciones no permitidas y explica el motivo relevante. Anular, revertir, devolver y liberar reserva mantienen sus botones y confirmaciones específicas; no se convierten en Editar/Quitar.

### Alta de catálogos dentro de un detalle

Se conserva la opción existente de crear material, proveedor o cliente sólo con sus permisos. El catálogo recién creado se selecciona en el borrador correspondiente y la grilla se actualiza al aceptar el detalle. El formulario informa que ese catálogo persiste aunque se descarte el detalle/documento. Abrir/cerrar el alta no debe cerrar el editor padre ni perder valores.

## 5. Diálogos, foco y bloqueo

- Los formularios de cabecera, detalle y catálogos no se anidan como elementos HTML `form`; los portales no impiden por sí solos la propagación de eventos de React.
- El envío del detalle no debe ejecutar el submit del documento. Cada formulario delimita su evento de envío.
- Mientras hay un detalle/confirmación/alta abierto, el documento padre no se cierra por Escape, clic exterior o botón de cierre.
- Escape primero cierra sugerencias/selector abierto. Si no hay selector ni tarea pendiente, solicita el cierre del editor mediante su lógica de descarte.
- Durante validación o confirmación se evita doble envío y cierre accidental; una consulta fallida libera el bloqueo de modo controlado.
- Si la fila desaparece, el foco retorna a Agregar o al título/sección de detalles con destino programático; no queda perdido en el fondo del diálogo.
- Una respuesta incierta de una escritura no se trata como fallo definitivo: se conservan UUID/datos y las opciones de recuperación que ya tenga el módulo.

## 6. Contrato inicial de GD2

| Flujo | Columnas mínimas | Editor/acciones | Invariantes |
| --- | --- | --- | --- |
| Recepción de compras | Material, presentación, contenido, recibido/cerrado/pendiente, cantidad a recibir y equivalencia | Seleccionar partida y Editar cantidad; Ver datos históricos | Pendiente no negativo, equivalencia exacta, recepción parcial, stock/Kardex atómicos, mismo UUID al reintentar |
| Aceptación de OCC | Selección, descripción, unidad, cotizado, aceptado, precio según modalidad e importe | Editar cantidad y Ver línea; ninguna partida ajena | Cantidad aceptada ≤ cotizada, descuento proporcional, IVA histórico, alcance revisado y cuenta única por total |
| Consulta de OCC | Descripción, unidad, cotizado/contratado/no contratado e importes autorizados | Ver detalle y operaciones permitidas existentes | Sin recalcular desde catálogos actuales ni permitir editar lo confirmado |

La cantidad elegida se confirma en el diálogo; la tabla muestra las filas seleccionadas y también las de origen que no participarán, con estado claro. La previsualización general sigue siendo obligatoria donde el flujo la exige.

## 7. Criterios de aceptación reutilizables

Todos están **definidos**, pero su ejecución queda pendiente por módulo. La aprobación de este patrón no marca pruebas funcionales como realizadas.

| ID | Criterio verificable | Verificación prevista |
| --- | --- | --- |
| CA-01 | Agregar/editar trabaja sobre copia; Cancelar no cambia la fila anterior ni la cabecera | Navegador con dos detalles y datos de cabecera |
| CA-02 | Aceptar incorpora una sola fila o actualiza la elegida, conservando las restantes | Alta, edición y doble clic durante pendiente |
| CA-03 | Error de validación/conexión conserva datos y muestra aviso visible | Campo inválido y fallo simulado de lectura |
| CA-04 | Descartar cambios y quitar una fila requieren la confirmación correspondiente | Cancelar ambas confirmaciones y comprobar valores |
| CA-05 | No hay cambios de identidad al quitar/reordenar filas | Editar la segunda fila después de quitar la primera |
| CA-06 | Los cálculos usan validación del servidor y precisión del dominio | Coma decimal, equivalencia inválida, redondeo y límites |
| CA-07 | Selección de partidas no modifica origen y rechaza excesos | Recepción/aceptación parcial, pendiente cero, cantidad superior |
| CA-08 | Consulta e historia no permiten edición/borrado genéricos | Sólo lectura, documento terminal o bloqueado |
| CA-09 | Los permisos se aplican en interfaz y servidor/DTO/archivos | Roles de lectura y operación, incluida solicitud directa |
| CA-10 | Se conserva modalidad neta o histórica con IVA | Cotización/OCC neta e histórica; precios ocultos a quien corresponda |
| CA-11 | Escape, teclado y foco funcionan entre selector, editor, confirmación y catálogo | Recorrido sin ratón y cancelación en distintos niveles |
| CA-12 | No hay formularios anidados ni submit accidental del documento | Enter dentro de detalle y de alta de catálogo |
| CA-13 | Tabla legible en móvil, zoom y textos largos | 360/768/1280 px, zoom 200%, varias filas y unidades |
| CA-14 | Quitar filas no evita reglas de mínimos/máximos del documento | Borrador vacío y límite de líneas |
| CA-15 | Reintento de una escritura conserva UUID y no duplica efectos | Respuesta incierta en recepción/confirmación |
| CA-16 | Operación fallida revierte sus efectos de dominio | Pruebas pertinentes en copia de BD, nunca fixtures en la real |
| CA-17 | Alta de catálogo conserva padres y explica su persistencia | Crear catálogo, cancelar detalle y verificar alcance |
| CA-18 | Historia, PDF y trazabilidad previos se conservan | Comparar documentos/archivos cuando el cambio los afecte |

CA-06/07/10/14–18 se aplican según el dominio; declarar No aplica con motivo en lugar de inventar una funcionalidad. No se obliga a cada módulo a repetir pruebas transaccionales ajenas si sólo cambió su presentación; sí se ejecutan las regresiones relevantes a sus nuevos caminos de interacción.

## 8. Plantilla de cierre por etapa

- [ ] Registrar componentes cambiados, flujo cubierto y criterios aplicables.
- [ ] Marcar criterios ejecutados con evidencia; conservar los pendientes de revisión humana.
- [ ] Ejecutar lint/build y comprobaciones específicas proporcionadas al cambio; no declarar éxito si el entorno los bloquea.
- [ ] Si se añade una entrada de servidor, documentar origen/permiso y actualizar inventario/cobertura S4.
- [ ] Revisar diff, datos/archivos de ensayo y retirar servidores/copia propios cuando corresponda.
- [ ] Actualizar hito y manual por el comportamiento efectivamente entregado; no aprobar otros hitos por inferencia.

## 9. Entrega GD1

- [x] Contrastar componentes de tabla, diálogo, acciones, selectores y confirmaciones existentes.
- [x] Definir composición visual, estados, identidad, validación, cierre/foco y tratamiento de permisos/historia.
- [x] Distinguir borradores propios, partidas heredadas, subgrillas y consultas.
- [x] Definir contrato inicial de recepción/OCC para GD2 y 18 criterios de aceptación reutilizables.
- [x] Registrar decisión de reutilizar componentes sin biblioteca nueva ni cambio transversal prematuro.
- [x] Comprobar enlaces locales y diff de esta documentación.
- [ ] Aplicar el patrón a los módulos y ejecutar su aceptación: GD2–GD7.

Entrega sólo documental conforme al alcance de GD1: sin cambios de código, dependencias, esquema o base de datos; sin build ni servidores de validación.
