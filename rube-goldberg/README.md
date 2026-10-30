# A 2D Rube Goldberg machine for Reels / Shorts / YouTube

**Real-physics** Rube Goldberg machines in three lengths. A claw lets go of one steel ball and it sets off a chain of mechanisms; the last
one drops an anvil on a big button that lights a heart. Clean and minimal: **no text, no overlays, no effects** — just the machine and its
sound. Nothing is keyframed: every ball, domino, pulley and bucket is simulated, and the video is whatever the physics did.

**Output** (four cuts)
- `rube-goldberg-tour-16x9.mp4` — **the "tour": a second, different landscape cut for YouTube, 1920×1080, 30 fps, 2:41**, a side-scrolling machine of 33 different mechanisms (see below)
- `rube-goldberg-3min-16x9.mp4` — **the three-minute landscape version for YouTube: 1920×1080, 30 fps, 2:50**, 29 steps (see below)
- `rube-goldberg-reel-60s-9x16.mp4` — the one-minute vertical version: 1080×1920, 59 s, 18 steps
- `rube-goldberg-reel-9x16.mp4` — the short vertical version: 29 s, 12 steps
- `thumbnail_tour_16x9.png` / `thumbnail_3min_16x9.png` — covers of the two landscape cuts (the lit heart); `thumbnail_9x16.png` / `thumbnail_60s_9x16.png` — covers for the vertical cuts
- all are H.264 + AAC at about -14 LUFS; the vertical ones are ready for Instagram Reels, YouTube Shorts and TikTok

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

## The one-minute version (`--long`)
It is a genuinely longer machine, not a slowed-down one. Steps 1–9 are the same; the counterweight now pulls a tripwire instead of closing the
scissors directly, and a second half-machine sits between it and the anvil:

| # | Step | What happens |
|---|---|---|
| 10 | **Tripwire** | the counterweight reaches the top and pulls a pin out from under a ball |
| 11 | **Ramps** | the ball runs down a short ramp, hits the wall and takes a long ramp back across the machine |
| 12 | **Dominoes** | it drops onto a return ramp and into a second, rainbow run of 16 dominoes |
| 13 | **Pendulum** | the last domino pushes a ball down a ramp onto a second pressure plate, which lets go of a wrecking ball |
| 14 | **Tower** | the wrecking ball swings into a stack of six blocks |
| 15 | **Final ramp** | the falling blocks knock a ball off its shelf and it rolls down a ramp |
| 16 | **Snip** | the ball lands on a third plate, which closes the scissors on the anvil's rope |
| 17 | **The anvil** | it falls about 20 m onto the red button |
| 18 | **The heart** | the heart lights up |

Playback is real time, with gentle slow-motion on the cradle hit, both domino runs, the catapult, the tower smash and the anvil impact.
Another tripwire-style link (the third plate closing the scissors) is a scripted trigger like the others; the rest is physics.
The same 5-release-time stress test as the short cut passes (the chain completes every time, no stray balls).

## The three-minute landscape version (`--wide`)
A new, much bigger machine rather than a slowed-down one. The world is 48 m wide so a 16:9 camera frames it edge to edge and only scrolls
down the tower; the proven blocks of the vertical machine are re-used, stretched or mirrored into the left and right halves, and connector
ramps hand the ball from one half to the other. Real-time playback with slow-motion on the big moments (`RATE` in `src/machine_wide.js`).

| # | Step | What happens |
|---|---|---|
| 1–3 | **Cradle, long roll, dominoes** | the claw releases the first ball of a Newton's cradle; the flung ball rolls the full width and topples a 48-domino rainbow run |
| 4–5 | **Bowling ball, catapult** | the last domino nudges a bowling ball onto a spring-loaded plate that fires a catapult arm |
| 6–8 | **Teeter-totter, bouncy stairs** | the gold ball rolls across, tips a teeter-totter and hops down six rubber pads |
| 9–11 | **Pulley gate, two Plinko boards** | it drops into a bucket on a pulley that lifts a gate; 32 balls pour through one peg board, ride a long ramp and fall through a second |
| 12–13 | **Water wheel, counterweight** | the balls spin a bucket wheel and fill a bucket that drops and lifts a counterweight |
| 14–15 | **Tripwire, ramps** | the counterweight pulls a pin from under a ball, which takes three ramps back across the machine |
| 16–18 | **Three more domino runs** | 20, 51 and 48 dominoes; each run's last domino pushes the next ball onto the next run |
| 19–23 | **Switchbacks** | the last ball takes five long ramps back and forth; two of them are **xylophones**, 16 coloured keys that each play a marimba note as it rolls over |
| 24–25 | **Pendulum, tower** | a plate releases a wrecking ball that swings into a stack of six blocks |
| 26–27 | **Final ramp, snip** | the falling blocks knock a ball down a ramp onto a third plate, which closes the scissors on the anvil's rope |
| 28–29 | **The anvil, the heart** | the anvil falls about 22 m onto the red button and the heart lights up |

As in the other cuts, the plates, the tripwire and the scissors are triggers driven by what the physics did; everything else is straight rigid-body
simulation. The chain was stress-tested for completion at several release times (the claw's let-go time) with no stray balls.

## The tour (`--tour`) — a second landscape cut, built from scratch
The first landscape cut stacks everything down one tall tower. This one is a **side-scrolling machine**: 33 modules laid end to end in a ~350 m-wide world, each in its own local
coordinates (`src/machine_tour.js`), with the camera dropping in from a whole-machine shot, panning or cutting from module to module, following the wave of dominoes
down the stairs and the anvil on its fall, and pulling back at the end. Real-time playback (0.8x between the big moments, 0.5x on a handful of hits), no text, no effects.

| Part | What happens |
|---|---|
| Opening | a robotic claw lets go of a **Newton's cradle**; the flung ball **skips across seven rubber pads** (one note each) into a **pinball** box of six bumpers |
| Dominoes, bowling, catapult | a 34-domino rainbow wave pushes a bowling ball into **seven pins**; a pin presses a plate that fires a **catapult**, which lobs a gold ball into a **pulley bucket** |
| The ball flood | the bucket's weight hauls up a gate and **64 balls** pour through a **Plinko** board and **two windmills**, spin a **water wheel**, fill a bucket that lifts a **counterweight** |
| ...and on | the counterweight opens the bucket's **hatch**; the balls bounce through a garden of big rubber **bumpers**, **trampolines**, **pinwheels**, **zig-zag trays**, a rainbow **xylophone slide**, a bumper lattice and a curtain of **swinging bars**, and finally pile onto a **weighing plate** |
| The next ball | the plate (under the weight of the pile) pulls a pin: a ball sweeps through **chimes**, crosses a sagging **rope bridge** (12 hinged planks), tips a **teeter-totter**, and presses a plate that drops a **drawbridge** just ahead of it |
| Domino stairs | it hits a **rail of five balls** (Newton's cradle on a track); the last one starts a **domino wave down nine steps**, which pushes a bowling ball down a ramp and through a **half-pipe** |
| Finale | a plate lets go of a **wrecking ball** that swings into a tower of blocks; a ball rolls onto a plate that closes **scissors** on the anvil's rope; the **anvil** drops onto the big button and the **heart** lights up |

As in the other cuts, the plates, the drawbridge and tripwire, and the scissors are triggers driven by what the physics did; everything else is straight rigid-body simulation.
The tour re-uses the proven pulley / Plinko / wheel / counterweight / finale blocks of the other machines but is laid out and timed completely differently. Sounds pan with the
camera and fade when they happen out of view.

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
node src/sim.js build/timeline.json                              # physics -> timeline (poses, collisions, camera); add --long for the one-minute version
python3 -I src/audio.py build/timeline.json build/audio.wav      # foley + music from the collision log
node src/render.js build/timeline.json build/frames 0 9999 6     # JPEG frames, 6 workers
ffmpeg -framerate 30 -i build/frames/f%05d.jpg -i build/audio.wav \
  -vf "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11,aformat=sample_rates=48000:channel_layouts=stereo" \
  -c:v libx264 -preset slow -crf 17 -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 192k -shortest -movflags +faststart rube-goldberg-reel-9x16.mp4      # (60 s cut: use --long and name it ...-60s-...)
```
The three-minute cut uses `--wide` and more memory for the renderer (the timeline is about 25 MB):
```bash
node src/sim.js build/timeline.json --wide                       # src/machine_wide.js: 1920x1080, ~5200 frames
python3 -I src/audio.py build/timeline.json build/audio.wav
node --max-old-space-size=8192 src/render.js build/timeline.json build/frames 0 99999 4
# then the same ffmpeg command, with -framerate 30 and the output named rube-goldberg-3min-16x9.mp4 (two-pass loudnorm gives a cleaner -14 LUFS)
```
The second landscape cut (the tour, ~28 MB timeline) is the same three steps with `node src/sim.js build/timeline.json --tour`.
Tweak the machine in `src/machine.js` (`src/machine_wide.js` for the landscape cut) (positions are metres, y down, 1 m = 50 px) and re-run; to change how long the heart is held at the end, edit `TAIL` in `src/sim.js`.
Fonts in `fonts/` (Bangers, Comic Neue) are SIL OFL.
