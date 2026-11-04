// 구 주소 이동 — 404 페이지가 들어온 주소를 대응표(config/legacy-redirects.json)에서 찾아 새 주소로 옮긴다 (19-seo-spec §6 · M-03).
// GitHub Pages는 서버 301이 없어 사람 방문자를 옮기는 장치로만 본다. 모르는 주소면 아무것도 하지 않고 404 안내가 그대로 보인다.
// 대응표의 `_note` 는 싣지 않는다 — 이름으로 rules 만 가져와 번들에서 빠진다
import { rules } from '../config/legacy-redirects.json';
import { url } from '../config/routes';

const DELAY = 1200;   // 「새 주소로 이동합니다」를 읽을 짧은 틈. 움직임 줄이기면 곧바로 옮긴다
const table = rules as Record<string, string>;

// 사이트 기준 경로 — 미리보기는 /<저장소>/ 아래에서 열리므로 BASE_PATH 를 뗀다
function sitePath(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  let p = location.pathname;
  try { p = decodeURI(p); } catch { /* 잘못된 인코딩이면 받은 그대로 */ }
  if (base && (p === base || p.startsWith(`${base}/`))) p = p.slice(base.length) || '/';
  return p;
}

// 「경로?쿼리」 → 「경로」 → 끝 슬래시를 붙인 경로 순으로 찾는다
function lookup(p: string): string | undefined {
  const keys = [p + location.search, p];
  if (!p.endsWith('/') && !/\.[a-z0-9]+$/i.test(p)) keys.push(`${p}/`);
  for (const k of keys) if (Object.hasOwn(table, k)) return table[k];
  return undefined;
}

const to = lookup(sitePath());
const move = document.getElementById('nf-move');
const not = document.getElementById('nf-not');
const link = document.getElementById('nf-to') as HTMLAnchorElement | null;
if (to !== undefined && move && not && link) {
  const target = url(to);
  link.href = target;
  not.hidden = true;
  move.hidden = false;
  const now = matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(() => location.replace(target), now ? 0 : DELAY);
}
