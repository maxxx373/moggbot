// все обложки статей и уроков: заголовок не должен рваться посреди слова и вылезать
const { chromium } = require('playwright');
const serve = require('./serve');
const PAGE = process.argv[2] || 'demo.html';
(async () => {
  const b = await chromium.launch();
  for (const W of [320, 375, 430]) {
    const p = await b.newPage({viewport:{width:W,height:760}, reducedMotion:'reduce'});
    await serve(p);
    await p.goto('http://mogg.test/' + PAGE); await p.waitForTimeout(500);
    await p.evaluate(()=>{ ob.issues=['acne']; ob.budget=3000; ob.goals=['skin']; ob.result=analyze(); acceptPlan(); });
    await p.evaluate(async ()=>{ artParts=null; artLoaded=0; S.startDate=addDays(today(),-4000); await artsFetch(); });
    console.log('проверяю статей:', await p.evaluate(()=>ARTICLES.length));
    const bad = await p.evaluate(async () => {
      const out = [];
      for (const it of [...ARTICLES.map(a=>['article',a]), ...ALL_LESSONS.map(l=>['lesson',l])]) {
        reader = { kind: it[0], id: it[1].id }; render();
        const d = document.querySelector('.st-cover .disp'); if (!d) { out.push('нет обложки ' + it[1].id); continue; }
        const card = d.closest('.st-card').getBoundingClientRect();
        // рвётся ли слово: высота строки vs переносы внутри слова — проверяем ширину самого длинного слова
        const words = it[1].t.split(/\s+/); const probe = document.createElement('span'); probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap'; d.appendChild(probe);
        let maxW = 0; for (const w of words) { probe.textContent = w; maxW = Math.max(maxW, probe.getBoundingClientRect().width); }
        probe.remove();
        const r = d.getBoundingClientRect();
        if (maxW > r.width + 1) out.push(`${it[1].id}: слово шире строки (${Math.round(maxW)} > ${Math.round(r.width)}) «${it[1].t}»`);
        if (r.right > card.right + 1) out.push(`${it[1].id}: вылезает за карточку «${it[1].t}»`);
      }
      reader = null; render(); return out;
    });
    console.log(W, bad.length ? '\n  ' + bad.join('\n  ') : 'ок');
    await p.close();
  }
  await b.close();
})();
