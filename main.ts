// MIDNIGHT VAULT's hand-in program (Node 22, standard library only): the game
// is this directory's game/ folder — plain static files a desktop browser loads
// offline (game/index.html and its ES modules, no library and no network
// request) — and this program hands it in. It copies game/ and screenshots/
// from beside this file to /output and writes /output/dossier.json, the summary
// the judge reads, with the vendored make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of
// game files, in all, or a path under game/ over 1000 bytes: game/ counts
// beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
const DOSSIER_OPTIONS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function fail(message) {
  throw new Error(`midnight-vault hand-in refused: ${message}`);
}

function checkEntryShape() {
  const index = join(here, 'game', 'index.html');
  if (!existsSync(index)) fail('game/index.html is missing');
  // Walk game/ and refuse before copying when the tree itself would bust the
  // scorer's caps: too many files, too many bytes, or a path too long.
  let files = 0;
  let bytes = 0;
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const file = join(dir, name);
      const stats = statSync(file);
      if (stats.isDirectory()) {
        walk(file);
      } else {
        files += 1;
        bytes += stats.size;
        if (Buffer.byteLength(file) > DOSSIER_OPTIONS.game_path_max_bytes) {
          fail(`game path over 1000 bytes: ${file}`);
        }
      }
    }
  };
  walk(join(here, 'game'));
  if (files > DOSSIER_OPTIONS.game_max_files) fail(`game/ holds ${files} files, over 993`);
  if (bytes > DOSSIER_OPTIONS.game_max_bytes) fail(`game/ is ${bytes} bytes, over 48 MiB`);
  const shotsDir = join(here, 'screenshots');
  if (!existsSync(shotsDir)) fail('screenshots/ is missing');
  const shots = readdirSync(shotsDir)
    .filter((name) => !name.startsWith('.'))
    .sort();
  if (shots.length < 3 || shots.length > 4) {
    fail(`expected 3 or 4 screenshots, found ${shots.length}`);
  }
  for (const name of shots) {
    const file = join(shotsDir, name);
    const size = statSync(file).size;
    if (size > DOSSIER_OPTIONS.screenshots.max_bytes) {
      fail(`screenshot ${name} is ${size} bytes, over the 256 KiB cap`);
    }
  }
  return shots;
}

const shots = checkEntryShape();

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

writeFileSync(join(out, 'dossier.json'), buildDossier(out, DOSSIER_OPTIONS));

// The dossier the judge reads must be the one the library writes: read it
// back, confirm it parses and stays under the scorer's 1.5 MiB cap.
const dossierPath = join(out, 'dossier.json');
const dossierBytes = statSync(dossierPath).size;
if (dossierBytes > 1572864) fail(`dossier.json is ${dossierBytes} bytes, over 1.5 MiB`);
JSON.parse(readFileSync(dossierPath, 'utf8'));

console.log(
  `MIDNIGHT VAULT handed in: ${shots.length} screenshots (${shots.join(', ')}) -> ${out}`,
);
