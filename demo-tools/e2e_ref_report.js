// Сквозная проверка рефералки и «Сообщить о проблеме»: приложение в браузере + настоящий код pay/bot с хранилищем в памяти.
// Запуск: node demo-tools/e2e_ref_report.js [demo.html|index.html]
const { chromium } = require('playwright');
const crypto = require('crypto');
const serve = require('./serve');
const TOKEN = '123:TEST';
Object.assign(process.env, { BOT_TOKEN: TOKEN, BUCKET: 'b', OWNER_ID: '777' });
const store = new Map(), realFetch = global.fetch;
global.fetch = async (url, o = {}) => {
  const m = String(url).match(/storage\.yandexcloud\.net\/b\/(.+)$/);
  if (!m) return realFetch(url, o);
  const k = m[1];
  if ((o.method || 'GET') === 'PUT') { store.set(k, o.body); return { ok: true, status: 200 }; }
  if (!store.has(k)) return { ok: false, status: 404 };
  return { ok: true, status: 200, json: async () => JSON.parse(store.get(k)) };
};
const pay = require('../pay/index.js'), bot = require('../bot/index.js');
const initData = (user, start) => {
  const o = { auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify(user) }; if (start) o.start_param = start;
  const p = new URLSearchParams(o);
  const dc = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n');
  p.set('hash', crypto.createHmac('sha256', crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest()).update(dc).digest('hex'));
  return p.toString();
};
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
const PAGE = process.argv[2] || 'demo.html';
async function open(b, user, start, lsKeyFill) {
  const p = await b.newPage({ viewport: { width: 375, height: 800 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route('https://telegram.org/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await p.route(/apigw\.yandexcloud\.net\/pay$/, async (r) => {
    if (r.request().method() === 'GET') return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ready":false}' });
    const res = await pay.handler({ httpMethod: 'POST', headers: {}, body: r.request().postData() }, { token: { access_token: 'iam' } });
    r.fulfill({ status: res.statusCode, contentType: 'application/json', body: res.body });
  });
  await p.route(/apigw\.yandexcloud\.net\/(?!pay$)/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await p.route(/mc\.yandex\.(ru|com)/, (r) => r.fulfill({ status: 200, body: '' }));
  const id = initData(user, start);
  await p.addInitScript(([id, user, start]) => {
    const toasts = window.__toasts = [];
    window.Telegram = { WebApp: { initData: id, initDataUnsafe: { user, start_param: start }, platform: 'ios', version: '8.0', colorScheme: 'light', themeParams: {},
      isVersionAtLeast: () => true, ready() {}, expand() {}, onEvent() {}, offEvent() {}, setHeaderColor() {}, setBackgroundColor() {}, disableVerticalSwipes() {},
      BackButton: { show() {}, hide() {}, onClick() {} }, HapticFeedback: { impactOccurred() {}, notificationOccurred() {}, selectionChanged() {} },
      CloudStorage: { getItem: (k, cb) => cb(null, null), setItem: (k, v, cb) => cb && cb(null, true), getItems: (k, cb) => cb(null, {}), removeItems: (k, cb) => cb && cb(null, true) },
      openTelegramLink: (u) => { window.__opened = u; }, openLink: (u) => { window.__opened = u; } } };
  }, [id, user, start]);
  await serve(p);
  await p.goto('http://mogg.test/' + PAGE); await p.waitForTimeout(3200);
  p.__errs = errs;
  return p;
}
(async () => {
  const b = await chromium.launch();
  const A = { id: 1001, first_name: 'Аня', username: 'anya' }, B = { id: 2002, first_name: 'Боря' };
  // 0. Аня получает свою ссылку у сервера
  const code = JSON.parse((await pay.handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ initData: initData(A), action: 'ref-info' }) }, { token: { access_token: 'iam' } })).body).code;
  ok(/^[0-9a-z]{8}$/.test(code), 'сервер выдал Ане случайный код ' + code);
  // 1. Боря открывает по ссылке Ани — видит подарок на первом экране
  const pb = await open(b, B, 'r_' + code);
  ok(await pb.evaluate(() => /Тебя пригласил друг/.test(document.body.innerText)), 'по ссылке друга на первом экране — «Тебя пригласил друг»');
  await pb.evaluate(() => { ob.issues = ['acne']; ob.budget = 3000; ob.goals = ['skin']; ob.result = analyze(); acceptPlan(); });
  await pb.waitForTimeout(3500);
  const daysOf = (uid) => { const a = store.get(`acc/${uid}.json`); return a ? Math.round((JSON.parse(a).pro_until - Date.now()) / 864e5) : 0; };
  ok(daysOf(2002) === 7 && daysOf(1001) === 7, 'после анкеты: Боре и Ане по 7 дней Pro');
  ok(await pb.evaluate(() => /Подарок от друга/.test(document.getElementById('toast').textContent)), 'Боря видит «Подарок от друга»');
  ok(await pb.evaluate(() => refPending() === null), 'приглашение помечено использованным');
  // повторный запуск — второй раз не начисляется
  await pb.evaluate(() => refClaim()); await pb.waitForTimeout(500);
  ok(daysOf(2002) === 7, 'повторный запуск ничего не добавляет');
  ok(pb.__errs.length === 0, 'у Бори нет ошибок JS ' + pb.__errs.join('; '));
  // 2. Аня открывает «Я» — ссылка и статистика
  const pa = await open(b, A, '');
  await pa.evaluate(() => { ob.issues = ['acne']; ob.budget = 3000; ob.goals = ['skin']; ob.result = analyze(); acceptPlan(); tab = 'me'; render(); });
  await pa.waitForTimeout(1500);
  const card = await pa.evaluate(() => { const c = document.querySelector('.refcard'); return c && c.innerText; });
  ok(card && card.includes('t.me/justmoggbot?startapp=r_' + code) && !card.includes('r_' + (1001).toString(36)) && /Пришло друзей: 1/.test(card) && /получено 7 дней Pro/.test(card), 'у Ани в «Я»: своя ссылка и «Пришло друзей: 1 · получено 7 дней Pro»');
  await pa.click('[data-act="ref-share"]');
  ok(await pa.evaluate(() => (window.__opened || '').startsWith('https://t.me/share/url?url=' + encodeURIComponent('https://t.me/justmoggbot?startapp=r_'))), '«Отправить другу» открывает выбор чата Telegram со ссылкой');
  // 3. Сообщить о проблеме
  await pa.evaluate(() => { tab = 'plan'; render(); tab = 'me'; render(); });
  await pa.click('[data-act="report-open"]'); await pa.waitForTimeout(200);
  await pa.click('[data-act="report-send"]'); await pa.waitForTimeout(200);
  ok(!store.has('reports/latest.json'), 'пустое сообщение не отправляется');
  await pa.fill('#repText', 'В гардеробе не добавляется фото');
  await pa.evaluate(() => { tab = tab; render(); }); // перерисовка не должна стереть текст
  ok((await pa.inputValue('#repText')) === 'В гардеробе не добавляется фото', 'текст не теряется при перерисовке');
  await pa.click('[data-act="report-send"]'); await pa.waitForTimeout(800);
  ok(await pa.evaluate(() => /Спасибо/i.test(document.getElementById('modal').innerText)), 'после отправки — «Спасибо»');
  const rep = JSON.parse(store.get('reports/latest.json') || '[]')[0] || {};
  const diag = JSON.parse(rep.diag || '{}');
  ok(rep.uid === 1001 && rep.username === 'anya' && rep.text.includes('гардеробе'), 'сообщение сохранено с ником');
  ok(diag.where && diag.where.includes('plan') && diag.screen === '375x800@1' && diag.platform === 'ios', `тех. данные: где «${diag.where}», экран ${diag.screen}, ${diag.platform}`);
  const msg = await bot._t.onUpdate({ message: { chat: { id: 777, type: 'private' }, from: { id: 777 }, text: '/reports' } }, 'iam');
  ok(msg && msg.text.includes('В гардеробе не добавляется фото') && msg.text.includes('@anya'), 'владелец видит его в боте по /reports');
  // 4. окно Pro → «пригласи друга» ведёт к карточке
  await pa.evaluate(() => { modal = { kind: 'pro' }; render(); });
  await pa.click('[data-act="ref-open-me"]'); await pa.waitForTimeout(300);
  ok(await pa.evaluate(() => tab === 'me' && !modal && !!document.querySelector('.refcard')), 'из окна Pro кнопка «пригласи друга» ведёт к карточке');
  ok(pa.__errs.length === 0, 'у Ани нет ошибок JS ' + pa.__errs.join('; '));
  // 5. без Telegram (браузер) — пример ссылки и понятная ошибка
  const pc = await b.newPage({ viewport: { width: 375, height: 800 } }); const ce = []; pc.on('pageerror', (e) => ce.push(e.message));
  await serve(pc); await pc.goto('http://mogg.test/' + PAGE); await pc.waitForTimeout(800);
  await pc.evaluate(() => { ob.issues = ['acne']; ob.budget = 3000; ob.goals = ['skin']; ob.result = analyze(); acceptPlan(); tab = 'me'; render(); });
  ok(await pc.evaluate(() => /Это пример/.test(document.querySelector('.refcard').innerText)), 'в браузере — пример ссылки с пояснением');
  await pc.click('[data-act="report-open"]'); await pc.fill('#repText', 'тест'); await pc.click('[data-act="report-send"]'); await pc.waitForTimeout(300);
  ok(await pc.evaluate(() => /только в приложении внутри Telegram/.test(document.getElementById('modal').innerText)), 'в браузере — подсказка написать в поддержку');
  ok(ce.length === 0, 'в браузере нет ошибок JS ' + ce.join('; '));
  await b.close();
  console.log(fails ? `ПРОВАЛЕНО: ${fails}` : 'Все проверки прошли');
  process.exit(fails ? 1 : 0);
})();
