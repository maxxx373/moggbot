import sys
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
for a,b in [("const KEY = 'upgrade_v3';","const KEY = 'mogg_demo_v1'; // демо: отдельное хранилище, чтобы не смешивать с настоящим прогрессом"),
 ("tg.isVersionAtLeast('6.9') && tg.CloudStorage ? tg.CloudStorage : null","tg.isVersionAtLeast('6.9') && tg.CloudStorage && false ? tg.CloudStorage : null"),
 ("indexedDB.open('mogg_photos', 1)","indexedDB.open('mogg_demo_photos', 1)"),
 ('<title>mogg</title>','<title>mogg · демо</title>')]:
    assert s.count(a)==1, a; s=s.replace(a,b)
open(p,'w',encoding='utf-8').write(s)
# панель перемотки времени — только в демо, чтобы смотреть, как меняется приложение по дням
s=open(p,encoding='utf-8').read()
panel = '''<div id="demoTime" style="position:fixed;right:4px;top:42%;z-index:80;opacity:.85;display:flex;flex-direction:column;gap:4px;font:700 11px/1 system-ui,sans-serif">
<button data-demo-time="h" style="padding:6px 8px;border-radius:10px;background:#ff2d87;color:#fff;border:0">+5 ч</button>
<button data-demo-time="d" style="padding:6px 8px;border-radius:10px;background:#ff2d87;color:#fff;border:0">+1 день</button></div>
</body>'''
assert s.count('</body>')==1
s=s.replace('</body>', panel)
js = """
// демо: перемотка времени (без inline-обработчиков — строгая CSP)
document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-demo-time]'); if (!b) return; S.dayOffset = (S.dayOffset || 0) + (b.dataset.demoTime === 'h' ? 5 / 24 : 1); save(); render(); toast('Демо: ' + now().toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' · день ' + dayNum(today())); });
"""
i=s.rindex('</script>'); s=s[:i]+js+s[i:]
open(p,'w',encoding='utf-8').write(s)
