// Проверка базы статей articles/*.json перед публикацией.
// Запуск: node demo-tools/articles_check.js   → код выхода 1, если есть ошибки.
// Проверяет: формат, уникальность id и заголовков, допустимые теги/картинки/палитры, объём, похожие темы.
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const errors = [], warns = [];

// что разрешено — берём прямо из кода приложения
const imgKeys = new Set([...html.slice(html.indexOf('const IMG = {'), html.indexOf('};', html.indexOf('const IMG = {'))).matchAll(/(\w+): 'photo-/g)].map((m) => m[1]));
const TAGS = ['Мода', 'Тренд', 'Стиль', 'Уход', 'Осанка', 'Волосы', 'Сон', 'Тело', 'Общение', 'Характер', 'Парфюм'];
const ARTS = new Set(Array.from({ length: 13 }, (_, i) => 'a' + (i + 1)));
// встроенные в приложение статьи (их id и заголовки нельзя повторять)
const builtinIds = new Set([...html.matchAll(/\n  \{ id: '([a-z]+\d+)', (?:wk|tag)/g)].map((m) => m[1]));
const builtinTitles = [...html.matchAll(/\n  \{ id: '[a-z]+\d+',[^\n]*? t: '([^']+)'/g)].map((m) => m[1]);

const dir = path.join(ROOT, 'articles');
const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
const files = fs.readdirSync(dir).filter((f) => /^part-\d{3}\.json$/.test(f)).sort();
if (JSON.stringify(files) !== JSON.stringify(index.parts)) errors.push(`index.json.parts не совпадает с файлами: ${JSON.stringify(index.parts)} vs ${JSON.stringify(files)}`);

const all = [];
files.forEach((f, fi) => {
  let arr;
  try { arr = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { errors.push(`${f}: битый JSON — ${e.message}`); return; }
  if (!Array.isArray(arr)) return errors.push(`${f}: должен быть массив`);
  if (arr.length > 100) errors.push(`${f}: больше 100 статей (${arr.length}) — начни новую часть`);
  if (fi < files.length - 1 && arr.length !== 100) errors.push(`${f}: не последняя часть должна быть заполнена ровно на 100 (сейчас ${arr.length})`);
  arr.forEach((a, i) => all.push({ ...a, _where: `${f}#${i}` }));
});
if (index.count !== all.length) errors.push(`index.json.count = ${index.count}, а статей ${all.length}`);

const norm = (t) => t.toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set('и в во на с со как что это не для по от до за из к ко о об а но или у же ли бы ты твой твоя тебе себя свой без при так все всё чтобы почему когда где'.split(' '));
const keyw = (t) => new Set(norm(t).split(' ').filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.slice(0, 5)));
const seenIds = new Set(builtinIds), seenTitles = new Map(builtinTitles.map((t) => [norm(t), 'встроенная']));
const words = (b) => b.reduce((n, x) => n + String(typeof x === 'string' ? x : x.q || x.h || '').split(/\s+/).filter(Boolean).length, 0);

all.forEach((a) => {
  const w = a._where, e = (m) => errors.push(`${w} (${a.id || '?'}): ${m}`);
  if (!/^[a-z]+\d+$/.test(a.id || '')) e('id должен быть вида d123');
  else if (seenIds.has(a.id)) e('повторяется id'); else seenIds.add(a.id);
  if (!TAGS.includes(a.tag)) e(`тег «${a.tag}» не из списка ${TAGS.join(', ')}`);
  if (!imgKeys.has(a.img)) e(`картинка «${a.img}» не из IMG: ${[...imgKeys].join(', ')}`);
  if (!ARTS.has(a.art)) e('art должен быть a1…a13');
  if (typeof a.t !== 'string' || a.t.length < 10 || a.t.length > 90) e('заголовок 10–90 символов');
  else {
    const n = norm(a.t);
    if (seenTitles.has(n)) e(`заголовок повторяет ${seenTitles.get(n)}`); else seenTitles.set(n, a.id);
    const long = Math.max(...a.t.split(/\s+/).map((x) => x.replace(/[^а-яёa-z0-9]/gi, '').length));
    if (long > 14) e(`в заголовке слово из ${long} букв — на обложке не поместится`);
  }
  if (!Array.isArray(a.body) || !a.body.length) return e('нет body');
  a.body.forEach((x, i) => {
    if (typeof x === 'string') { if (!x.trim()) e(`body[${i}] пустой`); }
    else if (!x || (typeof x.h !== 'string' && typeof x.q !== 'string') || Object.keys(x).length !== 1) e(`body[${i}] должен быть строкой, {h} или {q}`);
    const txt = typeof x === 'string' ? x : (x && (x.h || x.q)) || '';
    if (/[<>]/.test(txt)) e(`body[${i}] содержит < или > (HTML нельзя)`);
    if (/undefined|NaN|\[object/.test(txt)) e(`body[${i}] мусор в тексте`);
  });
  if (typeof a.body[0] !== 'string') e('статья должна начинаться с абзаца, не с заголовка');
  if (!a.body.some((x) => x && x.h)) e('нужен хотя бы один подзаголовок {h}');
  const n = words(a.body);
  if (n < 150) e(`слишком короткая: ${n} слов (нужно 180–700)`); else if (n < 180) warns.push(`${w} (${a.id}): коротковато — ${n} слов`);
  if (n > 900) e(`слишком длинная: ${n} слов`);
  const extra = Object.keys(a).filter((k) => !['id', 'tag', 'img', 'art', 't', 'body', 'em', '_where'].includes(k));
  if (extra.length) e(`лишние поля: ${extra.join(', ')}`);
});

// похожие темы: заметное пересечение ключевых слов в заголовках
const list = [...builtinTitles.map((t) => ({ id: 'встроенная', t })), ...all.map((a) => ({ id: a.id, t: a.t || '' }))].map((x) => ({ ...x, k: keyw(x.t) }));
for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
  const A = list[i].k, B = list[j].k; if (A.size < 2 || B.size < 2) continue;
  const inter = [...A].filter((x) => B.has(x)).length, jac = inter / (A.size + B.size - inter);
  if (jac >= 0.5) warns.push(`похожие темы: «${list[i].t}» (${list[i].id}) и «${list[j].t}» (${list[j].id})`);
}

// сводка по темам в последних 100 статьях — для баланса
const tail = all.slice(-100), by = {};
tail.forEach((a) => { by[a.tag] = (by[a.tag] || 0) + 1; });
console.log(`Статей в файлах: ${all.length} (частей: ${files.length}). Последние 100 по темам: ${Object.entries(by).map(([k, v]) => k + ' ' + v).join(', ')}`);
warns.forEach((x) => console.log('⚠ ' + x));
errors.forEach((x) => console.log('✗ ' + x));
console.log(errors.length ? `ОШИБОК: ${errors.length}` : 'Ошибок нет');
process.exit(errors.length ? 1 : 0);
