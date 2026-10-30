"""Narration (Kokoro), SFX, sea ambience, pirate-waltz music bed and master timeline.

usage: python3 -I audio.py <models_dir> <out_dir>   ->  <out_dir>/audio.wav, <out_dir>/timeline.json
"""
import json, sys, re, math
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly, butter, sosfilt
from kokoro_onnx import Kokoro

MODELS, OUT = sys.argv[1], sys.argv[2]
SR, FPS = 48000, 30

BEATS = [
    dict(id="b1",  who="narr",    voice="bf_emma",   speed=1.08, gap=0.30, lang="en-gb",
         text="Seventy-five B.C. Young Julius Caesar is sailing to Rhodes to study public speaking, when pirates grab him."),
    dict(id="b2",  who="captain", voice="am_onyx",   speed=1.0,  gap=0.20, lang="en-us",
         text="Arr! We want twenty talents of silver!"),
    dict(id="b3",  who="caesar",  voice="bm_george", speed=1.0,  gap=0.30, lang="en-gb",
         text="Twenty? Do you know who I am? Make it fifty."),
    dict(id="b3b", who="captain", voice="am_onyx",   speed=1.0,  gap=0.30, lang="en-us",
         text="F-fifty? ... Fine. Fifty it is."),
    dict(id="b4",  who="narr",    voice="bf_emma",   speed=1.08, gap=0.30, lang="en-gb",
         text="Yes. He negotiated his own ransom. Upwards."),
    dict(id="b5",  who="narr",    voice="bf_emma",   speed=1.08, gap=0.25, lang="en-gb",
         text="For thirty-eight days, while his friends raised the silver, Caesar was the bossiest hostage ever."),
    dict(id="b6",  who="caesar",  voice="bm_george", speed=1.0,  gap=0.30, lang="en-gb",
         text="Quiet, please. I'm napping."),
    dict(id="b6b", who="narr",    voice="bf_emma",   speed=1.08, gap=0.25, lang="en-gb",
         text="The pirates actually tiptoed."),
    dict(id="b7",  who="narr",    voice="bf_emma",   speed=1.08, gap=0.25, lang="en-gb",
         text="He joined their games, and read them his poetry. When they didn't clap, he called them illiterate barbarians."),
    dict(id="b8",  who="caesar",  voice="bm_george", speed=1.0,  gap=0.25, lang="en-gb",
         text="Once I'm free, I'll come back and have you all crucified."),
    dict(id="b9",  who="pirate",  voice="am_eric",   speed=1.0,  gap=0.35, lang="en-us",
         text="Ha ha ha! Oh, he's a funny one!"),
    dict(id="b9b", who="blackbeard", voice="am_fenrir", speed=1.0, gap=0.30, lang="en-us",
         text="Excuse me, I'm from seventeen eighteen. Why am I here?"),
    dict(id="b10", who="narr",    voice="bf_emma",   speed=1.08, gap=0.25, lang="en-gb",
         text="They thought he was joking. The ransom was paid, and Caesar sailed off, raised a fleet, and came straight back."),
    dict(id="b11", who="narr",    voice="bf_emma",   speed=1.08, gap=0.30, lang="en-gb",
         text="He caught every last pirate, took the silver back with interest, and kept his promise."),
    dict(id="b12", who="captain", voice="am_onyx",   speed=1.0,  gap=0.40, lang="en-us",
         text="Wait... he was serious?!"),
    dict(id="b13", who="narr",    voice="bf_emma",   speed=1.04, gap=0.35, lang="en-gb",
         text="Moral: if you kidnap a Roman, never undercharge."),
    dict(id="b14", who="caesar",  voice="bm_george", speed=1.02, gap=0.0,  lang="en-gb",
         text="Follow and subscribe, or I'll come back with a fleet."),
]
LEAD_IN, TAIL = 0.8, 2.0

kokoro = Kokoro(f"{MODELS}/kokoro-v1.0.onnx", f"{MODELS}/voices-v1.0.bin")
def letters(s): return sum(c.isalpha() for c in s)
def trim(x, thr=0.01):
    idx = np.where(np.abs(x) > thr)[0]
    return x if len(idx) == 0 else x[max(0, idx[0] - 240): idx[-1] + 480]
def up(x, sr): return x if sr == SR else resample_poly(x, SR // math.gcd(SR, sr), sr // math.gcd(SR, sr)).astype(np.float32)

voice_chunks, cursor = [], LEAD_IN
for b in BEATS:
    samples, sr = kokoro.create(b["text"], voice=b["voice"], speed=b["speed"], lang=b["lang"])
    x = up(trim(samples.astype(np.float32)), sr)
    x = np.clip(x * (0.105 / (np.sqrt(np.mean(x ** 2)) + 1e-9)), -0.98, 0.98)
    f = int(0.008 * SR); x[:f] *= np.linspace(0, 1, f); x[-f:] *= np.linspace(1, 0, f)
    b["start"], b["end"] = round(cursor, 3), round(cursor + len(x) / SR, 3)
    voice_chunks.append((b, x)); cursor = b["end"] + b["gap"]
    print(f'{b["id"]:>3} {b["who"]:8} {b["start"]:6.2f}-{b["end"]:6.2f}  {b["text"][:62]}')
DURATION = round(cursor + TAIL, 3); N = int(DURATION * SR)
voice = np.zeros(N, np.float32)
for b, x in voice_chunks:
    s = int(b["start"] * SR); voice[s:s + len(x)] += x[: N - s]

def envelope(x):
    hop = SR // FPS; n = len(x) // hop + 1
    env = np.array([np.sqrt(np.mean(x[i*hop:(i+1)*hop] ** 2) + 1e-12) if i * hop < len(x) else 0 for i in range(n)])
    env = np.clip(env / (np.percentile(env, 92) + 1e-9), 0, 1)
    return [round(float(v), 3) for v in np.convolve(env, [0.25, 0.5, 0.25], mode="same")]

def find_segments(b, x):
    sents = [s for s in re.split(r"(?<=[.!?])\s+", b["text"]) if s.strip()]; n = len(sents)
    if n == 1: return [(sents[0], b["start"], b["end"])]
    hop = int(0.01 * SR); e = np.array([np.sqrt(np.mean(x[i:i+hop] ** 2)) for i in range(0, len(x) - hop, hop)])
    quiet = e < 0.03 * np.sqrt(np.mean(x ** 2)); runs, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]: j += 1
            if j - i >= 5 and i > 5 and j < len(quiet) - 5: runs.append((j - i, i, j))
            i = j
        else: i += 1
    cuts = sorted(sorted(runs, reverse=True)[: n - 1], key=lambda r: r[1])
    if len(cuts) < n - 1:
        tot, acc, segs = max(1, letters(b["text"])), 0, []
        for s in sents:
            st = b["start"] + (b["end"] - b["start"]) * acc / tot; acc += letters(s)
            segs.append((s, st, b["start"] + (b["end"] - b["start"]) * acc / tot))
        return segs
    bounds = [(0, None)] + [(c[2] * .01, c[1] * .01) for c in cuts]
    return [(s, b["start"] + (bounds[k][0] if k else 0), b["start"] + (bounds[k+1][1] if k + 1 < n else len(x) / SR)) for k, s in enumerate(sents)]

for b, x in voice_chunks:
    b["env"] = envelope(x); b["segs"] = find_segments(b, x)
def B(i): return next(q for q in BEATS if q["id"] == i)
def wt(bid, phrase):
    for s, st, en in B(bid)["segs"]:
        i = s.lower().find(phrase.lower())
        if i >= 0: return st + (en - st) * letters(s[:i]) / max(1, letters(s))
    raise AssertionError((bid, phrase))

E = {
    "title_slam": 0.10,
    "cut1": B("b2")["start"] - 0.12, "cut2": B("b5")["start"] - 0.12, "cut3": B("b7")["start"] - 0.12,
    "cut4": B("b10")["start"] - 0.12, "cut5": B("b12")["start"] - 0.12, "cut6": B("b14")["start"] - 0.12,
    "ship_in":   wt("b1", "is sailing"),
    "pirates":   wt("b1", "when pirates"),
    "cannon":    wt("b1", "when pirates") + 0.35,
    "grab":      wt("b1", "grab him"),
    "ransom20":  B("b2")["start"] + 0.2,
    "capt_caves": B("b3b")["start"] + 0.1,
    "tiptoe":    B("b6b")["start"],
    "bb":        B("b9b")["start"],
    "fanfare":   B("b3")["start"] - 0.05,
    "gong":      wt("b3", "Do you know who"),
    "cross20":   wt("b3", "Make it fifty") + 0.05,
    "price50":   wt("b3", "fifty"),
    "jawdrop":   wt("b3", "fifty") + 0.35,
    "chart":     B("b4")["start"],
    "upwards":   wt("b4", "Upwards"),
    "days":      B("b5")["start"] + 0.2,
    "hostage":   wt("b5", "bossiest"),
    "nap":       B("b6")["start"] + 0.05,
    "clang":     B("b6")["end"] + 0.15,
    "games":     wt("b7", "He joined"),
    "poetry":    wt("b7", "read them"),
    "snore":     wt("b7", "When they didn"),
    "barbarians":wt("b7", "illiterate"),
    "laugh":     B("b9")["start"],
    "paid":      wt("b10", "The ransom"),
    "fleet":     wt("b10", "raised a fleet"),
    "back":      wt("b10", "came straight back"),
    "caught":    wt("b11", "caught every"),
    "silver":    wt("b11", "took the silver"),
    "promise":   wt("b11", "kept his promise"),
    "serious":   B("b12")["start"],
    "moral":     B("b13")["start"],
    "follow":    wt("b14", "Follow"),
    "subscribe": wt("b14", "subscribe"),
    "follow_click": wt("b14", "Follow") + 0.55,
    "sub_click": wt("b14", "subscribe") + 0.65,
    "threat":    wt("b14", "or I'll"),
    "fleet2":    wt("b14", "with a fleet"),
    "end_ding":  B("b14")["end"] + 0.25,
}
E = {k: round(v, 3) for k, v in E.items()}

# ------------------------------------------------------------------ sfx
rng = np.random.default_rng(3)
def tt(d): return np.arange(int(d * SR)) / SR
def lp(x, fc): return sosfilt(butter(2, fc, "lowpass", fs=SR, output="sos"), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], "bandpass", fs=SR, output="sos"), x)
def saw(f, d): t = tt(d); return 2 * ((np.cumsum(f * np.ones_like(t)) / SR) % 1) - 1
def sfx_ding():
    t = tt(1.4); return (np.sin(2*np.pi*1568*t) + .5*np.sin(2*np.pi*3136*t) + .25*np.sin(2*np.pi*4700*t)) * np.exp(-3.2*t) * .5
def sfx_pop():
    t = tt(0.18); return np.sin(2*np.pi*np.cumsum(700*np.exp(-14*t)+140)/SR) * np.exp(-22*t) * .8
def sfx_whoosh(d=0.45):
    n = rng.standard_normal(int(d*SR)); t = np.linspace(0, 1, len(n)); fc = 600 + 5000 * t; out = np.zeros_like(n); y = 0.0
    for i in range(len(n)):
        y += (1 - math.exp(-2*math.pi*fc[i]/SR)) * (n[i] - y); out[i] = y
    return out * np.sin(np.pi * t) ** 1.5 * 1.6
def sfx_boom():
    t = tt(1.1); body = np.sin(2*np.pi*np.cumsum(90*np.exp(-5*t)+38)/SR) * np.exp(-4.5*t)
    return (body + lp(rng.standard_normal(len(t)), 900) * np.exp(-6*t) * .9) * .95
def sfx_splash():
    t = tt(0.7); return bp(rng.standard_normal(len(t)), 500, 6000) * np.exp(-5*t) * np.minimum(1, t/0.02) * .7
def sfx_gong():
    t = tt(2.2); return sum(np.sin(2*np.pi*f*t + k) * a for k, (f, a) in enumerate([(196, 1), (311, .6), (437, .45), (580, .3), (871, .2)])) * np.exp(-1.6*t) * .35
def sfx_fanfare():
    d = 1.1; out = np.zeros(int(d*SR))
    for at, f, ln in [(0, 392, .16), (.18, 392, .16), (.36, 523, .7)]:
        t = tt(ln); y = sum(saw(f * h, ln) / h for h in (1, 2)) * (np.minimum(1, t/0.02) * np.exp(-1.8*np.maximum(0, t-.1)))
        i = int(at*SR); out[i:i+len(y)] += lp(y, 3500)
    return out * .28
def sfx_coin(n=7):
    out = np.zeros(int(1.3*SR))
    for k in range(n):
        at = k * 0.075 + rng.random() * .03; t = tt(.35); f = 2400 + rng.random() * 1500
        y = (np.sin(2*np.pi*f*t) + .4 * np.sin(2*np.pi*f*1.5*t)) * np.exp(-14*t) * .35; i = int(at*SR); out[i:i+len(y)] += y
    return out
def sfx_boing():
    t = tt(0.6); return np.sin(2*np.pi*np.cumsum(220+120*np.sin(2*np.pi*9*t)*np.exp(-4*t)+300*np.exp(-6*t))/SR) * np.exp(-5*t) * .5
def sfx_scratch():
    t = tt(0.55); f = 900 + 500*np.sin(2*np.pi*5*t) - 700*t; s = 2*((np.cumsum(f)/SR) % 1) - 1
    return (s*.4 + bp(rng.standard_normal(len(t)), 800, 5000)*.5) * np.sin(np.pi*t/.55)**.5 * .5
def sfx_snore(d=2.4):
    t = tt(d); n = lp(rng.standard_normal(len(t)), 500) + .6 * saw(95 * np.ones_like(t), d) * .3
    return lp(n, 900) * (0.5 + 0.5 * np.sin(2*np.pi*.9*t - 1.5)) ** 2 * .55
def sfx_clang():
    t = tt(0.9); return sum(np.sin(2*np.pi*f*t) * a for f, a in [(640, 1), (1010, .7), (1720, .5), (2390, .3)]) * np.exp(-6*t) * .35
def sfx_cell():
    t = tt(0.9); return (sfx_clang()[:len(t)] * .9 + np.sin(2*np.pi*(80*np.exp(-9*t)+50)*t) * np.exp(-12*t))
def sfx_sting():
    t = tt(1.4); return lp(sum(saw(f, 1.4) for f in (82.4, 87.3, 123.5)) * np.exp(-1.6*t) * np.minimum(1, t/.03), 1800) * .22
def sfx_cheer(d=2.0):
    n = bp(rng.standard_normal(int(d*SR)), 500, 3500); t = tt(d)
    return n * (.55 + .45*np.abs(np.sin(2*np.pi*13*t + 2*np.sin(2*np.pi*3.1*t)))) * np.minimum(1, t/.15) * np.exp(-.9*t) * 1.2
def sfx_scribble(d=0.8):
    t = tt(d); return bp(rng.standard_normal(len(t)), 2500, 7000) * (np.sin(2*np.pi*9*t) > -.3) * .3 * np.minimum(1, (d-t)/.1)
def sfx_thud():
    t = tt(0.3); return np.sin(2*np.pi*(70*np.exp(-8*t)+40)*t) * np.exp(-11*t) * .9
def sfx_click():
    t = tt(0.12); return (np.sin(2*np.pi*1800*t) * np.exp(-60*t) + bp(rng.standard_normal(len(t)), 2000, 9000) * np.exp(-90*t)) * .6
def sfx_bell(d=1.8):
    t = tt(d); return sum(np.sin(2*np.pi*f*t) * a for f, a in [(1320, 1), (1980, .55), (2640, .35), (3960, .2)]) * np.exp(-2.6*t) * (1 + .25*np.sin(2*np.pi*9*t)) * .35
def sfx_horn(d=1.6):
    t = tt(d); y = sum(saw(f, d) for f in (233, 233.6, 349.5)) / 3 * np.minimum(1, t/.05) * np.exp(-1.2*np.maximum(0, t-.5)); return lp(y, 2200) * .32

sfx = np.zeros(N, np.float32)
def put(at, snd, g=1.0):
    i = int(at * SR)
    if 0 <= i < N: seg = (snd * g).astype(np.float32); sfx[i:i+len(seg)] += seg[:N-i]
for c in ("cut1", "cut2", "cut3", "cut4", "cut5", "cut6"): put(E[c] - 0.2, sfx_whoosh(0.5), .5)
put(E["title_slam"], sfx_thud(), 1.2); put(E["title_slam"] + .02, sfx_pop(), .6)
put(E["ship_in"], sfx_horn(), .8)
put(E["cannon"], sfx_boom(), 1.0); put(E["cannon"] + .5, sfx_splash(), .7); put(E["grab"], sfx_pop(), .8)
put(E["ransom20"], sfx_pop(), .7)
put(E["capt_caves"] + .8, sfx_pop(), .7); put(E["tiptoe"], sfx_pop(), .5); put(E["bb"], sfx_pop(), .6)
put(E["fanfare"], sfx_fanfare(), 1.0); put(E["gong"], sfx_gong(), .9)
put(E["cross20"], sfx_scratch(), .6); put(E["price50"], sfx_coin(9), .9); put(E["jawdrop"], sfx_boing(), .8)
put(E["chart"] + .1, sfx_scribble(.9), .6); put(E["upwards"], sfx_ding(), .6)
put(E["days"], sfx_pop(), .6)
put(E["nap"] + .1, sfx_snore(1.8), .6); put(E["clang"], sfx_clang(), 1.0)
put(E["poetry"], sfx_pop(), .6); put(E["snore"], sfx_snore(2.4), .8); put(E["barbarians"], sfx_gong(), .5)
put(E["paid"], sfx_coin(12), .9); put(E["fleet"], sfx_fanfare(), .8); put(E["back"], sfx_horn(1.2), .6)
put(E["caught"], sfx_splash(), .8); put(E["silver"], sfx_coin(10), .9); put(E["promise"], sfx_cell(), 1.0)
put(E["serious"], sfx_sting(), 1.0); put(E["moral"] - 0.05, sfx_pop(), .8)
put(E["follow"], sfx_pop(), .7); put(E["follow_click"], sfx_click(), 1.0); put(E["follow_click"] + .05, sfx_ding(), .5)
put(E["subscribe"], sfx_pop(), .7); put(E["sub_click"], sfx_click(), 1.0); put(E["sub_click"] + .12, sfx_bell(), .9)
put(E["fleet2"], sfx_fanfare(), .7)
put(E["end_ding"], sfx_ding(), .8)

# ------------------------------------------------------------------ sea ambience
sea = lp(rng.standard_normal(N), 700) * (0.5 + 0.5 * np.sin(2*np.pi*np.arange(N)/SR/6.5 - 1)) ** 1.5 * .5
sea = (sea + lp(rng.standard_normal(N), 300) * .3).astype(np.float32); sea *= .09 / (np.max(np.abs(sea)) + 1e-9) * 6

# ------------------------------------------------------------------ music: pirate waltz (3/4, D minor)
BPM = 150; beat = 60 / BPM
def midi(n): return 440 * 2 ** ((n - 69) / 12)
def pluck(f, d, a=1.0, br=1.0):
    t = tt(d); return (np.sin(2*np.pi*f*t) + .5*br*np.sin(2*np.pi*2*f*t) + .2*br*np.sin(2*np.pi*3*f*t)) * np.exp(-8*t) * a
def squeeze(f, d, a=1.0):   # accordion-ish chord stab
    t = tt(d); y = sum(saw(f * k, d) for k in (1, 1.004)) / 2; return lp(y, 2400) * np.minimum(1, t/.01) * np.exp(-7*t) * a
def fiddle(f, d, a=1.0):
    t = tt(d); vib = 1 + .006*np.sin(2*np.pi*5.5*t); y = saw(f * vib, d); return lp(y, 3200) * np.minimum(1, t/.04) * np.minimum(1, (d-t)/.06) * a
music = np.zeros(N, np.float32)
chords = [(38, [62, 65, 69]), (38, [62, 65, 69]), (43, [62, 67, 70]), (45, [61, 64, 69]), (38, [62, 65, 69]), (36, [60, 64, 67]), (41, [60, 65, 69]), (45, [61, 64, 69])]
mel = [74, 77, 76, 74, 72, 74, 77, 79, 77, 76, 74, 72, 69, 72, 74, 69]   # looping tune, one note per beat pair
nbars = int(DURATION / (3 * beat)) + 1
def add(snd, at):
    i = int(at * SR)
    if 0 <= i < N: music[i:i+len(snd)] += snd[:N-i]
for bar in range(nbars):
    t0 = bar * 3 * beat; root, ch = chords[bar % len(chords)]
    add(pluck(midi(root), .45, 1.0, .6), t0)
    for k in (1, 2):
        for n in ch: add(squeeze(midi(n), .22, .09), t0 + k * beat)
    for k in range(3):
        idx = (bar * 3 + k) % len(mel)
        if (bar // 2) % 2 == 0 or k != 1: add(fiddle(midi(mel[idx]), beat * .92, .13), t0 + k * beat)
music = lp(music, 6500); music *= .55 / (np.max(np.abs(music)) + 1e-9)
venv = np.convolve(np.abs(voice), np.ones(int(.06*SR)) / int(.06*SR), mode="same")
duck = np.convolve(1 - .65 * np.clip(venv / .08, 0, 1), np.ones(int(.12*SR)) / int(.12*SR), mode="same")
music *= duck * np.minimum(1, np.arange(N) / (.4*SR)) * np.minimum(1, (N - np.arange(N)) / (1.4*SR))

mix = voice + sfx * .55 + music * .32 + sea
pk = np.max(np.abs(mix)); mix = mix * (.92 / pk) if pk > .92 else mix
sf.write(f"{OUT}/audio.wav", mix, SR, subtype="PCM_16")
beats_out = [{k: v for k, v in b.items() if k != "segs"} | {"segs": [[s, round(a, 3), round(c, 3)] for s, a, c in b["segs"]]} for b in BEATS]
json.dump({"fps": FPS, "duration": DURATION, "beats": beats_out, "events": E}, open(f"{OUT}/timeline.json", "w"))
print("duration", DURATION); print(json.dumps(E))
