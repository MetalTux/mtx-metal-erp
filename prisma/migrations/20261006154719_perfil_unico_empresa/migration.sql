-- Perfil único, inicialmente sin registros, para configurar los datos de la empresa.
-- La combinación de PK y CHECK permite como máximo una fila con id = 1.
-- Conservar el CHECK en SQL: no se representa como atributo en Prisma.
CREATE TABLE "CompanyProfile" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "legalName" TEXT,
    "tradeName" TEXT,
    "rut" TEXT,
    "businessActivity" TEXT,
    "address" TEXT,
    "commune" TEXT,
    "city" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CompanyProfile_singleton_check" CHECK ("id" = 1)
);
