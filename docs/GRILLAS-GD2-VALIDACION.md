# GD2 — Recepción de compras y OCC

Fecha: **27-10-2026**. Estado: **implementación entregada; revisión funcional/visual del usuario y compilación final pendientes**.

Referencia: [hito](HITO-GRILLAS-DETALLE.md) y [patrón GD1](PATRON-GRILLAS-DETALLE.md). No se inicia GD3 ni se cierran las validaciones de otros módulos.

## Cambios entregados

### Recepción de compras

- [x] Tabla semántica con selección, material/presentación, contenido, comprado/recibido/cerrado/pendiente, cantidad de esta recepción, equivalencia y acciones.
- [x] Ver y Editar cantidad en diálogo, identificado por ID de detalle; sin agregar/borrar partidas de la compra.
- [x] Cantidades aceptadas verificadas con la previsualización de servidor existente. Cancelar/descartar conserva la selección anterior y la cabecera; pendiente cero bloquea selección/edición.
- [x] Equivalencia recibida del servidor en la grilla, sin cálculo de cantidades en el navegador.
- [x] Previsualización/confirmación general conservadas. Respuesta incierta al registrar congela datos y conserva el UUID, ofreciendo reintentar exactamente el intento anterior.
- [x] Ver no invoca cálculo/operación de la recepción y puede mostrar las cantidades históricas de su partida.

### Aceptación de OCC

- [x] Tabla de partidas con selección, descripción, unidad, cotizado/aceptado, precio neto o con IVA según modalidad, importe y acciones Ver/Editar cantidad.
- [x] Editor de cantidad separado del formulario principal; validación de cantidad y previsualización existentes de servidor antes de aplicar al borrador.
- [x] Deselección conserva el origen y excluye la línea de la aceptación; cambiar selección/cantidad exige revisar nuevamente el alcance.
- [x] Se conservan descuento proporcional, IVA, alcance técnico, confirmación y creación de cuenta por cobrar de los servicios existentes, sin modificar su lógica.
- [x] Respuesta incierta mantiene confirmación, UUID y contenido; no permite cerrar la confirmación para editar el mismo intento con datos distintos.

### Consulta de OCC

- [x] Tabla histórica de cotizado/contratado/no contratado, unidad, precio e importe según permiso y acción Ver.
- [x] Diálogo de consulta sin edición; propagación del bloqueo de cierre al diálogo padre y retorno de foco.
- [x] Columnas y detalle monetario ocultos a roles sin precios.leer, conservando las guardas/DTO de servidor ya existentes.

### Reutilización

- [x] DialogoCantidadDetalle compartido por recepción y aceptación, con borrador local, descarte, estado pendiente y error visible. Cada dominio aporta su validación y el guardado sigue en el documento padre.
- [x] Table admite containerProps opcional para nombre accesible, región desplazable, tabulación y referencia de retorno de foco; usos previos conservan comportamiento.
- [x] No se añaden Server Actions, dependencias, modelos ni migraciones. Cobertura S4 permanece en 93 acciones y 127 entradas de servicio/consulta.

## Verificación ejecutada

| Comprobación | Resultado y alcance |
| --- | --- |
| pnpm lint | Correcto en la versión final |
| pnpm exec tsc --noEmit | Correcto en la versión final |
| tests/seguridad-s4-cobertura.ts | 93 acciones, 25 páginas, 7 rutas de archivos y 127 entradas protegidas |
| tests/importes-cotizacion-netos.ts | Correcto: neto/IVA, descuentos, límites, OCC parcial/completa y compatibilidad histórica/PDF |
| tests/importes-orden-compra-cliente.ts | Correcto: aceptación histórica completa/parcial y descuentos |
| tests/grillas-gd2.ui.ts | Correcto: componentes reales en Chromium, respuestas de API simuladas y editor técnico/autoría/enlaces sustituidos para aislar interacción |
| pnpm build | Ejecutado; bloqueado por el entorno: Turbopack no puede abrir su puerto interno (Operation not permitted). No se declara compilación final correcta |
| Diff | Sin errores de espacio/conflicto; cambios previos de GD1 conservados |

Ensayo de navegador: pendiente agotado, cantidad excesiva, Cancelar/Seguir editando/Descartar, conservación de la cantidad previa, retorno de foco, Ver sin lectura de cálculo, ausencia de formularios anidados, recepción y OCC con respuesta perdida/reintento de igual UUID y contenido, aceptación parcial, etiqueta neta/histórica con IVA, consulta sin edición y ocultación de precios. Se renderiza la consulta en 360/768/1280 px.

**Límite del ensayo:** no carga la hoja Tailwind completa ni el servidor Next; no certifica diseño visual, zoom/contraste, teclado completo, editor técnico real, protección HTTP ni transacciones de BD. La API simulada permite comprobar estado de interfaz, no demostrar por sí sola idempotencia o stock reales. Los servicios de dominio no cambiaron. No se ejecutaron fixtures en la BD ni se inició un servidor; Chromium se cerró al terminar. La URL localhost del ensayo es interceptada en memoria.

Reproducción: `node --import tsx tests/grillas-gd2.ui.ts`. Usa Playwright instalado y el empaquetador que ya incorpora tsx; no añade paquetes al proyecto. Chromium necesita permisos del entorno para iniciarse.

## Criterios GD1 y pendientes

| Criterios | Estado para GD2 |
| --- | --- |
| CA-01/02/04 | Interacción de aceptar/cancelar/descartar comprobada; no existe Quitar de partidas de origen |
| CA-03 | Error de cantidad e incertidumbre de escritura comprobados; fallo de lectura conserva datos por diseño, pendiente de prueba específica |
| CA-05 | IDs de origen en estado/filas; no hay reordenación ni eliminación de partidas de origen |
| CA-06/07 | Validación/cálculo delegados al servidor existente; límites de UI ensayados con API simulada. Regresión BD integral no repetida aquí |
| CA-08/09 | Consulta sin edición y ocultación visual de precios comprobadas; cobertura estática correcta. Prueba HTTP por rol no repetida en esta entrega |
| CA-10 | Etiquetas de ambas modalidades y cálculos puros comprobados; revisión humana de importes/PDF pendiente |
| CA-11/12 | Foco de retorno, formularios separados y envío del detalle comprobados; recorrido completo con teclado pendiente |
| CA-13 | Render en tres anchos sin errores JS; diseño con Tailwind, zoom y textos largos pendientes |
| CA-14 | Reglas de documento vacío/límites siguen en los servicios; no hay alta libre de líneas en estos flujos |
| CA-15 | Ambos flujos retienen contenido/UUID tras pérdida de respuesta en ensayo; prueba transaccional real de reintento no repetida |
| CA-16/18 | Sin cambios en servicios, escritura de historia ni PDF; no se crearon fixtures/archivos sobre los datos reales |
| CA-17 | No hay alta de catálogos en estos tres editores; permanece en Compras/Cotizaciones y no se altera |

Prueba funcional del usuario:

- [ ] Recibir parcialmente dos materiales, cancelar la edición de uno y comprobar stock/Kardex después de confirmar.
- [ ] Revisar compra con líneas agotadas/cerradas y cantidades en presentaciones distintas.
- [ ] Aceptar parcialmente una cotización neta y una histórica, excluir una partida, revisar alcance y verificar importe de cuenta.
- [ ] Consultar OCC con perfil de lectura sin precios y con perfil comercial, comprobando las acciones permitidas.
- [ ] Revisar diálogos, Escape/Tab, móvil, zoom 200%, textos largos y tabla desplazable con estilos reales.
- [ ] Completar build en un entorno que permita los procesos internos de Turbopack.
