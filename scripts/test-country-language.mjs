import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync(new URL('../src/scripts/country-language.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
async function run(options = {}) {
  let selected = options.choice ?? null, redirected = null, requests = 0;
  const cache = new Map(Object.entries(options.cache ?? {}));
  const document = {
    documentElement: { lang: options.lang ?? 'ko' }, visibilityState: options.hidden ? 'hidden' : 'visible',
    addEventListener(_event, listener) { queueMicrotask(() => { document.visibilityState = 'visible'; listener(); }); },
    removeEventListener() {},
  };
  const location = { hostname: options.hostname ?? 'example.com', href: 'https://example.com/project/solutions/power-platform/?x=1#faq', search: '?x=1', hash: '#faq', replace(url) { redirected = url; } };
  const context = vm.createContext({ exports: {}, URL, AbortController,
    setTimeout: (fn, ms) => setTimeout(fn, options.timeout ? 1 : ms), clearTimeout, document,
    navigator: { userAgent: options.agent ?? 'Browser' }, location,
    localStorage: { getItem() { if (options.storageBlocked) throw Error('Blocked'); return selected; } },
    sessionStorage: { getItem(k) { if (options.storageBlocked) throw Error('Blocked'); return cache.get(k) ?? null; }, setItem(k, v) { if (options.storageBlocked) throw Error('Blocked'); cache.set(k, v); } },
    async fetch(_url, init) {
      requests++;
      assert.equal(init.credentials, 'omit'); assert.equal(init.referrerPolicy, 'no-referrer');
      if (options.timeout) return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(Error('Timeout'))));
      if (options.failure) throw Error('Network unavailable');
      if (options.chooseWhileWaiting) selected = 'ko';
      return { ok: !options.httpError, json: async () => ({ country: options.country ?? 'JP' }) };
    },
  });
  vm.runInContext(code, context);
  const bar = { querySelector(selector) {
    const locale = selector.match(/="([^"]+)"/)[1];
    return options.noLinks || options.disabled === locale ? null : { href: `https://example.com/project/${locale}/solutions/power-platform/` };
  } };
  const handled = await context.exports.countryLanguageRedirect(bar);
  return { handled, redirected, requests, cache };
}
for (const [country, locale] of [['KR', null], ['JP', 'ja'], ['CN', 'zh-hans'], ['US', 'en'], ['DE', 'en']]) {
  const result = await run({ country });
  assert.equal(result.redirected, locale && `https://example.com/project/${locale}/solutions/power-platform/?x=1#faq`);
}
assert.equal((await run({ choice: 'ko' })).requests, 0);
assert.match((await run({ choice: 'en' })).redirected, /\/en\//);
assert.equal((await run({ lang: 'ja' })).requests, 0);
assert.equal((await run({ agent: 'Googlebot' })).requests, 0);
assert.equal((await run({ hostname: 'localhost' })).requests, 0);
assert.equal((await run({ failure: true })).handled, false);
assert.equal((await run({ country: 'invalid' })).handled, false);
assert.equal((await run({ cache: { 'country-language': 'JP' } })).requests, 0);
assert.equal((await run({ cache: { 'country-language': 'failed' } })).handled, false);
assert.equal((await run({ chooseWhileWaiting: true })).redirected, null);
assert.match((await run({ country: 'JP', disabled: 'ja' })).redirected, /\/en\//);
assert.equal((await run({ httpError: true })).handled, false);
assert.equal((await run({ timeout: true })).handled, false);
assert.match((await run({ storageBlocked: true })).redirected, /\/ja\//);
assert.match((await run({ choice: 'invalid"selector' })).redirected, /\/ja\//);
assert.equal((await run({ cache: { 'country-language': 'invalid' } })).requests, 1);
assert.match((await run({ hidden: true })).redirected, /\/ja\//);
assert.equal((await run({ noLinks: true })).handled, false);
console.log('Country language routing: 23 scenarios passed');
