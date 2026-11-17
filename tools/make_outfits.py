"""把「AI 已经画在猫身上」的整套衣服做成可换的套装图。

关键：衣服可以整张重画，但脸必须是原来那张立绘的脸，否则换装之后“不是同一只猫”，
而且表情就换不了了。做法是——
1. 生成图按身体轮廓等比缩放到和原始立绘同一个体型；
2. 把生成图里的头用原立绘的头部轮廓遮掉（不让它自己的脸露出来）；
3. 再把原始头部图层的下缘做一段渐变，和身体接上，接缝藏在毛发里；
4. 输出只有身体的套装图，运行时在上面盖带表情的头部图层。
"""

import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(r"D:\momolab")
GEN = ROOT / "assets" / "deco" / "worn"
OUT = ROOT / "assets" / "outfits"
OUT.mkdir(parents=True, exist_ok=True)

BASE = Image.open(ROOT / "assets" / "pets" / "pet001" / "avatar.png").convert("RGBA")
HEAD = Image.open(ROOT / "assets" / "pets" / "pet001" / "layers" / "avatar__head.png").convert("RGBA")
HEADPAD = Image.new("RGBA", BASE.size, (0, 0, 0, 0))
HEADPAD.alpha_composite(HEAD)
HEAD_A = np.array(HEADPAD)[:, :, 3].astype(np.float32) / 255.0

YCUT = 0.42
HEAD_ERODE = 34
HEAD_SCALE = 1.07
HEAD_RAMP = 14

SETS = {
    "academy": "https://aka.doubaocdn.com/s/vo2DqYOsjm",
    "sweater": "https://aka.doubaocdn.com/s/i9flc6llWR",
    "hoodie": "https://aka.doubaocdn.com/s/oGhTXYUZVq",
    "cape": "https://aka.doubaocdn.com/s/hCF5402ezU",
}


def body_bbox(a, ycut=YCUT):
    a2 = a.copy()
    a2[: int(a.shape[0] * ycut), :] = 0
    ys, xs = np.nonzero(a2 > 20)
    return xs.min(), ys.min(), xs.max(), ys.max()


def dilate(mask, n):
    m = mask.copy()
    for _ in range(n):
        m = np.maximum(m, np.maximum(np.roll(m, 1, 0), np.roll(m, -1, 0)))
        m = np.maximum(m, np.maximum(np.roll(m, 1, 1), np.roll(m, -1, 1)))
    return m


def align(gen: Image.Image) -> Image.Image:
    ob = body_bbox(np.array(BASE)[:, :, 3])
    gb = body_bbox(np.array(gen)[:, :, 3])
    s = (((ob[2] - ob[0]) / (gb[2] - gb[0])) + ((ob[3] - ob[1]) / (gb[3] - gb[1]))) / 2
    new = gen.resize((int(gen.width * s), int(gen.height * s)), Image.LANCZOS)
    nb = body_bbox(np.array(new)[:, :, 3])
    ox = int((ob[0] + ob[2]) / 2 - (nb[0] + nb[2]) / 2)
    oy = int(ob[3] - nb[3])
    canvas = Image.new("RGBA", BASE.size, (0, 0, 0, 0))
    canvas.alpha_composite(new, (ox, oy))
    return canvas


def head_mask():
    """只把“头部轮廓里面”的身体挖掉，不要向外溢出，否则会把脖子上的围巾、胸口挖出白洞。"""
    m = HEAD_A.copy()
    for _ in range(8):
        m = np.minimum(m, np.minimum(np.roll(m, 1, 0), np.roll(m, -1, 0)))
        m = np.minimum(m, np.minimum(np.roll(m, 1, 1), np.roll(m, -1, 1)))
    m = np.clip(m, 0, 1) * 255
    mi = Image.fromarray(m.astype("uint8")).filter(ImageFilter.GaussianBlur(16))
    out = np.clip(np.array(mi).astype(np.float32) / 255.0, 0, 1)
    # 头部图层底边以下不动，否则脖子会被挖空、露出白底
    bottom = np.nonzero(HEAD_A.max(axis=1) > 0)[0].max()
    out[bottom + 1:] = 0
    return out


def head_with_ramp():
    ha = np.array(HEADPAD).copy()
    # 头部稍微放大一点点（锚在下巴中点），把重画时偏大的那头毛盖住
    if HEAD_SCALE != 1.0:
        cx = int(np.nonzero(ha[:, :, 3].max(axis=0) > 0)[0].mean())
        bottom0 = np.nonzero(ha[:, :, 3].max(axis=1) > 0)[0].max()
        hw, hh = ha.shape[1], ha.shape[0]
        hs = Image.fromarray(ha).resize((int(hw * HEAD_SCALE), int(hh * HEAD_SCALE)), Image.LANCZOS)
        ha = np.zeros_like(ha)
        canvas = Image.fromarray(ha)
        canvas.alpha_composite(hs, (int(cx - cx * HEAD_SCALE), int(bottom0 - bottom0 * HEAD_SCALE)))
        ha = np.array(canvas)
    bottom = np.nonzero(ha[:, :, 3].max(axis=1) > 0)[0].max()
    for i in range(HEAD_RAMP):
        y = bottom - i
        ha[y, :, 3] = (ha[y, :, 3].astype(np.float32) * (i / HEAD_RAMP)).astype(np.uint8)
    return Image.fromarray(ha)


def cutout_white(im: Image.Image) -> Image.Image:
    """模型给的是纯白底，不是透明底。按“离纯白有多远”算 alpha，浅色毛也不会被挖掉。"""
    a = np.array(im.convert("RGBA"))
    d = 255 - a[:, :, :3].astype(np.int16).min(axis=2)
    alpha = np.clip((d - 7) * 5.0, 0, 255).astype(np.uint8)
    soft = np.array(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(1.4)))
    a[:, :, 3] = np.minimum(a[:, :, 3], soft)
    return Image.fromarray(a)


def build(name: str, url: str) -> None:
    raw = GEN / ("_set_" + name + ".png")
    if not raw.exists():
        urllib.request.urlretrieve(url, raw)
    gen = Image.open(raw).convert("RGBA").resize(BASE.size, Image.LANCZOS)
    gen = cutout_white(gen)
    body = align(gen)
    arr = np.array(body)

    # 帽子类（戴在头顶的东西）会被头部图层盖掉，按颜色把它单独抠成一层，位置用原图原位
    if name == "academy_hat_off":
        rgb = arr[:, :, :3].astype(np.int16)
        dark_blue = (rgb[:, :, 2] > rgb[:, :, 0] + 16) & (rgb.max(axis=2) < 135)
        hat = arr.copy()
        hat[~dark_blue, 3] = 0
        # 稍微补一圈，别让帽檐出现锯齿
        m = dark_blue.astype(np.uint8)
        for _ in range(3):
            m = np.maximum(m, np.maximum(np.roll(m, 1, 0), np.roll(m, -1, 0)))
            m = np.maximum(m, np.maximum(np.roll(m, 1, 1), np.roll(m, -1, 1)))
        hat[~m.astype(bool), 3] = 0
        hat[int(hat.shape[0] * 0.55):, :, 3] = 0
        Image.fromarray(hat).save(OUT / (name + "_hat.png"), optimize=True)

    a = arr[:, :, 3].astype(np.float32) / 255.0
    if HEAD_ERODE:
        a = a * (1 - head_mask())
    arr[:, :, 3] = (a * 255).clip(0, 255).astype(np.uint8)
    body = Image.fromarray(arr)

    out = OUT / (name + ".png")
    body.save(out, optimize=True)

    comp = Image.new("RGBA", BASE.size, (0, 0, 0, 0))
    comp.alpha_composite(body)
    comp.alpha_composite(head_with_ramp())
    if name == "academy_hat_off":
        comp.alpha_composite(Image.open(OUT / (name + "_hat.png")).convert("RGBA"))
    comp.save(OUT / ("_" + name + "_check.png"))
    comp.resize((256, 256), Image.LANCZOS).save(OUT / ("thumb_" + name + ".png"), optimize=True)
    print(out.name, "ok")


if __name__ == "__main__":
    for k, v in SETS.items():
        build(k, v)
