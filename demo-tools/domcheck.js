// Проверка вёрстки текущего состояния страницы. Возвращает список проблем.
window.__domcheck = function () {
  const W = innerWidth, probs = [];
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v[3] === undefined ? 1 : v[3] }; };
  const L = (c) => { const f = (x) => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const name = (e) => (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : e.tagName.toLowerCase()) + ' «' + e.textContent.trim().slice(0, 30) + '»';
  const root = document.querySelector('#modal .modal, #modal > *') ? document.getElementById('modal') : document.querySelector('#overlay > *') ? document.getElementById('overlay') : document.getElementById('app');
  const H = /\b(undefined|NaN|null|\[object Object\])\b/;
  const txt = root.innerText || '';
  const m = txt.match(new RegExp('.{0,30}' + H.source + '.{0,20}'));
  if (m) probs.push('мусорный текст: «' + m[0].replace(/\s+/g, ' ') + '»');
  const els = [...root.querySelectorAll('*')].filter((e) => { if (e.closest('.tabs')) return false; const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity === 0) return false; return [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()); });
  for (const e of els) {
    const cs = getComputedStyle(e), fg = parse(cs.color);
    let bg = null, x = e, img = false;
    while (x && x !== document.documentElement) { const s = getComputedStyle(x); if (s.backgroundImage !== 'none') { img = true; break; } const c = parse(s.backgroundColor); if (c && c.a > .9) { bg = c; break; } x = x.parentElement; }
    if (fg && bg && !img && fg.a > .3) { const l1 = L(fg), l2 = L(bg), cr = (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); if (cr < 1.6) probs.push('нечитаемо (контраст ' + cr.toFixed(2) + '): ' + name(e)); }
    const r = e.getBoundingClientRect();
    let scrollAnc = false; for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') { scrollAnc = true; break; } }
    // текст обрезан краем блока с overflow:hidden (карточки, обложки)
    for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const ac = getComputedStyle(a); if (ac.overflowX === 'auto' || ac.overflowX === 'scroll') break; if (ac.overflowX === 'hidden' || ac.overflowX === 'clip') { const ar = a.getBoundingClientRect(); if (cs.textOverflow !== 'ellipsis' && ac.textOverflow !== 'ellipsis' && cs.position !== 'absolute' && (r.right > ar.right + 2 || r.left < ar.left - 2) && r.width < ar.width * 3) probs.push('текст обрезан краем блока на ' + Math.round(Math.max(r.right - ar.right, ar.left - r.left)) + 'px: ' + name(e)); break; } }
    if (e.scrollWidth > e.clientWidth + 2 && cs.overflowX === 'hidden' && cs.textOverflow !== 'ellipsis' && e.clientWidth > 0) probs.push('текст не влезает в блок: ' + name(e));
    if (r.right > W + 1 && !scrollAnc && cs.position !== 'absolute' && cs.position !== 'fixed') probs.push('за краем экрана на ' + Math.round(r.right - W) + 'px: ' + name(e));
    if (r.left < -1 && !scrollAnc && cs.position !== 'absolute' && cs.position !== 'fixed') probs.push('за левым краем на ' + Math.round(-r.left) + 'px: ' + name(e));
  }
  const rows = [...root.querySelectorAll('.lesson, .mission, .item, .row, .rstep, .opt')];
  for (const r of rows) { const kids = [...r.children].filter((k) => k.getBoundingClientRect().width && !['absolute', 'fixed'].includes(getComputedStyle(k).position)); for (let i = 0; i + 1 < kids.length; i++) { const a = kids[i].getBoundingClientRect(), c = kids[i + 1].getBoundingClientRect(); if (a.right > c.left + 2 && a.bottom > c.top + 2 && c.bottom > a.top + 2 && a.left < c.right - 2) probs.push('наложение: ' + name(kids[i]) + ' ↔ ' + name(kids[i + 1])); } }
  // наложение текста: сравниваем реальные прямоугольники строк текста у соседей в строке
  const textRect = (el) => { const r = document.createRange(); r.selectNodeContents(el); const rs = [...r.getClientRects()].filter((x) => x.width > 1 && x.height > 1); if (!rs.length) return null; return { left: Math.min(...rs.map((x) => x.left)), right: Math.max(...rs.map((x) => x.right)), top: Math.min(...rs.map((x) => x.top)), bottom: Math.max(...rs.map((x) => x.bottom)) }; };
  for (const row of root.querySelectorAll('.row, .row.between, summary, .sec')) {
    const kids = [...row.children].filter((k) => k.getBoundingClientRect().width && (k.textContent || '').trim() && !['absolute', 'fixed'].includes(getComputedStyle(k).position));
    for (let i = 0; i + 1 < kids.length; i++) { const a = textRect(kids[i]), c = textRect(kids[i + 1]); if (a && c && a.right > c.left + 2 && c.right > a.left + 2 && a.bottom > c.top + 2 && c.bottom > a.top + 2) probs.push('текст налезает: ' + name(kids[i]) + ' ↔ ' + name(kids[i + 1])); }
  }
  if (document.documentElement.scrollWidth > W + 1) probs.push('страница шире экрана на ' + (document.documentElement.scrollWidth - W) + 'px');
  return [...new Set(probs)];
};
