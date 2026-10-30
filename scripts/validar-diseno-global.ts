// Cierre técnico VG9.9. Sólo suites aisladas conocidas y GET públicos; nunca integración/seed/migraciones.
import { spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';

type Paso = { nombre: string; args: string[]; entorno?: Partial<NodeJS.ProcessEnv>; limiteMs?: number };
type Resultado = { nombre: string; comando: string[]; codigo: number | null; senal: string | null; limiteAgotado: boolean; segundos: number; log: string };
const destino = resolve(process.argv[2] ?? 'var/validacion/diseno-global-vg9-9');
const resultados: Resultado[] = [];
const hijos = new Set<ChildProcess>();
function detener(hijo: ChildProcess, senal: NodeJS.Signals) {
  if (hijo.pid && hijo.exitCode === null && hijo.signalCode === null) {
    try { process.kill(-hijo.pid, senal); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ESRCH') throw e; }
  }
}
for (const senal of ['SIGINT', 'SIGTERM'] as const) process.once(senal, () => {
  for (const hijo of hijos) detener(hijo, 'SIGTERM');
  process.exit(senal === 'SIGINT' ? 130 : 143);
});
async function ejecutar(paso: Paso): Promise<Resultado> {
  const inicio = Date.now(); console.log('Iniciando:', paso.nombre);
  const hijo = spawn('pnpm', paso.args, { env: { ...process.env, ...paso.entorno }, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  hijos.add(hijo);
  const salida: Buffer[] = [];
  hijo.stdout?.on('data', b => salida.push(Buffer.from(b)));
  hijo.stderr?.on('data', b => salida.push(Buffer.from(b)));
  let agotado = false, forzado: ReturnType<typeof setTimeout> | undefined;
  const limite = setTimeout(() => {
    agotado = true; detener(hijo, 'SIGTERM');
    forzado = setTimeout(() => detener(hijo, 'SIGKILL'), 5000);
  }, paso.limiteMs ?? 300000);
  let codigo: number | null = null, senal: string | null = null;
  try {
    [codigo, senal] = await new Promise<[number | null, string | null]>((ok, error) => {
      hijo.once('error', error); hijo.once('exit', (c, s) => ok([c, s]));
    });
  } finally { clearTimeout(limite); clearTimeout(forzado); hijos.delete(hijo); }
  const archivo = join(destino, paso.nombre + '.log');
  await writeFile(archivo, Buffer.concat(salida));
  const resultado = { nombre: paso.nombre, comando: ['pnpm', ...paso.args], codigo, senal, limiteAgotado: agotado, segundos: (Date.now() - inicio) / 1000, log: relative(process.cwd(), archivo) };
  resultados.push(resultado);
  console.log(paso.nombre + ': ' + (codigo === 0 ? 'correcto' : agotado ? 'límite agotado' : 'falló') + ' (' + resultado.segundos.toFixed(1) + ' s)');
  return resultado;
}
async function huellas() {
  const archivos: string[] = [];
  async function recorrer(carpeta: string) {
    for (const e of await readdir(carpeta, { withFileTypes: true })) {
      const p = join(carpeta, e.name);
      if (p === join('src', 'generated')) continue;
      if (e.isDirectory()) await recorrer(p); else if (e.isFile()) archivos.push(p);
    }
  }
  await recorrer('src');
  return Promise.all(archivos.sort().map(async archivo => ({ archivo, sha256: createHash('sha256').update(await readFile(archivo)).digest('hex') })));
}
function prueba(nombre: string, archivo: string, args: string[] = []): Paso {
  const carpeta = join(destino, nombre);
  return { nombre, args: ['exec', 'tsx', archivo, ...args], entorno: { DISENO_EVIDENCIA_DIR: carpeta, TEMAS_TC2_EVIDENCIA_DIR: carpeta, VG8_EVIDENCIA_DIR: carpeta, NEXT_EVIDENCIA_DIR: carpeta, VG9_8_BASE: 'd555de5ca086492e727569a7ce7df217a3caa768' } };
}
async function main() {
  await mkdir(destino, { recursive: true });
  const inicio = new Date().toISOString(), antes = await huellas();
  const preservacion = prueba('preservacion', 'tests/diseno-global-vg9-8-preservacion.ts');
  let compilacionOk = false;
  const fallos: string[] = [];
  try {
    if ((await ejecutar(preservacion)).codigo !== 0) throw Error('No se pudo establecer el inventario de conservación; revisar su log.');
    for (const paso of [{ nombre: 'lint', args: ['lint'] }, { nombre: 'tipos', args: ['exec', 'tsc', '--noEmit'] }]) {
      if ((await ejecutar(paso)).codigo !== 0) fallos.push(paso.nombre);
    }
    const habitual = await ejecutar({ nombre: 'build-turbopack', args: ['build'], limiteMs: 90000 });
    compilacionOk = habitual.codigo === 0;
    if (!compilacionOk) compilacionOk = (await ejecutar({ nombre: 'build-webpack', args: ['exec', 'next', 'build', '--webpack'] })).codigo === 0;
    if (!compilacionOk) fallos.push('compilacion');
    else if ((await ejecutar(prueba('next-publico', 'tests/piloto-visual-next.ui.ts'))).codigo !== 0) fallos.push('next-publico');
    const puras = ['importes-cotizacion', 'importes-cotizacion-netos', 'importes-orden-compra-cliente', 'texto-cotizacion', 'requerimientos-produccion', 'seguridad-s1', 'seguridad-politica-clave', 'seguridad-s4-cobertura', 'seguridad-s5-cobertura'];
    const pasos: Paso[] = [
      ...puras.map(n => prueba(n, 'tests/' + n + '.ts')),
      ...['2', '3', '4', '5', '6-trabajos', '6-produccion-despacho', '7', '8'].map(n => prueba('vg' + n, 'tests/diseno-global-vg' + n + '.ui.ts')),
      prueba('temas', 'tests/temas-tc2.ui.ts'), prueba('ciclo', 'tests/diseno-global-vg9-2.ui.ts'),
      prueba('contraste', 'tests/diseno-global-vg9-3.ui.ts'), prueba('accesibilidad', 'tests/diseno-global-vg9-4.ui.ts'),
      prueba('responsive', 'tests/diseno-global-vg9-5.ui.ts'), prueba('estados', 'tests/diseno-global-vg9-6.ui.ts'),
      prueba('piloto', 'tests/piloto-visual.ui.ts'),
      ...['oscuro', 'claro'].map(tema => ({ nombre: 'grillas-' + tema, args: ['grillas:validar', join(destino, 'grillas-' + tema)], entorno: { GRILLAS_TEMA: tema } })),
    ];
    // Dos trabajadores; cada suite dispone de su directorio y perfil Chromium propio.
    let indice = 0;
    async function trabajador() {
      while (indice < pasos.length) {
        const paso = pasos[indice++];
        if ((await ejecutar(paso)).codigo !== 0) fallos.push(paso.nombre);
      }
    }
    await Promise.all([trabajador(), trabajador()]);
    const cierre = { ...preservacion, nombre: 'preservacion-cierre', args: [...preservacion.args, '--comprobar-cierre'] };
    if ((await ejecutar(cierre)).codigo !== 0) fallos.push(cierre.nombre);
    const despues = await huellas();
    const fuentesEstables = JSON.stringify(antes) === JSON.stringify(despues);
    if (!fuentesEstables) fallos.push('fuentes-cambiaron-durante-validacion');
    await writeFile(join(destino, 'resultado.json'), JSON.stringify({ ok: fallos.length === 0, inicio, fin: new Date().toISOString(), alcance: 'Regresión técnica aislada; Next público sólo GET. Sin integración de negocio en BD, autenticación real ni aceptación de usuario.', compilacionOk, fuentesEstables, fallos, resultados, fuentes: despues }, null, 2) + '\n');
    console.log('VG9.9:', fallos.length ? 'hay fallos: ' + fallos.join(', ') : 'comprobaciones técnicas correctas');
    if (fallos.length) process.exitCode = 1;
  } catch (e) {
    await writeFile(join(destino, 'resultado.json'), JSON.stringify({ ok: false, inicio, error: String(e), resultados }, null, 2) + '\n');
    throw e;
  } finally { for (const hijo of hijos) detener(hijo, 'SIGTERM'); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
