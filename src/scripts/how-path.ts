// 「이렇게 일합니다」 점선 여정 (BD-013 · BD-014 · BD-015) — Web-Transition-Lab 샌드박스 lab-sandbox.js 의 howMode 'dotted-path' 를 보완해 옮겼다.
// 샌드박스와 다르게 한 것:
//  · GSAP · ScrollTrigger 를 쓰지 않는다
//  · 단계 카드를 스크립트로 새로 만들지 않고 화면의 <ol> 을 그대로 옮겨 세운다 — 스크립트가 없어도 목록이 보이고 화면 낭독 순서가 같다
//  · 그림을 가로세로 따로 늘이는 SVG(preserveAspectRatio="none")로 둬서 길 위 점과 카드 위치가 폭마다 어긋나지 않는다(샌드박스는 meet 이라 넓은 화면에서 어긋났다)
//  · 「진행률 %」 배지 · 실험 안내 글은 넣지 않는다 — 근거 있는 수치처럼 보인다
//  · 900px 아래는 세로 줄 하나로(가로 길에서는 카드가 겹친다), 움직임 줄이기면 끝까지 켠 채로 둔다
// BD-015: 넓은 화면(900 × 600 이상)은 홈 솔루션 영역(solutions-v7.js)과 같은 스크롤 규칙 — 영역을 화면에 고정(.how--pin)하고
//  휠을 한 번 굴리면 한 단계, 길게 굴리면 3칸 머문 뒤 2칸마다 다음 단계. 키보드(화살표 · Page · 스페이스) · 터치(한 번 쓸면 한 단계)도 같다.
//  첫 · 끝 단계에서 더 굴리면 고정이 풀려 다음 영역으로 간다. 길은 그 단계 자리까지 미끄러지듯 따라간다
const map = document.getElementById('howmap');
const sec = document.getElementById('how');
if (map && sec) {
  const wrap = sec.querySelector<HTMLElement>('.wrap')!;
  const svg = map.querySelector<SVGSVGElement>('.howmap__svg')!;
  const ahead = map.querySelector<SVGPathElement>('.howmap__ahead')!;
  const done = map.querySelector<SVGPathElement>('.howmap__done')!;
  const mask = map.querySelector<SVGPathElement>('.howmap__mask')!;
  const dot = map.querySelector<HTMLElement>('.howmap__dot')!;
  const steps = [...map.querySelectorAll<HTMLLIElement>('.how li')];
  const AT = steps.map((li) => Number(li.dataset.at));
  const n = steps.length;
  const wide = matchMedia('(min-width: 900px)');
  const pinMQ = matchMedia('(min-width: 900px) and (min-height: 600px)');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const D = 'M 40 175 C 210 25, 340 25, 500 120 C 660 215, 790 215, 960 65';
  const GAP = 20;
  let len = 1;
  let target = 0;   // 가야 할 진행률
  let shown = 0;    // 화면에 그린 진행률 — target 을 조금씩 따라간다

  map.classList.add('howmap--path');
  for (const el of [ahead, done, mask]) el.setAttribute('d', D);
  len = ahead.getTotalLength() || 1;
  mask.style.strokeDasharray = `${len} ${len}`;

  // 그림 좌표(1000 × 240) → 지도 안 px
  const toPx = (t: number) => {
    const pt = ahead.getPointAtLength(len * t);
    const m = map.getBoundingClientRect(), b = svg.getBoundingClientRect();
    return { x: b.left - m.left + (pt.x / 1000) * b.width, y: b.top - m.top + (pt.y / 240) * b.height };
  };
  // 봉우리면 위에, 골짜기면 아래에 세운다 — 카드가 길을 덮지 않게
  const above = (t: number) => {
    const y = (u: number) => ahead.getPointAtLength(len * Math.max(0, Math.min(1, u))).y;
    return y(t) <= (y(t - 0.05) + y(t + 0.05)) / 2;
  };

  // BD-017: 단계 자리(li)는 길 위의 한 점 — 아이콘은 그 점 한가운데(선이 아이콘을 지난다), 이름 · 설명 글은 봉우리면 위에, 골짜기면 아래에.
  // 글이 지도 밖으로 나가면 반대쪽으로 돌리고, 좌우는 글 폭의 절반만큼 안쪽으로 당긴다(글만 옮기고 아이콘은 길 위에 둔다)
  const place = () => {
    if (!wide.matches) { for (const li of steps) { li.style.removeProperty('left'); li.style.removeProperty('top'); li.style.removeProperty('--tx'); li.classList.remove('up', 'down'); } return; }
    const W = map.clientWidth, H = map.clientHeight;
    steps.forEach((li, i) => {
      const t = AT[i], pt = toPx(t);
      const txt = li.querySelector<HTMLElement>('.how__txt')!;
      const ic = li.querySelector<HTMLElement>('.step__ic')!;
      const reach = ic.offsetHeight / 2 + GAP + txt.offsetHeight;
      let up = above(t);
      if (up ? pt.y - reach < 4 : pt.y + reach > H - 4) up = !up;
      li.classList.toggle('up', up);
      li.classList.toggle('down', !up);
      li.style.left = `${pt.x}px`;
      li.style.top = `${pt.y}px`;
      const hw = txt.offsetWidth / 2;
      const shift = Math.max(hw + 6 - pt.x, Math.min(0, W - hw - 6 - pt.x));
      li.style.setProperty('--tx', `${shift}px`);
    });
  };

  const draw = (p: number) => {
    map.style.setProperty('--p', p.toFixed(4));
    mask.style.strokeDashoffset = String(len * (1 - p));
    if (wide.matches) { const pt = toPx(p); dot.style.left = `${pt.x}px`; dot.style.top = `${pt.y}px`; }
    steps.forEach((li, i) => li.classList.toggle('on', p >= AT[i] - 0.02));
  };

  let raf = 0;
  const loop = () => {
    shown += (target - shown) * 0.14;
    if (Math.abs(target - shown) < 0.002) shown = target;
    draw(shown);
    raf = shown === target ? 0 : requestAnimationFrame(loop);
  };
  const go = (p: number) => { target = p; if (!raf) raf = requestAnimationFrame(loop); };

  // ── 고정하지 않을 때(좁은 화면) — 윗변이 75% 에 닿을 때 0, 아랫변이 35% 에 닿을 때 1 로 이어서 간다 (샌드박스 구간)
  const freeProgress = () => {
    const r = sec.getBoundingClientRect(), vh = innerHeight;
    return Math.max(0, Math.min(1, (vh * 0.75 - r.top) / (r.height + vh * 0.4)));
  };

  // ── 고정할 때 — 솔루션 영역과 같은 규칙. 트랙의 네 자리 = 네 단계
  const pinned = () => sec.classList.contains('how--pin');
  let active = 0;
  let last = -1e9, hold = 0, holdUntil = 0;
  const STEP_GAP = 220, STEP_MIN = 300, TICK = 100, HOLD = 3, EVERY = 2;
  const range = (): [number, number] => {
    const a = sec.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(wrap).top) || 68);
    return [a, a + sec.offsetHeight - wrap.offsetHeight];
  };
  const stepY = (k: number) => { const [a, b] = range(); return a + ((b - a) * k) / (n - 1); };
  const inside = () => { const [a, b] = range(); return pinned() && scrollY >= a - 24 && scrollY <= b + 24; };
  const takes = (dir: number) => { const k = active + dir; return inside() && k >= 0 && k < n; };
  // 끝 단계를 지나 고정이 풀리면 길 끝까지, 첫 단계 앞이면 길 시작
  const pinTarget = () => {
    const [a, b] = range();
    if (scrollY > b + 8) return 1;
    if (scrollY < a - 8) return 0;
    return AT[active];
  };
  const setStep = (k: number) => { active = Math.max(0, Math.min(n - 1, k)); go(pinTarget()); };
  const holdAt = (y: number) => { hold = y; holdUntil = performance.now() + 260; };
  const stepTo = (k: number) => {
    if (k < 0 || k >= n) return;
    last = performance.now();
    holdAt(stepY(k));
    scrollTo({ top: hold, behavior: 'instant' });
    setStep(k);
  };
  const sync = () => {
    if (!pinned()) { go(still ? 1 : freeProgress()); return; }
    const [a, b] = range();
    const p = Math.min(1, Math.max(0, (scrollY - a) / Math.max(1, b - a)));
    active = Math.min(n - 1, Math.max(0, Math.round(p * (n - 1))));
    go(pinTarget());
  };

  let ticking = false;
  addEventListener('scroll', () => {
    if (pinned() && performance.now() < holdUntil && Math.abs(scrollY - hold) > 1) scrollTo({ top: hold, behavior: 'instant' });
    if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; sync(); }); }
  }, { passive: true });

  if (!still) {
    // 휠 — 한 번 굴리면 한 단계. 길게 굴리면 3칸 머문 뒤 2칸마다 다음 단계
    let wheelAt = 0, wheelDir = 0, mode: 'none' | 'taking' | 'native' = 'none', acc = 0, count = 0;
    addEventListener('wheel', (e) => {
      if (!pinned() || e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      if ((e.target as Element).closest?.('.support, .mnav')) return;
      const now = performance.now(), dir = Math.sign(e.deltaY), flip = dir !== wheelDir;
      if (now - wheelAt > STEP_GAP || flip) mode = 'none';
      wheelAt = now;
      wheelDir = dir;
      const px = Math.min(3 * TICK, Math.abs(e.deltaY) * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? innerHeight : 1));
      sync();
      if (mode !== 'taking') {
        if (!takes(dir)) { mode = 'native'; return; }
        if (e.cancelable) e.preventDefault();
        if (mode === 'none' && (flip || now - last >= STEP_MIN)) stepTo(active + dir);
        else { const [a, b] = range(); holdAt(Math.min(b, Math.max(a, scrollY))); }
        mode = 'taking';
        acc = px;
        count = 1;
        return;
      }
      if (e.cancelable) e.preventDefault();
      acc += px;
      if (acc >= (HOLD + EVERY * count) * TICK) {
        count++;
        const k = active + dir;
        if (k < 0 || k >= n) { mode = 'native'; holdUntil = 0; return; }
        stepTo(k);
        return;
      }
      holdAt(hold);
    }, { passive: false });

    // 키보드(화살표 · Page Up/Down · 스페이스)는 가로채지 않는다 — 브라우저 기본 스크롤 (13 §5 2.1.4, D-028)

    // 터치 — 한 번 쓸면 한 단계
    let touchY: number | null = null, touch: 'none' | 'taken' | 'native' | 'spent' = 'none';
    addEventListener('touchstart', (e) => { touchY = e.touches.length === 1 ? e.touches[0].clientY : null; touch = 'none'; }, { passive: true });
    addEventListener('touchmove', (e) => {
      if (!pinned() || touchY === null || touch === 'native') return;
      const dy = touchY - e.touches[0].clientY;
      if (touch === 'none') {
        if (Math.abs(dy) < 8) return;
        sync();
        touch = e.cancelable && takes(Math.sign(dy)) ? 'taken' : 'native';
        if (touch === 'native') return;
      }
      e.preventDefault();
      if (touch === 'taken' && Math.abs(dy) > 40) { touch = 'spent'; stepTo(active + Math.sign(dy)); }
    }, { passive: false });
  }

  const setPin = () => sec.classList.toggle('how--pin', pinMQ.matches && !still);
  const relayout = () => { setPin(); place(); sync(); shown = target; draw(shown); };

  relayout();
  new ResizeObserver(() => { place(); draw(shown); }).observe(map);
  wide.addEventListener('change', relayout);
  pinMQ.addEventListener('change', relayout);
}
