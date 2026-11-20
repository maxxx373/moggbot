// Бот @justmoggbot: главное меню с кнопкой мини-аппа, поддержка, сотрудничество, подписка, политика.
// Работает как Yandex Cloud Function (Node.js 18+), без зависимостей.
//
// Переменные окружения функции:
//   BOT_TOKEN      — токен бота от @BotFather (обязательно)
//   SUPPORT_TG     — ник поддержки без @ (по умолчанию paradox112)
//   SUPPORT_EMAIL  — почта поддержки (по умолчанию mogg_help@mail.ru)
//   APP_URL        — адрес мини-аппа (по умолчанию https://maxxx373.github.io/moggbot/)
//   OWNER_ID       — твой Telegram ID: только тебе бот покажет /reports (сообщения о проблемах из приложения)
//   BUCKET         — бакет с данными (тот же, что у mogg-ai и mogg-pay); у функции должен быть сервисный аккаунт с доступом к нему
//
// Первый запуск: открой в браузере ссылку функции с ?setup=1 — бот сам подключит вебхук,
// команды, описание и кнопку «Открыть» слева от поля ввода.

const crypto = require('crypto');

const TOKEN = process.env.BOT_TOKEN || '';
const SUPPORT_TG = (process.env.SUPPORT_TG || 'paradox112').replace(/^@/, '');
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'mogg_help@mail.ru';
const APP_URL = (process.env.APP_URL || 'https://maxxx373.github.io/moggbot/').replace(/\/?$/, '/');
const COVER = APP_URL + 'bot/cover.jpg';
const OWNER_ID = +(process.env.OWNER_ID || 0);
const BUCKET = process.env.BUCKET || '';
const PRIVACY = 'https://telegra.ph/Politika-konfidencialnosti-mogg-11-19';
const OFFER = 'https://telegra.ph/Polzovatelskoe-soglashenie-mogg-11-19'; // пользовательское соглашение
// Секрет, который Telegram присылает в заголовке каждого запроса: чужие запросы к функции игнорируем
const SECRET = crypto.createHash('sha256').update('mogg-webhook:' + TOKEN).digest('hex').slice(0, 48);

const api = async (method, body) => {
  try {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}), signal: AbortSignal.timeout(8000)
    });
    return await r.json();
  } catch (e) { console.error(method, e.message); return { ok: false, description: String(e.message || e) }; }
};
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// ---------- тексты и кнопки ----------
const BACK = [{ text: '‹ Назад в меню', callback_data: 'menu' }];

function menu(name) {
  return {
    caption: `Привет${name ? ', ' + esc(name) : ''}! 👋\n\n`
      + '<b>mogg</b> — твой личный коуч, чтобы стать лучшей версией себя: кожа, стиль, тело и голова.\n\n'
      + '• 3 миссии в день под твои цели\n'
      + '• разбор внешности по фото\n'
      + '• тренировки, сон и уход\n'
      + '• школа стиля и подбор парфюма\n\n'
      + 'Качай уровень и не теряй серию 🔥\nЖми «Открыть mogg» 👇',
    keyboard: [
      [{ text: '🚀 Открыть mogg', web_app: { url: APP_URL } }],
      [{ text: '💬 Поддержка', callback_data: 'support' }, { text: '🤝 Сотрудничество', callback_data: 'collab' }],
      [{ text: '💎 Подписка mogg Pro', callback_data: 'pro' }],
      [{ text: '🔒 Политика конфиденциальности', url: PRIVACY }]
    ]
  };
}

const SCREENS = {
  support: () => ({
    caption: '<b>💬 Поддержка</b>\n\n'
      + 'Что-то не работает, не прошла оплата или есть вопрос — напиши нам, разберёмся.\n\n'
      + `Telegram: @${esc(SUPPORT_TG)}\nПочта: ${esc(SUPPORT_EMAIL)}\n\n`
      + 'Если вопрос про оплату — укажи дату платежа и почту, на которую пришёл чек.',
    keyboard: [[{ text: '✍️ Написать в поддержку', url: `https://t.me/${SUPPORT_TG}` }], BACK]
  }),
  collab: () => ({
    caption: '<b>🤝 Сотрудничество</b>\n\n'
      + 'Блогерам, брендам одежды и косметики, барбершопам, спортзалам — всем, кто хочет сделать что-то вместе с mogg: '
      + 'интеграции, коллаборации, партнёрские подборки, промокоды для аудитории.\n\n'
      + 'Напиши, кто ты, где тебя посмотреть и что предлагаешь:\n'
      + `Telegram: @${esc(SUPPORT_TG)}\nПочта: ${esc(SUPPORT_EMAIL)}`,
    keyboard: [[{ text: '✍️ Написать', url: `https://t.me/${SUPPORT_TG}` }], BACK]
  }),
  pro: () => ({
    caption: '<b>💎 mogg Pro</b> — 149 ₽ за 30 дней\n\n'
      + '📸 Разборы по фото — до 3 в день\n'
      + '🏋️ Персональная тренировка под твой разбор\n'
      + '💬 Тренер — до 100 сообщений в день вместо 10\n'
      + '🔥 Всё бесплатное остаётся: миссии, протоколы, тренировки, статьи\n\n'
      + 'Разовая оплата <b>без автосписаний</b>: картой, по СБП, SberPay или криптой. Оформляется внутри приложения.',
    keyboard: [
      [{ text: '💎 Оформить Pro', web_app: { url: APP_URL + '?pro=1' } }],
      [{ text: '📄 Соглашение', url: OFFER }, { text: '🔒 Политика', url: PRIVACY }],
      BACK
    ]
  })
};

const markup = (s) => ({ inline_keyboard: s.keyboard });

// Из российских дата-центров api.telegram.org недоступен, поэтому бот не ходит в Telegram сам:
// ответ на каждое сообщение возвращается прямо в ответе на вебхук (так разрешает Bot API).
// Одно действие на один апдейт — этого хватает для меню.
const menuMsg = (chatId, name, prefix) => {
  const m = menu(name);
  return { method: 'sendPhoto', chat_id: chatId, photo: COVER, caption: (prefix || '') + m.caption, parse_mode: 'HTML', reply_markup: markup(m) };
};
const screenMsg = (chatId, key) => {
  const s = SCREENS[key]();
  return { method: 'sendMessage', chat_id: chatId, text: s.caption, parse_mode: 'HTML', reply_markup: markup(s), link_preview_options: { is_disabled: true } };
};
// Переключаем экраны в том же сообщении, чтобы не спамить чат
const inPlace = (msg, s) => {
  const base = { chat_id: msg.chat.id, message_id: msg.message_id, parse_mode: 'HTML', reply_markup: markup(s) };
  return msg.photo
    ? { method: 'editMessageCaption', ...base, caption: s.caption }
    : { method: 'editMessageText', ...base, text: s.caption, link_preview_options: { is_disabled: true } };
};

// ---------- сообщения о проблемах (только владельцу) ----------
async function reportsMsg(chat, iam) {
  if (!BUCKET || !iam) return { method: 'sendMessage', chat_id: chat, text: 'Для /reports у функции бота нужны BUCKET и сервисный аккаунт с доступом к бакету.' };
  let list = [];
  try {
    const r = await fetch(`https://storage.yandexcloud.net/${BUCKET}/reports/latest.json`, { headers: { 'X-YaCloud-SubjectToken': iam }, signal: AbortSignal.timeout(8000) });
    if (r.ok) list = await r.json();
  } catch (e) { console.error('reports', e.message); }
  if (!list.length) return { method: 'sendMessage', chat_id: chat, text: 'Сообщений о проблемах пока нет 🙌' };
  const fmt = (x) => {
    const d = new Date(x.at + 3 * 3600000).toISOString().slice(5, 16).replace('T', ' ');
    let diag = ''; try { const g = JSON.parse(x.diag || '{}'); diag = [g.screen, g.theme, g.where, g.platform, g.errors && g.errors.length ? 'ошибок JS: ' + g.errors.length : ''].filter(Boolean).join(' · '); } catch (e) {}
    return `<b>${d}</b> · ${esc(x.name || '')}${x.username ? ' @' + esc(x.username) : ''} · id ${x.uid}\n${esc(x.text)}${diag ? `\n<i>${esc(diag)}</i>` : ''}`;
  };
  let text = `📮 Последние сообщения о проблемах (${Math.min(10, list.length)} из ${list.length}):\n\n`;
  for (const x of list.slice(0, 10)) { const add = fmt(x) + '\n\n'; if ((text + add).length > 3900) break; text += add; }
  return { method: 'sendMessage', chat_id: chat, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } };
}

// ---------- обработка апдейтов: возвращает действие для ответа ----------
async function onUpdate(u, iam) {
  if (u.message) {
    const m = u.message, chat = m.chat.id, text = (m.text || '').trim(), name = m.from && m.from.first_name;
    if (m.chat.type !== 'private') return null;
    const cmd = text.startsWith('/') ? text.split(/[\s@]/)[0].slice(1).toLowerCase() : '';
    if (cmd === 'support' || cmd === 'help') return screenMsg(chat, 'support');
    if (cmd === 'pro') return screenMsg(chat, 'pro');
    if (cmd === 'collab') return screenMsg(chat, 'collab');
    if (cmd === 'privacy') return { method: 'sendMessage', chat_id: chat, text: `🔒 Политика конфиденциальности: ${PRIVACY}\n📄 Пользовательское соглашение: ${OFFER}` };
    if (cmd === 'reports' && OWNER_ID && m.from && m.from.id === OWNER_ID) return reportsMsg(chat, iam);
    if (cmd === 'start' || cmd === 'menu') return menuMsg(chat, name);
    // любое другое сообщение — бот не чат, показываем меню с подсказкой
    return menuMsg(chat, name, '<i>Я не отвечаю на сообщения — всё внутри приложения. Нужна помощь — жми «Поддержка».</i>\n\n');
  }
  if (u.callback_query) {
    const q = u.callback_query, msg = q.message, key = q.data;
    if (!msg) return { method: 'answerCallbackQuery', callback_query_id: q.id };
    if (key === 'menu') return inPlace(msg, menu(q.from && q.from.first_name));
    if (SCREENS[key]) return inPlace(msg, SCREENS[key]());
    return { method: 'answerCallbackQuery', callback_query_id: q.id };
  }
  return null;
}

// ---------- первичная настройка ----------
async function setup(selfUrl, force) {
  const info = await api('getWebhookInfo');
  const cur = info.result && info.result.url;
  if (cur && cur !== selfUrl && !force) {
    return { ok: false, warning: 'У бота уже стоит другой вебхук. Если его ставил старый бэкенд, он перестанет получать сообщения. Чтобы всё равно переключить, добавь к ссылке &force=1', current_webhook: cur };
  }
  const res = {};
  res.webhook = await api('setWebhook', { url: selfUrl, secret_token: SECRET, allowed_updates: ['message', 'callback_query'], drop_pending_updates: true });
  res.commands = await api('setMyCommands', { commands: [
    { command: 'start', description: 'Главное меню' },
    { command: 'support', description: 'Поддержка' },
    { command: 'pro', description: 'Подписка mogg Pro' },
    { command: 'collab', description: 'Сотрудничество' },
    { command: 'privacy', description: 'Политика конфиденциальности' }
  ] });
  res.menu_button = await api('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Открыть', web_app: { url: APP_URL } } });
  res.description = await api('setMyDescription', { description: 'mogg — личный коуч, чтобы стать лучшей версией себя.\n\nКожа, стиль, тело и голова: 3 миссии в день под твои цели, разбор по фото, тренировки, школа стиля и подбор парфюма.\n\nЖми «Старт» 👇' });
  res.short_description = await api('setMyShortDescription', { short_description: 'Личный коуч: кожа, стиль, тело, голова. Миссии, разбор по фото, тренировки, школа стиля.' });
  return { ok: true, webhook_url: selfUrl, result: res };
}

module.exports.handler = async (event, context) => {
  const json = (code, obj) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(obj, null, 2) });
  if (!TOKEN) return json(500, { error: 'Не задан BOT_TOKEN в переменных окружения функции' });
  const q = event.queryStringParameters || {};
  if ((event.httpMethod || 'GET') === 'GET') {
    if (q.ping) { const t0 = Date.now(), r = await api('getMe'); return json(200, { ok: r.ok, ms: Date.now() - t0, error: r.ok ? undefined : r.description }); }
    if (q.setup) {
      const self = process.env.WEBHOOK_URL || `https://functions.yandexcloud.net/${context && context.functionName}`;
      return json(200, await setup(self, !!q.force));
    }
    return json(200, { ok: true, bot: 'mogg', hint: 'Добавь ?setup=1 к ссылке, чтобы подключить бота' });
  }
  const h = event.headers || {};
  const got = String(h['X-Telegram-Bot-Api-Secret-Token'] || h['x-telegram-bot-api-secret-token'] || '');
  if (got.length !== SECRET.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(SECRET))) return { statusCode: 403, body: 'forbidden' };
  if ((event.body || '').length > 256 * 1024) return { statusCode: 200, body: 'ok' };
  let out = null;
  try {
    const body = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : event.body;
    out = await onUpdate(JSON.parse(body || '{}'), context && context.token && context.token.access_token);
  } catch (e) { console.error(e); }
  // Telegram'у всегда отвечаем 200, иначе он будет повторять запрос; действие — в теле ответа
  return out ? json(200, out) : { statusCode: 200, body: 'ok' };
};
// для локальных тестов
module.exports._t = { menu, SCREENS, onUpdate, setup, SECRET, api, reportsMsg };
