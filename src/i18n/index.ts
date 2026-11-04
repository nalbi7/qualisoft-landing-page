// 언어별 UI 문구 — 컴포넌트는 글자를 직접 들지 않고 여기서 받는다 (Docs/16-tech-architecture.md §6).
// 문구 파일은 i18n/<언어>/<화면>.json 으로 나눈다(공통 · 솔루션 · 개인정보 · 예시 화면 …). 키는 「화면.영역.요소」라 파일끼리 겹치지 않는다 (17-dev-standard §3)
// 컴포넌트는 useT(Astro.currentLocale) 로 지금 페이지의 언어를 넘긴다
import { DEFAULT_LOCALE, LOCALES } from '../config/locales.mjs';
type Value = string | string[];
const files = import.meta.glob<Record<string, Value>>('./*/*.json', { eager: true, import: 'default' });
const DICTS: Record<string, Record<string, Value>> = {};
for (const [path, dict] of Object.entries(files)) {
  const code = path.split('/')[1];
  DICTS[code] = Object.assign(DICTS[code] ?? {}, dict);
}
export type Locale = string;
export type Key = string;

// 켠 언어는 한국어 문구의 키를 모두 가져야 한다 — 빠진 문구가 조용히 비거나 한국어로 나가지 않게 빌드를 멈춘다.
// 404 는 언어 공용 한 장이라 notfound.* 는 한국어에만 둔다 (IA §3)
for (const l of LOCALES) {
  const dict = DICTS[l.code];
  if (!dict) throw new Error(`i18n: 「${l.code}」 문구 파일이 없다 (i18n/${l.code}/*.json)`);
  const missing = Object.keys(DICTS[DEFAULT_LOCALE]).filter((k) => !k.startsWith('notfound.') && !(k in dict));
  if (missing.length) throw new Error(`i18n: 「${l.code}」에 없는 문구 ${missing.length}개 — ${missing.slice(0, 5).join(', ')}`);
}

const code = (locale?: Locale) => locale ?? DEFAULT_LOCALE;

// 없는 키는 빌드를 멈춘다 — 빈 글자가 조용히 공개되지 않게
export function useT(locale?: Locale) {
  const c = code(locale);
  const dict = DICTS[c];
  if (!dict) throw new Error(`i18n: 「${c}」 문구 파일이 없다`);
  function t(key: Key): string;
  function t(key: Key, list: true): string[];
  function t(key: Key, list?: true): Value {
    const v = dict[key];
    if (v === undefined) throw new Error(`i18n: 없는 문구 키 「${key}」 (${c})`);
    if (list && !Array.isArray(v)) throw new Error(`i18n: 「${key}」는 목록이 아니다`);
    return v;
  }
  t.has = (key: Key) => key in dict;
  return t;
}

// 콘텐츠의 언어별 글 { ko, en, ja, 'zh-hans' } 에서 지금 언어 글을 꺼낸다. 없으면 빌드를 멈춘다 — 한국어로 대신 채우지 않는다
type Text = { ko: string } & Partial<Record<string, string>>;
export function tx(v: Text, locale?: Locale): string {
  const c = code(locale);
  const s = v[c];
  if (s === undefined) throw new Error(`콘텐츠: 「${c}」 글이 없다 — 「${v.ko.slice(0, 24)}…」`);
  return s;
}
