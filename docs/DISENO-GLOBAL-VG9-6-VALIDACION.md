# VG9.6 — Estados y perfiles

Fecha: **29-10-2026**. **Completado técnicamente en el alcance representativo documentado. Pruebas autenticadas y aceptación final pendientes.**

## Cambios realizados

La revisión sigue DESIGN.md e Impeccable en modo Operate. Se mantiene la apariencia aprobada, las grillas y la densidad; no se modifican reglas de negocio ni permisos.

Se corrigió el mensaje vacío de **Unidades de medida, Bodegas, Materias primas, Clientes y Proveedores**: antes indicaba crear el primer registro incluso a quien sólo podía consultar. Ahora mantiene esa indicación para el perfil operativo y explica al perfil de consulta que los registros aparecerán cuando una persona con permisos los registre.

Cada componente obtiene su permiso mediante `usePermiso`, sin conceder privilegios nuevos: `catalogos.operar` para unidades/bodegas/materiales, `clientes.operar` para clientes y `proveedores.operar` para proveedores. Los controles de creación, edición y eliminación conservan sus guardas existentes. El cambio es de orientación del usuario; no sustituye la autorización del servidor.

Archivos: `src/components/mantenedores/{unidades-medida,bodegas,materiales,clientes,proveedores}.tsx`.

Además, DataTable y TablaConsulta muestran sus estados vacíos fuera del área horizontal de las columnas, en una región de estado. En móvil, el mensaje antes heredaba el ancho de la tabla y podía quedar recortado; ahora se lee sin desplazarla. Las cabeceras y las filas conservan su desplazamiento y paginación.

## Matriz y estados comprobados

`tests/diseno-global-vg9-6.ui.ts` monta **ApplicationLayout, AppSidebar, CommandMenu, los cinco mantenedores, DataTable, diálogos y avisos reales**. Identidad, router y lecturas son ficticios; las funciones de escritura sustituidas rechazan su ejecución, Prisma está bloqueado y no se usa PostgreSQL.

Se proporcionan estos perfiles al contexto de componentes, **sin iniciar sesiones reales**:

| Perfil | Opera catálogo | Opera clientes | Opera proveedores | Opera cobranza | Opera trabajos | Lee precios | Lee costos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Administrador | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Ventas | No | Sí | No | No | No | Sí | No |
| Compras/Bodega | Sí | No | Sí | No | No | No | Sí |
| Producción/Despacho | No | No | No | No | Sí | No | No |
| Cobranza | No | No | No | Sí | No | Sí | No |
| Consulta/Gerencia | No | No | No | No | No | Sí | Sí |
| Ventas + Cobranza | No | Sí | No | Sí | No | Sí | No |
| Ventas + Consulta/Gerencia | No | Sí | No | No | No | Sí | Sí |

La tabla representa aserciones explícitas sobre `tienePermiso`, con expectativas independientes; no se deducen los resultados esperados de esa misma función. Las combinaciones conservan la unión de permisos: agregar Consulta no retira la operación de Ventas. Roles desconocidos, contexto vacío y permisos inventados se comprueban sin concesión de acceso.

La comprobación de precios/costos es de la **función de permisos**; no certifica que todas las respuestas HTTP/DTO oculten campos sensibles. Esa comprobación requiere las pruebas autenticadas pendientes.

En Claro y Oscuro:

- [x] Navegación lateral y buscador: entradas representativas de Compras, Cobranza y Administración según cada perfil.
- [x] Catálogo de unidades con un registro: Crear/Editar/Eliminar disponibles sólo para Administrador y Compras/Bodega. Ver abre una consulta de campos sólo lectura, sin controles para guardar.
- [x] Cobranza no se monta como si tuviera acceso al catálogo: ese rol no tiene `catalogos.leer`; su caso nuevo comprueba navegación.
- [x] Cinco catálogos vacíos, Administrador y Consulta, a 360/1280 px: orientación acorde al permiso y creación disponible sólo para el operador.
- [x] Clientes con Ventas, Ventas+Cobranza y Ventas+Consulta; Proveedores con Compras/Bodega: la operación permanece disponible, incluidos sus mensajes vacíos.
- [x] 125 unidades ficticias: 10 filas iniciales, cambio de página, 50 por página y 25 en la última página.
- [x] Mensajes de catálogo vacío y consulta de ocho columnas legibles completos a 360 px, independientemente del ancho de las cabeceras.
- [x] Filtro sin coincidencias distinto de catálogo vacío; paginación deshabilitada sin resultados y Limpiar filtro recupera la primera página.
- [x] Reducción de la lista de 125 a un registro mientras estaba en la última página: se conserva una página válida, sin tabla vacía por un índice obsoleto.
- [x] Lectura demorada: estado Consultando unidad visible y Crear deshabilitado mientras espera.
- [x] Respuesta fallida simulada: aviso visible, controles nuevamente disponibles y reintento que abre la consulta correctamente.
- [x] Sin errores de ejecución del navegador ni desborde horizontal del documento en los escenarios capturados.

**92 entradas de evidencia:** 16 de navegación, 14 de consulta de un registro, 40 de catálogos vacíos, 8 de operación por área/roles combinados , 12 de muchos registros/carga/error/recuperación y 2 de consulta vacía con ocho columnas a 360 px. No equivale a probar todas las pantallas con cada rol ni a medir rendimiento real con 125 registros en PostgreSQL.

## Cobertura complementaria y comprobaciones

- [x] `tests/seguridad-s4-cobertura.ts`: 93 acciones, 25 páginas, 7 rutas de archivos y 127 entradas asíncronas de servicios/consultas conservan la cobertura estática de guardas. No son peticiones HTTP ni pruebas de rechazo del servidor en ejecución.
- [x] `pnpm lint`, sin advertencias al finalizar.
- [x] Compilación alternativa `pnpm exec next build --webpack`, tipos y rutas correctos.
- [x] Diff, enlaces y huellas SHA-256 de fuentes revisados.

Se intentó `pnpm build` habitual. Turbopack permaneció en la fase compile, sin progreso de salida durante más de 100 segundos; se detuvo únicamente el compilador propio (salida 143 por SIGTERM) y se verificó Webpack. No se atribuye a un error EPERM no observado ni se cambió el script del proyecto.

Tras el ajuste compartido se repitió también VG3: 160 escenarios de diez mantenedores/Configuración correctos, con consultas/acciones ficticias. Informe en `var/validacion/diseno-global-vg9-6/catalogos/resultado.json`.

Los límites de carga/error, acceso denegado, 404 y perfiles de otros módulos mantienen evidencia previa en VG8 y en las galerías repetidas durante VG9.5. **No se ejecutaron de nuevo esas galerías completas en esta etapa ni se presentan como pruebas autenticadas nuevas.** Los servicios, guardas y límites de ruta no se modificaron aquí.

## Evidencia y reproducción

```bash
pnpm exec tsx tests/diseno-global-vg9-6.ui.ts
pnpm exec tsx tests/seguridad-s4-cobertura.ts
pnpm lint
pnpm build
# Alternativa usada si la compilación habitual queda bloqueada:
pnpm exec next build --webpack
```

Informe, matriz, errores y huellas: `var/validacion/diseno-global-vg9-6/resultado.json`.

Capturas con datos ficticios:

- [Consulta sin unidades, Claro móvil](capturas/diseno-global-vg9-6/claro-consulta-unidades-vacio-360.png).
- [Operador sin unidades, Oscuro escritorio](capturas/diseno-global-vg9-6/oscuro-administrador-unidades-vacio-1280.png).
- [Filtro sin coincidencias, Claro](capturas/diseno-global-vg9-6/claro-muchos-sin-coincidencias.png).
- [Consulta pendiente, Oscuro](capturas/diseno-global-vg9-6/oscuro-consulta-pendiente.png).

## Pendientes y continuidad

- [ ] Iniciar sesiones con cuentas reales de cada rol/combinación en un entorno de prueba autorizado, abrir rutas directas y comprobar operación/consulta y rechazos del servidor.
- [ ] Validar campos económicos de las respuestas reales para los perfiles que no deben ver precios/costos, incluidos archivos y documentos disponibles.
- [ ] Aceptación final y lectura con tecnología asistiva real, según VG9.4. Dispositivos físicos y otros motores permanecen pendientes según VG9.5.

No se crearon usuarios, se alteraron roles ni se escribieron datos para esta revisión. No hay migraciones, cambios de contraseña, archivos históricos ni PDF modificados. La documentación final del manual/PDF sigue en VG9.10.

No se iniciaron servidores de aplicación; los navegadores se cerraron. Al finalizar, 3031/3032 estaban libres y se conservó el servidor previo del usuario en 3030 (PID 106156).

**Siguiente: VG9.7 — Flujos y grillas.** No cerrar por arrastre S7, Cobranzas, inventario ni las demás validaciones funcionales pendientes.
