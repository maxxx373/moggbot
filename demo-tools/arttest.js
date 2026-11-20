// Проверка расписания статей: подменяем часы и считаем открытые/новые
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const start = new Date('2026-11-20T10:00:00');
  const cases = [[1,10],[1,23],[2,7],[2,8],[2,13],[2,19],[3,12],[10,20],[17,13],[18,19],[30,9]];
  const p = await b.newPage({viewport:{width:375,height:800}});
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.clock.install({ time: start });
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(500);
  await p.evaluate(()=>{ ob.issues=['acne']; ob.budget=3000; ob.goals=['skin']; ob.result=analyze(); acceptPlan(); });
  for (const [day, hour] of cases) {
    const t = new Date(start); t.setDate(t.getDate() + day - 1); t.setHours(hour, 0, 0, 0);
    await p.clock.setSystemTime(t);
    const r = await p.evaluate(()=>{ tab='journal'; jtab='feed'; render(); return { day: dayNum(today()), open: artsOpen().length, fresh: artsOpen().filter(isNewArt).length, next: artNext(), banner: document.querySelector('#app .banner').innerText.trim() }; });
    console.log(`день ${day}, ${hour}:00 → открыто ${r.open}, новых ${r.fresh}, следующая: ${r.next}\n      «${r.banner}»`);
  }
  // прочитал новую — пометка уходит
  const before = await p.evaluate(()=>artsOpen().filter(isNewArt).length);
  console.log('ошибки:', errs);
  await b.close();
})();
