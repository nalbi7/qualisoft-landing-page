// Microsoft 공식 · 제품 페이지 주소 — 콘텐츠에는 언어와 상관없는 경로만 두고 언어별 접두어를 여기서 붙인다
// (15-content-model 5-4 「언어별 ko-kr · en-us · ja-jp · zh-cn」). 접두어는 config/locales.mjs 의 ms 값
import { ALL_LOCALES, DEFAULT_LOCALE } from '../../config/locales.mjs';
import type { Locale } from '../../i18n';
const msLocale = (locale?: Locale) => (ALL_LOCALES.find((l) => l.code === (locale ?? DEFAULT_LOCALE)) ?? ALL_LOCALES[0]).ms;
export const msUrl = (path: string, locale?: Locale) => `https://www.microsoft.com/${msLocale(locale)}/${path}`;
// Dynamics 365 매뉴얼(고객지원 창) — Microsoft Learn 의 같은 언어판
export const learnUrl = (locale?: Locale) => `https://learn.microsoft.com/${msLocale(locale)}/dynamics365/sales/`;
// 핵심 기능 그림의 출처 — 그림을 가져온 Microsoft Learn 문서의 같은 언어판 (config/learn-shots.json 의 page)
export const learnPage = (path: string, locale?: Locale) => `https://learn.microsoft.com/${msLocale(locale)}/${path}`;
