"""few-shot Cosmos judge: show labelled reference pictures (robot 1) first, then judge robots 2.. (same camera)"""
import sys, os, json, base64, urllib.request
D = sys.argv[1]; MODEL = os.environ.get('VLM', 'cosmos-reason2:8b')
R = json.load(open(os.path.join(D, 'results.json')))['shots']
b64 = lambda f: base64.b64encode(open(os.path.join(D, f), 'rb').read()).decode()
refs = [('1_seated.png', 'SEATED: the end is fully down, faces flush, no daylight between them'),
        ('1_near.png', 'NOT SEATED: the end is ~7 mm up, a band of daylight / inner parts visible between the faces'),
        ('1_above.png', 'NOT SEATED: the end is far above the receiver')]
intro = ('You judge whether a robot end connector is fully seated in a floor receiver. The picture has four panels from the same camera. '
         'Panel A = example SEATED (faces flush, no daylight between them). Panel B = example NOT SEATED (end ~7 mm up: a band of daylight / '
         'inner parts between the faces). Panel C = example NOT SEATED (end far above). Panel D = the one to judge. Compare D with A, B and C. '
         'Reply JSON only: {"seated": true or false, "most_like": "A", "B" or "C"}')
from PIL import Image, ImageDraw
import io
def sheet(query):
    tiles = [Image.open(os.path.join(D, f)).convert('RGB').resize((336, 336)) for f, _ in refs] + [Image.open(os.path.join(D, query)).convert('RGB').resize((336, 336))]
    out = Image.new('RGB', (672, 672), 'white'); dr = ImageDraw.Draw(out)
    for k, (t, lab) in enumerate(zip(tiles, 'ABCD')):
        x, y = (k % 2) * 336, (k // 2) * 336; out.paste(t, (x, y)); dr.rectangle([x, y, x + 46, y + 40], fill='black'); dr.text((x + 14, y + 10), lab, fill='white')
    b = io.BytesIO(); out.save(b, format='PNG'); return base64.b64encode(b.getvalue()).decode()
right = fp = n = 0
for s in R:
    if s['img'].startswith('1_'): continue
    body = json.dumps({'model': MODEL, 'stream': False, 'format': 'json', 'options': {'temperature': 0},
                       'messages': [{'role': 'user', 'content': intro, 'images': [sheet(s['img'])]}]}).encode()
    a = json.loads(json.loads(urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:11434/api/chat', data=body, headers={'Content-Type': 'application/json'}), timeout=300).read())['message']['content'])
    ok = bool(a.get('seated')) == s['truth_seated']; right += ok; n += 1; fp += (not s['truth_seated'] and bool(a.get('seated')))
    print(f"  {s['img']:16s} truth {'SEATED' if s['truth_seated'] else 'not   '} (gap {s['gap_mm']:6.2f}) -> {a}", flush=True)
print(f'{MODEL} few-shot: {right}/{n} correct | false "seated" (dangerous): {fp}')
