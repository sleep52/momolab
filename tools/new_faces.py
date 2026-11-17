"""把新生成的表情图对齐到 512 立绘坐标 + 用“从四边泛洪”的方式抠白底。
泛洪只吃掉和画面边缘连通的白，猫身内部的浅色毛不会被啃出半透明。"""
from PIL import Image, ImageFilter
from collections import deque
import numpy as np, urllib.request, io, os

AV = "assets/pets/pet001/avatar.png"
URLS = {
    "charm": "https://aka.doubaocdn.com/s/5kiUwt18HR",
    "tilt": "https://aka.doubaocdn.com/s/hAnngaTexy",
    "pout": "https://aka.doubaocdn.com/s/rt03m90MKC",
    "wink": "https://aka.doubaocdn.com/s/Ybp2rDdUFk",
    "daze": "https://aka.doubaocdn.com/s/3f3NbKpLdM",
}
OUT = "assets/pets/pet001/_newfaces"
os.makedirs(OUT, exist_ok=True)


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

    alpha = np.where(bg, 0, 255).astype(np.uint8)
    alpha = np.asarray(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(1.1)))
    out = im.convert("RGBA")
    px = np.asarray(out).copy()
    px[:, :, 3] = alpha
    return Image.fromarray(px)


def bbox(im):
    return im.getchannel("A").point(lambda v: 255 if v > 18 else 0).getbbox()


av = Image.open(AV).convert("RGBA")
ab = bbox(av)
print("avatar bbox", ab)

for k, u in URLS.items():
    raw = urllib.request.urlopen(u).read()
    im = cutout_white(Image.open(io.BytesIO(raw)))
    b = bbox(im)
    s = (ab[3] - ab[1]) / (b[3] - b[1])
    im2 = im.crop(b).resize((max(1, int((b[2] - b[0]) * s)), max(1, int((b[3] - b[1]) * s))), Image.LANCZOS)
    canvas = Image.new("RGBA", av.size, (0, 0, 0, 0))
    canvas.paste(im2, (int((ab[0] + ab[2]) / 2 - im2.width / 2), ab[3] - im2.height), im2)
    canvas.save(f"{OUT}/{k}.png")
    print(k, "transparent ratio", round(float(np.mean(np.asarray(canvas)[:, :, 3] < 10)), 3))

sheet = Image.new("RGBA", (512 * 5, 512), (255, 250, 242, 255))
sheet.paste(av, (0, 0), av)
for i, k in enumerate(URLS, 1):
    f = Image.open(f"{OUT}/{k}.png")
    sheet.paste(f, (512 * i, 0), f)
sheet.save(f"{OUT}/_compare.png")
print("done")
