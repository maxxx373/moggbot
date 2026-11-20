# Правка 7 (поверх p6): статьи из файлов articles/*.json, подгрузка по частям, лента с «Показать ещё»
import sys, re
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:80],s.count(a)); s=s.replace(a,b)
# 1. убрать вшитые короткие статьи — теперь они в articles/part-001.json
a=s.index("// Короткие статьи на каждый день (выходят по расписанию, см. ART_ORDER)\nconst ARTICLES_DAILY = [\n")
b=s.index("ARTICLES.push(...ARTICLES_DAILY);")+len("ARTICLES.push(...ARTICLES_DAILY);")
s=s[:a]+"// Остальные статьи (короткие, на каждый день) лежат в articles/part-*.json и подгружаются с сайта — см. artsFetch()"+s[b:]
rep("ARTICLES_DAILY.forEach((a) => { if (!COVER_IMG[a.id] && IMG[a.img]) COVER_IMG[a.id] = IMG[a.img].replace('photo-', ''); });\n\n", "artsFetch();\n\n")
# 2. порядок выхода по id: первые — подобранный порядок, дальше — статьи из файлов в порядке добавления
m=re.search(r"const ART_ORDER = \(\(\) => \{ const by = Object\.fromEntries\(ARTICLES\.map\(\(a\) => \[a\.id, a\]\)\); const o = '([^']+)'\.split\(' '\)\.map\(\(id\) => by\[id\]\)\.filter\(Boolean\); return \[\.\.\.o, \.\.\.ARTICLES\.filter\(\(a\) => !o\.includes\(a\)\)\]; \}\)\(\);", s)
assert m
order=m.group(1)
s=s.replace(m.group(0), """const ART_IDS = '""" + order + """'.split(' ');
let ART_BY = {};
const artIndex = () => { ART_BY = Object.fromEntries(ARTICLES.map((a) => [a.id, a])); ARTICLES.forEach((a) => { if (!ART_IDS.includes(a.id)) ART_IDS.push(a.id); }); };
artIndex();
// Подгрузка статей из articles/: части по 100 штук, берём только те, что уже нужны по расписанию (+ запас)
let artParts = null, artLoaded = 0;
function artsAdd(list) {
  let n = 0;
  (list || []).forEach((a) => {
    if (!a || !a.id || !Array.isArray(a.body) || ART_BY[a.id]) return;
    a.min = Math.max(1, Math.round(bodyWords(a.body) / 250));
    if (!COVER_IMG[a.id] && IMG[a.img]) COVER_IMG[a.id] = IMG[a.img].replace('photo-', '');
    ARTICLES.push(a); n++;
  });
  if (n) artIndex();
  return n;
}
async function artsFetch() {
  try {
    if (!artParts) { const r = await fetch('articles/index.json', { cache: 'no-cache' }); artParts = (await r.json()).parts || []; }
    const need = () => (S.startDate ? artReleased(dayNum(today()), 24) : 3) + 30;
    let added = 0;
    while (artLoaded < artParts.length && (artLoaded === 0 || ART_IDS.length < need())) {
      const r = await fetch('articles/' + artParts[artLoaded], { cache: 'no-cache' });
      added += artsAdd(await r.json()); artLoaded++;
    }
    if (added && S.onboarded && !reader && !modal && ['home', 'plan', 'journal'].includes(tab)) render();
  } catch (e) {}
}""")
rep("const artCount = () => Math.min(ART_ORDER.length, artReleased(dayNum(today()), now().getHours()));\nconst artsOpen = () => ART_ORDER.slice(0, artCount());\nconst artFreshFrom = () => { const n = dayNum(today()); return n <= 1 ? 0 : Math.min(ART_ORDER.length, artReleased(n - 1, 24)); };\nconst isNewArt = (a) => { const i = ART_ORDER.indexOf(a); return i >= artFreshFrom() && i < artCount() && !(S.articles || []).includes(a.id); };",
    "const artCount = () => Math.min(ART_IDS.length, artReleased(dayNum(today()), now().getHours()));\nconst artsOpen = () => ART_IDS.slice(0, artCount()).map((id) => ART_BY[id]).filter(Boolean);\nconst artFreshFrom = () => { const n = dayNum(today()); return n <= 1 ? 0 : Math.min(ART_IDS.length, artReleased(n - 1, 24)); };\nconst isNewArt = (a) => { const i = ART_IDS.indexOf(a.id); return i >= artFreshFrom() && i < artCount() && !(S.articles || []).includes(a.id); };")
rep("  if (artCount() >= ART_ORDER.length) return null;", "  if (artCount() >= ART_IDS.length) return null;")
# 3. лента: свежие выше, по 30 штук и «Показать ещё»
rep("(ART_ORDER.indexOf(b) - ART_ORDER.indexOf(a)));", "(ART_IDS.indexOf(b.id) - ART_IDS.indexOf(a.id)));")
rep("  const [f, ...rest] = list, nx = artNext(), fresh = open.filter(isNewArt).length;", "  const [f, ...all] = list, rest = all.slice(0, feedMore), nx = artNext(), fresh = open.filter(isNewArt).length;")
m=re.search(r"(\n    \$\{rest\.map\(\(a\) => `<button class=\"acard\"[^\n]*)", s); assert m
line=m.group(1)
# дописать кнопку «Показать ещё» после списка в конце строки
assert line.endswith("`;")
s=s.replace(line, line[:-2] + "\n    ${all.length > rest.length ? `<button class=\"btn ghost\" data-act=\"feed-more\" style=\"margin-top:6px\">Показать ещё · ${all.length - rest.length}</button>` : ''}`;",1)
rep("function feedView() {", "let feedMore = 30;\nfunction feedView() {")
rep("ACT.story = () => shareStreak();", "ACT.story = () => shareStreak();\nACT['feed-more'] = () => { feedMore += 30; haptic('light'); render(); };")
rep('// Порядок выхода статей задаёт ART_ORDER (3 в день), wk больше не используется.', '// Порядок выхода статей задаёт ART_IDS (3 в день), wk больше не используется.')
open(p,'w',encoding='utf-8').write(s)
