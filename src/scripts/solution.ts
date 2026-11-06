// 핵심 기능 — 데스크톱(901px+)에서는 좌측 아코디언 · 우측 화면 그림 2단 배치로 연동하고,
// 모바일·태블릿(900px 이하)에서는 각 아코디언 항목 안(설명 글 아래)으로 화면 그림을 옮긴다 (BD-097 · BD-099).
const featItems = [...document.querySelectorAll<HTMLDetailsElement>('.acc__item')];
const featStage = document.querySelector<HTMLElement>('.feat-stage');
const featShots = new Map<number, HTMLElement>();
document.querySelectorAll<HTMLElement>('.shot[data-shot]').forEach((el) => {
  const idx = Number(el.dataset.shot);
  if (Number.isFinite(idx)) featShots.set(idx, el);
});
const featMobileMq = matchMedia('(max-width: 900px)');

const syncFeatShot = (activeIdx: number) => {
  if (featMobileMq.matches) return;
  featShots.forEach((shot, idx) => {
    shot.hidden = idx !== activeIdx;
  });
};

const syncFeatLayout = () => {
  if (!featStage || !featItems.length) return;
  if (featMobileMq.matches) {
    featStage.hidden = true;
    featItems.forEach((item, idx) => {
      const shot = featShots.get(idx);
      const body = item.querySelector('.acc__body');
      if (shot && body && shot.parentElement !== body) body.appendChild(shot);
      if (shot) shot.hidden = false;
    });
  } else {
    featStage.hidden = false;
    featShots.forEach((shot) => {
      if (shot.parentElement !== featStage) featStage.appendChild(shot);
    });
    let openIdx = featItems.findIndex((item) => item.open);
    if (openIdx < 0) {
      openIdx = 0;
      featItems[0].open = true;
    }
    syncFeatShot(openIdx);
  }
};

featItems.forEach((item, idx) => {
  const summary = item.querySelector('summary');
  summary?.addEventListener('click', (e) => {
    // 데스크톱 2단 배치에서는 우측 화면 그림이 비지 않도록 이미 열린 항목을 다시 눌러 닫는 동작을 막는다
    if (!featMobileMq.matches && item.open) e.preventDefault();
  });
  item.addEventListener('toggle', () => {
    if (!item.open) return;
    featItems.forEach((other) => {
      if (other !== item) other.open = false;
    });
    syncFeatShot(idx);
  });
});

featMobileMq.addEventListener('change', syncFeatLayout);
syncFeatLayout();

// 왼쪽 영역을 지나면 헤더 아래에서 솔루션을 선택한다. 본문에는 고정 왼쪽 열을 남기지 않는다.
const solutionSide = document.querySelector<HTMLElement>('.sp2__side');
const solutionBar = document.querySelector<HTMLElement>('.solution-bar');
if (solutionSide && solutionBar) {
  let pending = false;
  const update = () => {
    pending = false;
    const headerBottom = document.querySelector('.nav')?.getBoundingClientRect().bottom ?? 0;
    const show = solutionSide.getBoundingClientRect().bottom <= headerBottom;
    if (!show && solutionBar.contains(document.activeElement)) {
      const href = document.activeElement?.getAttribute('href');
      [...solutionSide.querySelectorAll<HTMLAnchorElement>('a')].find((a) => a.getAttribute('href') === href)?.focus({ preventScroll: true });
    }
    solutionBar.hidden = !show;
  };
  const queue = () => { if (!pending) { pending = true; requestAnimationFrame(update); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  update();
}
