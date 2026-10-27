# Dashboard — lectura de indicadores y avisos

Preparado el **24-10-2026**. Plan y estados en [HITO-DASHBOARD.md](HITO-DASHBOARD.md). El Dashboard consulta datos existentes; abrirlo no mueve stock, registra pagos ni crea documentos.

## Indicadores

- **Cotizaciones pendientes:** ofertas pendientes no eliminadas, separadas en vigentes/sin vencimiento y vencidas. Una oferta que vence hoy sigue vigente. Se identifican registros antiguos sin folio cuando existan; pueden no aparecer en el listado comercial moderno.
- **Órdenes de trabajo activas:** planes confirmados en preparación y trabajos en producción. Los borradores se informan aparte. Trabajos antiguos sin plan conciliado también se indican aparte; finalizados y anulados quedan fuera.
- **Por cobrar:** suma de saldos positivos de cuentas vigentes de OCC. Los pagos anulados no reducen saldo; las cuentas anuladas no suman. El saldo vencido considera vencimiento anterior a hoy y deuda pendiente. Las guías no multiplican deuda.
- **Materiales con stock bajo:** cantidad de combinaciones materia prima/bodega con saldo menor al mínimo configurado. Un mínimo cero es válido y distinto de no configurar. No se suman kilos, metros ni unidades para obtener esta cifra.

Las cifras financieras sólo se muestran a perfiles con los permisos correspondientes. Los bloques disponibles dependen de la unión de roles del usuario; no todos los perfiles ven el mismo resumen.

## Requerimiento de materiales frente a stock

La tabla muestra hasta diez combinaciones priorizadas de consumo pendiente en planes activos, por material y bodega. Las ventas directas y entregas de producto terminado se revisan en sus módulos: este bloque representa insumos de producción.

| Columna | Cómo interpretarla |
| --- | --- |
| Pendiente | Consumo que falta para la fabricación, considerando ejecuciones y reversiones registradas |
| Físico | Saldo actual de la bodega |
| Reservado para consumo | Reserva activa asociada a esos requerimientos de consumo |
| Libre | Físico menos todas las reservas activas de ese material/bodega, incluidas otras necesidades |
| Por reservar | Parte del consumo pendiente todavía sin reserva propia |
| Faltante físico | Lo que faltaría después de usar el stock libre para cubrir la parte por reservar |

**Reservado** significa que esos consumos tienen reserva; **Por reservar**, que existe disponibilidad libre pero falta reservar; **No alcanza**, que la parte pendiente de reservar supera lo libre. Cada fila conserva su unidad; no sumar cantidades de filas con unidades diferentes. Para resolver un faltante, revisar Stock, Compras o las reservas del trabajo; el Dashboard no confirma esas operaciones.

## Cotizado frente a contratado

Se muestran el mes actual y cinco anteriores. Cada mes agrupa por fecha del documento de cotización. **Cotizado** suma sus importes originales registrados; **Contratado** suma los importes propios de OCC vigentes de esas mismas cotizaciones, con contratación parcial cuando corresponda. Una OCC anulada no cuenta como contratación vigente.

El gráfico describe cohortes de cotizaciones: contratar este mes una oferta de un mes anterior actualiza la columna del mes de esa oferta. No representa necesariamente ingresos, dinero cobrado ni ventas contratadas durante ese mes. La tabla bajo las barras muestra los importes exactos, también con meses en cero. Las cotizaciones rechazadas siguen siendo ofertas cotizadas; las eliminadas lógicamente se excluyen.

## Listas y avisos

- **Trabajos activos:** hasta seis, priorizados por fecha objetivo y fecha del plan; el enlace abre la OT.
- **Cotizaciones por vencer:** hasta seis pendientes que vencen hoy o en los siguientes siete días, ordenadas por vencimiento. Para más registros, abrir el módulo de Cotizaciones.
- **Últimos movimientos:** hasta diez entre materia prima y producto terminado, ordenados por registro. La fecha del hecho puede ser anterior; no altera el orden histórico de registro.
- **Campana:** resume stock bajo, cotizaciones por vencer y cuentas vencidas para las áreas autorizadas. Sus enlaces llevan a los módulos para revisar y actuar; Cotizaciones abre las pendientes. No envía correos ni tiene estados leído/no leído.

Los avisos y bloques se actualizan al navegar o recargar; no son una suscripción en tiempo real. Una cifra cero es un resultado válido. Un mensaje de error significa que ese bloque no se pudo consultar: no debe interpretarse como cero. Si persiste al recargar, informar el bloque, rol y mensaje sin compartir secretos o documentos privados.

## Revisión funcional

1. Comparar una cuenta conocida con Cobranzas y un trabajo con su OT.
2. Revisar una cotización que vence hoy y otra ya vencida; comparar con su fecha real.
3. Revisar un mínimo por bodega y un requerimiento parcialmente consumido/reservado.
4. Comprobar una contratación parcial en el mes de su oferta original.
5. Abrir la campana y verificar enlaces según perfil; comprobar que no se muestran áreas sin permiso.
6. Probar escritorio, ventana estrecha, teclado y lectura de la tabla del gráfico. Registrar diferencias o aprobación en el hito.

Las pruebas técnicas usan copias descartables con datos controlados y no sustituyen la aprobación funcional ni una medición del volumen del servidor definitivo.
