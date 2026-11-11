from PIL import Image, ImageDraw
import os
PET = r"D:\momolab\assets\pets\pet001"
order = ["avatar", "laugh", "lick", "curious", "shy", "surprise", "scared", "focus", "yawn"]
cols, cell = 5, 300
rows = (len(order) + cols - 1) // cols
sheet = Image.new("RGB", (cols * cell, rows * cell), (246, 240, 230))
d = ImageDraw.Draw(sheet)
for i, n in enumerate(order):
    im = Image.open(os.path.join(PET, n + ".png")).convert("RGBA").resize((280, 280), Image.LANCZOS)
    x, y = (i % cols) * cell, (i // cols) * cell
    sheet.paste(im, (x + 10, y + 10), im)
    d.text((x + 10, y + 285), n, fill=(60, 40, 30))
sheet.save(r"D:\momolab\tools\_sheet.png")
print("ok")
