"""生成的围巾本身已是透明 PNG：这里只缩放到 1024 并量出“环孔”位置，供落点计算。"""

import io
import urllib.request
from collections import deque

import numpy as np
from PIL import Image

URL = "https://aka.doubaocdn.com/s/8fP4e6ebQj"
OUT = r"D:\momolab\assets\deco\scarf_worn.png"

raw = urllib.request.urlopen(URL, timeout=30).read()
im = Image.open(io.BytesIO(raw)).convert("RGBA")
print("src", im.size)
im = im.resize((1024, 1024), Image.LANCZOS)
im.save(OUT, optimize=True)

a = np.array(im.getchannel("A"))
rows = np.nonzero((a > 16).sum(axis=1))[0]
cols = np.nonzero((a > 16).sum(axis=0))[0]
print("bbox", cols.min(), rows.min(), cols.max(), rows.max())

# 环孔：不接触边缘的透明连通区
ds = 4
w, h = im.size
small = np.array(im.getchannel("A").resize((w // ds, h // ds), Image.NEAREST)) <= 8
sh, sw = small.shape
outside = np.zeros_like(small)
q = deque()
for x in range(sw):
    for y in (0, sh - 1):
        if small[y, x] and not outside[y, x]:
            outside[y, x] = True
            q.append((y, x))
for y in range(sh):
    for x in (0, sw - 1):
        if small[y, x] and not outside[y, x]:
            outside[y, x] = True
            q.append((y, x))
while q:
    y, x = q.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < sh and 0 <= nx < sw and small[ny, nx] and not outside[ny, nx]:
            outside[ny, nx] = True
            q.append((ny, nx))
hole = small & ~outside
ys, xs = np.nonzero(hole)
if len(ys):
    x0, x1, y0, y1 = xs.min() * ds, xs.max() * ds, ys.min() * ds, ys.max() * ds
    hw, hh = x1 - x0, y1 - y0
    cxf = (x0 + x1) / 2 / w
    cyf = (y0 + y1) / 2 / h
    print(f"hole x={x0}..{x1} y={y0}..{y1} wf={hw/w:.3f} hf={hh/h:.3f} cxf={cxf:.3f} cyf={cyf:.3f}")
else:
    print("no hole")
