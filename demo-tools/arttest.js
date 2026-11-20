// Проверка расписания статей и подгрузки из articles/: подменяем часы и считаем открытые/новые
const { chromium } = require('playwright');
const serve = require('./serve');
(async () => {
  const b = await chromium.launch();
  const start = new Date('2026-11-20T10:00:00');
  const cases = [[1,10],[2,8],[2,13],[2,19],[10,20],[17,13],[18,19],[30,9]];
  const p = await b.newPage({viewport:{width:375,height:800}});
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await serve(p);
  await p.clock.install({ time: start });
  await p.goto('http://mogg.test/' + (process.argv[2] || 'demo.html')); await p.waitForTimeout(800);
  await p.evaluate(()=>{ ob.issues=['acne']; ob.budget=3000; ob.goals=['skin']; ob.result=analyze(); acceptPlan(); });
  await p.evaluate(()=>artsFetch()); await p.waitForTimeout(300);
  console.log('статей загружено всего:', await p.evaluate(()=>[ARTICLES.length, ART_IDS.length]));
  for (const [day, hour] of cases) {
    const t = new Date(start); t.setDate(t.getDate() + day - 1); t.setHours(hour, 0, 0, 0);
    await p.clock.setSystemTime(t);
    const r = await p.evaluate(()=>{ tab='journal'; jtab='feed'; render(); return { open: artsOpen().length, fresh: artsOpen().filter(isNewArt).length, next: artNext(), cards: document.querySelectorAll('#app .acard').length, more: !!document.querySelector('[data-act=\"feed-more\"]') }; });
    console.log(`день ${day}, ${hour}:00 → открыто ${r.open}, новых ${r.fresh}, следующая: ${r.next}, карточек ${r.cards}${r.more ? ' + «Показать ещё»' : ''}`);
  }
  console.log('ошибки:', errs);
  await b.close();
})();
