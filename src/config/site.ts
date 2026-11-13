import { lurl, ROUTES } from './routes';

// 회사 정보 한 곳 — 푸터와 JSON-LD가 같이 읽는다 (Docs/16-tech-architecture.md §5 · D-014 · D-016)
export const COMPANY = {
  name: '퀄리소프트',
  legalName: '(주)퀄리소프트',
  ceo: '변유신',
  ceoEn: 'Byun Yushin',   // 영 · 일 · 중 화면 — 사용자 지정 표기 (D-051, M-12 의 대표 이름)
  bizRegNo: '824-87-03495',
  address: '서울시 영등포구 선유로3길 10 하우스디비즈 906호',
  // 영 · 일 · 중 푸터용 영문 주소 — 도로명 로마자 표기. 건물 이름 표기는 회사 확인 전 (M-12)
  addressEn: '#906, House D Biz, 10 Seonyu-ro 3-gil, Yeongdeungpo-gu, Seoul, Korea',
  // JSON-LD PostalAddress 용으로 나눈 값 — 위 주소와 같은 내용 (19-seo-spec §5)
  addressParts: { region: '서울시', locality: '영등포구', street: '선유로3길 10 하우스디비즈 906호' },
  tel: '02-6925-1279',
  telIntl: '+82-2-6925-1279',
  telHref: 'tel:+82269251279',
  privacyEmail: 'yushin@qualisoft.co.kr',
} as const;

// 언어별 표기 — 한국어는 국내 번호 · 한글 이름, 영 · 일 · 중은 국가 번호(+82)로 시작하는 번호 · 영문 이름 (D-051)
const isKo = (loc?: string) => !loc || loc === 'ko';
export const telFor = (loc?: string) => (isKo(loc) ? COMPANY.tel : COMPANY.telIntl);
export const ceoFor = (loc?: string) => (isKo(loc) ? COMPANY.ceo : COMPANY.ceoEn);
// 사이트 제목(검색 결과 제목 줄 · og:title) — 한국어 「마이크로소프트 Dynamics 365 공식사이트」, 외국어 「Dynamics 365 Implementation」.
// 다른 페이지 제목은 「사이트 제목 | 페이지명」 (Base.astro · DemoBase.astro)
// 2026-11-12 D-058 에서 「Microsoft D365」로 바꿨다가, 대표님 뜻이 제목이 아니라 결과 위쪽 사이트 이름 줄이었음을 확인해 되돌렸다(2026-11-13, D-061 · BD-117)
export const homeTitleFor = (loc?: string) => (isKo(loc) ? '마이크로소프트 Dynamics 365 공식사이트' : 'Dynamics 365 Implementation');
// 사이트 이름(검색 결과 위쪽 이름 줄 · og:site_name · WebSite 구조화 데이터 name) — 한국어는 대표님 지시로 「Microsoft D365」(D-061). 외국어는 제목과 같다
export const siteNameFor = (loc?: string) => (isKo(loc) ? 'Microsoft D365' : homeTitleFor(loc));

// 바깥 채널 — 구 사이트에 공개된 주소 (Docs/14-information-architecture.md §5)
export const LINKS = {
  kakao: 'https://pf.kakao.com/_yyefT/chat',
  youtube: 'https://www.youtube.com/@dynamics365crm7',
  blog: 'https://blog.naver.com/dynamics365',
  // 「Dynamics 365 속성강의」 재생목록 — 첫 편(EP. 01)부터 재생목록으로 연다 (D-048 · BD-073, 사용자 지정 주소)
  lectures: 'https://www.youtube.com/watch?v=uR3Yl3p8Ewk&list=PLPFOHc0o0ZXK4x4H192u8H25yWa5IVHU1',
} as const;

// 데모 신청 — 방식 A, 기존 데모 신청 페이지로 이동 (D-005). 주소는 빌드 변수로만 받는다 — 값은 저장소에 쓰지 않는다 (H-01).
// 비어 있으면 데모 버튼 자리에 전화 상담을 둔다: 동작하지 않는 버튼을 두지 않는다 (16-tech-architecture §7)
export const DEMO_URL: string = import.meta.env.PUBLIC_DEMO_URL ?? '';

// 언어별 데모 신청 URL — 한국어는 기존 DEMO_URL 우선, 영·일·중은 자체 데모 페이지(/en/demo/ 등)로 연결 (A2)
// 솔루션 상세에서 진입 시 ?sol= 파라미터를 붙여 맞춤 예시 문장과 자동완성을 유도한다
const SOL_KEY_MAP: Record<string, string> = {
  'dynamics-365-crm': 'crm',
  crm: 'crm',
  'project-operations': 'po',
  po: 'po',
  'customer-insights': 'ci',
  ci: 'ci',
  'power-bi-fabric': 'bi',
  bi: 'bi',
  'power-platform': 'pp',
  pp: 'pp',
  copilot: 'copilot',
};

export const demoUrlFor = (loc?: string, sol?: string): string => {
  const base = isKo(loc) ? (DEMO_URL || lurl(ROUTES.demo, loc)) : lurl(ROUTES.demo, loc);
  if (!sol) return base;
  const solKey = SOL_KEY_MAP[sol] ?? sol;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}sol=${encodeURIComponent(solKey)}`;
};

// GA4 — 사용자 지시로 켠다(2026-11-12, D-059 · BD-114). 속성 「qualisoft_dynamics365 page - GA4」(www.dynamics365.co.kr 웹 스트림)의 측정 ID — HTML 에 실리는 공개값이다.
// 쿠키 배너에서 「동의」한 뒤에만 불러온다(scripts/site.ts). 빌드 변수 PUBLIC_GA4_ID 가 있으면 그 값이 앞선다
export const GA4_ID: string = import.meta.env.PUBLIC_GA4_ID || 'G-DFCX33Q3S2';
// 개인정보처리방침 활성화 — 푸터 · 쿠키 배너 링크 표시 및 /privacy/ 페이지 빌드
export const SHOW_PRIVACY = true;
export const NOINDEX = import.meta.env.PUBLIC_NOINDEX === 'true';
// 오픈일(YYYY-MM-DD) — 개인정보처리방침 시행일로 쓴다 (D-053). 비어 있으면 시행일이 미정으로 남아 공개 빌드가 멈춘다
export const OPEN_DATE: string = (import.meta.env.PUBLIC_OPEN_DATE ?? '').trim();
export const VERIFICATION = {
  google: import.meta.env.PUBLIC_GSC_VERIFICATION ?? '',
  naver: import.meta.env.PUBLIC_NAVER_VERIFICATION ?? '',
  bing: import.meta.env.PUBLIC_BING_VERIFICATION || '91A8071C6A9015EFA613A570297FEB56',
};
