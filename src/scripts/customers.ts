// 고객 사례 목록 — 산업 · 솔루션 알약 필터 (D-031). 두 필터는 함께 걸린다(산업 그리고 솔루션).
// 고른 값은 주소의 ?ind= · ?sol= 에 남겨 링크로 공유할 수 있다. 스크립트가 없으면 필터 줄은 숨은 채 카드가 모두 보인다
(() => {
  const bar = document.getElementById('cfilter');
  const items = [...document.querySelectorAll<HTMLElement>('.scards > li')];
  if (bar && items.length) {
    const pills = [...bar.querySelectorAll<HTMLButtonElement>('.pill')];
    const count = document.getElementById('cfilter-n');
    const empty = document.getElementById('cfilter-empty');
    const state: Record<string, string> = { ind: '', sol: '' };
    const has = (f: string, v: string) => pills.some((p) => p.dataset.f === f && p.dataset.v === v);
    const q = new URLSearchParams(location.search);
    for (const f of ['ind', 'sol']) { const v = q.get(f) ?? ''; if (v && has(f, v)) state[f] = v; }

    const apply = (save: boolean, keepHash = false) => {
      pills.forEach((p) => p.setAttribute('aria-pressed', String(state[p.dataset.f ?? ''] === (p.dataset.v ?? ''))));
      let n = 0;
      items.forEach((li) => {
        const ok = (!state.ind || li.dataset.ind === state.ind) && (!state.sol || (li.dataset.sol ?? '').split(' ').includes(state.sol));
        li.hidden = !ok;
        if (ok) n++;
      });
      if (count) count.textContent = (count.dataset.tpl ?? '{n}').replace('{n}', String(n));
      if (empty) empty.hidden = n > 0;
      if (save) {
        const u = new URL(location.href);
        for (const f of ['ind', 'sol']) { if (state[f]) u.searchParams.set(f, state[f]); else u.searchParams.delete(f); }
        if (!keepHash) u.hash = '';
        history.replaceState(null, '', u);
      }
    };
    pills.forEach((p) => p.addEventListener('click', () => { state[p.dataset.f ?? ''] = p.dataset.v ?? ''; apply(true); }));
    document.querySelector('[data-reset]')?.addEventListener('click', () => { state.ind = state.sol = ''; apply(true); });

    // 「함께한 기업」 로고나 주소의 #s-<로고 id> 로 왔는데 그 카드가 필터에 가려 있으면 필터를 풀고 보인다
    const reveal = () => {
      const li = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
      if (!li || !li.hidden) return;
      state.ind = state.sol = '';
      apply(true, true);
      li.scrollIntoView({ block: 'start' });
    };
    addEventListener('hashchange', reveal);

    bar.hidden = false;
    apply(false);
    reveal();
  }
})();
