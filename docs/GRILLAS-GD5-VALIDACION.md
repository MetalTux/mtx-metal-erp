# GD5 — Preparación y corrección de guías en grillas

Fecha: **27-10-2026**. Estado: implementado en GD-07/GD-08; aceptación funcional pendiente.

## Pasos implementados

1. **Preparación de salida:** grilla de partida OT + bodega/prestación con unidad, pendiente, reserva propia, máximo orientativo, cantidad seleccionada y conformidad/estado. Editar abre un borrador independiente. Cantidad vacía excluye la distribución sin borrar el origen; cero escrito se rechaza. No hay Agregar/Quitar partidas ajenas a la OT.
2. **Cantidad y conformidad:** el editor usa el esquema existente y Decimal. Verifica máximo de la bodega y cobertura conjunta de las otras distribuciones de la misma partida; no suma unidades diferentes. Servicio/a medida exigen nombre y fecha de conformidad válida, sin superar la salida. Cancelar con cambios ofrece descarte. Aceptar detalle cambia sólo el borrador.
3. **Previsualización de salida:** tabla con lo validado por el servidor, destino y conformidad. Confirmar usa una copia de los datos y UUID creados al previsualizar; cabecera/detalles y nueva previsualización quedan bloqueados durante confirmación o resultado incierto. Reintentar misma salida conserva exactamente ese intento.
4. **Corrección/devolución:** grilla de partidas originales, bodega original, unidad, entregado original, pendiente retornable y cantidad seleccionada. Editar reutiliza DialogoCantidadDetalle; rechaza cantidades superiores al pendiente y conserva la fila original aunque se excluya del intento. Partidas agotadas quedan visibles y bloqueadas mientras haya otras pendientes.
5. **Revisión de corrección:** tabla previa a la confirmación final, con fecha, motivo y partidas seleccionadas. Modificar selección vuelve al borrador; tras un resultado incierto se conserva la copia y UUID y sólo se permite reintentar. Se mantiene la confirmación física de recepción en las bodegas originales; prestaciones revierten entrega acreditada sin inventario.

Los servicios existentes conservan límites definitivos, permisos, versión, bloqueos, stock/Kardex/reservas, emisión del documento e inmutabilidad. Cambiar presentación no altera deuda, factura, abonos ni dependencias productivas. No hay esquema, migraciones, nuevas acciones, DTO ni dependencias. TablaPartidasGuia sólo presenta las tablas de estos dos flujos.

## Verificación ejecutada

- [x] `pnpm lint` y `pnpm exec tsc --noEmit`.
- [x] `node --import tsx tests/seguridad-s4-cobertura.ts`: 93 acciones, 25 páginas, 7 rutas de archivos y 127 entradas protegidas.
- [x] `node --import tsx tests/grillas-gd5.ui.ts`: Chromium, componentes reales y acciones/router simulados. Comprueba identidad entre dos bodegas de la misma partida, límite conjunto, cantidad cero, conformidad/nombre/fecha, descarte, exclusión sin borrar filas, invalidación de previsualización, devolución parcial y rechazo superior al pendiente, partidas agotadas, respuesta de recepción física exigida y reintentos con idéntico contenido/UUID. Montaje a 360/768/1280 px sin errores JavaScript y sin formularios HTML anidados.
- [x] Adaptar selectores y secuencia de `tests/guias-despacho.ui.ts` a los diálogos y la revisión previa de corrección. **No se ejecutó** esa prueba integral de G6 en esta entrega.
- [ ] `pnpm build`: ejecutado, bloqueado al crear proceso/puerto interno de Turbopack (`Operation not permitted`). No se declara compilación exitosa.
- [ ] Pruebas de servicios/UI con PostgreSQL: pendientes sobre copia descartable. Las respuestas simuladas no prueban transacciones, saldos reales, conservación financiera ni commit recuperado.

No se iniciaron servidores de aplicación ni se escribieron fixtures en la BD. Navegador de ensayo cerrado. Cambiar el viewport sin estilos completos no certifica contraste, móvil o zoom reales.

## Revisión pendiente

En una copia de pruebas:

- [ ] Preparar salida parcial de una partida desde dos bodegas, probar exceso conjunto y excluir una distribución dejando la cantidad vacía.
- [ ] Registrar servicios/a medida con nombre y fecha de conformidad, incluyendo intentos inválidos.
- [ ] Cancelar una edición sin perder cabecera ni otras filas; comprobar teclado, foco y descripciones largas.
- [ ] Revisar tabla y confirmar salida; comprobar guía, reservas, stock/Kardex y entrega neta reales.
- [ ] Corregir parcialmente y luego el pendiente completo, conservando bodega original y recepción física; prestaciones sin inventario.
- [ ] Verificar factura/deuda/abonos sin cambios y que devolver no habilite una reversión productiva bloqueada por historia.
- [ ] Probar concurrencia y recuperación tras commit real con el mismo UUID en copia descartable.
- [ ] Revisar estilos reales, móvil, zoom 200% y foco de todos los diálogos.

Manual Markdown actualizado; PDF anterior sin regenerar. GD6 no iniciado. Las validaciones pendientes de otros hitos mantienen sus estados.
