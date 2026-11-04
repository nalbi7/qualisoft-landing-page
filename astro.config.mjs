// 정적 생성 · 한국어는 접두어 없음 · 끝 슬래시 주소 (Docs/16-tech-architecture.md §4, Docs/14-information-architecture.md §4)
// 키 이름은 Astro 7.4.2 타입 정의(dist/types/public/config.d.ts)로 확인했다 (2026-10-29)
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { LOCALES, DEFAULT_LOCALE } from './src/config/locales.mjs';

// 대표 주소 — 공개 전에는 미리보기 주소를 넣는다. 미리보기는 /<저장소>/ 아래에서 열려 BASE_PATH 로 맞춘다
const site = process.env.SITE_URL || 'https://www.dynamics365.co.kr';
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site,
  base,
  // 대조용 빌드를 따로 둘 때만 OUT_DIR 을 준다 (Docs/_build/parity.html — 시안과 같은 주소에서 열어야 비교된다)
  outDir: process.env.OUT_DIR || './dist',
  trailingSlash: 'always',
  build: { format: 'directory' },
  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    locales: LOCALES.map((l) => l.code),
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: DEFAULT_LOCALE, locales: Object.fromEntries(LOCALES.map((l) => [l.code, l.hreflang])) },
    }),
  ],
});
