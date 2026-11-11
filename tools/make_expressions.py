import os, io, json, sys
import urllib.request
import numpy as np
from collections import deque
from PIL import Image, ImageFilter

PET = r"D:\momolab\assets\pets\pet001"
RAW = os.path.join(PET, "_raw")
os.makedirs(RAW, exist_ok=True)

SRC = {
    "laugh": "https://aka.doubaocdn.com/s/lgFzQUuNMS",
    "lick": "https://aka.doubaocdn.com/s/DZLjtV8ERh",
    "curious": "https://aka.doubaocdn.com/s/oDqaEG8QCz",
    "shy": "https://aka.doubaocdn.com/s/qFTRQjhSLT",
    "surprise": "https://aka.doubaocdn.com/s/wd9vR9Nr1W",
    "scared": "https://aka.doubaocdn.com/s/jsftbqKVhG",
    "focus": "https://aka.doubaocdn.com/s/2g91UPhWYI",
    "yawn": "https://aka.doubaocdn.com/s/VrxD8mapFn",
}

def fetch(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 10000:
        return
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r, open(path, "wb") as f:
        f.write(r.read())

def key_out(path):
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(np.int16)
    h, w, _ = a.shape
    mx = a.max(axis=2); mn = a.min(axis=2)
    sat = mx - mn
    lum = a.mean(axis=2)
    # 背景判定：接近白、或浅灰阴影（低饱和 + 高亮）
    bgish = ((mx >= 240) | ((sat <= 22) & (lum >= 178)))
    bg = np.zeros((h, w), bool)
    dq = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bgish[y, x] and not bg[y, x]:
                bg[y, x] = True; dq.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if bgish[y, x] and not bg[y, x]:
                bg[y, x] = True; dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and bgish[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True; dq.append((ny, nx))

    alpha = np.where(bg, 0, 255).astype(np.uint8)
    m = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(1.6))
    alpha = np.asarray(m).astype(np.uint8)
    # 收缩半透明污渍：极低 alpha 直接清 0
    alpha[alpha < 12] = 0
    out = np.dstack([np.asarray(im), alpha])
    return Image.fromarray(out, "RGBA")

def bbox(im, thr=24):
    a = np.asarray(im)[:, :, 3]
    ys, xs = np.where(a > thr)
    if len(xs) == 0:
        return None
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

base = Image.open(os.path.join(PET, "avatar.png")).convert("RGBA")
bb = bbox(base)
base_w, base_h = bb[2] - bb[0], bb[3] - bb[1]
print("avatar bbox", bb, base_w, base_h)

for name, url in SRC.items():
    p = os.path.join(RAW, name + ".png")
    fetch(url, p)
    cut = key_out(p)
    b = bbox(cut)
    if b is None:
        print("EMPTY", name); continue
    cw, ch = b[2] - b[0], b[3] - b[1]
    cut = cut.crop(b)
    s = base_h / ch
    nw, nh = int(round(cw * s)), base_h
    cut = cut.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    cx = (bb[0] + bb[2]) // 2 - nw // 2
    canvas.paste(cut, (cx, bb[3] - nh), cut)
    out = os.path.join(PET, name + ".png")
    canvas.save(out)
    arr = np.asarray(canvas)
    print(name, "crop", cw, ch, "->", nw, nh, "corner alpha", int(arr[0,0,3]))
print("done")

