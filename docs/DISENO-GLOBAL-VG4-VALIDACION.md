# VG4 — Inventario

Fecha: **28-10-2026**. Implementación terminada; ensayos técnicos con fixtures. Revisión del usuario pendiente.

## Cambios

- Stock/Kardex de materia prima y terminado comparten densidad, filtros compactos, ayudas de 13 px y cabeceras de 23 px donde eran particulares. Estados de reposición siguen expresados con texto y cantidades/unidad.
- TablaConsulta incorpora `numerica` opcional para alinear existencias, mínimos, diferencias y saldos; no infiere unidades ni convierte cantidades. El resto de las columnas mantiene su alineación. Filas de referencia de 40 px, paginación legible y borde de selector consistente con campos.
- El contenedor horizontal de la tabla recibe nombre de región, foco y desplazamiento con teclado. En móvil se indica cómo llegar a columnas y acciones fuera del ancho visible. Se utiliza containerProps ya disponible, sin cambiar la API de Table.
- Mínimos, inventario inicial, ajustes, traslados y formularios de terminado conservan anchos propios, con min-width y scroll contenidos. Las acciones se distribuyen al faltar espacio.
- Ver/Corregir en ajustes y traslados, y Ajustar en terminado, tienen nombres accesibles que identifican el registro. Se conserva el texto visible y los permisos originales.
- Se mantienen diferencias entre consultar, revisar y confirmar; motivos, bodegas, saldos y unidad permanecen en sus lugares. Confirmaciones, bloqueo durante solicitudes y protección del borrador no fueron sustituidos.

Sólo cambian presentación y etiquetas accesibles. No se modificaron consultas/acciones/servicios de servidor, esquemas, saldos, movimientos, precisión, unidad, fechas, UUID, referencias, versiones ni reglas de corrección. Sin migraciones ni escritura en PostgreSQL.

## Verificación

| Comando | Resultado / alcance |
| --- | --- |
| `pnpm lint` | Correcto |
| `pnpm build` | Turbopack bloqueado por restricción interna de puertos conocida |
| `pnpm exec next build --webpack` | Correcto, incluidos tipos y rutas |
| `pnpm exec tsx tests/diseno-global-vg4.ui.ts` | Stock y movimientos de materia prima, ajustes, traslados y cuatro vistas de terminado; temas fijados/comprobados, 360/768/1280, mínimos, carga inicial, ajustes/correcciones, consulta, vacíos y errores; desplazamiento horizontal por teclado |
| `pnpm exec tsx tests/piloto-visual.ui.ts` | Dashboard/Compras, temas, anchos y grilla, teclado, foco, errores y borrador al cancelar altas relacionadas |
| `pnpm grillas:validar var/validacion/diseno-global-vg4/grillas` | 7/7: requerimientos, cobertura S4 y GD2–GD6, transporte simulado |
| `pnpm manual:pdf` | Manual actualizado |

Las acciones del ensayo se sustituyen por mocks; los saldos/configuraciones son ficticios. Las respuestas de resultado no confirmado se muestran conservando el formulario, sin ejecutar una transacción real. La revisión de diff confirma que no se tocaron las funciones transaccionales. No se prueba concurrencia, persistencia de stock ni validación de servidor desde estas capturas.

## Evidencia

- Matriz y medidas: var/validacion/diseno-global-vg4/resultado.json y PNG del mismo directorio.
- Regresión: var/validacion/diseno-global-vg4/grillas/resultado.json y var/validacion/piloto-visual/resultado.json.
- Selección permanente: [capturas VG4](capturas/diseno-global-vg4/).
- Referencia previa de Stock: muestras de [VG1](DISENO-GLOBAL-VG1-VALIDACION.md).

Matriz de 130 escenarios; 3088 mediciones de texto visible, mínimo observado 5,79:1 frente a 4,5:1 sobre fondos compuestos. No se presenta como auditoría exhaustiva de todos los pares gráficos/foco. Se inspeccionan capturas con datos ficticios; tablas anchas permanecen dentro del documento, sin desborde de página.

## Pendientes explícitos

- [ ] Conformidad del usuario con la presentación.
- [ ] Recorridos autenticados completos con datos reales autorizados, incluidas correcciones, resultados inciertos y saldos finales.
- [ ] Zoom real 200% y lector de pantalla; el ensayo de móvil no los sustituye.

Las validaciones funcionales anteriores de Inventario mantienen su estado. **Siguiente desarrollo: VG5 — Ventas.**
