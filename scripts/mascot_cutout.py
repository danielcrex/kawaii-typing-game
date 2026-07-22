#!/usr/bin/env python3
"""
Mascot cutout pipeline (fix #2) — RE-RUNNABLE, same settings for all 24.

Source JPG (near-white background) -> transparent PNG with the background removed
AND the mascot normalized into a common square box, so silhouettes of different
shapes (tall seahorse, wide capybara, tiny fly) all read at a consistent size in
the tiles and the grid. The circular medallion used to normalize size implicitly;
this does it explicitly.

Pipeline, per image (identical settings for every mascot):
  1. CONNECTED FLOOD-FILL from the border removes only the border-connected
     near-white background (white *inside* the mascot — bellies, eyes — is kept).
  2. Feather the alpha edge slightly.
  3. Autocrop to the opaque bounding box.
  4. Scale so the content's LONGER side = CONTENT_FRAC of the canvas, then paste
     centered on a transparent CANVAS×CANVAS square -> uniform framing + padding.

Settings (tune here, applies to ALL): THRESH=40, FEATHER=0.7, CANVAS=256,
CONTENT_FRAC=0.86.

Requires: Pillow + numpy (build-time only; not a runtime dependency).

Usage:
  python3 scripts/mascot_cutout.py            # batch: public/Images/N.jpg -> public/Images/cut/N.png (1..24)
  python3 scripts/mascot_cutout.py IN OUT     # single file (e.g. after regenerating one at higher res)
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

# ---- Settings (identical for all 24) ----
THRESH = 40          # near-background colour distance for the flood fill
FEATHER = 0.7        # gaussian blur (px) softening the alpha edge
CANVAS = 256         # output square size
CONTENT_FRAC = 0.86  # fraction of the canvas the mascot's longer side fills
ALPHA_CUTOFF = 24    # alpha above this counts as "content" when finding the bbox

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "public", "Images")
OUT_DIR = os.path.join(ROOT, "public", "Images", "cut")


def remove_background(path: str) -> Image.Image:
    """Connected flood-fill from the border removes the near-white background."""
    im = Image.open(path).convert("RGB")
    arr = np.asarray(im).astype(np.int16)
    h, w, _ = arr.shape
    corners = np.stack([arr[0, 0], arr[0, w - 1], arr[h - 1, 0], arr[h - 1, w - 1]])
    bg = corners.mean(axis=0)
    near = np.sqrt(((arr - bg) ** 2).sum(axis=2)) < THRESH
    visited = np.zeros((h, w), bool)
    dq = deque()
    for x in range(w):
        for y in (0, h - 1):
            if near[y, x] and not visited[y, x]:
                visited[y, x] = True
                dq.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if near[y, x] and not visited[y, x]:
                visited[y, x] = True
                dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and near[ny, nx]:
                visited[ny, nx] = True
                dq.append((ny, nx))
    alpha = np.where(visited, 0, 255).astype(np.uint8)
    a = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(FEATHER))
    out = im.convert("RGBA")
    out.putalpha(a)
    return out


def normalize(rgba: Image.Image) -> Image.Image:
    """Autocrop to content, then centre on a common square with fixed padding."""
    alpha = np.asarray(rgba.split()[-1])
    ys, xs = np.where(alpha > ALPHA_CUTOFF)
    if len(xs) == 0:  # nothing opaque — return a blank canvas
        return Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    cropped = rgba.crop((x0, y0, x1, y1))
    scale = (CANVAS * CONTENT_FRAC) / max(cropped.width, cropped.height)
    new = (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale)))
    cropped = cropped.resize(new, Image.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.alpha_composite(cropped, ((CANVAS - new[0]) // 2, (CANVAS - new[1]) // 2))
    return canvas


def process(inp: str, outp: str) -> None:
    normalize(remove_background(inp)).save(outp)


def main() -> None:
    if len(sys.argv) == 3:
        process(sys.argv[1], sys.argv[2])
        print("wrote", sys.argv[2])
        return
    os.makedirs(OUT_DIR, exist_ok=True)
    for n in range(1, 25):
        process(os.path.join(SRC_DIR, f"{n}.jpg"), os.path.join(OUT_DIR, f"{n}.png"))
    print(f"wrote {OUT_DIR}/1..24.png (THRESH={THRESH} FEATHER={FEATHER} CANVAS={CANVAS} CONTENT_FRAC={CONTENT_FRAC})")


if __name__ == "__main__":
    main()
