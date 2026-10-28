# GD4 — Producción y consultas de OT

Fecha: **27-10-2026**. Implementación de GD-06/GD-09; revisión funcional pendiente.

## Entrega por paso

1. **Registro de producción:** consumos reales en grilla con material, unidad, bodega, cantidad y reserva propia orientativa. Agregar/Editar abre un borrador independiente; Aceptar detalle no guarda la producción. Quitar y reemplazar consumos previstos requieren confirmación. Claves locales estables preservan identidad al eliminar otra fila. Se validan cantidad positiva, bodega compatible y duplicados material/bodega antes de aceptar.
2. **Revisión de lote:** necesidades en tabla de exacto/previsto/revisado/diferencia. Las revisiones exigidas se completan mediante diálogo con cantidad positiva y motivo obligatorio. Se conservan cantidad del lote, fecha, destino de terminado, observaciones y vínculo opcional a un registro revertido. Los efectos muestran consumo, físico antes/después y reservas propia/ajena/libre.
3. **Consulta:** tablas separadas de partidas, recursos/cobertura, registros, reservas, eventos y revisiones de planificación. Ver abre receta histórica, motivos, previsiones, consumos y resultados, conservando los IDs de origen y las referencias de corrección/reversión. Registrar fabricación/avance, Revertir y Liberar siguen sujetos a permiso/estado; documentos históricos no se editan desde las tablas.
4. **Cierre/reversión:** preparación y reservas de entrega en tablas; restitución de materiales y retiro de terminado comparan saldos antes/después. Se conservan confirmación física, motivos, dependencias y revalidación transaccional existentes. El cierre no mueve stock; sus tablas muestran preparación, sin inventar cambios de saldo.

`TablaDetallesTrabajo` es sólo un auxiliar visual local de OT sobre Table: columnas explícitas, estado vacío y región con desplazamiento horizontal accesible. No es un motor de formularios. `EditorConsumo` usa los esquemas de producción existentes y descarte/foco. Sin dependencias nuevas, esquema, migraciones, DTO ni Server Actions nuevos. Servicios y reglas de stock/Kardex/reservas intactos.

## Verificación técnica

- [x] `pnpm lint` y `pnpm exec tsc --noEmit`.
- [x] `node --import tsx tests/requerimientos-produccion.ts`: cálculo exacto, redondeo, unidades, límites y cobertura parcial.
- [x] `node --import tsx tests/seguridad-s4-cobertura.ts`: 93 acciones, 25 páginas, 7 rutas de archivos y 127 entradas protegidas.
- [x] `node --import tsx tests/grillas-gd4.ui.ts`: Chromium correcto, componentes reales y acciones simuladas. Comprueba revisión obligatoria, cantidad positiva, filtro de bodegas, duplicados, edición tras quitar otra fila, descarte, confirmación de reemplazo, conservación del intento/UUID, permisos de consulta, historia de reversión y tablas de cierre/reversión. Montaje a 360/768/1280 px sin errores JavaScript.
- [ ] `pnpm build`: ejecutado y bloqueado por `Operation not permitted` al crear proceso/puerto interno de Turbopack, también en el reintento con permisos ampliados. No se declara compilación exitosa.
- [ ] Integración con PostgreSQL: rollback, concurrencia, consumo real y reservas/cierre/reversión. No ejecutada en esta conversión visual; requiere copia local descartable, nunca la BD de trabajo.

No se iniciaron servidores de aplicación ni se escribieron fixtures en BD; el navegador del ensayo se cerró.

El ensayo de navegador monta componentes reales y sustituye las acciones por respuestas simuladas. No prueba escrituras de servicios, SQL ni validaciones transaccionales. El cambio de viewport no certifica apariencia, contraste o zoom con Tailwind real.

## Revisión funcional pendiente

En una copia de pruebas:

- [ ] Registrar fabricación con consumos repartidos en dos bodegas; editar/quitar/agregar filas y cancelar un detalle sin modificar lo aceptado.
- [ ] Cargar consumos previstos con cambios existentes: cancelar y aceptar su reemplazo.
- [ ] Revisar un lote pequeño que exija redondeo, incluyendo rechazo sin motivo o con cantidad cero.
- [ ] Probar catálogo, trabajo a medida y servicio puro; conservar fecha y registro revertido de origen.
- [ ] Revisar efectos y confirmar un registro; comprobar stock/Kardex/avance y reservas.
- [ ] Consultar receta, previsión histórica, motivos, resultados y reversión vinculada mediante Ver.
- [ ] Probar perfil de consulta, liberación de reserva y restricciones por estado.
- [ ] Revisar cierre y reversión con sus dependencias, saldos y restitución física reales.
- [ ] Revisar teclado, foco, móvil, zoom 200%, textos largos y varias filas con estilos completos.

Manual Markdown actualizado. PDF anterior sin regenerar. GD5 y las aprobaciones pendientes de otros hitos conservan sus estados.
