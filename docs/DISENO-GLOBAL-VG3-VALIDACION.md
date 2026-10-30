# VG3 — Mantenedores, catálogos y Configuración

Fecha: **28-10-2026**. Implementado y validado técnicamente con fixtures. Conformidad del usuario pendiente.

## Cambios

- Unidades, Bodegas, Proveedores, Clientes/sucursales, Materias primas, Condiciones de pago, Productos y Configuración mantienen el diseño mineral/Plex de VG1. Contenedores y formularios con ancho mínimo controlado, separación compacta y ayudas de 13 px.
- DataTable compartida: filtros y pie de 12 px de relleno, filas/cabecera de referencia de 40 px, texto de paginación de 13 px y borde del selector con token de campo. Las filas crecen si el contenido lo requiere; se conserva scroll horizontal dentro de la tabla. Vacíos menos altos. No se cambia filtrado, orden ni paginación.
- Sucursales muestra Ver/Editar/Quitar con texto y permite repartir acciones en su celda. Casa Central conserva su protección. Recetas mantiene los textos de acción también en móvil.
- Productos muestra el UUID completo distribuido en líneas, en vez de depender de truncado/tooltip. Imágenes, precio, receta y bloqueo de unidad sin cambios funcionales.
- Empresa alinea grupos por arriba con separación uniforme y legendas discretas; logo sobre blanco. Cuentas conservan principal, estado, referencias e historial. Numeración y períodos de IVA comparten contención/espaciado; IVA muestra Ver/Editar/Eliminar con texto, conservando bloqueos y ayudas.
- Diálogos de mantenedores y altas relacionadas mantienen anchos propios, con min-width y overscroll controlados. Se conserva la apertura sobre el documento/listado.

No se modificaron consultas, servicios, acciones de servidor, reglas de validación, datos, esquema, migraciones ni PDFs históricos. Las altas relacionadas sólo reciben ajustes de presentación; no se remonta el formulario del documento.

## Validación

| Comando | Resultado / alcance |
| --- | --- |
| `pnpm lint` y `pnpm exec tsc --noEmit` | Correctos |
| `pnpm build` | Turbopack bloqueado por restricción interna de puertos conocida |
| `pnpm exec next build --webpack` | Correcto; tipos y rutas de producción incluidos |
| `pnpm exec tsx tests/diseno-global-vg3.ui.ts` | Diez pantallas, 160 escenarios Claro/Oscuro, listados y vacíos, 360/768/1280, Crear/Ver/Editar y consulta por rol. Sucursales/recetas anidadas, unidad de materia prima bloqueada por uso, banco Crear/Ver/Editar, IVA referenciado no eliminable y formularios de numeración |
| `pnpm exec tsx tests/piloto-visual.ui.ts` | Regresión Dashboard/Compras; cancelación de altas de Proveedor y Materia Prima conserva el número del borrador de compra. No se guardan registros |
| `pnpm grillas:validar var/validacion/diseno-global-vg3/grillas` | 7/7; requerimientos, cobertura S4 y componentes GD2–GD6, acciones simuladas |
| `pnpm manual:pdf` | Manual actualizado |

Ensayo nuevo: **3056 mediciones de texto visible**, mínimo observado **5,79:1** frente a 4,5:1. No es una medición exhaustiva de todos los pares gráficos/foco. La tipografía se carga desde los archivos Plex locales, con CSS real; las acciones se reemplazan por mocks restrictivos y un guardado accidental nunca llega a PostgreSQL. Los diálogos anidados se esperan por identidad para evitar confundir el padre al cerrar el hijo. El ensayo fija la preferencia del navegador y comprueba la clase efectiva en cada ruta: no basta con etiquetar una captura como Claro si el estado restauró Oscuro.

Revisión visual de capturas: Cliente/sucursales, Producto/receta, Empresa y formularios móviles, en ambos temas. Las tablas anchas se desplazan dentro de su contenedor y no ensanchan el documento. Imágenes y logos conservan su superficie documental.

## Evidencia

- Matriz: var/validacion/diseno-global-vg3/resultado.json y PNG del mismo directorio.
- Regresión: var/validacion/diseno-global-vg3/grillas/resultado.json y var/validacion/piloto-visual/resultado.json.
- Selección permanente: [capturas VG3](capturas/diseno-global-vg3/).
- Referencia anterior: capturas de mantenedor en [VG1](DISENO-GLOBAL-VG1-VALIDACION.md).

## Límites y continuación

- [ ] Conformidad del usuario y revisión con datos representativos reales autorizados.
- [ ] CRUD autenticado real, concurrencia y escrituras en PostgreSQL. Este hito visual no vuelve a ejecutar suites de integración de dominio sobre la base real.
- [ ] Alta de Cliente desde una cotización real y altas relacionadas confirmadas: se conserva el contrato existente; el ensayo de Compras comprueba apertura/cancelación y borrador, no persistencia real.
- [ ] Zoom real 200% y lector de pantalla. Capturas móviles no equivalen a esas pruebas.

No se cierran S7 ni aceptaciones anteriores de catálogos/configuración por arrastre. Siguiente desarrollo: **VG4 — Inventario**. No se inició ese hito.
