"""P7 helper: convert <button> tags in one .tsx file to the shared <Button> (studio/src/components/ui/button.tsx).

usage: py -3.12 tools/p7_buttons.py FILE.tsx MAP.json   (MAP: {"exact className attribute text": "new attributes", ..., "__plain__": "attrs for buttons with no className", "__optin__": "<tag start to add data-ui to>"})
A className value not in MAP leaves that button untouched. Prints what it did and what it left.
"""
import json, re, sys

path, mapping = sys.argv[1], json.load(open(sys.argv[2], encoding='utf-8'))
s = open(path, encoding='utf-8', newline='').read(); nl = '\r\n' if '\r\n' in s else '\n'; s = s.replace('\r\n', '\n')


def tag_end(i):
    """Index just past the '>' that ends the tag starting at i, skipping {...} and quoted text."""
    depth, q, j = 0, None, i
    while j < len(s):
        c = s[j]
        if q:
            if c == q: q = None
        elif c in '"\'`' and depth >= 0: q = c if depth == 0 or c == '`' else (c if depth > 0 else None)
        elif c == '{': depth += 1
        elif c == '}': depth -= 1
        elif c == '>' and depth == 0: return j + 1
        j += 1
    raise ValueError('unterminated tag at %d' % i)


edits, kinds, left = [], {}, []
for m in re.finditer(r'<button\b', s):
    end = tag_end(m.start())
    tag = s[m.start():end]
    cm = re.search(r'className=("[^"]*"|\{(?:[^{}]|\{[^{}]*\})*\})', tag)
    key = cm.group(1) if cm else None
    if key is None and '__plain__' in mapping: new = mapping['__plain__']
    elif key in mapping: new = mapping[key]
    else:
        left.append((key or '(none)')[:70]); continue
    body = tag[len('<button'):]
    if cm: body = body.replace(' className=' + key, '', 1).replace('\n' + re.match(r'\s*', body).group(0) + 'className=' + key, '', 1) if (' className=' + key) in body else body.replace('className=' + key, '', 1)
    edits.append((m.start(), end, '<Button ' + new + body))
    kinds[key or '(plain)'] = kinds.get(key or '(plain)', 0) + 1

# apply, then retarget the matching closing tags
out, last, starts = [], 0, set()
for a, b, t in edits:
    out.append(s[last:a]); starts.add(len(''.join(out))); out.append(t); last = b
s = ''.join(out) + s[last:]
stack, res, last = [], [], 0
for m in re.finditer(r'<Button\b|<button\b|</button>', s):
    if m.group(0) == '</button>':
        k = stack.pop() if stack else 'button'
        res.append(s[last:m.start()]); res.append('</Button>' if k == 'B' else '</button>'); last = m.end()
    else:
        # a self-closing tag never gets a closing tag
        if s[m.start():tag_end(m.start())].endswith('/>'): continue
        stack.append('B' if m.group(0) == '<Button' else 'b')
s = ''.join(res) + s[last:]
if edits and "from '@/components/ui/button'" not in s:
    mm = re.search(r"^import .*\n", s, re.M); s = s[:mm.start()] + "import { Button } from '@/components/ui/button';\n" + s[mm.start():]
opt = mapping.get('__optin__')
if opt:
    assert opt in s, 'opt-in tag not found: ' + opt
    if opt + ' data-ui="a"' not in s: s = s.replace(opt, opt + ' data-ui="a"', 1)
open(path, 'w', encoding='utf-8', newline='').write(s.replace('\n', nl))
print('converted', kinds)
print('left as they were', sorted(set(left)))
