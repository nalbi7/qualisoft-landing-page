// 사례 순서 — 언어마다 그 지역에서 잘 알려진 고객의 사례가 맨 앞에 온다 (D-026). 사례 파일의 first 에 그 언어가 있으면 앞, 그다음은 order
// 한국어 LS전선 · 영어 EMS · 일본어와 중국어 마키노. 홈 사례 카드 · 고객 사례 목록 · 솔루션 「관련 사례」 · 기사 「다른 사례」가 같이 쓴다
import { getCollection, type CollectionEntry } from 'astro:content';
import { DEFAULT_LOCALE } from './locales.mjs';
import { logoById, logoName, type Logo } from './customers';
import SCOPES from './case-scopes.json';
type Case = CollectionEntry<'cases'>;
export function sortCases(list: Case[], locale?: string): Case[] {
  const loc = (locale ?? DEFAULT_LOCALE) as Case['data']['first'][number];
  const rank = (c: Case) => (c.data.first.includes(loc) ? 0 : 1000) + c.data.order;
  return [...list].sort((a, b) => rank(a) - rank(b));
}
export const casesFor = async (locale?: string) => sortCases(await getCollection('cases'), locale);

// 구축 범위 카드 — 사내 기록이 없어 기사를 쓰지 않는 고객의, 구 사이트에 공개된 구축 범위 (case-scopes.json, D-027)
// 고객 사례 목록의 「더 많은 구축 사례」. 순서는 사례와 같은 규칙 — first 에 그 언어가 있으면 앞, 그다음은 파일 순서
type L10n = { ko: string; en?: string; ja?: string; 'zh-hans'?: string };
export type CaseScope = { customer: string; first?: string[]; name?: L10n; industry: L10n; product: string; period?: L10n; scope: L10n[]; logo: Logo };
const SCOPE_LIST: CaseScope[] = (SCOPES as Omit<CaseScope, 'logo'>[]).map((s) => ({ ...s, logo: logoById(s.customer) }));
export const scopeName = (s: CaseScope, locale?: string) =>
  s.name ? (s.name[(locale ?? DEFAULT_LOCALE) as keyof L10n] ?? s.name.en ?? s.name.ko) : logoName(s.logo, locale);
export function scopesFor(locale?: string): CaseScope[] {
  const loc = locale ?? DEFAULT_LOCALE;
  const rank = (s: CaseScope, i: number) => (s.first?.includes(loc) ? 0 : 1000) + i;
  return SCOPE_LIST.map((s, i) => [s, rank(s, i)] as const).sort((a, b) => a[1] - b[1]).map(([s]) => s);
}
