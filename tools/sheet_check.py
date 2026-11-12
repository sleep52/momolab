import os
import glob
from PIL import Image, ImageDraw

PET = r"D:\momolab\assets\pets\pet001"
order = sorted(os.path.basename(p)[:-4] for p in glob.glob(os.path.join(PET, "*.png")))
cols, cell = 5, 300
rows = (len(order) + cols - 1) // cols
sheet = Image.new("RGB", (cols * cell, rows * cell), (246, 240, 230))
d = ImageDraw.Draw(sheet)
for i, n in enumerate(order):
    im = Image.open(os.path.join(PET, n + ".png")).convert("RGBA").resize((280, 280), Image.LANCZOS)
    x, y = (i % cols) * cell, (i // cols) * cell
    sheet.paste(im, (x + 10, y + 10), im)
    d.text((x + 10, y + 285), n, fill=(60, 40, 30))
sheet.save(r"D:\momolab\tools\_check.png")
print("ok", len(order))