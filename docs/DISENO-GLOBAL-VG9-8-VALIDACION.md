# VG9.8 — Conservación de reglas y documentos

Fecha: **29-10-2026**. **Auditoría técnica de fuentes y archivos locales. No equivale a conciliación de la base de datos ni a prueba autenticada.**

## Resultado de la revisión

La referencia es el commit **d555de5ca086492e727569a7ce7df217a3caa768**, HEAD al ejecutar la auditoría. Los cambios visuales acumulados permanecen en el árbol de trabajo, junto con modificaciones previas conservadas. Esta comparación no identifica por sí sola qué cambios llegaron a un entorno desplegado.

- [x] **200 archivos rastreados de áreas protegidas idénticos byte por byte a la referencia:** `prisma/`, `src/lib/`, `src/config/`, `src/app/api/` y las Server Actions `actions.ts` de la aplicación. Incluye esquema/migraciones, servicios, consultas, validaciones, permisos, autoría, almacenamiento y generación de PDF.
- [x] No se encontraron archivos nuevos no ignorados en esos cuatro directorios protegidos.
- [x] `package.json`, `pnpm-lock.yaml` y `prisma.config.ts` sin diferencias frente a HEAD, revisados adicionalmente con Git.
- [x] **102 archivos de interfaz rastreados y modificados revisados mediante AST de TypeScript; 113 llamadas importadas conservan sintaxis y argumentos.** Se comparan funciones importadas desde acciones, servicios, consultas y seguridad, incluido el cliente de acceso.
- [x] **Nueve pruebas puras correctas**, sin inicializar el cliente de base de datos ni emitir documentos.
- [x] **Seis PDF locales inventariados:** tres cotizaciones, dos OT y una guía. Se comprobaron tamaño, cabecera PDF y SHA-256 antes/después de la auditoría; comprobación de cierre después de las validaciones.

La comparación conserva el conjunto de firmas de llamada, no demuestra su orden temporal ni equivalencia integral de toda la interfaz: una variable puede conservar su nombre aunque cambie su construcción. Se complementa con la revisión de las áreas protegidas, las pruebas puras y los flujos simulados de VG9.7; no se presenta como demostración formal ni cobertura de cada formulario.

## Reglas y contratos comprobados

| Prueba | Alcance |
| --- | --- |
| `importes-cotizacion.ts` | Importes y descuentos de la modalidad histórica con IVA incluido. |
| `importes-cotizacion-netos.ts` | Precios netos, redondeo, IVA/total, descuentos y representación en plantilla de cotización, sin generar PDF. |
| `importes-orden-compra-cliente.ts` | Importes propios de OCC y aceptación parcial frente a la oferta. |
| `texto-cotizacion.ts` | Compatibilidad del texto técnico histórico y validación de estilos/imágenes. |
| `requerimientos-produccion.ts` | Precisión de cantidades, mínimos, unidades separadas y reservas parciales. |
| `seguridad-s1.ts` | Permisos combinados, titularidad y compatibilidad de primitivas de seguridad, con valores temporales en memoria. |
| `seguridad-politica-clave.ts` | Política de contraseña vigente. |
| `seguridad-s4-cobertura.ts` | Guardas estáticas: 93 acciones, 25 páginas, siete rutas de archivos y 127 entradas de servicios/consultas. |
| `seguridad-s5-cobertura.ts` | 65 puntos de autoría atómica y vínculo del actor con la transacción, mediante revisión estática. |

Estas pruebas no registran compras, producción, guías ni pagos. No se ejecutaron pruebas de integración sobre la base real, migraciones, seed, provisión, revocación de sesiones ni correcciones de documentos.

## Documentos históricos y alcance de las huellas

El auditor sólo lee los archivos PDF regulares de los directorios locales configurados para Cotizaciones, OT y Guías, usando `COTIZACION_PDF_DIR`, `TRABAJO_PDF_DIR` y `GUIA_PDF_DIR`, o sus valores predeterminados bajo `var/`. No los abre mediante el ERP, no los vuelve a emitir y no los sustituye. La evidencia identifica los nombres mediante hashes, sin publicar contenido comercial ni credenciales.

**No existe en esta revisión un manifiesto de PDF anterior al inicio del rediseño.** Por tanto, los seis archivos iguales antes/después demuestran conservación durante VG9.8, no prueban retrospectivamente que nunca hayan cambiado desde antes de VG1. Tampoco se conciliaron sus hashes con los snapshots/referencias de PostgreSQL ni se validó su descarga autenticada o firma. La cabecera `%PDF-` no sustituye una comprobación completa de integridad o contenido.

Las plantillas y renderizadores de negocio permanecen iguales a Git y usan HTML/estilos propios; no heredan automáticamente el tema o IBM Plex Sans de la interfaz. Por ejemplo, la plantilla de cotización conserva su tipografía Arial y sus estilos de impresión. No se propone rediseñar o recalcular documentos anteriores.

`docs/MANUAL-USUARIO.pdf` **es una exportación editable de documentación**, ya modificada en fases anteriores. Se excluye del inventario comercial; su actualización final corresponde a VG9.10. No se borra ni se regenera durante esta auditoría.

## Evidencia reproducible

Nuevo auditor: `tests/diseno-global-vg9-8-preservacion.ts`. Sólo ejecuta lecturas de fuentes/Git/archivos; escribe sus informes en `var/validacion/diseno-global-vg9-8/`. Carga las variables de entorno para localizar los almacenes, sin imprimir secretos ni crear conexiones.

```bash
pnpm exec tsx tests/diseno-global-vg9-8-preservacion.ts
pnpm exec tsx tests/importes-cotizacion.ts
pnpm exec tsx tests/importes-cotizacion-netos.ts
pnpm exec tsx tests/importes-orden-compra-cliente.ts
pnpm exec tsx tests/texto-cotizacion.ts
pnpm exec tsx tests/requerimientos-produccion.ts
pnpm exec tsx tests/seguridad-s1.ts
pnpm exec tsx tests/seguridad-politica-clave.ts
pnpm exec tsx tests/seguridad-s4-cobertura.ts
pnpm exec tsx tests/seguridad-s5-cobertura.ts
pnpm exec tsx tests/diseno-global-vg9-8-preservacion.ts --comprobar-cierre
```

El modo normal toma una referencia nueva de los PDF locales. El modo de cierre compara con ese inventario inicial sin sobrescribirlo. Para conservar la referencia Git de esta ejecución en otro momento, usar `VG9_8_BASE=d555de5ca086492e727569a7ce7df217a3caa768`; cambios legítimos de dominio posteriores requerirán otra revisión, sin restaurarlos automáticamente.

Informes locales:

- `resultado.json`: commit, 200 huellas, recuentos y cierre.
- `contratos.json`: comparación AST de las llamadas importadas por archivo.
- `pdfs-antes.json` / `pdfs-despues.json`: tamaño, cabecera y huellas de los seis archivos.
- `pruebas-puras.json` y logs individuales: nueve resultados.

No se realizaron capturas nuevas de datos de negocio. Las capturas y los reintentos ficticios de VG9.7 son evidencia complementaria de interfaz, no de integridad del servidor.

## Compilación

Se intentó `pnpm build` con límite de 90 segundos. Turbopack permaneció en compile y agotó ese límite (salida 124 del limitador; SIGTERM del hijo). Se comprobó la alternativa `pnpm exec next build --webpack`, sin cambiar package.json. No se atribuye un error EPERM que no se observó.

## Validación y pendientes

- [x] Lint, diff y referencias revisados.
- [x] Compilación de producción y tipos comprobados con Webpack; el intento habitual de Turbopack agotó el límite descrito.
- [ ] Conciliación con una copia autorizada de PostgreSQL: snapshots, registros históricos, stock/Kardex y deuda/pagos.
- [ ] Descarga autenticada y comprobación de documentos/adjuntos reales por rol.
- [ ] Aceptación final; lector real de VG9.4 y dispositivos/otros motores de VG9.5 pendientes.

No se afirma que la base real sea idéntica a un estado anterior: no hay un snapshot pre-rediseño comparado aquí ni se consultó la base para conciliarla. Los servicios y restricciones que protegen esas operaciones sí se conservaron en las fuentes auditadas.

No se inició servidor de aplicación. Al terminar, 3031/3032 estaban libres y se conservó el servidor previo del usuario en 3030 (PID 106156).

**Siguiente: VG9.9 — Comprobaciones técnicas.** No ejecutar integración o reconstrucción de históricos en la base real para cerrar el hito visual.
