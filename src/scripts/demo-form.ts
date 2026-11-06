// 데모 신청 폼 클라이언트 로직 — Dataverse 영업문의(new_q4s) 직접 연동 (A3, A4)
// cdnquali /crm/management/demo 동작을 100% 재현하되, 국제 전화번호 지원 및 무거운 번들 없는 경량 fetch 구현

const PERSONAL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'naver.com', 'hanmail.net', 'daum.net',
  'kakao.com', 'nate.com', 'hotmail.com', 'outlook.com', 'live.com',
  'msn.com', 'yahoo.com', 'icloud.com', 'me.com', 'proton.me', 'protonmail.com',
]);

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

function initDemoForm() {
  const form = document.getElementById('demo-request-form') as HTMLFormElement | null;
  if (!form) return;

  const apiUrl = form.dataset.apiUrl || 'https://qapi-hmg.azurewebsites.net/api/';
  const tokenSecret = form.dataset.tokenSecret || '';
  const tokenClient = form.dataset.tokenClient || 'quali';
  const crmUrl = form.dataset.crmUrl || 'https://quali.api.crm5.dynamics.com/api/data/v9.2';
  const topicLabel = form.dataset.topic || 'Demo Inquiry';

  const companyInput = document.getElementById('company') as HTMLInputElement | null;
  const nameInput = document.getElementById('name') as HTMLInputElement | null;
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
    const title = (titleInput?.value ?? '').trim();
    const department = (departmentInput?.value ?? '').trim();
    const email = (emailInput?.value ?? '').trim();
    const rawPhone = (phoneInput?.value ?? '').trim();
    const phone = normalizePhone(rawPhone);
    const phoneDigits = digitsOnly(phone);
    const consent = consentCheckbox?.checked ?? false;
    const message = (messageInput?.value ?? '').trim();

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

      const noteMeta = [name, company, email, phone].map((s) => s.trim()).filter(Boolean).join(' / ');
      const note = [message, noteMeta].filter((s) => s && s.trim().length > 0).join('\n\n');

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
