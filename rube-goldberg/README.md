# A 2D Rube Goldberg machine for Reels / Shorts

A 29-second, **real-physics** Rube Goldberg machine built for vertical video. A claw lets go of one steel ball and it sets off twelve
chained mechanisms; the last one drops an anvil on a big button that lights a heart. Clean and minimal: **no text, no overlays,
no effects** — just the machine and its sound. Nothing is keyframed: every ball, domino, pulley and bucket is simulated,
and the video is whatever the physics did.

**Output**
- `rube-goldberg-reel-9x16.mp4` — **1080×1920, 30 fps, 29 s**, H.264 + AAC (about -14 LUFS), ready for Instagram Reels, YouTube Shorts and TikTok
- `thumbnail_9x16.png` — cover frame (the lit heart)

## The machine (top to bottom)
| # | Step | What happens |
|---|---|---|
| 1 | **Newton's cradle** | a robotic claw lets go of the first steel ball; momentum passes down the line of five and flings a target ball |
| 2 | **The long roll** | the ball lands on a long ramp and rolls the length of the machine |
| 3 | **Domino run** | it hits a rainbow run of 16 dominoes which topple in a ripple (slow-mo) |
| 4 | **Bowling ball** | the last (taller) domino nudges a bowling ball off the ledge; it rolls down a ramp |
| 5 | **Catapult!** | the ball lands on a spring-loaded pressure plate, which fires a catapult arm and lobs a gold ball across the machine |
| 6 | **Pulley gate** | the gold ball drops into a bucket on a real pulley joint; its weight hauls up a gate |
| 7 | **Plinko** | the gate opens and 24 balls pour through a peg board (each peg hit plays a pentatonic note) |
| 8 | **Water wheel** | the balls spin a bucket wheel |
| 9 | **Counterweight** | the balls fill a second bucket; once heavy enough it drops 8 m and lifts a counterweight |
| 10 | **Snip!** | the rising counterweight closes a pair of scissors on the anvil's rope |
| 11 | **The anvil** | the anvil falls onto the big red button |
| 12 | **The heart** | the button presses and the heart lights up (a plain solid fill) |

**What is scripted vs. simulated:** the pulleys, gate, buckets, counterweight, dominoes, Plinko, wheel, cradle and the anvil's fall are straight physics.
Two links are triggers rather than mechanics: the pressure plate switches on the catapult arm's motor, and the scissors close (cutting the anvil's rope)
when the counterweight reaches the top of its travel. Both are driven by what the physics did, so the timing is never hand-set.

## How it was made
| Stage | Tool |
|---|---|
| Physics | [Planck.js](https://piqnt.com/planck.js/) (a Box2D port) at 120 Hz: rigid bodies, revolute / prismatic / distance / **pulley** joints, motors and joint limits (`src/engine.js`, `src/machine.js`). Fully deterministic: re-running `sim.js` gives a byte-identical timeline |
| Direction | each step starts when its trigger sensor is touched; the camera re-frames per step and follows the anvil on its fall (smooth, no shake or zoom). Gentle playback-speed changes (slower on the cradle and catapult, faster through long rolls) are set in `machine.js` (`RATE`) |
| Picture | hand-written Canvas 2D renderer (`src/draw.js`, `styles.js`): flat colours, thin outlines, soft shadows; no text and no effects |
| Frame capture | headless Chromium via Playwright (`src/render.js`) |
| Sound | **synthesised from the physics log** (`src/audio.py`, NumPy/SciPy, no samples): every collision becomes a domino clack, steel tick, wood thock, metal clang or marimba note, scaled by impact speed and panned by where it happened; rolling noise follows ball speed; plus a simple bass-and-arpeggio bed and one soft chord when the heart lights. Royalty-free by construction |
| Encode | ffmpeg (BT.709, loudness-normalised) |

**Reels / Shorts layout:** nothing is drawn over the machine, so there is nothing for the platforms' UI to cover; the steel columns at the sides double as margins. Add your own caption in the app if you want one.

## Rebuild
```bash
cd rube-goldberg
npm i planck playwright && pip install numpy scipy soundfile      # (playwright needs its Chromium: npx playwright install chromium)
node src/sim.js build/timeline.json                              # physics -> timeline (poses, collisions, camera)
python3 -I src/audio.py build/timeline.json build/audio.wav      # foley + music from the collision log
node src/render.js build/timeline.json build/frames 0 9999 6     # JPEG frames, 6 workers
ffmpeg -framerate 30 -i build/frames/f%05d.jpg -i build/audio.wav \
  -vf "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11,aformat=sample_rates=48000:channel_layouts=stereo" \
  -c:v libx264 -preset slow -crf 17 -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 192k -shortest -movflags +faststart rube-goldberg-reel-9x16.mp4
```
Tweak the machine in `src/machine.js` (positions are metres, y down, 1 m = 50 px) and re-run; to change how long the heart is held at the end, edit `TAIL` in `src/sim.js`.
Fonts in `fonts/` (Bangers, Comic Neue) are SIL OFL.
