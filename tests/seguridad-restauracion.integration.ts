import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { hash } from "@node-rs/argon2";
import { generate } from "otplib";
import { prisma } from "../src/lib/prisma";
import { operarSeguridad, consultarSesionSeguridad } from "../src/lib/seguridad/servicio";
import { revocarAccesosRestaurados } from "../src/lib/seguridad/restauracion";
import { descifrarPrivado } from "../src/lib/seguridad/configuracion";

const url = new URL(process.env.DATABASE_URL!);
assert(["localhost", "127.0.0.1"].includes(url.hostname) && /^\/mtx_validacion_seguridad_s6_\d{8}$/.test(url.pathname), "Sólo copia S6 local descartable");

async function restaurarCopiaConCredenciales() {
  const dir = mkdtempSync("/tmp/mtx-s6-restauracion-"), container = process.env.S6_CONTENEDOR ?? "mtx-metal-erp-postgres-db";
  const database = url.pathname.slice(1), user = decodeURIComponent(url.username);
  const docker = (args: string[], input?: Buffer) => {
    const r = spawnSync("docker", ["exec", "-i", container, ...args], { input, maxBuffer: 256 * 1024 * 1024 });
    assert.equal(r.status, 0, "Respaldo/restauración de la copia S6"); return r.stdout;
  };
  try {
    const claves = join(dir, "claves.json"), archivo = join(dir, "postgres.dump");
    writeFileSync(claves, JSON.stringify({ keys: process.env.SEGURIDAD_CLAVES, active: process.env.SEGURIDAD_CLAVE_ACTIVA }), { mode: 0o600 });
    writeFileSync(archivo, docker(["pg_dump", "-U", user, "-Fc", database]), { mode: 0o600 });
    // Sólo esta copia descartable: cerrar su pool antes de restaurar el mismo destino.
    await prisma.$disconnect();
    docker(["pg_restore", "-U", user, "-d", database, "--clean", "--if-exists", "--no-owner", "--no-privileges"], readFileSync(archivo));
    const saved = JSON.parse(readFileSync(claves, "utf8")) as { keys: string; active: string };
    process.env.SEGURIDAD_CLAVES = saved.keys; process.env.SEGURIDAD_CLAVE_ACTIVA = saved.active;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

async function main() {
  const password = randomUUID(), email = `restauracion-${randomUUID()}@ejemplo.invalid`;
  const role = await prisma.role.upsert({ where: { name: "Restauración S6" }, create: { name: "Restauración S6" }, update: {} });
  const user = await prisma.user.create({ data: { name: "Titular S6", email, password: "!INUTILIZABLE", roleId: role.id } });
  await prisma.userSecurity.create({ data: { userId: user.id, normalizedEmail: email, status: "ACTIVO", passwordHash: await hash(password, { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 }), passwordChangedAt: new Date() } });
  await prisma.userSecurityRole.create({ data: { userId: user.id, role: "ADMINISTRADOR" } });
  const login = await operarSeguridad({}, { action: "login", email, password }); assert(login.client.ok && login.sessionToken);
  const otraSesion = await operarSeguridad({}, { action: "login", email, password }); assert(otraSesion.client.ok && otraSesion.sessionToken);
  const propias = await operarSeguridad({ session: login.sessionToken }, { action: "self" }); assert.equal((propias.client.sessions as unknown[]).length, 2);
  assert((await operarSeguridad({ session: login.sessionToken }, { action: "sessions-revoke" })).client.ok);
  assert.equal(await consultarSesionSeguridad(otraSesion.sessionToken), null); assert(await consultarSesionSeguridad(login.sessionToken));
  const setup = await operarSeguridad({ session: login.sessionToken }, { action: "factor-setup" }); assert(setup.client.ok);
  const enabled = await operarSeguridad({ session: login.sessionToken }, { action: "factor-enable", setup: setup.client.setup, code: await generate({ secret: String(setup.client.secret) }) }); assert(enabled.client.ok && enabled.sessionToken);
  const codes = enabled.client.codes as string[];
  const pending = await operarSeguridad({}, { action: "login", email, password }); assert(pending.challengeToken);
  const security = await prisma.userSecurity.findUniqueOrThrow({ where: { userId: user.id } });
  const reset = await operarSeguridad({ session: enabled.sessionToken }, { action: "user-token", id: user.id, version: security.securityVersion }); assert(reset.client.ok && reset.client.link);
  const token = new URLSearchParams(new URL(String(reset.client.link)).hash.slice(1)).get("token");
  const factor = await prisma.securitySecondFactor.findUniqueOrThrow({ where: { userId: user.id } });
  const backups = await prisma.securityRecoveryCode.findMany({ where: { userId: user.id }, orderBy: { id: "asc" } });
  const authors = await prisma.securityOperationAuthor.count();
  const roles = await prisma.userSecurityRole.findMany({ where: { userId: user.id } });
  await restaurarCopiaConCredenciales();
  assert(await consultarSesionSeguridad(enabled.sessionToken), "La restauración recuperó una sesión utilizable que deberá revocarse");
  assert.equal((await descifrarPrivado(factor.encryptedSecret, "totp")).userId, user.id, "Las claves respaldadas permiten recuperar el factor personal");
  const dry = spawnSync(process.execPath, ["--import", "tsx", "scripts/revocar-accesos-restauracion.ts"], { env: process.env, encoding: "utf8" });
  assert.equal(dry.status, 0); assert(dry.stdout.includes("Simulación:")); assert(await consultarSesionSeguridad(enabled.sessionToken));
  // La revocación y la revisión de credenciales deben revertir juntas si falla el registro.
  await prisma.$executeRawUnsafe(`CREATE FUNCTION public.s6_fallo_restauracion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='ACCESOS_REVOCADOS_RESTAURACION' THEN RAISE EXCEPTION 'Fallo inducido S6'; END IF; RETURN NEW; END $$`);
  await prisma.$executeRawUnsafe(`CREATE TRIGGER s6_fallo_restauracion BEFORE INSERT ON "SecurityAuditEvent" FOR EACH ROW EXECUTE FUNCTION public.s6_fallo_restauracion()`);
  try { await assert.rejects(() => revocarAccesosRestaurados(true)); assert(await consultarSesionSeguridad(enabled.sessionToken)); assert.equal((await prisma.userSecurity.findUniqueOrThrow({ where: { userId: user.id } })).securityVersion, security.securityVersion); }
  finally { await prisma.$executeRawUnsafe('DROP TRIGGER s6_fallo_restauracion ON "SecurityAuditEvent"'); await prisma.$executeRawUnsafe('DROP FUNCTION public.s6_fallo_restauracion()'); }
  const apply = spawnSync(process.execPath, ["--import", "tsx", "scripts/revocar-accesos-restauracion.ts", "--aplicar"], { env: process.env, encoding: "utf8" }); assert.equal(apply.status, 0);
  assert.equal(await consultarSesionSeguridad(enabled.sessionToken), null);
  assert(!(await operarSeguridad({ challenge: pending.challengeToken }, { action: "factor-login", code: codes[0] })).client.ok);
  assert(!(await operarSeguridad({}, { action: "reset", token, password })).client.ok);
  assert.deepEqual(await prisma.securitySecondFactor.findUniqueOrThrow({ where: { userId: user.id } }), factor);
  assert.deepEqual(await prisma.securityRecoveryCode.findMany({ where: { userId: user.id }, orderBy: { id: "asc" } }), backups);
  assert.deepEqual(await prisma.userSecurityRole.findMany({ where: { userId: user.id } }), roles);
  assert.equal(await prisma.securityOperationAuthor.count(), authors);
  const after = await prisma.userSecurity.findUniqueOrThrow({ where: { userId: user.id } }); assert.equal(after.passwordHash, security.passwordHash); assert.equal(after.status, security.status); assert.equal(after.securityVersion, security.securityVersion + 1);
  assert(await prisma.securityAuditEvent.count({ where: { action: "ACCESOS_REVOCADOS_RESTAURACION", actorUserId: null } }));
  // Rotar conservando las claves históricas mantiene el autenticador del titular.
  const originalKeys = process.env.SEGURIDAD_CLAVES!, active = process.env.SEGURIDAD_CLAVE_ACTIVA;
  try { process.env.SEGURIDAD_CLAVES = JSON.stringify({ ...JSON.parse(originalKeys), nueva: Buffer.alloc(32, 7).toString("base64") }); process.env.SEGURIDAD_CLAVE_ACTIVA = "nueva"; assert.equal((await descifrarPrivado(factor.encryptedSecret, "totp")).userId, user.id); }
  finally { process.env.SEGURIDAD_CLAVES = originalKeys; process.env.SEGURIDAD_CLAVE_ACTIVA = active; }
  const fresh = await operarSeguridad({}, { action: "login", email, password }); assert(fresh.challengeToken && !fresh.sessionToken);
  assert((await operarSeguridad({ challenge: fresh.challengeToken }, { action: "factor-login", code: codes[0] })).client.ok, "Sólo el titular recupera su factor con su respaldo personal");
  console.log("S6: simulación, revocación atómica/rollback, enlaces y desafíos inválidos, factores/códigos/roles/autoría conservados y rotación con clave histórica correctos.");
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
