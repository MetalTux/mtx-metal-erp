# Hito — Manual completo y usabilidad V1

Inicio: **24-10-2026**. Autorizado por «Comienza entonces», tras proponer manual completo y revisión de usabilidad sin esperar las validaciones funcionales abiertas.

## Alcance y estado

Consolidar una primera edición textual de todo el ERP por tareas y perfil, contrastada con la interfaz implementada. Revisar descubrimiento de acciones, términos, permisos, bloqueos, respuesta incierta, teclado y móvil. No cambiar reglas de negocio ni marcar como aprobadas las revisiones C3/C4, Dashboard o S7.

### M0 — Inventario y contraste

- [x] Revisar navegación y guías existentes; distinguir documentación histórica de capacidades actuales.
- [x] Contrastar controles de compras, cotizaciones/OCC, inventario, producción, guías, cobros, seguridad y configuración.
- [x] Identificar contradicciones de permisos en guías OT/Guías y accesos visibles sin permiso de operación.

### M1 — Manual transversal

- [x] Primera edición textual completa en [MANUAL-USUARIO.md](MANUAL-USUARIO.md), con índice por tarea y rutas reales.
- [x] Acceso/roles, preparación, catálogos, compra/recepción, inventario, comercial, producción/entrega, cobro, Dashboard, PDF/autoría y bloqueos.
- [x] Ejemplo integral y diferencias entre guardar, reservar, fabricar, entregar, facturar y cobrar.
- [x] Enlazar guías específicas y sustituir README genérico por entrada al manual y desarrollo local correcto.
- [x] Corregir afirmaciones antiguas de ausencia de login/roles sin borrar checkpoints históricos.
- [ ] Capturas con datos completamente ficticios/anonimizados; no publicar imágenes de bases reales o copias con datos reales.
- [ ] Recorrido del manual con usuarios de distintos niveles y aprobación de su claridad.

### M2 — Hallazgos y mejoras

- [x] Registro priorizado en [REVISION-USABILIDAD-V1.md](REVISION-USABILIDAD-V1.md), con fuente, efecto, estado y criterio de comprobación.
- [x] Correcciones de visibilidad Crear/Ver trabajo y Preparar otra entrega validadas por roles en copia/Chromium.
- [ ] Incorporar el manual dentro de la aplicación y revisar descubrimiento/etiquetas de acciones con usuarios; sin declarar aprobadas propuestas no implementadas.
- [ ] Revisión visual/táctil/teclado completa y capturas anonimizadas.

### M3 — Validación y continuidad

- [x] Revisar enlaces, títulos, reglas y diff; 65 enlaces/anclas locales correctos.
- [x] Lint/build y regresión de enlaces/permisos en copia descartable correctos (cobranza-cierre ampliado 1/1).
- [x] Copias/servidores propios retirados; datos y archivos de origen intactos.
- [ ] Aprobación expresa de manual/usabilidad; conservar separadas las validaciones de los demás hitos.

## Límite de esta revisión

Una lectura del código detecta contradicciones y accesos incoherentes, pero no mide facilidad de uso de trabajadores reales. No se presenta como auditoría formal de accesibilidad ni capacitación completada. Los documentos se pueden revisar sin iniciar servidores ni tocar datos; las dos correcciones de interfaz sí requieren compilación y pruebas.


## Checkpoint — 24-10-2026

M0 y primera edición textual M1 entregados. Manual transversal de 18 capítulos, revisión priorizada de doce hallazgos, entrada desde README y dos guías históricas conciliadas con permisos vigentes. U01/U02 corregidos en interfaz; no se modificaron reglas ni autorizaciones del servidor.

`pnpm lint`, `pnpm build`, cobertura S4 y escenario `pnpm seguridad:validar-s6 cobranza-cierre` correctos. La prueba ampliada verifica OCC con/sin OT y perfiles de operación/lectura; conserva circuito C4, cuentas, stock, obra propia y enlaces protegidos. Evidencia `backups/20261024_seguridad_s6/1792883623974/`, origen/almacenes intactos. Sin migraciones ni datos de capacitación en la base real.

Continuar con M2: ayuda integrada en aplicación, descubrimiento de acciones, mensajes persistentes y revisión de teclado/móvil; priorización en REVISION-USABILIDAD-V1.md. Capturas requieren un entorno totalmente ficticio/anonimizado. Mantener pendientes revisión con usuarios y aprobación del manual, además de C3/C4, Dashboard y S7 existentes. No volver a redactar el manual entero para retomar; revisar cambios de interfaz que afecten sus pasos.


## PDF para revisión — 25-10-2026

Generado [MANUAL-USUARIO.pdf](MANUAL-USUARIO.pdf) desde la edición textual del 24-10-2026: 23 páginas tamaño Carta, portada, índice enlazado, marcadores, texto seleccionable y numeración. Se comprobaron los 18 capítulos por extracción de texto y se inspeccionó una muestra visual de impresión. Sin cambios al contenido del manual, servicios, base de datos o aprobaciones pendientes. El PDF es una copia para revisión: regenerarlo cuando cambie el Markdown.


## 27-10-2026 — Revisión transversal de grillas de detalle

Se prepara [HITO-GRILLAS-DETALLE.md](HITO-GRILLAS-DETALLE.md) con evidencia por componente, once puntos de modificación y secuencia GD0–GD7. Distingue captura, selección de partidas de origen, consultas e historiales. Sólo se completa el inventario documental; no se implementan cambios ni se aprueban revisiones funcionales pendientes.


## Actualización de manual y ejemplos — GD7, 27-10-2026

- [x] Nueva edición Markdown/PDF con grillas GD2–GD6 y tres capturas de componentes con datos ficticios, sin documentos de trabajo.
- [x] Exportación reproducible mediante `pnpm manual:pdf`, sin dependencias nuevas ni solicitudes externas.
- [x] Guía de aceptación transversal en [GUIA-PRUEBAS-GRILLAS-GD7.md](GUIA-PRUEBAS-GRILLAS-GD7.md).
- [ ] Capturas integrales de todos los recorridos, validación de claridad con usuarios y cierre de M1/M2/M3. Los ejemplos de componentes no sustituyen esas revisiones.

La edición actual sustituye el PDF de revisión del 25-10-2026 sin alterar sus aprobaciones pendientes. Evidencia y límites: [GRILLAS-GD7-VALIDACION.md](GRILLAS-GD7-VALIDACION.md).
