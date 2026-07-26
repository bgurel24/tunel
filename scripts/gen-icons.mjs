// Logodan uygulama ikonu / splash / favicon üretir: `node scripts/gen-icons.mjs`
// SVG'yi PNG'ye çevirmek için başsız Chrome kullanır (ek bağımlılık gerekmesin diye).
// Logo ya da marka renkleri değişirse bunu yeniden çalıştır.

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { mark } from './logo.mjs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'assets', 'images');
const TMP = HERE;
mkdirSync(OUT, { recursive: true });

function shot(html, size, file, transparent) {
  const page = `<style>html,body{margin:0;padding:0;width:${size}px;height:${size}px;overflow:hidden;background:${
    transparent ? 'transparent' : '#08080B'
  }}</style>${html}`;
  const htmlPath = `${TMP}/page.html`;
  writeFileSync(htmlPath, page);
  execFileSync(
    CHROME,
    [
      '--headless',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${size},${size}`,
      '--default-background-color=00000000',
      `--screenshot=${OUT}/${file}`,
      `file://${htmlPath}`,
    ],
    { stdio: 'ignore' }
  );
  console.log(`${file} (${size}px)`);
}

// Uygulama ikonu: koyu zemin + hafif marka parıltısı + logo.
const glow =
  '<div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 62%, rgba(255,61,113,0.42), rgba(255,138,61,0.16) 45%, transparent 72%)"></div>';

function framed(inner, padPct, extra = '') {
  return `<div style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center">${extra}<div style="position:relative;width:${
    100 - padPct * 2
  }%;height:${100 - padPct * 2}%;display:flex;align-items:center;justify-content:center">${inner}</div></div>`;
}

shot(framed(mark({ sw: 1.45 }), 11, glow), 1024, 'icon.png', false);
shot(framed(mark({ sw: 1.35 }), 27), 1024, 'android-icon-foreground.png', true);
shot(framed(mark({ sw: 1.6, ball: '#FFFFFF' }), 27), 1024, 'android-icon-monochrome.png', true);
shot(`<div style="width:100%;height:100%;background:#08080B"></div>`, 1024, 'android-icon-background.png', false);
shot(framed(mark({ sw: 1.2 }), 6), 512, 'splash-icon.png', true);
shot(framed(mark({ sw: 2.2 }), 6, glow), 96, 'favicon.png', false);
