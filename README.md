# qualisoft-landing-page

퀄리소프트 Dynamics 365 · Power BI 구축 사이트 (dynamics365.co.kr 2차 사이트). Astro 정적 사이트, 한국어 · English · 日本語 · 简体中文.

## 실행

Node 24 (`.nvmrc`) · npm.

```bash
npm ci
npm run dev        # 개발 서버 http://localhost:4321
npm run build      # 빌드(dist/) + 빌드 뒤 검사(scripts/validate-build.mjs)
```

빌드 변수(모두 HTML 에 실리는 공개값 — 값은 저장소에 쓰지 않는다. 로컬은 `.env`, 배포는 저장소 Actions 변수):

| 변수 | 뜻 |
| --- | --- |
| `PUBLIC_NOINDEX` | `true` 면 검색 제외(출시 전 미리보기). 공개 때 `false` |
| `ALLOW_TODO` | `1` 이면 정해지지 않은 값(`data-todo`)을 경고로 — 미리보기에서만 |
| `PUBLIC_DEMO_URL` | 데모 신청 페이지 주소. 비면 데모 버튼 자리에 전화 상담 |
| `SITE_URL` · `BASE_PATH` | 대표 주소 · 기준 경로 (Pages 미리보기는 워크플로가 채운다) |
| `SITE_LOCALES` | 켤 언어(비우면 네 언어) |
| `PUBLIC_OPEN_DATE` | 오픈일 `YYYY-MM-DD` — 개인정보처리방침 시행일. 비면 공개 빌드가 멈춘다 |
| `PUBLIC_GA4_ID` | GA4 측정 ID. 비면 분석 · 쿠키 배너 · 분석 쿠키 절이 빠진다 |

## 배포

`main` 에 올리면 `.github/workflows/deploy.yml` 이 검사 · 빌드한 뒤 GitHub Pages 에 배포한다. 변경 요청(PR)은 검사만 한다.
저장소에서 한 번: Settings → Pages → Source 를 「GitHub Actions」로.

## 구조

- `src/pages` — 주소(한국어는 접두어 없음, `/en/` · `/ja/` · `/zh-hans/`)
- `src/content` — 솔루션 · 사례 글(네 언어)
- `src/i18n` — 화면 문구
- `src/config` — 회사 정보 · 주소 · 고객 로고 · FAQ
- `public` — 그림 · 파비콘

기획 · 디자인 문서는 이 저장소 밖(사내)에 있다.
