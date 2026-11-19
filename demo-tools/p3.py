import sys
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
def rep(a,b):
    global s
    assert s.count(a)==1,(a[:70],s.count(a)); s=s.replace(a,b)
# шапка курса: только статуя, без фото курса и контурного слова
rep('''    <div class="hero" style="min-height:230px;background:none">
      ${art(c.art, c.word, COURSE_IMG[key])}
      <div class="in"''','''    <div class="hero" style="min-height:230px">
      <div class="in"''')
# номер урока не налезает на текст
rep('.lesson .num{font-family:var(--disp);font-size:40px;line-height:.9;color:var(--accent);width:52px;flex:none}',
    '.lesson .num{font-family:var(--disp);font-size:40px;line-height:.9;color:var(--accent);min-width:52px;flex:none;white-space:nowrap}')
open(p,'w',encoding='utf-8').write(s)
s=open(p,encoding='utf-8').read()
a=":root:root :is(.pfcats,.sacats) button.on{background:var(--z-ink)!important;color:var(--z-yellow)!important}"
assert s.count(a)==1
s=s.replace(a,a+"\n:root:root .jt button.on{background:var(--z-ink)!important;color:var(--z-yellow)!important}",1)
open(p,'w',encoding='utf-8').write(s)
s=open(p,encoding='utf-8').read()
def rep(a,b):
    global s
    assert s.count(a)==1,(a[:70],s.count(a)); s=s.replace(a,b)
# шапка курса: заголовок помещается по ширине
rep('<div class="bot"><div class="disp" style="font-size:44px">${c.title}</div>','<div class="bot"><div class="disp" style="font-size:34px;overflow-wrap:anywhere">${c.title}</div>')
rep('<span class="mono">+25 XP · 1 урок в день</span></div>','<span class="mono" style="padding-right:44px">+25 XP · 1 урок в день</span></div>')
# «Я»: название ранга и номер уровня не вылезают
rep('<div class="row between" style="margin-top:6px"><div class="disp" style="font-size:40px">${r.name}</div><div class="disp" style="font-size:40px;color:var(--accent)">${z(r.lvl)}</div></div>',
    '<div class="row between" style="margin-top:6px;align-items:flex-end"><div class="disp" style="font-size:34px;min-width:0;flex:1;overflow-wrap:anywhere">${r.name}</div><div class="disp" style="font-size:34px;flex:none;color:var(--accent)">${z(r.lvl)}</div></div>')
# шапка экрана: длинный заголовок чуть меньше, плашка уровня не сжимается в «L…»
rep("<div class=\"top\"><div class=\"logo\">${IC.logo}<b>${title || 'mogg'}<span class=\"tm\">™</span></b></div><span class=\"lvl ${isOpen('gold') ? 'gold' : ''}\">LVL <em>${r.lvl}</em> · ${r.name}</span>",
    "<div class=\"top${(title || '').length > 8 ? ' long' : ''}\"><div class=\"logo\">${IC.logo}<b${(title || '').length > 8 ? ' style=\"font-size:17px\"' : ''}>${title || 'mogg'}<span class=\"tm\">™</span></b></div><span class=\"lvl ${isOpen('gold') ? 'gold' : ''}\">LVL <em>${r.lvl}</em><span class=\"lvn\"> · ${r.name}</span></span>")
a=":root:root .jt button.on{background:var(--z-ink)!important;color:var(--z-yellow)!important}"
rep(a, ''':root:root .jt button.on{background:#17150F!important;color:#FFD43B!important}
/* исправления читаемости и вылезаний */
:root:root .backlink{color:var(--z-ink)!important}
:root:root .top .lvl{min-width:66px;flex:0 1 auto}
:root:root[data-theme="dark"] .lvl em{color:#B07F00!important}
.books{grid-template-columns:repeat(2,minmax(0,1fr))}
:root:root .book .cover .disp{font-size:16px;line-height:1.05;hyphens:auto;-webkit-hyphens:auto;overflow-wrap:break-word}\n:root:root .top.long .lvn{display:none}''')
open(p,'w',encoding='utf-8').write(s)
