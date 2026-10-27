# Hito — Dashboard y avisos internos

Inicio: **24-10-2026**. El usuario solicita continuar con Dashboard después del cierre técnico de Cobranzas. C3/C4 y los bloques restantes de seguridad S7 conservan sus revisiones funcionales pendientes.

## 1. Objetivo y estado

Reemplazar las cifras provisionales de Inicio por datos reales, consultados en servidor y filtrados por permisos. Conservar el tema/layout existentes, distinguir cero, ausencia de datos y error, y ofrecer enlaces para revisar los documentos de origen.

D0 aprobado por el usuario; D1–D4 implementados y validados técnicamente en copia. D5 y aprobación funcional pendientes según el checkpoint. La guía visual original contiene propuestas históricas de stock mínimo y cobranza ya superadas: usar mínimos por material/bodega y cuenta única de OCC con abonos vigentes. No usar estados de pago heredados de guías como fuente financiera, no sumar unidades distintas ni modificar stock al consultar.

## 2. Decisiones propuestas para validación

| ID | Propuesta | Estado |
| --- | --- | --- |
| D-D01 | Cotizaciones Pendientes separadas entre vigentes/sin vencimiento y vencidas; excluye eliminadas lógicamente | Aprobado, 24-10-2026 |
| D-D02 | OT activas = planes confirmados en preparación + trabajos en producción; borradores aparte; finalizadas/anuladas fuera del indicador | Aprobado, 24-10-2026 |
| D-D03 | Por cobrar y vencido usan el resumen protegido de Cobranzas; no suman deuda por guía | Aprobado, 24-10-2026 |
| D-D04 | Stock bajo por combinación materia prima/bodega con mínimo configurado y saldo menor al mínimo; null/cero distintos | Aprobado, 24-10-2026 |
| D-D05 | Requerimientos: consumo pendiente de OT por material/bodega frente a stock físico y reservas; mostrar faltante por reservar sin sumar unidades diferentes | Aprobado, 24-10-2026 |
| D-D06 | Seis meses, incluido el actual: importe cotizado y contratado en OCC de esas mismas cotizaciones, por mes de fecha de cotización; no reemplazar contrato por total aprobado nominal | Aprobado, 24-10-2026 |
| D-D07 | Campana interna: stock bajo, cotizaciones por vencer en siete días y cuentas vencidas, según permisos; sin correos ni estado leído/no leído | Aprobado, 24-10-2026 |

En el modelo real, PENDIENTE abarca borrador/preparación; se distingue con la última operación de plan y su `planConfirmed`. EN_PROCESO se presenta como producción. No inventar enums nuevos para las etiquetas visibles ni incluir automáticamente registros legados sin evidencia del plan.

Las fechas de calendario se interpretan según Santiago: vence hoy no es vencido. El cálculo mensual no debe mezclar fecha de registro con fecha del documento. Monto aceptado proviene de OCC vigente y su importe propio; anular OCC no debe seguir contando como contratación vigente. Las correcciones históricas conservan sus documentos originales; no sumar dos veces por relaciones de líneas/guías.

## 3. Etapas y avances

### D0 — Definiciones y preparación

- [x] Revisar Inicio actual, reglas posteriores de inventario/producción/cobranza y matriz de permisos.
- [x] Preparar documento y preguntas al usuario.
- [x] Respuestas D-D01–D-D07 aprobadas por el usuario el 24-10-2026.

### D1 — Indicadores y listas operativas

- [x] Consultas agregadas para cotizaciones pendientes, OT activas/borradores, stock bajo y Cobranzas, sin escrituras.
- [x] Lista acotada de OT activas, cotizaciones por vencer en siete días y movimientos recientes, con enlaces al módulo de origen.
- [x] DTO filtrado en servidor: roles sin permiso no reciben cifras ni documentos del área; precios sólo con precios.leer.
- [x] Sustituir indicadores provisionales, mostrar cero correctamente y estados vacíos comprensibles.
- [x] Pruebas en copia para cifras, límites, fechas y permisos; lint/build/Chromium.
- [ ] Aprobación funcional D1.

### D2 — Requerimientos y disponibilidad

- [x] Agrupar demanda de consumo pendiente por material/bodega usando funciones vigentes de producción/reservas.
- [x] Exponer físico, reservado, disponible libre y faltante por reservar con cantidades Decimal/unidades, sin convertir consultas en operaciones.
- [x] Vista acotada con estado, cifras y acceso a los módulos para revisar o actuar.
- [x] Validar reservas, consumo parcial/reversiones, dos bodegas, unidades distintas, saldos cero y permisos.
- [ ] Aprobación funcional D2.

### D3 — Comparación mensual

- [x] Agregación de seis meses con meses sin datos en cero y contratos propios de OCC, según definición aprobada.
- [x] Gráfico con cifras y alternativa textual accesible, leyenda y rango visibles; sin datos ficticios.
- [x] Respeto de permisos financieros y validación de cotizaciones/OCC parciales, anulación y fechas de borde.
- [ ] Aprobación funcional D3.

### D4 — Avisos internos

- [x] Implementar o diferir campana según respuesta del usuario; no presentar promesas provisionales como funciones disponibles.
- [x] Conteos/avisos por permisos, sin duplicar deuda ni sumas físicas; enlaces para revisar cada área.
- [x] Validar acceso, vacío, teclado y móvil; no agregar correo automático ni preferencias sin alcance aprobado.
- [ ] Aprobación funcional D4.

### D5 — Validación, operación y cierre

- [x] Conciliar cifras con datos controlados de origen en copia, incluida deuda con el resumen de Cobranzas.
- [ ] Medir rendimiento con un volumen representativo del destino real; la prueba funcional no acredita esa escala.
- [x] Regresión de permisos de seis roles y módulos S4, anchos 320/375/768/1440 y ausencia de errores JavaScript.
- [ ] Revisión funcional de foco/teclado, legibilidad y vacíos por el usuario; sin auditoría formal de accesibilidad.
- [x] Guía funcional de lectura en OPERACION-DASHBOARD.md y registro de limitaciones; actualizar cierre V1 y avances.
- [x] Retirar copias/servidores propios y verificar origen/archivos intactos.
- [ ] Aprobación expresa y cierre funcional. No cerrar Cobranzas/S7 por inferencia.

## 4. Reglas técnicas

- Consultas en servidor y permisos comprobados antes de leer cada área. No enviar cifras financieras ocultas mediante CSS o condiciones sólo del cliente.
- Reutilizar `consultarResumenCobranza` para deuda; saldo por cuenta menos pagos vigentes, anuladas excluidas. Mantener Decimal hasta la presentación.
- Paginación/límites y agregación en PostgreSQL, no descargar catálogos enteros para sumar en JavaScript. Sin relaciones hermanas en paralelo dentro de una misma transacción.
- Sin migraciones ni seed previstos inicialmente. Si aparece una necesidad real de estructura, documentarla y ensayarla en copia antes de modificar el destino autorizado.
- Pruebas que escriben sólo en copias descartables con almacenes separados; comprobar puertos antes de iniciar y retirar únicamente servidores propios.

## 5. Continuidad

Fuente de contexto: `docs/CIERRE-VERSION-1.md`, reglas de producción/inventario y checkpoint C4 de `docs/HITO-COBRANZAS.md`. El Dashboard real está pendiente al inicio; no interpretar la estructura visual existente como consultas implementadas.


## 6. Implementación y checkpoint — 24-10-2026

`src/lib/consultas/dashboard.ts` implementa bloques agregados/limitados con permisos de servidor y transacciones de lectura, cantidades/importes Decimal y hoy Santiago. El DTO de cada perfil omite las áreas no autorizadas. Cobranzas reutiliza su consulta agregada existente; cotizaciones sin precio autorizado no incluyen montos ni gráfico. Error de un bloque se muestra como error, sin convertirlo en cero.

Inicio reemplaza los datos provisionales por tarjetas, hasta seis OT, seis cotizaciones por vencer, diez combinaciones de consumo y diez movimientos de materia prima/terminado. La comparación de seis cohortes mensuales incluye tabla de importes accesible y barras, sin nuevas dependencias. La campana recibe sólo avisos de las áreas permitidas y se actualiza al navegar/recargar, sin correos ni leído/no leído.

Se usan funciones de reservas/producción vigentes. Confirmar el plan ya reserva materiales: se corrigió esa expectativa del fixture, sin modificar el comportamiento del servicio. La prueba libera/recompone una reserva para verificar el pendiente por reservar y consume parcialmente para cotejar físico, libre y reserva propia. Borradores y legados sin confirmación no inflan trabajos activos; las cotizaciones antiguas sin folio se señalan si existen, sin inventar folios ni enlaces documentales.

Validación de Dashboard correcta en copia, evidencia privada `backups/20261024_seguridad_s6/1792878086286/` (1/1): cotizaciones vigente/vencida/hoy, plan confirmado/borrador, mínimos null/cero, consumo parcial/reservas, cohortes con importe contratado de OCC, factura vencida real con abono, aviso de deuda coincidente y seis roles. Chromium verifica gráfico/tabla, campana y 320/375/768/1440 sin errores JS ni desbordamientos. No se hicieron migraciones ni escrituras en la base original.

Regresión S4 de layout/avisos contra módulos anteriores correcta (1/1), evidencia `backups/20261024_seguridad_s6/1792878144191/`: páginas, acciones/servicios/archivos, seis roles/combinación y Chromium. Lint/build/tipos y cobertura S4 correctos (127 entradas de servicio/consulta). Copias/servidores retirados y datos/almacenes originales sin cambios en ambos ensayos. No se repitió toda la batería S6. La aceptación funcional y medición representativa no se deducen de estas pruebas.

**Continuidad:** D1–D4 implementados. Completar comprobaciones finales D5, mantener pendientes las aprobaciones del usuario y la medición de volumen real. Las revisiones C3/C4 de Cobranzas y S7 siguen abiertas; no reimplementarlas para continuar este hito.


### Próximo paso

D0–D4 técnicos listos; guía de lectura en [OPERACION-DASHBOARD.md](OPERACION-DASHBOARD.md). D5 conserva la revisión/aceptación funcional, medición con volumen representativo y cierre expreso. No recrear indicadores ni volver a pedir D-D01–D-D07. Sin nuevas migraciones, dependencias o datos de ejemplo en la base real. Las validaciones C3/C4 de Cobranzas y S7 pendientes no se cierran por esta entrega.
