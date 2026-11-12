// 모든 페이지의 공통 동작 — 시안 components.js 와 모바일 메뉴 스크립트를 옮겼다 (BD-001).
// 스크립트가 없어도 본문 · 링크 · 데모 버튼은 그대로 동작한다. 떠 있는 창 · 배너 · 분석만 빠진다 (16-tech-architecture §4)
const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s);
import { countryLanguageRedirect } from './country-language';

// 브라우저 저장소 — 사생활 보호 모드처럼 못 쓰는 환경에서도 페이지는 그대로 보인다
const store = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* 이 페이지에서만 기억 */ } },
};

// 머리글 — 맨 위는 불투명, 스크롤하면 유리 + 경계선. 맨 위로 버튼은 640px 넘게 내리면
const nav = $('.nav');
const totop = $<HTMLButtonElement>('.totop');
const onScroll = () => {
  nav?.classList.toggle('scrolled', scrollY > 8);
  if (totop) totop.hidden = scrollY < 640;
};
addEventListener('scroll', onScroll, { passive: true });
onScroll();
totop?.addEventListener('click', () => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));

// 떠 있는 창 여닫기 — 버튼의 aria-expanded 와 창의 open 클래스(또는 hidden)를 함께 바꾼다
// 초점 (13-accessibility §7 · BD-041): 메뉴는 초점이 밖으로 나가면 닫고, 고객지원 창은 열면 창 안 첫 항목으로,
// 모바일 시트는 모달처럼 — 열린 동안 머리글 밖은 inert, Tab 은 머리글 안에서만 돈다
type Mode = 'menu' | 'dialog' | 'sheet';
const FOCUSABLE = 'a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
function toggler(btn: HTMLElement | null, panel: HTMLElement | null, useHidden: boolean, mode: Mode) {
  if (!btn || !panel) return;
  const isOpen = () => btn.getAttribute('aria-expanded') === 'true';
  const set = (open: boolean) => {
    btn.setAttribute('aria-expanded', String(open));
    if (useHidden) panel.hidden = !open; else panel.classList.toggle('open', open);
    if (mode === 'sheet') {
      const host = btn.closest('header');
      [...document.body.children].forEach((el) => { if (el !== host && el.tagName !== 'SCRIPT') (el as HTMLElement).inert = open; });
    }
    if (open && mode !== 'menu') panel.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  };
  btn.addEventListener('click', (e) => { e.stopPropagation(); set(!isOpen()); });
  document.addEventListener('click', (e) => { if (isOpen() && !panel.contains(e.target as Node)) set(false); });
  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') { set(false); btn.focus(); return; }
    if (e.key === 'Tab' && mode === 'sheet') {
      const items = [btn, ...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null);
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  if (mode === 'menu') {
    const wrap = btn.parentElement ?? panel;
    wrap.addEventListener('focusout', (e) => { if (isOpen() && !wrap.contains(e.relatedTarget as Node)) set(false); });
  }
}
toggler($('#dd-btn'), $('#dd-menu'), false, 'menu');
toggler($('#support-btn'), $('#support-panel'), true, 'dialog');
toggler($('#mnav-btn'), $('#mnav'), true, 'sheet');
toggler($('#lang-btn'), $('#lang-menu'), false, 'menu');
// 모바일 메뉴의 언어 — 화면 아래 바텀 시트(<dialog>)로 고른다. 바깥 터치 · 상단 그립 터치 · 아래로 스와이프 · Esc로 닫는다 (BD-026 · BD-091)
const langDlg = $<HTMLDialogElement>('#lang-dlg');
const mlangBtn = $('#mlang-btn');
const closeLang = () => {
  if (!langDlg?.open) return;
  langDlg.close();
  langDlg.style.transform = '';
  langDlg.style.transition = '';
  mlangBtn?.setAttribute('aria-expanded', 'false');
};
mlangBtn?.addEventListener('click', () => { langDlg?.showModal(); mlangBtn.setAttribute('aria-expanded', 'true'); });
langDlg?.addEventListener('close', () => mlangBtn?.setAttribute('aria-expanded', 'false'));
$('#mnav-btn')?.addEventListener('click', () => { if (langDlg?.open) closeLang(); });

// 바깥(Backdrop) 영역 터치/클릭 판정
langDlg?.addEventListener('click', (e) => {
  if (!langDlg) return;
  const rect = langDlg.getBoundingClientRect();
  const isInDialog = (
    rect.top <= e.clientY && e.clientY <= rect.bottom &&
    rect.left <= e.clientX && e.clientX <= rect.right
  );
  if (!isInDialog) closeLang();
});

// 상단 그립 바 터치/클릭으로 닫기
langDlg?.querySelector('.langdlg__grip')?.addEventListener('click', closeLang);

// 아래로 스와이프(drag down) 제스처로 닫기
if (langDlg) {
  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  langDlg.addEventListener('touchstart', (e) => {
    if (langDlg.scrollTop <= 0) {
      startY = e.touches[0].clientY;
      currentY = startY;
      isDragging = true;
    }
  }, { passive: true });

  langDlg.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientY - startY;
    if (diff > 0) {
      currentY = e.touches[0].clientY;
      langDlg.style.transform = `translateY(${diff}px)`;
      langDlg.style.transition = 'none';
    }
  }, { passive: true });

  const endDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    const diff = currentY - startY;
    langDlg.style.transition = 'transform .2s var(--ease-out, ease)';
    if (diff > 70) {
      langDlg.style.transform = 'translateY(100%)';
      setTimeout(closeLang, 180);
    } else {
      langDlg.style.transform = '';
      setTimeout(() => { if (langDlg) langDlg.style.transition = ''; }, 200);
    }
  };

  langDlg.addEventListener('touchend', endDrag);
  langDlg.addEventListener('touchcancel', endDrag);
}
$('#support-x')?.addEventListener('click', () => $<HTMLButtonElement>('#support-btn')?.click());

// 언어 — 메뉴 · 푸터 · 배너에서 고르거나 배너를 닫으면 기억해 배너를 다시 띄우지 않는다 (브라우저 저장소, 분석 쿠키가 아니다 — IA §9)
document.querySelectorAll<HTMLElement>('[data-lang-choice]').forEach((a) => a.addEventListener('click', () => store.set('lang-choice', a.dataset.langChoice ?? '')));
// 첫 방문 배너 — 한국어 페이지에만 있다. 브라우저 언어 목록에서 처음 맞는 언어로, 한국어면 띄우지 않는다.
// 번체 중국어(zh-TW · zh-HK · zh-MO · zh-Hant)와 그 밖의 외국어는 영어로 본다. 그 언어가 꺼져 있어도 영어 (IA §9 표)
const bar = $('#langbar');
async function suggestLanguage() {
  if (!bar || await countryLanguageRedirect(bar) || store.get('lang-choice')) return;
  const has = (c: string) => !!bar.querySelector(`[data-for="${c}"]`);
  const want = (() => {
    for (const raw of navigator.languages ?? [navigator.language]) {
      const l = raw.toLowerCase();
      if (l.startsWith('ko')) return null;
      if (l.startsWith('ja')) return 'ja';
      if (l.startsWith('zh')) return /^zh-(tw|hk|mo|hant)/.test(l) ? 'en' : 'zh-hans';
      if (l.startsWith('en')) return 'en';
      return 'en';
    }
    return null;
  })();
  const pick = want && (has(want) ? want : has('en') ? 'en' : null);
  const row = pick && bar.querySelector<HTMLElement>(`[data-for="${pick}"]`);
  if (row) {
    row.hidden = false;
    bar.hidden = false;
    row.querySelector('[data-lang-close]')?.addEventListener('click', () => { store.set('lang-choice', 'ko'); bar.hidden = true; });
  }
}
void suggestLanguage();

// 로고 띠 정지 · 재생 — 글자는 버튼의 data-label-play / data-label-pause 에서
document.querySelectorAll<HTMLButtonElement>('[data-pause]').forEach((b) => {
  const host = document.getElementById(b.dataset.pause ?? '');
  b.addEventListener('click', () => {
    const paused = host?.classList.toggle('paused') ?? false;
    b.setAttribute('aria-label', (paused ? b.dataset.labelPlay : b.dataset.labelPause) ?? '');
    b.textContent = paused ? '▶' : '❚❚';
  });
});

// 쿠키 동의 — 동의 여부와 날짜만 둔다. 12개월 뒤 다시 묻는다 (20-release-ops §18)
const YEAR = 365 * 24 * 3600 * 1000;
const ga4 = document.documentElement.dataset.ga4 ?? '';
function readConsent(): 'yes' | 'no' | null {
  try {
    const c = JSON.parse(store.get('consent') ?? 'null') as { v: 'yes' | 'no'; at: number } | null;
    return c && Date.now() - c.at < YEAR ? c.v : null;
  } catch { return null; }
}
// 분석 — 동의한 뒤에만 GA4 를 부른다. 향상된 측정의 이탈 클릭 수집은 끈다(데모 주소를 통째로 보내지 않게, 20-release-ops §14)
// 같은 페이지에서 동의를 철회하면 GA4 를 멈추고(ga-disable 플래그 · consent denied) 이미 생긴 _ga 쿠키를 지운다. 다시 동의하면 이어서 잰다 (BD-114)
let gaLoaded = false;
const gaWin = window as unknown as Record<string, unknown> & { gtag?: (...a: unknown[]) => void };
function stopAnalytics() {
  if (!ga4) return;
  gaWin[`ga-disable-${ga4}`] = true;
  gaWin.gtag?.('consent', 'update', { analytics_storage: 'denied' });
  // GA 쿠키(_ga · _ga_<ID>)는 상위 도메인에 생긴다 — 경로 · 도메인 후보마다 지운다
  const host = location.hostname;
  const parts = host.split('.');
  const domains = ['', host, ...parts.map((_, i) => '.' + parts.slice(i).join('.')).filter((d) => d.split('.').length > 2)];
  document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((n) => n === '_ga' || n.startsWith('_ga_')).forEach((n) => {
    domains.forEach((d) => { document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ''}`; });
  });
}
function loadAnalytics() {
  if (!ga4) return;
  gaWin[`ga-disable-${ga4}`] = false;
  if (gaLoaded) { gaWin.gtag?.('consent', 'update', { analytics_storage: 'granted' }); return; }
  gaLoaded = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4)}`;
  document.head.append(s);
  const w = window as unknown as { dataLayer: unknown[]; gtag: (...a: unknown[]) => void };
  w.dataLayer = w.dataLayer || [];
  w.gtag = function () { w.dataLayer.push(arguments); };   // gtag 는 arguments 객체를 그대로 받는다
  w.gtag('js', new Date());
  w.gtag('config', ga4, { outbound_clicks: false });
}
const ck = $('#cookie');
if (ck) {
  const show = (on: boolean) => { ck.hidden = !on; document.body.classList.toggle('has-cookie', on); };
  ck.querySelectorAll<HTMLButtonElement>('[data-consent]').forEach((b) => {
    b.addEventListener('click', () => {
      const v = b.dataset.consent === 'yes' ? 'yes' : 'no';
      store.set('consent', JSON.stringify({ v, at: Date.now() }));
      show(false);
      if (v === 'yes') loadAnalytics(); else stopAnalytics();
    });
  });
  // 「쿠키 설정」 — 푸터 · 개인정보처리방침에서 동의를 다시 고른다
  document.querySelectorAll('[data-cookie-open]').forEach((a) => {
    a.addEventListener('click', (e) => { e.preventDefault(); show(true); ck.querySelector<HTMLButtonElement>('[data-consent]')?.focus(); });
  });
  const c = readConsent();
  if (c === 'yes') loadAnalytics();
  else if (c === null) show(true);
}

// 자주 묻는 질문 — 하나를 열면 같은 목록의 다른 것은 닫는다 (BD-084). <details name> 을 아는 브라우저는 이미 그렇게 하고, 이건 모르는 브라우저용이다
document.querySelectorAll<HTMLDetailsElement>('.faq__i').forEach((d) => {
  d.addEventListener('toggle', () => {
    if (!d.open) return;
    d.closest('.faq')?.querySelectorAll<HTMLDetailsElement>('.faq__i[open]').forEach((o) => { if (o !== d) o.open = false; });
  });
});

// 클릭 이벤트 — 데모 · 카카오 · 전화 링크를 문서 한 곳에서 잡는다. 이름은 20-release-ops §14. 개인정보를 담지 않는다
document.addEventListener('click', (e) => {
  const a = (e.target as Element).closest<HTMLElement>('[data-ev]');
  // 동의가 「예」이고 GA4 를 불러온 뒤에만 보낸다 — 같은 페이지에서 철회했으면 보내지 않는다 (BD-114)
  if (a && gaLoaded && readConsent() === 'yes') gaWin.gtag?.('event', a.dataset.ev, { page_path: location.pathname });
});

// 마지막 행동 띠 — 아치형 포털이 화면에 들어오며 풀폭 띠로 펼쳐진다 (Arch Portal Reveal, 디자인 원본 components.js · BD-011, 2026-11-02 14:01 판 BD-016).
// 띠 상자(.band__box)의 윗변이 화면 100% → 75% 를 지나는 동안 --lab-arch 를 0 → 1 로 — 원본은 95% → 35%. 사용자 요청으로 더 일찍 다 펼쳐지게(BD-018 50%, BD-031 75%): 상자가 화면 아래쪽 4분의 1 안으로 들어오면 다 펼쳐진다. 모양 · 떠오름 · 투명도는 components.css .qlab-arch-portal .band__box.
// 좌우는 최대 3.5% 만 깎아 글자 · 버튼이 잘리지 않는다. 움직임 줄이기면 펼친 채 둔다
const band = $('.band');
const bandBox = band?.querySelector<HTMLElement>('.band__box');
if (band && bandBox && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  band.classList.add('qlab-arch-portal');
  let ticking = false;
  const updateArch = () => {
    const top = bandBox.getBoundingClientRect().top;
    const vh = innerHeight || document.documentElement.clientHeight;
    const start = vh * 1.0, end = vh * 0.75;
    bandBox.style.setProperty('--lab-arch', Math.max(0, Math.min(1, (start - top) / (start - end))).toFixed(4));
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(updateArch); } }, { passive: true });
  addEventListener('resize', updateArch, { passive: true });
  updateArch();
}
