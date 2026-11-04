// 언어 목록 한 곳 — 주소 접두어 · lang · hreflang · og:locale · Microsoft 사이트 언어 (Docs/14-information-architecture.md §9).
// 1차에 네 언어를 다 연다 (D-024). 일 · 중 원어민 검수(M-01) 전에 끄려면 빌드 변수 SITE_LOCALES=ko,en 처럼 켤 언어만 준다 —
// 끈 언어는 페이지 · hreflang · sitemap · 언어 메뉴 · 배너에서 모두 빠진다. 한국어는 늘 켜져 있다
export const DEFAULT_LOCALE = 'ko';
export const ALL_LOCALES = [
  { code: 'ko', lang: 'ko', hreflang: 'ko', og: 'ko_KR', ms: 'ko-kr', label: '한국어', short: 'KO' },
  { code: 'en', lang: 'en', hreflang: 'en', og: 'en_US', ms: 'en-us', label: 'English', short: 'EN' },
  { code: 'ja', lang: 'ja', hreflang: 'ja', og: 'ja_JP', ms: 'ja-jp', label: '日本語', short: 'JA' },
  { code: 'zh-hans', lang: 'zh-Hans', hreflang: 'zh-Hans', og: 'zh_CN', ms: 'zh-cn', label: '简体中文', short: '中文' },
];

const pick = (globalThis.process?.env?.SITE_LOCALES ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const unknown = pick.filter((c) => !ALL_LOCALES.some((l) => l.code === c));
if (unknown.length) throw new Error(`SITE_LOCALES 에 없는 언어: ${unknown.join(', ')} (가능: ${ALL_LOCALES.map((l) => l.code).join(', ')})`);
export const LOCALES = pick.length ? ALL_LOCALES.filter((l) => l.code === DEFAULT_LOCALE || pick.includes(l.code)) : ALL_LOCALES;

// x-default — 언어를 못 정한 방문자가 갈 곳. 영어판이 꺼져 있으면 한국어 (IA §9)
export const X_DEFAULT = LOCALES.some((l) => l.code === 'en') ? 'en' : DEFAULT_LOCALE;
