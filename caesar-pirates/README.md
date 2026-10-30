# Caesar vs. the Pirates — a one-minute history comedy

**The story (Plutarch, *Life of Caesar*; Suetonius, *Divus Iulius*):** around 75 BC a young Julius Caesar, sailing to
Rhodes to study rhetoric, was captured by Cilician pirates. They demanded 20 talents of silver; Caesar was
insulted by how little they thought he was worth and told them to ask for 50. He spent about 38 days as their
"guest" while his friends raised the money — ordering them to keep quiet when he napped, joining their games, reading
them his poems (and calling them illiterate barbarians when they weren't impressed), and cheerfully promising to
have them all crucified. They thought he was joking. After the ransom was paid he raised a fleet, came back, caught
them, recovered the silver and did exactly what he'd said he would.

Dialogue is paraphrased for comedy, and the Blackbeard cameo (born c. 1680) is a deliberate anachronism.

**Output:** `caesar-pirates-video.mp4` — 1920×1080, 30 fps, ~59 s, H.264 + AAC.

## Cast (stickman bodies, caricature heads)
Julius Caesar (laurel wreath, toga, deadpan) · the pirate captain (eyepatch, bandana) · bald handlebar-moustache pirate ·
skull-bandana pirate · Blackbeard (smoking beard, from the wrong century)

## How it was made
| Stage | Tool |
|---|---|
| Narration + character voices | [Kokoro-82M](https://github.com/hexgrad/Kokoro-82M) via `kokoro-onnx` (narrator `bf_emma`, Caesar `bm_george`, captain `am_onyx`, pirate `am_eric`, Blackbeard `am_fenrir`) |
| SFX, sea ambience, pirate-waltz score | synthesised with NumPy/SciPy (`src/audio.py`); music ducks under speech |
| Animation | hand-written Canvas 2D engine (`src/engine.js`, `src/scenes.js`): boiling hand-drawn lines, animated sea, ship sway, lip-sync from the real voice amplitude |
| Frame capture | headless Chromium via Playwright (`src/render.js`) |
| Encode / mux | ffmpeg (loudness-normalised to ≈ −16 LUFS) |

Scene timing is derived from the real duration of each Kokoro clip (`timeline.json`), so picture, SFX and speech stay in sync when the script changes.

## Rebuild
```bash
pip install kokoro-onnx soundfile scipy
# put kokoro-v1.0.onnx and voices-v1.0.bin (kokoro-onnx release "model-files-v1.0") in ./models
python3 src/audio.py models build
node src/render.js build/timeline.json build/frames 0 1779 4     # needs: npm i playwright
ffmpeg -framerate 30 -i build/frames/f%05d.png -i build/audio.wav \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11,aformat=sample_rates=48000:channel_layouts=stereo" \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart out.mp4
```
Fonts in `fonts/` (Bangers, Patrick Hand, Comic Neue, Pirata One, Cinzel) are SIL OFL.
