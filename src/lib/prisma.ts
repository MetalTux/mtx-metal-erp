// /src/lib/prisma.ts

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaConstructor?: typeof PrismaClient;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'Falta la variable de entorno DATABASE_URL. Revisa el archivo .env.',
    );
  }

  // El adaptador crea y administra su propio Pool de conexiones de pg
  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    // Mostrar las consultas SQL solo en desarrollo; en producción, solo errores
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'warn', 'error'],
  });
}

// El cliente generado cambia de clase cuando se regenera el esquema. Una instancia
// global anterior conserva sus delegados antiguos incluso después de una recarga HMR.
// Reutilizar sólo cuando pertenece al mismo constructor evita modelos undefined.
const clienteAnterior = globalForPrisma.prisma;
const reutilizable = process.env.NODE_ENV !== 'production'
  && globalForPrisma.prismaConstructor === PrismaClient;
export const prisma = reutilizable && clienteAnterior
  ? clienteAnterior
  : createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaConstructor = PrismaClient;
  // Cerrar el pool sustituido; no acumular conexiones tras regenerar el cliente.
  if (clienteAnterior && clienteAnterior !== prisma) {
    void clienteAnterior.$disconnect().catch(() => {
      console.error('No se pudo cerrar el cliente Prisma anterior.');
    });
  }
}
