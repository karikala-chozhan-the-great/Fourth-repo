"""Foley + music for the machine, synthesised from the recorded physics events.

usage: python3 -I audio.py <timeline.json> <out.wav>
Every collision the simulation logged becomes a sound (domino clacks, steel ticks, wood thocks, metal clangs, marimba
notes from the Plinko pegs), rolling noise follows how fast the balls roll, and a small music bed + riser + fanfare
sit underneath.  Everything is synthesised with NumPy/SciPy (no samples), so the track is royalty-free.
"""
import json, sys
import numpy as np
from scipy.signal import butter, sosfilt
import soundfile as sf

TL = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
SR, FPS = 48000, TL["fps"]
NF = len(TL["frames"])
DUR = NF / FPS
N = int(DUR * SR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)
items = {it["id"]: it for it in TL["items"]}
tt = lambda n: np.arange(n) / SR


def add(sig, t, x=None, gain=1.0, pan=None):
    """mix a mono signal at time t (s); pan from world x (0..21.6) unless given"""
    i = int(t * SR)
    if i >= N or i < 0: return
    sig = sig[: N - i] * gain
    p = pan if pan is not None else (0.0 if x is None else (x / 21.6 * 2 - 1) * 0.5)
    gl, gr = np.sqrt((1 - p) / 2), np.sqrt((1 + p) / 2)
    L[i:i + len(sig)] += sig * gl; R[i:i + len(sig)] += sig * gr


def mixs(*arrs):
    n = max(len(a) for a in arrs); out = np.zeros(n)
    for a in arrs: out[:len(a)] += a
    return out


def bp(sig, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), sig)


def lp(sig, f, order=2):
    return sosfilt(butter(order, f, btype="low", fs=SR, output="sos"), sig)


def hp(sig, f, order=2):
    return sosfilt(butter(order, f, btype="high", fs=SR, output="sos"), sig)


def damped(freqs, decay, dur, amps=None, phase0=0.0):
    n = int(dur * SR); t = tt(n); amps = amps or [1.0] * len(freqs)
    s = sum(a * np.sin(2 * np.pi * f * t + phase0) * np.exp(-t / (decay / (1 + 0.6 * k))) for k, (f, a) in enumerate(zip(freqs, amps)))
    return s * np.minimum(1, t / 0.0008)


def noise_burst(dur, decay, lo, hi):
    n = int(dur * SR); t = tt(n)
    return bp(rng.standard_normal(n), lo, hi) * np.exp(-t / decay)


# ---------------------------------------------------------------- one-shot sounds
def s_clack(v, big=False):
    f = rng.uniform(900, 1500) * (0.6 if big else 1)
    return mixs(0.7 * damped([f, f * 2.3], 0.018, 0.09, [1, 0.5]), 0.9 * noise_burst(0.07, 0.012, 1800, 5200))


def s_tick_steel(v):
    f = rng.uniform(0.97, 1.03)
    return mixs(damped([2400 * f, 3900 * f, 6100 * f], 0.05, 0.22, [1, 0.6, 0.3]), 0.4 * noise_burst(0.02, 0.004, 3000, 9000))


def s_thock(v, f0=190):
    f = f0 * rng.uniform(0.9, 1.12)
    return mixs(1.1 * damped([f, f * 1.9], 0.05, 0.16, [1, 0.35]), 0.6 * noise_burst(0.05, 0.01, 500, 2500))


def s_clang(v):
    f = rng.uniform(0.95, 1.05)
    return mixs(damped([620 * f, 1010 * f, 1780 * f, 2650 * f], 0.12, 0.5, [1, 0.8, 0.5, 0.35]), 0.5 * noise_burst(0.03, 0.006, 2000, 8000))


def s_tonk(v, f0=330):
    f = f0 * rng.uniform(0.94, 1.06)
    return damped([f, f * 2.76, f * 5.4], 0.09, 0.3, [1, 0.5, 0.2])


def s_marimba(freq, v):
    n = int(0.7 * SR); t = tt(n)
    s = np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.26) + 0.45 * np.sin(2 * np.pi * freq * 4 * t) * np.exp(-t / 0.05) + 0.15 * np.sin(2 * np.pi * freq * 9.2 * t) * np.exp(-t / 0.02)
    return s * np.minimum(1, t / 0.002)


def s_boom(freq=60, dur=1.0, decay=0.35):
    n = int(dur * SR); t = tt(n)
    f = freq * (1 + 1.6 * np.exp(-t / 0.05))
    return mixs(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / decay), 0.5 * noise_burst(dur, 0.08, 60, 900))


def s_anvil(v):
    return mixs(1.0 * s_boom(55, 1.2, 0.3), 0.9 * damped([310, 520, 1130, 1800], 0.35, 1.2, [1, 0.8, 0.5, 0.3]), 0.5 * noise_burst(0.2, 0.05, 300, 6000))


def s_snip():
    a = mixs(0.9 * damped([2800, 4300, 6800], 0.03, 0.12, [1, 0.7, 0.4]), noise_burst(0.05, 0.01, 2500, 9000))
    b = np.zeros(int(0.12 * SR)); k = int(0.045 * SR); a2 = 0.7 * a[:len(b) - k]; b[k:k + len(a2)] = a2
    out = np.zeros(int(0.2 * SR)); out[:len(a)] += a; out[:len(b)] += b[:len(out)]
    return out


def s_whoosh(dur=0.45, lo=200, hi=5000, rising=True):
    n = int(dur * SR); t = tt(n) / dur
    x = rng.standard_normal(n)
    c = (lo + (hi - lo) * (t ** 2)) if rising else (hi - (hi - lo) * t)
    out = np.zeros(n); bs = 480
    for i in range(0, n, bs):
        fc = float(np.clip(c[min(i, n - 1)], 80, 12000)); w = fc * 0.6
        out[i:i + bs] = bp(x[i:i + bs + 1][:len(out[i:i + bs])], max(40, fc - w), fc + w, 1)
    return out * np.sin(np.pi * np.clip(t, 0, 1)) ** 1.5


def s_boing():
    n = int(0.5 * SR); t = tt(n)
    f = 260 + 120 * np.sin(2 * np.pi * 9 * t) * np.exp(-t / 0.2) + 60 * np.exp(-t / 0.1)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.25) * 0.8


def s_blip(f):
    n = int(0.16 * SR); t = tt(n)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)) * np.exp(-t / 0.05) * np.minimum(1, t / 0.003)


def s_pluck(freq, dur=0.5, decay=0.18, bright=0.35):
    n = int(dur * SR); t = tt(n)
    s = np.sin(2 * np.pi * freq * t) + bright * np.sin(2 * np.pi * 2 * freq * t) * np.exp(-t / (decay * 0.5)) + 0.1 * np.sin(2 * np.pi * 3 * freq * t) * np.exp(-t / (decay * 0.3))
    return s * np.exp(-t / decay) * np.minimum(1, t / 0.003)


def s_bass(freq, dur=0.4):
    n = int(dur * SR); t = tt(n)
    return (np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(2 * np.pi * 2 * freq * t)) * np.exp(-t / 0.22) * np.minimum(1, t / 0.004)


mid = lambda m: 440.0 * 2 ** ((m - 69) / 12)
PENT = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81]

# ---------------------------------------------------------------- collision events -> foley
ev = [e for e in TL["events"] if e["type"] == "hit"]
last = {}
for k, e in enumerate(ev):
    ka, kb, v, t = e.get("ka") or "", e.get("kb") or "", e["v"], e["t"]
    names = {ka, kb}
    if len(names) == 1 and ka == "" : continue
    key = (e["a"], e["b"])
    if t - last.get(key, -9) < 0.045 and v < 5: continue           # de-chatter resting contacts
    last[key] = t
    g = min(1.0, (v / 11.0) ** 0.7)
    x = e["x"]
    small = ka == "pball" or kb == "pball"
    if "peg" in names:
        peg = e["a"] if ka == "peg" else e["b"]
        idx = int(np.clip((x - 3.4) / 15.2, 0, 0.999) * len(PENT))
        f = mid(PENT[idx]) * (2 if rng.random() < 0.15 else 1)
        if v < 2.0 and rng.random() < 0.45: continue
        add(s_marimba(f, v), t, x, 0.17 * max(0.35, g))
    elif "anvil" in names:
        add(s_anvil(v), t, x, 0.95 * max(0.5, g))
    elif names == {"domino"}:
        add(s_clack(v), t, x, 0.42 * max(0.4, g))
    elif "domino" in names:
        add(s_clack(v, big=("B" in names)), t, x, 0.4 * max(0.4, g))
    elif "cradle" in names:
        add(s_tick_steel(v), t, x, 0.65 * max(0.45, g))
    elif names & {"bucket", "bucket2"}:
        add(s_tonk(v, 300 if "bucket" in names else 240), t, x, 0.5 * max(0.3, g))
    elif names & {"gate", "plate", "btn", "cw", "arm", "scissors"}:
        add(s_thock(v, 150), t, x, 0.7 * max(0.4, g))
    elif names & {"T", "B", "L"}:
        mats = {e.get("ma"), e.get("mb")}
        if "metal" in mats or names & {"colL", "colR", "tpost", "baffle", "pivot", "stopL", "stopR", "plateBase", "btnBase", "bucketStop", "hopperL", "hopperR"}:
            add(s_clang(v), t, x, 0.55 * max(0.35, g))
        else:
            add(s_thock(v, 170 if "B" in names else 230), t, x, 0.7 * max(0.4, g))
    elif small:
        if v < 2.5 and rng.random() < 0.7: continue
        mats = {e.get("ma"), e.get("mb")}
        if "metal" in mats: add(s_tonk(v, 700), t, x, 0.12 * max(0.3, g))
        else: add(s_thock(v, 520), t, x, 0.15 * max(0.35, g))
    elif "wheel" in names:
        add(s_clack(v), t, x, 0.35 * max(0.4, g))
    else:
        add(s_thock(v, 210), t, x, 0.4 * max(0.3, g))

# ---------------------------------------------------------------- scripted sfx
fin_t = None
for e in TL["events"]:
    if e["type"] == "finale": fin_t = e["t"]
    if e["type"] != "sfx": continue
    n = e["name"]
    if n == "release":
        add(s_clack(1, big=True), e["t"], e["x"], 0.7); add(s_whoosh(0.3, 300, 2500, False), e["t"], e["x"], 0.25)
    elif n == "trigger":
        add(s_thock(10, 120), e["t"], e["x"], 1.0); add(s_boing(), e["t"] + 0.02, e["x"], 0.6)
        add(s_whoosh(0.5, 150, 5500, True), e["t"] + 0.05, 5.0, 0.55)
    elif n == "snip":
        add(s_snip(), e["t"], e["x"], 0.9)
    elif n == "like":
        add(s_boom(48, 1.5, 0.45), e["t"], pan=0, gain=1.4)

# HUD pops: soft blips as each step banner appears; hook-title pops at the start
for s in TL["steps"]:
    if s["n"] in (11, 12): continue
    add(s_blip(mid(72 + [0, 0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19][min(s["n"], 12)])), s["f"] / FPS, pan=0, gain=0.22)
for tp, nn in ((0.02, 64), (0.2, 67), (0.52, 72)):
    add(s_blip(mid(nn)), tp, pan=0, gain=0.25)

# ---------------------------------------------------------------- rolling rumble (follows ball speed)
roll = np.array(TL["roll"] + [0.0])
env = np.interp(np.arange(N) / SR * FPS, np.arange(len(roll)), roll)
env = lp(env, 12, 1)
rum = lp(rng.standard_normal(N), 900) * 0.9 + bp(rng.standard_normal(N), 1500, 4000) * 0.25 * env
roll_sig = rum * (np.clip(env, 0, 1) ** 1.3)
L += roll_sig * 0.16; R += roll_sig * 0.16

# ---------------------------------------------------------------- music bed (120-ish BPM, C major) + riser + fanfare
BPM = 124; beat = 60 / BPM
prog = [(48, [60, 64, 67]), (45, [57, 60, 64]), (53, [60, 65, 69]), (43, [59, 62, 67])]   # C Am F G (bass, triad)
snip_t = next((e["t"] for e in TL["events"] if e["type"] == "sfx" and e["name"] == "snip"), DUR)
fin_t = fin_t if fin_t is not None else DUR
bar = 0; t0 = 0.4
pattern = [0, 1, 2, 1, 2, 1, 2, 3]
while t0 < DUR - 0.3:
    bass, tri = prog[bar % 4]
    for k in range(4):
        tb = t0 + k * beat
        if tb >= fin_t - 0.02 and tb < fin_t + 0.5: continue
        if tb < snip_t or tb >= fin_t:
            if k in (0, 2): add(s_bass(mid(bass) if k == 0 else mid(bass + 7)), tb, pan=0, gain=0.34)
            add(s_boom(110, 0.16, 0.05), tb, pan=0, gain=0.10) if k in (0, 2) else None
            add(noise_burst(0.05, 0.012, 6000, 12000), tb + beat / 2, pan=0.15, gain=0.05)
        for h in range(2):
            ta = tb + h * beat / 2
            if ta >= snip_t and ta < fin_t: continue
            if ta >= fin_t - 0.02 and ta < fin_t + 0.45: continue
            ni = pattern[(k * 2 + h) % len(pattern)]
            note = tri[ni % 3] + 12 * (ni // 3 + (1 if ta >= fin_t else 0))
            add(s_pluck(mid(note), 0.4, 0.17), ta, pan=-0.25 if h else 0.25, gain=0.17 if ta < fin_t else 0.30)
    t0 += 4 * beat; bar += 1

# riser into the anvil impact
if snip_t < fin_t:
    rd = fin_t - snip_t - 0.05
    n = int(rd * SR); tr = tt(n) / rd
    x = rng.standard_normal(n)
    out = np.zeros(n); bs = 960
    for i in range(0, n, bs):
        fc = 250 * (24 ** tr[min(i, n - 1)]); out[i:i + bs] = bp(x[i:i + bs], fc * 0.7, fc * 1.3, 1)
    add(out * (tr ** 2.0) * 1.2, snip_t, pan=0, gain=0.55)

# finale: fanfare chord, sparkle arpeggio, confetti pops, then a resolving chord at the end
for k, m in enumerate((60, 64, 67, 72)):
    add(s_pluck(mid(m), 1.6, 0.7, 0.5), fin_t, pan=(k - 1.5) * 0.25, gain=0.42)
for k, m in enumerate((84, 88, 91, 96, 100, 103, 108)):
    add(s_marimba(mid(m) / 2, 1), fin_t + 0.08 + k * 0.07, pan=(k % 3 - 1) * 0.4, gain=0.34)
for k, dt in enumerate((0.0, 0.07, 0.15, 0.24)):
    add(noise_burst(0.12, 0.03, 300, 4000) * 1.2, fin_t + dt, pan=(-0.6, 0.6, -0.3, 0.3)[k], gain=0.5)
add(bp(rng.standard_normal(int(1.6 * SR)), 5000, 14000) * np.exp(-tt(int(1.6 * SR)) / 0.6), fin_t + 0.05, pan=0, gain=0.10)
end_t = NF / FPS - 1.9
for k, m in enumerate((55, 59, 62, 67, 71)):
    add(s_pluck(mid(m), 1.8, 0.8, 0.45), end_t + k * 0.05, pan=(k - 2) * 0.2, gain=0.22)
add(s_marimba(mid(96) / 2, 1), end_t + 0.35, pan=0, gain=0.3)

# ---------------------------------------------------------------- master: soft clip, fade, write
m = np.stack([L, R], 1)
m = np.tanh(m * 0.9) / np.tanh(0.9)
m /= max(1e-9, np.abs(m).max()) / 0.92
fo = int(0.5 * SR); m[-fo:] *= np.linspace(1, 0, fo)[:, None]
m[:int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))[:, None]
sf.write(OUT, m.astype(np.float32), SR, subtype="PCM_16")
print("wrote", OUT, f"{DUR:.1f}s", "peak", float(np.abs(m).max()), "events used", len(ev))
