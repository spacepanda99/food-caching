// Draws the Food Caching wordmark and logo mark from scratch (no font).
// Each letter is a set of hand-placed strokes on a small grid:
//   cap top y=10, x-height y=30, baseline y=70, descender ~y=98.
// Run: node tools/lettering.mjs   → writes img/wordmark.svg and img/mark.svg
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STROKE = 11;
const INK = '#fbf7ee';      // letter color (cream, sits on the green header)
const SHADOW = '#1f3f27';   // offset "print" shadow for a chunky look
const LEAF = '#a5d66f';
const APPLE = '#ff8a65';
const STEM = '#8d5524';

// a = circle helper path (full ring) centered cx,cy radius r
const ring = (cx, cy, r) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0`;
const open = (cx, cy, r, deg) => { // ring open on the right by ±deg
  const t = deg * Math.PI / 180;
  const x = (cx + r * Math.cos(t)).toFixed(1);
  return `M${x} ${(cy - r * Math.sin(t)).toFixed(1)} A${r} ${r} 0 1 0 ${x} ${(cy + r * Math.sin(t)).toFixed(1)}`;
};

// Glyphs: width + stroke paths (+ optional extra decoration drawn on top).
const G = {
  F: { w: 42, d: ['M6 70 V10 H40', 'M6 38 H32'] },
  o: { w: 50, d: [ring(25, 50, 19.5)] },
  d: { w: 52, d: [ring(25, 50, 19.5), 'M45 8 V70'] },
  C: { w: 60, d: [open(34, 40, 29.5, 48)] },
  a: { w: 52, d: [ring(25, 50, 19.5), 'M45 31 V70'] },
  c: { w: 46, d: [open(25, 50, 19.5, 48)] },
  h: { w: 46, d: ['M6 8 V70', 'M6 49 C6 37 13 30 23 30 C33 30 40 37 40 49 V70'] },
  i: { w: 13, d: ['M6.5 31 V70'], deco: 'leaf' },
  n: { w: 46, d: ['M6 31 V70', 'M6 49 C6 37 13 30 23 30 C33 30 40 37 40 49 V70'] },
  // g's tail curls up like a vine tendril
  g: { w: 52, d: [ring(25, 50, 19.5), 'M45 31 V80 C45 96 32 101 21 99 C11 97 6 88 12 83 C17 79 23 83 20 88'] },
  ' ': { w: 20, d: [] },
};

const KERN = 9; // space between letters

function leaf(x, y, rot, scale = 1) {
  return `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${scale})" d="M0 0 C-7 -6 -7 -16 0 -22 C7 -16 7 -6 0 0 Z" fill="${LEAF}"/>
  <path transform="translate(${x} ${y}) rotate(${rot}) scale(${scale})" d="M0 -2 V-17" stroke="#5f8f3a" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;
}

// Hand-made bounce: each letter sits a little high/low and leans a little.
const BOUNCE = [[0, -4], [-3, 3], [2, -3], [-2, 4], [0, 0], [2, -3], [-3, 4], [1, -3], [-2, 3], [2, -4], [-1, 3], [2, -2]];

function wordmark(text) {
  let x = 6;
  const letters = [];
  let appleDone = false;
  [...text].forEach((ch, i) => {
    const g = G[ch];
    const [dy, rot] = BOUNCE[i % BOUNCE.length];
    const L = { x, dy, rot, cx: g.w / 2, strokes: g.d.map(d => ({ d })), deco: [] };
    if (g.deco === 'leaf') L.deco.push(leaf(7.5, 22, 28, 0.95));
    // First "o" in Food becomes a little apple: warm ring + stem + leaf.
    if (ch === 'o' && !appleDone) {
      appleDone = true;
      L.strokes[0].color = APPLE;
      L.deco.push(`<path d="M25 27 C25 21 27 17 31 14" stroke="${STEM}" stroke-width="4.5" stroke-linecap="round" fill="none"/>`);
      L.deco.push(leaf(30, 16, 62, 0.66));
    }
    letters.push(L);
    x += g.w + KERN;
  });
  const W = Math.ceil(x - KERN + 10);
  const place = (L, dx, dy) => `translate(${L.x + dx} ${L.dy + dy}) rotate(${L.rot} ${L.cx} 50)`;
  const shadow = letters.map(L => `<g transform="${place(L, 2.5, 4)}">${L.strokes.map(s => `<path d="${s.d}"/>`).join('')}</g>`).join('\n');
  const ink = letters.map(L => `<g transform="${place(L, 0, 0)}">${L.strokes.map(s =>
    `<path d="${s.d}" stroke="${s.color || INK}"/>`).join('')}${L.deco.join('')}</g>`).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -6 ${W} 120" role="img" aria-label="${text}">
<g fill="none" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round">
<g stroke="${SHADOW}">${shadow}</g>
${ink}
</g>
</svg>\n`;
}

// Logo mark: a map pin that's also a blackberry, with a leaf on top.
function mark() {
  const berries = [[24, 26], [36, 26], [18, 35], [30, 35], [42, 35], [24, 44], [36, 44], [30, 52]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.6" fill="#4a1d3f"/><circle cx="${x - 1.6}" cy="${y - 1.8}" r="1.6" fill="#fff" opacity=".45"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" role="img" aria-label="Food Caching">
<path d="M32 79 C32 79 10 55 10 38 A22 22 0 0 1 54 38 C54 55 32 79 32 79 Z" fill="${SHADOW}" opacity=".35"/>
<path d="M30 76 C30 76 8 52 8 35 A22 22 0 0 1 52 35 C52 52 30 76 30 76 Z" fill="#8e3b6e" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
${berries}
<path d="M30 13 C30 9 31 6 33 3" stroke="${STEM}" stroke-width="3" stroke-linecap="round" fill="none"/>
<path d="M31 12 C35 2 47 0 54 4 C49 12 39 15 31 12 Z" fill="${LEAF}" stroke="#5f8f3a" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M31 12 C29 5 20 1 12 4 C16 11 24 14 31 12 Z" fill="#8cc152" stroke="#5f8f3a" stroke-width="1.5" stroke-linejoin="round"/>
</svg>\n`;
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
fs.mkdirSync(path.join(root, 'img'), { recursive: true });
fs.writeFileSync(path.join(root, 'img', 'wordmark.svg'), wordmark('Food Caching'));
fs.writeFileSync(path.join(root, 'img', 'mark.svg'), mark());
console.log('wrote img/wordmark.svg and img/mark.svg');
