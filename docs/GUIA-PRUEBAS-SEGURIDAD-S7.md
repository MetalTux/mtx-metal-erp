# S7 — Guía de pruebas funcionales de acceso y seguridad

Preparada el **23-10-2026**. Responsable de la revisión: ____________________. Fecha de ejecución: ____________________.

**Estado: revisión parcial del usuario actualizada el 24-10-2026; cierre S7 pendiente.** El usuario autoriza avanzar con Cobranzas manteniendo pendientes S7-04/08/10/11/12; no se marcan como aprobados ni No aplica por esa decisión. S6 ya pasó sus comprobaciones técnicas locales. Este recorrido permite confirmar que las funciones se entienden y sirven para trabajar; no sustituye tu aprobación por los resultados automáticos.

## 1. Cómo registrar el avance

Realiza los bloques en orden. Marca cada casilla sólo después de comprobar su resultado. Al terminar un bloque, cambia su estado en esta tabla: **Pendiente**, **En prueba**, **Aprobado**, **Con observaciones** o **No aplica**, indicando el motivo de este último. Un bloque con pasos pendientes no queda aprobado automáticamente.

| Bloque | Qué comprobarás | Estado | Observación o incidencia |
| --- | --- | --- | --- |
| S7-01 | Ingreso, Dashboard, panel y salida | Aprobado | Aprobado por el usuario el 23-10-2026. |
| S7-02 | Alta y activación de usuarios | Aprobado | 24-10-2026: aprobación confirmada, incluido el retorno al login tras activar. |
| S7-03 | Contraseña y recuperación asistida | Aprobado | 24-10-2026: aprobado tras incorporar avisos emergentes de resultado. |
| S7-04 | Recuperación por correo, si existe SMTP | Pendiente | |
| S7-05 | Permisos de los seis roles | Aprobado | Aprobado por el usuario el 23-10-2026. |
| S7-06 | Suma de roles, cambios y baja | Aprobado | 24-10-2026: aprobado tras incorporar la confirmación de identidad en diálogo dentro de Usuarios. |
| S7-07 | Varias sesiones y cierre remoto | Aprobado | 24-10-2026: aprobación confirmada tras incorporar el botón visible de cierre de sesión; sesiones simultáneas y cierre remoto aprobados. |
| S7-08 | Doble factor y respaldo personal | Pendiente | |
| S7-09 | Auditoría y autoría | Aprobado | 24-10-2026: auditoría y autoría aprobadas por el usuario. |
| S7-10 | Claridad y facilidad de uso | Pendiente | |
| S7-11 | Comprobaciones prolongadas o condicionadas | Pendiente | |
| S7-12 | Cierre y aprobación expresa | Pendiente | |

Puedes responder, por ejemplo: «S7-01 aprobado. S7-02 con observaciones: no encontré dónde volver a emitir la invitación». No necesitas completar todo en una sola sesión.

## 2. Preparación

- [ ] Confirmar que el ERP está disponible en **http://localhost:3030**. Usar esa dirección en todo el recorrido; no alternarla con `127.0.0.1`, túneles ni otro puerto.
- [ ] Tener una cuenta Administrador propia que ya permita ingresar. No volver a ejecutar el comando de primer Administrador si esa cuenta existe.
- [ ] Mantener al Administrador en el navegador habitual. Usar otro navegador o perfil independiente para los usuarios de prueba. Dos ventanas privadas del mismo navegador pueden compartir sesión: no sirven necesariamente como dos usuarios distintos.
- [ ] Identificar el entorno: ____________________. Si contiene datos reales, limitar los cambios a las cuentas de prueba y los pasos expresamente elegidos. Las pruebas de guardar documentos, fabricar, despachar, corregir o mover stock se realizan sólo en una copia de prueba preparada para ello.
- [ ] Para doble factor, disponer de una aplicación autenticadora que ya utilices y de un lugar privado para guardar respaldos fuera del móvil. No es necesario contratar un servicio ni configurar Google.

No cambiar la hora del equipo, ejecutar SQL, restaurar bases ni lanzar comandos de depuración para completar esta guía. Esas pruebas técnicas ya corresponden a S6. Si el ERP no está iniciado o falta una copia para probar operaciones, informar ese bloqueo antes de continuar con los pasos que dependan de ella.

### Cuentas que utilizarás

Puedes crearlas mediante S7-02. Usa nombres identificables y correos distintos, sin reutilizar cuentas de trabajadores para cambiarles permisos. Los correos no necesitan recibir mensajes para activar mediante enlace entregado manualmente; sí necesitan un buzón real para S7-04.

| Nombre sugerido | Roles | Correo elegido — sin contraseña |
| --- | --- | --- |
| S7 Ventas | Ventas | |
| S7 Bodega | Compras y Bodega | |
| S7 Taller | Producción y Despacho | |
| S7 Cobranza | Cobranza | |
| S7 Consulta | Consulta/Gerencia | |
| S7 Mixto | Ventas + Cobranza | |

El Administrador existente permite revisar el sexto rol. Realiza las pruebas de cambio de contraseña, baja y doble factor primero con cuentas de prueba. Conserva tu acceso administrativo habitual.

## 3. S7-01 — Ingreso, Dashboard, panel y salida

1. En el segundo navegador, sin sesión, abrir `http://localhost:3030/ventas/cotizaciones`.
   - [ ] Solicita iniciar sesión; no muestra documentos protegidos.
2. En **Iniciar sesión**, escribir un correo autorizado y una contraseña incorrecta una vez.
   - [ ] Rechaza el ingreso con un mensaje comprensible, sin abrir el ERP. No repetir errores muchas veces: existen límites de intentos.
3. Ingresar con las credenciales correctas. Si el titular ya tiene doble factor, completarlo.
   - [ ] Abre el **Dashboard**, también después de cerrar sesión e ingresar nuevamente; el panel personal no es una pantalla obligatoria de primer ingreso.
4. Abrir **Mi acceso** desde la navegación o el menú de usuario. Ruta alternativa: `/mi-acceso`.
   - [ ] Muestra nombre, correo y roles de la persona que ingresó.
   - [ ] Se encuentran contraseña, doble factor y sesiones personales.
5. Pulsar **Cerrar sesión** en la barra superior (icono de salida en pantallas pequeñas; también disponible en Mi acceso) y volver a intentar abrir una sección protegida, incluso usando Atrás y después recargando.
   - [ ] Debe volver a autenticarse para consultar u operar. Una imagen ya descargada o una página antigua en memoria no implica una sesión válida.

## 4. S7-02 — Crear y activar una cuenta

Repetir para las cuentas de la tabla de preparación.

1. Como Administrador, abrir **Usuarios y acceso** y pulsar **Confirmar identidad**, o continuar con el cambio: si hace falta, se abrirá el mismo diálogo automáticamente. Escribir la contraseña del Administrador en sesión y, si tiene doble factor, un código nuevo o respaldo personal.
   - [ ] Confirma la identidad sin salir de Usuarios. Esta autorización dura cinco minutos; dentro de ese plazo no se pide para cada cambio. Después de validarla, confirmar expresamente el cambio pendiente.
2. Abrir **Administración → Usuarios y roles** o **Mi acceso → Administrar usuarios**. El título de pantalla es **Usuarios y acceso**.
3. Pulsar **Crear usuario**, completar nombre/correo, seleccionar los roles y pulsar **Revisar cambio → Confirmar cambio**.
   - [ ] Muestra un enlace privado y la cuenta queda pendiente de activación.
4. Copiar el enlace sólo al navegador/perfil donde actuará ese titular. No enviarlo como evidencia ni guardarlo en este documento. Cerrar el diálogo con **Ya guardé el enlace**.
5. Abrir el enlace, intentar una contraseña de siete caracteres y luego elegir una propia de al menos ocho, repitiéndola correctamente. Pulsar **Guardar contraseña**.
   - [ ] Siete caracteres se rechazan; de 8 a 128 se permite. No se exige una combinación particular de símbolos o mayúsculas.
   - [ ] La activación vuelve automáticamente al inicio de sesión y muestra el aviso «Cuenta activada». No inicia sesión automáticamente.
6. Ingresar y comprobar los roles en **Mi acceso**. Como Administrador, pulsar **Actualizar** en la lista de usuarios.
   - [ ] La cuenta aparece activa y conserva los roles seleccionados.
7. Volver a abrir el mismo enlace de activación ya utilizado e intentar enviarlo nuevamente.
   - [ ] No permite activar ni cambiar contraseña otra vez con ese enlace.

Si se cerró o perdió el enlace antes de utilizarlo: confirmar identidad como Administrador, localizar la cuenta pendiente y usar **Reemitir invitación → Confirmar cambio**. Entregar sólo el enlace nuevo; el anterior deja de servir. No crear un duplicado para solucionar este caso.

## 5. S7-03 — Contraseña y recuperación asistida

Usar S7 Ventas u otra cuenta de prueba sin doble factor por ahora.

1. Ingresar con esa cuenta, abrir **Mi acceso** y confirmar identidad.
2. En **Cambiar contraseña**, intentar siete caracteres y después guardar una contraseña propia válida.
   - [ ] La longitud insuficiente se rechaza y la contraseña válida se guarda.
   - [ ] Los resultados de las operaciones muestran un aviso emergente (toast), además del texto persistente; los errores son visibles.
3. Cerrar sesión. Probar una vez la contraseña anterior y luego la nueva.
   - [ ] La anterior falla y la nueva permite entrar.
4. Como Administrador, confirmar identidad, abrir **Usuarios y acceso**, localizar esa cuenta y pulsar **Recuperar acceso → Confirmar cambio**.
5. Entregar el enlace al titular en su navegador. Elegir una nueva contraseña: vuelve automáticamente al inicio de sesión, con un aviso visible de éxito.
   - [ ] La nueva permite ingresar; las sesiones anteriores dejan de ser válidas al completar el restablecimiento.
   - [ ] Reutilizar el enlace ya consumido no permite otro restablecimiento.

Si ya se habilitó doble factor, recuperar la contraseña debe seguir exigiéndolo al ingresar. Se comprueba expresamente en S7-08.

## 6. S7-04 — Recuperación por correo, condicional

Si no hay SMTP configurado, registrar **No aplica: SMTP no configurado; recuperación asistida revisada en S7-03**. No configurar credenciales de correo para completar este bloque.

1. Con una cuenta de prueba activa cuyo buzón controles, salir y escribir su correo en **Iniciar sesión**.
2. Pulsar **Olvidé mi contraseña**.
   - [ ] La respuesta no revela si una cuenta existe. Si está configurado el correo y la cuenta es elegible, el titular recibe el enlace.
3. Abrirlo, restablecer contraseña e ingresar.
   - [ ] Funciona una vez; repetir el enlace ya utilizado se rechaza.
4. Si no llega, revisar spam y registrar la incidencia; usar asistencia administrativa para continuar. No solicitar envíos repetidamente ni incluir el enlace en capturas o mensajes de soporte.

## 7. S7-05 — Permisos de los seis roles

Ingresar con cada cuenta en un perfil independiente, revisar el menú y el buscador **Ctrl+K**, y comprobar un permiso permitido y uno denegado de esta tabla. Para probar una denegación, escribir directamente la ruta indicada: ocultar el menú no basta.

| Rol | Comprobación permitida | Comprobación denegada |
| --- | --- | --- |
| Administrador | Usuarios y roles, auditoría y módulos de negocio | No debe poder administrar el doble factor ni obtener códigos personales de otra persona |
| Ventas | Clientes, cotizaciones y OCC; consultar importes de venta | Abrir `/compras` y `/administracion/usuarios` |
| Compras y Bodega | Proveedores, catálogos, compras, stock, ajustes y traslados; costos de compras | Abrir `/ventas/cotizaciones` y `/administracion/auditoria`; no mostrar precios sugeridos de venta en el catálogo |
| Producción y Despacho | OT, producción y guías; cantidades, recetas y referencias | Abrir `/compras` y `/administracion/usuarios`; referencias de OCC sin importes estructurados de venta ni datos bancarios |
| Cobranza | Consultar antecedentes comerciales y acceder a Cobranza; referencia de factura externa en OT cuando el documento lo permita | Abrir `/inventario/ajustes` y `/administracion/usuarios` |
| Consulta/Gerencia | Consultar módulos de negocio, importes y costos | Crear/editar/anular; abrir `/administracion/usuarios` y `/administracion/auditoria` |

Las referencias de otras áreas pueden ser visibles sin conceder permiso para modificarlas. **Cobranza operativa todavía tiene desarrollo pendiente**: su permiso no significa que ya exista el registro de abonos. No marcar como fallo de seguridad la ausencia de una función de negocio que aún no se implementó.

Para cada rol:

- [ ] La navegación y las consultas coinciden con lo esperado.
- [ ] La URL de un área ajena rechaza el acceso y no muestra sus datos.
- [ ] No hay acciones de escritura disponibles para Consulta/Gerencia.
- [ ] Los campos monetarios estructurados se muestran sólo donde corresponde. La ocultación no interpreta importes escritos dentro de textos libres.
- [ ] Los mensajes de denegación explican cómo volver a una sección disponible.

### Una tarea de trabajo permitida

En una **copia de prueba**, elegir una tarea existente por perfil operativo: guardar una cotización como Ventas, registrar una compra como Bodega o una operación productiva/despacho como Taller. Usar documentos y cantidades de prueba válidos, conservando sus referencias.

- [ ] Puede completar la tarea de su área y el documento queda registrado una sola vez.
- [ ] Puede consultar/corregir dentro de su área cuando las reglas del documento lo permiten. Una restricción por stock, estado o dependencias puede ser correcta aunque tenga el rol adecuado.

Si no hay copia preparada, dejar esta parte **Pendiente** e informarlo. En datos reales puede abrirse un formulario y cancelarse, pero eso no acredita que el guardado funcione.

### Archivos protegidos

1. Abrir, con un perfil autorizado, un PDF histórico disponible y copiar su dirección de descarga.
2. Intentar esa dirección desde un navegador sin sesión.
3. Si el PDF contiene información comercial, intentar también desde un rol que no pueda consultar esa familia de documento.
   - [ ] El autorizado obtiene el archivo; sin sesión o sin el permiso correspondiente se rechaza. No todos los PDF tienen los mismos permisos: una guía operativa puede corresponder a Taller.

Un PDF ya descargado seguirá en el equipo; cerrar sesión no borra archivos locales.

## 8. S7-06 — Roles combinados, cambio y baja

1. Ingresar como **S7 Mixto**, con Ventas + Cobranza.
   - [ ] **Mi acceso** muestra ambos roles y reúne sus accesos; uno no invalida al otro.
   - [ ] Puede abrir Cotizaciones y Cobranza, pero no Compras ni Usuarios.
2. Mantener abierta esa sesión. Desde el Administrador, confirmar identidad y editar S7 Mixto: dejar únicamente **Cobranza**, manteniendo el estado activo. Confirmar.
3. En la pestaña antigua, intentar una consulta o recargar la página; después volver a ingresar.
   - [ ] La sesión anterior no permite seguir operando.
   - [ ] Al ingresar otra vez se aplican los roles nuevos: conserva las consultas comerciales de Cobranza, pero no la creación/edición comercial propia de Ventas. No confundir leer cotizaciones con poder modificarlas.
4. Como Administrador, editar esa cuenta y cambiar **Estado → Inactivo**. Confirmar.
   - [ ] La sesión abierta pierde acceso y un ingreso nuevo se rechaza.
5. Volver a **Activo**, confirmar y entrar de nuevo. Restituir Ventas + Cobranza si se seguirá probando.
   - [ ] La reactivación permite un ingreso nuevo; no resucita la sesión antigua.

6. Para revisar la corrección de usabilidad, dejar transcurrir más de cinco minutos desde la última confirmación y preparar un cambio de una cuenta de prueba.
   - [ ] Al confirmar se abre un diálogo de identidad en la misma pantalla; no navega a Mi acceso ni pierde los datos.
   - [ ] Cancelar conserva el cambio pendiente. Una contraseña incorrecta muestra un error y no guarda.
   - [ ] Una contraseña correcta (más código personal si tiene factor) permite regresar a la confirmación del cambio. Todavía hay que pulsar **Confirmar cambio**.
   - [ ] Otro cambio dentro de los cinco minutos no vuelve a pedir identidad; una vez vencidos, la solicita de nuevo.

No probar la baja o retiro de rol del único Administrador sobre tu instalación de trabajo. La protección del último Administrador y sus carreras ya se validaron técnicamente; su ensayo manual queda condicionado a una copia en S7-11.

## 9. S7-07 — Varias sesiones

1. Ingresar con la misma cuenta de prueba en dos navegadores o perfiles independientes, A y B.
2. En A abrir **Mi acceso → Mis sesiones**.
   - [ ] Identifica **Esta sesión** y **Otra sesión**.
3. En A pulsar **Cerrar las demás sesiones**. En B intentar consultar una sección protegida.
   - [ ] B debe autenticarse nuevamente; A conserva acceso.
4. Volver a ingresar en B. En A, cerrar únicamente esa sesión mediante **Cerrar esta sesión** en su fila.
   - [ ] Se revoca la sesión elegida y la actual sigue funcionando.

Dos pestañas de un mismo perfil comparten la cookie: cerrar sesión en una afecta a la otra al siguiente acceso al servidor.

## 10. S7-08 — Doble factor personal

Usar primero una cuenta de prueba. No eliminar la cuenta del autenticador hasta que el ERP confirme la deshabilitación o que el reemplazo ya funcione.

### A. Preparar y cancelar

1. En **Mi acceso**, confirmar identidad. Pulsar **Configurar doble factor** y después **Cancelar configuración**.
   - [ ] El estado sigue **Deshabilitado**. Mostrar una clave de preparación no activa el factor.

### B. Habilitar e ingresar

1. Confirmar identidad otra vez si pasaron cinco minutos. Pulsar **Configurar doble factor**.
2. En el autenticador, agregar cuenta mediante **clave manual/de configuración**, con el correo mostrado y tipo **basado en tiempo**. Esta entrega no muestra un QR.
3. Introducir el código de seis dígitos en **Código del nuevo autenticador → Confirmar doble factor**.
4. Guardar los diez códigos de respaldo fuera del móvil, en un lugar privado, y pulsar **Ya guardé mis códigos**.
   - [ ] El ERP muestra **Habilitado** y no vuelve a mostrar el lote guardado.
5. Cerrar sesión e ingresar con correo/contraseña. Antes de completar el segundo paso, intentar abrir una sección protegida en otra pestaña.
   - [ ] La contraseña sola no abre el ERP; exige **Código de aplicación o respaldo**.
6. Si al probar otra pestaña se perdió la pantalla del desafío, repetir el ingreso. Usar un código nuevo del autenticador y pulsar **Verificar código**.
   - [ ] Abre el Dashboard después de validar el segundo factor.

Los códigos TOTP ya utilizados no se aceptan otra vez. Para otra acción sensible esperar el código siguiente; no insistir con el mismo. Si falla uno nuevo, revisar la hora automática del móvil sin modificar el reloj para simular pruebas.

### C. Recuperar acceso sin el móvil

1. Cerrar sesión. Conservar el móvil y simular la pérdida sin borrar el autenticador.
2. Ingresar con correo/contraseña y utilizar un código de respaldo aún no usado.
   - [ ] Permite entrar. El respaldo sustituye al segundo factor, no a la contraseña.
3. Salir, repetir el ingreso e intentar ese mismo respaldo una sola vez; después completar con otro código válido.
   - [ ] El respaldo consumido se rechaza y otro válido permite continuar.
4. En el panel, confirmar identidad con la contraseña y un código TOTP nuevo o respaldo sin consumir. Pulsar **Generar nuevos códigos → Confirmar cambio** y guardar el lote nuevo.
   - [ ] Un respaldo del lote anterior que todavía no se había usado ya no permite ingresar; uno del lote nuevo sí.

### D. Recuperar contraseña conserva el factor

1. Como Administrador, emitir **Recuperar acceso** para esta cuenta de prueba.
2. Como titular, restablecer contraseña mediante el enlace y volver a ingresar.
   - [ ] Sigue exigiendo el autenticador o un respaldo del lote vigente. El Administrador no desactiva el factor al recuperar la contraseña.

### E. Reemplazar o deshabilitar por el propio titular

1. En **Mi acceso**, confirmar identidad y pulsar **Configurar otro autenticador**. Completarlo mediante una segunda entrada de prueba en el autenticador y guardar los nuevos respaldos.
   - [ ] El reemplazo sólo se confirma al validar el código del nuevo autenticador. Cancelarlo antes no cambia el anterior.
2. Salir e ingresar usando la nueva entrada. Mantener la anterior hasta comprobarlo; después identificar claramente cuál es la vigente.
3. Confirmar identidad con la contraseña actual y un código nuevo de la entrada vigente. Pulsar **Deshabilitar doble factor → Confirmar cambio**.
   - [ ] Cambia a **Deshabilitado** y el siguiente ingreso local requiere sólo correo/contraseña.
4. Como Administrador, abrir **Ver/Editar** de esa cuenta.
   - [ ] No hay controles para ver su clave, leer sus respaldos o habilitar/deshabilitar el factor ajeno.

Las mismas reglas personales se aplican a Administradores. La prueba manual con una cuenta administrativa se registra en S7-11 si todavía no se ha realizado. Perder autenticador y todos los respaldos no tiene un desbloqueo administrativo aprobado.

## 11. S7-09 — Auditoría y autoría

1. Como Administrador abrir **Administración → Auditoría y autoría**.
2. En **Eventos de seguridad**, localizar un ingreso, cambio de roles o baja de las cuentas S7. Probar filtros y volver al listado.
   - [ ] Se identifican resultado, fecha y personas involucradas, sin contraseñas, enlaces ni códigos.
   - [ ] La IP puede mostrarse **No disponible** en este entorno local sin proxy confiable; no es un fallo por sí mismo.
3. En **Autoría documental**, buscar una operación nueva de la copia de prueba de S7-05.
   - [ ] Identifica a la persona que la realizó. Los documentos antiguos sin evidencia mantienen **Sin autoría registrada**.
4. Con una cuenta distinta de Administrador, intentar `/administracion/auditoria`.
   - [ ] Se rechaza, incluso con Consulta/Gerencia.
5. Si se revisa **Depurar eventos antiguos**, abrir el diálogo y pulsar **Cancelar**.
   - [ ] Se entiende qué se eliminaría y que la autoría se conserva. No confirmar eliminaciones sobre la base de trabajo para completar esta guía.

Si no se registró una operación nueva en una copia, la comprobación de autoría correspondiente permanece pendiente; consultar un documento antiguo no la reemplaza.

## 12. S7-10 — Facilidad de uso

- [ ] Probar ingreso y Mi acceso en escritorio y con la ventana estrecha; si se usa modo de dispositivo, revisar anchos 320, 375, 768 y 1440. El móvil real requiere que el entorno sea accesible y esté configurado para esa dirección: `localhost` del móvil no es el ERP de tu computador.
- [ ] Recorrer un formulario con Tab y Mayús+Tab: foco visible, etiquetas comprensibles y botones alcanzables.
- [ ] Probar **Mostrar/Ocultar contraseña**, pegado y el gestor de contraseñas habitual si se utiliza.
- [ ] Encontrar Mi acceso, Usuarios, recuperación y Auditoría sin necesitar recordar una URL.
- [ ] Registrar cualquier mensaje confuso o función difícil de descubrir, aunque técnicamente funcione.

## 13. S7-11 — Pruebas prolongadas o condicionadas

No marcar estas comprobaciones como realizadas sólo porque pasaron en S6. Se pueden revisar posteriormente o aceptar expresamente su evidencia técnica al cerrar S7, dejando constancia.

| Comprobación | Cómo realizarla cuando corresponda | Estado / decisión del revisor |
| --- | --- | --- |
| Inactividad de 60 minutos | Cuenta de prueba en un perfil aislado; no interactuar con el ERP desde ese perfil durante más de 60 minutos. La siguiente consulta exige nuevo ingreso | Pendiente |
| Máximo ocho horas | Mantener una sesión de prueba con actividad legítima antes de los cortes de inactividad; al superar ocho horas desde el ingreso, debe autenticarse otra vez. No cambiar relojes | Pendiente |
| Invitación/enlace vencido | Conservar privadamente un enlace sin usar durante más de 30 minutos; enviarlo después debe rechazarse | Pendiente |
| Último Administrador | Sólo en copia preparada: intentar retirar/desactivar al último Administrador utilizable. Debe rechazarse y conservar acceso | Pendiente |
| Factor de un Administrador | Repetir S7-08 con una cuenta Administrador de prueba en copia, conservando un acceso de respaldo y sus códigos personales | Pendiente |
| Red lenta/mensajes | Si se dispone de un entorno controlado, verificar que se comprende el estado y no se repiten operaciones a ciegas | Pendiente |
| Correo SMTP real | S7-04 sólo si ya está configurado y se controla el buzón de prueba | Pendiente / No aplica con motivo |
| Google | S3 pospuesto por el usuario; no esperar botón ni configurar una cuenta para esta revisión | No aplica: diferido |
| Servidor HTTPS, proxy y timer reales | Despliegue preparado, todavía sin destino definitivo. Su verificación se hará al existir servidor | Diferido |
| Equipo compartido | Uso aprobado con equipos personales. Sólo agregar este ensayo si cambia esa condición | No aplica al alcance actual |

## 14. Registrar una incidencia

Copiar este formato para cada problema. No incluir contraseñas, códigos, claves del autenticador, enlaces privados ni capturas donde aparezcan.

| Dato | Registro |
| --- | --- |
| Identificador | S7-INC-___ |
| Bloque y paso | |
| Fecha, navegador y entorno | |
| Rol o combinación de roles | |
| Qué intenté hacer | |
| Qué esperaba | |
| Qué ocurrió / mensaje visible | |
| Documento de prueba, si corresponde | Tipo e identificador; sin datos personales innecesarios |
| Captura sin secretos, opcional | |
| Estado y repetición tras corrección | Pendiente / Corregido por revisar / Aprobado por el usuario |

## 15. S7-12 — Finalizar la revisión

- [ ] Completar la tabla de estados; identificar los pasos pendientes, los No aplica y sus motivos.
- [ ] Informar las incidencias y volver a probar las corregidas antes de marcarlas aprobadas.
- [ ] Dejar inactivas las cuentas S7 que ya no se utilizarán, conservando sus historiales. No borrarlas por SQL. Cerrar sus sesiones y los perfiles de prueba.
- [ ] Conservar sólo los códigos del autenticador/lote vigente que deban seguir utilizándose. Destruir de forma privada los respaldos de prueba invalidados.
- [ ] Registrar las limitaciones aceptadas: Google diferido, despliegue real pendiente y cualquier comprobación condicionada aceptada con evidencia S6.
- [ ] Expresar la aprobación o los pendientes concretos. Codex registra el resultado que informes; no aprueba en tu nombre.

**Resultado del revisor:** Pendiente / Aprobado / Aprobado con limitaciones explícitas / Requiere correcciones.

**Bloques o incidencias pendientes:** ________________________________________________

**Limitaciones aceptadas y comprobaciones apoyadas en evidencia S6:** __________________

**Nombre y fecha:** _______________________________________________________________

Respuesta sugerida: «Apruebo S7 para el acceso local, con estas limitaciones: ____. Quedan pendientes: ____». Una aprobación funcional local no autoriza ni acredita instalar un servidor público.

Referencias: [Hito de acceso y seguridad](HITO-INICIO-SESION-SEGURIDAD.md), [operación](OPERACION-SEGURIDAD.md) y [cierre técnico S6](SEGURIDAD-S6-CONTINUIDAD.md).
