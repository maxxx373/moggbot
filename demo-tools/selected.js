// контраст выбранных и невыбранных кнопок в онбординге и на экранах
const { chromium } = require('playwright');
const file = process.argv[2];
(async () => {
  const b = await chromium.launch();
  for (const th of ['light','dark']) {
    const p = await b.newPage({viewport:{width:375,height:800}});
    await p.addInitScript((th)=>{ try{localStorage.setItem('upgrade_v3', JSON.stringify({theme:th})); localStorage.setItem('mogg_demo_v1', JSON.stringify({theme:th}))}catch(e){} }, th);
    await p.goto('file://'+file); await p.waitForTimeout(700);
    const measure = () => p.evaluate(() => {
      const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return {r:v[0],g:v[1],b:v[2],a:v[3]===undefined?1:v[3]}; };
      const L = (c) => { const f = (x) => { x/=255; return x<=.03928?x/12.92:((x+.055)/1.055)**2.4; }; return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b); };
      const bgOf = (e) => { for (let x=e; x; x=x.parentElement) { const s=getComputedStyle(x); const c=parse(s.backgroundColor); if (s.backgroundImage!=='none' && s.backgroundImage.includes('gradient')) { const m=s.backgroundImage.match(/rgba?\([^)]+\)/); if (m) return parse(m[0]); } if (c.a>.85) return c; } return {r:255,g:255,b:255}; };
      const out = [];
      document.querySelectorAll('#app .chip, #app .opt, #app .seg button, #app .tint[data-act], #app .jt button, #modal .chip, #modal .opt, #modal .seg button').forEach((e) => {
        if (!e.getClientRects().length) return;
        const t = [...e.querySelectorAll('*')].find(x=>[...x.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())) || e;
        const fg = parse(getComputedStyle(t).color), bg = bgOf(e);
        const l1=L(fg), l2=L(bg), cr=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
        out.push({cls: e.className.split(' ')[0]||e.tagName, on: e.classList.contains('on') || e.getAttribute('style')?.includes('background:'), cr: +cr.toFixed(2), t: e.textContent.trim().slice(0,18)});
      });
      return out;
    });
    const all = [];
    for (let step=2; step<=5; step++) {
      await p.evaluate((st)=>{ ob.step=st; ob.consent=true; ob.goals=['skin','hair']; ob.issues=['acne','dandruff','slouch']; ob.budget=1500; ob.sleep={bed:23.5,wake:7.5,fall:'long',morn:null,block:['phone']}; ob.train={exp:'some',place:null,goal:null,freq:null,time:null,lim:['knees']}; render(); }, step);
      await p.waitForTimeout(200);
      (await measure()).forEach(x=>all.push({...x, step}));
    }
    const bad = all.filter(x=>x.cr<3);
    const key = (x)=>`${x.cls}${x.on?'.on':''}`;
    const sum = {}; all.forEach(x=>{ const k=key(x); sum[k]=Math.min(sum[k]??99, x.cr); });
    console.log(th, JSON.stringify(sum));
    bad.forEach(x=>console.log('   плохо:', th, 'шаг', x.step, key(x), x.cr, x.t));
    await p.close();
  }
  await b.close();
})();
