# Dirección visual — MTX Metal ERP

Actualización: **30-10-2026**. Dirección visual aprobada a partir del piloto Dashboard/Compras. VG1–VG8 extienden técnicamente la identidad a todo el ERP; VG9.1–VG9.3 y VG9.5–VG9.10 tienen evidencia técnica/documental. VG9.4 conserva prueba pendiente con lector real y VG9.11 conserva aceptación del usuario. Estado vigente: [HITO-DISENO-GLOBAL.md](docs/HITO-DISENO-GLOBAL.md), sección 26; manual y límites en [VG9.10](docs/DISENO-GLOBAL-VG9-10-VALIDACION.md). Los documentos TC y del piloto conservan su evidencia histórica; no sustituyen el seguimiento global actual.

## Prioridades

1. Legibilidad y comodidad para consultar datos durante horas.
2. Operación clara para personas con diferentes niveles de experiencia.
3. Densidad de información útil, consistencia y eficiencia.
4. Identidad industrial sobria, reconocible y propia.

Las superficies del ERP corresponden al modo **Operate** de Impeccable. El manual corresponde a **Read**. Priorizar precisión y contención visual en ambos modos. Evitar aplicar patrones de páginas publicitarias o exhibición al trabajo administrativo.

## Claro y Oscuro como partes del mismo sistema

Diseñar ambos en conjunto, con la misma jerarquía, semántica y componentes. Oscuro continúa como predeterminado; Según el sistema sigue siendo explícito. Las diferencias de tema deben resolverse mediante tokens y pares de contraste, sin invertir globalmente colores ni imágenes.

Proponer paletas con personalidad coherentes con metal/fabricación, sin adoptar automáticamente azul/morado de SaaS, verde neón, terracota ni otra receta visual recurrente. El azul/naranjo actual es contexto existente, no una obligación nueva del usuario de conservar cada valor. Justificar cualquier ajuste posterior con capturas y comodidad de uso. La paleta mineral implementada en el piloto recibió conformidad general y es la referencia de la extensión; no se requiere elegir otra paleta.

Fondos tranquilos y superficies separadas por tono, alineación y jerarquía. Usar color para acciones, selección y estados con texto/icono; limitar acentos competidores. Evitar blanco deslumbrante o negro puro como recurso dominante si afectan comodidad. No reducir contraste para lograr un aspecto apagado.

Objetivos verificables: texto normal al menos 4,5:1; texto grande y elementos gráficos/controles que necesitan distinguirse, al menos 3:1. Evaluar sobre el fondo real, incluidos estados hover, selección, error y foco; los mínimos no garantizan por sí solos comodidad durante horas.

## Tipografía y densidad

Evaluar una familia clara con personalidad discreta, buenos caracteres españoles y cifras distinguibles. Elegir por lectura y rendimiento en tablas, no por novedad ni por evitar una fuente sólo porque es popular. IBM Plex Sans fue elegida por el usuario (pesos 400/600) y es la fuente global desde VG1; Geist Mono se conserva para códigos. Usar cifras tabulares y reservar monoespaciada para códigos donde aporte.

Escala de referencia del piloto: texto de trabajo cercano a 14 px, secundarios de 13 px, 12 px reservado a metadatos breves; títulos moderados. Evitar reducir toda la interfaz para ganar filas. Ajustar tras revisar escritorio, móvil y zoom 200%.

Filas, campos y acciones compactos pero distinguibles y operables. Reducir grandes márgenes, rellenos repetidos y contenedores anidados; mantener separación suficiente entre tareas distintas. No sustituir texto esencial por iconos sin nombre/ayuda. Conservar blancos funcionales que ayuden a leer y localizar acciones.

## Bordes, sombras y efectos

No usar sombras decorativas, bordes con efecto sombreado, relieves ni degradados como ornamentación habitual. Preferir superficies planas. Conservar sólo separadores/bordes que expliquen agrupación, delimiten un control o ayuden a distinguir superpuestos; el foco visible es obligatorio.

Reevaluar las cabeceras metálicas con degradado existentes: no quedan aprobadas como dirección futura por haber sido implementadas antes. Se favorecen cabeceras planas y discretas. Evitar tarjetas para cada dato, tarjetas dentro de tarjetas y grandes bloques vacíos.

Movimiento discreto y asociado a una acción comprensible; respetar reducción de movimiento. No agregar animaciones de entrada por decoración.

## Comportamiento y límites

- Preservar permisos, validaciones, datos, importes, stock, unidades, estados, idempotencia y versiones.
- Mantener las grillas de detalle y su lectura rápida; mostrar acciones principales claramente y agrupar las secundarias de forma predecible.
- Cambiar tema sin perder borradores, diálogos, selección ni sesión.
- Logos/fotografías y contenido técnico conservan su naturaleza documental. No recolorear ni regenerar PDF históricos por una decisión de apariencia.
- Usar datos ficticios para capturas; no leer .env ni publicar datos reales para evaluar diseño.

## Proceso para aplicar esta dirección

1. Revisar la interfaz actual renderizada, los tokens y los componentes compartidos; usar la evidencia TC3 como punto de partida, comprobando su vigencia.
2. Entregar diagnóstico priorizado: legibilidad, densidad, consistencia, acciones difíciles de descubrir y elementos decorativos prescindibles.
3. Proponer sistema visual y comparativas Claro/Oscuro de una pantalla representativa; explicar tipografía, escala y paleta elegidas.
4. Implementar un piloto en Dashboard y un flujo con grilla/formulario, conforme al alcance autorizado en ese momento.
5. Validar capturas, contraste, teclado/foco, móvil y zoom; extender tras revisión del piloto.

Cada agente delegado recibe PRODUCT.md, DESIGN.md, archivos objetivo, capturas vigentes y límites de edición. Los criterios explícitos de este brief prevalecen sobre recomendaciones estéticas genéricas de las skills. La instalación de herramientas no equivale a aprobar una paleta o tipografía nueva ni a haber completado la auditoría.
