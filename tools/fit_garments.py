"""把装饰贴图处理成“贴得住”的版本。

1. 贝雷帽原图自带了猫耳朵，这里按帽体轮廓把耳朵部分切掉，让真耳朵露出来；
2. 帽子底边 / 围巾上缘按弧度收口，不再是硬直边；
3. 沿轮廓内侧压一圈暗边（AO），模拟压进毛里的接触阴影。
输出 *_fit.png，不改原图。
"""

from pathlib import Path

import numpy as np
from PIL import Image

DECO = Path(r"D:\momolab\assets\deco")


def clip_above_silhouette(arr: np.ndarray, pad: int = 3) -> np.ndarray:
    """逐列找到帽体的最上沿（第一颗偏蓝像素），只保留它以下的像素。"""
    r = arr[:, :, 0].astype(np.int32)
    g = arr[:, :, 1].astype(np.int32)
    b = arr[:, :, 2].astype(np.int32)
    blue = ((b - np.maximum(r, g)) > 22) & (arr[:, :, 3] > 8)
    h, w = blue.shape
    top = np.full(w, h, dtype=np.int32)
    for x in range(w):
        ys = np.nonzero(blue[:, x])[0]
        if len(ys):
            top[x] = ys.min()
    # 把空列（帽体两侧之外）的 top 用邻近值补上
    valid = top < h
    if valid.any():
        idx = np.nonzero(valid)[0]
        top = np.interp(np.arange(w), idx, top[idx]).astype(np.int32)
    yy = np.arange(h)[:, None]
    keep = yy >= (top[None, :] - pad)
    a = arr[:, :, 3].astype(np.int32) * keep.astype(np.int32)
    # 开运算去掉耳朵留下的细毛丝
    m = a > 8
    for _ in range(2):
        m = m & np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1)
    for _ in range(2):
        m = m | np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)
    arr = arr.copy()
    arr[:, :, 3] = (a * m.astype(np.int32)).astype(np.uint8)
    return arr


def alpha_edge_shade(arr: np.ndarray, width: int = 16, strength: float = 0.34) -> np.ndarray:
    """在 alpha 边缘内侧加一圈暗色（AO）。"""
    a = arr[:, :, 3].astype(np.float32) / 255.0
    core = a.copy()
    for _ in range(width):
        core = np.minimum(
            core,
            np.minimum(
                np.roll(core, 1, axis=0),
                np.minimum(np.roll(core, -1, axis=0),
                           np.minimum(np.roll(core, 1, axis=1),
                                      np.roll(core, -1, axis=1))),
            ),
        )
    edge = np.clip(a - core, 0, 1) * strength
    out = arr.astype(np.float32)
    for c in range(3):
        out[:, :, c] = out[:, :, c] * (1 - edge)
    out[:, :, 3] = arr[:, :, 3]
    return out.astype(np.uint8)


def arc_alpha(arr: np.ndarray, side: str, depth_ratio: float, curve: float, feather: int) -> np.ndarray:
    """按弧线把一侧的 alpha 渐隐掉。side = bottom / top。"""
    h, w = arr.shape[:2]
    a = arr[:, :, 3].astype(np.float32)
    ys, xs = np.nonzero(a > 8)
    if len(ys) == 0:
        return arr
    top, bottom = ys.min(), ys.max()
    left, right = xs.min(), xs.max()
    span_h = bottom - top + 1
    depth = max(4, int(span_h * depth_ratio))
    cx = (left + right) / 2.0
    hw = max(1.0, (right - left) / 2.0)

    yy, xx = np.mgrid[0:h, 0:w]
    u = np.clip((xx - cx) / hw, -1, 1)
    offset = curve * depth * (u ** 2)

    if side == "bottom":
        limit = bottom - depth + offset
        ramp = np.clip((yy - (limit - feather)) / float(feather), 0, 1)
        a = a * (1 - ramp)
    else:
        limit = top + depth - offset
        ramp = np.clip(((limit + feather) - yy) / float(feather), 0, 1)
        a = a * (1 - ramp)

    arr = arr.copy()
    arr[:, :, 3] = a.astype(np.uint8)
    return arr


def process(name: str, side: str, depth_ratio: float, curve: float, feather: int,
            clip_silhouette: bool = False) -> str:
    im = Image.open(DECO / (name + ".png")).convert("RGBA")
    arr = np.array(im)
    if clip_silhouette:
        arr = clip_above_silhouette(arr)
    arr = arc_alpha(arr, side, depth_ratio, curve, feather)
    arr = alpha_edge_shade(arr)
    out = DECO / (name + "_fit.png")
    Image.fromarray(arr).save(out, optimize=True)
    return out.name


if __name__ == "__main__":
    print(process("beret", "bottom", 0.08, 0.9, 16, clip_silhouette=True))
    print(process("flowercrown", "bottom", 0.12, 0.8, 14))
    print(process("scarf", "top", 0.16, 0.85, 16))
    print(process("bowtie", "top", 0.12, 0.8, 12))
    print(process("sweater", "top", 0.10, 0.7, 14))
    print(process("hoodie", "top", 0.10, 0.7, 14))
    print(process("cape", "top", 0.10, 0.7, 14))
    print(process("glasses", "top", 0.06, 0.4, 8))
