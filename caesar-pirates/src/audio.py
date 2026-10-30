"""Narration (Kokoro, cast + directed), SFX, sea ambience, pirate-waltz music and master timeline.

usage: python3 -I audio.py <models_dir> <out_dir>   ->  <out_dir>/audio.wav, <out_dir>/timeline.json
Every line is synthesised phrase by phrase (so each phrase has an exact start time) with its own
speed/pause "direction", then run through a per-character voice chain (pitch/body, rasp, warmth, room).
"""
import json, sys, re, math
from fractions import Fraction
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly, butter, sosfilt, fftconvolve
from kokoro_onnx import Kokoro

MODELS, OUT = sys.argv[1], sys.argv[2]
SR, FPS = 48000, 30
rngv = np.random.default_rng(21)

# ------------------------------------------------------------------ casting
# v: voice name or (nameA, wA, nameB, wB) blend;  f: pitch/body factor (<1 deeper & bigger);  rasp: gravel;  wet: room echo
CAST = {
    "narr":       dict(v="af_heart", f=1.00, rasp=0.0, noise=0.0, warm=0.10, wet=0.00, lang="en-us"),
    "caesar":     dict(v=("am_michael", .55, "bm_george", .45), f=0.95, rasp=0.0, noise=0.0, warm=0.30, wet=0.10, lang="en-gb"),
    "captain":    dict(v="am_onyx", f=0.86, rasp=2.2, noise=0.018, warm=0.25, wet=0.0, lang="en-us"),
    "bald":       dict(v="am_fenrir", f=0.97, rasp=1.4, noise=0.01, warm=0.10, wet=0.0, lang="en-us"),
    "skinny":     dict(v="am_puck", f=1.22, rasp=0.0, noise=0.0, warm=0.0, wet=0.0, lang="en-us"),
    "blackbeard": dict(v=("am_onyx", .6, "am_fenrir", .4), f=0.74, rasp=3.2, noise=0.022, warm=0.35, wet=0.16, lang="en-us"),
}
# phrase = (text, speed, pause_after)   -- "laugh" = overlapping pirate crowd laughter
BEATS = [
    dict(id="b1", who="narr", cast="narr", ph=[("Seventy-five B.C.", 1.1, .15), ("Young Julius Caesar is off to Rhodes, to study public speaking.", 1.15, .2), ("Then, pirates show up.", 1.05, .35), ("Awkward.", .88, 0)], gap=.62),
    dict(id="b2", who="captain", cast="captain", ph=[("Arr!", 1.0, .1), ("We be wantin' twenty talents o' silver!", 1.02, 0)], gap=.2),
    dict(id="b3", who="caesar", cast="caesar", ph=[("Twenty?!", .95, .25), ("Do you have ANY idea who I am?", 1.0, .3), ("Make it... fifty.", .92, 0)], gap=.25),
    dict(id="b3b", who="captain", cast="captain", ph=[("F-fifty?!", 1.0, .2), ("Aye. Fifty it is, then.", 1.0, 0)], gap=.25),
    dict(id="b4", who="narr", cast="narr", ph=[("Yes.", 1.0, .3), ("The hostage raised his own ransom.", 1.12, 0)], gap=.25),
    dict(id="b5", who="narr", cast="narr", ph=[("For thirty-eight days, while his friends raised the silver,", 1.22, .15), ("Caesar was the pirates' most demanding guest.", 1.14, 0)], gap=.25),
    dict(id="b6", who="caesar", cast="caesar", ph=[("Shh!", 1.0, .2), ("Some of us are trying to nap.", 1.0, 0)], gap=.25),
    dict(id="b6b", who="narr", cast="narr", ph=[("The pirates actually tiptoed.", 1.08, 0)], gap=.22),
    dict(id="b7", who="narr", cast="narr", ph=[("He read them his poetry.", 1.15, .2), ("When they didn't applaud,", 1.15, .2), ("he called them illiterate barbarians.", 1.12, 0)], gap=.22),
    dict(id="b8", who="caesar", cast="caesar", ph=[("Oh, and when this is over,", 1.0, .25), ("I'll have every one of you... crucified.", .9, 0)], gap=.22),
    dict(id="b9", who="pirate", cast="captain", ph=["laugh", ("Oh, ye be a funny one, lad!", 1.02, 0)], gap=.25),
    dict(id="b9b", who="blackbeard", cast="blackbeard", ph=[("I'm from seventeen eighteen.", .95, .3), ("Why am I here?", .9, 0)], gap=.25),
    dict(id="b10", who="narr", cast="narr", ph=[("They thought he was joking.", 1.12, .3), ("The ransom was paid,", 1.15, .1), ("and Caesar sailed off, raised a fleet,", 1.18, .1), ("and came straight back.", 1.1, 0)], gap=.22),
    dict(id="b11", who="narr", cast="narr", ph=[("He caught every last pirate,", 1.12, .15), ("took the silver back, with interest,", 1.12, .15), ("and kept his promise.", 1.05, 0)], gap=.25),
    dict(id="b12", who="captain", cast="captain", ph=[("Wait...", .85, .3), ("he was serious?!", 1.05, 0)], gap=.3),
    dict(id="b13", who="narr", cast="narr", ph=[("Moral:", 1.05, .22), ("if you kidnap a Roman, never undercharge.", 1.08, 0)], gap=.3),
    dict(id="b14", who="caesar", cast="caesar", ph=[("Follow... and subscribe,", 1.0, .3), ("or I'll come back with a fleet.", .95, 0)], gap=0),
]
LEAD_IN, TAIL = 0.8, 1.7

kokoro = Kokoro(f"{MODELS}/kokoro-v1.0.onnx", f"{MODELS}/voices-v1.0.bin")
def letters(s): return sum(c.isalpha() for c in s)
def trim(x, thr=0.01):
    idx = np.where(np.abs(x) > thr)[0]
    return x if len(idx) == 0 else x[max(0, idx[0] - 200): idx[-1] + 400]
def to48(x, sr): return x if sr == SR else resample_poly(x, SR // math.gcd(SR, sr), sr // math.gcd(SR, sr)).astype(np.float32)
def lowp(x, fc): return sosfilt(butter(2, fc, "lowpass", fs=SR, output="sos"), x)
def highp(x, fc): return sosfilt(butter(2, fc, "highpass", fs=SR, output="sos"), x)
def voice_style(v):
    return kokoro.get_voice_style(v) if isinstance(v, str) else v[1] * kokoro.get_voice_style(v[0]) + v[3] * kokoro.get_voice_style(v[2])
def varispeed(x, f):                      # f<1: lower pitch + bigger body (and longer); we pre-compensate speed
    r = Fraction(1 / f).limit_denominator(40)
    return resample_poly(x, r.numerator, r.denominator).astype(np.float32), float(1 / r)
def reverb(x, wet):
    t = np.arange(int(.45 * SR)) / SR; ir = rngv.standard_normal(len(t)) * np.exp(-t * 9); ir[0] = 1
    ir = lowp(ir, 5000); y = fftconvolve(x, ir * .06)[:len(x)]
    return (1 - wet) * x + wet * 3.0 * y
def chain(x, c):
    if c["rasp"] > 0:
        d = c["rasp"]; x = .45 * x + .55 * np.tanh(x * d * 4) / np.tanh(d * 4) * (np.max(np.abs(x)) + 1e-9)
        x = x + highp(rngv.standard_normal(len(x)), 1800) * np.abs(x) * c["noise"] * 6
    if c["warm"] > 0: x = x + lowp(x, 260) * c["warm"] * 2.2
    if c["wet"] > 0: x = reverb(x, c["wet"])
    return x.astype(np.float32)
def say(text, cast, sp):
    c = CAST[cast]; f = c["f"]
    r = Fraction(1 / f).limit_denominator(40); f_eff = float(1 / r)
    s, sr = kokoro.create(text, voice=voice_style(c["v"]), speed=float(np.clip(1.07 * sp / f_eff, .5, 2.0)), lang=c["lang"])
    x = to48(trim(s.astype(np.float32)), sr)
    if abs(f - 1) > .005: x, _ = varispeed(x, f)
    return chain(x, c)
def laugh_crowd():
    parts = []
    for cast, text, sp, at in (("captain", "Ha ha ha ha ha!", 1.15, 0.0), ("bald", "Har har har har!", 1.2, .11), ("skinny", "Hee hee ha ha ha!", 1.2, .2)):
        parts.append((say(text, cast, sp) * (1.0 if cast != "skinny" else .8), at))
    n = int(max(at * SR + len(x) for x, at in parts)); out = np.zeros(n, np.float32)
    for x, at in parts: out[int(at * SR): int(at * SR) + len(x)] += x
    return out

voice_chunks, cursor = [], LEAD_IN
for b in BEATS:
    xs, segs, t0 = [], [], 0.0
    for p in b["ph"]:
        if p == "laugh":
            x = laugh_crowd(); text = "Ha ha ha!"; pause = .12
        else:
            text, sp, pause = p; x = say(text, b["cast"], sp)
        segs.append((text, t0, t0 + len(x) / SR)); xs += [x, np.zeros(int(pause * SR), np.float32)]; t0 += len(x) / SR + pause
    x = np.concatenate(xs[:-1]) if xs else np.zeros(1, np.float32)
    voiced = np.abs(x) > 0.01; rms = np.sqrt(np.mean(x[voiced] ** 2) + 1e-9)
    x = np.clip(x * (0.105 / rms), -0.98, 0.98); f_ = int(.006 * SR); x[:f_] *= np.linspace(0, 1, f_); x[-f_:] *= np.linspace(1, 0, f_)
    b["start"], b["end"] = round(cursor, 3), round(cursor + len(x) / SR, 3)
    b["segs"] = [(s, round(cursor + a, 3), round(cursor + e, 3)) for s, a, e in segs]
    b["text"] = " ".join(s for s, _, _ in segs); b["voice"] = b["cast"]
    voice_chunks.append((b, x)); cursor = b["end"] + b["gap"]
    print(f'{b["id"]:>3} {b["who"]:10} {b["start"]:6.2f}-{b["end"]:6.2f}  {b["text"][:60]}')
DURATION = round(cursor + TAIL, 3); N = int(DURATION * SR)
voice = np.zeros(N, np.float32)
for b, x in voice_chunks:
    s = int(b["start"] * SR); voice[s:s + len(x)] += x[: N - s]

# lip-sync tracks: mouth opening (loudness) and width (spectral brightness: "ee" wide, "oo" round)
def tracks(x):
    hop = SR // FPS; n = len(x) // hop + 1; env = np.zeros(n); cen = np.zeros(n); fr = np.fft.rfftfreq(2 * hop, 1 / SR)
    for i in range(n):
        seg = x[i * hop: i * hop + 2 * hop]
        if len(seg) < 2 * hop: seg = np.pad(seg, (0, 2 * hop - len(seg)))
        sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))); env[i] = np.sqrt(np.mean(seg[:hop] ** 2) + 1e-12)
        cen[i] = (fr * sp).sum() / (sp.sum() + 1e-9)
    env = np.clip(env / (np.percentile(env, 92) + 1e-9), 0, 1); env = np.convolve(env, [.25, .5, .25], mode="same")
    v = env > .08; lo, hi = (np.percentile(cen[v], 15), np.percentile(cen[v], 85)) if v.sum() > 4 else (500, 2000)
    mw = np.clip((cen - lo) / (hi - lo + 1e-9), 0, 1); mw = np.convolve(mw, [.25, .5, .25], mode="same")
    return [round(float(a), 3) for a in env], [round(float(a), 2) for a in mw]
for b, x in voice_chunks: b["env"], b["mw"] = tracks(x)

def B(i): return next(q for q in BEATS if q["id"] == i)
def PH(bid, k): s, a, e = B(bid)["segs"][k]; return a, e
def wt(bid, phrase):
    for s, a, e in B(bid)["segs"]:
        i = s.lower().find(phrase.lower())
        if i >= 0: return a + (e - a) * letters(s[:i]) / max(1, letters(s))
    raise AssertionError((bid, phrase))

E = {
    "title_slam": 0.10,
    "cut1": B("b2")["start"] - 0.12, "cut2": B("b5")["start"] - 0.12, "cut3": B("b7")["start"] - 0.12,
    "cut4": B("b10")["start"] - 0.12, "cut5": B("b12")["start"] - 0.12, "cut6": B("b14")["start"] - 0.12,
    "ship_in": PH("b1", 1)[0],
    "pirates": PH("b1", 2)[0],
    "cannon": PH("b1", 2)[0] + 0.55,
    "grab": PH("b1", 3)[0] - 0.1,
    "ransom20": PH("b2", 1)[0],
    "fanfare": B("b3")["start"] - 0.05,
    "gong": PH("b3", 1)[0],
    "cross20": PH("b3", 2)[0] + 0.05,
    "price50": wt("b3", "fifty"),
    "jawdrop": B("b3")["end"] - 0.05,
    "capt_caves": PH("b3b", 1)[0],
    "chart": B("b4")["start"],
    "upwards": PH("b4", 1)[0] + 0.45,
    "days": B("b5")["start"] + 0.2,
    "hostage": wt("b5", "most demanding"),
    "nap": B("b6")["start"] + 0.05,
    "clang": B("b6")["end"] + 0.15,
    "tiptoe": B("b6b")["start"],
    "games": B("b7")["start"], "poetry": PH("b7", 0)[0], "snore": PH("b7", 1)[0], "barbarians": PH("b7", 2)[0] + .12,
    "threat": PH("b8", 1)[0],
    "laugh": B("b9")["start"],
    "bb": B("b9b")["start"],
    "paid": PH("b10", 1)[0], "fleet": wt("b10", "raised a fleet"), "back": PH("b10", 3)[0],
    "caught": PH("b11", 0)[0], "silver": PH("b11", 1)[0], "promise": PH("b11", 2)[0],
    "serious": B("b12")["start"],
    "moral": B("b13")["start"],
    "follow": B("b14")["start"], "subscribe": wt("b14", "subscribe"),
    "follow_click": B("b14")["start"] + 0.55, "sub_click": wt("b14", "subscribe") + 0.55,
    "cta_threat": PH("b14", 1)[0], "fleet2": wt("b14", "with a fleet"),
    "end_ding": B("b14")["end"] + 0.25,
}
E = {k: round(v, 3) for k, v in E.items()}
print(json.dumps(E))

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
