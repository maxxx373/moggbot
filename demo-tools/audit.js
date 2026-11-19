// Автопроверка: проходит по экранам и ищет нечитаемый текст, вылезание за край и наложение текста
const { chromium } = require('playwright');
const file = process.argv[2], out = process.argv[3];
const SCREENS = [['home'],['plan'],['wardrobe'],['perfume'],['coach'],['me'],
  ...['basics','mind','social','books','shelf','feed'].map(j=>['journal',j])];
(async () => {
  const b = await chromium.launch();
  for (const theme of ['light','dark']) {
  const p = await b.newPage({viewport:{width:375,height:812}, reducedMotion:'reduce'});
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.goto('file://'+file); await p.waitForTimeout(800);
  await p.evaluate((th)=>{ ob.issues=['acne','slouch']; ob.budget=3000; ob.goals=['skin','posture']; ob.result=analyze(); acceptPlan(); S.theme=th; S.lessons=['l1']; save(); }, theme);
  for (const [t,j] of SCREENS) {
    await p.evaluate(([t,j])=>{tab=t; if(j) jtab=j; render(); window.scrollTo(0,0);}, [t,j]); await p.waitForTimeout(500);
    const res = await p.evaluate(() => {
      const W = innerWidth, probs = [];
      const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r:v[0], g:v[1], b:v[2], a: v[3] === undefined ? 1 : v[3] }; };
      const L = (c) => { const f = (x) => { x/=255; return x<=.03928? x/12.92 : ((x+.055)/1.055)**2.4; }; return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b); };
      const name = (e) => (e.className && typeof e.className==='string' ? '.'+e.className.trim().split(/\s+/).slice(0,2).join('.') : e.tagName.toLowerCase()) + ' «' + e.textContent.trim().slice(0,30) + '»';
      const els = [...document.querySelectorAll('#app *')].filter(e => { if (e.closest('.tabs')) return false; const r=e.getBoundingClientRect(); if (!r.width||!r.height) return false; const cs=getComputedStyle(e); if (cs.visibility==='hidden'||+cs.opacity===0) return false; return [...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()); });
      for (const e of els) {
        const cs = getComputedStyle(e), fg = parse(cs.color);
        // фон: ближайший предок со сплошной заливкой и без картинки
        let bg=null, x=e, img=false;
        while (x && x!==document.documentElement) { const s=getComputedStyle(x); if (s.backgroundImage!=='none') { img=true; break; } const c=parse(s.backgroundColor); if (c && c.a>.9) { bg=c; break; } x=x.parentElement; }
        if (fg && bg && !img && fg.a>.3) { const l1=L(fg), l2=L(bg), cr=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05); if (cr<1.6) probs.push('нечитаемо (контраст '+cr.toFixed(2)+'): '+name(e)); }
        const r=e.getBoundingClientRect();
        if (r.right > W+1 && !e.closest(".qr,.strip,.jt,.wogrid,[style*=overflow],.lvtrack,.pfcats,.sacats") && cs.position!=='absolute' && !e.closest('[class*="spray"]')) probs.push('за краем экрана на '+Math.round(r.right-W)+'px: '+name(e));
        if (e.scrollWidth > e.clientWidth+2 && cs.overflow==='visible' && cs.whiteSpace!=='nowrap' && e.clientWidth>0 && !e.closest('.strip,.jt')) probs.push('текст шире блока: '+name(e));
      }
      // наложение: соседние текстовые блоки внутри одной строки
      const rows=[...document.querySelectorAll('#app .lesson, #app .mission, #app .item, #app .row')];
      for (const r of rows) { const kids=[...r.children].filter(k=>k.getBoundingClientRect().width); for (let i=0;i+1<kids.length;i++){ const a=kids[i].getBoundingClientRect(), c=kids[i+1].getBoundingClientRect(); if (getComputedStyle(kids[i]).position==='absolute'||getComputedStyle(kids[i+1]).position==='absolute') continue; if (a.right>c.left+2 && a.bottom>c.top+2 && c.bottom>a.top+2) probs.push('наложение: '+name(kids[i])+' ↔ '+name(kids[i+1])); } }
      const lv=document.querySelector('.top .lvl'); if (lv && lv.clientWidth<60) probs.push('плашка уровня сжата до '+lv.clientWidth+'px');
      return [...new Set(probs)];
    });
    const key = theme+':'+t+(j?':'+j:'');
    if (res.length) console.log('\n['+key+']\n  '+res.join('\n  '));
    if (out) await p.screenshot({path:`${out}/a_${theme}_${t}${j?'_'+j:''}.png`, fullPage:true});
  }
  if (errs.length) console.log('JS-ошибки', theme, errs);
  await p.close();
  }
  await b.close(); console.log('\nготово');
})();
