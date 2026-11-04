// 홈 솔루션 영역 — v7 스크롤 규칙 + 2안 디자인 + 3D 모델 (D-021, BD-002).
// Web-Transition-Lab sandbox/Docs/_design/lab-sandbox.js 의 productsMode 'v7-scroll'
// (switchPnl3DIcon · ensurePnl3DWidget · applyV7ScrollSolutions, 2026-10-30 판)을 옮겼다. 원본과 다른 곳만 「사이트:」로 적는다.
//  - 사이트: 솔루션 값(이름 · 한 줄 · 색 · 아이콘 · 주소)은 목록 버튼의 data-* 에서 읽는다 (원본은 PROD2_SOLUTIONS 고정 배열)
//  - 사이트: three 는 CDN 이 아니라 패키지를 늦게 불러온다 — 영역이 가까워질 때 한 번. 동의 전 바깥 요청 0건 (16-tech-architecture §11)
//  - 사이트: WebGL 이 없거나 움직임 줄이기 설정이면 3D 를 띄우지 않고 SVG 입체 그림(art3d)을 그대로 둔다
//  - 사이트: 판을 누르면 가는 곳은 판 안의 진짜 링크(#pnl-link)다 — 스크립트 클릭 대신 <a href> (19-seo-spec §4)
//  - 사이트: 판이 화면 밖이면 3D 그리기를 멈춘다
//  - 사이트: 3D 는 데스크톱(고정 트랙이 도는 폭)에서만. 그 아래는 2안 반응형 배치와 SVG 그림 (solutions-v7.css 끝)
import { buildSoftSolutionIcons } from './solution-icons-3d.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── 3D 판 (원본 MODULE 3) ── */
const pnl3D = {
  layerEl: null, renderer: null, scene: null, camera: null, rootGroup: null, iconGroups: [],
  activeIdx: 0, rafId: 0, phase: 0, velocity: 0, offset: 0,
  pointerX: 0, pointerY: 0, targetPointerX: 0, targetPointerY: 0, lastTime: 0, visible: true,
  liveUntil: 0, kick: null,   // 사이트: 움직이는 시간 끝 · 그리기 다시 시작 (D-028)
};

function switchPnl3DIcon(nextIdx) {
  if (!pnl3D.iconGroups.length) return;
  const count = pnl3D.iconGroups.length;
  const targetIdx = ((nextIdx % count) + count) % count;
  pnl3D.activeIdx = targetIdx;
  pnl3D.iconGroups.forEach((grp, idx) => {
    grp.visible = idx === targetIdx;
    grp.scale.setScalar(0.82);
    grp.rotation.y = 0;
    grp.rotation.z = 0;
    grp.position.y = 0;
  });
  // 사이트: 판이 바뀌면 약 4초만 움직이고 멈춘다 (WCAG 2.2.2, D-028 — 원본은 무한 반복)
  pnl3D.liveUntil = performance.now() + 4000;
  pnl3D.kick?.();
}

function ensurePnl3DWidget(THREE, activeIdx) {
  const pnl = document.getElementById('pnl');
  const artWrap = pnl?.querySelector('.pnl__art');
  if (!pnl || !artWrap || pnl3D.renderer) return;

  const layer = document.createElement('div');
  layer.className = 'qlab-pnl-3d-layer';
  layer.setAttribute('aria-hidden', 'true');
  artWrap.appendChild(layer);
  pnl3D.layerEl = layer;
  pnl.classList.add('qlab-products-3d');

  const rect = layer.getBoundingClientRect();
  const w = Math.max(260, rect.width || 340);
  const h = Math.max(230, rect.height || 300);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    // 사이트: WebGL 을 만들 수 없으면 SVG 그림으로 돌아간다
    pnl.classList.remove('qlab-products-3d');
    layer.remove();
    return;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h);
  if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  layer.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 50);
  camera.position.set(0, 0, 5.8);
  const rootGroup = new THREE.Group();
  rootGroup.rotation.x = 0.18;
  rootGroup.rotation.y = -0.24;
  scene.add(rootGroup);
  const iconGroups = buildSoftSolutionIcons(THREE);
  iconGroups.forEach((g) => rootGroup.add(g));

  // 부드러운 무광 스튜디오 조명 (원본 값 그대로)
  scene.add(new THREE.AmbientLight(0xffffff, 1.35));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.7);
  keyLight.position.set(3.5, 5.0, 5.5);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xe8eeff, 1.15);
  fillLight.position.set(-4.0, -2.5, 3.5);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0xfff8eb, 0.85);
  rimLight.position.set(0, 4.5, -4.0);
  scene.add(rimLight);

  Object.assign(pnl3D, { renderer, scene, camera, rootGroup, iconGroups });
  switchPnl3DIcon(activeIdx);

  // 사이트: 커서 따라 기울기는 판 위에서만 — 판을 벗어나면 제자리로 (D-028, 원본은 영역 전체)
  pnl.addEventListener('pointermove', (e) => {
    const r = pnl.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      pnl3D.targetPointerX = Math.max(-0.55, Math.min(0.55, ((e.clientX - r.left) / r.width - 0.5) * 0.55));
      pnl3D.targetPointerY = Math.max(-0.4, Math.min(0.4, ((e.clientY - r.top) / r.height - 0.5) * 0.38));
      pnl3D.kick?.();
    }
  }, { passive: true });
  pnl.addEventListener('pointerleave', () => { pnl3D.targetPointerX = 0; pnl3D.targetPointerY = 0; pnl3D.kick?.(); });
  addEventListener('resize', () => {
    const r = layer.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
      renderer.setSize(r.width, r.height);
    }
  });

  const tick = (now) => {
    pnl3D.rafId = 0;
    if (!pnl3D.visible) return;
    pnl3D.rafId = requestAnimationFrame(tick);
    const dt = Math.min((now - pnl3D.lastTime) / 1000, 0.1);
    pnl3D.lastTime = now;
    pnl3D.phase += dt;
    pnl3D.velocity *= Math.pow(1 - 0.88, dt);
    pnl3D.offset += pnl3D.velocity * dt;
    pnl3D.offset *= Math.pow(1 - 0.42, dt);
    pnl3D.pointerX += (pnl3D.targetPointerX - pnl3D.pointerX) * 0.09;
    pnl3D.pointerY += (pnl3D.targetPointerY - pnl3D.pointerY) * 0.09;
    // 사이트: 둥실 · 흔들림의 크기 — 움직이는 시간 끝 0.8초 동안 0 으로 줄어든다 (D-028)
    const amp = Math.max(0, Math.min(1, (pnl3D.liveUntil - now) / 800));
    rootGroup.position.y = Math.sin(pnl3D.phase * 1.5) * 0.08 * amp;
    rootGroup.rotation.y = -0.24 + pnl3D.offset + pnl3D.pointerX + Math.sin((pnl3D.phase * Math.PI * 2) / 9.5) * ((14 * Math.PI) / 180) * amp;
    rootGroup.rotation.x = 0.18 + pnl3D.pointerY;
    const activeGroup = iconGroups[pnl3D.activeIdx];
    activeGroup?.children.forEach((child, i) => {
      if (child.userData && child.userData.floatSpeed) {
        child.position.y = child.userData.baseY + Math.sin(pnl3D.phase * child.userData.floatSpeed + i) * 0.07 * amp;
      }
    });
    renderer.render(scene, camera);
    // 사이트: 움직임이 다 끝나면 그리기를 멈춘다 — 판이 바뀌거나 커서가 오면 kick 으로 다시 (D-028)
    const settled = amp === 0 && Math.abs(pnl3D.targetPointerX - pnl3D.pointerX) < 1e-3 && Math.abs(pnl3D.targetPointerY - pnl3D.pointerY) < 1e-3 && Math.abs(pnl3D.offset) < 1e-3;
    if (settled) { cancelAnimationFrame(pnl3D.rafId); pnl3D.rafId = 0; }
  };
  const start = () => { if (!pnl3D.rafId && pnl3D.visible) { pnl3D.lastTime = performance.now(); pnl3D.rafId = requestAnimationFrame(tick); } };
  pnl3D.kick = start;
  // 사이트: 판이 화면 밖이면 그리기를 멈춘다
  new IntersectionObserver(([en]) => { pnl3D.visible = en.isIntersecting; if (pnl3D.visible) start(); }).observe(pnl);
  start();
}

/* ── v7 스크롤 규칙 (원본 MODULE 3-B) ── */
const prodSec = document.getElementById('products');
const plist = prodSec?.querySelector('.plist');
const pnl = document.getElementById('pnl');
if (prodSec && plist && pnl) {
  prodSec.classList.add('qlab-v7-scroll');
  const prows = [...plist.querySelectorAll('.prow')];
  const n = prows.length || 6;
  const SOLS = prows.map((r) => ({ n: r.dataset.name, c: r.dataset.color, l: r.dataset.line, i: r.dataset.icon, h: r.dataset.href }));
  prows.forEach((r, idx) => r.style.setProperty('--c', SOLS[idx].c));
  const link = document.getElementById('pnl-link');
  const barFill = document.getElementById('qlabSolBarFill');

  const stickyMQ = matchMedia('(min-width: 900px) and (min-height: 600px)');
  let activeIdx = -1;
  let solTick = false;
  let solLast = -1e9, solHold = 0, solHoldUntil = 0;
  const SOL_GAP = 220, SOL_MIN = 300;
  const SOL_TICK = 100, SOL_HOLD = 3, SOL_EVERY = 2;
  let exitHoldTimer = null;
  let isExitingLastSol = false;

  // 마지막 솔루션에 오면 다음 영역(#cases)이 드러나고, 앞으로 돌아가면 흐려지며 사라진다
  const updateNextSecReveal = (show) => document.getElementById('cases')?.classList.toggle('qlab-revealed', !!show);

  function setSol(k) {
    if (activeIdx === k || k < 0 || k >= n) return;
    activeIdx = k;
    const data = SOLS[k];
    prodSec.style.setProperty('--cur', data.c);
    prows.forEach((r, idx) => { if (idx === k) r.setAttribute('aria-current', 'true'); else r.removeAttribute('aria-current'); });   // 사이트: aria-expanded → aria-current (BD-041)
    pnl.style.setProperty('--pc', data.c);
    pnl.classList.toggle('pnl--cop', k === n - 1);
    const pnlN = document.getElementById('pnl-n'), pnlL = document.getElementById('pnl-l'), pnlIc = document.getElementById('pnl-ic');
    if (pnlN) pnlN.textContent = data.n;
    if (pnlL) pnlL.textContent = data.l;
    if (pnlIc) pnlIc.src = data.i;
    if (link) { link.href = data.h; link.setAttribute('aria-label', `${data.n} — ${link.dataset.label}`); }
    pnl.querySelectorAll('.art').forEach((a, idx) => a.classList.toggle('on', idx === k));
    switchPnl3DIcon(k);
    if (!stickyMQ.matches) {
      updateNextSecReveal(true);
      placeSeg();
    } else if (!isExitingLastSol) {
      const r = solRange();
      updateNextSecReveal(k === n - 1 || scrollY >= r[1] - 40);
    }
  }

  // 사이트: 고정 트랙이 없는 폭(휴대폰 · 낮은 창)은 막대가 스크롤로 차오르지 않는다 — 대신 고른 솔루션 줄 옆에 그 줄 높이만큼 막대를 둔다 (BD-044)
  const barTrack = barFill?.parentElement;
  function placeSeg() {
    if (!barFill || !barTrack) return;
    if (stickyMQ.matches) { barFill.classList.remove('seg'); barFill.style.removeProperty('height'); return; }
    const row = prows[activeIdx];
    if (!row) return;
    const y = row.getBoundingClientRect().top - barTrack.getBoundingClientRect().top;
    barFill.classList.add('seg');
    barFill.style.height = `${row.offsetHeight}px`;
    barFill.style.transform = `translateY(${y}px)`;
  }
  addEventListener('resize', placeSeg);

  function solRange() {
    const sticky = prodSec.querySelector('.prod2');
    if (!sticky) return [0, 1];
    const a = prodSec.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(sticky).top || '72');
    const b = a + prodSec.offsetHeight - sticky.offsetHeight;
    return [a, b];
  }
  const solY = (k) => { const r = solRange(); return r[0] + ((r[1] - r[0]) * k) / (n - 1); };
  const solIn = () => { const r = solRange(); return stickyMQ.matches && scrollY >= r[0] - 24 && scrollY <= r[1] + 24; };
  const solTakes = (dir) => { const k = activeIdx + dir; return solIn() && k >= 0 && k < n; };
  const setBar = (frac) => { if (barFill) barFill.style.transform = `scaleY(${frac})`; };

  function solTo(k) {
    if (k < 0 || k >= n) return;
    // 사이트: 고정 트랙이 없는 폭에서는 화면을 옮기지 않고 판만 바꾼다 (원본은 휴대폰에서도 트랙 자리로 스크롤해 화면이 튄다)
    if (!stickyMQ.matches) { setSol(k); updateNextSecReveal(true); return; }
    solLast = performance.now();
    const r = solRange(), b = r[1];
    setBar(((k / (n - 1)) * (n - 1) + 1) / n);
    // 사이트: 마지막(Copilot)에서 앞으로 돌아갈 때 원본은 #cases 가 흐려지는 것을 보이려고 650ms 머문 뒤 옮겼다 — #cases 를 숨기지 않으니 바로 옮긴다 (D-028)
    if (exitHoldTimer) { clearTimeout(exitHoldTimer); exitHoldTimer = null; isExitingLastSol = false; }
    solHold = solY(k);
    solHoldUntil = performance.now() + 260;
    scrollTo({ top: solHold, behavior: 'instant' });
    setSol(k);
    if (!stickyMQ.matches) updateNextSecReveal(true);
    else updateNextSecReveal(k === n - 1 || solHold >= r[1] - 40);
  }
  const solHoldAt = (y) => { solHold = y; solHoldUntil = performance.now() + 260; };
  const solHoldHere = () => { const r = solRange(); solHoldAt(Math.min(r[1], Math.max(r[0], scrollY))); };

  function solScroll() {
    solTick = false;
    if (!stickyMQ.matches) { updateNextSecReveal(true); return; }
    if (isExitingLastSol) return;
    const [a, b] = solRange();
    const p = Math.min(1, Math.max(0, (scrollY - a) / Math.max(1, b - a)));
    setBar((p * (n - 1) + 1) / n);
    const k = Math.min(n - 1, Math.max(0, Math.round(p * (n - 1))));
    setSol(k);
    updateNextSecReveal(k === n - 1 || scrollY >= b - 40);
  }

  addEventListener('scroll', () => {
    if (performance.now() < solHoldUntil && Math.abs(scrollY - solHold) > 1) scrollTo({ top: solHold, behavior: 'instant' });
    if (!solTick) { solTick = true; requestAnimationFrame(solScroll); }
  }, { passive: true });

  // 휠 — 한 번 굴리면 한 솔루션. 길게 굴리면 3칸 머문 뒤 2칸마다 다음 솔루션 (v7과 같다)
  // 사이트: 움직임 줄이기 설정이면 휠 · 터치도 가로채지 않는다 (D-028)
  let wheelAt = 0, wheelDir = 0, wheelMode = 'none', wheelAcc = 0, wheelSteps = 0;
  addEventListener('wheel', (e) => {
    if (reduce || e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    if (e.target.closest && e.target.closest('.support, .mnav')) return;
    const now = performance.now(), dir = Math.sign(e.deltaY), flip = dir !== wheelDir;
    if (now - wheelAt > SOL_GAP || flip) wheelMode = 'none';
    wheelAt = now;
    wheelDir = dir;
    const px = Math.min(3 * SOL_TICK, Math.abs(e.deltaY) * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? innerHeight : 1));
    solScroll();
    if (wheelMode !== 'taking') {
      if (!solTakes(dir)) { wheelMode = 'native'; return; }
      if (e.cancelable) e.preventDefault();
      if (wheelMode === 'none' && (flip || now - solLast >= SOL_MIN)) solTo(activeIdx + dir);
      else solHoldHere();
      wheelMode = 'taking';
      wheelAcc = px;
      wheelSteps = 1;
      return;
    }
    if (e.cancelable) e.preventDefault();
    wheelAcc += px;
    if (wheelAcc >= (SOL_HOLD + SOL_EVERY * wheelSteps) * SOL_TICK) {
      wheelSteps++;
      const nextK = activeIdx + dir;
      if (nextK < 0 || nextK >= n) { wheelMode = 'native'; solHoldUntil = 0; return; }
      solTo(nextK);
      return;
    }
    solHoldAt(solHold);
  }, { passive: false });

  // 사이트: 키보드(화살표 · Page Up/Down · 스페이스)는 가로채지 않는다 — 브라우저 기본 스크롤 (13 §5 2.1.4, D-028)

  // 터치 — 한 번 쓸면 한 솔루션
  let touchY = null, touchState = 'none';
  addEventListener('touchstart', (e) => { if (reduce) return; touchY = e.touches.length === 1 ? e.touches[0].clientY : null; touchState = 'none'; }, { passive: true });
  addEventListener('touchmove', (e) => {
    if (touchY === null || touchState === 'native') return;
    const dy = touchY - e.touches[0].clientY;
    if (touchState === 'none') {
      if (Math.abs(dy) < 8) return;
      solScroll();
      touchState = e.cancelable && solTakes(Math.sign(dy)) ? 'taken' : 'native';
      if (touchState === 'native') return;
    }
    e.preventDefault();
    if (touchState === 'taken' && Math.abs(dy) > 40) { touchState = 'spent'; solTo(activeIdx + Math.sign(dy)); }
  }, { passive: false });

  addEventListener('resize', solScroll);
  // 목록의 솔루션을 누르면 트랙의 그 자리로
  prows.forEach((r, k) => r.addEventListener('click', (e) => { e.preventDefault(); solTo(k); }));

  setSol(0);
  solScroll();

  // 3D — 영역이 가까워지면 three 를 한 번 불러온다. WebGL 이 없거나 움직임 줄이기면 SVG 그림을 둔다
  const canGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
  // 사이트: 3D 는 고정 트랙이 도는 데스크톱에서만 — 휴대폰에서는 124KB(압축) 묶음을 받지 않고 SVG 그림을 둔다 (16-tech-architecture §10 모바일 기준)
  if (!reduce && canGL && stickyMQ.matches) {
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      import('./three-lite.js').then((THREE) => ensurePnl3DWidget(THREE, Math.max(0, activeIdx))).catch(() => { /* SVG 그림을 그대로 둔다 */ });
    }, { rootMargin: '600px 0px' });
    io.observe(prodSec);
  }
}
