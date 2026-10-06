// prisma/seed.ts

// Carga .env para que el seed también funcione al ejecutarlo directo con tsx
// (debe ir antes de importar el cliente, que lee DATABASE_URL al crearse)
import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Iniciando el poblado de la base de datos (Seeding)...');

  // 1. Crear Roles base
  const roles = ['Administrador', 'Bodeguero', 'Ventas'];
  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {}, // Si ya existe, no hace nada
      create: { name: roleName }, // Si no existe, lo crea
    });
  }
  console.log('✅ Roles creados');

  // 2. Crear Unidades de Medida base
  const units = [
    { name: 'Gramos', abbreviation: 'gr' },
    { name: 'Kilos', abbreviation: 'kg' },
    { name: 'Unidades', abbreviation: 'un' },
    { name: 'Mililitros', abbreviation: 'ml' },
    { name: 'Litros', abbreviation: 'L' },
    { name: 'Metros', abbreviation: 'm' }
  ];

  for (const unit of units) {
    await prisma.unitMeasure.upsert({
      where: { name: unit.name },
      update: {}, // Si ya existe, no hace nada
      create: unit, // Si no existe, la crea
    });
  }
  console.log('✅ Unidades de Medida creadas');

  // 3. Crear un Usuario Administrador por defecto
  // (Nota: Más adelante implementaremos bcrypt para encriptar esta contraseña real)
  const adminRole = await prisma.role.findUnique({ where: { name: 'Administrador' } });
  
  if (adminRole) {
    await prisma.user.upsert({
      where: { email: 'jrios.03@hotmail.com' },
      update: {},
      create: {
        name: 'Admin Principal (JR)',
        email: 'jrios.03@hotmail.com',
        password: 'A123456z', // Cambiaremos esto cuando veamos Autenticación
        roleId: adminRole.id
      }
    });
    console.log('✅ Usuario Administrador creado');
  }

  console.log('🎉 ¡Base de datos poblada exitosamente!');
}

main()
  .catch((e) => {
    console.error('Error al ejecutar el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Cerramos la conexión de Prisma al terminar
    await prisma.$disconnect();
  });