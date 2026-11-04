// llms.txt — AI(대형 언어 모델)가 사이트를 한 번에 읽도록 회사 · 솔루션 · 사례 · 언어판을 한 장에 (19-seo-spec §9 ②, D-040 — 「1차에는 두지 않는다」를 바꿈).
// 확정된 표준이 아니고 주요 AI 검색이 쓰는지 확인되지 않았다 — 손해 없는 보조 수단으로 둔다(§10). 값은 페이지와 같은 설정 · 콘텐츠에서 뽑는다 — 새로 쓴 글이 없다
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { useT, tx } from '../i18n';
import { COMPANY, LINKS } from '../config/site';
import { LOCALES, DEFAULT_LOCALE } from '../config/locales.mjs';
import { lurl, ROUTES, type SolutionSlug } from '../config/routes';
import { casesFor } from '../config/cases';
import { logoById, logoName } from '../config/customers';

export const GET: APIRoute = async ({ site }) => {
  const loc = DEFAULT_LOCALE;
  const t = useT(loc);
  const abs = (p: string, l = loc) => new URL(lurl(p, l), site).href;
  const sols = (await getCollection('solutions')).sort((a, b) => a.data.order - b.data.order);
  const cases = await casesFor(loc);
  const lines = [
    `# ${t('common.company')} (${t('common.legal_name')})`,
    '',
    `> ${t('common.company')}는 ${t('footer.partner')}입니다. ${t('home.hero.title')}.`,
    '',
    `- ${t('footer.address')}: ${COMPANY.address}`,
    `- ${t('footer.tel')}: ${COMPANY.tel} (${COMPANY.telIntl})`,
    `- ${t('footer.youtube')}: ${LINKS.youtube}`,
    `- ${t('footer.blog')}: ${LINKS.blog}`,
    '',
    `## ${t('nav.solutions')}`,
    '',
    ...sols.map((s) => `- [${t('solution.meta.title').replaceAll('{name}', s.data.name)}](${abs(ROUTES.solution(s.id as SolutionSlug))}): ${tx(s.data.description, loc)}`),
    '',
    `## ${t('nav.customers')}`,
    '',
    `- [${t('nav.customers')}](${abs(ROUTES.customers)})`,
    ...cases.map((c) => `- [${logoName(logoById(c.data.customer), loc)} — ${tx(c.data.title, loc).replace('\n', ' ')}](${abs(ROUTES.case(c.id))}): ${tx(c.data.description, loc)}`),
    '',
    `## ${t('home.how.title')}`,
    '',
    ...t('home.how.steps', true).map((s, i) => `${i + 1}. ${s} — ${t('home.how.desc', true)[i]}`),
    '',
    '## Other languages',
    '',
    ...LOCALES.filter((l) => l.code !== loc).map((l) => `- [${l.label ?? l.code}](${abs(ROUTES.home, l.code)})`),
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
