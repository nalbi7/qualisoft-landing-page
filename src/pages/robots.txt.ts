// robots.txt — 모든 로봇에 열고 sitemap 을 알린다 (19-seo-spec §7). AI 검색 · 답변 · 학습 수집 봇도 모두 허용 — 사용자 결정 (D-040, 정의서 §12 미결정 해소).
// 출시 전 미리보기도 막지 않는다 — 막으면 로봇이 noindex 를 읽지 못해 주소만 색인될 수 있다(§7). 미리보기는 페이지마다 noindex 로 뺀다
import type { APIRoute } from 'astro';
import { url } from '../config/routes';

export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL(url('/sitemap-index.xml'), site).href;
  const body = [
    '# All crawlers welcome, including AI search, answer and training bots',
    '# (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, Bingbot, Yeti ...)',
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${sitemap}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
