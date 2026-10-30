"""Builds narration (Kokoro), SFX, music bed and the master timeline for the stickman video.

usage: python3 -I audio.py <models_dir> <out_dir>
writes <out_dir>/audio.wav (48 kHz stereo-ready mono mix) and <out_dir>/timeline.json
"""
import json, sys, re, math
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly, butter, sosfilt
from kokoro_onnx import Kokoro

MODELS, OUT = sys.argv[1], sys.argv[2]
SR = 48000
FPS = 30

# ---------------------------------------------------------------- script
# {Word|ipa} => hand-tuned pronunciation for names espeak gets wrong
BEATS = [
    dict(id="b1",  who="narr",     voice="bm_george", speed=1.1, gap=0.35,
         text="Nineteen fifty-two. Albert Einstein, the smartest man alive, is about to get the weirdest job offer ever."),
    dict(id="b2",  who="narr",     voice="bm_george", speed=1.1, gap=0.30,
         text="Israel's first president, {Weizmann|vˈaɪtsmən}, has just passed away. Prime Minister {Ben-Gurion|bɛn ɡˈʊɹiən} needs a replacement. Fast."),
    dict(id="b3",  who="gurion",   voice="am_onyx",   speed=1.02, gap=0.25,
         text="Someone famous. Someone brilliant. Not Elvis. Einstein!"),
    dict(id="b4",  who="narr",     voice="bm_george", speed=1.1, gap=0.25,
         text="So he sends ambassador {Abba Eban|ˈɑːbə ˈɛbən} to Princeton, with a very official letter."),
    dict(id="b5",  who="eban",     voice="bm_daniel", speed=1.0,  gap=0.20,
         text="Professor Einstein, would you like to be President of Israel?"),
    dict(id="b6",  who="einstein", voice="am_puck",   speed=1.0,  gap=0.35,
         text="Me? I don't even wear socks!"),
    dict(id="b7",  who="narr",     voice="bm_george", speed=1.1, gap=0.20,
         text="He declined in writing: he lacked the experience to deal properly with people."),
    dict(id="b8",  who="einstein", voice="am_puck",   speed=1.0,  gap=0.45,
         text="Translation: have you met me?"),
    dict(id="b9",  who="narr",     voice="bm_george", speed=1.1, gap=0.25,
         text="{Ben-Gurion|bɛn ɡˈʊɹiən} was reportedly relieved. He'd said: if Einstein accepts, we're in trouble."),
    dict(id="b10", who="gurion",   voice="am_onyx",   speed=1.0,  gap=0.35,
         text="Phew!"),
    dict(id="b11", who="narr",     voice="bm_george", speed=1.1, gap=0.20,
         text="Einstein supposedly explained: politics is for the present, but an equation is for eternity."),
    dict(id="b12", who="newton",   voice="bm_fable",  speed=1.0,  gap=0.45,
         text="Politics? I'd rather be hit by an apple."),
    dict(id="b13", who="narr",     voice="bm_george", speed=1.1, gap=0.45,
         text="The job went to {Yitzhak Ben-Zvi|jˈɪtsχˌɑːk bɛn zvˈi}, who accepted, and presumably owned socks."),
    dict(id="b14", who="narr",     voice="bm_george", speed=1.0,  gap=0.0,
         text="Moral: genius is knowing what you're bad at."),
]
LEAD_IN = 0.8      # seconds of music/title before first line
TAIL = 1.3         # seconds after the last line

kokoro = Kokoro(f"{MODELS}/kokoro-v1.0.onnx", f"{MODELS}/voices-v1.0.bin")

def to_phonemes(text):
    parts, last = [], 0
    for m in re.finditer(r"\{([^|}]+)\|([^}]+)\}", text):
        pre = text[last:m.start()]
        if pre.strip():
            parts.append(kokoro.tokenizer.phonemize(pre, "en-us"))
        parts.append(m.group(2))
        last = m.end()
    tail = text[last:]
    if tail.strip():
        parts.append(kokoro.tokenizer.phonemize(tail, "en-us"))
    out = ""
    for p in parts:
        if out and not re.match(r"^[\s,.;:!?]", p):
            out += " "
        out += p
    return out

def plain(text):
    return re.sub(r"\{([^|}]+)\|[^}]+\}", r"\1", text)

def trim(x, thr=0.01):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x
    return x[max(0, idx[0] - 240): idx[-1] + 480]

def up(x, sr):
    return resample_poly(x, SR // math.gcd(SR, sr), sr // math.gcd(SR, sr)).astype(np.float32) if sr != SR else x

# ---------------------------------------------------------------- narration
voice_chunks = []
cursor = LEAD_IN
for b in BEATS:
    ph = to_phonemes(b["text"])
    samples, sr = kokoro.create(ph, voice=b["voice"], speed=b["speed"], lang="en-us", is_phonemes=True)
    x = up(trim(samples.astype(np.float32)), sr)
    rms = np.sqrt(np.mean(x ** 2) + 1e-9)
    x = x * (0.105 / rms)                       # even loudness across voices
    x = np.clip(x, -0.98, 0.98)
    fade = int(0.008 * SR)
    x[:fade] *= np.linspace(0, 1, fade); x[-fade:] *= np.linspace(1, 0, fade)
    b["start"] = round(cursor, 3)
    b["end"] = round(cursor + len(x) / SR, 3)
    b["display"] = plain(b["text"])
    voice_chunks.append((b, x))
    print(f'{b["id"]:>3} {b["who"]:8} {b["start"]:6.2f}-{b["end"]:6.2f}  {b["display"][:60]}')
    cursor = b["end"] + b["gap"]
DURATION = round(cursor + TAIL, 3)
N = int(DURATION * SR)

voice = np.zeros(N, np.float32)
for b, x in voice_chunks:
    s = int(b["start"] * SR)
    voice[s:s + len(x)] += x[: N - s]

# mouth envelopes per beat, one value per video frame
def envelope(x):
    hop = SR // FPS
    n = len(x) // hop + 1
    env = np.array([np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2) + 1e-12) if i * hop < len(x) else 0 for i in range(n)])
    env = env / (np.percentile(env, 92) + 1e-9)
    env = np.clip(env, 0, 1)
    # light smoothing so the mouth flaps instead of buzzing
    k = np.array([0.25, 0.5, 0.25]); env = np.convolve(env, k, mode="same")
    return [round(float(v), 3) for v in env]
for b, x in voice_chunks:
    b["env"] = envelope(x)

# --- word timing: sentences are anchored to real silences in the audio, words by letter share
def letters(s): return sum(c.isalpha() for c in s)
def find_segments(b, x):
    sents = [s for s in re.split(r"(?<=[.!?])\s+", b["display"]) if s.strip()]
    n = len(sents)
    if n == 1:
        return [(sents[0], b["start"], b["end"])]
    hop = int(0.01 * SR); e = np.array([np.sqrt(np.mean(x[i:i+hop] ** 2)) for i in range(0, len(x) - hop, hop)])
    quiet = e < 0.03 * np.sqrt(np.mean(x ** 2)); runs = []; i = 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]: j += 1
            if j - i >= 5 and i > 5 and j < len(quiet) - 5: runs.append((j - i, i, j))
            i = j
        else: i += 1
    cuts = sorted(sorted(runs, reverse=True)[: n - 1], key=lambda r: r[1])
    if len(cuts) < n - 1:                      # no clear pause -> split by letter share
        tot, acc, segs = max(1, letters(b["display"])), 0, []
        for s in sents:
            st = b["start"] + (b["end"] - b["start"]) * acc / tot; acc += letters(s)
            segs.append((s, st, b["start"] + (b["end"] - b["start"]) * acc / tot))
        return segs
    bounds = [(0, None)] + [(c[2] * 0.01, c[1] * 0.01) for c in cuts]   # (voiced start, previous voiced end)
    segs = []
    for k, s in enumerate(sents):
        st = b["start"] + (bounds[k][0] if k else 0)
        en = b["start"] + (bounds[k + 1][1] if k + 1 < n else len(x) / SR)
        segs.append((s, st, en))
    return segs
for b, x in voice_chunks:
    b["segs"] = find_segments(b, x)
def wt(bid, phrase):
    b = next(q for q in BEATS if q["id"] == bid)
    for s, st, en in b["segs"]:
        i = s.lower().find(phrase.lower())
        if i >= 0:
            return st + (en - st) * letters(s[:i]) / max(1, letters(s))
    raise AssertionError((bid, phrase))
def B(bid): return next(q for q in BEATS if q["id"] == bid)

# ---------------------------------------------------------------- events (shared with the animation)
E = {
    "title_slam":  0.10,
    # scene cuts (slide transitions are centred on these)
    "cut1": B("b2")["start"] - 0.12,
    "cut2": B("b4")["start"] - 0.12,
    "cut3": B("b7")["start"] + 0.25,
    "cut4": B("b9")["start"] + 0.40,
    "cut5": B("b11")["start"] - 0.12,
    "cut6": B("b13")["start"] + 0.40,
    "b2_float":    B("b2")["start"] + 1.3,
    "sign_drop":   wt("b2", "needs a replacement"),
    "star":        B("b3")["start"],
    "brain":       B("b3")["segs"][1][1],
    "elvis":       B("b3")["segs"][2][1],
    "elvis_x":     B("b3")["segs"][2][1] + 0.38,
    "ding":        B("b3")["segs"][3][1] + 0.02,
    "sock_reveal": wt("b6", "socks") - 0.25,
    "stamp":       B("b8")["start"] - 0.05,
    "rimshot":     B("b8")["end"] + 0.04,
    "phew":        B("b10")["start"] + 0.05,
    "e_chalk":     wt("b11", "equation") - 0.2,
    "forever":     wt("b11", "eternity"),
    "apple_fall":  wt("b12", "apple") + 0.20,
    "apple_hit":   wt("b12", "apple") + 0.55,
    "cheer":       wt("b13", "accepted"),
    "sock_ben":    wt("b13", "owned socks") - 0.1,
    "end_ding":    B("b14")["end"] + 0.15,
}
for k in list(E): E[k] = round(E[k], 3)

# ---------------------------------------------------------------- SFX synthesis
rng = np.random.default_rng(7)
def tt(d): return np.arange(int(d * SR)) / SR
def env_exp(d, k): return np.exp(-k * tt(d))
def lp(x, fc): return sosfilt(butter(2, fc, "lowpass", fs=SR, output="sos"), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], "bandpass", fs=SR, output="sos"), x)

def sfx_ding():
    t = tt(1.4); return (np.sin(2*np.pi*1568*t) + 0.5*np.sin(2*np.pi*3136*t) + 0.25*np.sin(2*np.pi*4700*t)) * np.exp(-3.2*t) * 0.5
def sfx_pop():
    t = tt(0.18); f = 700 * np.exp(-14 * t) + 140
    return np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-22*t) * 0.8
def sfx_whoosh(d=0.45, up_=True):
    n = rng.standard_normal(int(d*SR)); t = np.linspace(0, 1, len(n))
    fc = (600 + 5000 * t) if up_ else (5600 - 5000 * t)
    out = np.zeros_like(n); y = 0.0
    for i in range(len(n)):
        a = 1 - math.exp(-2*math.pi*fc[i]/SR); y += a * (n[i] - y); out[i] = y
    return out * np.sin(np.pi * t) ** 1.5 * 1.6
def sfx_stamp():
    t = tt(0.3); thump = np.sin(2*np.pi*(90*np.exp(-9*t)+45)*t) * np.exp(-14*t)
    return (thump + lp(rng.standard_normal(len(t)), 2500) * np.exp(-40*t) * 0.6) * 0.9
def sfx_slide(down=True, d=0.7):
    t = tt(d); f = (1500 - 1100 * t / d) if down else (500 + 1100 * t / d)
    vib = 1 + 0.02*np.sin(2*np.pi*7*t)
    return np.sin(2*np.pi*np.cumsum(f*vib)/SR) * np.sin(np.pi*np.clip(t/d,0,1))**0.6 * 0.35
def sfx_boing():
    t = tt(0.6); f = 220 + 120*np.sin(2*np.pi*9*t) * np.exp(-4*t) + 300*np.exp(-6*t)
    return np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-5*t) * 0.5
def sfx_bonk():
    t = tt(0.35); f = 260*np.exp(-6*t) + 130
    return (np.sin(2*np.pi*np.cumsum(f)/SR) + 0.4*np.sin(2*np.pi*np.cumsum(f*2.4)/SR)) * np.exp(-13*t) * 0.7
def sfx_rimshot():
    out = np.zeros(int(1.2*SR))
    def hit(at, kind):
        if kind == "tom":
            t = tt(0.25); y = np.sin(2*np.pi*np.cumsum(180*np.exp(-5*t)+90)/SR) * np.exp(-12*t)
        elif kind == "snare":
            t = tt(0.25); y = bp(rng.standard_normal(len(t)), 900, 6000) * np.exp(-18*t) + np.sin(2*np.pi*190*t) * np.exp(-25*t) * 0.5
        else:
            t = tt(0.9); y = bp(rng.standard_normal(len(t)), 4000, 12000) * np.exp(-4.5*t) * 0.9
        i = int(at*SR); out[i:i+len(y)] += y[:len(out)-i]
    hit(0.00, "tom"); hit(0.12, "tom"); hit(0.26, "snare"); hit(0.26, "cymbal")
    return out * 0.55
def sfx_scratch():
    t = tt(0.55); f = 900 + 500*np.sin(2*np.pi*5*t) - 700*t
    saw = 2*((np.cumsum(f)/SR) % 1) - 1
    return (saw*0.4 + bp(rng.standard_normal(len(t)), 800, 5000)*0.5) * np.sin(np.pi*t/0.55)**0.5 * 0.5
def sfx_cheer(d=2.2):
    n = bp(rng.standard_normal(int(d*SR)), 500, 3500); t = tt(d)
    mod = 0.55 + 0.45*np.abs(np.sin(2*np.pi*13*t + 2*np.sin(2*np.pi*3.1*t)))
    return n * mod * np.minimum(1, t/0.15) * np.exp(-0.9*t) * 1.4
def sfx_ring(d=0.9):
    t = tt(d); gate = (np.sin(2*np.pi*17*t) > 0).astype(float) * (np.sin(2*np.pi*1.7*t) > -0.2)
    return (np.sin(2*np.pi*1400*t) + np.sin(2*np.pi*1750*t)) * 0.2 * gate
def sfx_scribble(d=0.8):
    t = tt(d); g = (np.sin(2*np.pi*9*t) > -0.3) * 1.0
    return bp(rng.standard_normal(len(t)), 2500, 7000) * g * 0.3 * np.minimum(1, (d - t) / 0.1)
def sfx_thud():
    t = tt(0.3); return np.sin(2*np.pi*(70*np.exp(-8*t)+40)*t) * np.exp(-11*t) * 0.9

sfx = np.zeros(N, np.float32)
def put(name, at, sound, gain=1.0):
    i = int(at * SR)
    if i < 0 or i >= N: return
    seg = (sound * gain).astype(np.float32); sfx[i:i+len(seg)] += seg[:N-i]

put("slam",  E["title_slam"], sfx_stamp(), 1.1)
for c in ("cut1","cut2","cut3","cut4","cut5","cut6"): put("whoosh", E[c] - 0.2, sfx_whoosh(0.5, True), 0.5)
put("float", E["b2_float"], sfx_slide(False, 1.0), 0.8)
put("thud",  E["sign_drop"] + 0.35, sfx_thud(), 0.9)
put("x",     E["elvis_x"], sfx_scratch(), 0.55)
put("ding",  E["ding"], sfx_ding(), 0.8)
put("pop",   B("b5")["start"] - 0.05, sfx_pop(), 0.8)
put("pop",   B("b2")["start"] + 0.3, sfx_pop(), 0.6)
put("pop",   B("b6")["start"] - 0.05, sfx_pop(), 0.8)
put("boing", E["sock_reveal"], sfx_boing(), 0.9)
put("scribble", B("b7")["start"] + 0.2, sfx_scribble(1.0), 0.8)
put("stamp", E["stamp"], sfx_stamp(), 1.0)
put("rim",   E["rimshot"], sfx_rimshot(), 0.9)
put("phew",  E["phew"], sfx_slide(True, 0.8), 1.0)
put("chalk", E["e_chalk"], sfx_scribble(0.9), 0.9)
put("pop",   B("b12")["start"] - 0.05, sfx_pop(), 0.8)
put("bonk",  E["apple_hit"], sfx_bonk(), 1.0)
put("pop",   E["elvis"], sfx_pop(), 0.8)
put("pop",   E["star"], sfx_pop(), 0.7)
put("pop",   E["brain"], sfx_pop(), 0.7)
put("boing", E["sock_ben"], sfx_boing(), 0.8)
put("cheer", E["cheer"], sfx_cheer(), 0.9)
put("ding",  E["end_ding"], sfx_ding(), 0.7)

# ---------------------------------------------------------------- music bed (playful pizzicato oom-pah)
BPM = 116; beat = 60 / BPM
def midi(n): return 440 * 2 ** ((n - 69) / 12)
def pluck(freq, d, a=1.0, bright=1.0):
    t = tt(d)
    y = np.sin(2*np.pi*freq*t) + 0.5*np.sin(2*np.pi*2*freq*t)*bright + 0.2*np.sin(2*np.pi*3*freq*t)*bright
    return y * np.exp(-9*t) * a
def marimba(freq, d=0.35, a=1.0):
    t = tt(d); return (np.sin(2*np.pi*freq*t) + 0.3*np.sin(2*np.pi*4*freq*t)*np.exp(-30*t)) * np.exp(-8*t) * a
music = np.zeros(N, np.float32)
prog = [(48, [60, 64, 67]), (45, [57, 60, 64]), (41, [57, 60, 65]), (43, [55, 59, 62])]  # C Am F G
penta = [72, 74, 76, 79, 81, 84]
mrng = np.random.default_rng(11)
total_beats = int(DURATION / beat) + 1
for bi in range(total_beats):
    t0 = bi * beat
    root, chord = prog[(bi // 4) % 4]
    def add(snd, at):
        i = int(at * SR)
        if i < N: music[i:i+len(snd)] += snd[:N-i]
    if bi % 2 == 0: add(pluck(midi(root if bi % 4 == 0 else root + 7), 0.4, 0.9, 0.6), t0)       # oom
    else:
        for n in chord: add(pluck(midi(n), 0.25, 0.28, 1.0), t0)                                    # pah
    for sub in (0, 0.5):                                                                            # sparse marimba riff
        if mrng.random() < 0.5:
            add(marimba(midi(int(mrng.choice(penta))), 0.3, 0.30), t0 + sub * beat)
music = lp(music, 7000)
music *= 0.55 / (np.max(np.abs(music)) + 1e-9)

# duck music under the voices
vabs = np.abs(voice)
win = int(0.06 * SR)
venv = np.convolve(vabs, np.ones(win) / win, mode="same")
duck = 1 - 0.65 * np.clip(venv / 0.08, 0, 1)
duck = np.convolve(duck, np.ones(int(0.12*SR)) / int(0.12*SR), mode="same")
music *= duck
fade_in = np.minimum(1, tt(DURATION)[:N] / 0.4) if False else np.minimum(1, np.arange(N) / (0.4*SR))
fade_out = np.minimum(1, (N - np.arange(N)) / (1.4*SR))
music *= fade_in * fade_out

mix = voice * 1.0 + sfx * 0.55 + music * 0.30
peak = np.max(np.abs(mix)); mix = mix * (0.92 / peak) if peak > 0.92 else mix
sf.write(f"{OUT}/audio.wav", mix, SR, subtype="PCM_16")

beats_out = [{k: v for k, v in b.items() if k not in ("text", "segs")} | {"text": b["display"], "segs": [[s, round(a, 3), round(c, 3)] for s, a, c in b["segs"]]} for b in BEATS]
json.dump({"fps": FPS, "duration": DURATION, "beats": beats_out, "events": E}, open(f"{OUT}/timeline.json", "w"))
print("duration", DURATION, "peak", round(float(np.max(np.abs(mix))), 3))
print(json.dumps(E))
