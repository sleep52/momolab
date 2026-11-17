"""把新表情的“头”贴回原立绘身体上：只换脸，身体、尾巴、坐姿都不动。"""
from PIL import Image, ImageDraw, ImageFilter

AV = "assets/pets/pet001/avatar.png"
NEW = "assets/pets/pet001/_newfaces"
OUT = "assets/pets/pet001/_newfaces"
FACES = ["charm", "tilt", "pout", "wink"]

av = Image.open(AV).convert("RGBA")
W, H = av.size
# 立绘 bbox（66,13,448,484）：头大约在顶部 40% 里
bb = (66, 13, 448, 484)
cx = (bb[0] + bb[2]) / 2
head_h = (bb[3] - bb[1]) * 0.40

def head_mask(scale=1.0, dy=0):
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    rx, ry = (bb[2] - bb[0]) * 0.46 * scale, head_h * 0.60 * scale
    cy = bb[1] + head_h * 0.52 + dy
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
    return m.filter(ImageFilter.GaussianBlur(16))

for k in FACES:
    face = Image.open(f"{OUT}/{k}.png").convert("RGBA")
    mask = head_mask(scale=0.92, dy=8)
    # 只在新图本体上贴：避免白色背景被带进来形成白边
    from PIL import ImageChops
    mask = ImageChops.multiply(mask, face.getchannel("A"))
    out = av.copy()
    out.paste(face, (0, 0), mask)
    out.save(f"{OUT}/{k}_head.png")

sheet = Image.new("RGBA", (512 * 5, 512), (255, 250, 242, 255))
sheet.paste(av, (0, 0), av)
for i, k in enumerate(FACES, 1):
    im = Image.open(f"{OUT}/{k}_head.png")
    sheet.paste(im, (512 * i, 0), im)
sheet.save(f"{OUT}/_compare_head.png")
print("ok")
