// 공유 미리보기 그림(og:image) 만들기 — 공통 1장 + 솔루션별 6장, 1200×630 PNG (19-seo-spec §3, D-040).
// 그림 안에 글자를 넣지 않는다 — 언어마다 따로 만들지 않고, 이름은 og:title 이 보인다. 재료는 사이트에 이미 있는 솔루션 아이콘(MS 공식 원본)과 솔루션 색.
// 솔루션 · 색 · 아이콘을 바꾸면 다시 돌린다: node scripts/make-og.mjs → public/assets/og/*.png
import sharp from 'sharp';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
const out = join(pub, 'assets/og');
mkdirSync(out, { recursive: true });

// 솔루션 색 — tokens.css 의 --s1 … --s5 와 같은 값. Copilot 은 --s5-grad
const TOKENS = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8');
const tok = (name) => TOKENS.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1];
const COP = ['#7DE3FF', '#B69CFF', '#FF9ECF'];

const W = 1200, H = 630;
const mix = (hex, k) => {   // 흰색과 섞기 — 밝은 화면의 판(color-mix 55% white)과 비슷하게
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * k + 255 * (1 - k)));
  return `rgb(${c.join(',')})`;
};
const svgData = (path) => `data:image/svg+xml;base64,${readFileSync(join(pub, path)).toString('base64')}`;
const tile = (x, y, s, icon, r = 0.22) =>
  `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s * r}" fill="#fff" filter="url(#sh)"/>` +
  `<image href="${svgData(icon)}" x="${x + s * 0.2}" y="${y + s * 0.2}" width="${s * 0.6}" height="${s * 0.6}"/>`;
const shadow = `<filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#14142B" flood-opacity=".14"/></filter>`;

const sols = readdirSync(join(root, 'src/content/solutions'))
  .map((f) => ({ id: f.replace(/\.json$/, ''), ...JSON.parse(readFileSync(join(root, 'src/content/solutions', f), 'utf8')) }))
  .sort((a, b) => a.order - b.order);

async function write(name, svg) {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(join(out, `${name}.png`));
  console.log(`og: ${name}.png`);
}

// 공통 — 연한 보랏빛 바탕에 여섯 솔루션 아이콘
{
  const s = 132, gap = 36, total = sols.length * s + (sols.length - 1) * gap;
  const x0 = (W - total) / 2, y = (H - s) / 2;
  await write('default', `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${shadow}
    <radialGradient id="g" cx="50%" cy="0%" r="90%"><stop offset="0" stop-color="#E7E4FF"/><stop offset="1" stop-color="#F7F7FA"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>${sols.map((x, i) => tile(x0 + i * (s + gap), y, s, x.icon)).join('')}</svg>`);
}

// 솔루션별 — 솔루션 색 바탕에 그 솔루션 아이콘 하나
for (const x of sols) {
  const s = 300, bx = (W - s) / 2, by = (H - s) / 2;
  const hex = x.color.match(/--(s\d)\)/) ? tok(x.color.match(/--(s\d)\)/)[1]) : null;
  const bg = hex
    ? `<rect width="${W}" height="${H}" fill="${mix(hex, 0.55)}"/>`
    : `<defs><linearGradient id="cg" x1="0" x2="1">${COP.map((c, i) => `<stop offset="${[0, 0.55, 1][i]}" stop-color="${mix(c, 0.7)}"/>`).join('')}</linearGradient></defs><rect width="${W}" height="${H}" fill="url(#cg)"/>`;
  await write(x.id, `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${shadow}</defs>${bg}${tile(bx, by, s, x.icon, 0.24)}</svg>`);
}
