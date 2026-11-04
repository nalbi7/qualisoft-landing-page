// 고객 로고 목록 읽기 — config/customer-logos.json (시안 v7 고객 43곳에서 인포유앤컴퍼니 명의 수행 4곳을 뺀 39곳, BD-035)
// w · h 는 원본 그림 크기 — <img> 의 width · height 로 넣어 그림이 오기 전에 자리를 잡는다 (BD-041).
// 이름은 그 언어로(없으면 영어), 흰 로고(onDark)는 밝은 바탕에서 어둡게 칠한다(layout.css img.on-dark). 바탕 상자가 있는 흰 로고(알트소프트 · 해맑음)는 칠하지 않는다 — 검은 상자가 된다
import LOGOS from './customer-logos.json';
import { url } from './routes';
export type Logo = (typeof LOGOS)[number] & { ja?: string; 'zh-hans'?: string; onDark?: boolean };
export const LOGO_LIST = LOGOS as Logo[];
export const logoId = (l: Logo) => l.file.replace(/\.\w+$/, '');
export const logoSrc = (l: Logo) => url(`/assets/customers/img_logo_${l.file}`);
export const logoName = (l: Logo, locale?: string) =>
  !locale || locale === 'ko' ? l.name : (l[locale as 'ja' | 'zh-hans'] ?? l.en);
export function logoById(id: string): Logo {
  const l = LOGO_LIST.find((x) => logoId(x) === id);
  if (!l) throw new Error(`고객 로고 「${id}」가 customer-logos.json 에 없다`);
  return l;
}

// 산업 — 로고를 산업별로 묶어 보인다 (D-029, 구 사이트 dynamics365.co.kr 「Construction Case」와 같은 방식). 순서는 고객 수가 많은 쪽부터
export const INDUSTRIES = ['mfg', 'pharma', 'public', 'it', 'chem', 'retail'] as const;
export type Industry = (typeof INDUSTRIES)[number];
export const logosByIndustry = () =>
  INDUSTRIES.map((ind) => ({ ind, logos: LOGO_LIST.filter((l) => l.ind === ind) })).filter((g) => g.logos.length > 0);
