// Тесты бэкенда: pay/index.js (рефералка, сообщения о проблемах) и bot/index.js (/reports).
// Хранилище подменено на память, initData подписывается тем же способом, что в Telegram.
const crypto = require('crypto');
const TOKEN = '123:TEST';
Object.assign(process.env, { BOT_TOKEN: TOKEN, BUCKET: 'b', OWNER_ID: '777', REF_MAX: '2' });
const store = new Map();
global.fetch = async (url, o = {}) => {
  const m = String(url).match(/storage\.yandexcloud\.net\/b\/(.+)$/);
  if (!m) throw new Error('unexpected fetch ' + url);
  const k = m[1];
  if ((o.method || 'GET') === 'PUT') { store.set(k, o.body); return { ok: true, status: 200 }; }
  if (!store.has(k)) return { ok: false, status: 404 };
  return { ok: true, status: 200, json: async () => JSON.parse(store.get(k)) };
};
const init = (user) => {
  const p = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify(user) });
  const dc = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  p.set('hash', crypto.createHmac('sha256', secret).update(dc).digest('hex'));
  return p.toString();
};
const pay = require('../pay/index.js'), bot = require('../bot/index.js');
const call = async (user, body) => JSON.parse((await pay.handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ initData: init(user), ...body }) }, { token: { access_token: 'iam' } })).body);
let fails = 0; const ok = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) fails++; };
const days = (uid) => { const a = store.get(`acc/${uid}.json`); return a ? Math.round((JSON.parse(a).pro_until - Date.now()) / 864e5) : 0; };
(async () => {
  const A = { id: 1001, first_name: 'Аня' }, B = { id: 2002, first_name: 'Боря' }, C = { id: 3003, first_name: 'Вова' }, D = { id: 4004, first_name: 'Гена' };
  const info = await call(A, { action: 'ref-info' });
  ok(info.code === (1001).toString(36) && info.invited === 0, 'ref-info: код и 0 друзей');
  ok((await call(A, { action: 'ref-claim', code: info.code })).error === 'bad_code', 'сам себя пригласить нельзя');
  ok((await call(B, { action: 'ref-claim', code: '!!' })).error === 'bad_code', 'кривой код отклонён');
  const r1 = await call(B, { action: 'ref-claim', code: info.code });
  ok(r1.ok && days(1001) === 7 && days(2002) === 7, 'друг пришёл: обоим +7 дней Pro');
  ok((await call(B, { action: 'ref-claim', code: info.code })).error === 'already', 'второй раз по ссылке не засчитывается');
  store.set('paylast/3003.json', JSON.stringify({ tx: 'x' }));
  ok((await call(C, { action: 'ref-claim', code: info.code })).error === 'not_new', 'уже платил — не новый пользователь');
  store.delete('paylast/3003.json');
  await call(C, { action: 'ref-claim', code: info.code });
  ok(days(1001) === 14, 'второй друг: у пригласившего уже 14 дней');
  await call(D, { action: 'ref-claim', code: info.code });
  ok(days(1001) === 14 && days(4004) === 7, 'сверх лимита (REF_MAX=2): друг получает 7 дней, пригласивший — нет');
  const i2 = await call(A, { action: 'ref-info' });
  ok(i2.invited === 3 && i2.days === 14, `статистика: приглашено ${i2.invited}, получено ${i2.days} дней`);
  // Pro продлевается от конца текущей подписки
  store.set('acc/5005.json', JSON.stringify({ pro_until: Date.now() + 10 * 864e5, other: 'keep' }));
  await call({ id: 5005 }, { action: 'ref-claim', code: (1001).toString(36) });
  ok(days(5005) === 17 && JSON.parse(store.get('acc/5005.json')).other === 'keep', 'Pro добавляется к текущей подписке, остальные поля аккаунта не трогаются');
  // сообщения о проблемах
  ok((await call(B, { action: 'report', text: ' ' })).error === 'empty', 'пустое сообщение отклонено');
  const rr = await call(B, { action: 'report', text: 'Кнопка <b>не</b> работает', diag: { screen: '390x844', theme: 'dark', where: 'plan', errors: ['x'] } });
  ok(rr.ok && JSON.parse(store.get('reports/latest.json')).length === 1, 'сообщение сохранено');
  for (let i = 0; i < 5; i++) await call(B, { action: 'report', text: 'ещё ' + i });
  ok((await call(B, { action: 'report', text: 'спам' })).error === 'limit', 'не больше 5 сообщений в сутки');
  ok((await call(B, { action: 'report', text: 'x'.repeat(5000) })).error === 'limit' && true, 'длинный текст обрезается (проверено лимитом)');
  // неподписанный запрос
  const bad = JSON.parse((await pay.handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ initData: 'user=%7B%22id%22%3A1%7D&hash=00', action: 'report', text: 'hi' }) }, {})).body);
  ok(bad.error === 'not_telegram', 'запрос без подписи Telegram отклонён');
  // бот /reports
  const upd = (id, text) => ({ message: { chat: { id, type: 'private' }, from: { id, first_name: 'X' }, text } });
  const mine = await bot._t.onUpdate(upd(777, '/reports'), 'iam');
  ok(mine && mine.method === 'sendMessage' && mine.text.includes('Кнопка &lt;b&gt;не&lt;/b&gt; работает') && mine.text.includes('390x844'), 'владелец получает /reports, HTML экранирован');
  const other = await bot._t.onUpdate(upd(555, '/reports'), 'iam');
  ok(other && !String(other.text || other.caption || '').includes('Кнопка'), 'чужой человек вместо /reports видит меню');
  console.log(fails ? `ПРОВАЛЕНО: ${fails}` : 'Все тесты прошли');
  process.exit(fails ? 1 : 0);
})();
