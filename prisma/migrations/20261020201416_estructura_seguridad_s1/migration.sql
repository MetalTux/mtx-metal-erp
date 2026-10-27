-- Migración aditiva y atómica; ninguna credencial heredada habilita acceso.
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "User" WHERE btrim(email)='' OR length(btrim(email))>254)
    OR EXISTS (SELECT 1 FROM "User" GROUP BY lower(btrim(email)) HAVING count(*)>1) THEN
    RAISE EXCEPTION 'Usuarios con correo vacío, demasiado largo o duplicado normalizado: conciliar antes de migrar';
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "SecurityUserStatus" AS ENUM ('PENDIENTE_ACTIVACION', 'ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "SecurityRoleCode" AS ENUM ('ADMINISTRADOR', 'VENTAS', 'COMPRAS_BODEGA', 'PRODUCCION_DESPACHO', 'COBRANZA', 'CONSULTA_GERENCIA');

-- CreateEnum
CREATE TYPE "SecurityTokenPurpose" AS ENUM ('ACTIVACION', 'RECUPERACION_CLAVE');

-- CreateEnum
CREATE TYPE "SecurityChallengePurpose" AS ENUM ('INGRESO_TOTP', 'REAUTENTICACION', 'VINCULACION_GOOGLE');

-- CreateTable
CREATE TABLE "UserSecurity" (
    "userId" INTEGER NOT NULL,
    "normalizedEmail" VARCHAR(254) NOT NULL,
    "status" "SecurityUserStatus" NOT NULL DEFAULT 'PENDIENTE_ACTIVACION',
    "passwordHash" TEXT,
    "localAllowed" BOOLEAN NOT NULL DEFAULT true,
    "googleAllowed" BOOLEAN NOT NULL DEFAULT false,
    "securityVersion" INTEGER NOT NULL DEFAULT 1,
    "passwordChangedAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSecurity_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserSecurityRole" (
    "userId" INTEGER NOT NULL,
    "role" "SecurityRoleCode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSecurityRole_pkey" PRIMARY KEY ("userId","role")
);

-- CreateTable
CREATE TABLE "SecurityIdentity" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "provider" VARCHAR(30) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "verifiedEmail" VARCHAR(254) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecuritySession" (
    "id" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "userId" INTEGER NOT NULL,
    "securityVersion" INTEGER NOT NULL,
    "authenticatedAt" TIMESTAMP(3) NOT NULL,
    "secondFactorAt" TIMESTAMP(3),
    "reauthenticatedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecuritySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityToken" (
    "id" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "purpose" "SecurityTokenPurpose" NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityChallenge" (
    "id" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "purpose" "SecurityChallengePurpose" NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "securityVersion" INTEGER NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecuritySecondFactor" (
    "userId" INTEGER NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "encryptionKeyId" VARCHAR(64) NOT NULL,
    "enabledAt" TIMESTAMP(3),
    "setupExpiresAt" TIMESTAMP(3),
    "lastUsedStep" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecuritySecondFactor_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "SecurityRecoveryCode" (
    "id" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "codeHash" CHAR(64) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityRecoveryCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityRateLimit" (
    "keyHash" CHAR(64) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "blockedUntil" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityRateLimit_pkey" PRIMARY KEY ("keyHash")
);

-- CreateTable
CREATE TABLE "SecurityAuditEvent" (
    "id" BIGSERIAL NOT NULL,
    "actorUserId" INTEGER,
    "targetUserId" INTEGER,
    "action" VARCHAR(100) NOT NULL,
    "result" VARCHAR(30) NOT NULL,
    "ipAddress" INET,
    "browserType" VARCHAR(200),
    "reference" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityOperationAuthor" (
    "id" BIGSERIAL NOT NULL,
    "actorUserId" INTEGER NOT NULL,
    "operationKey" UUID NOT NULL,
    "resourceType" VARCHAR(80) NOT NULL,
    "resourceId" VARCHAR(100) NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityOperationAuthor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSecurity_normalizedEmail_key" ON "UserSecurity"("normalizedEmail");

-- CreateIndex
CREATE INDEX "UserSecurity_status_userId_idx" ON "UserSecurity"("status", "userId");

-- CreateIndex
CREATE INDEX "UserSecurityRole_role_userId_idx" ON "UserSecurityRole"("role", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityIdentity_provider_subject_key" ON "SecurityIdentity"("provider", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityIdentity_userId_provider_key" ON "SecurityIdentity"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "SecuritySession_tokenHash_key" ON "SecuritySession"("tokenHash");

-- CreateIndex
CREATE INDEX "SecuritySession_userId_revokedAt_expiresAt_idx" ON "SecuritySession"("userId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "SecuritySession_expiresAt_idx" ON "SecuritySession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityToken_tokenHash_key" ON "SecurityToken"("tokenHash");

-- CreateIndex
CREATE INDEX "SecurityToken_userId_purpose_expiresAt_idx" ON "SecurityToken"("userId", "purpose", "expiresAt");

-- CreateIndex
CREATE INDEX "SecurityToken_expiresAt_idx" ON "SecurityToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityChallenge_tokenHash_key" ON "SecurityChallenge"("tokenHash");

-- CreateIndex
CREATE INDEX "SecurityChallenge_userId_purpose_expiresAt_idx" ON "SecurityChallenge"("userId", "purpose", "expiresAt");

-- CreateIndex
CREATE INDEX "SecurityChallenge_expiresAt_idx" ON "SecurityChallenge"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityRecoveryCode_codeHash_key" ON "SecurityRecoveryCode"("codeHash");

-- CreateIndex
CREATE INDEX "SecurityRecoveryCode_userId_consumedAt_idx" ON "SecurityRecoveryCode"("userId", "consumedAt");

-- CreateIndex
CREATE INDEX "SecurityRateLimit_expiresAt_idx" ON "SecurityRateLimit"("expiresAt");

-- CreateIndex
CREATE INDEX "SecurityAuditEvent_actorUserId_createdAt_idx" ON "SecurityAuditEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityAuditEvent_targetUserId_createdAt_idx" ON "SecurityAuditEvent"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityAuditEvent_createdAt_idx" ON "SecurityAuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "SecurityOperationAuthor_actorUserId_createdAt_idx" ON "SecurityOperationAuthor"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityOperationAuthor_resourceType_resourceId_idx" ON "SecurityOperationAuthor"("resourceType", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityOperationAuthor_resourceType_operationKey_key" ON "SecurityOperationAuthor"("resourceType", "operationKey");

-- AddForeignKey
ALTER TABLE "UserSecurity" ADD CONSTRAINT "UserSecurity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSecurityRole" ADD CONSTRAINT "UserSecurityRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserSecurity"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityIdentity" ADD CONSTRAINT "SecurityIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserSecurity"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecuritySession" ADD CONSTRAINT "SecuritySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserSecurity"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityToken" ADD CONSTRAINT "SecurityToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserSecurity"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityChallenge" ADD CONSTRAINT "SecurityChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserSecurity"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecuritySecondFactor" ADD CONSTRAINT "SecuritySecondFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserSecurity"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityRecoveryCode" ADD CONSTRAINT "SecurityRecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserSecurity"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityAuditEvent" ADD CONSTRAINT "SecurityAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityAuditEvent" ADD CONSTRAINT "SecurityAuditEvent_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityOperationAuthor" ADD CONSTRAINT "SecurityOperationAuthor_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Restricciones de estructura; autorización/consumo atómico se implementan en S2–S5.
ALTER TABLE "UserSecurity" ADD CONSTRAINT "UserSecurity_values" CHECK (
  "normalizedEmail"=lower(btrim("normalizedEmail")) AND length("normalizedEmail")>0 AND
  "securityVersion">0 AND ("localAllowed" OR "googleAllowed") AND
  ("passwordHash" IS NULL OR "passwordHash" LIKE '$argon2id$%') AND
  (("passwordHash" IS NULL)=("passwordChangedAt" IS NULL))
);
ALTER TABLE "SecurityIdentity" ADD CONSTRAINT "SecurityIdentity_values" CHECK (
  provider='GOOGLE' AND length(btrim(subject))>0 AND
  "verifiedEmail"=lower(btrim("verifiedEmail")) AND length("verifiedEmail")>0
);
ALTER TABLE "SecuritySession" ADD CONSTRAINT "SecuritySession_values" CHECK (
  "tokenHash" ~ '^[0-9a-f]{64}$' AND "securityVersion">0 AND
  "expiresAt">"authenticatedAt" AND "expiresAt"<="authenticatedAt"+interval '8 hours' AND
  "lastActivityAt">="authenticatedAt" AND "lastActivityAt"<="expiresAt" AND
  ("secondFactorAt" IS NULL OR "secondFactorAt">="authenticatedAt") AND
  ("reauthenticatedAt" IS NULL OR "reauthenticatedAt">="authenticatedAt") AND
  ("revokedAt" IS NULL OR "revokedAt">="authenticatedAt")
);
ALTER TABLE "SecurityToken" ADD CONSTRAINT "SecurityToken_values" CHECK (
  "tokenHash" ~ '^[0-9a-f]{64}$' AND "expiresAt">"createdAt" AND
  ("consumedAt" IS NULL OR ("consumedAt">="createdAt" AND "consumedAt"<="expiresAt"))
);
ALTER TABLE "SecurityChallenge" ADD CONSTRAINT "SecurityChallenge_values" CHECK (
  "tokenHash" ~ '^[0-9a-f]{64}$' AND "securityVersion">0 AND "failedAttempts">=0 AND
  "expiresAt">"createdAt" AND
  ("consumedAt" IS NULL OR ("consumedAt">="createdAt" AND "consumedAt"<="expiresAt"))
);
ALTER TABLE "SecuritySecondFactor" ADD CONSTRAINT "SecuritySecondFactor_values" CHECK (
  length(btrim("encryptedSecret"))>0 AND length(btrim("encryptionKeyId"))>0 AND
  (("enabledAt" IS NULL AND "setupExpiresAt" IS NOT NULL AND "setupExpiresAt">"createdAt") OR
   ("enabledAt" IS NOT NULL AND "setupExpiresAt" IS NULL AND "enabledAt">="createdAt")) AND
  ("lastUsedStep" IS NULL OR ("enabledAt" IS NOT NULL AND "lastUsedStep">=0))
);
ALTER TABLE "SecurityRecoveryCode" ADD CONSTRAINT "SecurityRecoveryCode_values" CHECK (
  "codeHash" ~ '^[0-9a-f]{64}$' AND ("consumedAt" IS NULL OR "consumedAt">="createdAt")
);
ALTER TABLE "SecurityRateLimit" ADD CONSTRAINT "SecurityRateLimit_values" CHECK (
  "keyHash" ~ '^[0-9a-f]{64}$' AND attempts>=0 AND "expiresAt">"windowStart"
);
ALTER TABLE "SecurityAuditEvent" ADD CONSTRAINT "SecurityAuditEvent_values" CHECK (
  length(btrim(action))>0 AND result IN ('CORRECTO','RECHAZADO','ERROR')
);
ALTER TABLE "SecurityOperationAuthor" ADD CONSTRAINT "SecurityOperationAuthor_values" CHECK (
  length(btrim("resourceType"))>0 AND length(btrim("resourceId"))>0 AND length(btrim(action))>0
);

-- No actualizar User/Role ni importar User.password. Activación explícita en S2.
INSERT INTO "UserSecurity" ("userId","normalizedEmail","updatedAt")
SELECT id,lower(btrim(email)),CURRENT_TIMESTAMP FROM "User";
INSERT INTO "UserSecurityRole" ("userId",role,"updatedAt")
SELECT u.id,(CASE r.name WHEN 'Administrador' THEN 'ADMINISTRADOR'
  WHEN 'Ventas' THEN 'VENTAS' WHEN 'Bodeguero' THEN 'COMPRAS_BODEGA' END)::"SecurityRoleCode",CURRENT_TIMESTAMP
FROM "User" u JOIN "Role" r ON r.id=u."roleId"
WHERE r.name IN ('Administrador','Ventas','Bodeguero');
-- Roles heredados desconocidos no conceden permisos por inferencia.

CREATE FUNCTION public.conservar_autoria_seguridad() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'La autoría de operaciones es inmutable'; END $$;
CREATE TRIGGER "SecurityOperationAuthor_keep" BEFORE UPDATE OR DELETE ON "SecurityOperationAuthor"
FOR EACH ROW EXECUTE FUNCTION public.conservar_autoria_seguridad();
CREATE FUNCTION public.conservar_evento_seguridad() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' AND OLD."createdAt"<=CURRENT_TIMESTAMP-interval '12 months' THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'Evento inmutable; sólo se depura después de 12 meses';
END $$;
CREATE TRIGGER "SecurityAuditEvent_keep" BEFORE UPDATE OR DELETE ON "SecurityAuditEvent"
FOR EACH ROW EXECUTE FUNCTION public.conservar_evento_seguridad();
COMMIT;
