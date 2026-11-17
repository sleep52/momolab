import numpy as np
from PIL import Image

BASE = Image.open(r"D:\momolab\assets\pets\pet001\avatar.png").convert("RGBA")
HEAD = Image.open(r"D:\momolab\assets\pets\pet001\layers\avatar__head.png").convert("RGBA")
HEADPAD = Image.new("RGBA", BASE.size, (0, 0, 0, 0))
HEADPAD.alpha_composite(HEAD)
YCUT = 0.42


def bbox(a, ycut=YCUT):
    a2 = a.copy()
    a2[: int(a.shape[0] * ycut), :] = 0
    ys, xs = np.nonzero(a2 > 20)
    return xs.min(), ys.min(), xs.max(), ys.max()


gen = Image.open(r"D:\momolab\assets\deco\worn\_gen_scarf.png").convert("RGBA").resize(BASE.size, Image.LANCZOS)
ob = bbox(np.array(BASE)[:, :, 3])
gb = bbox(np.array(gen)[:, :, 3])
s = (((ob[2] - ob[0]) / (gb[2] - gb[0])) + ((ob[3] - ob[1]) / (gb[3] - gb[1]))) / 2
new = gen.resize((int(gen.width * s), int(gen.height * s)), Image.LANCZOS)
nb = bbox(np.array(new)[:, :, 3])
ox = int((ob[0] + ob[2]) / 2 - (nb[0] + nb[2]) / 2)
oy = int(ob[3] - nb[3])
body = Image.new("RGBA", BASE.size, (0, 0, 0, 0))
body.alpha_composite(new, (ox, oy))

# 头部图层下缘做一段渐变，和身体自然接上
ha = np.array(HEADPAD).copy()
bottom = np.nonzero(ha[:, :, 3].max(axis=1) > 0)[0].max()
ramp = 48
for i in range(ramp):
    y = bottom - i
    f = i / ramp
    ha[y, :, 3] = (ha[y, :, 3].astype(np.float32) * f).astype(np.uint8)
head2 = Image.fromarray(ha)

comp = Image.new("RGBA", BASE.size, (0, 0, 0, 0))
comp.alpha_composite(body)
comp.alpha_composite(head2)
comp.save(r"D:\momolab\assets\deco\worn\_try3_check.png")
print("ok bottom", bottom, "offset", ox, oy, "scale", round(s, 3))
