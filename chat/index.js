// mogg-chat: характеры друга в чате. Yandex Cloud Function (Node.js 22), без зависимостей.
//
// Как работает: сообщение уходит в основной бэкенд mogg-ai (там лимиты, Pro, профиль, история),
// а его ответ YandexGPT переписывает в выбранном характере. «Друг» отдаётся как есть.
// action 'restyle' перекрашивает готовый текст (локальные ответы приложения: «что сегодня», «мой путь»).
//
// Переменные окружения: BOT_TOKEN (проверка подписи Telegram), FOLDER_ID, UPSTREAM (адрес mogg-ai).
// У функции должен быть сервисный аккаунт с доступом к YandexGPT — токен берётся из context.token.

const crypto = require('crypto');

const TOKEN = process.env.BOT_TOKEN || '';
const FOLDER = process.env.FOLDER_ID || '';
const UPSTREAM = process.env.UPSTREAM || 'https://functions.yandexcloud.net/d4ed49e9mdk8mqm9i4if';

const KEEP = 'Смысл, все советы, цифры, названия и списки сохрани полностью, ничего не добавляй от себя и не убирай. Длина — примерно как у оригинала. Отвечай только переписанным текстом, без кавычек и пояснений.';
const PERSONAS = {
  chill: 'Перепиши ответ друга из приложения самопрокачки mogg в образе очень спокойного, расслабленного парня на чилле. Говори просто и неторопливо, без давления, с лёгким юмором («бро», «не парься», «спокойно», «по кайфу»). Никаких «прямо сейчас» и приказов — мягкие предложения. ' + KEEP,
  critic: 'Перепиши ответ друга из приложения самопрокачки mogg в образе дерзкого кореша-критика. Тон резкий, насмешливый, без сюсюканья: подкалывай, стебись над оправданиями, беззлобно обзывай собеседника (лентяй, тюфяк, соня, нытик, диванный воин). За дерзостью — забота. ' + KEEP,
  sudar: 'Перепиши ответ друга-наставника из приложения самопрокачки mogg в образе русского сударя XIX века. Говори как дворянин из романов Толстого и Тургенева: «сударь», «милостивый государь», «извольте», «помилуйте», «покорнейше прошу», «сие», «ибо», «отнюдь», устаревшие слова (нынче, давеча, кабы, изволите, моцион, променад). Можно с изящной иронией и лёгким укором. ' + KEEP
};
// как характер называется в основном бэкенде (там свои старые режимы)
const UP_TONE = { friend: 'friend', chill: 'soft', critic: 'critic', sudar: 'friend' };

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const out = (obj, code) => ({ statusCode: code || 200, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(obj) });

// Подпись Telegram WebApp initData — чтобы функцию не дёргали посторонние
function validInit(init) {
  if (!TOKEN || !init) return false;
  const p = new URLSearchParams(init), hash = p.get('hash'); if (!hash) return false;
  p.delete('hash');
  const dc = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  const calc = crypto.createHmac('sha256', secret).update(dc).digest('hex');
  const auth = +p.get('auth_date') || 0;
  return calc === hash && Date.now() / 1000 - auth < 7 * 86400;
}

async function restyle(text, persona, iam) {
  if (!PERSONAS[persona] || !text || !iam) return text;
  try {
    const r = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
      method: 'POST', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + iam, 'x-folder-id': FOLDER },
      body: JSON.stringify({ modelUri: `gpt://${FOLDER}/yandexgpt/latest`, completionOptions: { temperature: 0.6, maxTokens: 1200 },
        messages: [{ role: 'system', text: PERSONAS[persona] }, { role: 'user', text }] })
    });
    const j = await r.json(), t = j && j.result && j.result.alternatives && j.result.alternatives[0].message.text;
    // модерация YandexGPT иногда отказывает — тогда отдаём исходный ответ, а не отказ
    if (!t || /не могу обсуждать|давайте поговорим о чём-нибудь/i.test(t)) return text;
    return t.trim().replace(/^«|»$/g, '');
  } catch (e) { console.error('restyle', e.message); return text; }
}

module.exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod === 'GET') return out({ ok: true, service: 'mogg-chat', personas: Object.keys(PERSONAS) });
  let b = {};
  try { b = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : event.body || '{}'); } catch (e) { return out({ error: 'bad_json' }, 400); }
  const persona = b.tone in UP_TONE ? b.tone : 'friend', iam = context && context.token && context.token.access_token;

  if (b.action === 'restyle') {
    if (!validInit(b.initData)) return out({ error: 'not_telegram' }, 403);
    return out({ text: await restyle(String(b.text || '').slice(0, 3000), persona, iam) });
  }
  if (b.action !== 'chat') return out({ error: 'bad_action' }, 400);

  // основной ответ — от mogg-ai, со всеми его лимитами и проверками
  const up = { ...b, tone: UP_TONE[persona] };
  if (up.context) up.context = { ...up.context, tone: UP_TONE[persona] };
  let j;
  try {
    const r = await fetch(UPSTREAM, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(up), signal: AbortSignal.timeout(45000) });
    j = await r.json();
  } catch (e) { return out({ error: 'upstream' }, 502); }
  if (j && j.text && persona !== 'friend') j.text = await restyle(j.text, persona, iam);
  return out(j);
};
module.exports._t = { validInit, restyle, PERSONAS };
