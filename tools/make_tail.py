"""把尾巴单独切出来做一层，绕根部小幅摆动。只取尾巴本体，左边接缝处羽化。"""
from PIL import Image, ImageFilter

SRC = "assets/pets/pet001/avatar.png"
OUT = "assets/pets/pet001/tail_anim.png"

im = Image.open(SRC).convert("RGBA")
# 只取尾巴离开身体之后的部分，接缝放在 x≈300 一带
box = (298, 322, 452, 488)
tail = im.crop(box)

# 左边缘（靠身体那一侧）做羽化，摆起来不露硬边
w, h = tail.size
mask = Image.new("L", (w, h), 255)
# 左上角那块是大腿的毛，不属于尾巴，直接抠掉
for x in range(0, 46):
    for y in range(0, 108):
        mask.putpixel((x, y), 0)
for x in range(16):
    a = int(255 * (x / 16.0))
    for y in range(h):
        mask.putpixel((x, y), a)
mask = mask.filter(ImageFilter.GaussianBlur(3))
tail.putalpha(Image.composite(tail.getchannel("A"), Image.new("L", (w, h), 0), mask))

tail.save(OUT)
print("saved", OUT, tail.size, "box", box)
