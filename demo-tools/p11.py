# Правка 11: вкладка «Уход» + таббар в две строки (3 главных сверху, 4 снизу)
import sys
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:80],s.count(a)); s=s.replace(a,b)

# 1. иконка
rep("  hanger: '<svg", "  care: '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M10 2h4\"/><path d=\"M12 2v4\"/><path d=\"M14 4h3\"/><rect x=\"9\" y=\"6\" width=\"6\" height=\"3\" rx=\"1\"/><rect x=\"6.5\" y=\"9\" width=\"11\" height=\"13\" rx=\"3.5\"/><path d=\"M10 15.5h4\"/></svg>',\n  hanger: '<svg")

# 2. таббар: 7 вкладок, две строки
rep("[['home', 'Сегодня', IC.home], ['plan', 'Упражнения', IC.bolt], ['wardrobe', 'Гардероб', IC.hanger], ['perfume', 'Парфюм', IC.perfume], ['coach', 'Чат', IC.coach], ['me', 'Я', IC.me]].map(([k, l, ic]) => `<button class=\"tab ${on === k ? 'on' : ''}\" data-act=\"go\" data-tab=\"${k}\">${ic}${l}</button>`).join('')}",
    "[['home', 'Сегодня', IC.home, 1], ['plan', 'Упражнения', IC.bolt, 1], ['care', 'Уход', IC.care, 1], ['wardrobe', 'Гардероб', IC.hanger], ['perfume', 'Парфюм', IC.perfume], ['coach', 'Чат', IC.coach], ['me', 'Я', IC.me]].map(([k, l, ic, main]) => `<button class=\"tab ${main ? 'main' : ''} ${on === k ? 'on' : ''}\" data-act=\"go\" data-tab=\"${k}\">${ic}<span>${l}</span></button>`).join('')}")
rep(":root .tabs .tab[data-tab=\"plan\"]{flex:1.45;letter-spacing:0}", """/* таббар в две строки: сверху 3 главные вкладки, снизу 4 — иконка и подпись в линию */
:root:root .tabs .in{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:3px;padding:6px!important;border-radius:26px!important}
:root:root .tabs .tab{grid-column:span 3;flex-direction:row;justify-content:center;gap:4px;padding:9px 2px;font-size:11px;letter-spacing:0;min-width:0;white-space:nowrap}
:root:root .tabs .tab.main{grid-column:span 4;font-size:12.5px;gap:6px;padding:10px 2px}
:root:root .tabs .tab span{overflow:hidden;text-overflow:ellipsis}
:root:root .tabs .tab svg{width:16px;height:16px;flex:none}
:root:root .tabs .tab.main svg{width:18px;height:18px}
:root:root .tabs .tab.on{transform:rotate(-2deg)}
.tab[data-tab="care"]{--t1:#ff8fb1;--t2:#ffb07c;--tt:#2a0c14}
.app{padding-bottom:150px}
/* узкие телефоны: в нижней строке иконка над подписью */
@media (max-width:374px){:root:root .tabs .tab:not(.main){flex-direction:column;gap:2px;font-size:10px;padding:6px 2px}:root:root .tabs .tab.main{font-size:11px;gap:4px}:root:root .tabs .tab.main svg{width:15px;height:15px}}""")

# 3. протоколы ухода — во вкладке «Уход», в «Упражнениях» — остальные
rep("function renderPlan() {", """const CARE_P = ['skin', 'hair'];
const isCareProto = (id) => !!PROTOCOLS[id] && CARE_P.includes(PROTOCOLS[id].p);
function renderPlan() {""")
rep("    ${act.length ? act.map(protoCard).join('') : '<div class=\"card\"><b>Активных протоколов нет</b><div class=\"hint\" style=\"margin-top:4px\">Выбери программу в списке «Все протоколы» внизу.</div></div>'}\n    ${routineCard()}\n",
    "    ${act.filter((a) => !isCareProto(a.id)).length ? act.filter((a) => !isCareProto(a.id)).map(protoCard).join('') : '<div class=\"card\"><b>Активных программ нет</b><div class=\"hint\" style=\"margin-top:4px\">Выбери программу в списке «Все протоколы» внизу. Уход за кожей и волосами — во вкладке «Уход».</div></div>'}\n")
rep("<div>${PROTO_ORDER.map((id) => { const pr = PROTOCOLS[id], st = status(id);", "<div>${PROTO_ORDER.filter((id) => !isCareProto(id)).map((id) => { const pr = PROTOCOLS[id], st = status(id);")
rep('<span class="mono">${PROTO_ORDER.length}</span></summary>', '<span class="mono">${PROTO_ORDER.filter((id) => !isCareProto(id)).length}</span></summary>')

# 4. экран «Уход»
rep("function myPlanExtras() {", r"""function renderCare() {
  const P = S.protos, act = P.active.filter((a) => isCareProto(a.id)), d = today();
  const status = (id) => P.active.some((a) => a.id === id) ? 'активен' : P.queue.includes(id) ? 'в очереди' : P.done.some((x) => x.id === id) ? 'пройден ✓' : '';
  const tile = (part, ic, name) => { const key = d + ':' + part, st = routine(part), dn = ((S.rdone || {})[key] || []).length, full = (S.rfull || {})[key];
    return `<button class="tint" data-act="r-open" data-v="${part}" style="--c:${part === 'am' ? '#ffb07c' : '#b79cff'};text-align:left"><div class="mono">${ic} ${name}</div><b>${full ? '✓' : dn + '/' + st.length}</b><small>${full ? 'готово · +10 XP' : 'шагов · с таймером'}</small></button>`; };
  const careArts = artsOpen().filter((a) => a.tag === 'Уход' || a.tag === 'Волосы').reverse().slice(0, 6);
  const free = PROTO_ORDER.filter((id) => isCareProto(id) && !P.active.some((a) => a.id === id));
  return `${topbar('Уход')}
    <div class="sec"><span class="disp">Сегодня</span><span class="chipline">[ рутина ]</span></div>
    <div class="tiles" style="margin-bottom:12px">${tile('am', '☀️', 'Утро')}${tile('pm', '🌙', 'Вечер')}</div>
    <div class="sec"><span class="disp">Протоколы</span><span class="chipline">[ кожа · волосы ]</span></div>
    ${act.length ? act.map(protoCard).join('') : '<div class="card"><b>Нет активных протоколов ухода</b><div class="hint" style="margin-top:4px">Выбери, с чем работаем, — дадим шаги на каждый день.</div></div>'}
    ${free.length ? `<div class="card">${free.map((id) => { const pr = PROTOCOLS[id], st = status(id); return `<div class="item"><span style="font-size:20px">${PILLARS[pr.p].code === 'HAIR' ? '💈' : '🧴'}</span><div style="flex:1"><b style="font-size:14.5px">${pr.t}</b><div class="hint" style="font-size:12px">${pr.days} дней</div></div>${st && st !== 'пройден ✓' ? `<span class="mono">${st}</span>` : `<button class="btn sm ghost" data-act="proto-add" data-id="${id}" style="height:32px">${st ? 'Ещё раз' : 'Начать'}</button>`}</div>`; }).join('')}</div>` : ''}
    ${myPlanExtras()}
    ${((S.plan && S.plan.shopping) || []).length ? '' : `<button type="button" class="card row" data-act="lib" data-v="shelf" style="width:100%;text-align:left"><div class="iconbtn" style="font-size:20px">🛒</div><div style="flex:1"><b>Подобрать средства</b><div class="hint">Что работает на самом деле — под твой бюджет</div></div><span class="arrow">${IC.arrow}</span></button>`}
    ${careArts.length ? `<div class="sec"><span class="disp">Почитать</span><span class="chipline">[ уход · волосы ]</span></div>
    <div class="strip">${careArts.map((a) => `<button class="phcard" data-act="open" data-kind="article" data-id="${a.id}" style="text-align:left">${cover(a)}<div style="font-weight:800;font-size:17px;line-height:1.2;margin-top:4px">${a.t}</div></button>`).join('')}</div>` : ''}`;
}
function myPlanExtras() {""")
rep("    ${myPlanExtras()}\n    ${reportCard()}", "    ${reportCard()}")
rep("const screens = { home: renderHome,", "const screens = { care: renderCare, home: renderHome,")

# 5. тексты, где упоминалось старое место
rep("все варианты — во вкладке «Я» → Средства.", "все варианты — во вкладке «Уход» → Средства.")
rep("разбор по фото можно сделать позже во вкладке «Я».", "разбор по фото можно сделать позже во вкладке «Уход».")
open(p,'w',encoding='utf-8').write(s)
