// GitHub Pages의 기본 한국어 주소 첫 방문에만 IP 국가를 조회한다.
// 명시적 언어 URL·수동 선택·봇은 우선하며, 실패하면 호출자가 언어 안내를 표시한다.
export async function countryLanguageRedirect(bar: HTMLElement): Promise<boolean> {
  if (document.documentElement.lang !== 'ko' || /bot|crawler|spider|scrap|facebookexternalhit/i.test(navigator.userAgent)) return true;
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return false;
  const choice = () => {
    try {
      const value = localStorage.getItem('lang-choice');
      return value && ['ko', 'en', 'ja', 'zh-hans'].includes(value) ? value : null;
    } catch { return null; }
  };
  const linkFor = (locale: string) => bar.querySelector<HTMLAnchorElement>(`[data-lang-choice="${locale}"]`);
  const move = (locale: string) => {
    if (locale === 'ko') return true;
    const link = linkFor(locale) ?? linkFor('en');
    if (!link) return false;
    const target = new URL(link.href, location.href);
    target.search = location.search;
    target.hash = location.hash;
    location.replace(target.href);
    return true;
  };
  const selected = choice();
  if (selected) return move(selected);
  let country: string | null = null;
  try { country = sessionStorage.getItem('country-language'); } catch { /* 저장소 없이도 동작 */ }
  if (country === 'failed') return false;
  if (country && !/^[A-Z]{2}$/.test(country)) country = null;
  if (!country) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch('https://api.country.is/', { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!response.ok) throw new Error('Country lookup failed');
      const data = await response.json();
      if (typeof data.country !== 'string' || !/^[A-Z]{2}$/.test(data.country)) throw new Error('Invalid country');
      country = data.country;
      try { sessionStorage.setItem('country-language', country!); } catch { /* 선택 사항 */ }
    } catch {
      try { sessionStorage.setItem('country-language', 'failed'); } catch { /* 선택 사항 */ }
      return false;
    } finally { clearTimeout(timeout); }
  }
  // 백그라운드로 연 탭은 사용자가 탭을 볼 때 이동한다.
  // 조회 중 수동 언어 선택이 있었다면 자동 이동을 취소한다.
  if (document.visibilityState === 'hidden') {
    await new Promise<void>((resolve) => {
      const visible = () => {
        if (document.visibilityState === 'hidden') return;
        document.removeEventListener('visibilitychange', visible);
        resolve();
      };
      document.addEventListener('visibilitychange', visible);
    });
  }
  if (choice()) return true;
  return move(country === 'KR' ? 'ko' : country === 'JP' ? 'ja' : country === 'CN' ? 'zh-hans' : 'en');
}
