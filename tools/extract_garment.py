# -*- coding: utf-8 -*-
"""从「猫穿衣服」合成图里按颜色分离出衣服图层，用于换装叠层。

思路：合成图里衣服与猫毛色差异明显（粉 / 黄 / 米），用 HSV 取色 + 形态学清理
得到衣服掩膜，裁到可见外框后输出透明 PNG。图层自带穿在猫身上的轮廓，
叠回同姿势立绘时不需要人工对位。
"""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GEN = os.path.join(ROOT, "tools", "_gen")

CASES = {
    "sweater": dict(file="composite-sweater.png", hue=(320, 12), smin=0.34, vmin=0.55, vmax=1.0),
    "hoodie": dict(file="composite-hoodie.png", hue=(38, 68), smin=0.45, vmin=0.55, vmax=1.0),
    "cape": dict(file="composite-cape.png", hue=(18, 46), smin=0.10, vmin=0.52, vmax=0.95),
}


def hsv_mask(rgb, hue, smin, vmin, vmax):
    hsv = np.array(Image.fromarray(rgb).convert("HSV")).astype(np.float32)
    h = hsv[:, :, 0] / 255.0 * 360.0
    s = hsv[:, :, 1] / 255.0
    v = hsv[:, :, 2] / 255.0
    lo, hi = hue
    hm = ((h >= lo) & (h <= hi)) if lo <= hi else ((h >= lo) | (h <= hi))
    return hm & (s >= smin) & (v >= vmin) & (v <= vmax)


def clean(mask, times=2):
    im = Image.fromarray((mask * 255).astype(np.uint8))
    for _ in range(times):
        im = im.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    return np.array(im) > 127


def largest_component(mask):
    h, w = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    best = None
    for y0 in range(0, h, 8):
        for x0 in range(0, w, 8):
            if not mask[y0, x0] or visited[y0, x0]:
                continue
            stack = [(y0, x0)]
            visited[y0, x0] = True
            cells = 0
            while stack:
                y, x = stack.pop()
                cells += 1
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        stack.append((ny, nx))
            if best is None or cells > best[0]:
                best = (cells, visited.copy())
    if best is None:
        return mask
    return mask & best[1]


def extract(cfg):
    im = Image.open(os.path.join(GEN, cfg["file"])).convert("RGB")
    rgb = np.array(im)
    m = hsv_mask(rgb, cfg["hue"], cfg["smin"], cfg["vmin"], cfg["vmax"])
    m = clean(m)
    m = largest_component(m)
    soft = np.array(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.0))).astype(np.float32) / 255.0
    ys, xs = np.where(soft > 0.5)
    bbox = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    rgba = np.dstack([rgb, (soft * 255).astype(np.uint8)])
    return Image.fromarray(rgba, "RGBA").crop(bbox)


def main():
    cat = Image.open(os.path.join(ROOT, "assets", "pets", "pet001", "avatar.png")).convert("RGBA")
    tiles = []
    for name, cfg in CASES.items():
        layer = extract(cfg)
        layer.save(os.path.join(GEN, "layer-%s.png" % name))
        comp = Image.open(os.path.join(GEN, cfg["file"])).convert("RGBA").resize(cat.size, Image.LANCZOS)
        t = Image.new("RGBA", (cat.width * 2, cat.height + 26), (251, 243, 228, 255))
        t.alpha_composite(comp, (0, 26))
        lay = layer.resize((max(1, round(layer.width * cat.width / Image.open(os.path.join(GEN, cfg["file"])).width)),
                            max(1, round(layer.height * cat.height / Image.open(os.path.join(GEN, cfg["file"])).height))), Image.LANCZOS)
        t.alpha_composite(cat, (cat.width, 26))
        ImageDraw.Draw(t).text((8, 8), "%s  layer=%s" % (name, layer.size), fill=(59, 50, 38, 255))
        tiles.append(t)
        print(name, "layer", layer.size)

    sheet = Image.new("RGBA", (cat.width * 2, (cat.height + 26) * len(tiles)), (255, 255, 255, 255))
    for i, t in enumerate(tiles):
        sheet.alpha_composite(t, (0, i * (cat.height + 26)))
    sheet.convert("RGB").save(os.path.join(ROOT, "tools", "_extract_check.png"))
    # 单独导出图层预览，便于目视检查边缘
    lp = Image.new("RGBA", (cat.width * 2, (cat.height + 26) * len(tiles)), (255, 255, 255, 255))
    for i, name in enumerate(CASES):
        lay = Image.open(os.path.join(GEN, "layer-%s.png" % name)).convert("RGBA")
        lay.thumbnail((cat.width, cat.height), Image.LANCZOS)
        lp.alpha_composite(lay, (4, i * (cat.height + 26) + 26))
    lp.convert("RGB").save(os.path.join(ROOT, "tools", "_extract_layers.png"))
    print("saved _extract_check.png / _extract_layers.png")


if __name__ == "__main__":
    main()
