# Herramientas de revisión y diseño de interfaz

Instalación local: **28-10-2026**. Alcance: herramientas e instrucciones; el rediseño no se ha aplicado.

## Herramientas instaladas

| Skill | Procedencia y versión fijada | Papel |
| --- | --- | --- |
| [Impeccable](../.agents/skills/impeccable/SKILL.md) | pbakaus/impeccable, commit d34c87e1a00989ae8dbdd7f6b30b70f23319e860, skill 4.8.0 | Crítica visual, jerarquía, tipografía, colores, densidad, adaptación y acabado |
| [Web Design Guidelines](../.agents/skills/web-design-guidelines/SKILL.md) | vercel-labs/agent-skills, commit 1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62, skill 1.0.0 | Auditoría complementaria de buenas prácticas/accesibilidad |

Instaladas con el helper oficial de skill-installer, usando `--ref` y `--dest` para conservarlas en `.agents/skills/` del ERP. Las skills de Prisma y su skills-lock.json permanecen intactos. [Manifiesto con SHA-256 por archivo](HERRAMIENTAS-DISENO.lock.json). No se instala otra skill general de diseño porque Impeccable ya cubre ese papel.

Impeccable incluye perfiles de proveedor para documentación, revisión final, producción de recursos y aplicación de ajustes manuales en su carpeta agents. Son instrucciones especializadas para delegación cuando el flujo lo requiera; instalar archivos no significa que haya agentes ejecutándose o una auditoría ya realizada. El asistente principal coordina el alcance y entrega el brief a cada agente.

El motor **impeccable-engine 0.1.18** fue descargado desde releases oficiales y comprobado por el lanzador contra el SHA-256 del manifiesto de la versión fijada. Caché en `var/herramientas/impeccable/`, ignorada por Git; no se incorpora a la aplicación ni a sus dependencias. Se conservó el permiso ejecutable del lanzador (el helper de descarga lo había dejado sin él). El JavaScript externo de la skill se excluye de ESLint de la aplicación; las fuentes del ERP mantienen sus comprobaciones.

Licencia Apache-2.0 de Impeccable conservada en [licencias-skills/impeccable/LICENSE](licencias-skills/impeccable/LICENSE). El repositorio de Vercel consultado no aporta archivo de licencia en la raíz de esa referencia; no se le atribuye una licencia inventada.

## Brief entregado

- [PRODUCT.md](../PRODUCT.md): usuarios, tareas, contexto de uso prolongado, stack y restricciones del ERP.
- [DESIGN.md](../DESIGN.md): dirección solicitada para Claro/Oscuro, densidad, tipografía, contraste, superficies planas y proceso de revisión/piloto.
- [AGENTS.md](../AGENTS.md): obliga a leer ambos documentos antes de trabajo visual y compartirlos con cualquier agente delegado.

La interfaz debe ser sobria, profesional y propia del trabajo industrial. Prioriza lectura cómoda durante horas, tamaños claros y buena densidad sin convertir todo en texto pequeño. Evita recetas visuales recurrentes de IA, espaciados excesivos, sombras decorativas y degradados excesivos. Ambos temas se diseñan juntos y Oscuro sigue predeterminado. Tipografía y valores de paleta nuevos todavía no están seleccionados.

Estas decisiones posteriores del usuario prevalecen sobre el estilo metálico/degradados propuesto en la guía original y sobre recomendaciones genéricas de las skills. No se alteran las instrucciones originales de los proveedores para adaptarlas: la personalización reside en el brief del proyecto.

## Uso y comprobación

El wrapper local mantiene la caché dentro del proyecto y ejecuta el lanzador original:

```bash
scripts/diseno-impeccable.sh engine-probe
scripts/diseno-impeccable.sh context --target src/app
```

Estos son comandos de motor, no una llamada automática a critique/audit. En el agente, solicitar la skill Impeccable para revisar la interfaz o Web Design Guidelines para auditar archivos. La elección del comando, los playbooks y la delegación se rigen por el SKILL.md instalado y el alcance autorizado por el usuario.

Comprobado: engine-probe responde con versión 0.1.18; context carga PRODUCT.md y DESIGN.md. La herramienta informa que PRODUCT.md es un brief libre sin su sello de esquema interno y ofrece init para normalizarlo. Se conserva el brief del usuario sin ejecutar esa entrevista ni inventar respuestas; no impide que el contexto se lea. Se podrá solicitar init al comenzar el flujo de diseño si se quiere esa normalización.

No se activaron hooks ni extensiones de navegador. Web Design Guidelines consulta las reglas oficiales vigentes al ejecutar una auditoría. No se enviaron código del ERP, capturas, credenciales ni datos de clientes a un servicio de diseño durante esta instalación.

Las nuevas skills estarán disponibles en el siguiente turno; si el cliente no refresca la lista, reabrir la sesión del agente en este repositorio. La instalación es local a Codex/proyecto; no configura globalmente una instalación separada de Claude Code.

## Seguimiento

- [x] Herramientas y perfiles instalados desde referencias fijadas.
- [x] Motor verificado y contexto del usuario cargado.
- [x] Brief persistente y continuidad registrados.
- [ ] Ejecutar crítica visual/auditoría con capturas actuales.
- [ ] Proponer y revisar piloto Claro/Oscuro antes de extender el rediseño.

Sin cambios en interfaz, BD, permisos, reglas comerciales o documentos. No se iniciaron servidores de aplicación. No es necesario recompilar el ERP para comprobar documentos y una instalación de herramientas; se comprueban el shell, el motor, los archivos y ESLint.

Validación de instalación: `sh -n scripts/diseno-impeccable.sh`, engine-probe, carga de contexto, comprobación de hashes/referencias, `git diff --check` y `pnpm lint` correctos. Build no ejecutado: no cambian fuentes ni dependencias de la aplicación.
