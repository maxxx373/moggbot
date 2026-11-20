// Атака XSS: заполняем все текстовые данные приложения вредоносными вставками и проходим по всем экранам и кнопкам.
// Если вставка где-то сработала как HTML/JS — печатаем, откуда она пришла. Запуск: node demo-tools/xss_fuzz.js [index.html|demo.html]
const { chromium } = require('playwright');
const serve = require('./serve');
const PAGE = process.argv[2] || 'index.html';
// вставка: если попадёт в HTML без экранирования — создаст элемент с меткой и/или выполнит код
const P = (tag) => `Обычный текст "'><img src=x data-pwn="${tag}" onerror="(window.__xss=window.__xss||[]).push('${tag}')"><b data-pwn="${tag}">`;
const fakeAI = () => ({
  person: true, quality: 'ok', score: 6.1, potential: 7.4, summary: P('ai.summary'), quality_note: P('ai.qnote'),
  style_type: { name: P('ai.style.name'), why: P('ai.style.why'), desc: P('ai.style.desc'), tips: [P('ai.style.tip')] },
  metrics: [{ key: 'skin_clear', value: '55%;"><b data-pwn="ai.metric.value">', note: P('ai.metric.note') }, { key: P('ai.metric.key'), value: 40, note: P('ai.metric.note2') }],
  areas: [{ key: 'skin', score: 6, seen: P('ai.area.seen') }],
  strengths: [{ title: P('ai.str.title'), text: P('ai.str.text') }], strengths_d: [{ title: P('ai.strd.title'), text: P('ai.strd.text') }],
  growth: [{ title: P('ai.gr.title'), text: P('ai.gr.text'), do: P('ai.gr.do') }],
  plan: { t1: [{ title: P('ai.plan.title'), text: P('ai.plan.text'), do: P('ai.plan.do') }], t2: [P('ai.plan.str')], t3: [] },
  priorities: [P('ai.prio')], today: [P('ai.today')], issues: ['acne'], exercises: ['chintuck'], tips: [P('ai.tip')]
});
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 375, height: 800 } });
  const errs = [], csp = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.dismiss());
  p.on('console', (m) => { if (/Content Security Policy|Refused to/.test(m.text())) csp.push(m.text().slice(0, 160)); });
  // статьи с сервера — тоже с вредоносными полями
  const evilArts = JSON.stringify([{ id: 'd1', tag: P('art.tag'), img: 'serum', art: 'a1', t: 'Статья ' + P('art.title'), body: ['Абзац ' + P('art.p'), { h: P('art.h') }, { q: P('art.q') }, 'конец абзаца для объёма слов '.repeat(20)] }]);
  const AIR = { me: { pro: true, paywall: true, price: '149"><b data-pwn="me.price">', days: '<b data-pwn="me.days">', chat_left: '<b data-pwn="me.chat_left">', analyze_left: '<b data-pwn="me.analyze_left">', pro_until: Date.now() + 864e5 }, chat: { reply: P('ai.chat.reply') }, analyze: fakeAI() };
  await p.route(/apigw\.yandexcloud\.net/, (r) => { let body = {}; try { body = JSON.parse(r.request().postData() || '{}'); } catch (e) {} const res = r.request().method() === 'GET' ? { ready: true } : (AIR[body.action] || { reply: P('ai.any.' + body.action), text: P('ai.text.' + body.action), invited: 1, days: 7, code: P('ref.code') }); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(res) }); });
  await p.route('https://telegram.org/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await p.route(/mc\.yandex/, (r) => r.fulfill({ status: 200, body: '' }));
  await p.addInitScript(([name]) => {
    window.Telegram = { WebApp: { initData: 'query_id=x&user=%7B%7D&hash=0', initDataUnsafe: { user: { id: 1001, first_name: name, last_name: name, username: name }, start_param: 'r_abc' }, platform: 'ios', version: '8.0', themeParams: {}, isVersionAtLeast: () => true, ready() {}, expand() {}, onEvent() {}, offEvent() {}, setHeaderColor() {}, setBackgroundColor() {}, disableVerticalSwipes() {}, BackButton: { show() {}, hide() {}, onClick() {} }, HapticFeedback: { impactOccurred() {}, notificationOccurred() {}, selectionChanged() {} }, openTelegramLink() {}, openLink() {} } };
  }, [P('tg.name')]);
  await serve(p, { 'articles/index.json': JSON.stringify({ parts: ['part-001.json'] }), 'articles/part-001.json': evilArts });
  await p.goto('http://mogg.test/' + PAGE); await p.waitForTimeout(1500);
  // заполняем профиль: всё свободное текстовое — вставками
  await p.evaluate(([fake]) => {
    const P = (tag) => `Обычный текст "'><img src=x data-pwn="${tag}" onerror="(window.__xss=window.__xss||[]).push('${tag}')"><b data-pwn="${tag}">`;
    ob.issues = ['acne', 'slouch']; ob.budget = 3000; ob.goals = ['skin', 'posture']; ob.ai = fake;
    ob.sleep = { bed: 24.5, wake: 7.5, fall: 'long', morn: 'tired', block: ['phone'] }; ob.train = { exp: 'some', place: 'home', goal: 'mass', freq: 3, time: 40, lim: [] };
    ob.result = analyze(); acceptPlan();
    S.ai = { ...fake, date: today() };
    S.chat = [{ from: 'ai', text: P('chat.ai') }, { from: 'me', text: P('chat.me') }, { from: 'ai', text: '**' + P('chat.md') + '**\n- ' + P('chat.li') }];
    S.grat = { [today()]: [P('grat.0'), P('grat.1'), P('grat.2')] };
    S.sgoals = [{ text: P('sgoal.0'), done: false }, { text: P('sgoal.1'), done: true }];
    S.email = P('email');
    S.wd = { items: [{ id: 'i1', name: P('wd.item.name'), color: P('wd.item.color'), date: today() }], looks: [{ id: 'l1', date: today(), items: ['i1'], lay: [{ id: 'i1', x: 10, y: 10, w: 40, h: 40, r: 0 }], score: 7, style: P('wd.look.style'), plus: P('wd.look.plus'), add: P('wd.look.add'), swap: P('wd.look.swap'), text: P('wd.look.text'), vibe: P('wd.look.vibe') }] };
    S.events = [{ date: today(), type: 'plan', text: P('event') }];
    S.slog = { [today()]: { note: P('slog.note') } };
    S.protos = S.protos || { active: [], queue: [], done: [] }; S.protos.notes = { acne: P('proto.note') };
    window.__snap = JSON.stringify(S); window.P2 = P;
    try { pfQ = P('pf.q'); } catch (e) {}
  }, [fakeAI()]);
  const SCREENS = [['home'], ['plan'], ['care'], ['wardrobe', null, 'looks'], ['wardrobe', null, 'school'], ['perfume'], ['coach'], ['me'], ...['basics', 'mind', 'social', 'books', 'shelf', 'feed'].map((j) => ['journal', j])];
  const hits = new Map();
  const look = async (where) => {
    const r = await p.evaluate(() => { const els = [...document.querySelectorAll('[data-pwn]')].map((e) => e.getAttribute('data-pwn')); const x = window.__xss || []; window.__xss = []; return [...new Set([...els, ...x])]; });
    r.forEach((tag) => { if (!hits.has(tag)) hits.set(tag, where); });
  };
  const reset = (scr) => p.evaluate(([t, j, w]) => { try { woStop(); } catch (e) {} S = JSON.parse(window.__snap); modal = null; reader = null; tab = t; if (j) jtab = j; if (w) wtab = w; try { pf = pfFresh(); wview = 'list'; } catch (e) {} try { render(); } catch (e) { window.__renderErr = String(e); } }, scr);
  const acts = () => p.evaluate(() => [...document.querySelectorAll('[data-act]')].filter((e) => e.getClientRects().length).map((e, i) => ({ i, a: e.dataset.act, t: (e.textContent || '').trim().slice(0, 20) })));
  const SKIP = new Set(['reset', 'photo', 'pro-pay', 'w-add', 'cam-open']);
  let n = 0;
  // модальные окна напрямую
  for (const m of ['ai', 'aura', 'share', 'pro', 'report', 'levelup', 'focus', 'trk', 'sl-log', 'routine', 'sleep', 'train']) {
    await reset(['me']); await p.evaluate((k) => { modal = { kind: k, lvl: 2, from: 1, part: 'am', text: '' }; try { render(); } catch (e) {} }, m); await p.waitForTimeout(80); await look('окно ' + m);
  }
  // статья с сервера в читалке
  await p.evaluate(() => artsFetch()); await p.waitForTimeout(400);
  await reset(['journal', 'feed']); await look('лента');
  await p.evaluate(() => { reader = { kind: 'article', id: 'd1' }; render(); }); await p.waitForTimeout(200); await look('читалка статьи');
  for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { stGo(1); } catch (e) {} }); await p.waitForTimeout(60); await look('читалка статьи (листание)'); }
  for (const scr of SCREENS) {
    await reset(scr); await look(scr.filter(Boolean).join(':'));
    for (const x of await acts()) {
      if (SKIP.has(x.a)) continue;
      await reset(scr);
      await p.evaluate((i) => { const e = [...document.querySelectorAll('[data-act]')].filter((e) => e.getClientRects().length)[i]; if (e) e.click(); }, x.i); n++;
      await p.waitForTimeout(60); await look(scr.filter(Boolean).join(':') + ' / ' + x.a + ' «' + x.t + '»');
    }
  }
  await reset(['wardrobe', null, 'looks']); await p.evaluate(() => { try { ACT['w-open-look']({ dataset: { id: 'l1' } }); } catch (e) {} }); await p.waitForTimeout(150); await look('гардероб: открыт образ');
  await p.evaluate(() => { try { wres = { score: 6, style: P2('wres.style'), plus: P2('wres.plus'), add: P2('wres.add'), swap: P2('wres.swap'), text: P2('wres.text'), vibe: P2('wres.vibe') }; render(); } catch (e) {} }); await p.waitForTimeout(100); await look('гардероб: оценка образа');
  // чат: отправка сообщения → ответ ИИ с вставкой
  await reset(['coach']); await p.evaluate(() => { try { sendChat('привет'); } catch (e) {} }); await p.waitForTimeout(800); await look('чат: ответ ИИ');
  // подстраховка CSP: вставляем вредоносный код напрямую — он не должен выполниться
  const cspBlocks = await p.evaluate(async () => { window.__xss = []; const d = document.createElement('div'); d.innerHTML = '<img src=x onerror="window.__xss.push(1)"><svg onload="window.__xss.push(2)"></svg>'; document.body.appendChild(d); const s = document.createElement('script'); s.textContent = 'window.__xss.push(3)'; document.body.appendChild(s); await new Promise((r) => setTimeout(r, 300)); return window.__xss.length === 0; });
  console.log(cspBlocks ? '✓ CSP: внедрённый код (onerror, onload, <script>) не выполняется' : '✗ CSP НЕ блокирует внедрённый код');
  if (!cspBlocks) hits.set('CSP', 'внедрённый код выполнился');
  const realCsp = csp.filter((x) => !/__xss|onerror|onload|inline event handler|'unsafe-inline'/.test(x) || !cspBlocks);
  console.log('нажатий:', n);
  if (hits.size) { console.log('ДЫРЫ XSS (данные попали в страницу как код):'); for (const [k, v] of hits) console.log(`  ✗ ${k}  — где: ${v}`); }
  else console.log('✓ XSS не найдено: ни одна вставка не сработала');
  if (errs.length) console.log('ошибки JS:', [...new Set(errs)].slice(0, 8));
  await b.close();
  process.exit(hits.size ? 1 : 0);
})();
