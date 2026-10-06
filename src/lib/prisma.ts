// /src/lib/prisma.ts

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

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

// Se reutiliza el cliente guardado para no abrir conexiones nuevas en cada recarga en caliente
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
