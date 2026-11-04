// 핵심 기능 — FAQ와 같은 details 여닫기. name을 지원하지 않는 브라우저에서만 다른 열린 항목을 닫는다.
document.querySelectorAll<HTMLDetailsElement>('.acc__item').forEach((item) => {
  item.addEventListener('toggle', () => {
    if (!item.open) return;
    item.closest('.accs')?.querySelectorAll<HTMLDetailsElement>('.acc__item[open]').forEach((other) => {
      if (other !== item) other.open = false;
    });
  });
});
