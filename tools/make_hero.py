"""主角定妆照：下载 → 泛洪抠白 → 按 avatar 的脚底/中心/高度对齐到 512。"""
from PIL import Image, ImageFilter
from collections import deque
import numpy as np, urllib.request, io

URL = "https://aka.doubaocdn.com/s/cMBUtoHkrH"
AV = "assets/pets/pet001/avatar.png"
OUT = "assets/pets/pet001/hero.png"


def cutout_white(im):
    im = im.convert("RGB")
    a = np.asarray(im).astype(np.int16)
    W, H = im.size
    near_white = a.min(axis=2) >= 212
    bg = np.zeros((H, W), bool)
    dq = deque()
    for x in range(W):
        for y in (0, H - 1):
            if near_white[y, x] and not bg[y, x]:
                bg[y, x] = True; dq.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if near_white[y, x] and not bg[y, x]:
                bg[y, x] = True; dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and near_white[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True; dq.append((ny, nx))
    alpha = np.asarray(Image.fromarray(np.where(bg, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.1)))
    out = im.convert("RGBA")
    px = np.asarray(out).copy()
    px[:, :, 3] = alpha
    return Image.fromarray(px)


def bbox(im):
    return im.getchannel("A").point(lambda v: 255 if v > 18 else 0).getbbox()


ab = (66, 13, 448, 484)   # 立绘在 512 画布上的 alpha bbox（avatar.png 已不在仓库，用固定坐标）
av_size = (512, 512)

im = cutout_white(Image.open(io.BytesIO(urllib.request.urlopen(URL).read())))
b = bbox(im)
s = (ab[3] - ab[1]) / (b[3] - b[1])
im2 = im.crop(b).resize((int((b[2] - b[0]) * s), int((b[3] - b[1]) * s)), Image.LANCZOS)
canvas = Image.new("RGBA", av_size, (0, 0, 0, 0))
canvas.paste(im2, (int((ab[0] + ab[2]) / 2 - im2.width / 2), ab[3] - im2.height), im2)
canvas.save(OUT)
print("saved", OUT, canvas.size, "transparent", round(float(np.mean(np.asarray(canvas)[:, :, 3] < 10)), 3))
