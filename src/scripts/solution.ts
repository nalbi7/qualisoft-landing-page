// 솔루션 상세 — 핵심 기능 「+」 여닫기. 시안 solution-crm-2an.html 의 인라인 스크립트(make_v8.py sol2_js)를 옮겼다 (BD-001).
// 줄마다 화면 그림이 붙어 한 번에 한 줄만 펼친다 — 다른 줄을 펼치면 앞서 펼친 줄은 접힌다 (BD-034).
// 모바일 메뉴(MNAV_JS)는 site.ts 가 맡는다. 스크립트가 없으면 첫 줄만 펼친 채로 남는다
const accs = [...document.querySelectorAll<HTMLButtonElement>('.acc')];
const calm = matchMedia('(prefers-reduced-motion: reduce)');
const set = (b: HTMLButtonElement, open: boolean) => {
  b.setAttribute('aria-expanded', String(open));
  const body = document.getElementById(b.getAttribute('aria-controls') ?? '');
  if (body) body.hidden = !open;
};
accs.forEach((b) => {
  b.addEventListener('click', () => {
    const open = b.getAttribute('aria-expanded') !== 'true';
    // 위쪽 줄이 접히면 누른 줄이 화면에서 위로 밀려난다 — 먼저 그만큼 스크롤을 되돌려 누른 줄을 제자리에 둔다
    const before = b.getBoundingClientRect().top;
    const others = open ? accs.filter((o) => o !== b && o.getAttribute('aria-expanded') === 'true') : [];
    others.forEach((o) => set(o, false));
    set(b, open);
    const moved = b.getBoundingClientRect().top - before;
    if (moved) scrollBy({ top: moved, behavior: 'instant' });
    // 펼친 줄을 바꿨으면 새 줄의 설명이 보이게 그 줄을 고정 메뉴 바로 아래로 올린다 (html scroll-padding-top)
    if (others.length) b.scrollIntoView({ block: 'start', behavior: calm.matches ? 'instant' : 'smooth' });
  });
});
