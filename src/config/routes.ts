// 주소 한 곳 (Route Registry) — 헤더 · 푸터 · 페이지 · 빌드 검사가 같이 읽는다. 원본은 Docs/14-information-architecture.md §3.
// 내부 링크는 url() 을 거친다 — 출시 전 미리보기는 /<저장소>/ 아래에서 열린다 (16-tech-architecture §6)
export const SOLUTION_SLUGS = [
  'dynamics-365-crm',
  'project-operations',
  'customer-insights',
  'power-bi-fabric',
  'power-platform',
  'copilot',
] as const;
export type SolutionSlug = (typeof SOLUTION_SLUGS)[number];

import { DEFAULT_LOCALE, LOCALES } from './locales.mjs';

// 파일 주소(그림 · 아이콘)와 언어가 없는 주소 — 기준 경로만 붙인다
export function url(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

// 페이지 주소 — 그 언어의 접두어를 붙인다. 한국어는 접두어가 없다 (IA §9: /en/ · /ja/ · /zh-hans/)
export function lurl(path: string, locale?: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return url(!locale || locale === DEFAULT_LOCALE ? p : `/${locale}${p}`);
}

// 지금 주소에서 기준 경로와 언어 접두어를 뗀 페이지 경로 — 언어 메뉴 · 배너 · hreflang 이 같은 페이지의 다른 언어판을 잇는다
export function pagePath(pathname: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  let p = base && pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname;
  for (const l of LOCALES) if (l.code !== DEFAULT_LOCALE && (p === `/${l.code}` || p.startsWith(`/${l.code}/`))) p = p.slice(l.code.length + 1) || '/';
  // 404 는 언어 공용 한 장이고 자기 주소가 없다 — 다른 언어판은 그 언어의 홈 (IA §9 「언어판이 없는 페이지」)
  return /^\/404(\.html|\/)?$/.test(p) ? '/' : p;
}

export const ROUTES = {
  home: '/',
  products: '/#products',
  privacy: '/privacy/',
  terms: '/terms/',
  customers: '/customers/',
  case: (slug: string) => `/customers/${slug}/`,
  solution: (slug: SolutionSlug) => `/solutions/${slug}/`,
} as const;

// 사례 기사는 content/cases/ 의 편만 싣는다 (H-02 · BD-036). 0편이면 목록 · 헤더 링크 · 홈 사례 카드를 함께 끈다 (IA 7항)
export const PUBLISHED_CASES: readonly string[] = Object.keys(import.meta.glob('../content/cases/*.json')).map((p) => p.replace(/^.*\/|\.json$/g, ''));
export const HAS_CASES = PUBLISHED_CASES.length > 0;
