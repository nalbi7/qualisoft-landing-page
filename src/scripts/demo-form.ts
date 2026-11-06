// 데모 신청 폼 클라이언트 로직 — Dataverse 영업문의(new_q4s) 직접 연동 (A3, A4, BD-106)
// 국가 검색 드롭다운 및 솔루션별 예시 문장(Ghost Text · Tab 자동완성) 지원

const PERSONAL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'naver.com', 'hanmail.net', 'daum.net',
  'kakao.com', 'nate.com', 'hotmail.com', 'outlook.com', 'live.com',
  'msn.com', 'yahoo.com', 'icloud.com', 'me.com', 'proton.me', 'protonmail.com',
]);

const COUNTRY_TOP = ['KR', 'US', 'JP', 'CN', 'TW', 'HK', 'SG', 'GB', 'DE', 'FR', 'CH', 'NL', 'IT', 'VN', 'IN', 'AU', 'CA'];
const COUNTRY_ALL = (
  'AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ ' +
  'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR ' +
  'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IQ IR IS IT JE JM JO JP KE KG ' +
  'KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU ' +
  'MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW ' +
  'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG ' +
  'US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'
).split(' ');

const GHOST: Record<string, Record<string, string>> = {
  ko: {
    crm: 'Dynamics 365 CRM 도입을 검토하고 있습니다. 지금 영업·고객 서비스 업무에 맞는 구축 범위와 일정을 상담받고 싶습니다.',
    po: 'Project Operations로 프로젝트 견적부터 수행·청구까지 관리하고 싶습니다. 도입 범위와 일정을 상담받고 싶습니다.',
    ci: 'Customer Insights로 고객 데이터를 모으고 마케팅 여정을 자동화하고 싶습니다. 적용 방안을 상담받고 싶습니다.',
    bi: 'Power BI·Fabric으로 흩어진 데이터를 모아 부서별 대시보드를 만들고 싶습니다. 구축 범위와 일정을 상담받고 싶습니다.',
    pp: 'Power Platform으로 현장 앱과 결재 자동화를 만들고 싶습니다. 적용할 업무와 진행 방식을 상담받고 싶습니다.',
    copilot: '업무에 Copilot과 AI 에이전트를 적용하고 싶습니다. 적용할 업무와 준비할 데이터를 상담받고 싶습니다.',
  },
  en: {
    crm: "We're considering Dynamics 365 CRM and would like advice on scope and timeline for our sales and customer service processes.",
    po: "We'd like to manage projects from quote to delivery and billing with Project Operations. Please advise on scope and timeline.",
    ci: "We'd like to unify customer data and automate marketing journeys with Customer Insights. Please advise on how to approach it.",
    bi: "We'd like to bring scattered data together and build department dashboards with Power BI and Fabric. Please advise on scope and timeline.",
    pp: "We'd like to build field apps and automate approvals with Power Platform. Please advise on which processes to start with.",
    copilot: "We'd like to bring Copilot and AI agents into our work. Please advise on where to apply them and what data to prepare.",
  },
  ja: {
    crm: 'Dynamics 365 CRM の導入を検討しています。営業・カスタマーサービス業務に合った構築範囲とスケジュールについて相談したいです。',
    po: 'Project Operations で見積から実行・請求までを管理したいと考えています。導入範囲とスケジュールについて相談したいです。',
    ci: 'Customer Insights で顧客データを統合し、マーケティングジャーニーを自動化したいと考えています。進め方を相談したいです。',
    bi: 'Power BI・Fabric で散在するデータを集め、部門別ダッシュボードを作りたいと考えています。構築範囲とスケジュールを相談したいです。',
    pp: 'Power Platform で現場アプリと決裁の自動化を作りたいと考えています。対象業務と進め方を相談したいです。',
    copilot: '業務に Copilot と AI エージェントを取り入れたいと考えています。適用する業務と準備するデータについて相談したいです。',
  },
  'zh-hans': {
    crm: '我们正在考虑导入 Dynamics 365 CRM，希望就符合销售与客户服务业务的实施范围和时间安排进行咨询。',
    po: '我们希望用 Project Operations 管理从报价到项目执行与开票的全过程，想咨询导入范围和时间安排。',
    ci: '我们希望用 Customer Insights 整合客户数据并自动化营销旅程，想咨询具体的实施方案。',
    bi: '我们希望用 Power BI 与 Fabric 汇集分散的数据并建立部门仪表板，想咨询实施范围和时间安排。',
    pp: '我们希望用 Power Platform 构建现场应用并实现审批自动化，想咨询适合的业务和推进方式。',
    copilot: '我们希望在业务中引入 Copilot 与 AI 智能体，想咨询适用的业务以及需要准备的数据。',
  },
};

const ESCAPE_ODATA = (s: string) => String(s ?? '').replace(/'/g, "''").trim();

function getEmailDomain(email: string): string {
  const [, domain = ''] = String(email ?? '').trim().toLowerCase().split('@');
  return domain;
}

function normalizePhone(phone: string): string {
  return String(phone ?? '').replace(/[^\d+]/g, '').trim();
}

function digitsOnly(phone: string): string {
  return String(phone ?? '').replace(/\D/g, '');
}

interface TokenResponse {
  access_token: string;
  expires_in?: number;
  expires_on?: string;
}

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(apiUrl: string, secret: string, client: string): Promise<string> {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }
  const cleanApi = apiUrl.replace(/\/+$/, '');
  const url = `${cleanApi}/crm/token?secret=${encodeURIComponent(secret)}&client=${encodeURIComponent(client)}`;
  const res = await fetch(url, { method: 'GET', credentials: 'omit' });
  if (!res.ok) {
    throw new Error(`Token request failed (HTTP ${res.status})`);
  }
  const data = (await res.json()) as TokenResponse;
  if (!data?.access_token) {
    throw new Error('No access_token in token response');
  }
  cachedToken = data.access_token;
  const expSec = typeof data.expires_in === 'number' ? data.expires_in : 3600;
  tokenExpiresAt = now + Math.max(expSec - 60, 10) * 1000;
  return cachedToken;
}

async function queryContact(crmUrl: string, token: string, name: string, email: string, phone: string): Promise<string | null> {
  const rName = ESCAPE_ODATA(name);
  const rEmail = ESCAPE_ODATA(email);
  const rPhone = ESCAPE_ODATA(phone);
  const conditions: string[] = [];
  if (rName) conditions.push(`(fullname eq '${rName}' or firstname eq '${rName}' or lastname eq '${rName}')`);
  if (rEmail) conditions.push(`(emailaddress1 eq '${rEmail}')`);
  if (rPhone) conditions.push(`(telephone1 eq '${rPhone}' or mobilephone eq '${rPhone}')`);

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json; odata.metadata=minimal',
  };

  if (conditions.length > 0) {
    const filter = encodeURIComponent(conditions.join(' or '));
    const url = `${crmUrl}/contacts?$filter=${filter}&$select=contactid&$top=1`;
    try {
      const res = await fetch(url, { headers, credentials: 'omit' });
      if (res.ok) {
        const body = await res.json();
        if (body?.value?.[0]?.contactid) return body.value[0].contactid;
      }
    } catch {}
  }

  // fallback: 연락처확인필요
  try {
    const fallbackFilter = encodeURIComponent("fullname eq '연락처확인필요'");
    const res = await fetch(`${crmUrl}/contacts?$filter=${fallbackFilter}&$select=contactid&$top=1`, { headers, credentials: 'omit' });
    if (res.ok) {
      const body = await res.json();
      return body?.value?.[0]?.contactid ?? null;
    }
  } catch {}
  return null;
}

async function queryAccount(crmUrl: string, token: string, company: string): Promise<string | null> {
  const rComp = ESCAPE_ODATA(company);
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json; odata.metadata=minimal',
  };

  if (rComp) {
    const filter = encodeURIComponent(`new_name eq '${rComp}'`);
    const url = `${crmUrl}/new_q1s?$filter=${filter}&$select=new_q1id&$top=1`;
    try {
      const res = await fetch(url, { headers, credentials: 'omit' });
      if (res.ok) {
        const body = await res.json();
        if (body?.value?.[0]?.new_q1id) return body.value[0].new_q1id;
      }
    } catch {}
  }

  // fallback: 거래처확인필요
  try {
    const fallbackFilter = encodeURIComponent("new_name eq '거래처확인필요'");
    const res = await fetch(`${crmUrl}/new_q1s?$filter=${fallbackFilter}&$select=new_q1id&$top=1`, { headers, credentials: 'omit' });
    if (res.ok) {
      const body = await res.json();
      return body?.value?.[0]?.new_q1id ?? null;
    }
  } catch {}
  return null;
}

interface CountryEntry {
  code: string;
  name: string;
  searchStr: string;
}

function initCountrySelect(locale: string) {
  const searchInputEl = document.getElementById('country-search') as HTMLInputElement | null;
  const hiddenInputEl = document.getElementById('country') as HTMLInputElement | null;
  const listElRaw = document.getElementById('country-list') as HTMLUListElement | null;
  const clearBtn = document.getElementById('country-clear') as HTMLButtonElement | null;
  if (!searchInputEl || !hiddenInputEl || !listElRaw) return;
  const searchInput: HTMLInputElement = searchInputEl;
  const hiddenInput: HTMLInputElement = hiddenInputEl;
  const listEl: HTMLUListElement = listElRaw;

  let displayNames: Intl.DisplayNames | null = null;
  try {
    const intlLoc = locale === 'zh-hans' ? 'zh-Hans' : locale;
    displayNames = new Intl.DisplayNames([intlLoc], { type: 'region' });
  } catch {}

  const getCountryName = (code: string) => {
    try {
      return displayNames?.of(code) || code;
    } catch {
      return code;
    }
  };

  const topCountries: CountryEntry[] = COUNTRY_TOP.map((code) => {
    const name = getCountryName(code);
    return { code, name, searchStr: `${name} ${code}`.toLowerCase() };
  });

  const restCodes = COUNTRY_ALL.filter((c) => !COUNTRY_TOP.includes(c));
  const restCountries: CountryEntry[] = restCodes.map((code) => {
    const name = getCountryName(code);
    return { code, name, searchStr: `${name} ${code}`.toLowerCase() };
  }).sort((a, b) => a.name.localeCompare(b.name, locale));

  const allEntries = [...topCountries, ...restCountries];
  let activeIndex = -1;
  let visibleEntries: CountryEntry[] = [];

  function renderList(query: string) {
    if (!listEl) return;
    const q = query.trim().toLowerCase();
    listEl.innerHTML = '';
    activeIndex = -1;

    if (!q) {
      visibleEntries = allEntries;
      // 상단 추천 국가
      topCountries.forEach((entry) => {
        listEl.appendChild(createItemEl(entry));
      });
      // 구분선
      const divEl = document.createElement('li');
      divEl.className = 'demo-country-divider';
      divEl.setAttribute('role', 'separator');
      listEl.appendChild(divEl);
      // 나머지 국가
      restCountries.forEach((entry) => {
        listEl.appendChild(createItemEl(entry));
      });
      return;
    }

    visibleEntries = allEntries.filter((e) => e.searchStr.includes(q));
    if (visibleEntries.length === 0) {
      const emptyEl = document.createElement('li');
      emptyEl.className = 'demo-country-empty';
      emptyEl.textContent = 'No matching country found';
      listEl.appendChild(emptyEl);
      return;
    }

    visibleEntries.forEach((entry) => {
      listEl.appendChild(createItemEl(entry));
    });
  }

  function createItemEl(entry: CountryEntry): HTMLElement {
    const li = document.createElement('li');
    li.className = 'demo-country-item';
    li.setAttribute('role', 'option');
    li.dataset.code = entry.code;
    li.dataset.name = entry.name;
    if (hiddenInput?.value === entry.name) {
      li.classList.add('is-selected');
    }

    const nameSpan = document.createElement('span');
    nameSpan.textContent = entry.name;
    const codeSpan = document.createElement('span');
    codeSpan.className = 'demo-country-code';
    codeSpan.textContent = entry.code;

    li.appendChild(nameSpan);
    li.appendChild(codeSpan);

    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      selectCountry(entry);
    });
    return li;
  }

  function selectCountry(entry: CountryEntry | null) {
    if (entry) {
      searchInput.value = entry.name;
      hiddenInput.value = entry.name;
      if (clearBtn) clearBtn.hidden = false;
    } else {
      searchInput.value = '';
      hiddenInput.value = '';
      if (clearBtn) clearBtn.hidden = true;
    }
    closeDropdown();
  }

  function openDropdown() {
    listEl.hidden = false;
    searchInput.setAttribute('aria-expanded', 'true');
    renderList(searchInput.value);
  }

  function closeDropdown() {
    listEl.hidden = true;
    searchInput.setAttribute('aria-expanded', 'false');
    activeIndex = -1;
    // 선택되지 않은 임의 입력값 정리
    if (!hiddenInput.value) {
      searchInput.value = '';
      if (clearBtn) clearBtn.hidden = true;
    } else {
      searchInput.value = hiddenInput.value;
    }
  }

  searchInput.addEventListener('focus', () => openDropdown());
  searchInput.addEventListener('input', () => {
    openDropdown();
    if (clearBtn) clearBtn.hidden = !searchInput.value;
  });

  searchInput.addEventListener('keydown', (e) => {
    if (listEl.hidden) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        openDropdown();
        e.preventDefault();
      }
      return;
    }

    const items = listEl.querySelectorAll('.demo-country-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      updateActiveItem(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      updateActiveItem(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) {
        const item = items[activeIndex] as HTMLElement;
        const code = item.dataset.code || '';
        const name = item.dataset.name || '';
        selectCountry({ code, name, searchStr: '' });
      } else if (visibleEntries[0]) {
        selectCountry(visibleEntries[0]);
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  function updateActiveItem(items: NodeListOf<Element>) {
    items.forEach((it, idx) => {
      if (idx === activeIndex) {
        it.classList.add('is-active');
        (it as HTMLElement).scrollIntoView({ block: 'nearest' });
      } else {
        it.classList.remove('is-active');
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      selectCountry(null);
      searchInput.focus();
    });
  }

  document.addEventListener('pointerdown', (e) => {
    const wrapper = document.getElementById('country-select-wrapper');
    if (wrapper && !wrapper.contains(e.target as Node)) {
      closeDropdown();
    }
  });
}

function initGhostText(locale: string) {
  const msgElRaw = document.getElementById('message') as HTMLTextAreaElement | null;
  const ghostElRaw = document.getElementById('ghost-text');
  const ghostBtnRaw = document.getElementById('ghost-hint');
  const ghostWrapRaw = document.getElementById('ghost-wrap');
  if (!msgElRaw || !ghostElRaw || !ghostBtnRaw || !ghostWrapRaw) return;
  const msgEl: HTMLTextAreaElement = msgElRaw;
  const ghostEl: HTMLElement = ghostElRaw;
  const ghostBtn: HTMLElement = ghostBtnRaw;
  const ghostWrap: HTMLElement = ghostWrapRaw;

  const solParam = new URLSearchParams(window.location.search).get('sol') || '';
  const langKey = GHOST[locale] ? locale : 'en';
  const ghostMap = GHOST[langKey] || GHOST.en;

  const solKey = (solParam || '').toLowerCase();
  const text = ghostMap[solKey];
  if (!text) return;

  const originalPlaceholder = msgEl.placeholder;
  let timer: number | null = null;
  let activeText: string | null = null;

  function showGhost(str: string, animate: boolean) {
    activeText = str;
    ghostEl.hidden = false;
    ghostBtn.hidden = false;
    ghostWrap.classList.add('on');
    msgEl.placeholder = '';
    if (timer) clearInterval(timer);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!animate || reduce) {
      ghostEl.textContent = str;
      return;
    }

    let n = 0;
    ghostEl.textContent = '';
    timer = window.setInterval(() => {
      n += Math.max(1, Math.ceil(str.length / 45));
      ghostEl.textContent = str.slice(0, n);
      if (n >= str.length) {
        if (timer) clearInterval(timer);
      }
    }, 22);
  }

  function clearGhost() {
    if (!activeText) return;
    if (timer) clearInterval(timer);
    activeText = null;
    ghostEl.hidden = true;
    ghostBtn.hidden = true;
    ghostEl.textContent = '';
    ghostWrap.classList.remove('on');
    msgEl.placeholder = originalPlaceholder;
  }

  function acceptGhost() {
    if (!activeText) return;
    const filled = activeText;
    clearGhost();
    msgEl.value = filled;
    msgEl.focus();
    msgEl.setSelectionRange(filled.length, filled.length);
  }

  msgEl.addEventListener('keydown', (e) => {
    if (activeText && e.key === 'Tab' && !e.shiftKey && !msgEl.value) {
      e.preventDefault();
      acceptGhost();
    } else if (activeText && (e.key === 'Escape' || e.key === 'Esc')) {
      e.preventDefault();
      clearGhost();
    }
  });

  ghostBtn.addEventListener('keydown', (e) => {
    if (activeText && (e.key === 'Escape' || e.key === 'Esc')) {
      e.preventDefault();
      clearGhost();
      msgEl.focus();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (activeText && (e.key === 'Escape' || e.key === 'Esc')) {
      const openModal = document.querySelector('.demo-modal-backdrop:not([hidden])');
      if (!openModal) {
        e.preventDefault();
        clearGhost();
      }
    }
  });

  msgEl.addEventListener('input', () => {
    if (msgEl.value) clearGhost();
  });

  ghostBtn.addEventListener('pointerdown', (e) => e.preventDefault());
  ghostBtn.addEventListener('click', () => acceptGhost());

  // 페이지 로드 후 400ms 뒤에 예시 텍스트 표시
  setTimeout(() => {
    if (!msgEl.value) {
      showGhost(text, true);
    }
  }, 400);
}

function initDemoForm() {
  const form = document.getElementById('demo-request-form') as HTMLFormElement | null;
  if (!form) return;

  const locale = form.dataset.locale || 'ko';
  const apiUrl = form.dataset.apiUrl || 'https://qapi-hmg.azurewebsites.net/api/';
  const tokenSecret = form.dataset.tokenSecret || '';
  const tokenClient = form.dataset.tokenClient || 'quali';
  const crmUrl = form.dataset.crmUrl || 'https://quali.api.crm5.dynamics.com/api/data/v9.2';
  const topicLabel = form.dataset.topic || 'Demo Inquiry';

  // 서브 기능 초기화
  initCountrySelect(locale);
  initGhostText(locale);

  const companyInput = document.getElementById('company') as HTMLInputElement | null;
  const nameInput = document.getElementById('name') as HTMLInputElement | null;
  const countryInput = document.getElementById('country') as HTMLInputElement | null;
  const titleInput = document.getElementById('title') as HTMLInputElement | null;
  const departmentInput = document.getElementById('department') as HTMLInputElement | null;
  const emailInput = document.getElementById('email') as HTMLInputElement | null;
  const phoneInput = document.getElementById('phone') as HTMLInputElement | null;
  const consentCheckbox = document.getElementById('privacyConsent') as HTMLInputElement | null;
  const messageInput = document.getElementById('message') as HTMLTextAreaElement | null;
  const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement | null;

  const completeModal = document.getElementById('complete-modal');
  const errorModal = document.getElementById('error-modal');
  const errorMsgEl = document.getElementById('error-modal-message');

  function openModal(el: HTMLElement | null) {
    if (!el) return;
    el.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal(el: HTMLElement | null) {
    if (!el) return;
    el.hidden = true;
    document.body.style.overflow = '';
  }

  // 모달 닫기 버튼 이벤트 바인딩
  document.querySelectorAll('[data-modal-close]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = (e.currentTarget as HTMLElement).closest('.demo-modal-backdrop') as HTMLElement | null;
      closeModal(target);
    });
  });

  // 약관 / 개인정보 팝업 모달
  const termsModal = document.getElementById('terms-modal');
  const privacyModal = document.getElementById('privacy-modal');
  document.querySelectorAll('[data-open-terms]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(termsModal);
    });
  });
  document.querySelectorAll('[data-open-privacy]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(privacyModal);
    });
  });

  // 배경 클릭 시 닫기
  [termsModal, privacyModal, completeModal, errorModal].forEach((m) => {
    if (!m) return;
    m.addEventListener('click', (e) => {
      if (e.target === m) closeModal(m);
    });
  });

  function clearErrors() {
    form?.querySelectorAll('.demo-field-error').forEach((el) => {
      el.textContent = '';
    });
    form?.querySelectorAll('.demo-input').forEach((el) => {
      el.classList.remove('has-error');
    });
  }

  function setError(id: string, message: string) {
    const errorEl = document.getElementById(`${id}-error`);
    if (errorEl) errorEl.textContent = message;
    const inputEl = document.getElementById(id);
    if (inputEl) inputEl.classList.add('has-error');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const company = (companyInput?.value ?? '').trim();
    const name = (nameInput?.value ?? '').trim();
    const country = (countryInput?.value ?? '').trim();
    const title = (titleInput?.value ?? '').trim();
    const department = (departmentInput?.value ?? '').trim();
    const email = (emailInput?.value ?? '').trim();
    const rawPhone = (phoneInput?.value ?? '').trim();
    const phone = normalizePhone(rawPhone);
    const phoneDigits = digitsOnly(phone);
    const consent = consentCheckbox?.checked ?? false;
    const rawMessage = (messageInput?.value ?? '').trim();

    let valid = true;

    if (!company) {
      setError('company', form.dataset.errCompany || 'Please enter your company name.');
      valid = false;
    }
    if (!name) {
      setError('name', form.dataset.errName || 'Please enter your name.');
      valid = false;
    }
    if (!email) {
      setError('email', form.dataset.errEmailRequired || 'Please enter your email address.');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('email', form.dataset.errEmailInvalid || 'Please enter a valid email address.');
      valid = false;
    } else if (PERSONAL_DOMAINS.has(getEmailDomain(email))) {
      setError('email', form.dataset.errEmailPersonal || 'Please enter your work email address.');
      valid = false;
    }

    if (!phone) {
      setError('phone', form.dataset.errPhoneRequired || 'Please enter your phone number.');
      valid = false;
    } else if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      setError('phone', form.dataset.errPhoneLength || 'Please enter a valid phone number (7 to 15 digits).');
      valid = false;
    }

    if (!consent) {
      setError('privacyConsent', form.dataset.errPrivacy || 'Please agree to the Privacy Policy.');
      valid = false;
    }

    if (!valid) return;

    if (!tokenSecret) {
      console.warn('[DemoForm] PUBLIC_CRM_TOKEN_SECRET is not set');
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = form.dataset.submittingText || 'Submitting...';
    }

    try {
      const token = await getAccessToken(apiUrl, tokenSecret, tokenClient);
      const [contactId, accountId] = await Promise.all([
        queryContact(crmUrl, token, name, email, phone),
        queryAccount(crmUrl, token, company),
      ]);

      // 국가 정보가 있으면 "[국가]" 로 감싸서 문의 내용(Additional Notes) 앞에 concat
      let finalMessage = rawMessage;
      if (country) {
        finalMessage = `[${country}]${rawMessage ? `\n\n${rawMessage}` : ''}`;
      }

      const noteMeta = [name, company, email, phone].map((s) => s.trim()).filter(Boolean).join(' / ');
      const note = [finalMessage, noteMeta].filter((s) => s && s.trim().length > 0).join('\n\n');

      const payload: Record<string, unknown> = {
        new_name: `[${company || 'Company'}] ${topicLabel}`,
        new_chk_demo: true,
        new_txt_from: '데모 신청',
        new_txt_q1: company || '',
        new_txt_contact: name || '',
        new_txt_jobtitle: title || '',
        new_txt_department: department || '',
        new_txt_telephone1: phone || '',
        new_txt_mobile: phone || '',
        new_txt_email: email || '',
        new_ntxt_note: note,
      };

      if (contactId) {
        payload['new_l_contact@odata.bind'] = `/contacts(${contactId})`;
      }
      if (accountId) {
        payload['new_l_q1@odata.bind'] = `/new_q1s(${accountId})`;
      }

      const res = await fetch(`${crmUrl}/new_q4s`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json; odata.metadata=minimal',
          'Content-Type': 'application/json; charset=utf-8',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(payload),
        credentials: 'omit',
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Dataverse create failed: HTTP ${res.status} ${errText}`);
      }

      form.reset();
      const countrySearchInput = document.getElementById('country-search') as HTMLInputElement | null;
      if (countrySearchInput) countrySearchInput.value = '';
      if (countryInput) countryInput.value = '';
      openModal(completeModal);
    } catch (err: unknown) {
      console.error('[DemoForm] submission failed:', err);
      if (errorMsgEl) {
        const fallbackMsg = form.dataset.errModalBody || 'An error occurred while submitting. Please try again.';
        errorMsgEl.textContent = fallbackMsg;
      }
      openModal(errorModal);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = form.dataset.submitText || 'Submit Request';
      }
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDemoForm);
} else {
  initDemoForm();
}
