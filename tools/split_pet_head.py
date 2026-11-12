from pathlib import Path

from PIL import Image

SRC = Path(r"D:\momolab\assets\pets\pet001")
OUT = SRC / "layers"
OUT.mkdir(exist_ok=True)

# 头部下沿：约在整张立绘 50% 的高度（下巴 / 脖子交界），带 14px 羽化过渡
RATIO = 0.50
FEATHER = 14


def build(path: Path) -> str:
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    cut = int(round(h * RATIO))
    head = im.crop((0, 0, w, cut + FEATHER))
    alpha = head.getchannel("A")
    px = alpha.load()
    for y in range(cut, cut + FEATHER):
        k = 1 - (y - cut) / float(FEATHER)
        for x in range(w):
            px[x, y] = int(px[x, y] * k)
    out = OUT / (path.stem + "__head.png")
    head.save(out, optimize=True)
    return out.name


if __name__ == "__main__":
    files = [p for p in sorted(SRC.glob("*.png")) if p.is_file()]
    for p in files:
        print(build(p))
    print("total", len(files))
