// 홈 동작 — 시안 home-2an.html 의 LOOP_JS · 제품 판 · 떠 있는 막대를 옮겼다 (BD-001).
// 예시 화면 박자는 v7과 같다: 한 장면 5초, 끝나기 1.5초 전에 커서가 이 장면의 다음 동작으로 가서 누르고 다음 장면으로 넘어간다.
// 움직임 줄이기 설정이면 자동 재생하지 않고 바뀌는 효과도 없다 (13-accessibility-spec §5)
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;

// ── 예시 화면 + 훅 ──
(() => {
  const jr = byId('loop');
  const win = jr?.querySelector<HTMLElement>('.win');
  const stage = jr?.querySelector<HTMLElement>('.stage');
  const cursor = jr?.querySelector<HTMLElement>('.cursor');
  const btn = byId<HTMLButtonElement>('loop-btn');
  if (!jr || !win || !stage || !cursor || !btn) return;
  const scrs = [...jr.querySelectorAll<HTMLElement>('.scr')];
  const tabs = [...jr.querySelectorAll<HTMLButtonElement>('[data-go]')];
  const ind = jr.querySelector<HTMLElement>('.steps__ind');
  const winApp = byId('win-app'), winIc = byId<HTMLImageElement>('win-ic'), more = byId<HTMLAnchorElement>('hook-more');
  const hk = byId('hook'), hkName = byId('hook-name'), hkLine = byId('hook-line'), hkIc = byId<HTMLImageElement>('hook-ic');
  const BEAT = 5000;
  let i = 0, playing = !reduce, hold = false, timers: number[] = [];

  const paintHook = (k: number) => {
    const d = tabs[k].dataset;
    if (!hk || !hkName || !hkLine || !hkIc) return;
    hkName.textContent = d.name ?? ''; hkLine.textContent = d.line ?? ''; hkIc.src = d.icon ?? '';
    hk.style.setProperty('--hc', d.color ?? '');
  };
  // 이름 · 아이콘 · 한 줄이 흐려지며 올라가 사라지고 아래에서 들어온다
  const swapHook = () => {
    if (!hk) return;
    if (reduce) { paintHook(i); return; }
    hk.classList.add('out');
    setTimeout(() => { paintHook(i); hk.classList.remove('out'); hk.classList.add('enter'); void hk.offsetWidth; hk.classList.remove('enter'); }, 230);
  };
  // 이름은 늘 한 줄 — 다섯 이름 중 가장 긴 것이 칸에 들어가는 크기로 맞추고, 훅 높이는 가장 긴 상태에 고정한다
  const fitHook = () => {
    if (!hk || !hkName || !hkLine) return;
    const nm = hk.querySelector<HTMLElement>('.hook__name');
    if (!nm) return;
    nm.style.fontSize = ''; hk.style.minHeight = '';
    const fs = parseFloat(getComputedStyle(nm).fontSize), W = hk.clientWidth;
    const keep = [hkName.textContent, hkLine.textContent];
    let w = 0, h = 0;
    tabs.forEach((t) => { hkName.textContent = t.dataset.name ?? ''; w = Math.max(w, hkName.offsetWidth + fs * 1.02); });
    if (w > W) nm.style.fontSize = `${(fs * W) / w}px`;
    tabs.forEach((t) => { hkName.textContent = t.dataset.name ?? ''; hkLine.textContent = t.dataset.line ?? ''; h = Math.max(h, hk.offsetHeight); });
    [hkName.textContent, hkLine.textContent] = keep;
    hk.style.minHeight = `${h}px`;
  };
  // 창 높이는 다섯 장면 중 가장 긴 것에 맞춰 고정 — 장면이 바뀌어도 히어로 크기가 변하지 않는다
  const fitStage = () => { stage.style.height = `${Math.max(230, ...scrs.map((x) => x.offsetHeight))}px`; };
  const moveInd = (from: number) => {
    if (!ind || !ind.offsetParent) return;
    const b = tabs[i], W = (b.parentElement as HTMLElement).clientWidth;
    ind.style.transitionDuration = i >= from ? '.55s, .3s, .4s' : '.3s, .55s, .4s';
    ind.style.left = `${b.offsetLeft}px`; ind.style.right = `${W - b.offsetLeft - b.offsetWidth}px`;
    // 선 색은 고른 솔루션의 색 — v7 의 연두색은 어두운 바탕용이라 흰 히어로에서 보이지 않는다 (BD-008)
    ind.style.backgroundColor = b.style.getPropertyValue('--sc');
  };
  const cursorAt = (x: number, y: number) => { cursor.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`; };
  const park = () => cursorAt(win.clientWidth - 52, win.clientHeight - 44);
  const show = (n: number, animate = true) => {
    const from = i;
    i = (n + scrs.length) % scrs.length;
    stage.dataset.s = String(i);
    scrs.forEach((s, k) => { s.classList.toggle('on', k === i); s.classList.remove('acted'); });
    tabs.forEach((t, k) => (k === i ? t.setAttribute('aria-current', 'true') : t.removeAttribute('aria-current')));
    if (winApp) winApp.textContent = scrs[i].dataset.app ?? '';
    if (winIc) winIc.src = scrs[i].dataset.icon ?? '';
    jr.style.setProperty('--cur', tabs[i].dataset.color ?? '');
    if (more) { more.href = tabs[i].dataset.href ?? more.href; more.setAttribute('aria-label', `${tabs[i].dataset.name} — ${more.textContent?.replace('→', '').trim()}`); }
    if (animate) swapHook(); else paintHook(i);
    moveInd(from);
  };
  const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
  const clear = () => {
    timers.forEach(clearTimeout); timers = [];
    cursor.classList.remove('click');
    jr.querySelectorAll('.pressed').forEach((p) => p.classList.remove('pressed'));
  };
  const beat = () => {
    clear();
    if (!playing || hold) return;
    const target = scrs[i].querySelector<HTMLElement>('[data-click]');
    later(() => {
      if (!target) return;
      const w = win.getBoundingClientRect(), r = target.getBoundingClientRect();
      cursorAt(r.left - w.left + r.width * 0.62, r.top - w.top + r.height * 0.58);
    }, BEAT - 1500);
    later(() => { cursor.classList.add('click'); target?.classList.add('pressed'); scrs[i].classList.add('acted'); }, BEAT - 650);
    later(() => { cursor.classList.remove('click'); target?.classList.remove('pressed'); }, BEAT - 400);
    later(() => { show(i + 1); beat(); }, BEAT);
  };
  // 5초 넘게 스스로 움직이는 내용이라 정지 버튼이 필수다 (13-accessibility-spec §5)
  const setPlay = (p: boolean) => {
    playing = p;
    btn.setAttribute('aria-label', (p ? btn.dataset.labelPause : btn.dataset.labelPlay) ?? '');
    btn.textContent = p ? '❚❚' : '▶';
    if (!p) park();
    beat();
  };
  tabs.forEach((t) => t.addEventListener('click', () => { setPlay(false); show(Number(t.dataset.go)); park(); }));
  // 재생을 누르면 곧바로 — 마우스 · 초점이 영역 안에 남아 있어도 「잠시 멈춤(hold)」을 풀고 시작한다 (BD-050)
  btn.addEventListener('click', () => { if (!playing) hold = false; setPlay(!playing); });
  jr.addEventListener('mouseenter', () => { hold = true; clear(); park(); });
  jr.addEventListener('mouseleave', () => { hold = false; beat(); });
  jr.addEventListener('focusin', () => { hold = true; clear(); });
  jr.addEventListener('focusout', () => { hold = false; beat(); });
  const fit = () => { fitStage(); fitHook(); moveInd(i); };
  show(0, false); fit(); park();
  addEventListener('resize', () => { fit(); if (!playing || hold) park(); });
  document.fonts?.ready.then(fit);
  setPlay(playing);
})();

// ── 떠 있는 데모 신청 막대 — 첫 화면을 지나면 보이고, 마지막 행동 띠가 보이면 숨는다 ──
(() => {
  const dock = byId('dock'), hero = document.querySelector('.hero2'), band = document.querySelector('.band');
  if (!dock || !hero || !band) return;
  addEventListener('scroll', () => {
    const past = hero.getBoundingClientRect().bottom < 0, atBand = band.getBoundingClientRect().top < innerHeight;
    dock.hidden = !past || atBand;
  }, { passive: true });
})();

// ── 고객 사례 영역 등장 — 화면에 들어올 때 한 번 서서히 나타난다 (BD-044).
// D-028 로 「솔루션 트랙 끝까지 숨김」은 없앴고, 들어올 때의 가벼운 등장만 남긴다. 숨김 클래스는 스크립트가 붙이므로 스크립트가 없으면 처음부터 보인다
// 스크롤 위치로 판단한다 — 관찰자(IntersectionObserver)가 돌지 않는 환경에서도 영역이 투명한 채 남지 않게. 한 번 나타나면 듣기를 멈춘다
(() => {
  const sec = byId('cases');
  if (!sec || reduce) return;
  if (sec.getBoundingClientRect().top < innerHeight) return;   // 이미 화면에 있으면(새로 고침 · 바로 이동) 그대로 둔다
  sec.classList.add('rise');
  const check = () => {
    if (sec.getBoundingClientRect().top > innerHeight * 0.88) return;
    sec.classList.add('in');
    removeEventListener('scroll', check);
    removeEventListener('resize', check);
  };
  addEventListener('scroll', check, { passive: true });
  addEventListener('resize', check);
})();
