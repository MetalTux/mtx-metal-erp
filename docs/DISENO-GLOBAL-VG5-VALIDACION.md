# VG5 — Ventas: Cotizaciones y OCC

Fecha: **28-10-2026**. Implementación terminada; validación técnica con fixtures. Revisión del usuario pendiente.

## Cambios

- Listados de Cotizaciones/OCC con separación compacta y filtros contenidos; regiones horizontales identificadas, enfocables y con foco visible. Se preservan filtros, orden, paginación y navegación existentes.
- PDF/Ver/Editar son acciones con texto visible en Cotizaciones; Ver también en OCC. Se conservan las ayudas, nombres accesibles, condiciones y permisos. No se sustituyeron confirmaciones ni se habilitaron operaciones bloqueadas.
- Grilla de líneas cotizadas conserva materia prima/producto/servicio, cantidades/unidad y precios; Ver/Editar/Quitar con texto y acciones distribuibles. Importes/cantidades alineados para comparación.
- Formularios y diálogos de edición, consulta, corrección, aceptación y partidas conservan sus anchos, con min-width y scroll contenidos. Ayudas de 13 px; cifras tabulares y total alineado.
- Corregido texto fijo erróneo “Precios finales con IVA incluido” de la cabecera: ahora refleja precios unitarios netos en nuevas/correcciones y modalidad con IVA en revisiones históricas. La advertencia de conversión/redondeo al corregir permanece. No se cambia ningún cálculo.
- Herramientas y ayudas del editor técnico legibles; superficie documental blanca, colores copiados, formato e imágenes sin inversión por tema. No se modifica la estructura ni serialización del documento.
- Historial/controles PDF mantienen referencias y revisiones; ayudas ajustadas. No se emite, reemplaza ni regenera un PDF histórico.

Sin cambios de servicios, consultas, acciones de servidor, reglas comerciales, esquema ni base de datos. Se conservan cálculo Decimal, precios netos/históricos, modalidad de descuento, IVA, snapshots, cantidades contratadas/excluidas, deuda, UUID y versiones.

## Verificación

| Comando | Resultado / alcance |
| --- | --- |
| `pnpm lint` | Correcto |
| `pnpm build` | Turbopack bloqueado por restricción interna de puertos conocida |
| `pnpm exec next build --webpack` | Correcto; incluye tipos y rutas |
| `pnpm exec tsx tests/diseno-global-vg5.ui.ts` | Cotizaciones/OCC, Claro/Oscuro efectivo comprobado, 360/768/1280, creación/consulta/edición/corrección, líneas de tres tipos, historial PDF ficticio, neto/histórico, aceptación, cantidad contratada, consulta sin precios y cancelar alta de Cliente conservando fecha del borrador; editor real |
| `pnpm grillas:validar var/validacion/diseno-global-vg5/grillas` | 7/7, Oscuro: requerimientos, cobertura S4 y GD2–GD6 |
| `GRILLAS_TEMA=claro pnpm grillas:validar var/validacion/diseno-global-vg5/grillas-claro` | Todos correctos; GD6 pasó en repetición dirigida tras corregir una espera del ensayo (detalle abajo) |
| `pnpm manual:pdf` | Manual actualizado |

Incidencia del ensayo: GD6 Claro contó la fila vacía antes de recibir sesiones simuladas (2 filas frente a 3). Se agregó espera de “Otra sesión” antes del conteo en tests/grillas-gd6.ui.ts. La repetición dirigida con el mismo CSS/tema pasó; no se cambió código de Cobranza ni de seguridad. Evidencia de repetición en gd6-repeticion-claro/resultado.json; se conserva el fallo inicial en grillas-claro/resultado.json.

GD2 comprueba contratación parcial/exclusión, revisión obligatoria del alcance, cantidad inválida y foco, consulta histórica, ocultación de precios y reintento idéntico con la misma clave. Sus servicios son ficticios y su editor está sustituido; el ensayo VG5 complementa eso con el editor real y los catálogos/diálogos de Ventas. No confundir esas comprobaciones con una prueba transaccional real.

La matriz registra 92 escenarios y 2910 mediciones de texto visible, mínimo 5,79:1 frente a 4,5:1 sobre fondos compuestos. No acredita cada combinación gráfica/foco ni sustituye lector de pantalla. Las capturas usan exclusivamente datos ficticios. El texto de modalidad de precios tiene aserción específica para evitar que vuelva a indicar IVA incluido en documentos netos.

## Evidencia

- var/validacion/diseno-global-vg5/resultado.json y PNG del mismo directorio.
- Regresión: grillas/resultado.json y grillas-claro/resultado.json bajo el mismo directorio.
- Selección permanente: [capturas VG5](capturas/diseno-global-vg5/).

## Pendientes explícitos

- [ ] Conformidad del usuario y recorridos autenticados con datos reales autorizados.
- [ ] Emisión/descarga real de PDF y comprobación de archivos históricos; el ensayo sólo presenta un historial ficticio y no consume archivos reales.
- [ ] Registro real de cotización, corrección, contratación y alta de Cliente; no se escribe en PostgreSQL desde esta validación visual.
- [ ] Zoom real 200% y lector de pantalla. Un viewport reducido no equivale a esas pruebas.

No se aprueban por arrastre validaciones anteriores de Ventas/Seguridad. **Siguiente desarrollo: VG6 — Trabajos, producción y despacho.**
