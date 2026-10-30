# VG6.1 — Trabajos

Fecha: **28-10-2026**. Primera parte de VG6, conforme a la solicitud de avanzar por partes. Implementado y ensayado con fixtures; conformidad del usuario pendiente.

## Alcance implementado

- Listado de Órdenes de Trabajo con espaciado/filtros/paginación compactos, tabla horizontal enfocable y nombres accesibles de Ver OT que identifican su folio.
- Plan comercial y obra propia: ayudas de 13 px, acciones distribuibles y densidad coherente con VG1–VG5. Se mantienen separadas Guardar borrador y Confirmar y reservar plan.
- Configuración de partidas, receta histórica, materiales por bodega y abastecimiento desde stock: diálogos contenidos con anchos propios, min-width controlado, overscroll y selectores con borde de campo. Cantidades/unidades y las grillas existentes permanecen visibles/desplazables.
- Consulta de OT conserva su detalle y el recorrido al plan. No se reemplazan datos históricos ni se actualiza una receta automáticamente.

Archivos de aplicación modificados: src/components/ordenes-trabajo/ordenes.tsx, formulario.tsx y editor-linea-plan.tsx. Los cambios son de clases/etiquetas accesibles; no se modifican handlers, servicios ni esquema. El contenedor del diálogo de OT es compartido con otros modos y éstos heredan su contención, sin considerarse revisados por ello.

**Fuera de esta entrega:** formularios de producción/consumos/terminado, cierre, factura externa, reversiones productivas, despacho/guías/devoluciones y revisión particular de emisiones PDF. No se da VG6 completo por terminado.

## Comprobaciones

| Comando | Resultado / alcance |
| --- | --- |
| `pnpm lint` | Correcto |
| `pnpm build` | Restricción interna de puertos de Turbopack conocida |
| `pnpm exec next build --webpack` | Correcto; tipos y rutas incluidos |
| `pnpm exec tsx tests/diseno-global-vg6-trabajos.ui.ts` | 54 escenarios, Claro/Oscuro efectivo comprobado, 360/768/1280; listado/consulta, rol de lectura, vacío, plan comercial, obra propia, lote pequeño y editor de partida |
| `pnpm grillas:validar var/validacion/diseno-global-vg6-trabajos/grillas` | Regresión de grillas con servicios simulados, Oscuro |
| `GRILLAS_TEMA=claro pnpm grillas:validar var/validacion/diseno-global-vg6-trabajos/grillas-claro` | Misma regresión, Claro |
| `pnpm manual:pdf` | Manual actualizado |

GD3 comprueba identidad al quitar partidas, borradores, restricciones comerciales, receta histórica, revisión obligatoria/motivo, materiales/stock, descarte, consulta y reintento con la misma clave. Los ensayos de otras grillas son regresión; no equivalen a implementar sus áreas en esta entrega.

La matriz nueva mide 1092 muestras de texto visible, mínimo observado 5,79:1 frente a 4,5:1. No acredita todos los pares gráficos/foco. Usa componentes reales y acciones ficticias; no se modifica stock/reservas ni se autentican usuarios reales. No se cambiaron cálculos, plan, UUID, versiones, permisos de servidor ni transacciones.

## Evidencia y pendientes

Resultados en var/validacion/diseno-global-vg6-trabajos/resultado.json, grillas/resultado.json y grillas-claro/resultado.json. Selección de imágenes en [capturas de Trabajos](capturas/diseno-global-vg6-trabajos/).

- [ ] Revisión funcional del usuario con datos autorizados.
- [ ] Flujos autenticados completos y persistencia real del plan/reservas. Los mocks no prueban transacciones ni concurrencia.
- [ ] Zoom real 200% y lector de pantalla; capturas móviles no los sustituyen.
- [ ] **VG6.2 Producción:** revisión visual específica de ejecución, consumos, terminado, cierre/factura y correcciones.
- [ ] **VG6.3 Despacho:** guías, distribuciones, devoluciones e historia/emisiones correspondientes.
