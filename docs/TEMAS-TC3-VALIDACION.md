# TC3 — Revisión transversal de Claro y Oscuro

Fecha: **27-10-2026**. Revisión técnica completada con correcciones y evidencia de componentes. **TC4 y aprobación funcional pendientes**. Continúa [el hito de temas](HITO-TEMAS-CLARO-OSCURO.md).

## Correcciones realizadas

| Hallazgo | Cambio |
| --- | --- |
| Azul de acción usado como texto sobre superficies oscuras | Nuevo token link: #245dc4 en Claro, #8ab4ff en Oscuro. Button link y enlaces de Compras/OCC usan ese token; los botones sólidos conservan primary y texto blanco. |
| Leyenda y barras del Dashboard compartían el azul de botón | Leyenda legible con link y barras con chart-1/chart-4; datos y cálculos conservados. |
| Aviso informativo con texto secundario heredado | Título, icono y explicación usan info-foreground sobre info. Error y éxito conservan sus estados con icono y texto. |
| Hover de navegación activa y filtro de Despachos con transparencia | Hover opaco primary-hover para mantener contraste del texto blanco. |
| Fondos de superposición muy tenues | Dialog, AlertDialog y Sheet oscurecen con negro al 50% en ambos temas para distinguir la superficie activa. |
| Documento técnico blanco heredaba color-scheme oscuro | La superficie documental declara color-scheme light; barra de herramientas sigue el tema del ERP. No modifica contenido, colores copiados ni historia. |

Se revisaron estáticamente **204 archivos de interfaz/configuración** buscando colores literales y utilidades de paletas fijas. Fuera de globals.css sólo quedan las superposiciones negras, los fondos blancos de logo/fotografías y el selector de color del editor; son intencionales. El inventario local está en `var/validacion/temas-tc3/inventario-colores.json`. La revisión también incluye clases semánticas, transparencias, estados y superficies; buscar colores literales por sí solo no acredita contraste.

## Cobertura por área

| Área | Comprobación realizada | Límite que conserva TC4 |
| --- | --- | --- |
| Layout/navegación | Sidebar, barra, breadcrumbs, buscador con resultado vacío, campana, menú móvil y sidebar contraído reales en ambos temas | Recorrido con permisos/sesiones reales y preferencias del usuario |
| Acceso/Seguridad | Revisión de ingreso, activación/recuperación, usuarios, panel y plantilla de auditoría. Ingreso/recuperación públicos con Next real. Listado vacío de usuarios y diálogo real de reautenticación con API simulada; panel/historia en GD6 | No se enviaron contraseñas, códigos ni cambios reales de seguridad |
| Mantenedores/Empresa | Revisión de todos los catálogos, Empresa, cuentas bancarias, logos y productos. Formulario real de Unidades y controles/selector compartidos con CSS real | No se ejecutó cada CRUD ni carga de imágenes contra el servidor |
| Inventario | Revisión de Stock/Kardex, mínimos, ajustes, traslados y terminado; tablas, estados y selectores semánticos compartidos. Estado sin coincidencias comprobado | No se operó stock real ni se recrearon todas las combinaciones del inventario |
| Compras/recepciones | GD2: tabla, edición/consulta, validación y reintento, en ambos temas | Operaciones reales conservan su validación funcional pendiente |
| Cotizaciones/OCC | GD2/GD3: detalles, recetas, materias primas, restricciones comerciales y consulta; editor técnico real adicional | Emisiones y contratación reales no se reejecutan en esta auditoría |
| OT/producción | GD4: plan, consumos, consulta, cierre y corrección en ambos temas | No hay escritura productiva ni reservas reales de ensayo |
| Despacho | GD5: salida, corrección parcial, conformidad y resumen en ambos temas | No hay guías reales emitidas/corregidas |
| Cobranzas y PDF | GD6: abonos, promesas, adjuntos, historia y diálogos anidados en ambos temas | Las respuestas de servicios y vistas PDF están simuladas; no certifica el visor PDF nativo de cada navegador |
| Dashboard | Página real con consulta sustituida por datos ficticios: KPI, requerimientos, trabajos, vencimientos, barras, tabla y movimientos | No se revalida la consulta SQL ni la consistencia de cifras de producción |
| Estados | Normal/secundario, información, éxito, error, pendiente, campos inválidos, deshabilitado, foco, hover, seleccionado, vacío y diálogo | Zoom 200%, lector de pantalla, percepción humana y regresión funcional integral siguen en TC4 |

Los ensayos no sustituyen un recorrido completo autenticado de cada página. TC3 completa la auditoría de código y la comprobación visual de componentes representativos; los límites de la tabla no se presentan como pruebas ejecutadas.

## Pruebas y resultados

- `node --import tsx tests/temas-tc3.ui.ts`: correcto. Dashboard, layout, controles, mantenedor, usuarios/reautenticación y editor reales; servicios/datos simulados y solicitudes interceptadas. 174 mediciones por tema: mínimo de texto observado **4,64:1 Oscuro / 5,33:1 Claro**, barras **5,13:1 Oscuro / 6,70:1 Claro**. Objetivos: 4,5:1 texto y 3:1 barras. No incluye el contraste de controles deshabilitados ni convierte la muestra en certificación de accesibilidad global.
- `GRILLAS_TEMA=claro pnpm grillas:validar var/validacion/temas-tc3/grillas-claro`: **7/7 correctas**.
- `pnpm grillas:validar var/validacion/temas-tc3/grillas-oscuro`: **7/7 correctas**. Se amplió el soporte de pruebas para elegir Claro sin alterar el valor oscuro por defecto del ejecutor.
- TC1 y TC2 de componentes: correctos, incluidas persistencia, pestañas, almacenamiento restringido y borradores conservados.
- `node --import tsx tests/temas-tc2-next.ui.ts`: correcto sobre la compilación final. Rutas públicas reales, sólo GET; sin errores de hidratación ni envío de credenciales. Servidor temporal en 3032 detenido por el ensayo.
- `pnpm lint` y `pnpm exec tsc --noEmit`: correctos.
- `pnpm build`: intentado; Turbopack vuelve a fallar al abrir su puerto interno por permisos del entorno. `pnpm exec next build --webpack`: **correcto**, incluidos tipos y generación de 23 páginas. No se modifica el comando habitual del proyecto.

Capturas de grillas a 360/768/1280 y del ensayo transversal en `var/validacion/temas-tc3/`; muestras ficticias conservadas en [capturas/temas-tc3](capturas/temas-tc3). Se revisaron, entre otras, [Dashboard claro](capturas/temas-tc3/claro-dashboard.png), [menú móvil claro](capturas/temas-tc3/claro-menu-movil.png), [reautenticación oscura](capturas/temas-tc3/oscuro-reautenticacion.png) y [devolución oscura](capturas/temas-tc3/oscuro-devolucion.png).

## Continuidad

Sin nuevas dependencias, cambios de esquema, migraciones ni escrituras de ensayo en BD. No cambian importes, stock, permisos, cookies, archivos históricos o procesos. Logos e imágenes mantienen su presentación original sobre blanco; los documentos técnicos conservan colores propios. No se aplican filtros de inversión a imágenes o PDF.

El manual y PDF entregados en TC2 siguen describiendo las mismas opciones; TC3 no agrega controles nuevos ni requiere una nueva edición. En TC4 corresponde preparar/ejecutar la guía de aceptación, ampliar zoom/teclado/lector de pantalla y recorridos autenticados, y obtener aprobación del usuario. No se aprueban pendientes de Seguridad S7, Cobranzas ni Grillas con esta entrega.
