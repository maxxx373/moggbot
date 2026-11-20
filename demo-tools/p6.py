# Правка 6: статьи выходят 3 раза в день (8:00, 13:00, 19:00) + 30 новых статей
import sys, os, re
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:80],s.count(a)); s=s.replace(a,b)
daily=open(os.path.join(os.path.dirname(__file__),'articles_daily.js'),encoding='utf-8').read()
ORDER=('x1 x3 d6  x2 d4 d3  f5 x5 d5  x4 d17 d12  x7 d1 d19  f4 d8 d15  x6 d2 d20  pf2 x8 d11  x12 d10 d24  '
       'f3 d7 d18  x9 d13 d28  pf4 d14 d23  x11 d9 d30  f1 d21 d25  x10 d16 d29  pf1 d22 d27  f2 pf3 d26  pf5').split()
ids=set(re.findall(r"\n  \{ id: '([a-z]+[0-9]+)'", s[s.index('const ARTICLES = ['):s.index('const ARTICLE_EXTRA2')])) | set(re.findall(r"id: '(d[0-9]+)'", daily))
assert set(ORDER)==ids and len(ORDER)==len(set(ORDER)), (set(ORDER)^ids)
# 1. новые статьи
rep("ARTICLES.push(...ARTICLES_PERFUME);", "ARTICLES.push(...ARTICLES_PERFUME);\n// Короткие статьи на каждый день (выходят по расписанию, см. ART_ORDER)\nconst ARTICLES_DAILY = [\n" + daily + "];\nARTICLES.push(...ARTICLES_DAILY);")
rep("'Общение': '#ff8a3d', 'Парфю", "'Общение': '#ff8a3d', 'Характер': '#8b5cff', 'Парфю")
rep("'Общение': '💬', 'Парфюм': '🧪' };", "'Общение': '💬', 'Характер': '🧠', 'Парфюм': '🧪' };")
# 2. расписание
rep("const artsOpen = () => ARTICLES.filter((a) => (a.wk || 0) <= weekNo());\nconst isNewArt = (a) => a.wk != null && a.wk === weekNo() && !(S.articles || []).includes(a.id);",
"""// Статьи выходят по расписанию: в первый день — 3 сразу, дальше по одной в 8:00, 13:00 и 19:00.
// Порядок подобран так, чтобы темы чередовались. Пропустил дни — статьи копятся и ждут.
const ART_SLOTS = [8, 13, 19];
const ART_ORDER = (() => { const by = Object.fromEntries(ARTICLES.map((a) => [a.id, a])); const o = '""" + ' '.join(ORDER) + """'.split(' ').map((id) => by[id]).filter(Boolean); return [...o, ...ARTICLES.filter((a) => !o.includes(a))]; })();
const artReleased = (n, h) => n <= 1 ? 3 : 3 + 3 * (n - 2) + ART_SLOTS.filter((x) => h >= x).length;
const artCount = () => Math.min(ART_ORDER.length, artReleased(dayNum(today()), now().getHours()));
const artsOpen = () => ART_ORDER.slice(0, artCount());
const artFreshFrom = () => { const n = dayNum(today()); return n <= 1 ? 0 : Math.min(ART_ORDER.length, artReleased(n - 1, 24)); };
const isNewArt = (a) => { const i = ART_ORDER.indexOf(a); return i >= artFreshFrom() && i < artCount() && !(S.articles || []).includes(a.id); };
// Когда выйдет следующая статья: «в 13:00» или «завтра в 8:00»; null — всё уже вышло
function artNext() {
  if (artCount() >= ART_ORDER.length) return null;
  const h = now().getHours(), x = ART_SLOTS.find((t) => t > h);
  return dayNum(today()) > 1 && x != null ? `сегодня в ${x}:00` : `завтра в ${ART_SLOTS[0]}:00`;
}""")
# 3. лента
rep("""  // сначала новые этой недели, потом непрочитанные длинные, прочитанные — в конец
  const list = [...open].sort((a, b) => (isNewArt(b) - isNewArt(a)) || (ra.includes(a.id) - ra.includes(b.id)) || ((b.wk || 0) - (a.wk || 0)) || (b.min - a.min));
  const [f, ...rest] = list, next = ARTICLES.filter((a) => (a.wk || 0) === weekNo() + 1).length, left = 7 - ((dayNum(today()) - 1) % 7);""",
"""  // сначала новые, потом непрочитанные (свежие выше), прочитанные — в конец
  const list = [...open].sort((a, b) => (isNewArt(b) - isNewArt(a)) || (ra.includes(a.id) - ra.includes(b.id)) || (ART_ORDER.indexOf(b) - ART_ORDER.indexOf(a)));
  const [f, ...rest] = list, nx = artNext(), fresh = open.filter(isNewArt).length;""")
rep("""<div class="banner"><div style="margin-top:4px">Каждую неделю — новые статьи.${next ? ` Через ${left} ${plural(left, 'день', 'дня', 'дней')} откроется ещё ${next}.` : ''}</div></div>""",
"""<div class="banner"><div style="margin-top:4px">${fresh ? `Сегодня ${fresh} ${plural(fresh, 'новая статья', 'новые статьи', 'новых статей')}. ` : ''}Новые статьи выходят 3 раза в день — в 8:00, 13:00 и 19:00.${nx ? ` Следующая — ${nx}.` : ' Ты открыл все статьи — скоро добавим новые.'}</div></div>""")
# 4. «Почитать»: подпись, когда выйдет следующая
rep("""    ${more.length ? `<div class="strip">""", """    ${artNext() ? `<div class="hint" style="font-size:12.5px;margin:-4px 2px 10px">Новая статья — ${artNext()}</div>` : ''}
    ${more.length ? `<div class="strip">""")
rep("// Так лента обновляется: каждую неделю приходят 2 новые статьи с пометкой «новое».", "// Порядок выхода статей задаёт ART_ORDER (3 в день), wk больше не используется.")
# 5. обложки новых статей — те же фото, что в IMG
rep("// ---------- факт дня ----------", "ARTICLES_DAILY.forEach((a) => { if (!COVER_IMG[a.id] && IMG[a.img]) COVER_IMG[a.id] = IMG[a.img].replace('photo-', ''); });\n\n// ---------- факт дня ----------")
open(p,'w',encoding='utf-8').write(s)
s=open(p,encoding='utf-8').read()
# 6. обложка статьи: если в заголовке длинное слово — шрифт меньше, чтобы слово не рвалось
rep('<div class="disp" style="margin-top:8px">${it.t}</div><div class="st-swipe">',
    '<div class="disp" style="margin-top:8px${((lw) => lw >= 11 ? ";font-size:clamp(20px,6.4vw,32px)" : lw >= 10 ? ";font-size:clamp(22px,7.4vw,36px)" : "")(Math.max(...String(it.t).split(/\\s+/).map((w) => w.replace(/[^а-яёa-z0-9]/gi, "").length)))}">${it.t}</div><div class="st-swipe">')
open(p,'w',encoding='utf-8').write(s)
