"""把「AI 已经画在猫身上」的装饰切出来，贴回原始立绘。

思路：商品图直接贴上去永远像贴纸，因为商品图没有跟着身体弯、没有压住毛的阴影。
改成让模型在原始立绘上真的把衣服画一遍，再把新增的那块像素切出来，
这样衣服自带贴合弧度、接触阴影和被遮挡处的毛，位置也天然和原图一致。
"""

import numpy as np
from PIL import Image

BASE = Image.open(r"D:\momolab\assets\pets\pet001\avatar.png").convert("RGBA")


def white_to_alpha(im: Image.Image) -> Image.Image:
    arr = np.array(im.convert("RGBA")).astype(np.float32)
    if arr[:, :, 3].min() < 200:          # 已经带透明通道，直接用
        return im.convert("RGBA")
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    mn = np.minimum(np.minimum(r, g), b)
    sat = np.maximum(np.maximum(r, g), b) - mn
    bg = (mn > 236) & (sat < 22)
    a = np.where(bg, 0, 255).astype(np.uint8)
    arr[:, :, 3] = a
    return Image.fromarray(arr.astype(np.uint8))


def clip_region(im: Image.Image, box) -> Image.Image:
    """只保留 box 内的内容（归一化坐标 0~1）。"""
    w, h = im.size
    arr = np.array(im).copy()
    x0, y0, x1, y1 = [int(v * (w if i % 2 == 0 else h)) for i, v in enumerate(box)]
    keep = np.zeros(arr.shape[:2], dtype=bool)
    keep[y0:y1, x0:x1] = True
    arr[:, :, 3] = np.where(keep, arr[:, :, 3], 0)
    return Image.fromarray(arr)


def build(gen_path: str, region, out_path: str) -> None:
    gen = white_to_alpha(Image.open(gen_path).convert("RGBA")).resize(BASE.size, Image.LANCZOS)
    piece = clip_region(gen, region)
    piece.save(out_path)

    # 预览：把这块直接叠回原立绘，看看是不是“长在身上”
    comp = BASE.copy()
    comp.alpha_composite(piece)
    comp.save(out_path.replace(".png", "_check.png"))
    print(out_path)


if __name__ == "__main__":
    # 贝雷帽：头顶那一块
    build(r"D:\momolab\assets\deco\worn\_gen_beret.png", (0.16, 0.0, 0.86, 0.40),
          r"D:\momolab\assets\deco\worn\beret_worn.png")
    # 围巾：脖子到胸
    build(r"D:\momolab\assets\deco\worn\_gen_scarf.png", (0.14, 0.30, 0.86, 0.72),
          r"D:\momolab\assets\deco\worn\scarf_worn2.png")
