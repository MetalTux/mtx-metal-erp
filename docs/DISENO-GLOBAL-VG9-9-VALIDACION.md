# VG9.9 — Comprobaciones técnicas

Fecha: **29-10-2026**. **Completado técnicamente: 32 pasos correctos, sin fallos en la ejecución final.** Las pruebas funcionales/autenticadas y la aceptación de usuario permanecen separadas.

## Ejecutor reproducible

Se añadió `scripts/validar-diseno-global.ts`, específico para el cierre visual y la referencia de conservación de VG9.8. Ejecuta únicamente suites conocidas sin integración de negocio en BD; guarda cada salida y código de retorno. No instala dependencias, ejecuta migraciones/seed, crea cuentas ni inicia transacciones de prueba.

```bash
pnpm exec tsx scripts/validar-diseno-global.ts
# Directorio alternativo para no sustituir una ejecución anterior:
pnpm exec tsx scripts/validar-diseno-global.ts var/validacion/diseno-global-vg9-9-otra-ejecucion
```

El ejecutor:

1. Establece el inventario de conservación de fuentes y PDF con la referencia Git archivada de VG9.8.
2. Ejecuta `pnpm lint` y `pnpm exec tsc --noEmit`.
3. Intenta `pnpm build` con un límite de 90 segundos. Si falla, registra ese resultado y ejecuta Webpack como alternativa; no cambia package.json ni oculta el resultado del motor habitual.
4. Con una compilación válida, inicia el servidor Next temporal de la prueba pública en `127.0.0.1:3032`; la prueba sólo consulta rutas públicas mediante GET y lo cierra en `finally`.
5. Ejecuta las regresiones con dos trabajadores como máximo, directorios y perfiles de navegador independientes.
6. Comprueba de nuevo los PDF y fuentes protegidas y verifica que las fuentes bajo `src/` (excepto el cliente generado) no cambiaron durante el recorrido.

Cada proceso hijo se inicia en un grupo propio. Los límites y la interrupción del ejecutor sólo detienen esos procesos; no se detienen servidores previos del usuario.

## Inventario de comprobaciones

| Bloque | Cobertura |
| --- | --- |
| Conservación | Auditor de VG9.8 al inicio y cierre: fuentes protegidas, firmas de llamadas y PDF locales. |
| Lint/tipos/build | ESLint, TypeScript independiente y compilación de producción habitual; alternativa documentada cuando sea necesaria. |
| Next público real | Fuente local, bootstrap/restauración, hidratación, apariencia y rutas `/ingresar`, `/activar`, `/recuperar`, `/acceso-denegado`. Cero formularios enviados. |
| Nueve pruebas puras | Cotizaciones netas/históricas, OCC, texto técnico, producción, permisos/política de clave y coberturas S4/S5. |
| Galerías VG2–VG8 | Acceso, diez mantenedores/Configuración, Inventario, Cotizaciones/OCC, Trabajos, Producción/Despacho, Cobranzas, cuenta/Administración y estados. |
| Temas y ciclo | TC2 y VG9.2: preferencia, Sistema explícito, almacenamiento restringido, pestañas, borradores y navegación de documento con API ficticia. |
| Contraste | VG9.3: colores, alfa/opacidad, texto, controles, foco, gráficos y estados compartidos. |
| Accesibilidad | VG9.4: teclado, foco, árbol AX y zoom real de navegador 200%; no lector de pantalla real. |
| Responsive | VG9.5: cinco tamaños en ambos temas, textos largos, tablas, poca altura y toque emulado. |
| Estados/perfiles | VG9.6: ocho perfiles/combinaciones, vacíos, 1/125 registros, filtros/paginación y consulta pendiente/error/recuperación. |
| Piloto | Dashboard y Compras con datos y acciones ficticios. |
| Grillas | Siete comprobaciones por tema, GD2–GD6 con transporte simulado; conserva contenido y UUID de reintentos, descartes y consultas anidadas. |

TC2, VG8 y Next mantienen sus variables de destino existentes. Se amplió `DISENO_EVIDENCIA_DIR` a VG9.2, VG9.3, VG9.5, VG9.6 y el auditor VG9.8; los destinos predeterminados se conservan. El cambio sólo afecta el almacenamiento de evidencia, no la aplicación.

## Resultados finales

- [x] `pnpm lint`, sin advertencias.
- [x] `pnpm exec tsc --noEmit`, correcto como comprobación independiente.
- [x] `pnpm build` con **Turbopack correcto** en la ejecución final, incluidos tipos y rutas. No fue necesaria la alternativa Webpack en ese recorrido.
- [x] Next de producción real: seis categorías públicas comprobadas, fuente local e hidratación correctas, **cero POST**; servidor temporal cerrado.
- [x] Nueve pruebas puras correctas.
- [x] Galerías VG2–VG8: **958 entradas** correctas, regeneradas durante esta ejecución con las fuentes actuales.
- [x] TC2: 13 categorías; ciclo VG9.2: siete; contraste: **18.268 mediciones sin fallos**.
- [x] Teclado/AX/zoom real 200%: ambos temas, cuatro escenarios de zoom. Responsive: diez combinaciones. Estados/perfiles: 92 entradas correctas.
- [x] Piloto Dashboard/Compras: 22 entradas. Grillas: **7/7 por tema**, con 30 capturas responsive.
- [x] Conservación al inicio/cierre: 200 fuentes protegidas, firmas importadas y seis PDF locales conservados durante la ejecución.
- [x] **329 huellas de fuentes estables**, sin cambios de aplicación durante las pruebas. Enlaces y diff correctos; package.json, lockfile y prisma.config.ts sin diferencias frente a Git.

Los 32 pasos son comandos/subejecutores del cierre, no 32 casos únicos de negocio: por ejemplo, cada ejecución de grillas contiene siete comprobaciones y repite algunos requisitos puros. Las cantidades de galerías, medidas y capturas tampoco son unidades intercambiables ni certificación integral de todas las rutas.

No se modificaron componentes productivos para conseguir estos resultados. Los cambios de VG9.9 corresponden al ejecutor, destinos de evidencia de pruebas y documentación. La aplicación comprobada conserva las reglas y los pendientes registrados anteriormente.

## Incidencia del ejecutor corregida

El primer intento detectó un error propio del ejecutor nuevo: `NodeJS.ProcessEnv` exige `NODE_ENV` en los tipos extendidos por Next, pero cada paso sólo proporciona variables adicionales. Se corrigió a `Partial<NodeJS.ProcessEnv>` y se reinició la ejecución completa. Los logs y artefactos de ese intento interrumpido se guardaron en `antes/`; no cuentan como resultados finales. No se modificó código productivo por esa incidencia.

## Evidencia y límites

Directorio nuevo: `var/validacion/diseno-global-vg9-9/`. `resultado.json` contiene comandos, códigos/señales, tiempos, límites, logs, fallos y huellas finales. Los subdirectorios mantienen los informes y capturas originales de cada suite; `antes/` se excluye del cierre.

Las huellas de `src/`, excluido `src/generated/`, verifican estabilidad de fuentes, no ejecución de cada archivo. El auditor usa el commit d555de5ca086492e727569a7ce7df217a3caa768; futuros cambios legítimos de dominio requerirán revisar esa referencia, sin restaurarlos automáticamente.

Las galerías usan consultas, acciones, identidad o router ficticios según cada prueba. Next real sólo prueba superficies públicas: no autentica usuarios ni comprueba guardados. Los controles de fuentes/tema no certifican accesibilidad integral. Los PDF locales se comparan durante esta ejecución; sigue sin existir un manifiesto anterior al rediseño ni conciliación con PostgreSQL.

No se ejecutan por arrastre las pruebas `.integration.ts`, porque requieren un entorno de BD descartable autorizado. Tampoco se aprueban S7, Cobranzas, inventario o grillas funcionalmente por pasar estas suites.

**Pendientes:** sesiones/roles/HTTP reales, conciliación de datos/archivos, lector real VG9.4, dispositivos/otros motores VG9.5 y aceptación final. Manual y PDF final corresponden a VG9.10.


**Cierre técnico VG9.9 realizado. Siguiente VG9.10 — Documentación final:** manual Markdown/PDF, capturas ficticias actuales, referencias y continuidad. VG9.4 y la aceptación funcional permanecen abiertos.
