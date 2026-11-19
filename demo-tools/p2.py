import sys
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n, (a[:80], s.count(a)); s=s.replace(a,b)

# 1. вкладка: «План» -> «Упражнения»
rep("['plan', 'План', IC.journal]","['plan', 'Упражнения', IC.bolt]")
rep('<button class="backlink" data-act="go" data-tab="plan">← План</button>','<button class="backlink" data-act="go" data-tab="plan">← Упражнения</button>')
rep("все варианты — в Плане → Средства.","все варианты — во вкладке «Я» → Средства.")

# 2. новый экран «Упражнения»
a=s.index('function renderPlan() {'); b=s.index('function toggleStep(key) {')
old=s[a:b]
# вытащим куски из старого экрана, чтобы не переписывать разметку
i1=old.index("    ${AI_ENDPOINT ? `<div class=\"card\"><div class=\"row between\"><b>Разбор по фото</b>"); i2=old.index("    ${routineCard()}")
ai_html=old[i1:i2]
j1=old.index("    ${shop.length ?"); j2=old.index('    <div class="sec"><span class="disp">Библиотека</span>')
shop_html=old[j1:j2]
k1=old.index('    <details class="card allp"><summary><span class="disp" style="font-size:20px">Все протоколы</span>')
allp_html=old[k1:old.rindex('`;')]
new='''function renderPlan() {
  // «Упражнения»: только то, что нужно делать по программе, тренировки и кусочек библиотеки
  const P = S.protos, act = P.active;
  const exIds = [...new Set(act.flatMap((a) => PROTOCOLS[a.id].steps.filter((s) => s.x).map((s) => s.x)))];
  const status = (id) => act.some((a) => a.id === id) ? 'активен' : P.queue.includes(id) ? 'в очереди' : P.done.some((d) => d.id === id) ? 'пройден ✓' : '';
  return `${topbar('Упражнения')}
    <div class="sec"><span class="disp">По программе</span><span class="chipline">[ сегодня ]</span></div>
    ${act.length ? act.map(protoCard).join('') : '<div class="card"><b>Активных протоколов нет</b><div class="hint" style="margin-top:4px">Выбери программу в списке «Все протоколы» внизу.</div></div>'}
    ${routineCard()}
    ${S.sleep && S.sleep.prog ? sleepCard(S.sleep.prog) : `<button type="button" class="card row" data-act="sl-open" style="width:100%;text-align:left"><div class="iconbtn" style="font-size:20px">🌙</div><div style="flex:1"><b>Подобрать программу сна</b><div class="hint">5 вопросов — и план отбоя под тебя</div></div></button>`}
    ${woCards()}
    ${S.train && S.train.prog ? trainCard(S.train.prog) : `<button type="button" class="card row" data-act="tr-open" style="width:100%;text-align:left"><div class="iconbtn" style="font-size:20px">🏋️</div><div style="flex:1"><b>Подобрать силовую программу</b><div class="hint">6 вопросов — дни, упражнения, подходы под тебя</div></div></button>`}
    ${exIds.length ? `<div class="sec"><span class="disp">Мои упражнения</span><span class="chipline">[ ${exIds.length} ]</span></div>
      <div class="exgrid">${exIds.map((id) => `<button class="excard" data-act="ex-open" data-x="${id}"><div class="pv">${EX_ANIM[id]()}</div><b>${EXERCISES[id].t}</b><small>${EXERCISES[id].dose}</small></button>`).join('')}</div>` : ''}
    ${readCard()}
    <button type="button" class="card row" data-act="lib" data-v="feed" style="width:100%;text-align:left"><div class="iconbtn" style="font-size:20px">📚</div><div style="flex:1"><b>Вся библиотека</b><div class="hint">${artsOpen().length} статей, курсы, книги и полка средств</div></div><span class="arrow">${IC.arrow}</span></button>
''' + allp_html + '''`;
}
// «Мой план» во вкладке «Я»: разбор по фото и список средств (переехали из бывшего «Плана»)
function myPlanExtras() {
  const shop = (S.plan && S.plan.shopping) || [];
  const st = { none: ['st-none', 'Заказать'], ordered: ['st-ordered', 'В пути'], arrived: ['st-arrived', 'Пришло'] };
  return `
''' + ai_html + shop_html + '''`;
}
'''
s=s[:a]+new+s[b:]

# 3. во вкладке «Я» — разбор по фото и средства
rep("    ${AI_ENDPOINT ? remindCard() : ''}\n","    ${myPlanExtras()}\n    ${AI_ENDPOINT ? remindCard() : ''}\n")
open(p,'w',encoding='utf-8').write(s)
# 4. длинная подпись «Упражнения» — вкладке чуть больше места
s=open(p,encoding='utf-8').read()
a='@media (max-width:360px){:root .tabs .tab{font-size:8.5px;letter-spacing:0}}'
assert s.count(a)==1
s=s.replace(a,a+'\n:root .tabs .tab[data-tab="plan"]{flex:1.45;letter-spacing:0}',1)
open(p,'w',encoding='utf-8').write(s)
