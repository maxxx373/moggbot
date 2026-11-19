// mogg-pay: оплата mogg Pro через Platega (карты, СБП, SberPay, криптовалюта).
// Yandex Cloud Function (Node.js 22), без зависимостей.
//
// Как работает:
//  1) приложение шлёт { action: 'create', initData } — функция создаёт платёж в Platega и отдаёт ссылку на оплату;
//  2) Platega после оплаты шлёт колбэк (POST с заголовком X-Secret) — функция продлевает Pro
//     в той же записи пользователя, которую читает основной бэкенд (acc/<id>.json, поле pro_until);
//  3) { action: 'check', initData } — проверить последний платёж вручную, если колбэк не дошёл.
//
// Переменные окружения:
//   BOT_TOKEN          — токен бота (проверка подписи Telegram initData)
//   PLATEGA_MERCHANT   — X-MerchantId из кабинета Platega
//   PLATEGA_SECRET     — X-Secret из кабинета Platega (им же Platega подписывает колбэки)
//   BUCKET             — бакет с данными пользователей (тот же, что у mogg-ai)
//   PRICE, DAYS        — цена в рублях и срок Pro в днях (по умолчанию 149 и 30)
//   BOT_LINK           — куда вернуть человека после оплаты (по умолчанию t.me/justmoggbot)
// У функции должен быть сервисный аккаунт с доступом к бакету — токен берётся из context.token.

const crypto = require('crypto');

const TOKEN = process.env.BOT_TOKEN || '';
const MERCHANT = process.env.PLATEGA_MERCHANT || '';
const SECRET = process.env.PLATEGA_SECRET || '';
const BUCKET = process.env.BUCKET || '';
const PRICE = +(process.env.PRICE || 149);
const DAYS = +(process.env.DAYS || 30);
const BOT_LINK = process.env.BOT_LINK || 'https://t.me/justmoggbot';
const API = 'https://app.platega.io';
const DAY = 86400000;

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const out = (obj, code) => ({ statusCode: code || 200, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(obj) });

// ---------- проверка, что запрос пришёл из мини-аппа в Telegram ----------
function tgUser(init) {
  if (!TOKEN || !init) return null;
  const p = new URLSearchParams(init), hash = p.get('hash'); if (!hash) return null;
  p.delete('hash');
  const dc = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  if (crypto.createHmac('sha256', secret).update(dc).digest('hex') !== hash) return null;
  if (Date.now() / 1000 - (+p.get('auth_date') || 0) > 7 * 86400) return null;
  try { return JSON.parse(p.get('user')); } catch (e) { return null; }
}

// ---------- хранилище (Object Storage, тот же бакет, что у mogg-ai) ----------
const s3 = (iam, method, key, body) => fetch(`https://storage.yandexcloud.net/${BUCKET}/${key}`, {
  method, headers: { 'X-YaCloud-SubjectToken': iam, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(8000)
});
async function getJSON(iam, key) { const r = await s3(iam, 'GET', key); if (r.status === 404) return null; if (!r.ok) throw new Error('s3 get ' + r.status); return r.json(); }
async function putJSON(iam, key, obj) { const r = await s3(iam, 'PUT', key, obj); if (!r.ok) throw new Error('s3 put ' + r.status); }

// ---------- Platega ----------
const platega = (path, body) => fetch(API + path, {
  method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(15000),
  headers: { 'X-MerchantId': MERCHANT, 'X-Secret': SECRET, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined
}).then(async (r) => ({ ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) }));

// Зачислить оплату: продлить Pro. Повторный колбэк по тому же платежу ничего не меняет.
async function applyPaid(iam, txId, uid, amount) {
  const mark = await getJSON(iam, `pay/${txId}.json`);
  if (mark && mark.applied) return { already: true, pro_until: mark.pro_until };
  if (+amount < PRICE) throw new Error('amount ' + amount);
  const acc = (await getJSON(iam, `acc/${uid}.json`)) || { id: +uid };
  const from = Math.max(Date.now(), +acc.pro_until || 0);
  acc.pro_until = from + DAYS * DAY;
  await putJSON(iam, `acc/${uid}.json`, acc);
  await putJSON(iam, `pay/${txId}.json`, { ...(mark || {}), uid: +uid, amount: +amount, applied: Date.now(), pro_until: acc.pro_until });
  console.log('pro extended', uid, new Date(acc.pro_until).toISOString());
  return { pro_until: acc.pro_until };
}

module.exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod === 'GET') return out({ ok: true, service: 'mogg-pay', ready: !!(MERCHANT && SECRET && BUCKET), price: PRICE, days: DAYS });
  const iam = context && context.token && context.token.access_token;
  const h = event.headers || {}, hv = (k) => h[k] || h[k.toLowerCase()];
  let b = {};
  try { b = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : event.body || '{}'); } catch (e) { return out({ error: 'bad_json' }, 400); }

  // Колбэк от Platega: подпись — наш секрет в заголовке X-Secret
  if ((hv('User-Agent') || '').includes('Platega') || hv('X-Secret')) {
    if (!SECRET || hv('X-Secret') !== SECRET) return { statusCode: 403, body: 'forbidden' };
    try {
      if (b.status === 'CONFIRMED' && /^\d+$/.test(b.payload || '')) await applyPaid(iam, b.id, b.payload, b.amount);
      else console.log('callback', b.status, b.id);
    } catch (e) { console.error('callback', e.message); return { statusCode: 500, body: 'retry' }; }
    return { statusCode: 200, body: 'ok' };
  }

  const user = tgUser(b.initData);
  if (!user || !user.id) return out({ error: 'not_telegram' }, 403);
  if (!MERCHANT || !SECRET || !BUCKET) return out({ error: 'pay_off' });

  if (b.action === 'create') {
    const r = await platega('/v2/transaction/process', {
      paymentDetails: { amount: PRICE, currency: 'RUB' },
      description: `mogg Pro — ${DAYS} дней`,
      return: BOT_LINK + '?startapp=paid', failedUrl: BOT_LINK + '?startapp=payfail',
      payload: String(user.id),
      metadata: { user_email: `${user.id}@telegram.org`, userId: String(user.id), userName: user.username ? '@' + user.username : (user.first_name || '') }
    });
    if (!r.ok || !r.data.url) { console.error('create', r.status, JSON.stringify(r.data).slice(0, 300)); return out({ error: 'pay_create' }); }
    await putJSON(iam, `pay/${r.data.transactionId}.json`, { uid: user.id, created: Date.now() });
    await putJSON(iam, `paylast/${user.id}.json`, { tx: r.data.transactionId, at: Date.now() });
    return out({ url: r.data.url, tx: r.data.transactionId });
  }

  if (b.action === 'check') {
    const last = await getJSON(iam, `paylast/${user.id}.json`);
    if (!last) return out({ status: 'none' });
    const r = await platega('/transaction/' + last.tx);
    const st = r.data && r.data.status;
    if (st === 'CONFIRMED') { const a = await applyPaid(iam, last.tx, user.id, (r.data.paymentDetails && r.data.paymentDetails.amount) || PRICE); return out({ status: 'paid', pro_until: a.pro_until }); }
    return out({ status: (st || 'unknown').toLowerCase() });
  }
  return out({ error: 'bad_action' }, 400);
};
module.exports._t = { tgUser, applyPaid };
