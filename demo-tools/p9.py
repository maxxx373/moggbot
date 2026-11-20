# Правка 9: безопасность — закрыты XSS, очистка данных с сервера, непрозрачный реферальный код, без inline-обработчиков (для строгой CSP)
import sys
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:80],s.count(a)); s=s.replace(a,b)

# 1. статьи с сервера: строгая проверка полей и экранирование всего текста
rep("""function artsAdd(list) {
  let n = 0;
  (list || []).forEach((a) => {
    if (!a || !a.id || !Array.isArray(a.body) || ART_BY[a.id]) return;""",
"""// Статья из файла — недоверенные данные: пропускаем только известные поля, текст экранируем, теги/картинки — из списков
function artClean(a) {
  if (!a || typeof a !== 'object' || !/^[a-z]{1,4}\\d{1,6}$/.test(a.id || '')) return null;
  const txt = (x, n) => esc(String(x == null ? '' : x).slice(0, n));
  const body = (Array.isArray(a.body) ? a.body : []).slice(0, 80).map((x) => typeof x === 'string' ? txt(x, 3000) : x && typeof x.h === 'string' ? { h: txt(x.h, 200) } : x && typeof x.q === 'string' ? { q: txt(x.q, 400) } : null).filter(Boolean);
  if (!body.length || typeof a.t !== 'string') return null;
  return { id: a.id, tag: TAG_C[a.tag] ? a.tag : 'Стиль', img: IMG[a.img] ? a.img : 'street', art: ARTS[a.art] ? a.art : 'a1', t: txt(a.t, 160), body };
}
function artsAdd(list) {
  let n = 0;
  (Array.isArray(list) ? list : []).map(artClean).forEach((a) => {
    if (!a || ART_BY[a.id]) return;""")
rep("    if (!artParts) { const r = await fetch('articles/index.json', { cache: 'no-cache' }); artParts = (await r.json()).parts || []; }",
    "    if (!artParts) { const r = await fetch('articles/index.json', { cache: 'no-cache' }); artParts = ((await r.json()).parts || []).filter((x) => /^part-\\d{3}\\.json$/.test(x)); }")
# 2. пояснение к протоколу от ИИ
rep('<b>Почему у тебя так:</b> ${note}', '<b>Почему у тебя так:</b> ${esc(note)}')
# 3. разбор по фото: ключ параметра экранируем, значение — число 0–100
rep("""      ${a.metrics.map((m, i) => `<div class="mbar" style="--c:${mColor(m.value)};--w:${m.value}%;animation-delay:${i * 70}ms"><div class="row between"><b>${METRIC_N[m.key] || m.key}</b><span class="mv">${m.value}<small>/100</small></span></div><div class="ml">${mLabel(m.value)}</div>""",
    """      ${a.metrics.map((m0, i) => { const m = { ...m0, value: Math.max(0, Math.min(100, Math.round(+m0.value) || 0)) }; return `<div class="mbar" style="--c:${mColor(m.value)};--w:${m.value}%;animation-delay:${i * 70}ms"><div class="row between"><b>${esc(METRIC_N[m.key] || m.key)}</b><span class="mv">${m.value}<small>/100</small></span></div><div class="ml">${mLabel(m.value)}</div>""")
rep("""${m.note ? `<div class="mn">${esc(m.note)}</div>` : ''}</div>`).join('')}
      <div class="rep-sum">${a.metrics.map((m) => `<span style="color:${mColor(m.value)}">● ${METRIC_N[m.key] || m.key}</span>`).join('')}</div>""",
    """${m.note ? `<div class="mn">${esc(m.note)}</div>` : ''}</div>`; }).join('')}
      <div class="rep-sum">${a.metrics.map((m) => `<span style="color:${mColor(+m.value || 0)}">● ${esc(METRIC_N[m.key] || m.key)}</span>`).join('')}</div>""")
rep("(METRIC_N[m.key] || m.key).toLowerCase()", "esc(METRIC_N[m.key] || m.key).toLowerCase()")
# 4. ответ сервера «me»: числа — числами, флаги — флагами
rep("      ME = r;", "      const num = (x) => (Number.isFinite(+x) ? +x : 0);\n      ME = { ...r, price: num(r.price) || 149, days: num(r.days) || 30, chat_left: num(r.chat_left), chat_limit: num(r.chat_limit), analyze_left: num(r.analyze_left), pro_until: num(r.pro_until), pro: !!r.pro, paywall: !!r.paywall, receipt: !!r.receipt };")
# 5. рефералка: код выдаёт сервер (случайный), Telegram ID в ссылке не светится
rep("const refLink = () => `${BOT_URL}?startapp=r_${tgUser && tgUser.id ? Number(tgUser.id).toString(36) : 'demo'}`;",
    "const refLink = () => (REF && REF.code ? `${BOT_URL}?startapp=r_${REF.code}` : tg && tg.initData ? '' : `${BOT_URL}?startapp=r_demo`);")
rep("  aiCall('ref-info', {}, 10000, PAY_ENDPOINT).then((r) => { refLoading = false; if (r && !r.error) { REF = r; if (tab === 'me' && !modal) render(); } });",
    "  aiCall('ref-info', {}, 10000, PAY_ENDPOINT).then((r) => { refLoading = false; if (r && !r.error && /^[0-9a-z]{6,16}$/.test(r.code || '')) { REF = { code: r.code, invited: Math.max(0, +r.invited || 0), days: Math.max(0, +r.days || 0) }; if (tab === 'me' && !modal) render(); } });")
rep("  const link = refLink(), live = !!(tgUser && tgUser.id);", "  const link = refLink(), live = !!(tg && tg.initData);")
rep("    <div class=\"reflink\">${link.replace('https://', '')}</div>\n    ${live ? '' : '<div class=\"hint\" style=\"font-size:11.5px;margin-top:6px\">Это пример — в боте здесь будет твоя личная ссылка.</div>'}\n    <div class=\"row\" style=\"gap:8px;margin-top:12px\"><button class=\"btn sm\" data-act=\"ref-share\" style=\"flex:1\">Отправить другу</button><button class=\"btn sm ghost\" data-act=\"ref-copy\" style=\"flex:1\">Скопировать</button></div>",
    "    <div class=\"reflink\">${link ? link.replace('https://', '') : 'Готовим твою ссылку…'}</div>\n    ${live ? '' : '<div class=\"hint\" style=\"font-size:11.5px;margin-top:6px\">Это пример — в боте здесь будет твоя личная ссылка.</div>'}\n    <div class=\"row\" style=\"gap:8px;margin-top:12px\"><button class=\"btn sm\" data-act=\"ref-share\" style=\"flex:1\" ${link ? '' : 'disabled'}>Отправить другу</button><button class=\"btn sm ghost\" data-act=\"ref-copy\" style=\"flex:1\" ${link ? '' : 'disabled'}>Скопировать</button></div>")
rep("ACT['ref-share'] = () => {\n", "ACT['ref-share'] = () => {\n  if (!refLink()) return;\n")
rep("ACT['ref-copy'] = async () => {\n  const l = refLink();", "ACT['ref-copy'] = async () => {\n  const l = refLink(); if (!l) return;")
rep("try { const m = /^r_([0-9a-z]{1,12})$/.exec(tg.initDataUnsafe.start_param || '');", "try { const m = /^r_([0-9a-z]{6,16})$/.exec(tg.initDataUnsafe.start_param || '');")
# 6. без inline-обработчиков: битые картинки убирает общий слушатель (нужно для строгой CSP)
rep('decoding="async" onerror="this.remove()">` : \'\';', 'decoding="async" data-rm>` : \'\';')
s = s.replace(' onerror="this.remove()">', ' data-rm>')
assert ' onerror=' not in s, 'остались inline-обработчики'
rep("const pic = (k, w, cls) =>", "// картинки с data-rm убираем, если не загрузились (вместо onerror в разметке — строгая CSP запрещает inline-обработчики)\ndocument.addEventListener('error', (e) => { const t = e.target; if (t && t.tagName === 'IMG' && t.hasAttribute('data-rm')) t.remove(); }, true);\nconst pic = (k, w, cls) =>")
open(p,'w',encoding='utf-8').write(s)
s=open(p,encoding='utf-8').read()
# 7. внешние ссылки: только https, новая вкладка без доступа к нашей (noopener)
rep("  link(el) { const u = el.dataset.u; try {", "  link(el) { const u = el.dataset.u; if (!/^https:\\/\\//.test(u || '')) return; try {")
rep("} catch (e) {} window.open(u, '_", "} catch (e) {} window.open(u, '_")
s = s.replace("window.open(u, '_blank');", "window.open(u, '_blank', 'noopener');")
open(p,'w',encoding='utf-8').write(s)
s=open(p,encoding='utf-8').read()
# 8. заметка рядом с CSP: отпечаток скрипта пересчитывать после каждой правки
rep("<!-- Политика безопасности: приложение может грузить код и отправлять данные только на свои и перечисленные адреса -->",
    "<!-- Политика безопасности: приложение может грузить код и отправлять данные только на свои и перечисленные адреса.\n     Выполняется только НАШ встроенный скрипт — по отпечатку sha256 в script-src. После ЛЮБОЙ правки скрипта\n     пересчитай отпечаток: python3 demo-tools/csp.py index.html — иначе приложение не запустится. -->")
open(p,'w',encoding='utf-8').write(s)
