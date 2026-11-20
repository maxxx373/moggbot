# Правка 5: выбранные пункты-«чипы» читаются в обеих темах
import sys
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
a=":root:root .jt button.on{background:#17150F!important;color:#FFD43B!important}"
assert s.count(a)==1
s=s.replace(a, a+"""
:root:root .chip.on:not(:is(.card,.sheet) *){background:#17150F!important;color:#FFD43B!important;box-shadow:inset 0 0 0 1.5px #17150F!important}
:root:root[data-theme="dark"] .chip.on:not(:is(.card,.sheet) *){background:#FFD43B!important;color:#17150F!important;box-shadow:inset 0 0 0 1.5px #FFD43B!important}""",1)
open(p,'w',encoding='utf-8').write(s)
