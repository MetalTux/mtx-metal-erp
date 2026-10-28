# TC1 — Paletas y verificación de componentes

Fecha: **27-10-2026**. Paletas implementadas; revisión visual del usuario pendiente. El layout raíz sigue imponiendo Oscuro. Selector, persistencia y Según el sistema corresponden a TC2 y no están implementados.

## Tokens principales

La paleta clara se define en :root; .dark conserva sus superficies grafito/azul y sustituye los tokens correspondientes. Los componentes reciben variables semánticas de Tailwind, sin inversión global de colores.

| Uso / variable | Claro | Oscuro |
| --- | --- | --- |
| background | #f4f6fa | oklch(0.205 0.015 266.9), conservado |
| foreground | #172033 | oklch(0.967 0.003 264.5), conservado |
| sidebar | #e9eef5 | oklch(0.222 0.014 266.9), conservado |
| topbar | #ffffff | oklch(0.253 0.019 271.9), conservado |
| card / popover | #ffffff | oklch(0.256 0.018 266.3), conservado |
| muted / accent | #e9eef5 | oklch(0.301 0.019 268.1), conservado |
| border, separadores | #cbd3df | oklch(0.371 0.020 266.0), conservado |
| input, borde de control | #7a8595 | #929cac |
| control-surface, base de relleno | #e9eef5 | oklch(0.419 0.021 264.3) |
| muted-foreground | #526174 | oklch(0.701 0.014 262.4), conservado |
| primary / texto del botón | #245dc4 / #ffffff | oklch(0.559 0.174 259.9) / #ffffff |
| primary-hover | Mezcla del principal con 12% negro | Misma regla |
| ring | #1d4ed8 | oklch(0.667 0.148 259.7), conservado |
| brand | #9a3412 | oklch(0.684 0.185 44.9), conservado |
| success | #166534 | oklch(0.679 0.157 153.4), conservado |
| warning | #854d0e | oklch(0.775 0.168 65.4), conservado |
| destructive, texto/error | #b91c1c | #ffc0c4 |
| info / info-foreground | #e7effc / #234c85 | oklch(0.366 0.050 254.5) / oklch(0.813 0.058 251.7), conservados |
| chart-1 a chart-5 | ring, success, warning, brand y muted-foreground | Mismos vínculos con valores del tema |

Los gráficos disponen tanto de variables chart-1…5 como de las utilidades de color correspondientes. La revisión del Dashboard real y sus leyendas sigue en TC3.

## Ajustes específicos

- Cabeceras: degradado claro #f1f4f8 → #e3e9f1, oscuro #3a3e48 → #2c3039 conservado. Brillo y extremos son variables del tema.
- Descripción de SectionCard: nuevo card-header-muted-foreground (#475569 claro / #b4b9c2 oscuro), para asegurar lectura sobre ambos extremos del degradado.
- Separación de borde y relleno de controles: input sirve para el borde; control-surface mantiene el relleno oscuro anterior al 30%, sin aclararlo al reforzar el borde. Input, Textarea, InputGroup, buscador Command y botones outline usan esa separación.
- Hover de botón principal: oscurecer mediante primary-hover evita que la transparencia sobre fondo claro reduzca el contraste de su texto blanco.
- Error/anulación en oscuro: tono rojo claro para lectura normal y sobre los tintes al 20/30% de Button destructive. El color anterior no alcanzaba el objetivo de lectura en ese hover.

## Verificación ejecutada

`node --import tsx tests/temas-tc1.ui.ts` compila CSS real de globals.css y monta SectionCard, Button, Input, GrillaHistorial, Dialog y una muestra de series. No inicia Next ni conecta a PostgreSQL. El cambio de clase existe exclusivamente en el ensayo.

- Tokens no vacíos y color-scheme correctos en ambas paletas.
- Texto normal/secundario, error/estados/marca, información, botones normales/hover, placeholder y descripción de cabecera: al menos 4,5:1 en los pares ensayados.
- Borde de campo y series gráficas: al menos 3:1 en los pares ensayados.
- Menor contraste de texto medido: **4,59:1 claro / 4,70:1 oscuro**. Menor contraste de borde/serie: **3,74:1 claro / 4,81:1 oscuro**.
- Diálogo con texto y descripción, ausencia de errores JavaScript y seis capturas a 360/768/1280 px sin desborde de página.
- Comprobación de que el layout raíz conserva Oscuro; sin cambios de sesión, formularios del negocio ni documentos.

Mediciones detalladas y seis capturas en `var/validacion/temas-tc1/`. Navegador del ensayo cerrado. Muestras ficticias revisadas: [Claro](capturas/temas-tc1/claro.png) y [Oscuro](capturas/temas-tc1/oscuro.png).

Esta prueba no certifica contraste de todas las combinaciones del ERP, accesibilidad integral, hidratación, fuente Inter real, zoom ni cambio de tema durante una operación. Notificaciones aún tienen tema dark explícito (TC2); colores fijos y clases contextuales de módulos se revisarán en TC3. La superficie blanca de contenido técnico y los PDF históricos se conservan intencionalmente.

## Comprobaciones de aplicación

- `pnpm lint`: correcto.
- `pnpm exec tsc --noEmit`: correcto.
- `pnpm build`: **correcto**, incluida generación de páginas y finalización de la compilación. En esta ejecución no se reprodujo el bloqueo de Turbopack registrado en entregas anteriores.
- Diff y referencias locales revisados. No se inició servidor de aplicación ni se escribieron datos/fixtures en la BD.

## Continuidad

TC1 entrega paletas y componentes representativos; no publica selección de tema. El siguiente paso es TC2: gestión de tema, restauración antes de mostrar la interfaz, selector y persistencia. La aprobación visual del usuario y los recorridos globales permanecen pendientes, según [HITO-TEMAS-CLARO-OSCURO.md](HITO-TEMAS-CLARO-OSCURO.md).
