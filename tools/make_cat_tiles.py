# 生成「喵了个喵」的方形小猫牌面：挑她最有趣的 8 张表情。
# 有头部裁切层的直接用；没有的（daze/wink/tilt 这类整张新脸）按 split_pet_head.py
# 同一取景（上 50% + 14px 羽化）现裁一份，保证所有牌面机位一致。
# 所有类型共用同一个取景窗（边长 = 最宽那张脸的 bbox 宽），水平按各自 bbox 中心对齐，
# 垂直统一留白，输出 256x256 透明底 PNG。
from PIL import Image
import os

SRC = "assets/pets/pet001"
LAYERS = SRC + "/layers"
DST = SRC + "/tiles"
NAMES = ["daze", "wink", "tilt", "laugh", "yawn", "eat-meow", "scared", "surprise"]

RATIO = 0.50
FEATHER = 14


def head_of(name):
    layered = f"{LAYERS}/{name}__head.png"
    if os.path.exists(layered):
        return Image.open(layered).convert("RGBA")
    im = Image.open(f"{SRC}/{name}.png").convert("RGBA")
    w, h = im.size
    cut = int(round(h * RATIO))
    head = im.crop((0, 0, w, cut + FEATHER))
    alpha = head.getchannel("A")
    px = alpha.load()
    for y in range(cut, cut + FEATHER):
        k = 1 - (y - cut) / float(FEATHER)
        for x in range(w):
            px[x, y] = int(px[x, y] * k)
    return head


os.makedirs(DST, exist_ok=True)

boxes = {}
for n in NAMES:
    im = head_of(n)
    boxes[n] = (im, im.getbbox())

side = max(bb[2] - bb[0] for _, bb in boxes.values())
src_h = boxes[NAMES[0]][0].height
pad_y = (side - src_h) // 2

for n in NAMES:
    im, bb = boxes[n]
    cx = (bb[0] + bb[2]) / 2
    left = int(round(cx - side / 2))
    crop = im.crop((left, 0, left + side, src_h))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(crop, (0, pad_y), crop)
    canvas = canvas.resize((256, 256), Image.LANCZOS)
    canvas.save(f"{DST}/{n}.png")
    print(n, "side", side, "left", left)

for old in os.listdir(DST):
    if old.endswith(".png") and old[:-4] not in NAMES:
        os.remove(f"{DST}/{old}")
        print("removed stale", old)