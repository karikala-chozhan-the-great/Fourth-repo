# Caesar vs. the Pirates — a one-minute history comedy

**The story (Plutarch, *Life of Caesar*; Suetonius, *Divus Iulius*):** around 75 BC a young Julius Caesar, sailing to
Rhodes to study rhetoric, was captured by Cilician pirates. They demanded 20 talents of silver; Caesar was
insulted by how little they thought he was worth and told them to ask for 50. He spent about 38 days as their
"guest" while his friends raised the money — ordering them to keep quiet when he napped, joining their games, reading
them his poems (and calling them illiterate barbarians when they weren't impressed), and cheerfully promising to
have them all crucified. They thought he was joking. After the ransom was paid he raised a fleet, came back, caught
them, recovered the silver and did exactly what he'd said he would.

The video closes with Julius breaking the fourth wall to ask viewers to follow and subscribe (or he'll come back with a fleet).

Dialogue is paraphrased for comedy, and the Blackbeard cameo (born c. 1680) is a deliberate anachronism.

**Output:**
- `caesar-pirates-reel-9x16.mp4` — **portrait 1080×1920** for Instagram Reels / YouTube Shorts / TikTok (~66 s)
- `caesar-pirates-video.mp4` — 1920×1080, 30 fps, ~66 s, H.264 + AAC.

## Cast (stickman bodies, caricature heads)
Julius Caesar (laurel wreath, toga, deadpan) · the pirate captain (eyepatch, bandana) · bald handlebar-moustache pirate ·
skull-bandana pirate · Blackbeard (smoking beard, from the wrong century)

## How it was made
| Stage | Tool |
|---|---|
| Voices | [Kokoro-82M](https://github.com/hexgrad/Kokoro-82M) via `kokoro-onnx`, **cast and directed per character**: narrator `af_heart` (Kokoro's best-rated voice); Caesar = custom blend of `am_michael` + `bm_george`, slightly deeper, warm, with a touch of room echo; pirate captain = `am_onyx` pitched down and gravelled; skull-bandana pirate = `am_puck` pitched up; Blackbeard = a deep, cavernous `am_onyx`/`am_fenrir` blend. Lines are synthesised phrase by phrase with per-phrase speed and pauses for comedic timing, pirate dialect for the crew, and an overlapping three-pirate crowd laugh |
| Lip-sync | mouth opening follows loudness, mouth *width* follows spectral brightness ("ee" vs "oo") |
| SFX, sea ambience, pirate-waltz score | synthesised with NumPy/SciPy (`src/audio.py`); music ducks under speech |
| Animation | hand-written Canvas 2D engine (`src/engine.js`, `src/scenes.js`): hand-drawn "boiling" lines, a cinematic camera (push-ins, whip-pans, screen shake), speech-driven head/body acting, squash-and-stretch, a day/night time-lapse, swinging boarders, coin-eyed greed, rolling-on-the-floor laughter, cannon volleys |
| Frame capture | headless Chromium via Playwright (`src/render.js`) |
| Encode / mux | ffmpeg (loudness-normalised to about -16 LUFS) |

Every phrase has an exact start time (`timeline.json`), so camera moves, sound effects and gags land on the right words, and picture stays in sync when the script changes.

## Portrait (9:16) version
The same code renders either format: open `index.html?portrait=1` (the renderer takes a `portrait` argument). Portrait mode is a re-composition, not a crop: skies, seas and decks are extended vertically, the camera is re-framed for a tall view (tighter on the cast, with the action in the middle band), the cast is pulled closer together, on-screen graphics are re-laid-out, and captions sit in the phone-safe zone above the platforms' bottom UI.

## Rebuild
```bash
pip install kokoro-onnx soundfile scipy
# put kokoro-v1.0.onnx and voices-v1.0.bin (kokoro-onnx release "model-files-v1.0") in ./models
python3 src/audio.py models build
node src/render.js build/timeline.json build/frames 0 1979 4                      # landscape; needs: npm i playwright
node src/render.js build/timeline.json build/frames_portrait 0 1979 4 1 portrait   # 9:16
ffmpeg -framerate 30 -i build/frames/f%05d.png -i build/audio.wav \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11,aformat=sample_rates=48000:channel_layouts=stereo" \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart out.mp4
```
Fonts in `fonts/` (Bangers, Patrick Hand, Comic Neue, Pirata One, Cinzel) are SIL OFL.
