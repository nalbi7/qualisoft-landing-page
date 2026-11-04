// 사이트 빌드(BASE_PATH=/qroot/)를 아티팩트에 올릴 수 있게 바꾼다 — 모든 내부 주소를 상대 경로로, 폴더 주소는 index.html 로,
// 첫 페이지(index.html)는 문서 틀(doctype · html · head · body)을 걷어 낸다(게시 때 틀이 씌워진다).
// 쓰는 법 (site/ 에서, Git Bash) — 데모 신청 주소(토큰 포함)는 빼고 빌드한다. 아티팩트는 링크가 있는 사람 누구나 본다:
//   PUBLIC_DEMO_URL= MSYS_NO_PATHCONV=1 PUBLIC_NOINDEX=true ALLOW_TODO=1 BASE_PATH=/qroot/ OUT_DIR=dist-artifact npm run build
//   node scripts/to-artifact.mjs dist-artifact dist-artifact-rel
//   → dist-artifact-rel/ 의 index.html 을 page, 나머지를 files 로 같은 아티팩트 주소에 게시(한 번에 255개까지라 나눠 올린다)
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';

const [src, out] = process.argv.slice(2);
rmSync(out, { recursive: true, force: true });
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const TOKEN = '/qroot/';
const ren = (t) => t.split('_astro/').join('astro/');

const fixDirLinks = (html) =>
  html.replace(/(\shref=")([^"]*)"/g, (m, a, v) => {
    if (/^(https?:|mailto:|tel:|javascript:|data:|#)/.test(v)) return m;
    const i = v.search(/[?#]/);
    const path = i < 0 ? v : v.slice(0, i), rest = i < 0 ? '' : v.slice(i);
    if (path === '' || path.endsWith('/')) return `${a}${path}index.html${rest}"`;
    return m;
  });

let n = 0;
for (const f of walk(src)) {
  const rel0 = relative(src, f).split(sep).join('/');
  // 아티팩트는 「_」로 시작하는 경로를 받지 않는다 — _astro/ 를 astro/ 로 옮기고 글 안의 참조도 바꾼다
  const rel = rel0.replace(/^_astro\//, 'astro/');
  const dest = join(out, rel);
  mkdirSync(dirname(dest), { recursive: true });
  n++;
  if (rel.endsWith('.html')) {
    const depth = rel.split('/').length - 1;
    const prefix = '../'.repeat(depth);
    let s = readFileSync(f, 'utf8');
    s = s.replace(/(["'(=,\s])\/qroot\//g, `$1${prefix}`);
    s = s.split(TOKEN).join('/');              // 절대 주소(canonical · og) 안의 기준 경로
    s = fixDirLinks(ren(s));
    if (rel === 'index.html') {
      // 첫 페이지 — 틀을 걷어 내고 lang 은 스크립트로 붙인다
      const lang = (s.match(/<html[^>]*\slang="([^"]+)"/) || [])[1] || 'ko';
      s = s.replace(/<!DOCTYPE html>/i, '')
        .replace(/<html[^>]*>/i, '')
        .replace(/<\/html>\s*$/i, '')
        .replace(/<head>/i, '').replace(/<\/head>/i, '')
        .replace(/<body[^>]*>/i, '').replace(/<\/body>/i, '')
        .replace(/<meta charset="utf-8">/i, '')
        .replace(/<meta name="viewport"[^>]*>/i, '');
      s = `<script>document.documentElement.lang=${JSON.stringify(lang)}</script>\n` + s;
    }
    writeFileSync(dest, s);
  } else if (rel.endsWith('.css')) {
    writeFileSync(dest, ren(readFileSync(f, 'utf8').split(TOKEN).join('../')));   // css 는 _astro/ 안에 있다
  } else if (rel.endsWith('.js')) {
    let s = readFileSync(f, 'utf8');
    // 미리 불러오기 도우미 — 기준 경로 + 파일 대신 이 모듈 자리(_astro/)에서 한 칸 위
    s = s.replace('return`/qroot/`+e', 'return new URL(`../`+e,import.meta.url).href');
    if (s.includes(TOKEN)) throw new Error(`기준 경로가 남았다: ${rel}`);
    writeFileSync(dest, ren(s));
  } else if (/\.(txt|xml)$/.test(rel)) {
    writeFileSync(dest, readFileSync(f, 'utf8').split(TOKEN).join('/'));
  } else copyFileSync(f, dest);
}
console.log(`files ${n}`);
