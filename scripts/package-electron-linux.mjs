// Packaging de l'application H-Flix pour Linux (binaire autonome x64).
// Usage : npm run build && node scripts/package-electron-linux.mjs
import packager from 'electron-packager';
import { existsSync, rmSync, copyFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(projectRoot, 'dist-electron');
const appName = 'H-Flix';

const KEEP = [/^\/package\.json$/, /^\/dist($|\/)/, /^\/electron($|\/)/];

const ignore = (relativePath) => {
  if (relativePath === '') return false;
  return !KEEP.some((pattern) => pattern.test(relativePath));
};

if (!existsSync(resolve(projectRoot, 'dist', 'index.html'))) {
  console.error(
    '\n[X] dist/index.html est introuvable.\n' +
      '    Lancez "npm run build" avant d\'exécuter ce script.\n'
  );
  process.exit(1);
}

const previousBuild = resolve(outDir, `${appName}-linux-x64`);
if (existsSync(previousBuild)) {
  console.log('Suppression du paquet Linux précédent...');
  rmSync(previousBuild, { recursive: true, force: true });
}

console.log(`Packaging de "${appName}" (linux-x64)...`);

const paths = await packager({
  dir: projectRoot,
  name: appName,
  platform: 'linux',
  arch: 'x64',
  out: outDir,
  overwrite: true,
  asar: true,
  prune: false,
  ignore,
  icon: resolve(projectRoot, 'public', 'flix.png'),
  appCopyright: 'H-Flix',
});

const installerScript = resolve(projectRoot, 'installer-hflix.sh');
if (existsSync(installerScript)) {
  copyFileSync(installerScript, resolve(paths[0], 'installer-hflix.sh'));
}

console.log(`\n[OK] Application Linux générée avec succès : ${paths[0]}`);
console.log(`     Exécutable Linux : ${paths[0]}/${appName}`);
console.log(`     Script d'installation auto : ${paths[0]}/installer-hflix.sh\n`);
