# Hito: Inicio de Sesión y Seguridad

**Estado: decisiones funcionales D01–D11/D08-R aprobadas. S1/S2/S4/S5 implementados y validados técnicamente. S3 Google pospuesto por el usuario el 21-10-2026. El ERP exige sesión y permisos en servidor; S6 completado en el alcance local aprobado; despliegue real diferido y S7 pendiente. Continuidad en docs/SEGURIDAD-S6-CONTINUIDAD.md y docs/OPERACION-SEGURIDAD.md.**

Fecha: 20-10-2026. Aplicación: MTX Metal ERP, una empresa. Dependencia de [Cierre de V1](CIERRE-VERSION-1.md), bloque V1.1. Este documento describe el comportamiento esperado, las alternativas y el seguimiento. Sus propuestas no constituyen decisiones aprobadas; las respuestas deben registrarse en la sección 16 antes de implementar lo que dependa de ellas.

## 1. Objetivo y límites

Que cada persona ingrese con su propia identidad, acceda sólo a las funciones autorizadas y deje autoría verificable de las operaciones nuevas. Debe resultar sencillo entender cómo ingresar, recuperar el acceso y cerrar una sesión en un equipo compartido.

Incluye ingreso/salida, usuarios, roles/permisos, sesiones revocables, recuperación de acceso, protección de páginas/acciones/archivos, auditoría de seguridad y adaptación de los módulos existentes. No modifica las reglas de inventario, contratación, producción, despacho ni deuda.

No incluye por defecto acceso de clientes/proveedores, registro público, multiempresa, facturación de servicios externos, lectura de Gmail/Drive, SSO empresarial, biometría o acceso sin conexión. Cobranza se implementa en un hito separado; sus permisos se prepararán sin presentar sus operaciones como disponibles.

**Condición del usuario:** estudiar Google sólo si no implica gasto adicional. No contratar servicios, habilitar facturación ni crear recursos externos en esta etapa documental.

## 2. Estado de partida y transición S1

- Existen `Role` y `User` en `prisma/schema.prisma`. Cada usuario tiene actualmente un solo `roleId`, correo único y contraseña obligatoria. No existen en esos modelos sesiones, identidades externas, baja de acceso ni recuperación.
- Al preparar S0, el seed declaraba Administrador, Bodeguero y Ventas y creaba una contraseña de ejemplo en texto plano. S1 conserva los catálogos heredados, retira la creación de ese usuario y agrega estructura segura sin habilitar credenciales. La provisión real corresponde a S2.
- El layout del ERP aún no exige sesión y la barra superior declara «Sin sesión iniciada». S1 instala bibliotecas de protocolo/hash/cifrado/TOTP; el login y su integración siguen pendientes.
- Menús, páginas, Server Actions, consultas y rutas de logos/imágenes/PDF deben incorporarse a la autorización. `roles?` en navegación no equivale a una comprobación efectiva.
- Los documentos de negocio ya tienen historia y restricciones SQL. Incorporar usuarios no autoriza editar documentos emitidos, fabricar autorías antiguas ni ejecutar seed sobre datos reales.

La preparación S0 fue documental. La sección 18 registra la auditoría y migración local realizada al implementar S1; no interpretar el estado inicial como estructura actual.

## 3. Opciones para iniciar sesión

### 3.1 Correo y contraseña del ERP

La persona escribe su correo y contraseña del sistema. No necesita cuenta Google y la autenticación no depende de que Google esté disponible. La contraseña del ERP es independiente de la de su correo.

Ventajas: sirve para todos los trabajadores y permite operar en red local si el servidor está disponible. Responsabilidades: almacenar hashes, limitar intentos, recuperar acceso y administrar contraseñas de forma segura. No requiere licencia de proveedor de identidad; sí usa recursos de la instalación.

### 3.2 Continuar con Google

La persona elige su cuenta Google y vuelve al ERP; el sistema comprueba esa identidad y sus permisos locales. Puede ser una cuenta personal o corporativa compatible. **Usar una dirección Gmail como usuario no es lo mismo que iniciar sesión con Google.** No se pide la contraseña de Google en el ERP ni permiso para leer mensajes.

Google documenta acceso básico con identidad/perfil y configuración de cliente web. El proyecto de su tutorial puede crearse gratuitamente. Se propone integración directa de identidad, limitada a `openid`, `email` y `profile`, sin Gmail API ni servicios de pago añadidos. Fuentes: [configuración](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid), [tutorial oficial](https://codelabs.developers.google.com/codelabs/sign-in-with-google-button) y [alcances de autenticación](https://developers.google.com/identity/oauth2/web/guides/overview).

**Viabilidad económica:** alternativa a evaluar para acceso sin cargo adicional por proveedor; antes de habilitarla se comprobarán las condiciones de la configuración concreta y que no exige facturación. La creación gratuita de un proyecto no acredita gratuidad de cualquier producto de Google. Identity Platform es otro servicio con [tarifas propias](https://cloud.google.com/identity-platform/pricing); no se lo adopta por defecto. Dominio, alojamiento, Internet o correo pueden tener costos independientes. Si la opción elegida requiere un pago, se mantiene pendiente y se vuelve a consultar al usuario.

Requiere conexión a Internet en el ingreso, cliente OAuth, orígenes/callbacks autorizados y HTTPS en producción. No exige publicar la base de datos. Red local sin dominio/HTTPS estable exige revisar viabilidad antes de elegir Google como método único. La pantalla de consentimiento, dominios y eventual verificación de marca se comprueban según la instalación; no basta dejarla como aplicación de prueba indefinidamente. [Requisitos de configuración](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) y [buenas prácticas de Google](https://developers.google.com/identity/siwg/best-practices).

### 3.3 Comparación y propuesta a validar

| Alternativa | Ventaja principal | Condición |
| --- | --- | --- |
| Sólo correo/contraseña | Independencia de Google y compatibilidad con cualquier correo | Recuperación local o correo propio y administración de contraseñas. |
| Correo/contraseña + Google opcional | Permite elegir y conserva alternativa local autorizada | Alternativa aprobada por el usuario el 20-10-2026; falta resolver vinculación y métodos por usuario. |
| Sólo Google | Menos contraseñas locales para trabajadores | Todos deben disponer de cuenta admitida e Internet; definir acceso de emergencia. |
| Enlace o código por correo | No memorizar contraseña | Depende del envío y disponibilidad de correo; no propuesto para V1 sin validar infraestructura/costo. |

No se propone SMS por su posible costo ni agregar otros proveedores en esta primera entrega. Se aprueba doble factor opcional mediante aplicación autenticadora TOTP, gestionado exclusivamente por el titular desde su panel personal (D08), sin SMS ni tarifa por mensaje.

## 4. Alta y vinculación de identidades

Alta aprobada para un ERP privado: sólo el Administrador crea/habilita usuarios y asigna roles, sin registro público. Los detalles técnicos de activación y vinculación siguientes se revisarán antes de implementar:

1. Administrador crea un usuario o invitación con correo, nombre, rol(es) y métodos de acceso permitidos.
2. No se permite autorregistro público. Autenticarse en Google no crea permisos ni da acceso automáticamente.
3. Si usa credenciales locales, el usuario activa su acceso y elige contraseña mediante un mecanismo de un solo uso; el administrador no conoce su contraseña definitiva.
4. Si usa Google, se verifica la identidad en servidor y la coincidencia con una autorización previa. Los casos de correo externo no autoritativo requieren verificación adicional; no basta confiar en una coincidencia de texto.
5. La identidad externa queda vinculada de forma única al identificador estable del proveedor (`sub`), no al correo como único identificador. Cambiar correo no transfiere la identidad a otra persona.
6. No fusionar una cuenta local y Google sólo por compartir correo. Vincular exige sesión/reautenticación del titular o proceso administrativo de verificación documentado; el primer ingreso de una invitación Google debe probar que el correo autorizado pertenece al titular.
7. No guardar contraseña ficticia para usuarios Google ni almacenar tokens de Google que no sean necesarios. Una identidad no puede pertenecer a dos usuarios ERP.
8. Desvincular un método exige conservar otro acceso utilizable o un procedimiento seguro de recuperación. La recuperación no convierte una cuenta «sólo Google» en acceso por contraseña sin autorización expresa.

Google exige verificar el token y explica cuándo puede considerarse autoritativo para el correo. Se adoptará una biblioteca mantenida y validación en servidor; la cuenta admitida sigue siendo decisión del ERP. [Verificación oficial de identidad](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

## 5. Roles propuestos para validación

Los seis roles de esta sección fueron aprobados por el usuario el 20-10-2026. No están implementados. También se aprueba asignar varios roles a una persona, sumando sus permisos sin que un rol invalide a otro. La matriz de la sección 5.1, el alcance por empresa y las correcciones/anulaciones por área también están aprobados (D07/D10). Se recomienda catálogo inicial fijo con permisos explícitos; un editor libre puede quedar para después.

| Rol propuesto | Trabajo habitual | Límites propuestos |
| --- | --- | --- |
| Administrador | Empresa, usuarios, permisos, configuración y soporte operativo | Acceso total funcional, sujeto a reglas de negocio, confirmaciones e historial. No puede activar/desactivar el doble factor de otro usuario (D08). |
| Ventas | Clientes/sucursales, cotizaciones, PDF y OCC | Sin ajustes de stock, registro productivo ni abonos por defecto. |
| Compras y Bodega | Proveedores, compras/recepciones, inventario, mínimos, ajustes y traslados | Sin precios comerciales ni cobranza; puede ajustar/corregir/anular dentro de su área, respetando las reglas de negocio. |
| Producción y Despacho | Plan/OT, reservas, inicio, fabricación, finalización y entregas/devoluciones | Sin modificar ventas o deuda; correcciones de producción y guías dentro de su área. Factura corresponde a Cobranza según matriz. |
| Cobranza | Consulta comercial necesaria, factura/vencimiento, promesas y abonos cuando exista el módulo | Sin producción/stock ni administración de usuarios; corrige factura y anula pagos dentro de su área cuando esté implementado Cobranza. |
| Consulta/Gerencia | Indicadores, documentos y seguimiento de lectura | Sin modificaciones; lectura de toda la empresa e importes conforme a la matriz aprobada. |

Alcance aprobado: toda la empresa, sin restricciones por bodega/asignación; cada rol ve las referencias e importes necesarios para su tarea. Consulta/Gerencia puede leer todo. Las combinaciones suman capacidades, incluida la visibilidad de datos que otorgue cualquiera de sus roles.

### 5.1 Matriz inicial de capacidades

`A`: administración completa funcional; `O`: operar en su área; `L`: lectura necesaria; `—`: sin acceso. **Matriz aprobada por el usuario el 20-10-2026 (D07), completada por D10.** `O` incluye corregir/anular en su propia área, siempre que la operación exista y las reglas de negocio lo permitan. `L` no permite modificaciones. Ocultar costos/precios a roles que no los necesitan.

| Capacidad | Administrador | Ventas | Compras/Bodega | Producción/Despacho | Cobranza | Consulta/Gerencia |
| --- | --- | --- | --- | --- | --- | --- |
| Usuarios, roles y sesiones ajenas | A | — | — | — | — | — |
| Empresa, IVA, numeración y cuentas bancarias | A | L | — | — | L | L |
| Clientes/sucursales | A | O | — | L | L | L |
| Proveedores y compras | A | — | O | — | — | L |
| Catálogos de materiales/productos/unidades/bodegas | A | L | O | L | — | L |
| Cotizaciones, importes comerciales y PDF | A | O | — | — | L | L |
| OCC | A | O | — | L | L | L |
| Stock, Kardex y mínimos | A | L | O | L | — | L |
| Ajustes y traslados | A | — | O | — | — | L |
| OT, reservas y producción | A | L | L | O | L | L |
| Finalizar OT | A | — | — | O | — | — |
| Registrar/corregir factura externa | A | — | — | — | O | — |
| Emitir guía/corregir devolución | A | L | L | O | L | L |
| Cuentas/abonos/promesas (hito futuro) | A | L | — | — | O | L |
| Auditoría de seguridad | A | — | — | — | — | — |

Desglosar permisos concretos para consultar, crear, editar, confirmar, anular, corregir, descargar y administrar. La asignación múltiple está aprobada: el permiso efectivo es la unión de lo concedido por todos los roles, sin que las ausencias de permiso de uno anulen lo concedido por otro. Por ejemplo, Ventas + Cobranza habilita las tareas de ambas áreas. No introduce privilegios que ninguno conceda ni evita las reglas de negocio. Requiere sustituir la relación actual de un solo rol. D07 aprueba la matriz y ocultación de importes innecesarios; D10 permite corregir/anular dentro del área de cada rol. Administrador opera en todas las áreas, pero no puede gestionar el doble factor de otra persona (D08).

Todos los roles necesitan lectura mínima de catálogos/referencias para ejecutar sus tareas; se entregarán DTO limitados, no acceso completo al módulo relacionado. Un usuario que ve una OT no debe recibir automáticamente datos financieros o un PDF que los revele.

## 6. Recorridos de usuario

### 6.1 Ingreso local

1. Abrir el ERP: sin sesión se muestra Iniciar sesión, conservando sólo un destino interno autorizado.
2. Escribir correo y contraseña; permitir gestor de contraseñas, pegado y mostrar/ocultar con etiqueta accesible.
3. Pulsar Ingresar. Evitar doble envío, mostrar estado y errores útiles sin revelar si un correo existe.
4. Si debe activar/cambiar contraseña o completar MFA aprobado, resolver ese paso antes de acceder al ERP.
5. Abrir el destino permitido o Inicio. Usuario sin permisos recibe una explicación y opción de salir/contactar al administrador.

### 6.2 Ingreso con Google, si se aprueba

1. Pulsar Continuar con Google de forma explícita; no proponer ingreso automático en equipos compartidos.
2. Elegir cuenta en Google y consentir los datos básicos solicitados.
3. El servidor valida la respuesta y comprueba usuario activo, identidad vinculada/invitación válida y permisos actuales.
4. Crear sesión ERP y volver a una ruta interna permitida. Cancelar o fallar Google no crea usuario, sesión ni privilegios.

### 6.3 Cierre y expiración

- Menú con nombre, rol(es), Mi acceso y Cerrar sesión; no conservar el rótulo ficticio actual.
- Cerrar sesión revoca la sesión ERP y borra su cookie. No cierra la cuenta Google del navegador; advertirlo en equipos compartidos.
- Al expirar, informar y pedir reingreso. No reenviar automáticamente una operación de negocio pendiente; conservar el UUID si corresponde y conciliar su resultado con el servicio existente.
- No guardar datos sensibles de formularios en almacenamiento persistente del navegador para «recuperar» una sesión.
- Una página vieja o el botón Atrás no permite volver a consultar datos protegidos. El tratamiento de caché y pestañas debe comprobarse; no es posible retirar un archivo que el usuario ya descargó legítimamente.

### 6.4 Recuperación de acceso

Modalidad aprobada: recuperación asistida por administrador mediante identidad verificada y enlace/código de activación de un solo uso, con vencimiento y entrega por canal acordado. No entregar contraseñas permanentes por chat ni permitir que un dato público pruebe identidad.

También se aprueba recuperación autoservicio por correo cuando se disponga de SMTP configurado y autorizado, conservando la asistencia del Administrador. No contratar correo de pago por defecto. Respuesta genérica, token aleatorio guardado como hash, plazo propuesto de 30 minutos, un uso, limitación de solicitudes y revocación de sesiones al completar. No cambiar contraseña al solicitar el enlace. Google recupera su propia cuenta fuera del ERP. [Guía OWASP de recuperación](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

### 6.5 Panel personal y doble factor opcional (aprobado D08)

El doble factor es voluntario para todos los roles, incluido Administrador. Cada persona lo activa o desactiva exclusivamente desde su propia sesión; un administrador no dispone de control equivalente sobre otras cuentas. Estar registrado como administrador no permite suplantar al titular.

Recorrido de activación a implementar:

1. Entrar al panel personal **Mi acceso → Doble factor** y comprobar el estado actual.
2. Reautenticar al titular mediante su método permitido; no basta tener abierta una pestaña antigua.
3. Solicitar activación; mostrar QR/clave de configuración de forma temporal y privada.
4. Añadir la cuenta en la aplicación autenticadora y confirmar un código válido. Hasta confirmarlo, el doble factor sigue inactivo; cancelar no deja la cuenta bloqueada.
5. Confirmar el resultado y entregar códigos personales de recuperación de un uso (D08-R aprobado). Explicar que deben guardarse fuera del móvil y en un lugar privado para poder recuperar el acceso si se pierde el dispositivo.

Cuando está activo, completar contraseña o Google sólo abre un paso previo restringido al desafío TOTP. No habilita lecturas/acciones/archivos del ERP hasta superar ese paso. Usar Google no omite el doble factor propio del ERP. Cuando está inactivo, no se exige TOTP.

Para desactivar, el titular debe entrar a su panel y superar reautenticación y prueba del factor actual o recuperación personal aprobada. Registrar el cambio y revocar otras sesiones propias según el diseño de seguridad. La baja administrativa puede bloquear el acceso completo, pero no elimina ni desactiva el factor. Restablecer contraseña, cambiar roles o desvincular Google tampoco lo elimina.

Requisitos técnicos a concretar en S1: secreto TOTP cifrado con clave de servidor fuera de la base/repositorio, no exponerlo después del alta, desafíos cortos y limitados, verificación de reloj con tolerancia acotada, rechazo de reutilización del mismo código y consumo concurrente protegido. No registrar secreto/QR/códigos en auditoría. Los códigos de recuperación aprobados se guardan como hash y se consumen atómicamente.

**Recuperación aprobada D08-R:** códigos personales de respaldo de un uso para todos los usuarios, incluidos Administradores. Si pierde el móvil, el titular completa su método primario (contraseña o Google) y usa un código como sustituto del desafío TOTP para acceder a su panel y reconfigurar la aplicación. El código no sustituye la identidad primaria ni concede permisos nuevos.

La reconfiguración requiere confirmar el nuevo autenticador; emitir nuevos códigos invalida los anteriores y no permite reutilizar uno consumido. Registrar recuperación/cambio sin guardar códigos en la auditoría. La entrega, regeneración y uso se limitan al titular con comprobación de identidad; Administración no los consulta ni los genera para otro usuario.

No hay desactivación administrativa ni bypass de TOTP mediante recuperación de contraseña o correo. Si pierde el autenticador y todos los códigos, no dispone de recuperación por esas vías; se debe advertir al habilitar el factor. Esto se aplica igualmente a los Administradores. La continuidad requiere conservar los códigos y prever más de un Administrador activo, sin convertirlo en una puerta para desactivar el factor de otra persona.

## 7. Administración de usuarios

Ruta propuesta Administración → Usuarios, visible según permiso. Tabla con búsqueda, estado, rol(es), métodos habilitados y fecha de último acceso; formularios sobre listado y confirmaciones del sistema.

Gestión exclusiva del Administrador aprobada; las reglas detalladas siguientes completan la propuesta:

- Crear/invitar, consultar, editar nombre/roles, habilitar/deshabilitar y gestionar métodos permitidos.
- Estados diferenciados: invitado/pendiente de activación, activo e inactivo; bloqueo temporal por intentos no equivale a baja laboral.
- Desactivar revoca sesiones y bloquea todos sus métodos. No eliminar historia ni reutilizar identidad para otro trabajador.
- No permitir retirar/desactivar al último administrador activo ni dejar sin acceso de recuperación a la instalación. Comprobar bajo concurrencia, no sólo en la pantalla.
- Cambios críticos de roles, métodos o recuperación requieren confirmación y reautenticación reciente; no permitir autoescalado.
- El usuario puede cambiar su propia contraseña, consultar métodos/sesiones y cerrar otras sesiones propias, sin editar sus permisos.
- Cada usuario dispone de panel personal para activar/desactivar su doble factor opcional. Ningún administrador puede hacerlo por otro usuario; la sesión nunca permite actuar como titular ajeno.
- Inicializar primer administrador por procedimiento de instalación único y restringido, sin formulario público permanente ni credencial fija.

## 8. Sesiones y protección técnica propuestas

El usuario aprobó 60 minutos de inactividad y máximo de 8 horas, manteniendo la propuesta de varias sesiones con opción de cerrar las demás. No es configuración ya aplicada. Los detalles adicionales de seguridad siguen siendo propuestas para revisar.

| Tema | Propuesta inicial |
| --- | --- |
| Sesión | Token opaco aleatorio en cookie; registro revocable en servidor, guardando hash del token. |
| Inactividad | 60 minutos desde la última actividad válida; aprobado el 20-10-2026 para equipos personales. |
| Duración máxima | 8 horas desde ingreso, aprobado; proponer aviso previo sin extensión indefinida por actividad. |
| Recordarme | Fuera de V1 inicial, especialmente en equipos compartidos. |
| Sesiones simultáneas | Se mantiene la propuesta de varias sesiones y opción de cerrar las demás al aprobar el cambio de inactividad a 60 minutos. |
| Reautenticación sensible | Propuesta: antigüedad máxima 5 minutos para usuarios/permisos, cambios de métodos y recuperación; confirmar operaciones adicionales. |
| Revocación | Baja, restablecimiento, cambio de permisos/método y cierre de sesiones deben surtir efecto en la siguiente operación protegida. |

La actividad válida debe definirse como acciones del usuario, sin que un sondeo automático mantenga viva una sesión. Usar reloj de servidor para expiración; mostrar fechas del historial con el formato del proyecto.

Cookies `HttpOnly`, `Secure` en producción y política `SameSite` compatible con el flujo elegido; alcance restringido, rotación al autenticar y revocación en servidor. No guardar credenciales/tokens de sesión en `localStorage`. HTTPS y origen de aplicación de confianza, incluyendo cabeceras del proxy validadas. Referencia: [OWASP sesiones](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

Contraseñas: por decisión explícita del usuario, mínimo 8 y máximo 128 caracteres, con frases y Unicode sin truncamiento; no imponer cambio periódico arbitrario ni reglas de símbolos como sustituto de longitud. Almacenamiento con Argon2id y parámetros medidos para el servidor; elegir dependencia mantenida al implementar. No cifrado reversible ni comparación con texto heredado. [OWASP autenticación](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) y [almacenamiento](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

Limitar intentos por cuenta y origen con espera/bloqueo temporal progresivo; límites y recuperación verificables sin crear bloqueo permanente explotable por terceros. Estado compartido/persistente cuando haya varios procesos. Probar recuperación, Google y activación, no sólo el formulario local.

Protección contra CSRF, destinos de retorno externos, fijación de sesión y abuso de callbacks. Para el flujo OIDC elegido: validaciones de emisor/audiencia/vencimiento/firma y protecciones de correlación, `state`, `nonce` y PKCE según protocolo/biblioteca. No implementar criptografía ni un protocolo propio. Google y sus errores no deben abrir un bypass.

## 9. Autorización de toda la aplicación

Propuesta: denegar por defecto; identidad, actividad y permiso se comprueban en el servidor junto a la operación. El layout/redireccionamiento es ayuda de navegación, no la única barrera. [OWASP autorización](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

Inventario obligatorio antes de dar este bloque por terminado:

- Páginas del ERP, buscador, menú, Dashboard y futuros avisos.
- Server Actions de lectura/previsualización y de escritura; servicios de dominio con entrada pública.
- Logos, imágenes de productos/cotizaciones y PDF de cotización/OT/guía, con permiso sobre el recurso asociado. Conocer ID o clave no concede acceso.
- Metadatos, errores, DTO y consultas auxiliares de selectores: no enviar campos ocultos al cliente.
- Rutas de login/callback/recuperación públicas limitadas a su función; archivos estáticos de marca aprobados explícitamente como públicos.

En operaciones de negocio la comprobación debe respetar el momento de confirmación y revocaciones concurrentes, con orden de bloqueos definido para no introducir carreras/deadlocks. No interrumpir una transacción ya confirmada ni reintentar una escritura con otra clave porque expire la sesión.

Si un rol operativo no puede ver importes, revisar también PDF y resúmenes relacionados. Evitar exigir permiso de configuración sólo para leer un catálogo mínimo que su tarea necesita. D07 aprueba acceso por rol a toda la empresa sin restricciones por bodega/asignación; no se introduce multitenencia.

## 10. Autoría, auditoría y datos históricos

Separar historial de seguridad del historial de negocio existente.

Eventos aprobados (D09): ingreso correcto/fallido limitado, cierre/expiración/revocación, activación, recuperación, cambio de rol/estado/método, vinculación externa y denegaciones relevantes. Datos: fecha de servidor, actor/afectado cuando se conoce, resultado, acción y referencia, IP y tipo de navegador. Sólo Administrador puede consultar la auditoría de seguridad. El navegador es información auxiliar no confiable, no una prueba de identidad. Nunca registrar contraseñas, tokens, códigos de un uso, secretos OAuth ni cuerpos completos de formularios.

Registrar autoría de operaciones nuevas relevantes (creación/confirmación/corrección/anulación de negocio y configuración). Actor se obtiene de la sesión, nunca de un `userId` confiado del formulario. Mantenerla en la misma transacción del hecho cuando corresponda; un reintento conserva el autor y documento originales y exige acceso actual para consultarlos.

Los documentos antiguos mantienen «Sin autoría registrada» donde no exista evidencia; no atribuirlos al administrador creado durante el despliegue. No modificar PDFs históricos para añadir firmas actuales. La retención aprobada de eventos de seguridad es de 12 meses, sin borrar la autoría histórica de los documentos. Diseñar depuración controlada de eventos y sesiones, así como retención de respaldos coherente; los respaldos contienen información sensible y requieren acceso restringido. No afirmar que depurar la base elimina automáticamente datos de copias ya conservadas.

## 11. Datos y migración a diseñar

Nombres orientativos, no contrato Prisma aprobado:

| Concepto | Requisito |
| --- | --- |
| Usuario | Identidad interna estable, estado, correo normalizado único, métodos habilitados y cambios de seguridad. No quitar alias/puntos de Gmail para «normalizar». |
| Credencial local | Hash opcional/separado para cuenta sin contraseña local, fechas de cambio y activación. |
| Identidad externa | Proveedor + ID estable únicos, vínculo Restrict y evidencia de verificación. |
| Rol/permiso | Un rol actual o relación múltiple si se aprueba; catálogo y matriz explícitos. |
| Sesión | Hash único, usuario, expiración absoluta/inactividad y revocación. |
| Invitación/recuperación | Hash, propósito, destinatario, expiración y consumo atómico de un uso. |
| Evento/autoría | Referencias estables e índices, sin borrar historia al desactivar usuarios. |
| Doble factor personal | Estado, secreto cifrado, alta pendiente, desafíos y prevención de replay; recuperación personal según D08-R. Ningún permiso administrativo cambia el factor de otro usuario. |

Auditar usuarios/roles y correos existentes antes de imponer nuevas restricciones. No tratar contraseñas antiguas como hashes: invalidar/reestablecer con un procedimiento explícito y comprobar que queda un administrador utilizable. No ejecutar seed general para inicializar seguridad.

Seguir migraciones versionadas, respaldo, ensayo en copia descartable, CHECK/FK/índices y cliente generado. Si hacen falta cambios de autoría en documentos inmutables, diseñar registros vinculados/restricciones compatibles sin editar migraciones anteriores ni debilitar su protección.

## 12. Interfaz y mensajes

Mantener tema/layout actuales y leer GUIA-INTERFAZ antes de implementar. Login claro, accesible a 320 px y teclado, etiquetas visibles, foco, error asociado al campo y estado de envío. Mensajes propuestos:

| Situación | Mensaje/acción |
| --- | --- |
| Credenciales inválidas | «No pudimos iniciar sesión con estos datos. Revisa el correo y la contraseña.» |
| Espera temporal | Explicar cuándo reintentar y cómo pedir ayuda, sin confirmar que una cuenta existe. |
| Google cancelado | «El ingreso con Google se canceló. Puedes volver a intentarlo.» |
| Sin acceso autorizado | «No fue posible habilitar tu acceso. Contacta al administrador.» |
| Sesión expirada | «Tu sesión terminó. Inicia sesión para continuar.» Sin confirmar/repetir automáticamente formularios. |
| Permiso insuficiente en sesión válida | «Tu perfil no permite esta acción.» Indicar cómo pedir acceso sin revelar el recurso. |
| Cuenta deshabilitada durante uso | Revocar y volver al ingreso con explicación apropiada, sin dejar datos nuevos accesibles. |

Incluir ayuda «¿Cómo ingreso?» y uso de equipos compartidos. No mostrar stack, SQL ni configuración interna. Probar mensajes con personas de distintos niveles de experiencia; incorporarlos al manual completo de V1.

## 13. Etapas y control de avances

`[x]` sólo después de completar y verificar el punto. Separar implementación, validación técnica y aprobación funcional; registrar evidencia/fecha, no porcentajes estimados.

| Etapa | Entrega | Estado actual | Criterio para avanzar |
| --- | --- | --- | --- |
| S0 | Alcance y decisiones | Resuelto para iniciar S1 | Decisiones aprobadas; autorización explícita de S1 el 20-10-2026. |
| S1 | Diseño y migración | Implementado y validado técnicamente | Contrato/inventario, bibliotecas, estructura y migración ensayada/aplicada; checks correctos. |
| S2 | Identidad local y administración | Implementado y validado técnicamente | Ciclo local, usuarios y TOTP verificados en copia y navegador; Google queda en S3. |
| S3 | Google opcional | Pospuesto por el usuario | Decisión explícita del 21-10-2026; no implementado. |
| S4 | Sesiones y autorización integral | Implementado y validado técnicamente | Cobertura de entradas y revocación comprobada; sección 22. |
| S5 | Auditoría y autoría | Implementado y validado técnicamente | Visor, autoría atómica y retención probados; sección 23/checkpoint S5. |
| S6 | Validación y despliegue controlado | Completado en alcance local aprobado | 48/48 escenarios, HTTPS/restauración locales y despliegue preparado; instalación real diferida. Sección 24/checkpoint S6. |
| S7 | Aprobación funcional y cierre | No iniciada | Usuario confirma cierre explícitamente. |

### S0 — Revisión y decisiones

- [x] Revisar código/modelos/seed y detectar ausencia de login efectivo.
- [x] Preparar descripción, propuestas de roles, alternativas y fuentes oficiales.
- [x] Consultar roles, métodos de ingreso y entorno al usuario.
- [x] Registrar respuestas iniciales D01–D03: roles combinables, métodos y entorno.
- [x] Registrar D04–D06: gestión exclusiva del Administrador, recuperación por ambas vías y sesiones 60 min/8 h.
- [x] Registrar D07/D08/D10: matriz y alcance, doble factor opcional personal, correcciones/anulaciones por área.
- [x] Resolver D09 y D08-R: auditoría con IP/navegador y retención 12 meses; códigos personales para recuperar TOTP, incluidos Administradores.
- [x] Aprobar alcance y matriz funcional 5.1, incluidas correcciones/anulaciones por área (D07/D10).
- [x] Derivar inventario técnico de páginas/acciones/archivos y restricciones de DTO desde la matriz aprobada; ver SEGURIDAD-S1-INVENTARIO.md.
- [x] Usuario autoriza iniciar S1 el 20-10-2026 («Comienza con el Hito S1»). No equivale al cierre funcional de todo el hito.

### S1 — Diseño técnico y estructura

- [x] Inventariar páginas, acciones, servicios y archivos; listar permiso requerido en cada entrada.
- [x] Elegir biblioteca mantenida compatible con Next/React/Prisma actuales y métodos aprobados, verificando documentación oficial y licencia/costo. No fijarla sólo por este documento.
- [x] Diseñar sesiones, credenciales, identidades, roles, tokens y eventos; cerrar decisiones de correo, MFA y recuperación inicial.
- [x] Auditar destino autorizado, respaldar y ensayar migraciones en copia; conservar historia/restricciones.
- [x] Validar Prisma, generar cliente y revisar migración/diff; aplicar sólo en entorno autorizado y con procedimiento de recuperación.

### S2 — Acceso y usuarios

- [x] Inicialización segura de primer administrador sin contraseña fija ni registro público.
- [x] Alta/invitación, activación, consulta/edición, roles y baja con concurrencia/versionado.
- [x] Login local si se aprueba, hash y límites de intento; cambio y recuperación de contraseña.
- [x] Mi acceso, salida y recuperación de administrador; protección del último administrador.
- [x] Panel personal TOTP: activación confirmada, desafío de ingreso local, desactivación propia y recuperación con códigos personales para todos, incluidos Administradores. Ninguna modificación administrativa del factor ajeno.
- [ ] Verificar este mismo desafío con ingreso Google al implementar S3; no se da por probado todavía.
- [x] Pruebas del ciclo y UI; no sustituir acceso de Google por contraseña sin política aprobada.

### S3 — Google — pospuesto por el usuario el 21-10-2026

- [ ] Confirmar ausencia de costo/facturación requerida y titularidad del proyecto por la empresa.
- [ ] Configurar cliente, HTTPS, orígenes/callbacks, consentimiento/dominios y estado de publicación apropiado.
- [ ] Validar respuesta en servidor, vinculación segura, invitaciones y restricciones aprobadas.
- [ ] Probar cuenta autorizada/desconocida/inactiva, correo no autoritativo, token inválido/vencido/repetido y callback manipulado.
- [ ] Probar cancelación, falta de Internet y recuperación, sin habilitar caminos de acceso alternativos indebidos.
- [x] Registrar exclusión explícita: el usuario pospone Google el 21-10-2026 y autoriza continuar con S4. S3 no está implementado.

### S4 — Sesiones y permisos

- [x] Cookies, rotación, expiración, revocación, reautenticación y CSRF completos.
- [x] Proteger páginas, acciones, consultas/DTO y rutas de archivos, no sólo menú/layout.
- [x] Conectar navegación/buscador/Inicio con permisos y mensajes de denegación.
- [x] Asegurar revocación ante cambio de roles/baja y evitar escalado por parámetros o asignación masiva.
- [x] Probar URL directa, llamada directa de acción, pestaña vieja y acceso cruzado a documentos/archivos.
- [x] Verificar tareas permitidas de cada rol, sin bloqueos accidentales por catálogos mínimos.

### S5 — Auditoría y autoría

- [x] Actor de servidor en operaciones nuevas, atomismo e idempotencia preservados.
- [x] Historial de seguridad sin secretos, IP/navegador, consulta sólo Administrador y depuración de eventos a 12 meses sin borrar autoría documental.
- [x] Identificar documentos anteriores sin inventar autoría ni modificar bytes históricos.
- [x] Revisar comportamiento de operaciones ante expiración y reintentos tras commit.

### S6 — Validación técnica y operación

Alcance confirmado por el usuario el 22-10-2026: todavía no existe servidor/dominio; validar localmente y dejar el despliegue preparado. **Cierre técnico local completado**, sin certificar una instalación inexistente.

- [x] Ejecutar escenarios locales aplicables de la matriz de la sección 14 en copias aisladas; Google S3 pospuesto.
- [x] Regresión comercial/productiva e inventario; invariantes y documentos/archivos históricos conservados. Barrido final: 48/48.
- [x] Revisar dependencias/configuración, cookies/caché/límites/errores y normalización HTTPS; 0 avisos de producción y 1 de desarrollo documentado.
- [x] `pnpm lint`, `pnpm build`, tipos, Prisma validate/generate/status y ensayo histórico de SQL versionado correctos; sin migraciones S6.
- [x] Ensayar HTTPS/proxy/reinicio/restauración en aislamiento local; secretos y respaldos privados fuera de git.
- [x] Preparar servicio, proxy y retención diaria; comprobar sintaxis systemd y operación del comando de retención en copias, conservando autoría.
- [x] Documentar provisión/recuperación, permisos, restauración/conciliación e incidencias.
- [x] Retirar copias/fixtures/servidores propios y verificar puertos; preservar procesos y datos de trabajo.

Verificación posterior, **diferida por no existir destino**, fuera del cierre local autorizado:

- [ ] Instalar y validar HTTPS/proxy/certificados/reinicio/restauración en el servidor definitivo.
- [ ] Habilitar y verificar allí la tarea diaria `pnpm seguridad:depurar-auditoria --aplicar` y la política de respaldos.

### S7 — Aprobación funcional

Guía preparada el 23-10-2026: [pruebas funcionales S7](GUIA-PRUEBAS-SEGURIDAD-S7.md). Incluye pasos, permisos por rol, resultados esperados y registro de incidencias. Preparar la guía no completa las pruebas ni concede aprobación; los checks siguientes siguen pendientes del usuario. Google y despliegue real conservan sus diferimientos aprobados.

- [ ] Usuario ingresa con cada método aprobado y comprende los mensajes.
- [ ] Titular activa/desactiva su doble factor opcional, prueba ingreso local/Google y recuperación personal; Administrador no puede hacerlo por él.
- [ ] Validar tareas reales con perfiles representativos y un equipo compartido si aplica.
- [ ] Administrador prueba alta, cambio de permisos, baja y recuperación.
- [ ] Comprobar que cada perfil puede trabajar y no ve ni ejecuta funciones ajenas.
- [ ] Actualizar manual/avances/Cierre V1 y registrar limitaciones aceptadas.
- [ ] Usuario aprueba expresamente el cierre del hito; autorización de despliegue según entorno acordado.

## 14. Matriz mínima de pruebas

| Grupo | Escenarios y resultado esperado |
| --- | --- |
| Ingreso | Correcto/incorrecto, usuario desconocido/inactivo/no activado; sin enumeración ni sesión parcial. |
| Credenciales | Hash válido, contraseña heredada invalidada, límites, Unicode/largos/pegado; sin texto plano en almacenamiento/logs. |
| Google | Token falsificado, audiencia/emisor erróneos, vencimiento, correlación/replay, cuenta no autorizada; nunca concede rol por datos del cliente. |
| Vinculación | Coincidencia de correo no basta; carrera por identidad, correo externo, cambio de correo y desvinculación del último método. |
| Recuperación | Token vencido/usado, propósito equivocado, dos usos concurrentes, límites; sesión revocada tras completar; recuperar contraseña no elimina TOTP. |
| Doble factor | Opcional/activación cancelada/confirmada, código inválido/vencido/reusado, desafío local y Google, sesiones previas, recuperación concurrente; Administrador y parámetros con ID ajeno nunca cambian el factor de otro usuario. |
| Sesiones | Fijación, robo simulado de token revocado, inactividad/absoluto, salida, reinicio, varias pestañas y cambio de permisos. |
| Roles | Matriz positiva/negativa completa por acción, campo, ID y archivo; manipular menú/request no evita control. |
| Administración | Último administrador en solicitudes simultáneas, autoescalado, datos/versiones obsoletos, baja e ingreso concurrentes. |
| Operaciones inciertas | Sesión vence antes/después de commit; repetir UUID no duplica stock/folio/pago y no expone documento a perfil revocado. |
| Auditoría | Actor no falsificable, sin secretos, historia anterior conservada; falla transaccional no deja autoría de un hecho inexistente. |
| UI | 320/375/768/1440, teclado/foco/lectores, gestor de contraseñas, botón Google, red lenta y mensajes de recuperación. |
| Producción | HTTPS/proxy/cookies/callbacks, secretos rotables, respaldo/restauración y recuperación del administrador sin puerta pública. |

## 15. Costos, dependencias y exclusiones

No se aprueban licencias, SMS, SaaS de identidad ni productos con facturación automática. No activar pruebas gratuitas que luego cobren como sustituto de la condición del usuario. Alojamiento/dominio/SMTP son dependencias del despliegue y deben distinguirse del costo del método de ingreso.

Recomendación a validar: biblioteca de licencia compatible, sesiones en PostgreSQL existente, credenciales locales y Google directo opcional sujeto a comprobación económica. No seleccionar paquete/proveedor ni crear configuración externa hasta cerrar decisiones.

TOTP opcional personal está incluido por D08. Passkeys, SSO corporativo, permisos personalizados y restricciones por bodega no se incluyen por defecto y ampliarían el alcance. Si una función se difiere, registrar la decisión; no presentarla como protección implementada. Un ingreso con Google no acredita por sí solo que hubo segundo factor ni hace segura una alternativa local más débil.

## 16. Registro de decisiones

D01–D10 y D08-R tienen respuesta del usuario al 20-10-2026. Matriz, alcance, auditoría y recuperación personal aprobados. No se inicia desarrollo por registrar estas decisiones; falta autorización explícita para implementar tras revisar el documento.

| ID | Decisión | Propuesta para revisar | Respuesta/estado |
| --- | --- | --- | --- |
| D01 | Roles y combinación | Seis perfiles de sección 5, varios por persona y unión de permisos sin invalidaciones. | Aprobado el 20-10-2026. Capacidades sensibles/excepciones siguen en D07/D10. |
| D02 | Métodos de ingreso | Correo/contraseña + Google opcional. | Aprobado el 20-10-2026; permanece la condición de no generar gasto adicional. |
| D03 | Entorno/equipos | Por Internet, con equipos personales. | Aprobado el 20-10-2026. Dominio, HTTPS y configuración concreta se verificarán antes del despliegue. |
| D04 | Alta de usuarios | Sólo el Administrador crea/habilita usuarios y asigna roles, sin registro público. | Aprobado el 20-10-2026. |
| D05 | Recuperación/primer acceso | Ambas vías: correo si hay SMTP y asistencia del Administrador. | Modalidades aprobadas el 20-10-2026. Procedimiento de primer acceso/recuperación del último administrador por especificar en S1. |
| D06 | Sesiones | 60 min de inactividad y máximo 8 h; se mantiene la propuesta de varias sesiones y cerrar las demás. | Aprobado el cambio de duración el 20-10-2026. Recordarme no está incluido en la propuesta V1. |
| D07 | Alcance y datos sensibles | Matriz 5.1 para toda la empresa, sin restricciones por bodega; ocultar costos/precios a quienes no los necesitan. Consulta/Gerencia lee todo. | Aprobado el 20-10-2026. |
| D08 | Segundo factor | TOTP opcional para todos; cada titular activa/desactiva desde su sesión/panel personal. También se aplica al ingresar por Google si está activo. | Aprobado el 20-10-2026. Administrador no cambia el factor de otro usuario. |
| D08-R | Recuperación del segundo factor | Códigos personales de respaldo de un uso para reconfigurar la aplicación tras perder el móvil, iguales para todos, incluidos Administradores. Sin desactivación administrativa ni eliminación por recuperar contraseña. | Aprobado el 20-10-2026. |
| D09 | Datos/auditoría | Accesos/cambios de seguridad, autoría nueva, IP y tipo de navegador; consulta sólo Administrador. Eventos de seguridad 12 meses; autoría documental conservada. | Aprobado el 20-10-2026. |
| D10 | Correcciones/anulaciones | Cada rol corrige/anula dentro de su área; Administrador opera en todas. Se conservan reglas e historial, y la exclusividad personal del doble factor (D08). | Aprobado el 20-10-2026. |
| D11 | Longitud de contraseña | Mínimo 8 y máximo 128 caracteres, tanto para provisión como activación, cambio y recuperación. | Aprobado por instrucción explícita del usuario el 20-10-2026. |

## 17. Evidencias y cierre documental de preparación S0 (histórico)

Revisión de código/esquema y fuentes oficiales; sólo documentación creada/actualizada. No se instalaron paquetes, modificaron modelos, migraron datos, crearon credenciales externas ni iniciaron servidores. Contenido, enlaces locales y diff revisados. Las fuentes web se consultaron el 20-10-2026; condiciones del proveedor deben comprobarse de nuevo al implementar.

Las decisiones se incorporarán a este documento para revisión antes de comenzar el desarrollo. Los checks de implementación y validación permanecen abiertos.


### Respuestas iniciales del usuario — 20-10-2026

- Aprueba los seis roles propuestos y que una persona pueda tener varios. Ejemplo aportado: Ventas y Cobranza deben permitir trabajar en todos los módulos de ambos roles, sin invalidarse entre sí.
- Elige correo y contraseña más Google opcional.
- El ERP se utilizará por Internet con equipos personales.

Se consulta a continuación alta administrativa (D04), recuperación (D05) y sesiones (D06). No se inicia implementación ni se da por aprobada la matriz detallada o las decisiones restantes.


### Respuestas sobre administración, recuperación y sesiones — 20-10-2026

- Sólo el Administrador podrá crear/habilitar usuarios y asignar roles; no habrá registro público.
- Recuperación por ambas vías: correo cuando exista SMTP configurado y asistencia del Administrador. No se da por disponible SMTP ni se crean credenciales en esta etapa.
- El usuario elige ampliar la inactividad a 60 minutos y conservar el máximo de 8 horas. Se mantiene la propuesta de sesiones simultáneas con cierre de las demás; los plazos de tokens de recuperación son independientes de estos tiempos.

Se consulta a continuación alcance/visibilidad (D07), segundo factor (D08) y acciones excepcionales (D10). D09 de auditoría/retención también sigue pendiente. Sin implementación ni aprobación global de los puntos restantes.


### Respuestas sobre matriz, doble factor y correcciones — 20-10-2026

- Aprueba la matriz y alcance consultados: toda la empresa sin limitación por bodega, referencias necesarias e importes ocultos cuando no correspondan; Consulta/Gerencia lee todo.
- El doble factor será opcional, gestionado desde el panel propio; sólo el usuario en sesión puede activar/desactivar el suyo, incluso si otro usuario es Administrador.
- Cada rol puede corregir/anular dentro de su área y Administrador opera en todas; se respetan los límites e invariantes existentes y la excepción personal de D08.

Se consultan D09 (auditoría/retención) y D08-R (recuperación personal del factor). No se inicia desarrollo ni se atribuye aprobación a esas propuestas.


### Respuestas finales sobre auditoría y respaldo del factor — 20-10-2026

- Aprueba auditoría de accesos/cambios de seguridad, autoría nueva, IP y tipo de navegador, consultable sólo por Administrador. Eventos de seguridad se retienen 12 meses; la autoría histórica de documentos se conserva.
- Aprueba códigos personales de respaldo para volver a configurar la aplicación si se pierde el móvil, para todos los usuarios, incluidos Administradores. No se habilita desactivación del factor ajeno ni se elimina al recuperar contraseña.

Las decisiones funcionales quedan resueltas. El diseño técnico, migraciones, configuración real de Google/SMTP y todas las implementaciones/pruebas siguen pendientes. Falta la autorización del usuario para iniciar desarrollo; este registro no la sustituye.


## 18. Checkpoint de continuidad — S1 completo (20-10-2026)

### Resultado y archivos vigentes

- [SEGURIDAD-S1-DISENO.md](SEGURIDAD-S1-DISENO.md): contrato técnico, bibliotecas/versiones/licencias, modelos, transición, concurrencia, provisión, recuperación y despliegue.
- [SEGURIDAD-S1-INVENTARIO.md](SEGURIDAD-S1-INVENTARIO.md): 87 Server Actions, 22 páginas del ERP, seis rutas de archivos, servicios y DTO sensibles a proteger en S4.
- `src/lib/seguridad/permisos.ts`: catálogo inicial, unión de roles, denegación por defecto y titularidad personal del factor. Helpers sin conexión a rutas todavía.
- `prisma/schema.prisma` y `20261020201416_estructura_seguridad_s1`: 11 tablas nuevas, CHECK/FK/índices y protección de auditoría/autoría. Campos User/Role heredados conservados por compatibilidad, sin usarlos como credenciales/permisos nuevos.
- `prisma/seed.ts`: deja de crear administrador/contraseña fijos; no ejecutado en la base.
- `package.json`/`pnpm-lock.yaml`: openid-client 6.8.8, jose 6.2.13, @node-rs/argon2 2.2.2 y otplib 13.5.0, licencias MIT.

### Validación realizada

`tests/seguridad-s1.ts` comprueba unión Ventas/Cobranza, falta de permisos ajenos, visibilidad de importes, roles desconocidos, lectura de Gerencia, titularidad y uso real de Argon2id/TOTP/PKCE/JWE. `tests/seguridad-estructura.integration.ts` sólo admite copia local S1 y verifica 23 rechazos SQL esperados, roles múltiples, unicidad, FK, tiempos/contadores/hashes, retención y autoría inmutable. Sus fixtures se retiran mediante rollback. No son pruebas de un login todavía inexistente.

`pnpm lint`, `pnpm build`, Prisma validate/generate correctos; 37 migraciones al día y `migrate diff` sin diferencias. La compilación detectó incompatibilidad del const enum externo de Argon2 con isolatedModules; se adaptó y el build final pasó.

Migración ensayada en `mtx_validacion_seguridad_s1_20261020` y aplicada a `mtx_metal_erp` tras respaldo. Las 69 tablas previas conservan conteos y huellas exactos. Quedó un UserSecurity pendiente de activación, sin hash, sin sesiones ni identidades Google. Ningún usuario fue habilitado automáticamente. Respaldo/evidencias en `backups/20261020_seguridad_s1/` (ignorado por git).

Copia y dump temporal del contenedor retirados. No se iniciaron servidores de aplicación; 3031 libre al cierre. El puerto 3030 estaba ocupado al comprobarlo por un servidor que no se inició para S1 y se conservó. Sin push.

### Siguiente paso concreto: S2

1. Leer este checkpoint, contrato S1 e inventario; revisar git status y conservar el trabajo previo. No repetir la migración ni ejecutar seed para crear un administrador.
2. Implementar validación de configuración de seguridad, secretos/cookies y provisión inicial CLI restringida. Identidad del Administrador se solicita al operador; no inferirla del usuario heredado.
3. Implementar credenciales/activación, sesión completa revocable y desafíos personales TOTP; panel propio y recuperación con códigos. Consumir hashes/códigos de forma atómica y mantener bloqueo del último Administrador utilizable.
4. Crear ingreso y administración de usuarios con los permisos aprobados. Preparar el contexto de servidor que luego S4 conectará a todas las entradas. No declarar protegido el ERP sólo por tener pantalla de login.
5. Google real/configuración sin gasto corresponde a S3; autorización integral a S4, autoría/auditoría operativa a S5 y validación/despliegue/cierre a S6/S7. No hay proyecto OAuth ni SMTP configurados por S1.

El esquema contiene restricciones de estructura; límites de intentos, autorización, protección del factor ajeno, revocación inmediata y control de último Administrador aún requieren servicios. El sistema conserva acceso sin login hasta implementar los bloques correspondientes.


## 19. Checkpoint de continuidad — S2 local completo (20-10-2026)

### Funcionalidad implementada

- `/ingresar`, `/activar` y `/recuperar`: credencial local, invitación/recuperación de un uso y desafío TOTP separado de una sesión ERP. Sin registro público. Google aún no disponible.
- `/mi-acceso`: datos propios, reautenticación por cinco minutos, contraseña, sesiones/revocación y factor personal opcional. Configuración por clave manual en la aplicación; preparación no sustituye el factor vigente hasta confirmar el nuevo código. Códigos de respaldo personales de un uso, iguales para Administradores.
- `/administracion/usuarios`: listado con búsqueda/paginación, Ver/Crear/Editar sobre listado, múltiples roles, estado, invitación/reemisión y recuperación asistida. Autorización/reautenticación en servidor; concurrencia/versionado y último Administrador utilizable protegidos. Correo se conserva; métodos Google se gestionarán en S3.
- `pnpm seguridad:administrador`: provisión CLI interactiva local, contraseña sin eco y sin argumento/credencial fija. `--recuperar` emite enlace sólo para Administrador activo; nunca modifica/desactiva factor o roles. No se ejecutó sobre la base de trabajo.
- `/api/seguridad`: JSON limitado a 16 KiB, origen canónico/CSRF y cuerpos estrictos por operación. Cookies HttpOnly/host-only, Secure y prefijo __Host- cuando el origen es HTTPS. Nuevas pantallas con no-referrer y protección frente a marcos.
- Sesiones: 60 minutos de inactividad y ocho horas absolutas; revisión de seguridad, baja/revocación, claves y enlaces sólo como hash. Estado/cambios de usuarios serializados en PostgreSQL para resolver carreras. No se hacen comprobaciones de roles sólo en botones.
- TOTP/JWE cifrado con keyId y consumo/replay bajo bloqueo. Preparación ligada al titular/versión, secreto temporal de cinco minutos; reconfigurar/regenerar revoca sesiones previas y respaldos antiguos. Reset de contraseña conserva el factor.
- SMTP opcional con TLS verificado; respuesta pública uniforme y asistencia administrativa sin depender de SMTP. Enlaces privados en fragmento `#token=`, no enviados al servidor en GET.
- Menú de usuario muestra la identidad y acceso a panel/usuarios según rol. Se agrega Mi acceso en navegación. El registro SQL/errores crudos de Prisma se desactiva para no filtrar datos de seguridad del pool compartido.

### Validación y límites reales

Pruebas sólo en `mtx_validacion_seguridad_s2_20261020`: `seguridad-acceso.integration.ts` cubre provisión, activación concurrente de un uso, múltiples roles y denegación, factor y replay, códigos/desafíos concurrentes, reconfiguración, recuperación sin bypass, baja/versiones, retiro concurrente de Administradores, rollback inducido tras cambio de hash, expiración y límites. Se verificó además que una cuenta activa sin hash no autentica por la comparación ficticia usada para igualar tiempos (`seguridad-sin-credencial.integration.ts`).

`seguridad-correo.integration.ts` recibe el mensaje en un SMTP TLS local con certificado de prueba confiable: enlace/consumo único, fragmento privado y ausencia de enumeración. No se envió correo real ni se acredita un proveedor final. `seguridad-admin-local.integration.ts` comprueba destinatario administrativo activo y conservación de factor/roles/estado al emitir/consumir enlace local.

`seguridad-acceso.ui.ts`: Chromium, ingreso/salida, HttpOnly/SameSite, origen ajeno rechazado, límite de cuerpo, invitación/activación y denegación por rol, factor/respaldo/desactivación propia, 320/375/768/1440 y ausencia de errores JavaScript. Regresión `seguridad-s1.ts` correcta. Lint, build y TypeScript correctos; no hay cambios de esquema/migración en S2.

[OPERACION-SEGURIDAD.md](OPERACION-SEGURIDAD.md) explica configuración, primer administrador, recuperación sin SMTP, panel/factor, límites, incertidumbre y pruebas. Claves, SMTP, OAuth y titular real no se configuraron automáticamente; no se habilitaron cuentas reales. Toda la escritura de fixtures ocurrió en copias descartables. Evidencias locales ignoradas por git en `backups/20261020_seguridad_s2/`. La copia PostgreSQL, dump temporal, certificados TLS, claves y credenciales de fixture se retiraron. Servidor propio 3031 detenido/libre; servidor existente del usuario en 3030 conservado. Lectura final de la base real: un usuario pendiente, sin hash y cero sesiones. Sin push.

**No confundir alcance:** las nuevas pantallas y operaciones S2 están protegidas; páginas/acciones/archivos previos todavía no exigen sesión ni filtran por rol. S4 debe integrar los controles completos. S2 ya registra eventos de seguridad nuevos, pero no implementa el visor/depuración S5 ni la autoría de documentos de negocio. No hay aprobación funcional general S7.

### Para continuar sin reconstruir contexto

1. Revisar git status y este checkpoint. S1 permanece migrado (37 migraciones); S2 usa el esquema existente. No ejecutar seed ni provisionar credenciales sin identidad/configuración del operador.
2. Siguiente etapa: **S3 Google**. Verificar configuración real sin gasto adicional, proyecto del usuario, origen/callback HTTPS y consentimiento; solicitar los datos no secretos necesarios. Secretos sólo en entorno privado.
3. Implementar OIDC con openid-client, vinculación comprobada y misma sesión/desafío del flujo local. La ruta actual no acepta tokens Google ni activa ese método por el correo coincidente.
4. Si hay factor activo, crear sólo desafío hasta probar TOTP/respaldo; nunca sesión completa directa desde callback Google. Preservar titularidad y revocaciones.
5. Luego S4 debe conectar autorización a todo el inventario: páginas, acciones, servicios, archivos y DTO. No usar S2 como prueba de seguridad completa del ERP.


## 20. Corrección de contraseña y provisión (20-10-2026)

Por solicitud del usuario, la contraseña nueva exige **8 a 128 caracteres**. `src/config/politica-contrasenas.ts` centraliza límites/texto compartidos por validación de servidor, formularios y CLI. Se actualiza documentación y mensaje de validación; no se cambia Argon2id, sesiones ni doble factor.

Se reprodujo la causa del mensaje genérico de provisión en el entorno: faltaban SEGURIDAD_ORIGEN, SEGURIDAD_CLAVES y SEGURIDAD_CLAVE_ACTIVA. El usuario confirmó `http://localhost:3030`; se configuró ese origen y se generaron claves privadas locales, sin mostrarlas ni sobreescribir claves previas. `.env` permanece ignorado por git y con permisos restringidos; respaldo privado en `backups/20261020_seguridad_clave8/`. No se provisionó un administrador real desde la validación.

El CLI valida configuración antes de pedir la contraseña y carga Prisma después de las comprobaciones. Distingue errores de origen/claves, longitud, datos, contraseña repetida, cuenta ya activa y errores comunes de conexión/esquema, sin imprimir excepciones crudas ni valores secretos. Cancelar es una salida controlada.

Verificaciones: prueba de política (8 aceptado, 7/129 rechazados), diagnósticos sin filtraciones y comando real en terminal interactiva sobre `mtx_validacion_clave8_20261020`: administrador creado con ocho caracteres y sin eco. En esa copia se probaron login, activación, cambio y recuperación con ocho; siete se rechaza sin consumir el enlace. Lint/build y TypeScript correctos; sin cambio de esquema. Copia y dump temporal retirados; no se iniciaron servidores propios, 3031 libre y servidor del usuario 3030 conservado. Continuar luego con S3 desde la sección 19.


## 21. Destino de ingreso — Dashboard (20-10-2026)

Por solicitud del usuario, completar el inicio de sesión abre siempre el Dashboard (`/`), tanto con contraseña sola como después del desafío de doble factor. El panel personal no se abre automáticamente; permanece en Mi acceso desde el menú de usuario y la navegación. Se actualizan las expectativas del flujo Chromium existente. La protección del panel y del desafío se conserva; esto no adelanta la autorización integral S4.

Validación realizada antes de la interrupción: `pnpm lint` y `pnpm build` correctos. Chromium comprobó ambos recorridos de ingreso hasta el Dashboard y la disponibilidad del enlace Mi acceso, con respuestas de autenticación simuladas y sin escribir cuentas. Esta comprobación verifica navegación; las pruebas completas de autenticación S2 se documentan en la sección 19.

Cierre del 21-10-2026: se confirmó que los puertos 3030 y 3031 están libres y no queda un servidor de validación activo. Se completa el registro pendiente, sin nuevas escrituras en la base de datos. El usuario confirmó previamente que pudo provisionar e ingresar con su Administrador real.


## 22. S4 — Sesiones y autorización del ERP (21-10-2026)

El usuario autoriza continuar con S4 y pospone S3. Se conserva correo/contraseña y TOTP personal opcional; no hay cliente OAuth, facturación Google ni nuevos métodos de acceso habilitados.

### Implementación

- `src/lib/seguridad/acceso.ts` obtiene la credencial de servidor y comprueba sesión/roles vigentes; nunca toma actor o permisos del formulario. Sin sesión redirige a `/ingresar`; sin permiso, a `/acceso-denegado`.
- Las 24 páginas ERP, 87 Server Actions y 119 entradas asíncronas de servicios/consultas inventariadas comprueban acceso. Las acciones verifican también origen canónico y rechazan solicitudes cross-site. Los auxiliares internos con cliente de transacción y los cálculos puros no son entradas HTTP.
- Las escrituras revalidan sesión/permiso dentro de su transacción. Un cerrojo asesor compartido con el exclusivo de cambios de seguridad coordina commit y revocación; se conservan bloqueos de materiales/saldos, idempotencia y reglas históricas. No hay cambios de esquema ni migraciones.
- La actividad de páginas, acciones y archivos cuenta para los 60 minutos de inactividad; se conservan ocho horas absolutas, rotación/revocación del flujo S2 y reautenticación de seguridad. Las comprobaciones internas de servicio no renuevan artificialmente la sesión.
- Menú, buscador, accesos del Dashboard y controles de escritura siguen la unión de roles. El Dashboard continúa como estructura sin métricas reales. El panel propio se conserva para todo usuario autenticado.
- Los DTO de OCC omiten importes, banco y cuenta para perfiles sin precios; las consultas de OT omiten finanzas/abonos y factura. Productos devuelve precio sugerido nulo a esos perfiles y conserva el valor existente al editar sin permiso de precios, aunque se manipule el formulario. Las referencias mínimas de catálogo/cliente necesarias para producción siguen disponibles.
- Las seis rutas de archivos exigen sesión y permiso; PDFs de cotización exigen precios. Las imágenes/logos se comprueban contra referencias visibles, con excepción de borradores técnicos para quien opera Cotizaciones. Los PDF de OT actuales son operativos y no imprimen importes; los bytes históricos no se alteran. Las respuestas de archivos dejan de usar caché pública y usan `private, no-store`.
- `conCredencialSeguridad` es un adaptador interno para procesos de servidor/pruebas: transporta una credencial real que se valida en DB; no concede roles ni existe como acción HTTP.

### Evidencia y continuidad

`tests/seguridad-s4-cobertura.ts` comprueba el inventario de páginas/acciones/archivos y servicios. `tests/seguridad-s4.integration.ts` y `tests/seguridad-s4.ui.ts` exigen exclusivamente una copia local `mtx_validacion_seguridad_s4_YYYYMMDD`; sus usuarios y sesiones son fixtures privados. No ejecutar en la base de trabajo. Ver la operación y los límites actuales en [OPERACION-SEGURIDAD.md](OPERACION-SEGURIDAD.md).

Siguiente etapa: **S5, auditoría consultable y autoría de nuevas operaciones**. S6 mantiene la regresión integral de negocio y la validación del entorno HTTPS/proxy/respaldo; S7 mantiene la aprobación funcional. No se presenta la validación local de S4 como certificación de producción.


Validación técnica S4 completada: cobertura 24/87/6/119, regresión de permisos/bibliotecas S1, matriz de seis roles y Ventas + Cobranza, DTO operativos sin importes reales, conservación de precio ante formulario manipulado, escritura autorizada, revocación concurrente coordinada con commit, inactividad 60 minutos y máximo ocho horas. Chromium: acceso anónimo/URL directa, navegación de los roles, acciones HTTP directas, origen ajeno rechazado, pestaña vieja tras cambio de permisos, vistas 375/1440 sin errores JS y descargas de los tres PDF históricos con huellas originales. Lint/build correctos. Base de trabajo, cuentas reales y archivos históricos sin escrituras; pruebas sólo en copia S4. La regresión integral de todos los procesos y HTTPS/proxy final siguen en S6.


Limpieza final: copia `mtx_validacion_seguridad_s4_20261021`, dump y fixtures privados retirados. Servidor propio detenido; puertos 3030 y 3031 libres. Evidencias locales de build/lint/integración/Chromium en `backups/20261021_seguridad_s4/`, ignoradas por git. Sin push.


## 23. S5 — Auditoría y autoría (21-10-2026)

Autorizado por el usuario e implementado/validado técnicamente. Checklist de cambios terminados, rutas y siguiente paso en [SEGURIDAD-S5-CONTINUIDAD.md](SEGURIDAD-S5-CONTINUIDAD.md). S3 sigue pospuesto; siguiente hito S6.

- Actor obtenido en la guarda de servidor y fijado por transacción; 61 puntos de registro en servicios. Autoría ligada a los diarios originales, documentos derivados, CRUD/configuración y PDF nuevos. Rollback revierte hecho y autoría; reintentar desde otro usuario autorizado conserva al responsable original. No se atribuyen folios automáticos como edición manual.
- Visor `/administracion/auditoria` exclusivo del Administrador: eventos/autoría separados, filtros por fecha de Santiago, tipo/recurso/acción/resultado y paginación de 25. Accesos en menú, buscador y consulta de Cotización/OCC/OT/Guía; los documentos anteriores sin evidencia muestran «Sin autoría registrada». Nombres actuales más ID estable; no se modifican bytes históricos.
- Metadatos: tipo de navegador clasificado, IP sólo desde proxy confiable; sin UA crudo, contraseñas, tokens, códigos ni cuerpos. Expiración una vez por sesión y denegaciones repetidas limitadas. Se distinguen cambios de roles/estado y uso de respaldo TOTP sin guardar el código.
- Retención: Administrador puede depurar tras reautenticación de cinco minutos; corte de 12 meses calculado por PostgreSQL y protegido por el trigger S1. CLI `pnpm seguridad:depurar-auditoria` simula, `--aplicar` ejecuta y registra Proceso del sistema sin actor ficticio. Autoría permanente intacta. La tarea diaria real y retención de respaldos se configuran en S6.

Validación: cobertura S5 (61 puntos), S4 ampliada (25 páginas/88 acciones/seis archivos/119 entradas de servicios), regresión S1, integración S5 y Chromium correctos. La integración cubre actor no falsificable, rollback inducido, reintento de otro actor, cuatro modos productivos, devolución, stock/Kardex/reservas, tres PDF nuevos, historia anterior, retención/CLI/reautenticación, expiración única y ausencia de secretos. Chromium verifica visor/menú/filtros/enlaces, acceso anónimo y por rol, acción directa denegada, confirmación de depuración y 375/1440 sin errores JS. Lint/build/tipos correctos. Sin migraciones, seed ni escrituras en la base/cuentas de trabajo.


Limpieza S5 completada: copia descartable, dump, secretos/fixtures y PDF de prueba retirados. Servidor propio detenido y puertos 3030/3031 libres. Evidencias privadas ignoradas en `backups/20261021_seguridad_s5/`. Checkpoint S5 terminado; continuar con S6, conservando S3 pospuesto y S7 pendiente. Sin push.


## 24. S6 — Cierre técnico local, 22-10-2026

El usuario confirmó que no existe servidor/dominio y autorizó validar localmente dejando el despliegue preparado. S6 queda completado en ese alcance. Continuidad breve y evidencia exacta en [SEGURIDAD-S6-CONTINUIDAD.md](SEGURIDAD-S6-CONTINUIDAD.md).

El ejecutor `pnpm seguridad:validar-s6` pasó 48/48 escenarios con credenciales reales y copias independientes: autenticación/recuperación/TOTP/sesiones, roles, auditoría/autoría, mantenedores, inventario, Compras, Cotizaciones/OCC/OT/producción, guías/correcciones y tres PDF. Se corrigieron precondiciones de fixtures antiguos; el legado se prepara antes de OT y luego se reproducen las migraciones SQL versionadas, sin deshabilitar triggers. Chromium comprueba permisos/auditoría y HTTPS local, cookies, origen, límites, caché, reinicio y cuatro anchos. La repetición final verifica también `HTTPS` en mayúsculas y el prefijo `__Host-`.

Nuevo comando de restauración: revocación atómica de sesiones/enlaces/desafíos y revisión de seguridad, con simulación predeterminada y evento de sistema; preserva factores/códigos/roles/contraseñas/autoría. Se probó contra una copia efectivamente respaldada/restaurada, incluyendo claves y rollback inducido. El procedimiento exige mantenimiento y conciliación de cambios posteriores al respaldo, con códigos personales gestionados sólo por sus titulares.

Dependencias corregidas, cabeceras generales con PDF del mismo origen y DENY en seguridad/administración; lint/build/tipos/Prisma correctos. Auditoría de producción sin avisos; uno sin parche informado en `braces` de desarrollo permanece documentado. 37 migraciones existentes al día, ninguna nueva por S6. Base/cuentas/entorno/archivos de trabajo intactos; copias, fixtures y servidores retirados. Evidencias privadas ignoradas en `backups/20261022_seguridad_s6/`.

Plantillas e instalación futura en [deploy/seguridad](../deploy/seguridad/README.md). No se instaló un timer ni un servidor público; faltan esas verificaciones cuando exista destino. S3 continúa pospuesto. Siguiente etapa: S7, aprobación funcional expresa del usuario.


## 25. S7 — Primera revisión funcional, 23-10-2026

- [x] Registrar la aprobación expresa del usuario para **S7-01, S7-02 y S7-05** en la guía.
- [x] S7-02: tras guardar la contraseña de activación, volver al login automáticamente. La recuperación también vuelve al login; no se inicia sesión ni se omite el factor.
- [x] S7-03: incorporar avisos emergentes de éxito/error en ingreso, recuperación y panel personal, conservando el mensaje persistente. Usuarios también muestra avisos de resultado.
- [x] S7-06: confirmación de identidad en diálogo dentro de Usuarios; contraseña del Administrador en sesión y su factor personal si está habilitado. Se conservan formulario y confirmación pendientes al cancelar o fallar. Validar identidad no confirma automáticamente el cambio.
- [x] Mantener la ventana de cinco minutos para reutilizar la confirmación entre operaciones; al vencer se solicita nuevamente, sin navegar a Mi acceso. El servidor responde con `reauthRequired` sólo cuando falta confirmación reciente, manteniendo auditoría y validaciones.
- [x] Nueva revisión de S7-02/S7-03/S7-06 aprobada expresamente por el usuario el 24-10-2026.
- [ ] Resto de bloques y cierre expreso S7 según [la guía](GUIA-PRUEBAS-SEGURIDAD-S7.md). Google y despliegue real conservan su condición de diferidos.

Continuar desde esta sección y la tabla de la guía; no repetir el análisis completo de S1–S6. Sin migraciones ni nuevas reglas de permisos.

Validación técnica de estas correcciones: `pnpm lint`, `pnpm build`, `pnpm exec tsc --noEmit` y `pnpm seguridad:validar-s6 seguridad-acceso` correctos. Este último ejecuta regresiones de acceso/recuperación/correo TLS local y Chromium con activación/reset al login, avisos visibles, identidad vencida sin escritura, formulario conservado al cancelar, contraseña incorrecta, confirmación explícita posterior, reutilización y factor personal en el diálogo. No hubo errores JavaScript. Evidencia privada: `backups/20261023_seguridad_s6/1792804026138/`. Base y archivos de origen sin cambios; copia/fixtures/servidor 3031 retirados, servidor previo del usuario en 3030 conservado. No se repitió toda la regresión S6 de 48 escenarios ni se sustituye la aprobación funcional pendiente.


### 24-10-2026 — Continuidad S7-07

- [x] Usuario confirma sesiones simultáneas y cierre remoto de la otra sesión; S7-07 aprobado en la guía. La observación anterior dejó de reproducirse; no se atribuye una causa no demostrada.
- [x] Botón visible para cerrar sesión actual en la barra superior, con nombre accesible en móvil, protección durante envío y aviso si falla. Reutiliza el servicio existente y descarta estado local al volver al login.
- [x] Usuario aprueba nuevamente S7-07 el 24-10-2026 tras incorporar el botón visible. S7 general no está cerrado.

Validación del ajuste: `pnpm lint`, `pnpm build` y revisión del diff correctos. No se iniciaron servidores ni se modificó la base de datos; revisión visual/funcional del botón por el usuario pendiente.


### 24-10-2026 — Aprobaciones funcionales actualizadas

El usuario aprueba expresamente **S7-09, S7-02, S7-03, S7-06 y S7-07**. Quedan aprobados en total **S7-01, S7-02, S7-03, S7-05, S7-06, S7-07 y S7-09**. Las observaciones de avisos, retorno al login, confirmación administrativa y cierre visible quedan resueltas funcionalmente.

Pendientes de confirmación o decisión expresa: **S7-04** (SMTP, condicional), **S7-08** (factor y respaldos), **S7-10** (usabilidad), **S7-11** (pruebas condicionadas/prolongadas) y **S7-12** (cierre). No se infiere una aprobación global ni se cambia Google/despliegue diferidos. Fuente vigente: tabla de la guía S7.
