// mogg-pay: оплата mogg Pro через Platega (карты, СБП, SberPay, криптовалюта).
// Yandex Cloud Function (Node.js 22), без зависимостей.
//
// Как работает:
//  1) приложение шлёт { action: 'create', initData } — функция создаёт платёж в Platega и отдаёт ссылку на оплату;
//  2) Platega после оплаты шлёт колбэк (POST с заголовком X-Secret) — функция продлевает Pro
//     в той же записи пользователя, которую читает основной бэкенд (acc/<id>.json, поле pro_until);
//  3) { action: 'check', initData } — проверить последний платёж вручную, если колбэк не дошёл.
//  4) рефералка: { action: 'ref-info' } — свой код и сколько друзей пришло;
//     { action: 'ref-claim', code } — новый пользователь пришёл по ссылке друга: обоим +REF_DAYS дней Pro
//     (один раз на человека, у пригласившего — не больше REF_MAX друзей);
//  5) { action: 'report', text, diag } — сообщение о проблеме из приложения (reports/…, последние 50 — в reports/latest.json,
//     их показывает бот по команде /reports владельцу).
//
// Переменные окружения:
//   BOT_TOKEN          — токен бота (проверка подписи Telegram initData)
//   PLATEGA_MERCHANT   — X-MerchantId из кабинета Platega
//   PLATEGA_SECRET     — X-Secret из кабинета Platega (им же Platega подписывает колбэки)
//   BUCKET             — бакет с данными пользователей (тот же, что у mogg-ai)
//   PRICE, DAYS        — цена в рублях и срок Pro в днях (по умолчанию 149 и 30)
//   BOT_LINK           — куда вернуть человека после оплаты (по умолчанию t.me/justmoggbot)
//   REF_DAYS, REF_MAX  — дней Pro за друга (по умолчанию 7) и максимум оплачиваемых друзей на человека (по умолчанию 20)
// У функции должен быть сервисный аккаунт с доступом к бакету — токен берётся из context.token.

const crypto = require('crypto');

const TOKEN = process.env.BOT_TOKEN || '';
const MERCHANT = process.env.PLATEGA_MERCHANT || '';
const SECRET = process.env.PLATEGA_SECRET || '';
const BUCKET = process.env.BUCKET || '';
const PRICE = +(process.env.PRICE || 149);
const DAYS = +(process.env.DAYS || 30);
const BOT_LINK = process.env.BOT_LINK || 'https://t.me/justmoggbot';
const REF_DAYS = +(process.env.REF_DAYS || 7);
const REF_MAX = +(process.env.REF_MAX || 20);
const API = 'https://app.platega.io';
const DAY = 86400000;

const ORIGIN = process.env.APP_ORIGIN || 'https://maxxx373.github.io';
const CORS = { 'Access-Control-Allow-Origin': ORIGIN, 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const MAX_BODY = 32 * 1024;
// сравнение секретов за постоянное время — по скорости ответа ключ не подобрать
const safeEq = (a, b) => { const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || '')); return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y); };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const out = (obj, code) => ({ statusCode: code || 200, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(obj) });

// ---------- проверка, что запрос пришёл из мини-аппа в Telegram ----------
function tgUser(init) {
  if (!TOKEN || !init) return null;
  const p = new URLSearchParams(init), hash = p.get('hash'); if (!hash) return null;
  p.delete('hash');
  const dc = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  if (!safeEq(crypto.createHmac('sha256', secret).update(dc).digest('hex'), hash)) return null;
  if (Date.now() / 1000 - (+p.get('auth_date') || 0) > 2 * 86400) return null;
  try { return JSON.parse(p.get('user')); } catch (e) { return null; }
}

// ---------- хранилище (Object Storage, тот же бакет, что у mogg-ai) ----------
const s3 = (iam, method, key, body) => fetch(`https://storage.yandexcloud.net/${BUCKET}/${key}`, {
  method, headers: { 'X-YaCloud-SubjectToken': iam, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(8000)
});
async function getJSON(iam, key) { const r = await s3(iam, 'GET', key); if (r.status === 404) return null; if (!r.ok) throw new Error('s3 get ' + r.status); return r.json(); }
async function putJSON(iam, key, obj) { const r = await s3(iam, 'PUT', key, obj); if (!r.ok) throw new Error('s3 put ' + r.status); }

// Продлить Pro на days дней (от текущего конца подписки или от сейчас)
async function addPro(iam, uid, days) {
  const acc = (await getJSON(iam, `acc/${uid}.json`)) || {};
  acc.pro_until = Math.max(Date.now(), +acc.pro_until || 0) + days * DAY;
  await putJSON(iam, `acc/${uid}.json`, acc);
  return acc.pro_until;
}
// Реферальный код — случайный (Telegram ID в ссылке не светится). refme/<uid> → код, refcode/<код> → uid
const REF_RE = /^[0-9a-z]{6,16}$/;
async function refCode(iam, uid) {
  const me = await getJSON(iam, `refme/${uid}.json`);
  if (me && REF_RE.test(me.code || '')) return me.code;
  for (let i = 0; i < 5; i++) {
    const code = BigInt('0x' + crypto.randomBytes(6).toString('hex')).toString(36).padStart(8, '0').slice(-8);
    if (await getJSON(iam, `refcode/${code}.json`)) continue;
    await putJSON(iam, `refcode/${code}.json`, { uid: +uid });
    await putJSON(iam, `refme/${uid}.json`, { code });
    return code;
  }
  throw new Error('ref code');
}
async function refUid(iam, code) {
  if (!REF_RE.test(code || '')) return 0;
  const r = await getJSON(iam, `refcode/${code}.json`);
  return r && +r.uid > 0 ? +r.uid : 0;
}
const clip = (x, n) => String(x == null ? '' : x).slice(0, n);

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
  if ((event.body || '').length > MAX_BODY) return out({ error: 'too_big' }, 413);
  let b = {};
  try { b = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : event.body || '{}'); } catch (e) { return out({ error: 'bad_json' }, 400); }

  // Колбэк от Platega: подпись — наш секрет в заголовке X-Secret
  if ((hv('User-Agent') || '').includes('Platega') || hv('X-Secret')) {
    if (!SECRET || !safeEq(hv('X-Secret'), SECRET) || (hv('X-MerchantId') && !safeEq(hv('X-MerchantId'), MERCHANT))) return { statusCode: 403, body: 'forbidden' };
    if (!UUID.test(b.id || '')) return { statusCode: 400, body: 'bad id' };
    try {
      if (b.status === 'CONFIRMED' && /^\d+$/.test(b.payload || '')) await applyPaid(iam, b.id, b.payload, b.amount);
      else console.log('callback', b.status, b.id);
    } catch (e) { console.error('callback', e.message); return { statusCode: 500, body: 'retry' }; }
    return { statusCode: 200, body: 'ok' };
  }

  const user = tgUser(b.initData);
  if (!user || !user.id) return out({ error: 'not_telegram' }, 403);

  if (b.action === 'ref-info' || b.action === 'ref-claim' || b.action === 'report') {
    if (!BUCKET) return out({ error: 'off' });
    try {
      if (b.action === 'ref-info') {
        const st = (await getJSON(iam, `refby/${user.id}.json`)) || { invited: [], days: 0 };
        return out({ code: await refCode(iam, user.id), invited: st.invited.length, days: st.days, per: REF_DAYS, max: REF_MAX });
      }
      if (b.action === 'ref-claim') {
        const inviter = await refUid(iam, b.code);
        if (!inviter || inviter === user.id) return out({ error: 'bad_code' });
        if (await getJSON(iam, `refd/${user.id}.json`)) return out({ error: 'already' });
        // по ссылке друга считается только новый человек: ещё не платил и не был приглашён
        if (await getJSON(iam, `paylast/${user.id}.json`)) return out({ error: 'not_new' });
        await putJSON(iam, `refd/${user.id}.json`, { by: inviter, at: Date.now() });
        const st = (await getJSON(iam, `refby/${inviter}.json`)) || { invited: [], days: 0 };
        if (!st.invited.includes(user.id)) st.invited.push(user.id);
        const paid = st.invited.length <= REF_MAX;
        if (paid) { await addPro(iam, inviter, REF_DAYS); st.days += REF_DAYS; }
        await putJSON(iam, `refby/${inviter}.json`, st);
        const until = await addPro(iam, user.id, REF_DAYS);
        console.log('ref', inviter, '->', user.id, paid ? '' : '(лимит пригласившего)');
        return out({ ok: true, days: REF_DAYS, pro_until: until });
      }
      if (b.action === 'report') {
        const text = clip(b.text, 2000).trim();
        if (text.length < 3) return out({ error: 'empty' });
        // не больше 5 сообщений в сутки от одного человека
        const rl = (await getJSON(iam, `reportrl/${user.id}.json`)) || { at: [] };
        rl.at = rl.at.filter((t) => Date.now() - t < DAY);
        if (rl.at.length >= 5) return out({ error: 'limit' });
        rl.at.push(Date.now()); await putJSON(iam, `reportrl/${user.id}.json`, rl);
        const rec = { at: Date.now(), uid: user.id, name: clip([user.first_name, user.last_name].filter(Boolean).join(' '), 80), username: clip(user.username, 40), text, diag: clip(typeof b.diag === 'string' ? b.diag : JSON.stringify(b.diag || {}), 3000) };
        await putJSON(iam, `reports/${new Date().toISOString().slice(0, 10)}/${rec.at}-${user.id}.json`, rec);
        const last = (await getJSON(iam, 'reports/latest.json')) || [];
        last.unshift(rec); await putJSON(iam, 'reports/latest.json', last.slice(0, 50));
        return out({ ok: true });
      }
    } catch (e) { console.error(b.action, e.message); return out({ error: 'server' }, 500); }
  }

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
module.exports._t = { tgUser, applyPaid, addPro, refCode, refUid };
