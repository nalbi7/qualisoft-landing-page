// 디자인 단계 산출물을 사이트로 옮긴다 — 값을 다시 적지 않고 파일을 그대로 복사한다 (Docs/_build/build-rules.md §2).
// 원본은 공개 저장소 밖의 기획 폴더 ../Docs/_design 이다 (Docs/16-tech-architecture.md §5). 기획 폴더가 없으면(저장소만 받은 경우) 건너뛴다.
//   node scripts/sync-design.mjs           복사
//   node scripts/sync-design.mjs --check   복사본이 원본과 같은지만 본다 — 다르면 실패 (빌드 검사가 부른다)
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const design = join(root, '..', 'Docs', '_design');
const check = process.argv.includes('--check');

// [원본(_design 기준), 복사본(site 기준)]
const FILES = [
  ['tokens.css', 'src/styles/tokens.css'],
  ['components.css', 'src/styles/components.css'],
  ['tools/journey_v7.css', 'src/styles/journey.css'],     // v7 예시 화면 규칙 — extract_journey_v7.py 가 만든다
  ['tools/art3d.html', 'src/components/art3d.html'],      // 솔루션 판 입체 그림 — art3d.py 가 만든다
];
// 고객 로고는 게재가 확인된 곳만 (H-05) — 시안 홈의 로고 띠와 같은 목록. 나머지 로고 파일은 공개 저장소에 넣지 않는다
const CUSTOMERS = JSON.parse(readFileSync(join(root, 'src/config/customer-logos.json'), 'utf8')).map((l) => `customers/img_logo_${l.file}`);
const BRAND = ['brand/copilot.svg', 'brand/ver1-logo.png', 'brand/ver2-logo-dynamics365.png'];

if (!existsSync(design)) {
  console.log('sync-design: 기획 폴더가 없어 건너뜁니다 —', design);
  process.exit(0);
}
const ms = readdirSync(join(design, 'assets', 'ms')).map((f) => `ms/${f}`);   // MS 공식 아이콘 — 원본 그대로 (D-014 · M-08)
const pairs = [...FILES, ...[...BRAND, ...CUSTOMERS, ...ms].map((a) => [`assets/${a}`, `public/assets/${a}`])];

let diff = 0;
for (const [from, to] of pairs) {
  const src = readFileSync(join(design, from));
  const dst = join(root, to);
  const same = existsSync(dst) && Buffer.compare(src, readFileSync(dst)) === 0;
  if (same) continue;
  if (check) { console.error('sync-design: 원본과 다릅니다 —', to); diff++; continue; }
  mkdirSync(dirname(dst), { recursive: true });
  writeFileSync(dst, src);
  console.log('sync-design: 복사', from, '→', to);
}
if (check && diff) process.exit(1);
console.log(`sync-design: ${check ? '확인' : '완료'} — ${pairs.length}개`);
