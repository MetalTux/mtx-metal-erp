# GD6 — Cobranza e historiales secundarios

Fecha: **27-10-2026**. Estado: implementado; aprobación funcional pendiente.

## Cambios completados

1. **Cobranza:** abonos en grilla por página con fecha, importe, medio, referencia, estado y acciones existentes. Ver abre registro/anulación, referencia completa y tabla de comprobantes con enlaces protegidos originales. Las descargas anteriores se conservan. Registrar, Anular y Adjuntar mantienen sus condiciones y permisos; no hay edición ni borrado de abonos históricos.
2. **Promesas:** tabla con fecha anterior/nueva y registro; Ver muestra motivo y acceso de Administrador a la autoría registrada. Navegación de páginas de promesas y abonos conserva filtros y cuenta. No se cambian consultas, tamaños de página, saldos ni vencimientos.
3. **Compras:** tablas separadas de cierres y recepciones; Ver consulta motivo o partidas históricas con cantidades por presentación e inventario, sin sumarlas entre unidades. La fecha de recepción se etiqueta como hecho; el cierre mantiene su fecha de registro. No se crean operaciones desde estas tablas.
4. **PDF:** cotizaciones, OT y guías muestran emisiones en tablas con revisión/plantilla, estado o tipo, fecha y Ver/Descargar. Se mantienen consulta/emisión, restricciones, reintentos y rutas privadas existentes. No se regeneran ni modifican archivos por cambiar la presentación.
5. **OCC/OT:** operaciones de OCC en tabla. La tabla de revisiones/operaciones de OT ya se implementó en GD4 y se conserva, con motivos y datos históricos.
6. **Mis sesiones:** tabla con sesión actual/otra, inicio, última actividad, vencimiento máximo y revocación individual de las otras sesiones. Se conserva Cerrar las demás sesiones y el cierre actual existente. No se agregan nuevos datos a la API ni cambian reglas de expiración.

GrillaHistorial comparte sólo presentación semántica, columnas numéricas explícitas, vacío y desplazamiento horizontal. VerDetalleHistorial comparte consulta en diálogo con retorno al disparador y Escape limitado al detalle. Ambos usan Table/Dialog/Button existentes; no implementan cálculos ni escrituras. Se amplía el ancho del detalle de cuenta para facilitar lectura.

Sin cambios de esquema, migraciones, servicios, consultas Prisma, DTO, endpoints, Server Actions ni dependencias. La autoría histórica se consulta cuando existe; no se inventa un autor para registros anteriores.

## Verificación técnica

- [x] `pnpm lint` y `pnpm exec tsc --noEmit`.
- [x] `node --import tsx tests/seguridad-s4-cobertura.ts`: 93 acciones, 25 páginas, 7 rutas de archivos y 127 entradas protegidas.
- [x] `node --import tsx tests/grillas-gd6.ui.ts`: Chromium con página/componentes reales y consultas, acciones, API de sesiones y router simulados. Comprueba páginas de abonos/promesas y sus enlaces, motivos, comprobantes anteriores/nuevos, visibilidad de operaciones/autoría por rol, consulta anidada y retorno de foco, tablas/rutas de PDF históricos y revocación individual/de las demás sin seleccionar la sesión actual. Montaje a 360/768/1280 px sin errores JavaScript.
- [ ] `pnpm build`: ejecutado y bloqueado por permisos al crear proceso/puerto interno de Turbopack (`Operation not permitted`). No se declara compilación exitosa.
- [ ] Integración con Next/RSC y PostgreSQL, descargas reales y operaciones de sesión reales. El transporte simulado no prueba guardas ni revocaciones en servidor.
- [ ] Recorrido funcional/visual de Compras y OCC, estilos completos, teclado, zoom 200% y móvil. No se ejecutó navegador integral de estos dos módulos en esta entrega.

No se iniciaron servidores de aplicación ni se modificó la BD; navegador de ensayo cerrado. Las pruebas de viewport sin estilos completos no certifican apariencia o contraste.

## Recorrido pendiente del usuario

- [ ] Abrir una cuenta con varias páginas de abonos/promesas, revisar estado/importe y navegar conservando filtros.
- [ ] Usar Ver en un abono vigente y anulado, descargar un comprobante anterior y otro posterior, revisar motivo y autoría con Administrador.
- [ ] Probar consulta sin botones operativos; como Cobranza, registrar/anular/adjuntar con las validaciones vigentes, en copia de pruebas.
- [ ] Consultar cierres y recepciones de compra con varias partidas, abrir/cerrar detalle y comprobar fechas/cantidades históricas.
- [ ] Revisar emisiones de cotizaciones/OT/guías: abrir/descargar versiones anteriores sin regenerarlas.
- [ ] Consultar operaciones de OCC y revisiones/motivos de OT.
- [ ] Revisar dos sesiones propias, cerrar otra y cerrar las demás sin afectar la actual.
- [ ] Revisar foco, Escape en diálogos anidados, descripciones largas, móvil y zoom con estilos completos.

Manual Markdown actualizado; PDF anterior sin regenerar. GD7 pendiente: regresión transversal, revisión funcional y actualización de capturas/PDF según el alcance acordado. Las aprobaciones pendientes de otros hitos no se dan por resueltas.
