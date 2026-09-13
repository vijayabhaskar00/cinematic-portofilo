"""Re-export a packed colour|matte clip (from matte.py) as a real-alpha video.

The colour half is alpha-PREMULTIPLIED (matte.py's own comment: "premultiplied:
no dark fringe"), which is correct for the site's own WebGL compositor but
would show a dark rim in any tool that expects straight alpha (After Effects,
QuickTime, ffmpeg's own alphamerge default). This un-premultiplies first, so
the exported file carries the same clean edge with no compression-black
"patches" and no premultiplied fringe in normal players.

Run:  python tools/export_alpha.py public/media/hero.mp4 out/vijay-alpha
Out:  out/vijay-alpha.mov  (ProRes 4444, real alpha - Premiere/AE/QuickTime)
      out/vijay-alpha.webm (VP9, real alpha - Chrome/Firefox)
"""
import os
import subprocess
import sys

import cv2
import numpy as np


def main():
    src, out_base = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.dirname(out_base) or ".", exist_ok=True)
    cap = cv2.VideoCapture(src)
    pw = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    w = pw // 2
    fps = cap.get(cv2.CAP_PROP_FPS) or 24

    mov = out_base + ".mov"
    webm = out_base + ".webm"
    cmd = [
        "ffmpeg", "-v", "error", "-y",
        "-f", "rawvideo", "-pix_fmt", "bgra", "-s", "%dx%d" % (w, h),
        "-r", str(fps), "-i", "-",
        "-an", "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le",
        mov,
        "-an", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-crf", "24", "-b:v", "0",
        "-row-mt", "1", "-cpu-used", "2",
        webm,
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    written = 0
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        col = fr[:, :w].astype(np.float32)
        a = fr[:, w:, 0].astype(np.float32) / 255.0
        # undo matte.py's premultiplication: straight = premultiplied / alpha
        straight = np.where(a[..., None] > 0.02, col / np.maximum(a[..., None], 1e-3), 0.0)
        straight = np.clip(straight, 0, 255).astype(np.uint8)
        bgra = np.dstack([straight, (a * 255.0).astype(np.uint8)])
        proc.stdin.write(bgra.tobytes())
        written += 1

    proc.stdin.close()
    proc.wait()
    cap.release()
    print("wrote %d frames -> %s , %s" % (written, mov, webm))


if __name__ == "__main__":
    main()
