"""Lift the section-3 artwork out of the EXTENDED reference (2015-2026, 12
years), generated via Higgsfield from the original 6-year poster.

Same photo treatment as extract_s3.py (open up the warm dark levels, modest
upscale, light local-contrast pass) applied to hand-verified pixel boxes in
the new poster. The generator only rendered 11 of the 12 years cleanly (2023
never appeared, and 2017/2020/2024's insets didn't separate from their card
frames) -- those four reuse their nearest sibling's crop rather than
inventing pixels, consistent with this project's "never fabricate, only
extract" rule.

The figure is untouched by this reference (the brief kept him, the clock and
the floor rings unchanged), so public/years/figure.png and its meta.json
entry are left exactly as extract_s3.py produced them.
"""

import json
import os

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "section 3 image new.png")
OUT = os.path.join(ROOT, "public", "years")

# photo box per year, hand-verified against tools/_debug_boxes.png. Years the
# generator dropped or fused into their card frame borrow the nearest
# sibling's box rather than being guessed.
PHOTOS = {
    2015: (274, 512, 368, 591),
    2016: (458, 558, 578, 641),
    2017: (458, 558, 578, 641),   # generator fused this inset into its frame; reuse 2016
    2018: (828, 603, 935, 708),
    2019: (1018, 636, 1144, 705),
    2020: (1018, 636, 1144, 705),  # reuse 2019
    2021: (1397, 628, 1508, 692),
    2022: (1590, 633, 1720, 717),
    2023: (1590, 633, 1720, 717),  # generator skipped 2023 entirely; reuse 2022
    2024: (2052, 616, 2148, 707),  # generator fused this inset into its frame; reuse 2025's box
    2025: (2052, 616, 2148, 707),
    2026: (2231, 580, 2453, 707),
}

OUT_W = 264


def photo(year, box):
    img = cv2.imread(SRC)
    x0, y0, x1, y1 = box
    c = img[y0:y1, x0:x1].astype(np.float32)

    lo, hi = np.percentile(c, [2, 99])
    c = np.clip((c - lo) / max(hi - lo, 1e-6), 0, 1)
    c = np.power(c, 0.86) * 255.0

    h = int(round(OUT_W * (y1 - y0) / (x1 - x0)))
    c = cv2.resize(c, (OUT_W, h), interpolation=cv2.INTER_LANCZOS4)
    c = cv2.bilateralFilter(np.clip(c, 0, 255).astype(np.uint8), 5, 30, 6)
    blur = cv2.GaussianBlur(c, (0, 0), 1.6)
    c = np.clip(c.astype(np.float32) * 1.35 - blur.astype(np.float32) * 0.35, 0, 255)

    path = os.path.join(OUT, "%d.jpg" % year)
    cv2.imwrite(path, c.astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 88])
    return OUT_W, h


def main():
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "meta.json"), encoding="utf-8") as f:
        meta = json.load(f)
    for year, box in PHOTOS.items():
        w, h = photo(year, box)
        meta[str(year)] = {"w": w, "h": h}
        print("  photo %d  %dx%d" % (year, w, h))
    with open(os.path.join(OUT, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=1, sort_keys=True)
    print("wrote ->", OUT)


if __name__ == "__main__":
    main()
