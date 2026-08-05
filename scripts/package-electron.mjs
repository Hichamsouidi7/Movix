// Packaging de l'application de bureau Movix TV Hub (.exe autonome).
//
// Usage : npm run build && npm run build:exe
//
// Seuls dist/ (build Vite), electron/ et package.json sont embarqués : le reste
// du monorepo (API, src, extensions, node_modules) n'est pas utilisé à
// l'exécution et alourdissait le paquet de plusieurs centaines de Mo.
import packager from 'electron-packager';
import { existsSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(projectRoot, 'dist-electron');
const appName = 'H-Flix';

// Tout ce qui n'est pas explicitement conservé est exclu du paquet.
const KEEP = [/^\/package\.json$/, /^\/dist($|\/)/, /^\/electron($|\/)/];

const ignore = (relativePath) => {
  if (relativePath === '') return false;
  return !KEEP.some((pattern) => pattern.test(relativePath));
};

if (!existsSync(resolve(projectRoot, 'dist', 'index.html'))) {
  console.error(
    '\n[X] dist/index.html est introuvable.\n' +
      '    Lancez "npm run build" avant "npm run build:exe".\n'
  );
  process.exit(1);
}

const previousBuild = resolve(outDir, `${appName}-win32-x64`);
if (existsSync(previousBuild)) {
  console.log('Suppression du paquet precedent...');
  rmSync(previousBuild, { recursive: true, force: true });
}

console.log(`Packaging de "${appName}" (win32-x64)...`);

const paths = await packager({
  dir: projectRoot,
  name: appName,
  platform: 'win32',
  arch: 'x64',
  out: outDir,
  overwrite: true,
  asar: true,
  prune: false, // aucune dépendance npm n'est embarquée : rien à élaguer
  ignore,
  icon: resolve(projectRoot, 'public', 'flix.png'),
  appCopyright: 'H-Flix',
  win32metadata: {
    CompanyName: 'H-Flix',
    FileDescription: 'H-Flix TV Hub',
    ProductName: appName,
  },
});

console.log(`\n[OK] Application generee : ${paths[0]}`);
console.log(`     Executable : ${paths[0]}\\${appName}.exe\n`);
