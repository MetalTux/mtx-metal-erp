# Hito — Temas Claro y Oscuro

Fecha: **27-10-2026**. Estado: **TC1–TC3 implementados; conformidad funcional general recibida el 28-10-2026; TC4 con comprobaciones técnicas pendientes**.

El usuario solicita planificar la transformación visual para permitir Claro y Oscuro, con **Oscuro como tema predeterminado**. La adaptación automática es opcional y sólo se incorporará si su implementación mantiene un alcance acotado. La planificación inicial no modificó la aplicación. El usuario autorizó comenzar TC1 el 27-10-2026; TC2 fue autorizado a continuación y agrega selector y persistencia (checkpoint 9).

## 1. Objetivo y alcance

Permitir elegir la apariencia sin perder formularios, filtros, navegación, selección de detalles ni sesión. La elección debe aplicarse de manera coherente al ERP, al acceso y a los componentes superpuestos: diálogos, selectores, notificaciones y ayudas.

Se conservarán la identidad azul/naranjo, la distribución de módulos, las reglas del negocio y la funcionalidad de las grillas. Este trabajo no contempla cambios de stock, importes, documentos históricos, permisos ni autenticación.

La primera versión propuesta guarda la preferencia en el navegador. No requiere modelos, migraciones ni sincronización entre dispositivos. Si posteriormente se solicita una preferencia ligada al usuario, se planificará como ampliación independiente.

## 2. Estado inicial revisado (antes de TC1)

| Fuente | Situación actual | Trabajo necesario |
| --- | --- | --- |
| [Layout raíz](../src/app/layout.tsx) | Fuerza la clase dark en HTML | Sustituir la imposición por una gestión de tema con valor inicial Oscuro |
| [Estilos globales](../src/app/globals.css) | Tokens de color definidos en .dark; :root sólo configura radio | Completar una paleta clara y mantener explícita la oscura |
| [Cabeceras de tarjetas](../src/app/globals.css) | Degradado metálico con colores oscuros fijos | Definir una variante coherente para cada tema |
| [Notificaciones](../src/components/alertas/notificaciones.tsx) | Toaster configurado con tema dark | Usar la apariencia efectiva seleccionada |
| [Barra superior](../src/components/layout/app-topbar.tsx) | Dispone de acciones generales, usuario y cierre de sesión | Integrar selector sin saturar la barra en móvil |
| [Layout de acceso](<../src/app/(auth)/layout.tsx>) | Comparte tokens, sin selector de apariencia | Dar acceso a la misma preferencia antes de iniciar sesión |
| Superficie de contenido técnico en estilos globales | Fondo blanco deliberado para legibilidad de contenido copiado de Word | Mantener superficie documental propia y comprobar sus controles |
| [Guía original](GUIA-INTERFAZ.md) | Preveía sólo oscuro inicialmente y una ampliación futura a claro | Registrar esta evolución cuando se implemente, conservando el contexto histórico |

La arquitectura de tokens facilita la transformación, pero no garantiza que todos los componentes funcionen en claro sin revisión. Deben inspeccionarse también colores fijos, estados, gráficos, overlays y controles nativos. Actualmente no hay next-themes declarado en package.json.

## 3. Decisiones y comportamiento propuesto

| ID | Decisión | Estado |
| --- | --- | --- |
| DTC-01 | Oscuro es el valor inicial, incluso si el sistema operativo usa Claro | Definido por el usuario |
| DTC-02 | Selección manual de Claro y Oscuro | Solicitado por el usuario |
| DTC-03 | Recordar la preferencia por navegador y origen, conservándola al cerrar sesión | Propuesta de esta primera versión |
| DTC-04 | Selector visible en barra superior y disponible en las páginas de acceso | Propuesta de interfaz |
| DTC-05 | Incorporar Según el sistema sólo si puede resolverse con el mismo mecanismo de temas y pruebas acotadas | Inclusión condicional permitida por el usuario |
| DTC-06 | No modificar la apariencia ni los bytes de PDF/documentos históricos al cambiar el tema de la interfaz | Límite de alcance propuesto |

### Elección y persistencia

- Sin preferencia previa, presentar Oscuro.
- Al elegir Claro u Oscuro, aplicar el cambio inmediatamente y conservarlo al navegar o recargar.
- La preferencia es de apariencia del navegador, no un permiso ni una propiedad de la cuenta. Otra cuenta en ese mismo navegador usará la apariencia recordada.
- Localhost y el túnel son orígenes diferentes: cada uno puede conservar una elección distinta. No se ampliarán cookies de sesión ni excepciones de seguridad para compartirla.
- Si el almacenamiento no está disponible, permitir cambiar durante la visita; una carga posterior sin preferencia recuperable vuelve a Oscuro. No bloquear el acceso por este motivo.
- Evitar el destello de un tema incorrecto en la carga inicial y las discrepancias de hidratación. El control debe indicar cuál es la opción seleccionada.
- Cambiar tema no debe remontar los formularios ni limpiar borradores, cerrar diálogos o provocar un nuevo inicio de sesión.

### Opción condicional: Según el sistema

La automatización se plantea como **una elección explícita adicional**, nunca como valor inicial. No supone horarios, geolocalización ni configuración por Administrador.

- Al seleccionarla, usar la preferencia clara/oscura del sistema y seguir sus cambios mientras la página esté abierta.
- Recordar Según el sistema como elección, distinguiéndola del tema efectivo que se está mostrando.
- Una elección manual posterior deja de seguir el sistema.
- Si no puede consultarse la preferencia del sistema, usar Oscuro como respaldo.

El incremento parece acotado porque utiliza la misma gestión de tema; debe confirmarse en TC2. Si requiere una solución separada o compromete la carga inicial, se dejará pendiente esta opción y se entregará Claro/Oscuro. Se documentará el motivo, sin retrasar la selección manual.

## 4. Dirección visual

| Elemento | Oscuro | Claro |
| --- | --- | --- |
| Fondo y superficies | Conservar base grafito/azul actual | Fondo gris muy claro y tarjetas claras, con separación visible |
| Textos | Claros sobre superficies oscuras | Oscuros sobre superficies claras, incluidos secundarios y placeholders |
| Identidad | Azul principal y naranjo de marca | Misma identidad, ajustando tonalidades para legibilidad |
| Estados | Mantener significado actual | Ajustar éxito, advertencia, error e información al fondo claro |
| Tablas | Encabezados, bordes, hover y selección distinguibles | Evitar que bordes/filas/selección desaparezcan sobre blanco |
| Navegación y superpuestos | Mantener coherencia de sidebar, barra, diálogos y menús | Adaptar todas esas superficies; evitar zonas oscuras residuales sin intención |
| Gráficos | Series y etiquetas actuales revisadas | Series, ejes, leyendas y tooltips legibles sobre claro |

Las tonalidades finales se definirán en TC1; esta propuesta no aprueba valores de color concretos. Objetivos de contraste: al menos 4,5:1 para texto normal y 3:1 para texto grande y elementos de control que necesiten distinguirse del fondo. No depender sólo del color para estados o selección.

Los documentos técnicos con colores propios, imágenes y logos necesitan revisión específica; no se aplicará una inversión global de colores. Los PDF archivados conservan su presentación documental.

## 5. Hitos y seguimiento

| Hito | Alcance | Estado |
| --- | --- | --- |
| TC0 | Definición funcional e inventario inicial | Alcance de TC1 autorizado por el usuario el 27-10-2026 |
| TC1 | Paletas y adaptación de tokens visuales | Implementado; [paletas y evidencia](TEMAS-TC1-PALETAS.md), revisión visual pendiente |
| TC2 | Gestión de tema, selector y persistencia | Implementado; [evidencia técnica](TEMAS-TC2-VALIDACION.md); aprobación funcional pendiente |
| TC3 | Revisión transversal de módulos y componentes | Completado técnicamente; [cobertura y límites](TEMAS-TC3-VALIDACION.md) |
| TC4 | Regresión, manual y aprobación funcional | Conformidad general del usuario recibida; cierre técnico parcial, ver checkpoint 11 |

### TC0 — Definición e inventario

- [x] Revisar layout raíz, tokens, notificaciones, barra superior y acceso sin modificar código.
- [x] Registrar Oscuro predeterminado y selección manual solicitados por el usuario.
- [x] Documentar propuesta de persistencia, alcance y opción automática condicional.
- [x] Indicación del usuario para iniciar TC1 recibida el 27-10-2026.

### TC1 — Paletas y tokens

- [x] Completar variables para Claro y Oscuro: fondo, texto, tarjeta, popover, navegación, bordes, inputs, foco, acentos, estados y gráficos.
- [x] Revisar los pares de texto/fondo de estados y acciones; introducir tokens específicos sólo donde hagan falta.
- [x] Adaptar cabeceras metálicas y localizar colores fijos que deban variar según tema.
- [x] Comprobar un conjunto representativo: tarjeta, tabla, formulario, estados, diálogo y gráfico.
- [x] Conservar una base oscura estable durante el trabajo; no publicar un selector que permita activar un tema claro incompleto.

Criterio de término: ambas paletas completas y sus componentes representativos legibles; valores documentados y verificados.

### TC2 — Selección, carga inicial y persistencia

- [x] Elegir una solución pequeña compatible con el layout y la política de scripts del proyecto. Evaluar next-themes o una alternativa equivalente; verificar documentación oficial vigente antes de instalar/configurar dependencias.
- [x] Configurar Oscuro inicial y restauración de la preferencia antes de mostrar la interfaz, con estrategia explícita para SSR/hidratación.
- [x] Incorporar selector accesible Claro/Oscuro con texto de opción seleccionada en la barra superior; adaptar su presentación móvil.
- [x] Compartir el selector/preferencia con el acceso, activación, recuperación y panel personal donde corresponda.
- [x] Recordar la elección y reflejarla entre pestañas del mismo origen cuando el almacenamiento esté disponible.
- [x] Adaptar color-scheme de controles nativos y apariencia de notificaciones al tema efectivo.
- [x] Evaluar coste incremental de Según el sistema y registrar inclusión o aplazamiento justificado.
- [x] Si se incluye, comprobar seguimiento del sistema sólo cuando esa opción esté seleccionada y respaldo Oscuro cuando no pueda resolverse.
- [x] Comprobar almacenamiento no disponible, carga directa, recarga y ausencia de pérdida de borradores/sesión.

Criterio de término: cambiar y recuperar la elección funciona sin destellos notorios, advertencias de hidratación ni pérdida de estado.

### TC3 — Revisión transversal

- [x] Layout, sidebar expandido/contraído, navegación móvil, buscador, breadcrumbs y notificaciones.
- [x] Inicio de sesión, activación, recuperación, reautenticación, usuarios, auditoría y Mi acceso.
- [x] Mantenedores, Empresa, logos/imágenes y selectores con búsqueda.
- [x] Compras/recepciones, inventario, cotizaciones/OCC, OT/producción, guías y Cobranzas.
- [x] Grillas y subgrillas GD2–GD6, edición, consulta, confirmaciones y descarte.
- [x] Dashboard: KPI, series, leyendas, avisos y tooltips.
- [x] Estados de vacío, carga, error, deshabilitado, selección, hover y foco.
- [x] Superficies documentales, editor técnico, imágenes y vista previa de PDF sin alterar historia.

Criterio de término: no quedan colores residuales que impidan lectura u operación en la revisión técnica; las excepciones documentales son intencionales y legibles. TC3 se comprueba por revisión de código y ensayos representativos; recorridos reales completos y aceptación permanecen en TC4. Véase la matriz de cobertura de TEMAS-TC3-VALIDACION.md.

### TC4 — Regresión y aceptación

La conformidad general del usuario del **28-10-2026** se registra sin atribuirle la ejecución de cada caso. Se reutiliza la evidencia válida de TC1–TC3; no se repiten pruebas ni compilaciones sin cambios que lo justifiquen.

- [x] Primer acceso sin preferencia: Oscuro aunque el sistema esté en Claro (componentes y Next público).
- [x] Claro/Oscuro, recargas, navegación y dos pestañas (ensayos TC2).
- [ ] Completar recorrido real de cierre/ingreso con cuenta autenticada en ambos temas.
- [x] Separación por origen y almacenamiento bloqueado comprobados en contextos aislados; uso temporal sin prometer persistencia entre visitas.
- [ ] Recorrido sobre el túnel vigente y comprobación manual en modo privado del navegador utilizado.
- [x] Según el sistema: elección explícita, seguimiento y prioridad manual comprobados.
- [x] Borrador y diálogo conservados al cambiar tema (TC2); reintentos/identidad de operaciones comprobados en grillas con transporte simulado (TC3).
- [ ] Completar cambio de tema durante una operación real con detalle abierto e intento pendiente.
- [x] Contraste representativo, teclado/foco y ejecución con preferencia de movimiento reducido comprobados.
- [ ] Revisión con lector de pantalla y contraste integral de todos los estados.
- [x] Revisión responsive a 360/768/1280 px de los componentes y grillas ensayados.
- [ ] Zoom real del navegador al 200% en páginas, diálogos, tablas y barra superior.
- [x] Ensayos de grillas en ambos temas: 7/7 por tema; notificaciones y gráficos comprobados.
- [x] Lint, tipos y pruebas pertinentes correctos; producción Webpack correcta. Turbopack bloqueado por permiso del puerto interno, documentado en TC3.
- [x] Manual Markdown/PDF actualizado en TC2, capturas de ambos temas y registros de avance TC3 disponibles.
- [x] Conformidad funcional general del usuario recibida el 28-10-2026: «por mi parte está bien, de momento».

Criterio de término: validación técnica documentada y aprobación funcional. La conformidad recibida permite continuar trabajando; **TC4 conserva los pendientes explícitos y no se declara cerrado integralmente**. Las validaciones de otros módulos no se dan por aprobadas con este hito.

## 6. Validaciones funcionales previstas

| Caso | Resultado esperado | Estado |
| --- | --- | --- |
| TC-V01 | Navegador sin preferencia inicia en Oscuro | Pendiente |
| TC-V02 | Claro/Oscuro se aplica y persiste al navegar y recargar | Pendiente |
| TC-V03 | Acceso y ERP muestran la misma preferencia del navegador | Pendiente |
| TC-V04 | Borradores, diálogos e intento de guardado se conservan al cambiar | Pendiente |
| TC-V05 | Tablas, errores, avisos, controles y Dashboard se leen en ambos temas | Pendiente |
| TC-V06 | Móvil, teclado, foco y zoom permiten elegir y operar sin obstáculos | Pendiente |
| TC-V07 | Almacenamiento restringido no impide entrar ni elegir durante la visita | Pendiente |
| TC-V08 | Según el sistema sólo actúa tras seleccionarlo; manual prevalece | Condicional, pendiente |
| TC-V09 | PDF e historia permanecen iguales al cambiar apariencia | Pendiente |

## 7. Entrega de esta planificación

- [x] Documento de hitos creado con alcance, decisiones y checks de avance.
- [x] Referencias locales y contenido revisados.
- [x] TC1 implementado, con evidencia de componentes y paletas.
- [x] TC2 implementado y comprobado técnicamente.
- [x] TC3 revisado y corregido, con evidencia de componentes en ambos temas.
- [x] Conformidad funcional general recibida del usuario el 28-10-2026.
- [ ] Cierre técnico integral de TC4: pendientes detallados en su checklist y checkpoint 11.

La entrega inicial sólo modificó este documento. El checkpoint siguiente registra el desarrollo autorizado después; los resultados técnicos no sustituyen la revisión funcional del usuario.


## 8. Checkpoint TC1 — 27-10-2026

- [x] Paleta clara completa, color-scheme por tema y variables de series gráficas.
- [x] Cabeceras temáticas, descripción legible, separación de borde/relleno de controles y hover del botón principal.
- [x] Ajustes de contraste oscuro para borde de campos y error/anulación, conservando superficies y rellenos principales.
- [x] Componentes reales con CSS local: texto/hover/placeholder/cabecera, borde, series, diálogo y seis capturas responsive correctos.
- [x] Oscuro sigue fijo en el layout; no hay selector público ni cambio automático.
- [x] Lint, tipos, build de producción y revisión de diff correctos.
- [ ] Revisión visual del usuario y recorrido global de TC3/TC4.

Tokens, resultados y continuidad: [TEMAS-TC1-PALETAS.md](TEMAS-TC1-PALETAS.md). Sin dependencias nuevas, migraciones ni escrituras en BD. Estado al cerrar TC1; continuado en el checkpoint 9.


## 9. Checkpoint TC2 — 27-10-2026

- [x] Autorización del usuario para continuar TC2.
- [x] Selector Claro/Oscuro/Según el sistema en barra del ERP y layout de acceso; Mi acceso comparte la barra.
- [x] Oscuro inicial, restauración previa a React, color-scheme y Sonner sincronizados.
- [x] Preferencia local por origen, pestañas sincronizadas y aviso de uso temporal si falla almacenamiento.
- [x] Pruebas de componentes: teclado, sistema, almacenamiento restringido, borradores y diálogo conservados; 360/768/1280 px.
- [x] Integración Next pública: carga antes de hidratación y navegación sin enviar formularios de autenticación.
- [x] Auditoría visual TC3 continuada en el checkpoint 10.
- [ ] Recorrido autenticado integral y aceptación TC4.

Implementación, comandos y límites en [TEMAS-TC2-VALIDACION.md](TEMAS-TC2-VALIDACION.md). No modifica sesión, cookies, permisos, documentos ni BD. Según el sistema se incluye por usar el mismo mecanismo sin dependencias adicionales. Las validaciones funcionales de la sección 6 siguen pendientes del usuario.


## 10. Checkpoint TC3 — 27-10-2026

- [x] Revisión transversal de tokens y colores de interfaz (204 archivos), estados y excepciones documentales.
- [x] Correcciones de enlaces, leyenda/series del Dashboard, avisos informativos, hover de navegación/filtro y superposiciones.
- [x] Superficie técnica blanca con color-scheme propio; contenido, logos, fotos y PDF sin inversiones ni cambios históricos.
- [x] Grillas de Compras/OCC, Cotizaciones, OT, Despacho, Cobranzas e historias en Claro/Oscuro: 7/7 por tema.
- [x] Dashboard/layout/editor reales, mantenedor y reautenticación con datos simulados: contraste, móvil, sidebar contraído, búsqueda y estados.
- [x] Regresión TC1/TC2, acceso público Next, lint, tipos y compilación Webpack correctos. Turbopack bloqueado por permisos del entorno.
- [ ] Recorridos completos autenticados, zoom/lector de pantalla y aprobación TC4.

Continuidad exacta, comandos, muestras y límites en [TEMAS-TC3-VALIDACION.md](TEMAS-TC3-VALIDACION.md). Las casillas TC3 expresan auditoría técnica y cobertura representativa; no aprobación humana ni ejecución de cada flujo contra BD. Las validaciones funcionales de la sección 6 siguen pendientes del usuario. No se modifican estados de otros hitos.


## 11. Checkpoint TC4 — 28-10-2026

- [x] Conformidad funcional general del usuario registrada, con carácter «de momento»; no se inventan resultados individuales de TC-V01–TC-V09.
- [x] Evidencia existente revisada: resultados TC2/TC3, 7/7 de grillas por tema, acceso público real, contraste, teclado, responsive, manual y compilación alternativa correctos.
- [x] Checklist TC4 desglosado para distinguir pruebas ya ejecutadas de recorridos pendientes.
- [ ] Pendientes: zoom real 200%, lector de pantalla, contraste integral, modo privado/túnel vigente y recorrido autenticado con cambio de tema durante una operación.

Esta actualización sólo modifica documentación; no vuelve a compilar, iniciar servicios ni tocar BD. Las validaciones previas conservan su fecha y alcance. No hay una nueva incidencia reportada por el usuario; los pendientes se mantienen visibles y no se presentan como ejecutados ni como bloqueos observados. La conformidad no autoriza a dar por realizadas pruebas que no se hicieron.
