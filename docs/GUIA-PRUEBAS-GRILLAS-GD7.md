# GD7 — Guía de aceptación de grillas de detalle

Fecha: **27-10-2026**. Esta guía reúne la revisión funcional pendiente de GD2–GD6. Las pruebas automáticas no equivalen a aprobación del usuario ni cierran otros hitos (Seguridad, Cobranzas o Dashboard).

## Preparación

Usar una copia de pruebas para confirmar compras, reservas, producción, guías o pagos. No cargar operaciones ficticias en la instalación de trabajo. El responsable técnico debe preparar esa copia con archivos privados aislados y cuentas de prueba por rol. Para la revisión sólo visual, se pueden consultar documentos existentes sin modificarlos.

Probar escritorio y móvil, ancho 360 px y zoom de navegador 200%. Comprobar desplazamiento dentro de las tablas, visibilidad de títulos/errores, Tab/Shift+Tab/Enter/Escape, selección buscable y retorno de foco. Si se pierde una respuesta de guardado, conservar la pantalla y el intento hasta recuperar el resultado; no crear otra operación para reemplazarlo.

## Casos y estado de aprobación

Responder con el identificador y **aprobado** o **con detalles**, indicando documento de prueba, rol, acción y resultado observado. Todos estos estados parten pendientes; no se rellenan por haber pasado un ensayo simulado.

| Caso | Recorrido y resultado esperado | Estado del usuario |
| --- | --- | --- |
| GD7-01 | Compras: agregar dos detalles, editar el segundo, cancelar/descartar una edición y quitar con confirmación. Cabecera, equivalencias/precios y alta interna de materia prima/proveedor se conservan | Pendiente |
| GD7-02 | Recibir parcialmente dos líneas; excluir una sin borrar origen; revisar agotadas/cerradas y comprobar stock/Kardex después de confirmar | Pendiente |
| GD7-03 | OCC neta e histórica: aceptar parcialmente, conservar origen, revisar descuento/IVA/cuenta única; consulta con y sin permiso de precios | Pendiente |
| GD7-04 | Plan OT: Ver/Configurar, guardar borrador y confirmar; obra propia permite las altas/bajas previstas y comercial conserva cantidades contratadas | Pendiente |
| GD7-05 | Distribuir materiales/stock entre bodegas, revisar receta histórica y un redondeo obligatorio con motivo; comprobar cobertura/reservas reales | Pendiente |
| GD7-06 | Producción: cargar consumos, cancelar y aceptar reemplazo, editar/quitar una fila sin afectar otra; comprobar avance, stock y reservas tras confirmar | Pendiente |
| GD7-07 | Consulta OT: revisar origen, receta, previsiones y motivos históricos; comprobar tablas de efectos de cierre/reversión y dependencias vigentes | Pendiente |
| GD7-08 | Salida: misma partida en dos bodegas, límite conjunto, exclusión vacía y conformidad de servicio con nombre/fecha; comprobar entrega neta/stock reales | Pendiente |
| GD7-09 | Devolución parcial y luego completa: no superar pendiente, recepción física en bodega original y servicio sin inventario; factura/deuda/pagos e historia productiva se conservan | Pendiente |
| GD7-10 | Cobranzas: abonos/promesas paginados, Ver y comprobantes anteriores/nuevos; anular con motivo, consulta sin acciones de escritura y autoría sólo Administrador | Pendiente |
| GD7-11 | Compras/OCC/OT y PDF: abrir historias/versiones, consultar motivos/partidas y descargar archivos previos sin regenerarlos | Pendiente |
| GD7-12 | Mis sesiones: identificar actual, actividad/vencimiento, revocar otra y todas las demás sin perder la actual | Pendiente |
| GD7-13 | Recorrer los diálogos sólo con teclado, volver al disparador y cerrar un detalle sin cerrar su documento. Revisar móvil, zoom 200%, textos largos y tablas desplazables | Pendiente |
| GD7-14 | En entorno técnico controlado, perder respuesta después del commit: reintentar con mismo contenido/UUID y comprobar una sola operación y sus efectos | Pendiente |

## Criterios transversales GD1

| Criterios | Evidencia técnica disponible | Validación restante |
| --- | --- | --- |
| CA-01–05 | Ensayos de copia local, aceptación/descarte, errores, selección e identidad estable en GD2–GD6 | Recorrido integral y altas internas de catálogo |
| CA-06/07/10/14 | Límites de interfaz y cálculo puro de requisitos; validadores/servicios existentes conservados | Importes netos/históricos, stock y cobertura con datos reales |
| CA-08/09 | Consulta sin escritura, precios/autoría por rol y cobertura estática S4 | Solicitudes HTTP directas por rol, permisos de archivos y revocación reales |
| CA-11/12/13 | Interacciones de diálogos, foco y montaje responsive con ensayos de componentes | Teclado completo, zoom nativo 200%, contraste y accesibilidad con usuarios |
| CA-15 | Ensayos de pérdida de respuesta simulada con contenido/UUID idénticos | Commit y recuperación transaccional real |
| CA-16/18 | Servicios y archivos históricos sin cambios por el hito visual | Regresión de rollback/concurrencia y comparación documental en copia |
| CA-17 | Altas internas anteriores conservadas | Crear catálogo y cancelar documento, verificando su persistencia |

## Incidencias

| Caso | Documento / rol | Detalle observado | Corrección / nueva prueba | Estado |
| --- | --- | --- | --- | --- |
| — | — | Sin incidencias informadas por el usuario para esta guía | — | Pendiente de ejecución |

## Continuidad técnica

Ejecutar `node --import tsx scripts/validar-grillas.ts` desde la raíz para los ensayos de componentes con CSS Tailwind local y transporte simulado. La evidencia predeterminada queda en `var/validacion/grillas-gd7/`: PNG por ancho y `resultado.json`. No inicia Next ni conecta con PostgreSQL. Chromium necesita permisos del entorno para arrancar.

Para exportar el manual actualizado: `node --import tsx scripts/exportar-manual.ts`. Usa sólo Markdown e imágenes locales, sin acceder a cuentas o documentos de negocio. Salida: `docs/MANUAL-USUARIO.pdf`.

La instalación real, el build y los ensayos con copia de PostgreSQL conservan su estado documentado en [GRILLAS-GD7-VALIDACION.md](GRILLAS-GD7-VALIDACION.md). Registrar resultados reales antes de marcar GD7 cerrado.
