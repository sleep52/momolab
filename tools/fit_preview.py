# -*- coding: utf-8 -*-
"""离线校核：把装饰图层按 fit 参数合成到小猫立绘上，输出对照图。
用法：python tools/fit_preview.py [--out 输出png]
fit 定义（相对小猫画布的百分比）：
  x,y  装饰可见外框中心点
  w    装饰可见外框宽度（占小猫画布宽度的比例，0-1）
  rot  旋转角度（度）
  clip True 时按小猫轮廓裁切（衣服只出现在身体上）
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT = os.path.join(ROOT, "assets", "pets", "pet001", "avatar.png")
SIZE = 512


def trim_alpha(im):
    bbox = im.getchannel("A").getbbox()
    return im.crop(bbox) if bbox else im


def paste_deco(base, deco_img, fit, scale=1.0):
    """返回合成后的小猫图（RGBA, SIZE×SIZE）。"""
    cloth = trim_alpha(deco_img.convert("RGBA"))
    cw = SIZE * fit["w"] * scale
    ch = cw * cloth.height / cloth.width
    cloth = cloth.resize((max(1, int(round(cw))), max(1, int(round(ch)))), Image.LANCZOS)
    if fit.get("rot"):
        cloth = cloth.rotate(-fit["rot"], resample=Image.BICUBIC, expand=True)

    if fit.get("clip"):
        # 用小猫轮廓（略微外扩 2px）裁切衣服
        alpha = base.getchannel("A")
        grow = alpha.filter(ImageFilter.MaxFilter(5))
        mask = grow.resize(cloth.size, Image.LANCZOS)
        a = ImageChops.multiply(cloth.getchannel("A"), mask)
        cloth.putalpha(a)

    cx = SIZE * fit["x"]
    cy = SIZE * fit["y"]
    left = int(round(cx - cloth.width / 2))
    top = int(round(cy - cloth.height / 2))
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    layer.alpha_composite(cloth, (left, top) if left >= 0 and top >= 0 else (max(0, left), max(0, top)))
    if left < 0 or top < 0:
        # 负偏移时重新贴一次，保证不裁掉左侧/上方内容
        layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        tmp = Image.new("RGBA", (SIZE + 2 * SIZE, SIZE + 2 * SIZE), (0, 0, 0, 0))
        tmp.alpha_composite(cloth, (SIZE + left, SIZE + top))
        layer.alpha_composite(tmp.crop((SIZE, SIZE, SIZE + SIZE, SIZE + SIZE)))

    # 衣服落在毛上的接触阴影：向下偏移一层柔化暗影，只在被衣服覆盖的区域外露一点
    shadow = Image.new("RGBA", cloth.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.bitmap((0, 0), cloth.getchannel("A"), fill=(40, 24, 10, 120))
    shadow = shadow.filter(ImageFilter.GaussianBlur(3))
    sl = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    tmp = Image.new("RGBA", (SIZE + 2 * SIZE, SIZE + 2 * SIZE), (0, 0, 0, 0))
    tmp.alpha_composite(shadow, (SIZE + left + 2, SIZE + top + 5))
    sl.alpha_composite(tmp.crop((SIZE, SIZE, SIZE + SIZE, SIZE + SIZE)))

    out = base.copy()
    out.alpha_composite(sl)
    out.alpha_composite(layer)
    return out


def load_fits():
    cfg = os.path.join(ROOT, "assets", "config", "game-config.js")
    txt = open(cfg, encoding="utf-8").read()
    start = txt.index("items: [")
    end = txt.index("/* ---------- 任务")
    block = txt[start:end]
    rows = []
    for line in block.splitlines():
        line = line.strip()
        if not line.startswith("{ id:") or "cat: \"deco\"" not in line:
            continue
        item_id = line.split('id: "')[1].split('"')[0]
        img = line.split('img: "')[1].split('"')[0]
        fit = json.loads(line.split("fit: ")[1].rsplit(",", 1)[0].strip())
        rows.append((item_id, img, fit))
    return rows


def main():
    out_path = os.path.join(ROOT, "tools", "_fit_check.png")
    if "--out" in sys.argv:
        out_path = sys.argv[sys.argv.index("--out") + 1]

    cat = Image.open(CAT).convert("RGBA")
    fits = load_fits()

    # 单件预览
    tiles = []
    for item_id, img, fit in fits:
        img_path = os.path.join(ROOT, img)
        if not os.path.exists(img_path):
            print("[warn] missing", img)
            continue
        comp = paste_deco(cat, Image.open(img_path), fit)
        tile = Image.new("RGBA", (SIZE, SIZE + 30), (251, 243, 228, 255))
        tile.alpha_composite(comp, (0, 30))
        d = ImageDraw.Draw(tile)
        d.text((10, 8), item_id, fill=(59, 50, 38, 255))
        tiles.append(tile)

    # 全套叠加
    full = cat.copy()
    for _, img, fit in fits:
        p = os.path.join(ROOT, img)
        if os.path.exists(p):
            full = paste_deco(cat, Image.open(p), fit)
    tile = Image.new("RGBA", (SIZE, SIZE + 30), (251, 243, 228, 255))
    tile.alpha_composite(full, (0, 30))
    ImageDraw.Draw(tile).text((10, 8), "ALL (last wins)", fill=(59, 50, 38, 255))
    tiles.append(tile)

    cols = 3
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * SIZE, rows * (SIZE + 30)), (255, 255, 255, 255))
    for i, t in enumerate(tiles):
        sheet.alpha_composite(t, ((i % cols) * SIZE, (i // cols) * (SIZE + 30)))
    sheet.convert("RGB").save(out_path, quality=92)
    print("saved", out_path, sheet.size)


if __name__ == "__main__":
    main()
