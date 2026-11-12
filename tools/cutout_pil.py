import os
import glob
from collections import deque
from PIL import Image, ImageFilter, ImageChops

PET = r"D:\momolab\assets\pets\pet001"
DECO = r"D:\momolab\assets\deco"
VIBE = r"D:\momolab\vibe_images"

# 第八节抠图基准（avatar.png 缺失，写死常量）
TARGET_H = 472
FEET_Y = 484
CENTER_X = (85 + 429) // 2  # 257
CANVAS = 512

CAT = ["avatar", "deadpan", "happy", "innocent", "skeptical", "angry",
       "mischief", "sleep", "eat-wait", "eat-bite", "eat-chew", "eat-swallow",
       "eat-drink", "eat-carry", "eat-lick", "eat-meow", "act-jump", "act-land", "act-bump"]
DECO_JOBS = [("deco-glasses", "glasses"), ("deco-flowercrown", "flowercrown"),
             ("deco-cape", "cape")]


def newest(key):
    hits = glob.glob(os.path.join(VIBE, key + "_*.png"))
    if not hits:
        return None
    return max(hits, key=os.path.getmtime)


def key_out(path):
    src = Image.open(path).convert("RGBA")
    src_a = src.getchannel("A")
    im = src.convert("RGB")
    w, h = im.size
    px = im.load()
    grid = bytearray(w * h)
    for y in range(h):
        row = y * w
        for x in range(w):
            r, g, b = px[x, y]
            mx = max(r, g, b)
            mn = min(r, g, b)
            if mx >= 240 or (mx - mn <= 22 and (r + g + b) / 3 >= 178):
                grid[row + x] = 1
    bg = bytearray(w * h)
    dq = deque()
    for x in range(w):
        for y in (0, h - 1):
            i = y * w + x
            if grid[i] and not bg[i]:
                bg[i] = 1
                dq.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            i = y * w + x
            if grid[i] and not bg[i]:
                bg[i] = 1
                dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w:
                i = ny * w + nx
                if grid[i] and not bg[i]:
                    bg[i] = 1
                    dq.append((ny, nx))
    alpha = Image.new("L", (w, h), 255)
    ap = alpha.load()
    for y in range(h):
        row = y * w
        for x in range(w):
            if bg[row + x]:
                ap[x, y] = 0
    alpha = ImageChops.multiply(alpha, src_a)
    alpha = alpha.filter(ImageFilter.GaussianBlur(1.6))
    ap = alpha.load()
    for y in range(h):
        for x in range(w):
            if ap[x, y] < 12:
                ap[x, y] = 0
    out = im.convert("RGBA")
    out.putalpha(alpha)
    return out


def bbox(im, thr=24):
    mask = im.getchannel("A").point(lambda v: 255 if v > thr else 0)
    return mask.getbbox()


def run_cat(key):
    p = newest(key)
    if not p:
        print("MISSING", key)
        return
    cut = key_out(p)
    b = bbox(cut)
    if b is None:
        print("EMPTY", key)
        return
    cw, ch = b[2] - b[0], b[3] - b[1]
    cut = cut.crop(b)
    s = min(TARGET_H / ch, CANVAS / cw)
    nw, nh = int(round(cw * s)), int(round(ch * s))
    cut = cut.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.paste(cut, (CENTER_X - nw // 2, FEET_Y - nh), cut)
    canvas.save(os.path.join(PET, key + ".png"))
    print(key, "crop", cw, ch, "->", nw, nh)


def run_deco(src, out):
    p = newest(src)
    if not p:
        print("MISSING", src)
        return
    cut = key_out(p)
    b = bbox(cut)
    if b is None:
        print("EMPTY", src)
        return
    cut = cut.crop(b)
    cut.save(os.path.join(DECO, out + ".png"))
    print(out, "trimmed", cut.size)


def main():
    for key in CAT:
        run_cat(key)
    for src, out in DECO_JOBS:
        run_deco(src, out)
    print("done")


if __name__ == "__main__":
    main()