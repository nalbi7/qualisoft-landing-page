// 빌드 뒤 검사 — 실패하면 배포하지 않는다 (Docs/16-tech-architecture.md §13 · Docs/17-dev-standard.md §5 · Docs/18-qa-test-plan.md)
//   ① 디자인 복사본이 원본과 같다  ② 시안 표식 · 확인 필요 글자가 없다  ③ 내부 링크 · 파일이 모두 있다
//   ④ 동의 전 바깥 요청이 0건이다  ⑤ 자원 예산 (압축 크기, 제안 기준 §11)
//   ⑥ 검색 표시 — title · description 고유, canonical 절대 주소, sitemap 에 404 · 검색 제외 쪽 없음, JSON-LD 해석 (18-qa-test-plan §6 ⑧)
//   ⑦ 언어판 — lang · hreflang · x-default, 외국어 쪽에 남은 한글 (D-024)
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, process.env.OUT_DIR || 'dist');
const base = (process.env.BASE_PATH || '/').replace(/\/?$/, '/');
const errors = [], warnings = [];

// ① 디자인 복사본
try { execFileSync(process.execPath, [join(root, 'scripts/sync-design.mjs'), '--check'], { stdio: 'pipe' }); }
catch (e) { errors.push(`디자인 복사본이 원본과 다르다 — npm run sync:design\n${e.stdout}${e.stderr}`); }

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(dist);
const html = files.filter((f) => f.endsWith('.html'));
const kb = (n) => `${(n / 1024).toFixed(1)}KB`;
const gz = (f) => gzipSync(readFileSync(f)).length;

// ② 공개 빌드에 남으면 안 되는 글자 (17-dev-standard §5 — 「확인 필요」가 나오면 실패)
const FORBIDDEN = ['확인 필요', 'TODO(', '가안', '시안 안내', 'class="todo"', 'mockup-flag', 'Lorem ipsum', '<도메인>', '&lt;도메인&gt;', 'mailto:'];
// 정해지지 않은 값은 data-todo 로 표시해 두고 공개 빌드를 막는다. 미리보기 빌드만 ALLOW_TODO=1 로 경고로 내린다
const allowTodo = process.env.ALLOW_TODO === '1';
const noindexAll = process.env.PUBLIC_NOINDEX === 'true';
// 검색에 열린 빌드(공개)에서는 미정 값을 받지 않는다 — ALLOW_TODO 는 검색 제외 미리보기에서만 (deploy.yml)
if (allowTodo && !noindexAll) errors.push('ALLOW_TODO=1 은 PUBLIC_NOINDEX=true(출시 전 미리보기)일 때만 쓸 수 있다');
// 사이트에 이메일 주소를 싣지 않는다 (R-09) — 태그 · 스크립트를 걷어 낸 글자에서 찾는다
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;
const textOf = (h) => h.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ');
for (const f of html) {
  const s = readFileSync(f, 'utf8');
  for (const w of FORBIDDEN) if (s.includes(w)) errors.push(`${relative(dist, f)} — 남으면 안 되는 글자 「${w}」`);
  for (const [, why] of s.matchAll(/data-todo="([^"]*)"/g)) (allowTodo ? warnings : errors).push(`${relative(dist, f)} — 정해지지 않은 값: ${why}`);
  const mail = textOf(s).match(EMAIL);
  if (mail) errors.push(`${relative(dist, f)} — 이메일 주소 ${mail[0]} (R-09)`);
  if (s.includes('href="#demo"')) warnings.push(`${relative(dist, f)} — 데모 신청 주소가 시안용 #demo 다 (PUBLIC_DEMO_URL, H-01)`);

  // ③ 내부 링크 · 파일
  for (const [, ref] of s.matchAll(/(?:href|src)="([^"#?]+)[^"]*"/g)) {
    if (!ref.startsWith(base) || ref.startsWith('//')) continue;
    const p = join(dist, decodeURIComponent(ref.slice(base.length)));
    const ok = existsSync(p) && (statSync(p).isFile() || existsSync(join(p, 'index.html')));
    if (!ok) errors.push(`${relative(dist, f)} — 없는 내부 주소 ${ref}`);
  }
  // ④ 동의 전 바깥 요청 0건 — 바깥 글꼴 · 스크립트 · 그림을 싣지 않는다 (§11)
  for (const [, tag, attrs] of s.matchAll(/<(script|img|link|iframe|source|video|audio)\b([^>]*)>/g)) {
    const ref = attrs.match(/\b(?:src|href|srcset)="((?:https?:)?\/\/[^"]+)"/)?.[1];
    if (!ref) continue;
    if (tag === 'link' && !/rel="(stylesheet|preload|modulepreload|icon)"/.test(attrs)) continue;   // canonical · alternate 는 요청이 아니다
    errors.push(`${relative(dist, f)} — 동의 전 바깥 요청 <${tag}> ${ref}`);
  }
}

// ⑥ 검색 표시 (19-seo-spec §3 · §5 · §7)
const pages = html.map((f) => {
  const s = readFileSync(f, 'utf8');
  const meta = (n) => s.match(new RegExp(`<meta name="${n}" content="([^"]*)"`))?.[1];
  return { f, rel: relative(dist, f), s, title: s.match(/<title>([^<]*)<\/title>/)?.[1], desc: meta('description'),
    noindex: /<meta name="robots" content="[^"]*noindex/.test(s), canonical: s.match(/<link rel="canonical" href="([^"]+)"/)?.[1] };
});
const dup = (key) => {
  const seen = new Map();
  for (const p of pages.filter((x) => !x.noindex || noindexAll)) {
    if (!p[key]) { errors.push(`${p.rel} — ${key} 이 없다`); continue; }
    const sharedHomeTitle = key === 'title' && p[key] === 'Dynamics 365 Implementation' && /^(en|ja|zh-hans)[\\/]index\.html$/.test(p.rel);
    if (sharedHomeTitle) continue; // 사용자 요청으로 세 언어의 메인 제목은 동일하다
    if (seen.has(p[key])) errors.push(`${p.rel} — ${key} 가 ${seen.get(p[key])} 와 같다: ${p[key]}`); else seen.set(p[key], p.rel);
  }
};
dup('title'); dup('desc');
for (const p of pages) {
  if (p.noindex && p.canonical) errors.push(`${p.rel} — 검색 제외 쪽인데 canonical 이 있다`);
  if (!p.noindex && !/^https?:\/\//.test(p.canonical ?? '')) errors.push(`${p.rel} — canonical 이 절대 주소가 아니다`);
  for (const [, j] of p.s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(j); } catch (e) { errors.push(`${p.rel} — JSON-LD 를 해석하지 못한다: ${e.message}`); }
  }
}
// ⑦ 언어판 (14-information-architecture §9 · 19-seo-spec §3) — 주소 접두어와 lang 이 맞고, hreflang 이 있는 쪽을 가리키며 x-default 가 있다.
//    외국어 쪽 본문에 한글이 남으면 번역이 빠진 것이다 — 대표 이름 · 언어 메뉴의 「한국어」 · lang="ko" 로 표시한 원문만 예외 (태그 속성 · 스크립트는 보지 않는다)
const LANG_OF = { en: 'en', ja: 'ja', 'zh-hans': 'zh-Hans' };
const HANGUL_OK = ['변유신', '한국어'];
for (const p of pages) {
  const prefix = p.rel.split(/[\\/]/)[0];
  const want = LANG_OF[prefix] ?? 'ko';
  const lang = p.s.match(/<html lang="([^"]+)"/)?.[1];
  if (lang !== want) errors.push(`${p.rel} — <html lang="${lang}"> 인데 이 주소는 ${want}`);
  const alts = [...p.s.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)];
  if (alts.length && !alts.some(([, h]) => h === 'x-default')) errors.push(`${p.rel} — hreflang x-default 가 없다`);
  for (const [, h, href] of alts) {
    const path = decodeURIComponent(new URL(href).pathname);
    const local = path.startsWith(base) ? join(dist, path.slice(base.length), 'index.html') : null;
    if (!local || !existsSync(local)) errors.push(`${p.rel} — hreflang ${h} 가 없는 쪽을 가리킨다: ${href}`);
  }
  if (want !== 'ko') {
    // 원문이 한국어인 글(소식 제목 등)은 lang="ko" 로 표시돼 있다 — 그 안은 보지 않는다
    const body = p.s.replace(/<(\w+)\b[^>]*\blang="ko"[^>]*>[^<]*<\/\1>/g, ' ');
    const left = textOf(body).match(/[가-힣]+(?:\s+[가-힣]+)*/g)?.filter((x) => !HANGUL_OK.includes(x)) ?? [];
    if (left.length) errors.push(`${p.rel} — 번역되지 않은 한글: ${[...new Set(left)].slice(0, 5).join(' / ')}`);
  }
}

// sitemap — 404 와 (전체 검색 제외가 아닐 때) 검색 제외 쪽이 들어 있으면 안 된다
const sitemapUrls = files.filter((f) => /sitemap-\d+\.xml$/.test(f)).flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
if (!sitemapUrls.length) errors.push('sitemap 에 주소가 없다');
for (const u of sitemapUrls) {
  const path = new URL(u).pathname;
  if (/404/.test(path)) errors.push(`sitemap 에 404 가 있다 — ${u}`);
  const p = pages.find((x) => x.canonical && new URL(x.canonical).pathname === path);
  if (!p && !noindexAll) errors.push(`sitemap 주소에 맞는 쪽이 없다 — ${u}`);
  if (p?.noindex && !noindexAll) errors.push(`sitemap 에 검색 제외 쪽이 있다 — ${u}`);
}

// ⑤ 자원 예산 — 압축 전송 크기 (16-tech-architecture §11, 제안 기준)
const BUDGET = { html: 50 * 1024, cssTotal: 30 * 1024, jsPage: 20 * 1024 };
for (const f of html) if (gz(f) > BUDGET.html) errors.push(`${relative(dist, f)} — HTML ${kb(gz(f))} > ${kb(BUDGET.html)}`);
const css = files.filter((f) => extname(f) === '.css').reduce((n, f) => n + gz(f), 0);
if (css > BUDGET.cssTotal) errors.push(`CSS 전체 ${kb(css)} > ${kb(BUDGET.cssTotal)}`);
for (const f of html) {
  const s = readFileSync(f, 'utf8');
  const js = [...s.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)].map(([, r]) => join(dist, r.slice(base.length)))
    .filter(existsSync).reduce((n, p) => n + gz(p), 0) + [...s.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .filter(([m]) => !m.includes('application/ld+json')).reduce((n, [, c]) => n + gzipSync(c).length, 0);
  if (js > BUDGET.jsPage) errors.push(`${relative(dist, f)} — JS ${kb(js)} > ${kb(BUDGET.jsPage)}`);
  console.log(`  ${relative(dist, f).padEnd(34)} HTML ${kb(gz(f)).padStart(7)} · JS ${kb(js).padStart(6)}`);
}
console.log(`  CSS 전체 ${kb(css)}`);

[...new Set(warnings)].forEach((w) => console.warn('경고:', w));
if (errors.length) { [...new Set(errors)].forEach((e) => console.error('실패:', e)); process.exit(1); }
console.log(`validate-build: 통과 — HTML ${html.length}쪽`);
