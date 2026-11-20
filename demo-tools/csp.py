# Строгая CSP: разрешаем только НАШ встроенный скрипт — по его отпечатку sha256.
# ВАЖНО: запускать после ЛЮБОЙ правки скрипта в index.html, иначе приложение не запустится:
#   python3 demo-tools/csp.py index.html
import sys, re, hashlib, base64
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
scripts=re.findall(r'<script>(.*?)</script>', s, re.S)
assert len(scripts)==1, f'ожидался один встроенный скрипт, найдено {len(scripts)}'
h="'sha256-"+base64.b64encode(hashlib.sha256(scripts[0].encode('utf-8')).digest()).decode()+"'"
m=re.search(r"script-src 'self' ('unsafe-inline'|'sha256-[A-Za-z0-9+/=]+') ", s)
assert m, 'не нашёл script-src в CSP'
s=s.replace(m.group(0), f"script-src 'self' {h} ", 1)
open(p,'w',encoding='utf-8').write(s)
print('CSP:', h)
