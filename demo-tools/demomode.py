import sys
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
for a,b in [("const KEY = 'upgrade_v3';","const KEY = 'mogg_demo_v1'; // демо: отдельное хранилище, чтобы не смешивать с настоящим прогрессом"),
 ("tg.isVersionAtLeast('6.9') && tg.CloudStorage ? tg.CloudStorage : null","tg.isVersionAtLeast('6.9') && tg.CloudStorage && false ? tg.CloudStorage : null"),
 ("indexedDB.open('mogg_photos', 1)","indexedDB.open('mogg_demo_photos', 1)"),
 ('<title>mogg</title>','<title>mogg · демо</title>')]:
    assert s.count(a)==1, a; s=s.replace(a,b)
open(p,'w',encoding='utf-8').write(s)
