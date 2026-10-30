# Einstein for President? — a one-minute stickman history comedy

**The story:** In November 1952, after Chaim Weizmann's death, Israel's Prime Minister David Ben-Gurion
offered the (mostly ceremonial) presidency to Albert Einstein. Einstein politely declined, writing that he lacked
"the natural aptitude and the experience to deal properly with people." Ben-Gurion was reportedly relieved
(the quote usually attributed to him, via Yitzhak Navon, is roughly: *"Tell me what to do if he says yes!
If he accepts, we're in for trouble."*). The job went to Yitzhak Ben-Zvi, who served until 1963.
The "politics is for the present, an equation is for eternity" line is widely attributed to Einstein.
Dialogue in the video is paraphrased for comedy.

**Output:** `einstein-israel-stickman.mp4` — 1920×1080, 30 fps, ~61 s, H.264 + AAC.

## Cast (stickman bodies, caricature heads)
Albert Einstein · David Ben-Gurion · Abba Eban · Chaim Weizmann (angel edition) · Sir Isaac Newton ·
Yitzhak Ben-Zvi · Elvis (cameo, rejected as a candidate)

## How it was made
| Stage | Tool |
|---|---|
| Narration + character voices | [Kokoro-82M](https://github.com/hexgrad/Kokoro-82M) via `kokoro-onnx` (narrator `bm_george`, Ben-Gurion `am_onyx`, Eban `bm_daniel`, Einstein `am_puck`, Newton `bm_fable`) |
| Sound effects + music bed | synthesised with NumPy/SciPy (`src/audio.py`), music ducked under speech |
| Animation | hand-written Canvas 2D engine (`src/engine.js`, `src/scenes.js`) with "boiling" hand-drawn lines; mouths flap to the real voice amplitude |
| Frame capture | headless Chromium via Playwright (`src/render.js`) |
| Encode / mux | ffmpeg |

Scene timing is generated from the actual duration of every Kokoro clip (`timeline.json`), so picture, SFX and
speech stay in sync if the script is edited.

## Rebuild
```bash
pip install kokoro-onnx soundfile scipy
# download kokoro-v1.0.onnx and voices-v1.0.bin from
# https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0  into ./models
python3 src/audio.py models build           # -> build/audio.wav, build/timeline.json
node src/render.js build/timeline.json build/frames 0 1824 4   # needs: npm i playwright
ffmpeg -framerate 30 -i build/frames/f%05d.png -i build/audio.wav \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -c:a aac -b:a 192k -ac 2 -shortest -movflags +faststart out.mp4
```
Fonts in `fonts/` (Bangers, Patrick Hand, Comic Neue) are SIL OFL.
