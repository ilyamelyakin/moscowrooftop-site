// Прогон кеша /api/roofs на моке Cache API и fetch — без сети и без wrangler.
// Настоящий Cache API живёт по колоцентрам и в локальном `wrangler dev` не
// работает вовсе, поэтому проверить stale-while-revalidate иначе нечем.
//
//   node tools/test-roof-cache.mjs        (из корня репозитория)
//
// Сценарии: зависшее тело ответа, дедупликация на холодном кеше, битая запись,
// недоступный Cache API, отметка времени из будущего, недоступный Google,
// вызов без ctx.
import { readFileSync } from 'node:fs';
let src = readFileSync('src/index.js', 'utf8').replace('export default {', 'export const __handler = {');
src += '\nexport { fetchRoofSheet, readRoofCache, writeRoofCache, refreshRoofSheet };\n';
const mod = 'data:text/javascript;base64,' + Buffer.from(src).toString('base64');

let store = new Map();
let googleCalls = 0, mode = 'ok', putFails = false;
const CSV = 'id,name,status,price_rub\n1,таганская,✅,3000\n2,курская,❌,2500\n';
globalThis.caches = { default: {
  async match(req) { const v = store.get(req.url); return v ? new Response(v.body, {headers: v.headers}) : undefined; },
  async put(req, res) {
    if (putFails) throw new TypeError('cache unavailable');
    const cc = res.headers.get('Cache-Control') || '';
    if (cc.includes('no-store')) return;
    store.set(req.url, { body: await res.text(), headers: {'Content-Type':'application/json','Cache-Control':cc} });
  },
}};
const real = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  if (!String(url).includes('docs.google.com')) return real(url, opts);
  googleCalls += 1;
  if (mode === 'down') throw new Error('google down');
  if (mode === 'headers-only') {
    // заголовки пришли сразу, тело висит вечно — но уважает abort
    const body = new ReadableStream({ start(c) {
      if (opts?.signal) opts.signal.addEventListener('abort', () => c.error(new Error('aborted')));
    }});
    return new Response(body, { status: 200 });
  }
  await new Promise(r => setTimeout(r, 30));
  return new Response(CSV, { status: 200 });
};
const M = await import(mod);
const KEY = 'https://roof-sheet.internal/cache/v3';
const seed = async (ageMs, roofs) => { store.set(KEY, { body: JSON.stringify({ at: Date.now() - ageMs, roofs: roofs ?? {'таганская':{price:3000,on:true}} }), headers: {'Cache-Control':'max-age=86400'} }); };
const ok = (c) => c ? 'ОК' : '*** ОШИБКА ***';
let waited = [];
const ctx = { waitUntil: (p) => waited.push(p) };

console.log('A. тело висит, приходят только заголовки — таймаут обязан сработать');
store.clear(); mode = 'headers-only'; googleCalls = 0;
let t0 = Date.now(); let err = null;
try { await M.fetchRoofSheet(ctx); } catch (e) { err = e.message; }
let dt = Date.now() - t0;
console.log(`  бросило "${err}" за ${dt} мс — ${ok(err && dt >= 3900 && dt < 6000)}`);
console.log('  повторный вызов не должен застрять на старом промисе:');
t0 = Date.now(); err = null;
try { await M.fetchRoofSheet(ctx); } catch (e) { err = e.message; }
dt = Date.now() - t0;
console.log(`  бросило "${err}" за ${dt} мс — ${ok(err && dt < 6000)}`);

console.log('B. холодный кеш: пять параллельных запросов = один поход в Google');
store.clear(); mode = 'ok'; googleCalls = 0;
const rs = await Promise.all([1,2,3,4,5].map(() => M.fetchRoofSheet(ctx)));
console.log(`  вызовов: ${googleCalls}, крыш у каждого: ${rs.map(r=>r.size).join(',')} — ${ok(googleCalls === 1 && rs.every(r=>r.size===2))}`);

console.log('C. в кеше пустой roofs — должен считаться битым и пойти в Google');
mode = 'ok'; googleCalls = 0; await seed(1000, {});
const r2 = await M.fetchRoofSheet(ctx);
console.log(`  крыш: ${r2.size}, вызовов: ${googleCalls} — ${ok(r2.size === 2 && googleCalls === 1)}`);

console.log('D. Cache API падает — данные всё равно должны дойти');
store.clear(); putFails = true; mode = 'ok'; googleCalls = 0; err = null;
let r3 = null;
try { r3 = await M.fetchRoofSheet(ctx); } catch (e) { err = e.message; }
console.log(`  крыш: ${r3 ? r3.size : '—'}, ошибка: ${err || 'нет'} — ${ok(r3 && r3.size === 2 && !err)}`);
putFails = false;

console.log('E. отметка из будущего — запись не должна считаться вечно свежей');
store.clear(); await seed(-3600_000); mode = 'ok'; googleCalls = 0; waited = [];
await M.fetchRoofSheet(ctx);
await Promise.all(waited);
console.log(`  обновлений в фоне: ${waited.length}, вызовов: ${googleCalls} — ${ok(waited.length === 1 && googleCalls === 1)}`);

console.log('F. устаревший кеш + Google лежит: отдаём старое, waitUntil не отклоняется');
store.clear(); await seed(400_000); mode = 'down'; googleCalls = 0; waited = [];
const r4 = await M.fetchRoofSheet(ctx);
let rejected = false;
await Promise.all(waited.map(p => p.catch(() => { rejected = true; })));
console.log(`  крыш: ${r4.size}, промис отклонился: ${rejected} — ${ok(r4.size === 1 && !rejected)}`);

console.log('H. запись в кеш зависла — слот обязан освободиться, следующий запрос идёт в Google');
store.clear(); mode = 'ok'; googleCalls = 0; waited = [];
let hangPut = true;
const putOrig = globalThis.caches.default.put;
globalThis.caches.default.put = async (req, res) => { if (hangPut) return new Promise(() => {}); return putOrig(req, res); };
await seed(400_000);
await M.fetchRoofSheet(ctx);                       // стартует фоновое обновление, put зависает
const callsAfterFirst = googleCalls;
await new Promise(r => setTimeout(r, 16500));      // ждём дольше PRICE_REFRESH_TIMEOUT_MS + 1000
await seed(400_000);
await M.fetchRoofSheet(ctx);
console.log(`  походов в Google: первый ${callsAfterFirst}, после освобождения слота ${googleCalls} — ${ok(googleCalls > callsAfterFirst)}`);
hangPut = false; globalThis.caches.default.put = putOrig;

console.log('G. без ctx обновление не стартует впустую');
store.clear(); await seed(400_000); mode = 'ok'; googleCalls = 0;
await M.fetchRoofSheet(undefined);
await new Promise(r => setTimeout(r, 100));
console.log(`  вызовов к Google: ${googleCalls} — ${ok(googleCalls === 0)}`);
