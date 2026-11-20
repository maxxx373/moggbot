# Правка 10: обложки статей и уроков — подборка фото (Pexels, свободная лицензия), хранятся на нашем сайте в img/a/
import sys
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:80],s.count(a)); s=s.replace(a,b)
rep("""  const ph = COVER_IMG[it.id];
  return `<div class="cov ${ph ? 'has-img' : ''}" style="--k1:${k[0]};--k2:${k[1]};--k3:${k[2]};--k0:${k[3]}"><span class="cov-em">${em}</span>${ph ? `<i class="cov-img" style="background-image:url(https://images.unsplash.com/photo-${ph}?w=700&q=70&auto=format&fit=crop)"></i>` : ''}</div>`;""",
"""  const ph = coverSrc(it, courseKey) || (COVER_IMG[it.id] ? `https://images.unsplash.com/photo-${COVER_IMG[it.id]}?w=700&q=70&auto=format&fit=crop` : '');
  return `<div class="cov ${ph ? 'has-img' : ''}" style="--k1:${k[0]};--k2:${k[1]};--k3:${k[2]};--k0:${k[3]}"><span class="cov-em">${em}</span>${ph ? `<i class="cov-img" style="background-image:url(${ph})"></i>` : ''}</div>`;""")
rep("function cover(it, courseKey) {", """// Фото обложек по темам (Pexels, свободная лицензия; лежат на нашем сайте в img/a/<id>.webp).
// k-я статья темы получает k-е фото подборки — соседние статьи одной темы не повторяются.
const COVER_POOL = { 'Парфюм': [11216321, 11711810, 16239693, 30455878, 36779953, 11711813, 15260901, 36955843, 6830808, 30990130], 'Уход': [34939703, 5891061, 34939704, 7433337, 31552021, 34939732, 7433336, 32565191, 39281980, 8160468], 'Волосы': [12706272, 10775086, 3998397, 7781848, 3998414, 4625648, 1813346], 'Тело': [16854033, 19203052, 18060151, 24260728, 896058, 18112395, 4803916, 33777744, 13211582], 'Осанка': [15353310, 24260728, 16637480, 18060151, 10543590], 'Сон': [17888969, 2563388, 9615241, 10061449, 9615237], 'Стиль': [15353310, 34150928, 14474087, 10497369, 16637480, 28719728, 15988334, 3766113, 8505241, 10658185, 29714913, 34479698], 'Мода': [35587808, 16871551, 14474087, 15988334, 29714913], 'Тренд': [15988334, 29714913, 7176970, 10543590, 14474087], 'Общение': [8445635, 5225313, 8937480, 5054673, 1036804], 'Характер': [8429812, 3978268, 9051413, 36160536, 8230214, 8429846, 1402906] };
const COURSE_TAG = { basics: 'Стиль', mind: 'Характер', social: 'Общение' };
function coverSrc(it, courseKey) {
  const ck = courseKey || (typeof courseOf === 'function' && !it.tag ? Object.keys(COURSES).find((key) => COURSES[key] === courseOf(it)) : '');
  const tag = it.tag || COURSE_TAG[ck], pool = COVER_POOL[tag];
  if (!pool) return '';
  let k = -1;
  if (it.tag) k = ART_IDS.filter((id) => ART_BY[id] && ART_BY[id].tag === it.tag).indexOf(it.id);
  else if (ck && COURSES[ck]) k = COURSES[ck].lessons.indexOf(it) + 3;
  if (k < 0) { let h = 0; for (const ch of String(it.id || it.t || '')) h = (h * 31 + ch.charCodeAt(0)) % 997; k = h; }
  return `img/a/${pool[k % pool.length]}.webp`;
}
function cover(it, courseKey) {""")
open(p,'w',encoding='utf-8').write(s)
