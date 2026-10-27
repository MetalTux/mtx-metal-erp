# Revisión de usabilidad V1

Fecha: **24-10-2026**. Revisión del código/interfaz y contraste documental para preparar el [manual](MANUAL-USUARIO.md). No es una prueba con trabajadores reales ni una auditoría formal de accesibilidad. El [hito de seguimiento](HITO-MANUAL-USABILIDAD.md) distingue entregas técnicas de aprobación funcional.

Prioridad P1: puede desorientar o conducir a una acción no disponible. P2: dificulta descubrir o comprender una función. P3: revisión complementaria. Las propuestas pendientes no se consideran implementadas.

## Hallazgos y estado

| ID | Prioridad | Hallazgo y evidencia | Cambio / propuesta | Estado |
| --- | --- | --- | --- | --- |
| U01 | P1 | En [Ver OCC](../src/components/ordenes-compra-cliente/ver-orden.tsx), Crear/Ver trabajo compartían `ordenes_cliente.operar`; crear OT requiere `trabajos.operar`, mientras consultar requiere `trabajos.leer` | Separar Crear trabajo por operación productiva y Ver trabajo por lectura productiva. Así Ventas no recibe una acción que sólo lo lleva al listado sin poder crear, y Cobranza/Gerencia puede seguir una OT existente | Corregido y validado en copia/Chromium (24-10-2026) |
| U02 | P1 | En [Consulta de guía](../src/components/guia-despacho/consulta-guia.tsx), Preparar otra entrega aparecía a lectores de guías aunque el destino opera sólo con `guias.operar` | Mostrar esa acción con permiso de operación; conservar Ver OT/OCC/cuenta con sus permisos respectivos | Corregido y validado en copia/Chromium (24-10-2026) |
| U03 | P1 | Las guías [OT](OPERACION-ORDENES-TRABAJO.md) y [Guías](OPERACION-GUIAS-DESPACHO.md) aún afirmaban que no existían login/roles | Actualizar permisos vigentes y enlazar manual/Seguridad/Cobranzas; conservar contratos técnicos históricos como tales | Corregido documentalmente |
| U04 | P2 | El manual sólo está en el repositorio/README; [navegación](../src/config/navegacion.ts) y [buscador](../src/components/layout/command-menu.tsx) contienen secciones del ERP, sin una ayuda por tarea | Integrar ayuda accesible dentro del ERP con índice por tarea y perfil. Publicar una versión revisada con datos ficticios; no enlazar documentos privados ni servir archivos arbitrarios del servidor | Pendiente de implementación |
| U05 | P2 | [Compras](../src/components/compras/compras.tsx) y [Cotizaciones](../src/components/cotizaciones/cotizaciones.tsx) utilizan varias acciones de fila sólo con iconos. Existe [BotonConAyuda](../src/components/formularios/boton-con-ayuda.tsx), incluido foco de acciones deshabilitadas | Revisar con usuarios si las ayudas bastan; valorar texto visible o menú de acciones nombradas en ventanas estrechas, conservando accesibilidad y permisos | Pendiente de revisión funcional/diseño |
| U06 | P2 | En [navegación](../src/config/navegacion.ts), Productos abre catálogo y Productos terminados abre inventario; nombres próximos para tareas distintas | El manual distingue catálogo/receta de existencias. Evaluar nombres/ayudas más explícitos con usuarios antes de renombrar rutas o textos conocidos | Explicación documentada; mejora visual pendiente |
| U07 | P2 | El flujo requiere entender guardar/recibir, reservar/consumir, producir/entregar y facturar/cobrar; se contrasta en formularios de Compras, OT, Guías y Cobranzas | Tabla de resultados y recorrido completo en el manual. Evaluar una indicación visible de «siguiente paso» contextual, sin automatizar operaciones independientes | Manual listo; mejora contextual pendiente |
| U08 | P2 | Las respuestas inciertas conservan claves/datos, pero algunos avisos emergentes desaparecen y el bloqueo puede no entenderse. Ejemplo: [abonos](../src/components/cobranza/operar-abonos.tsx) distingue pago registrado y archivo pendiente | Explicar reintento/verificación del historial; revisar si todos los formularios conservan una causa/resultados suficientemente visibles. No habilitar repetir pagos u operaciones nuevas a ciegas | Documentado; revisión transversal pendiente |
| U09 | P2 | Roles permiten consultas sin escritura, y algunas columnas de acciones pueden quedar reducidas. El nombre de un botón no debe sugerir acceso total | Probar tareas por perfil: lectura, operación, corrección y ausencia de botones. Las correcciones U01/U02 cubren dos casos concretos, no todo el ERP | Parcial; revisión completa pendiente |
| U10 | P3 | Algunas tablas requieren desplazamiento horizontal. Dashboard ya tiene pruebas técnicas en cuatro anchos; eso no demuestra facilidad de uso de todos los formularios | Recorrer manualmente tablas, zoom, Tab/Mayús+Tab, Escape, foco al cerrar, texto de errores y uso táctil con usuarios representativos | Pendiente |
| U11 | P2 | README genérico indicaba puerto 3000 y no ofrecía entrada a las guías | Reemplazar por orientación del ERP, acceso al manual y desarrollo en 3030; conservar instalación final como pendiente real | Corregido documentalmente |
| U12 | P3 | No hay capturas de capacitación anonimizadas que permitan reconocer pasos visualmente | Preparar en copia de capacitación totalmente ficticia. Evitar capturas de la base real o de una copia que aún contenga clientes, RUT, comprobantes, invitaciones o claves reales | Pendiente |

## Comprobación de las correcciones U01/U02

Se amplía el escenario aislado `cobranza-cierre`, sin escritura de ejemplos en la base real:

1. OCC sin OT: Producción dispone de Crear trabajo; Ventas, Cobranza y Consulta/Gerencia no.
2. OCC con OT: perfiles con lectura productiva disponen de Ver trabajo, incluso sin permiso de editar OCC.
3. Guía: lectores financieros no reciben Preparar otra entrega; los permisos de servidor permanecen vigentes.
4. Repetir el circuito C4 y verificar enlaces financieros, obra propia sin cuenta y ausencia de acceso financiero de Producción.
5. Lint/build y revisión de documentación/enlaces; retirar copia y servidor propios.

Los resultados exactos se registran en el checkpoint del hito al terminar. Esta prueba valida visibilidad/coherencia con permisos existentes; no amplía autorizaciones ni sustituye las pruebas funcionales del usuario.

## Próxima revisión con usuarios

| Recorrido | Qué observar | Estado |
| --- | --- | --- |
| Nuevo trabajador | Encontrar su tarea, iniciar/cerrar sesión, interpretar roles y usar el manual sin asistencia constante | Pendiente |
| Comprar/recibir | Distinguir documento de recepción, ubicar iconos y entender pendiente/cierre | Pendiente |
| Cotizar/contratar | Ubicar aceptación parcial y reconocer diferencia entre oferta y compromiso | Pendiente |
| Planificar/fabricar | Encontrar reservas, consumos, reversión y cierre sin confundirlos con entrega | Pendiente |
| Entregar/devolver | Revisar bodega/conformidad y entender que devolver no modifica deuda | Pendiente |
| Cobrar/corregir | Interpretar dinero registrado vs archivo pendiente y reintentar sin duplicar | Pendiente |
| Ventana estrecha/teclado | Descubrir ayudas, conservar foco y comprender errores/confirmaciones | Pendiente |

Registrar por hallazgo: perfil, tarea, resultado esperado/observado y captura sin secretos cuando proceda. Mantener abiertas las validaciones C3/C4, Dashboard y S7: la creación de este documento no las convierte en aprobadas.


## Resultado técnico — 24-10-2026

U01/U02 comprobados con Producción, Ventas, Cobranza y Consulta/Gerencia en `cobranza-cierre`: creación productiva permitida, lectores sin creación/despacho y Ver trabajo disponible a lectores autorizados. Se conserva el recorrido integral C4 y sus controles físicos/financieros. Resultado 1/1, sin errores JavaScript en el recorrido existente. Evidencia privada: `backups/20261024_seguridad_s6/1792883623974/`.

Lint/build y cobertura S4 correctos; 65 enlaces/anclas locales comprobados sin incidencias en manual, hito, revisión, README y guías OT/Guías. Datos/archivos originales sin cambios y ensayo retirado. No se midió todavía facilidad de uso con trabajadores ni se cerraron U04–U10/U12 por esta validación.
