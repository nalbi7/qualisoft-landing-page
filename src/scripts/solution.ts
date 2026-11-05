// 핵심 기능 — FAQ와 같은 details 여닫기. name을 지원하지 않는 브라우저에서만 다른 열린 항목을 닫는다.
document.querySelectorAll<HTMLDetailsElement>('.acc__item').forEach((item) => {
  item.addEventListener('toggle', () => {
    if (!item.open) return;
    item.closest('.accs')?.querySelectorAll<HTMLDetailsElement>('.acc__item[open]').forEach((other) => {
      if (other !== item) other.open = false;
    });
  });
});

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
