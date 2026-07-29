// /src/lib/prisma.ts

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Creamos un Pool de conexiones y lo envolvemos en el adaptador
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ 
    adapter,
    log: ['query'], // Ideal para ver las consultas SQL en consola durante desarrollo
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;