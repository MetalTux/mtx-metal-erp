# GD3 — Planificación OT: implementación y verificación

Fecha: 27-10-2026. Estado: implementado y comprobado técnicamente en el alcance indicado; aprobación funcional pendiente.

## Cambios por paso

1. **Partidas:** grilla principal con modo, cantidades, fabricación, abastecimiento y cantidad de distribuciones del borrador. Ver/Configurar abre un diálogo independiente. Agregar/quitar sigue limitado a la creación de obra propia; una OT comercial conserva sus IDs, origen y cantidades contratadas. Quitar exige confirmación.
2. **Materiales:** subgrilla de necesidades con cantidad exacta, prevista/revisada, diferencia y estado. La revisión exigida requiere cantidad positiva y motivo. Distribuciones con bodega/cantidad, disponibilidad, edición y eliminación confirmada; se conservan varias distribuciones del mismo material. Recetas históricas y actualización explícita conservadas.
3. **Stock:** subgrilla de abastecimiento con bodega, cantidad/unidad y disponibilidad orientativa, distinguiendo materia prima y terminado. Selectores limitados a bodegas compatibles. Los totales, cobertura y disponibilidad se revalidan mediante el servicio existente al guardar/confirmar.

`EditorLineaPlan` conserva borrador propio y claves estables por distribución. Aceptar la partida actualiza sólo el borrador de OT; cancelar permite descartar. Formularios separados sin anidamiento HTML. Consulta sin aceptación de cambios. El padre bloquea guardado/cierre durante edición; una respuesta incierta conserva datos y UUID para reintentar.

Sin cambios de esquema, migraciones, servicios de stock/reservas, DTO ni Server Actions. Se reutilizan esquemas y cálculo Decimal existentes. No se interpreta disponibilidad como reserva efectuada.

## Evidencia ejecutada

- `pnpm lint` y `pnpm exec tsc --noEmit`: correctos.
- `node --import tsx tests/requerimientos-produccion.ts`: correcto; requisitos exactos, redondeos, lotes pequeños, unidades y reservas parciales.
- `node --import tsx tests/seguridad-s4-cobertura.ts`: correcto; 93 acciones, 25 páginas, 7 rutas de archivos y 127 entradas protegidas.
- `node --import tsx tests/grillas-gd3.ui.ts`: correcto en Chromium. Componentes reales, guardado simulado, sin servidor ni BD. Comprueba identidad tras quitar una distribución, cantidades comerciales bloqueadas, receta histórica, revisión obligatoria con motivo, validación de cantidad, descarte, consulta, ausencia de formularios anidados y reintento idéntico. Montaje a 360/768/1280 px sin errores JavaScript; no sustituye revisión visual con Tailwind real.
- `pnpm build`: ejecutado, bloqueado por Turbopack al crear proceso/abrir puerto interno (`Operation not permitted`). No se declara compilación exitosa.

El navegador se cerró. No se iniciaron servidores de aplicación ni se escribieron fixtures en la base de trabajo.

## Revisión pendiente del usuario

Usar una copia de pruebas para las operaciones que guarden o reserven:

- [ ] Abrir una OT comercial y configurar una partida; comprobar origen/cantidad inmutables y receta histórica.
- [ ] Distribuir un material en dos bodegas; quitar/editar filas y comprobar que se modifica la fila correcta.
- [ ] Revisar un lote que exija justificar redondeo; probar falta de motivo y aceptación válida.
- [ ] Distribuir abastecimiento de terminado y materia prima, comprobando bodegas compatibles.
- [ ] Crear una obra propia, agregar/configurar/quitar partidas y cancelar cambios sin perder cabecera.
- [ ] Guardar borrador y confirmar plan; comprobar cobertura, reservas y faltantes con el flujo real.
- [ ] Revisar consulta, permisos, foco/teclado, zoom, textos largos y móvil con estilos reales.

Las validaciones pendientes de GD2, Seguridad y Cobranzas conservan sus estados. GD4 queda pendiente. El manual Markdown está actualizado; su PDF no fue regenerado en esta entrega.
