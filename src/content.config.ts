// 콘텐츠 형식 — Docs/15-content-model.md. 1차는 홈에 필요한 값부터: 이름 · 아이콘 · 색 · 한 줄 · 훅 문장 · 입체 그림.
// 언어별 글은 { ko, en, ja, 'zh-hans' } 꼴로 둔다 — 검수 전 언어는 비워 둔다 (M-01)
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import LOGOS from './config/customer-logos.json';

const text = z.object({ ko: z.string(), en: z.string().optional(), ja: z.string().optional(), 'zh-hans': z.string().optional() });
// 고객 로고 id — config/customer-logos.json 의 파일 이름에서 확장자를 뺀 것. 게재 확인된 로고만 쓴다 (H-05)
const logoIds = LOGOS.map((l) => l.file.replace(/\.\w+$/, '')) as [string, ...string[]];

const solutions = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/solutions' }),
  schema: z.object({
    order: z.number(),
    name: z.string(),                 // Microsoft 제품 이름 그대로 — 번역하지 않는다 (19-seo-spec §12)
    icon: z.string(),                 // public/ 아래 경로 — MS 공식 아이콘 원본 (D-014)
    color: z.string(),                // 솔루션 색 토큰 (tokens.css --s1 … --s5)
    short: text,                      // 제품 목록 · 메뉴의 한 줄
    area: text.optional(),            // 메인 자주 묻는 질문의 솔루션 목록 — 하는 일을 짧게 (D-044, 예: 영업 및 고객관리)
    hook: text.optional(),            // 히어로 훅 문장 — 예시 화면이 있는 다섯만
    art: z.enum(['crm', 'po', 'ci', 'bi', 'pp', 'cop']),   // 솔루션 판 입체 그림 (art3d.html 의 data-k)
    step: z.string().optional(),      // 예시 화면 장면 버튼의 짧은 이름 (v7) — 예시 화면이 있는 다섯만
    // ── 솔루션 상세 (11-screen-spec 5-1 · 15-content-model 5-4, 시안 solution-crm-2an.html). 글은 _design/tools/sol_content.json(v7) 원문
    kind: z.enum(['solution', 'copilot']).default('solution'),   // copilot — 핵심 기능 자리에 「솔루션별 Copilot」 여섯
    headline: text,                   // 머리 h1 — short 와 같은 글, 「\n」 자리에서 줄을 바꾼다
    family: z.string().optional(),    // 왼쪽 판의 제품군 줄 (Dynamics 365 …). 번역하지 않는다
    mark: z.string(),                 // 왼쪽 판의 큰 글자 — 장식이라 화면 낭독에서 숨긴다
    lead: text,                       // 설명 2~4문장
    description: text,                // meta description — 설명의 첫 문장 (19-seo-spec §3)
    official: z.string(),             // Microsoft 공식 페이지 — microsoft.com/<언어>/ 뒤의 경로
    features: z.array(z.object({ title: text, text: text })).length(6),
    we: z.array(text).min(3).max(4),   // 퀄리소프트가 하는 일 — Copilot 은 셋 (D-053)
    products: z.array(z.object({ name: z.string(), icon: z.string(), path: z.string() })).min(1),   // path 는 official 과 같은 꼴
    customers: z.array(z.enum(logoIds)).optional(),               // 함께한 기업 — 대응표가 있는 솔루션만. 없으면 블록을 뺀다
    // 정해지지 않은 값 — 필드 이름 → 까닭. 그 자리를 data-todo 로 감싸 공개 빌드를 막는다 (validate-build ②)
    pending: z.object({ headline: z.string(), lead: z.string(), we: z.string() }).partial().optional(),
  }),
});

// ── 사례 기사 (11-screen-spec 5-2 · 15-content-model, 시안 case-2an.html · customers-2an.html). 글은 TeamWiki · 원천(Notion)에 근거한 것만 (BD-036)
// 1차는 네 언어 모두 — 솔루션 상세와 같은 틀(D-024). 인용 · 수치는 고객 동의가 있을 때만 넣는다 (N-06 · H-02)
const SLUGS = ['dynamics-365-crm', 'project-operations', 'customer-insights', 'power-bi-fabric', 'power-platform', 'copilot'] as const;
const cases = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/cases' }),
  schema: z.object({
    order: z.number(),                // 목록 · 홈 카드 순서
    first: z.array(z.enum(['ko', 'en', 'ja', 'zh-hans'])).default([]),   // 이 언어 화면에서 맨 앞에 — 그 지역에서 잘 알려진 고객 (D-026)
    customer: z.enum(logoIds),        // 고객 로고 id — 로고가 이 기사로 이어진다
    industry: text,                   // 업종 태그
    solutions: z.array(z.enum(SLUGS)).min(1),   // 관련 솔루션 상세 — 첫 번째가 대표
    products: z.array(z.string()).min(1),       // 쓴 제품 이름 — 번역하지 않는다
    period: text,                     // 기간 (예: 2025.02 – 2026.11)
    title: text,                      // h1
    sub: text,                        // 제목 아래 한 줄
    card: z.object({ task: text, result: text }),   // 사례 카드의 「과제 → 결과」 (≤40자)
    description: text,                // meta description
    challenge: z.array(text).min(1),  // 01 과제 — 문단
    work: z.array(text).min(1),       // 02 한 일 — 문단
    scope: z.array(text).min(1),      // 02 아래 구축 범위 목록
    result: z.array(text).min(1),     // 03 달라진 것 — 문단. 수치는 근거와 공개 동의가 있을 때만
    // 근거(사내 자료 경로)는 사이트 소스에 두지 않는다 — Docs/_build/case-sources.md (D-052, 공개될 수 있는 저장소에 사내 경로 · 직원 이름을 남기지 않는다)
    pending: z.string().optional(),   // 게재 전 확인할 것 — 있으면 기사 전체를 data-todo 로 감싼다
  }),
});

export const collections = { solutions, cases };
