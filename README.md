# MTX Metal ERP

ERP para una empresa de fabricación de estructuras metálicas: inventario y compras, cotizaciones/OCC, producción y obra propia, entregas y cobranza. Next.js 16, React 19, TypeScript y Prisma 7 con PostgreSQL 15.

## Para usuarios

Comenzar por el [manual de usuario](docs/MANUAL-USUARIO.md), también disponible en [PDF para revisión](docs/MANUAL-USUARIO.pdf): índice por tarea, perfiles, configuración, operaciones y resolución de bloqueos.

Guías de referencia:

- [Seguridad y sesiones](docs/OPERACION-SEGURIDAD.md).
- [Órdenes de Trabajo](docs/OPERACION-ORDENES-TRABAJO.md).
- [Guías de Despacho](docs/OPERACION-GUIAS-DESPACHO.md).
- [Cobranzas](docs/OPERACION-COBRANZAS.md).
- [Dashboard](docs/OPERACION-DASHBOARD.md).

## Desarrollo local

Desde la raíz, usar **pnpm** y conservar `pnpm-lock.yaml`. Preparar primero PostgreSQL y un `.env` privado con la conexión/configuración del entorno; no guardar secretos en git. Los Compose disponibles son alternativas: estándar o `docker-compose.fedora.yml`, no ambas simultáneamente.

```bash
pnpm install
pnpm prisma generate
pnpm dev
```

El desarrollo abre **http://localhost:3030**. El responsable técnico verifica el destino y las migraciones antes de habilitar el uso. La provisión de Administrador y configuración de acceso siguen [Operación de seguridad](docs/OPERACION-SEGURIDAD.md); no hay registro público ni cuenta inicial fija para iniciar sesión. No ejecutar el seed general para preparar o reparar datos reales.

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

`pnpm start` sirve una compilación existente y usa el puerto predeterminado de Next.js salvo configuración de entorno; no asumir que es 3030. Para instalación/HTTPS/servicios y actualización, revisar [deploy/seguridad](deploy/seguridad/README.md). El destino definitivo y su validación siguen pendientes.

## Pruebas y respaldo

El ejecutor `pnpm seguridad:validar-s6` permite seleccionar escenarios y prepara copias locales descartables con archivos temporales. Es un comando técnico que escribe fixtures sólo en esas copias; no ejecutar las pruebas directamente sobre la base real. Consultar los hitos y verificar entorno/puertos antes de usarlo.

Respaldar PostgreSQL junto con logos, imágenes, PDF históricos y comprobantes de Cobranzas, además de configuración/claves privadas. La base sin sus archivos no recupera los documentos originales. Restaurar primero en un destino aislado y seguir la revocación/conciliación de seguridad antes de abrir acceso.

## Estado y continuidad

- [Cierre de versión 1](docs/CIERRE-VERSION-1.md): pendientes y criterios de salida.
- [Cobranzas](docs/HITO-COBRANZAS.md): C1/C2 aprobados; revisiones funcionales C3/C4 pendientes.
- [Dashboard](docs/HITO-DASHBOARD.md): implementación técnica y comprobaciones funcionales/rendimiento pendientes.
- [Pruebas de seguridad S7](docs/GUIA-PRUEBAS-SEGURIDAD-S7.md): aprobaciones y bloques aún abiertos.
- [Manual y usabilidad](docs/HITO-MANUAL-USABILIDAD.md): entregables, evidencia y próximos pasos.

Los checkpoints técnicos no sustituyen aprobaciones del usuario. Los envíos a GitHub quedan a cargo del usuario; no se realiza push automático.
