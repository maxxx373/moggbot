# Правка 12 (поверх p11): вместо таббара в две строки — одна строка из 5 кнопок и меню «три полоски» с боковой панелью всех разделов
import sys, re
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:80],s.count(a)); s=s.replace(a,b)

# 1. убрать стили таббара в две строки (из p11)
a=s.index("/* таббар в две строки: сверху 3 главные вкладки, снизу 4 — иконка и подпись в линию */")
b=s.index(".tab[data-tab=\"care\"]{--t1:#ff8fb1;--t2:#ffb07c;--tt:#2a0c14}")
s=s[:a]+s[b:]
rep("@media (max-width:374px){:root:root .tabs .tab:not(.main){flex-direction:column;gap:2px;font-size:10px;padding:6px 2px}:root:root .tabs .tab.main{font-size:11px;gap:4px}:root:root .tabs .tab.main svg{width:15px;height:15px}}", "")
rep(".app{padding-bottom:150px}", "")

# 2. таббар: Сегодня · Упражнения · Уход · Чат · ☰ Меню
rep("[['home', 'Сегодня', IC.home, 1], ['plan', 'Упражнения', IC.bolt, 1], ['care', 'Уход', IC.care, 1], ['wardrobe', 'Гардероб', IC.hanger], ['perfume', 'Парфюм', IC.perfume], ['coach', 'Чат', IC.coach], ['me', 'Я', IC.me]].map(([k, l, ic, main]) => `<button class=\"tab ${main ? 'main' : ''} ${on === k ? 'on' : ''}\" data-act=\"go\" data-tab=\"${k}\">${ic}<span>${l}</span></button>`).join('')}",
    "''}<button class=\"tab tabmenu on\" data-act=\"menu-open\" data-tab=\"menu\" aria-label=\"Меню: все разделы\">${IC.menu}<span>Меню</span><em>${(MENU_ITEMS.find(([k]) => k === (TAB_PARENT[tab] && tab !== 'journal' ? TAB_PARENT[tab] : tab)) || [0, 'mogg'])[1]}</em></button>")
rep("const TAB_PARENT = {", "const MENU_TABS = ['wardrobe', 'perfume', 'me', 'journal', 'path', 'friends']; // разделы, которые открываются из меню\nconst TAB_PARENT = {")
rep("  care: '<svg", "  menu: '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\"><path d=\"M4 6.5h16M4 12h16M4 17.5h16\"/></svg>',\n  care: '<svg")
rep(".tab[data-tab=\"care\"]{--t1:#ff8fb1;--t2:#ffb07c;--tt:#2a0c14}", """.tab[data-tab="care"]{--t1:#ff8fb1;--t2:#ffb07c;--tt:#2a0c14}
.tab[data-tab="menu"]{--t1:#ffd43b;--t2:#ff9f1c;--tt:#17150F}
/* внизу — одна кнопка «☰ Меню» и название текущего раздела */
:root:root .tabs .in{width:auto;max-width:none;padding:6px!important;border-radius:999px!important}
:root:root .tabs .tab.tabmenu{flex:none;flex-direction:row;gap:9px;padding:12px 18px 12px 16px;border-radius:999px!important;font-size:15px;font-weight:800;letter-spacing:.01em;background:var(--z-yellow,#FFD43B)!important;color:#17150F!important;transform:none!important}
:root:root .tabs .tab.tabmenu svg{width:22px;height:22px;color:#17150F!important}
:root:root .tabs .tab.tabmenu em{font-style:normal;font-size:12.5px;font-weight:700;padding:5px 11px;border-radius:999px;background:#17150F;color:#FFD43B;margin-left:2px}
/* боковое меню */
.dwrap{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:fade .2s}
.drawer{position:absolute;top:0;right:0;bottom:0;width:min(86vw,360px);background:#17150F;color:#EFE9DA;padding:calc(env(safe-area-inset-top) + 16px) 14px calc(env(safe-area-inset-bottom) + 16px);overflow-y:auto;box-shadow:-20px 0 40px rgba(0,0,0,.4);border-radius:26px 0 0 26px;animation:dslide .32s cubic-bezier(.2,.9,.25,1)}
@keyframes dslide{from{transform:translateX(100%)}to{transform:none}}
.drawer .dtop{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.drawer .dtop b{font-family:var(--disp);font-size:22px;text-transform:uppercase;letter-spacing:.02em}
.drawer .dx{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.1);color:#EFE9DA;display:grid;place-items:center;font-size:18px}
.drawer .dme{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:12px;border-radius:18px;background:linear-gradient(135deg,#FFD43B,#ff9f1c);color:#17150F;margin-bottom:14px}
.drawer .dme .av{width:46px;height:46px;border-radius:50%;background:#17150F;color:#FFD43B;display:grid;place-items:center;font-family:var(--disp);font-size:20px;flex:none}
.drawer .dme small{display:block;font-family:var(--mono);font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;opacity:.75;margin-top:2px}
.drawer .dme .bar{height:5px;border-radius:3px;background:rgba(23,21,15,.2);margin-top:7px;overflow:hidden}.drawer .dme .bar i{display:block;height:100%;background:#17150F;border-radius:3px}
.drawer .dlbl{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#A29B8B;margin:14px 4px 6px}
.drawer .ditem{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:9px 8px;border-radius:16px;color:#EFE9DA;transition:background .15s}
.drawer .ditem:active{background:rgba(255,255,255,.08)}
.drawer .ditem.on{background:rgba(255,212,59,.14);box-shadow:inset 0 0 0 1.5px rgba(255,212,59,.5)}
.drawer .ditem .di{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;flex:none;background:var(--dc);color:#17150F}
.drawer .ditem .di svg{width:21px;height:21px}
.drawer .ditem b{display:block;font-size:15px}.drawer .ditem small{display:block;font-size:12px;color:#A29B8B;margin-top:1px}
.drawer .ditem .chev{margin-left:auto;opacity:.45;font-size:18px}
.drawer .dfoot{display:flex;align-items:center;justify-content:space-between;margin-top:16px;padding:12px 8px 0;border-top:1px solid rgba(255,255,255,.1)}""")

# 3. боковое меню: окно kind 'menu'
rep("  if (modal.kind === 'report') return reportModal();", "  if (modal.kind === 'report') return reportModal();\n  if (modal.kind === 'menu') return menuDrawer();")
rep("ACT.story = () => shareStreak();", r"""ACT.story = () => shareStreak();
// ---------- меню «три полоски»: все разделы ----------
const MENU_ITEMS = [
  ['home', 'Сегодня', 'Миссии дня, серия и уровень', IC.home, '#d4ff1a'],
  ['plan', 'Упражнения', 'Тренировки и программа', IC.bolt, '#7d9bff'],
  ['care', 'Уход', 'Кожа, волосы, средства', IC.care, '#ff8fb1'],
  ['wardrobe', 'Гардероб', 'Образы и школа стиля', IC.hanger, '#3dffc0'],
  ['perfume', 'Парфюм', 'Подбор и база ароматов', IC.perfume, '#ff7ccf'],
  ['journal', 'Библиотека', 'Статьи, курсы и книги', IC.book, '#ffb07c'],
  ['coach', 'Чат', 'Тренер Макс на связи', IC.coach, '#ffa36b'],
  ['me', 'Профиль', 'Прогресс, награды, настройки', IC.me, '#b79cff']
];
function menuDrawer() {
  const r = rank(), on = TAB_PARENT[tab] && tab !== 'journal' ? TAB_PARENT[tab] : tab, name = (tgUser && tgUser.first_name) || 'Ты';
  const pct = r.next ? Math.round((r.x - r.cur) / (r.next - r.cur) * 100) : 100;
  return `<div class="dwrap" data-act="menu-close"><aside class="drawer" data-act="noop" role="dialog" aria-label="Все разделы">
    <div class="dtop"><b>Разделы</b><button class="dx" data-act="menu-close" aria-label="Закрыть">✕</button></div>
    <button class="dme" data-act="menu-go" data-tab="me"><span class="av">${esc(name.slice(0, 1).toUpperCase())}</span><span style="flex:1;min-width:0"><b style="font-size:16px">${esc(name)}</b><small>LVL ${r.lvl} · ${r.name} · серия ${streak()} 🔥</small><span class="bar"><i style="width:${pct}%"></i></span></span></button>
    ${MENU_ITEMS.map(([k, t, d, ic, c]) => `<button class="ditem ${on === k ? 'on' : ''}" data-act="menu-go" data-tab="${k}" style="--dc:${c}"><span class="di">${ic}</span><span><b>${t}</b><small>${d}</small></span><span class="chev">›</span></button>`).join('')}
    <div class="dlbl">Ещё</div>
    <button class="ditem" data-act="menu-go" data-tab="me" data-then="ref" style="--dc:#FFD43B"><span class="di">🎁</span><span><b>Пригласить друга</b><small>+${REF_DAYS} дней Pro тебе и другу</small></span><span class="chev">›</span></button>
    <button class="ditem" data-act="report-open" style="--dc:#EFE9DA"><span class="di">🛠</span><span><b>Сообщить о проблеме</b><small>Починим быстро</small></span><span class="chev">›</span></button>
    <div class="dfoot"><span style="font-size:13px;color:#A29B8B">Тема оформления</span>${themeSwitch()}</div>
  </aside></div>`;
}
ACT.noop = () => {};
ACT['menu-open'] = () => { modal = { kind: 'menu' }; haptic('light'); render(); };
ACT['menu-close'] = () => { modal = null; render(); };
ACT['menu-go'] = (el) => {
  const k = el.dataset.tab, then = el.dataset.then;
  modal = null; reader = null;
  if (k === 'journal') { jtab = 'feed'; }
  tab = k; haptic('light'); render();
  if (k === 'coach') scrollChat(); else window.scrollTo(0, 0);
  if (then === 'ref') setTimeout(() => { const c = document.querySelector('.refcard'); if (c) c.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 60);
};""")
# тема в меню: после переключения меню остаётся открытым (modal не сбрасывается — theme-toggle сам вызывает render)
# 4. из библиотеки «Назад» ведёт туда, откуда пришли по умолчанию — в «Упражнения» остаётся; в меню она подсвечивает «Меню»
open(p,'w',encoding='utf-8').write(s)
s=open(p,encoding='utf-8').read()
rep("и сравни во вкладке «Я».", "и сравни в «Профиле» (меню ☰).")
open(p,'w',encoding='utf-8').write(s)
