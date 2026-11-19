// Робот: на каждом экране нажимает каждую кнопку (и кнопки в открывшемся окне) и собирает ошибки JS
const { chromium } = require('playwright');
const file = process.argv[2], THEME = process.argv[3] || 'light', WIDTH = +(process.argv[4] || 375), SHOTS = process.argv[5];
const fs = require('fs'); const DOMCHECK = fs.readFileSync(__dirname + '/domcheck.js', 'utf8');
const found = new Map();
const SCREENS = [['home'],['plan'],['wardrobe',null,'looks'],['wardrobe',null,'school'],['perfume'],['coach'],['me'],
  ...['basics','mind','social','books','shelf','feed'].map(j=>['journal',j])];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({viewport:{width:WIDTH,height:780}});
  const errs = [];
  let where = '';
  p.on('pageerror', e => errs.push(where + ' → ' + e.message));
  p.on('dialog', d => d.dismiss());
  await p.addInitScript(DOMCHECK); await p.goto('file://' + file); await p.waitForTimeout(800);
  await p.evaluate((THEME_ARG) => {
    window.open = () => null;
    ob.issues = ['acne', 'slouch', 'latesleep']; ob.budget = 5000; ob.goals = ['skin', 'posture', 'body'];
    ob.sleep = { bed: 24.5, wake: 7.5, fall: 'long', morn: 'tired', block: ['phone'] };
    ob.train = { exp: 'some', place: 'home', goal: 'mass', freq: 3, time: 40, lim: [] };
    ob.result = analyze(); acceptPlan(); S.theme = THEME_ARG;
    S.lessons = ['l1']; S.books = { [BOOKS[0].id]: 'reading' }; save();
    window.__snap = JSON.stringify(S);
  }, THEME);
  const reset = async (scr) => p.evaluate(([t, j, w]) => {
    try { woStop(); } catch (e) {}
    S = JSON.parse(window.__snap); modal = null; reader = null; tab = t; if (j) jtab = j; if (w) wtab = w;
    try { pf = pfFresh(); } catch (e) {} try { wview = 'list'; } catch (e) {}
    render(); window.scrollTo(0, 0);
  }, scr);
  const acts = () => p.evaluate(() => [...document.querySelectorAll('[data-act]')].filter(e => e.getClientRects().length).map((e, i) => ({ i, a: e.dataset.act, t: (e.textContent || '').trim().slice(0, 25), inModal: !!e.closest('#modal,#overlay') })));
  const clickN = (n) => p.evaluate((n) => { const e = [...document.querySelectorAll('[data-act]')].filter(e => e.getClientRects().length)[n]; if (e) e.click(); }, n);
  const SKIP = new Set(['reset', 'photo', 'link', 'pro-pay', 'w-add', 'cam-open']);

  let shotN = 0;
  const check = async () => {
    await p.waitForTimeout(250);
    const pr = await p.evaluate(() => window.__domcheck());
    for (const x of pr) if (!found.has(x)) { found.set(x, where); if (SHOTS && shotN < 60) await p.screenshot({ path: SHOTS + '/c' + (shotN++) + '.png' }), found.set(x, where + '  [c' + (shotN - 1) + ']'); }
  };
  let clicks = 0;
  for (const scr of SCREENS) {
    await reset(scr);
    where = scr.filter(Boolean).join(':'); await check();
    const list = await acts();
    for (const x of list) {
      if (SKIP.has(x.a)) continue;
      await reset(scr);
      where = scr.filter(Boolean).join(':') + ' / ' + x.a + ' «' + x.t + '»';
      await clickN(x.i); clicks++;
      await p.waitForTimeout(120); await check();
      // если открылось окно — пройдёмся по его кнопкам
      const sub = (await acts()).filter(y => y.inModal && !SKIP.has(y.a));
      for (const y of sub.slice(0, 40)) {
        await reset(scr); await clickN(x.i); await p.waitForTimeout(80);
        const cur = (await acts()).find(z => z.inModal && z.a === y.a && z.t === y.t);
        if (!cur) continue;
        where = scr.filter(Boolean).join(':') + ' / ' + x.a + ' «' + x.t + '» → ' + y.a + ' «' + y.t + '»';
        await clickN(cur.i); clicks++; await p.waitForTimeout(100); await check();
      }
    }
  }
  console.log('нажатий:', clicks);
  console.log([...new Set(errs)].join('\n') || 'ошибок JS нет');
  console.log('\nВЁРСТКА:'); for (const [k, v] of found) console.log(k + '\n     где: ' + v);
  await b.close();
})();
