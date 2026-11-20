# Правка 8: рефералка (ссылка, +7 дней Pro обоим) и «Сообщить о проблеме»
import sys
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:80],s.count(a)); s=s.replace(a,b)

CODE = r'''
// ---------- рефералка ----------
// Ссылка: t.me/justmoggbot?startapp=r_<код>. Код — Telegram ID в 36-ричной записи. Начисление — на сервере (mogg-pay: ref-claim).
const REF_DAYS = 7, SUPPORT_URL = 'https://t.me/paradox112';
const REF_KEY = KEY + '_ref'; // код пригласившего храним отдельно: после анкеты профиль S создаётся заново
const refLink = () => `${BOT_URL}?startapp=r_${tgUser && tgUser.id ? Number(tgUser.id).toString(36) : 'demo'}`;
const refPending = () => { try { const v = JSON.parse(localStorage.getItem(REF_KEY) || 'null'); return v && !v.done ? v.code : null; } catch (e) { return null; } };
const refSet = (v) => { try { localStorage.setItem(REF_KEY, JSON.stringify(v)); } catch (e) {} };
let REF = null, refLoading = false;
function refLoad() {
  if (REF || refLoading || !(tg && tg.initData)) return;
  refLoading = true;
  aiCall('ref-info', {}, 10000, PAY_ENDPOINT).then((r) => { refLoading = false; if (r && !r.error) { REF = r; if (tab === 'me' && !modal) render(); } });
}
async function refClaim() {
  const code = refPending();
  if (!code || !S.onboarded || !(tg && tg.initData)) return;
  const r = await aiCall('ref-claim', { code }, 15000, PAY_ENDPOINT);
  if (r && r.ok) {
    refSet({ code, done: true });
    track('ref_claim'); haptic('success'); confetti();
    toast(`🎁 Подарок от друга: +${r.days || REF_DAYS} дней mogg Pro`);
    meRefresh();
  } else if (r && r.error && !['network', 'server', 'off', 'http_500', 'http_502', 'http_504'].includes(r.error)) refSet({ code, done: true, err: r.error });
}
function refCard() {
  const link = refLink(), live = !!(tgUser && tgUser.id);
  refLoad();
  return `<div class="card refcard">
    <div class="row between"><b class="disp" style="font-size:22px">Пригласи друга</b><span class="mono" style="color:var(--accent)">+${REF_DAYS} дней Pro</span></div>
    <div class="hint" style="margin:6px 0 12px">Друг открывает mogg по твоей ссылке и проходит анкету — вы оба получаете ${REF_DAYS} дней Pro. До 20 друзей.</div>
    <div class="reflink">${link.replace('https://', '')}</div>
    ${live ? '' : '<div class="hint" style="font-size:11.5px;margin-top:6px">Это пример — в боте здесь будет твоя личная ссылка.</div>'}
    <div class="row" style="gap:8px;margin-top:12px"><button class="btn sm" data-act="ref-share" style="flex:1">Отправить другу</button><button class="btn sm ghost" data-act="ref-copy" style="flex:1">Скопировать</button></div>
    ${REF ? `<div class="hint" style="margin-top:10px;font-size:12.5px">Пришло друзей: <b>${REF.invited}</b>${REF.days ? ` · получено ${REF.days} ${plural(REF.days, 'день', 'дня', 'дней')} Pro` : ''}</div>` : ''}
  </div>`;
}
ACT['ref-share'] = () => {
  const text = `Качаю себя в mogg: миссии каждый день, разбор по фото, стиль и тренировки. Заходи по моей ссылке — получим по ${REF_DAYS} дней Pro 🎁`;
  const u = 'https://t.me/share/url?url=' + encodeURIComponent(refLink()) + '&text=' + encodeURIComponent(text);
  track('ref_share'); haptic('light');
  try { if (tg && tg.openTelegramLink) return tg.openTelegramLink(u); } catch (e) {}
  window.open(u, '_blank');
};
ACT['ref-copy'] = async () => {
  const l = refLink();
  try { await navigator.clipboard.writeText(l); haptic('success'); toast('Ссылка скопирована'); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = l; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('Ссылка скопирована'); } catch (e2) { toast('Не получилось — зажми ссылку и скопируй'); }
    ta.remove();
  }
};
ACT['ref-open-me'] = () => { modal = null; tab = 'me'; render(); setTimeout(() => { const c = document.querySelector('.refcard'); if (c) c.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 60); };

// ---------- сообщить о проблеме ----------
// Вместе с текстом уходят технические данные: где был человек, экран, тема, версия Telegram и последние ошибки JS.
const ERRS = [], NAV = [];
const errNote = (m) => { ERRS.push(String(m || '').slice(0, 160)); if (ERRS.length > 8) ERRS.shift(); };
window.addEventListener('error', (e) => errNote(e.message));
window.addEventListener('unhandledrejection', (e) => errNote(e.reason && (e.reason.message || e.reason)));
const navNote = () => { const k = tab + (reader ? ':' + reader.kind : '') + (modal ? ':' + modal.kind : ''); if (NAV[NAV.length - 1] !== k) { NAV.push(k); if (NAV.length > 8) NAV.shift(); } };
const diagInfo = () => ({
  where: NAV.filter((x) => !/report/.test(x)).slice(-4).join(' → '), screen: innerWidth + 'x' + innerHeight + '@' + (devicePixelRatio || 1), theme: S.theme || 'light',
  platform: (tg && tg.platform) || 'web', tg: (tg && tg.version) || '', day: S.startDate ? dayNum(today()) : 0, lvl: rank().lvl, pro: !!(ME && ME.pro),
  errors: ERRS.slice(-5), build: document.lastModified, ua: navigator.userAgent.slice(0, 180)
});
function reportCard() {
  return `<button type="button" class="card row" data-act="report-open" style="width:100%;text-align:left"><div class="iconbtn" style="font-size:20px">🛠</div><div style="flex:1"><b>Сообщить о проблеме</b><div class="hint">Что-то сломалось или неудобно — напиши, починим</div></div><span class="arrow">${IC.arrow}</span></button>`;
}
function reportModal() {
  const m = modal, sent = m.st === 'ok';
  return `<div class="modal"><div class="sheet exs" style="text-align:left">
    <div class="row between" style="justify-content:flex-end"><button class="wox" data-act="modal-close" aria-label="Закрыть">✕</button></div>
    ${sent ? `<div class="disp" style="font-size:30px;margin:6px 0 8px">Спасибо 🙌</div>
      <div class="hint">Сообщение у нас. Посмотрим и починим — если нужно, напишем тебе в Telegram.</div>
      <button class="btn" data-act="modal-close" style="margin-top:16px">Готово</button>`
    : `<div class="disp" style="font-size:30px;margin:6px 0 8px">Что случилось?</div>
      <div class="hint">Опиши, что сломалось или что неудобно: где это было и что ты нажимал. Так быстрее найдём.</div>
      <textarea class="field" id="repText" rows="5" maxlength="2000" style="height:auto;min-height:130px;padding:12px 14px;margin-top:12px;resize:none;font:inherit;line-height:1.45" placeholder="Например: во вкладке «Гардероб» не добавляется фото">${esc(m.text || '')}</textarea>
      <div class="hint" style="font-size:11.5px;margin-top:6px">Вместе с сообщением отправим твой ник в Telegram (чтобы ответить) и технические данные: экран, тему, раздел и ошибки приложения.</div>
      ${m.st === 'fail' ? `<div class="banner" style="margin-top:12px">${m.err === 'limit' ? 'Сегодня ты уже отправил 5 сообщений.' : m.err === 'not_telegram' ? 'Отправка работает только в приложении внутри Telegram.' : 'Не получилось отправить.'} Напиши нам напрямую — ответим там.</div>` : ''}
      <button class="btn" data-act="report-send" style="margin-top:14px" ${m.busy ? 'disabled' : ''}>${m.busy ? 'Отправляю…' : 'Отправить'}</button>
      <button class="btn sm ghost" data-act="link" data-u="${SUPPORT_URL}" style="width:100%;margin-top:10px">Написать в поддержку в Telegram</button>`}
  </div></div>`;
}
document.addEventListener('input', (e) => { if (e.target && e.target.id === 'repText' && modal && modal.kind === 'report') modal.text = e.target.value; });
ACT['report-open'] = () => { modal = { kind: 'report', text: '' }; haptic('light'); render(); setTimeout(() => { const t = document.getElementById('repText'); if (t) t.focus(); }, 80); };
ACT['report-send'] = async () => {
  const el = document.getElementById('repText'), text = ((el && el.value) || modal.text || '').trim();
  if (text.length < 3) { toast('Опиши проблему хотя бы парой слов'); if (el) el.focus(); return; }
  modal.text = text; modal.busy = true; modal.st = ''; render();
  const r = tg && tg.initData ? await aiCall('report', { text, diag: diagInfo() }, 15000, PAY_ENDPOINT) : { error: 'not_telegram' };
  if (!modal || modal.kind !== 'report') return;
  modal.busy = false;
  if (r && r.ok) { modal.st = 'ok'; haptic('success'); track('report'); } else { modal.st = 'fail'; modal.err = r && r.error; }
  render();
};
'''
# 1. код — после ACT.story (там уже объявлены ACT и вспомогательное)
rep("ACT.story = () => shareStreak();", "ACT.story = () => shareStreak();\n" + CODE)
# 2. окно «Сообщить о проблеме»
rep("  if (modal.kind === 'pro') return renderPro();", "  if (modal.kind === 'pro') return renderPro();\n  if (modal.kind === 'report') return reportModal();")
# 3. «Я»: карточка приглашения перед «Коллекцией», «Сообщить о проблеме» — перед напоминаниями
rep('    <div class="sec"><span class="disp">Коллекция<span class="tm">™</span></span>', '    ${refCard()}\n    <div class="sec"><span class="disp">Коллекция<span class="tm">™</span></span>')
rep("    ${myPlanExtras()}\n    ${AI_ENDPOINT ? remindCard() : ''}", "    ${myPlanExtras()}\n    ${reportCard()}\n    ${AI_ENDPOINT ? remindCard() : ''}")
# 4. запоминаем, где был человек (для отчёта)
rep("function render() {\n  applyTheme();", "function render() {\n  navNote();\n  applyTheme();")
# 5. пришёл по ссылке друга: запоминаем код до анкеты, начисляем после
rep("  try { const sp = tg.initDataUnsafe.start_param; if (sp === 'paid')", "  try { const m = /^r_([0-9a-z]{1,12})$/.exec(tg.initDataUnsafe.start_param || ''); if (m && !S.onboarded && !refPending()) { refSet({ code: m[1] }); track('ref_open'); } } catch (e) {}\n  setTimeout(refClaim, 3000);\n  try { const sp = tg.initDataUnsafe.start_param; if (sp === 'paid')")
rep("  tab = 'home'; haptic('success'); confetti(); save(); render(); window.scrollTo(0, 0);\n  track('onboarded', { photo: !!ob.photo });", "  tab = 'home'; haptic('success'); confetti(); save(); render(); window.scrollTo(0, 0);\n  track('onboarded', { photo: !!ob.photo });\n  setTimeout(refClaim, 2500);")
# 6. первый экран: «тебя пригласил друг»
rep("    <button class=\"btn\" data-act=\"next\">Начать ${IC.send}</button>", "    ${refPending() ? `<div class=\"banner\" style=\"margin-bottom:12px\">🎁 Тебя пригласил друг. Пройди анкету — и вы оба получите ${REF_DAYS} дней mogg Pro.</div>` : ''}\n    <button class=\"btn\" data-act=\"next\">Начать ${IC.send}</button>")
# 7. окно Pro: альтернатива — пригласить друга
rep("""    <button class="btn" data-act="pro-pay" style="margin-top:16px" ${payReady ? '' : 'disabled'}>${payReady ? `Оплатить ${m.price} ₽` : 'Оплата скоро появится'}</button>""",
"""    <button class="btn" data-act="pro-pay" style="margin-top:16px" ${payReady ? '' : 'disabled'}>${payReady ? `Оплатить ${m.price} ₽` : 'Оплата скоро появится'}</button>
    <button class="btn sm ghost" data-act="ref-open-me" style="width:100%;margin-top:10px">🎁 Или пригласи друга — ${REF_DAYS} дней Pro бесплатно</button>""")
# 8. стиль ссылки
rep(":root:root .jt button.on{background:#17150F!important;color:#FFD43B!important}", """:root:root .jt button.on{background:#17150F!important;color:#FFD43B!important}
.reflink{font-family:var(--mono);font-size:13px;padding:11px 12px;border-radius:12px;background:rgba(255,255,255,.08);border:1px dashed rgba(255,255,255,.28);word-break:break-all;user-select:all;-webkit-user-select:all}""")
open(p,'w',encoding='utf-8').write(s)
s=open(p,encoding='utf-8').read()
# 9. «Оформление»: подпись не налезает на заголовок; «+7 дней Pro» в одну строку
rep('<div class="card"><div class="row between"><span class="disp" style="font-size:22px">Оформление</span><span class="mono">тема · снег · акцент</span></div>',
    '<div class="card"><div class="disp" style="font-size:22px">Оформление</div><div class="mono" style="margin-top:4px">тема · снег · акцент</div>')
rep('<div class="row between"><b class="disp" style="font-size:22px">Пригласи друга</b><span class="mono" style="color:var(--accent)">+${REF_DAYS} дней Pro</span></div>',
    '<b class="disp" style="font-size:22px;display:block">Пригласи друга</b><div class="mono" style="color:var(--accent);margin-top:4px">+${REF_DAYS} дней Pro тебе и другу</div>')
open(p,'w',encoding='utf-8').write(s)
s=open(p,encoding='utf-8').read()
# 10. 320px: заголовки «Программа сна» / «Силовая программа» не заходят под «Изменить»
rep(".card > .row.between > :first-child{min-width:0}", ".card > .row.between > :first-child{min-width:0}\n@media (max-width:360px){.card > .row.between b.disp{font-size:18px!important}}")
open(p,'w',encoding='utf-8').write(s)
s=open(p,encoding='utf-8').read()
# 11. «Читаю сейчас»: название на маленькой обложке помещается
rep("${small ? 'padding:8px 6px 8px 12px' : ''}", "${small ? 'padding:8px 5px 8px 10px' : ''}")
rep("${small ? 'font-size:11px' : ''}", "${small ? 'font-size:9px;line-height:1.1;overflow-wrap:break-word;hyphens:auto;-webkit-hyphens:auto' : ''}")
# 12. «Отправить другу» вне Telegram — в новой вкладке, а не уход со страницы
rep("  try { if (tg && tg.openTelegramLink) return tg.openTelegramLink(u); } catch (e) {}\n  window.open(u, '_blank');", "  try { if (tg && tg.initData && tg.openTelegramLink) return tg.openTelegramLink(u); } catch (e) {}\n  window.open(u, '_blank');")
open(p,'w',encoding='utf-8').write(s)
