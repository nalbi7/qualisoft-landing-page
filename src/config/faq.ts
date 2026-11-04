// 자주 묻는 질문 (AEO) — 질문은 실제로 받는 꼴(질문형 소제목)로, 답은 첫 문장에 바로 (D-040, 19-seo-spec §9 ③).
// 답의 내용은 사이트에 이미 실린 것에서만 엮는다 — 솔루션 설명(lead) · 퀄리소프트가 하는 일(we) · 함께한 기업 · 사례 기사 · 「이렇게 일합니다」 · 회사 정보.
// 새 사실 · 숫자를 쓰지 않는다(N-06): 숫자는 이 사이트에 실린 고객사 · 기사 · 솔루션을 센 것뿐이다. 문구 틀은 i18n/<언어>/faq.json
// 같은 항목으로 본문(components/Faq.astro)과 FAQPage 구조화 데이터를 함께 만든다 — 사람이 보는 답과 기계가 읽는 답이 어긋나지 않는다
import { getCollection, type CollectionEntry } from 'astro:content';
import { useT, tx } from '../i18n';
import { COMPANY, LINKS, DEMO_URL } from './site';
import { DEFAULT_LOCALE } from './locales.mjs';
import { lurl, ROUTES, type SolutionSlug } from './routes';
import { casesFor } from './cases';
import { logoById, logoName } from './customers';

export type FaqLink = { text: string; href?: string; ext?: boolean };
export type FaqItem = {
  q: string;
  a: string;                 // 첫 문장 — 질문에 대한 바로 그 답
  list?: FaqLink[];          // 답을 받치는 목록(글머리 · 번호)
  ordered?: boolean;
  after?: string;            // 목록 앞에 한 문장 더
  more?: FaqLink;            // 더 볼 곳
  todo?: { text: string; why: string };   // 정해지지 않은 덧붙임 — 본문에만 data-todo 로, 구조화 데이터에는 넣지 않는다
};

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? `{${k}}`));
// 사례 한 줄 — 「고객사 — 산업 대표 솔루션」으로 짧게 (D-044, 예: LS전선 — 제조산업 Project Operations). 긴 제목은 기사 안에 있다.
// 산업은 고객 로고의 산업(config/customer-logos.json ind — 고객 사례 목록의 산업 묶음과 같다), 이름은 i18n faq.ind.*
async function caseLabeler(loc: string) {
  const t = useT(loc);
  const names = new Map((await getCollection('solutions')).map((s) => [s.id, s.data.name]));
  return (c: CollectionEntry<'cases'>) => {
    const logo = logoById(c.data.customer);
    return `${logoName(logo, loc)} — ${t(`faq.ind.${logo.ind}`)} ${names.get(c.data.solutions[0]) ?? ''}`.trim();
  };
}
// 사례를 숫자로 세어 말하는 것은 다섯 곳을 넘을 때만 (D-044) — 적은 수를 내세우지 않는다
const COUNT_FROM = 6;

function howItem(loc: string, q: string): FaqItem {
  const t = useT(loc);
  const steps = t('home.how.steps', true);
  const desc = t('home.how.desc', true);
  return {
    q, a: fill(t('faq.how.a'), { steps: steps.join(t('faq.sep')) }),
    list: steps.map((s, i) => ({ text: `${s} — ${desc[i]}` })), ordered: true,
  };
}

// 솔루션 상세 — 무엇을 하나 · 퀄리소프트가 하는 일 · 사례 · 진행 방식
export async function solutionFaq(sol: CollectionEntry<'solutions'>, locale?: string): Promise<FaqItem[]> {
  const loc = locale ?? DEFAULT_LOCALE;
  const t = useT(loc);
  const s = sol.data;
  const name = s.name;
  const items: FaqItem[] = [];
  // 정해지지 않은 값(pending — 본문에서는 data-todo 로 감싼 자리)은 FAQ 답으로 쓰지 않는다 — 미정 문장을 질문의 정답처럼 단정하지 않는다 (Copilot: lead · we)
  if (!s.pending?.lead) items.push({ q: fill(t('faq.sol.what.q'), { name }), a: tx(s.lead, loc) });
  if (!s.pending?.we) items.push({ q: fill(t('faq.sol.we.q'), { name }), a: fill(t('faq.sol.we.a'), { name }), list: s.we.map((w) => ({ text: tx(w, loc) })), ordered: true });
  // 「함께한 기업」과 같은 셈 — 이 솔루션의 사례 기사 고객 + 솔루션 파일의 고객 (components/solution/Customers.astro)
  const related = (await casesFor(loc)).filter((c) => (c.data.solutions as string[]).includes(sol.id));
  const count = new Set([...related.map((c) => c.data.customer), ...(s.customers ?? [])]).size;
  const caseLabel = await caseLabeler(loc);
  if (count > 0) items.push({
    q: fill(t('faq.sol.cases.q'), { name }), a: fill(t(count >= COUNT_FROM ? 'faq.sol.cases.a' : 'faq.sol.cases.a_few'), { name, count }),
    ...(related.length ? { after: t('faq.sol.cases.read'), list: related.map((c) => ({ text: caseLabel(c), href: lurl(ROUTES.case(c.id), loc) })) } : {}),
  });
  items.push(howItem(loc, fill(t('faq.sol.how.q'), { name })));
  return items;
}

// 홈 — 어떤 회사 · 어떤 솔루션 · 진행 방식 · 사례 · 상담
export async function homeFaq(locale?: string): Promise<FaqItem[]> {
  const loc = locale ?? DEFAULT_LOCALE;
  const t = useT(loc);
  const ko = loc === DEFAULT_LOCALE;
  const sols = (await getCollection('solutions')).sort((a, b) => a.data.order - b.data.order);
  const cases = await casesFor(loc);
  const caseLabel = await caseLabeler(loc);
  const items: FaqItem[] = [
    { q: t('faq.home.d365.q'), a: t('faq.home.d365.a') },
    {
      // 솔루션 — 개수를 말하지 않고, 하는 일을 짧게(area) (D-044)
      q: t('faq.home.sols.q'), a: t('faq.home.sols.a'),
      list: sols.map((s) => ({ text: `${s.data.name} — ${tx(s.data.area ?? s.data.short, loc)}`, href: lurl(ROUTES.solution(s.id as SolutionSlug), loc) })),
    },
    // 구 랜딩(dynamics365.co.kr)의 내용 — 검색 신호를 잇게 질문으로 옮겼다 (D-046). 겹친 것을 합치고 금지 표현 · 옛 제품명을 고쳤다(i18n faq.json)
    ...(['m365', 'custom', 'data', 'mobile', 'cloud'] as const).map((k) => ({ q: t(`faq.home.${k}.q`), a: t(`faq.home.${k}.a`) })),
    howItem(loc, t('faq.how.q')),
  ];
  if (cases.length) items.push({
    q: t('faq.home.cases.q'), a: fill(t('faq.home.cases.a'), { page: t('nav.customers') }),
    list: cases.map((c) => ({ text: caseLabel(c), href: lurl(ROUTES.case(c.id), loc) })),
    more: { text: t('faq.home.cases.more'), href: lurl(ROUTES.customers, loc) },
  });
  const channels: FaqLink[] = [
    ...(DEMO_URL ? [{ text: t('common.demo'), href: DEMO_URL, ext: true }] : []),
    { text: `${t('common.tel')} ${ko ? COMPANY.tel : COMPANY.telIntl}`, href: COMPANY.telHref },
    ...(ko ? [{ text: t('support.kakao'), href: LINKS.kakao, ext: true }] : []),
  ];
  // 회사 소개 — 구 사이트의 회사 소개 문장 그대로 (사용자 지시 D-044). 사명 · 주소 · 전화 목록은 뺐다 — 푸터에 있다.
  // 자리는 상담 바로 위 (사용자 지시 2026-11-04, BD-074 — 처음에는 맨 앞이었다)
  items.push({ q: t('faq.home.who.q'), a: t('faq.home.who.a') });
  items.push({
    q: t('faq.home.contact.q'), a: t('faq.home.contact.a'), list: channels,
    // 일 · 중 화면의 상담 언어 안내 — 히어로 · 마감 띠와 같은 글, 확인 전(H-06)
    ...(t.has('common.consult') ? { todo: { text: t('common.consult'), why: '상담 가능 언어 확인 (H-06)' } } : {}),
  });
  return items;
}

// FAQPage 구조화 데이터 — 본문과 같은 글. 정해지지 않은 덧붙임(todo)은 넣지 않는다
export function faqJsonLd(items: FaqItem[]) {
  const text = (i: FaqItem) => [i.a, i.after, ...(i.list ?? []).map((l) => l.text)].filter(Boolean).join('\n');
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: text(i) } })),
  };
}
