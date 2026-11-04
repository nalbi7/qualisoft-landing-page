// 무반응 다크 전환 — 20초(다크 · 라이트 버튼이 나타난 뒤에는 1분, D-049) 동안 사용자 입력이 없으면 다크 테크 테마(styles/theme-dark.css)로 서서히 바뀌고,
// 마우스 · 스크롤 · 키 · 터치가 있으면 더 빨리 밝게 돌아온다 (D-032). 기기 다크 설정은 쓰지 않는다(사용자 선택: 자동 전환).
// 한 번 다크로 바뀌면 머리글 언어 버튼 왼쪽에 다크 · 라이트 버튼(#theme-btn)이 나타난다. 그 버튼을 누르면 그 뒤로는 사용자가 고른 쪽에 머문다 —
// 자동 전환(20초 · 움직이면 밝게)은 멈추고, 누를 때마다 서서히 바뀐다 (D-034). 나타남 · 고른 쪽은 이 탭이 열려 있는 동안 기억한다(sessionStorage) — 새로고침하면 지운다(Base.astro, D-038).
// 모든 페이지에서 부른다(layouts/Base.astro, D-035). 검토용으로 주소에 ?theme=dark 를 붙이면 처음부터 어둡고, ?theme=light 면 전환하지 않는다

(() => {
  // 어두워지기까지 무반응 시간 — 처음은 20초, 다크 · 라이트 버튼이 한 번 나타난 뒤(이 탭에서 한 번 어두워진 뒤)는 1분 (D-049)
  const IDLE = 20_000;
  const IDLE_AFTER = 60_000;
  // 전환 시간 — 처음 값(2500 · 600 · 900)에서 15% 빠르게 (D-041)
  const TO_DARK = 2125;  // 자동으로 어두워지는 시간 — 서서히
  const TO_LIGHT = 510;  // 자동으로 밝아지는 시간 — 돌아올 때는 빠르게
  const BY_HAND = 765;   // 버튼으로 바꿀 때
  const html = document.documentElement;
  const btn = document.getElementById('theme-btn') as HTMLButtonElement | null;
  const store = {
    get: (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } },
    set: (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch { /* 이 페이지에서만 */ } },
  };
  let idle = 0, fade = 0, glow = 0, dark = html.dataset.theme === 'dark', manual = false;
  // 모래시계 빛(scripts/hourglass.ts, D-037) — 크고 무거워서 처음 어두워질 때만 따로 불러온다. 불러오는 사이 다시 밝아졌으면 켜지 않는다
  // 다크인 채로 페이지를 옮기면 배경을 이어 보이게 (D-041) — 떠나는 페이지가 빛의 흐름 위치를 남기고(pagehide), 새 페이지는 그 위치에서 이어 그리며
  // 처음보다 빠르게(0.6초) 서서히 드러낸다 (D-042 — 「곧바로」를 바꿈). 새로 고침은 처음부터(Base.astro 가 지운다). 오래된 기록(10초 넘게)은 쓰지 않는다
  let fx: Promise<typeof import('./hourglass')> | null = null;
  let hg: typeof import('./hourglass') | null = null;
  const glowOn = (arrive = false) => {
    let resume: { clock: number; flowPos: number; at: number } | undefined;
    if (arrive) { try { resume = JSON.parse(store.get('hg-flow') ?? 'null') ?? undefined; } catch { /* 없음 */ } }
    try { sessionStorage.removeItem('hg-flow'); } catch { /* 없음 */ }
    if (resume && Date.now() - resume.at > 10_000) resume = undefined;
    (fx ??= import('./hourglass')).then((m) => { hg = m; if (dark) m.show(resume); }).catch(() => { /* 효과 없이 다크만 */ });
  };
  const glowOff = (dur: number) => { fx?.then((m) => m.hide(dur)).catch(() => {}); };
  addEventListener('pagehide', () => { if (dark && hg?.isOn()) store.set('hg-flow', JSON.stringify({ ...hg.flow(), at: Date.now() })); });
  // 솔루션 판의 네온 테두리(scripts/neon-border.ts, D-038 홈 · D-039 상세) — 판이 있는 쪽에서만, 다크로 바뀌기 시작할 때 켠다(테마와 함께 드러난다)
  let nx: Promise<typeof import('./neon-border')> | null = null;
  const neonOn = () => { if (!document.querySelector('#pnl, .sp2__panel')) return; (nx ??= import('./neon-border')).then((m) => { if (dark) m.show(); }).catch(() => {}); };
  const neonOff = (dur: number) => { nx?.then((m) => m.hide(dur)).catch(() => {}); };

  // 하늘 (D-038) — 바뀌는 동안 화면 맨 뒤(.sky, 모래시계 빛 밑)를 하늘처럼 물들인다. 위 · 아래 두 색의 세로 그라데이션.
  // 어두워질 때: 흰색 → 노을(노랑 · 주황) → 노을(분홍 · 검푸름) → 밤(#0A0A0A). 밝아질 때: 밤 → 새벽(검푸름) → 흰색.
  // 처음과 끝은 페이지 바탕과 같은 색이라 이음매가 없다. 움직임 줄이기면 하늘 없이 바로.
  // 끊김 줄이기 (D-050) — 단계마다 고정된 그라데이션 층을 겹쳐 두고 그 단계 시점까지 투명도만 0 → 1 로 올린다(투명도는 그래픽 카드가 맡는다).
  // 도중에 반대로 바뀌면 지금 하늘을 그 자리에 멈춰 두고(commitStyles) 그 위에 새 하늘을 올린다 — 색이 튀지 않는다. 끝나면 모두 걷어 낸다
  const SKY_TO_DARK: [string, string, number][] = [['#F7F7FA', '#F7F7FA', 0], ['#FFB04A', '#FFE27A', 0.3], ['#1F2B5C', '#F08BA8', 0.62], ['#0A0A0A', '#0A0A0A', 1]];
  const SKY_TO_LIGHT: [string, string, number][] = [['#0A0A0A', '#0A0A0A', 0], ['#0F1A3A', '#2C4A80', 0.5], ['#F7F7FA', '#F7F7FA', 1]];
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  let skies: { el: HTMLElement; anims: Animation[] }[] = [];
  let skyEnd = 0;
  const skyRun = (on: boolean, dur: number) => {
    if (still.matches || typeof Element.prototype.animate !== 'function') return;
    const running = skies.some((s) => s.anims.some((a) => a.playState === 'running' || a.playState === 'paused'));
    if (running) for (const s of skies) for (const a of s.anims) { try { a.commitStyles(); } catch { /* 멈춘 자리를 못 남기면 그대로 */ } a.cancel(); }
    else { skies.forEach((s) => s.el.remove()); skies = []; }
    const el = document.createElement('div');
    el.className = 'sky';
    el.setAttribute('aria-hidden', 'true');
    const stops = on ? SKY_TO_DARK : SKY_TO_LIGHT;
    const anims: Animation[] = [];
    stops.forEach(([top, bottom, at], i) => {
      if (i === 0 && running) return;   // 이어 가는 중이면 밑의 멈춘 하늘이 첫 단계를 대신한다
      const layer = document.createElement('i');
      layer.style.background = `linear-gradient(180deg, ${top}, ${bottom})`;
      el.append(layer);
      if (i === 0) return;
      const from = stops[i - 1][2];
      anims.push(layer.animate([{ opacity: 0, offset: 0 }, { opacity: 0, offset: from }, { opacity: 1, offset: at }, { opacity: 1, offset: 1 }], { duration: dur, easing: 'linear', fill: 'forwards' }));
    });
    // 앞의 하늘 위에 쌓는다 — 같은 z-index 라 나중 것이 위
    if (skies.length) skies[skies.length - 1].el.after(el); else document.body.prepend(el);
    skies.push({ el, anims });
    clearTimeout(skyEnd);
    skyEnd = window.setTimeout(() => { skies.forEach((s) => s.el.remove()); skies = []; }, dur + 60);
  };

  const label = () => btn?.setAttribute('aria-label', (dark ? btn.dataset.labelLight : btn.dataset.labelDark) ?? '');
  const reveal = () => { if (!btn || !btn.hidden) return; btn.hidden = false; store.set('theme-btn', '1'); };
  const set = (on: boolean, dur: number) => {
    dark = on;
    html.style.setProperty('--theme-dur', `${dur}ms`);
    html.classList.add('theme-fade');
    skyRun(on, dur);
    if (on) html.dataset.theme = 'dark'; else delete html.dataset.theme;
    clearTimeout(fade);
    fade = window.setTimeout(() => html.classList.remove('theme-fade'), dur + 80);
    if (on) reveal();
    label();
    // 모래시계 빛 — 다크 전환이 끝난 뒤 맨 뒤에서 서서히 드러나고(1.7초), 밝아질 때는 같은 시간에 사라진다 (D-037, 별가루 D-036 를 바꿈)
    clearTimeout(glow);
    if (on) glow = window.setTimeout(() => glowOn(), dur + 100); else glowOff(dur);
    if (on) neonOn(); else neonOff(dur);
  };
  const arm = () => { clearTimeout(idle); if (!manual) idle = window.setTimeout(() => set(true, TO_DARK), btn && !btn.hidden ? IDLE_AFTER : IDLE); };
  // 버튼 위에서 누르는 동작은 「움직임」으로 치지 않는다 — pointerdown 이 click 보다 먼저 와서 밝게 되돌린 뒤 버튼이 다시 어둡게 만드는 것을 막는다
  const wake = (e?: Event) => {
    if (manual || (e?.target as Element | null)?.closest?.('#theme-btn')) return;
    if (dark) set(false, TO_LIGHT);
    arm();
  };

  // 버튼 — 고른 쪽에 머물고 자동 전환은 멈춘다
  btn?.addEventListener('click', () => {
    manual = true;
    clearTimeout(idle);
    set(!dark, BY_HAND);
    store.set('theme-choice', dark ? 'dark' : 'light');
  });

  const forced = new URLSearchParams(location.search).get('theme');
  if (forced === 'dark') { html.classList.add('dark-arrive'); setTimeout(() => html.classList.remove('dark-arrive'), 1500); html.dataset.theme = 'dark'; dark = true; reveal(); label(); glowOn(true); neonOn(); return; }
  if (forced === 'light') return;

  if (store.get('theme-btn')) reveal();
  const choice = store.get('theme-choice');
  if (choice) {
    // 이 탭에서 이미 버튼으로 골랐다 — 그쪽으로 열고(머리의 인라인 스크립트가 다크를 먼저 붙인다) 자동 전환은 하지 않는다
    manual = true;
    dark = choice === 'dark';
    if (dark) { html.dataset.theme = 'dark'; glowOn(true); neonOn(); } else delete html.dataset.theme;
    label();
    return;
  }

  for (const ev of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart'] as const) addEventListener(ev, wake, { passive: true });
  // 다른 탭에 가 있는 동안은 세지 않는다 — 돌아오면 밝은 채로 다시 센다
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(idle); else wake(); });
  label();
  arm();
})();
