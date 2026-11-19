# Правка 4: общий проход по ошибкам
import sys
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:80],s.count(a)); s=s.replace(a,b)
# 1. страница никогда не шире экрана (из-за этого «Полка» съезжала вбок)
rep("html,body{margin:0;", "html,body{margin:0;overflow-x:hidden;overflow-x:clip;")
# 2. шапка помещается на узких телефонах (360px): заголовок ужимается, переключатель темы не вылезает
rep(":root .top .logo{flex:0 0 auto}", ":root .top .logo{flex:0 0 auto}\n:root .top .logo b{font-size:min(22px,6vw)}\n:root .top.long .logo b{font-size:min(17px,5vw)!important}\n:root .top.sect .lvn{display:none}\n@media (max-width:400px){:root .top .lvn{display:none}:root .top.sect .lvl{display:none}:root .top.sect .tsw{margin-left:auto}}")
rep("<div class=\"top${(title || '').length > 8 ? ' long' : ''}\">", "<div class=\"top${title ? ' sect' : ''}${(title || '').length > 8 ? ' long' : ''}\">")
rep("<b${(title || '').length > 8 ? ' style=\"font-size:17px\"' : ''}>", "<b>")
# 3. онбординг: подпись «Добавить фото» на тёмном окне — белая
rep('data-k="ob-photo" style="margin-bottom:14px;width:100%;color:inherit;font:inherit"', 'data-k="ob-photo" style="margin-bottom:14px;width:100%;color:#fff;font:inherit"')
# 4. устаревшие ссылки на старые разделы
rep("Протоколы (Главная → Мой план):", "Протоколы (вкладка «Упражнения»):")
rep("и сравни на вкладке «Путь».", "и сравни во вкладке «Я».")
rep("она на главной и в «Моём плане».", "она на главной и во вкладке «Упражнения».")
rep("разбор по фото можно сделать позже в «Моём плане».", "разбор по фото можно сделать позже во вкладке «Я».")
rep(" Друзья видят твою ауру в рейтинге.</div>", "</div>")
# 5. карточка для сторис: без служебного текста, название ранга не налезает на цифру
rep("Сделай скриншот и выложи в сторис. В рабочей версии здесь будет кнопка «Поделиться».", "Сделай скриншот и выложи в сторис.")
rep('<div class="disp" style="font-size:26px">${r.name}</div>\n          <div style="margin-top:auto" class="specs">', '<div class="disp" style="font-size:26px;margin-top:10px">${r.name}</div>\n          <div style="margin-top:auto" class="specs">')
# 6. истории: длинные заголовки статей помещаются в карточку
rep(".st-cover .disp{font-size:clamp(34px,10.5vw,46px);text-wrap:balance}", ".st-cover .disp{font-size:clamp(26px,8.4vw,42px);text-wrap:balance;overflow-wrap:break-word}")
open(p,'w',encoding='utf-8').write(s)
s=open(p,encoding='utf-8').read()
# 7. узкие телефоны (320px): кнопки и поля не вылезают
rep(".field{width:100%;height:48px;", ".field{width:100%;min-width:0;box-sizing:border-box;height:48px;")
rep('<div style="flex:1"><div class="mono lbl">Лёг</div>', '<div style="flex:1;min-width:0"><div class="mono lbl">Лёг</div>')
rep('<div style="flex:1"><div class="mono lbl">Проснулся</div>', '<div style="flex:1;min-width:0"><div class="mono lbl">Проснулся</div>')
rep(".modes button{display:flex;flex-direction:column;align-items:flex-start;gap:3px}", ".modes button{display:flex;flex-direction:column;align-items:flex-start;gap:3px;min-width:0}\n.modes small{overflow-wrap:break-word;hyphens:auto;-webkit-hyphens:auto;max-width:100%}\n@media (max-width:340px){.modes{grid-template-columns:1fr}}")
rep(".slcard .lbl{margin-bottom:4px}", ".slcard .lbl{margin-bottom:4px}\n.card > .row.between > .btn.sm{flex:none}\n.card > .row.between > :first-child{min-width:0}")
open(p,'w',encoding='utf-8').write(s)
s=open(p,encoding='utf-8').read()
# 8. «Коллекция»: длинные названия не упираются в край; пометки у заголовков секций — в одну строку
rep(".cc .disp{font-size:24px;margin-top:auto;position:relative}", ".cc .disp{font-size:clamp(18px,6.2vw,24px);margin-top:auto;position:relative;overflow-wrap:break-word}")
rep(".chipline{font-family:var(--mono);", ".chipline{white-space:nowrap;font-family:var(--mono);")
open(p,'w',encoding='utf-8').write(s)
s=open(p,encoding='utf-8').read()
# 9. совсем узкие экраны: заголовки секций и пометки чуть меньше, чтобы стоять в одну строку
rep("@media (max-width:340px){.modes{grid-template-columns:1fr}}", "@media (max-width:340px){.modes{grid-template-columns:1fr}:root:root:root .sec .disp{font-size:17px!important}:root:root .sec .chipline{font-size:9px;padding:5px 7px;letter-spacing:.04em;transform:none}.sec{gap:8px}}")
open(p,'w',encoding='utf-8').write(s)
