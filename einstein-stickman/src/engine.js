'use strict';
// ---------------------------------------------------------------------------
// engine: hand-drawn canvas primitives, stickman rig, caricature heads, props
// ---------------------------------------------------------------------------
const W = 1920, H = 1080, FPS = 30;
const INK = '#1c1b22', SKIN = '#ffe6c9', PAPER = '#fbf5e6';
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let TL = null, E = {}, NOW = 0, BF = 0, JC = 0;

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, a, b) => clamp((t - a) / (b - a));
const eIO = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const eOut = t => 1 - Math.pow(1 - t, 3);
const eBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const eElastic = t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1);
const mb = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// "boiling line" jitter: changes 12x per second so lines shimmer like hand-drawn animation
function jit(a = 1.3) { JC++; let n = (JC * 374761393 + BF * 668265263) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); n ^= n >>> 16; return (((n >>> 0) / 4294967295) - .5) * 2 * a; }

// ------------------------------------------------------------------ primitives
function stk(w = 9, c = INK) { ctx.lineWidth = w; ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); }
function fl(c) { ctx.fillStyle = c; ctx.fill(); }
function ln(x1, y1, x2, y2, w = 9, c = INK) { ctx.beginPath(); ctx.moveTo(x1 + jit(), y1 + jit()); ctx.lineTo(x2 + jit(), y2 + jit()); stk(w, c); }
function circ(x, y, r, f = null, w = 7, c = INK) { ctx.beginPath(); ctx.arc(x + jit(.8), y + jit(.8), Math.max(0, r + jit(.8)), 0, 7); if (f) fl(f); if (w) stk(w, c); }
function ell(x, y, rx, ry, f = null, w = 6, c = INK, rot = 0) { ctx.beginPath(); ctx.ellipse(x + jit(.6), y + jit(.6), Math.max(0, rx), Math.max(0, ry), rot, 0, 7); if (f) fl(f); if (w) stk(w, c); }
function poly(pts, f = null, w = 6, c = INK, close = true) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x + jit(.7), y + jit(.7)) : ctx.moveTo(x + jit(.7), y + jit(.7))); if (close) ctx.closePath(); if (f) fl(f); if (w) stk(w, c); }
function rrect(x, y, w, h, r, f = null, sw = 6, c = INK) { ctx.beginPath(); ctx.roundRect(x + jit(.6), y + jit(.6), w, h, r); if (f) fl(f); if (sw) stk(sw, c); }
function arc(x, y, r, a0, a1, w = 5, c = INK) { ctx.beginPath(); ctx.arc(x, y, r, a0, a1); stk(w, c); }
function curve(p0, c1, p1, w = 5, c = INK) { ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(c1[0], c1[1], p1[0], p1[1]); stk(w, c); }
function star(x, y, r, n = 5, f = '#ffd23f', w = 4, rot = 0) { const pts = []; for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n - Math.PI / 2, rr = i % 2 ? r * .45 : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } poly(pts, f, w); }

const FONT = { head: '"Bangers", Impact, sans-serif', hand: '"Patrick Hand", "Comic Sans MS", sans-serif', cap: '"Comic Neue", "Comic Sans MS", sans-serif' };
function text(s, x, y, o = {}) {
  const { font = 'hand', size = 44, color = INK, align = 'center', base = 'middle', stroke = null, sw = 8, rot = 0, sc = 1, alpha = 1, spacing = 0 } = o;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); ctx.globalAlpha *= alpha;
  ctx.font = `${size}px ${FONT[font] || font}`; ctx.textAlign = align; ctx.textBaseline = base; ctx.lineJoin = 'round';
  if (spacing) ctx.letterSpacing = spacing + 'px';
  if (stroke) { ctx.lineWidth = sw; ctx.strokeStyle = stroke; ctx.strokeText(s, 0, 0); }
  ctx.fillStyle = color; ctx.fillText(s, 0, 0); ctx.restore();
}
function wrap(s, maxW, font) { ctx.font = font; const out = []; let cur = ''; s.split(' ').forEach(w => { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }); if (cur) out.push(cur); return out; }

// ------------------------------------------------------------------ timeline helpers
const beat = id => TL.beats.find(b => b.id === id);
function mouthOf(id, t) { const b = beat(id); if (t < b.start || t > b.end) return 0; const i = Math.floor((t - b.start) * FPS); return b.env[Math.min(i, b.env.length - 1)] || 0; }
const talking = (id, t) => { const b = beat(id); return t >= b.start - .05 && t <= b.end + .1; };

// ------------------------------------------------------------------ speech + thought bubbles
function bubble(txt, cx, cy, ax, ay, t0, t1, o = {}) {
  if (NOW < t0 || NOW > t1 + .2) return;
  const pin = eBack(P(NOW, t0, t0 + .22)), pout = 1 - P(NOW, t1, t1 + .18);
  const sc = Math.min(pin, pout); if (sc <= 0) return;
  const size = o.size || 50, maxW = o.maxW || 560, font = `${size}px ${FONT.hand}`;
  const lines = wrap(txt, maxW, font); ctx.font = font;
  const tw = Math.max(...lines.map(l => ctx.measureText(l).width)), lh = size * 1.12;
  const bw = tw + 64, bh = lines.length * lh + 46;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
  const dx = ax - cx, dy = ay - cy, ang = Math.atan2(dy, dx);
  // tail
  const bx = clamp(dx, -bw / 2 + 40, bw / 2 - 40) * .6, by = dy > 0 ? bh / 2 - 6 : -bh / 2 + 6;
  ctx.beginPath(); ctx.moveTo(bx - 26, by); ctx.lineTo(dx * .92, dy * .92); ctx.lineTo(bx + 26, by); ctx.closePath(); fl('#fff'); stk(5);
  rrect(-bw / 2, -bh / 2, bw, bh, 34, '#fff', 5);
  // cover tail root seam
  ctx.beginPath(); ctx.moveTo(bx - 22, by + (dy > 0 ? -3 : 3)); ctx.lineTo(bx + 22, by + (dy > 0 ? -3 : 3)); stk(10, '#fff');
  const col = o.color || INK;
  lines.forEach((l, i) => text(l, 0, -bh / 2 + 23 + lh * (i + .52), { size, color: col }));
  ctx.restore();
}
function thought(cx, cy, w, h, ax, ay, t0, t1) {
  if (NOW < t0 || NOW > t1 + .2) return 0;
  const sc = Math.min(eBack(P(NOW, t0, t0 + .3)), 1 - P(NOW, t1, t1 + .2)); if (sc <= 0) return 0;
  // trail
  for (let i = 0; i < 3; i++) { const f = (i + 1) / 4; circ(lerp(ax, cx, f) * 1, lerp(ay, cy + h * .45, f), 10 + i * 8, '#fff', 4); }
  ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
  const r = mb(9); ctx.beginPath(); const n = 14;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, px = Math.cos(a) * w / 2, py = Math.sin(a) * h / 2; ctx.moveTo(px + h * .16, py); ctx.arc(px, py, h * .17 + 10, 0, 7); }
  ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, 7); fl('#fff');
  ctx.lineWidth = 5; ctx.strokeStyle = INK;
  for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(a0) * w / 2, Math.sin(a0) * h / 2, h * .17 + 10, a0 - 1.2, a0 + 1.2); ctx.stroke(); }
  ctx.restore(); return sc;
}

// ------------------------------------------------------------------ faces
function eyes(h, ex, ey, r, look = 0, extra = {}) {
  if (h.blink) { ln(-ex - r, ey, -ex + r, ey, 4); ln(ex - r, ey, ex + r, ey, 4); return; }
  if (h.expr === 'surprised') { [-ex, ex].forEach(x => { circ(x, ey, r * 2, '#fff', 4); circ(x + look * 3, ey, r * .75, INK, 0); }); return; }
  [-ex, ex].forEach(x => { if (extra.white) circ(x, ey, r * 1.7, '#fff', 3); circ(x + look * 2.5, ey, r, INK, 0); });
}
function mouthShape(h, x, y, w, extra = {}) {
  const m = h.mouth || 0;
  if (m > .1) {
    const o = Math.max(m, .18); ell(x, y + o * 4, w * (.45 + .2 * o), 3 + o * 13, '#7a2230', 4);
    if (o > .5) ell(x, y + o * 4 + 5, w * .26, 4, '#e0707a', 0);
  } else if (h.expr === 'happy') arc(x, y - 6, w * .5, .15, Math.PI - .15, 5);
  else if (h.expr === 'worried') arc(x, y + 14, w * .4, Math.PI + .3, -.3, 5);
  else if (h.expr === 'smug') { curve([x - w * .45, y + 2], [x, y + 8], [x + w * .45, y - 6], 5); }
  else if (h.expr === 'surprised') ell(x, y + 4, 9, 12, '#7a2230', 4);
  else ln(x - w * .4, y + 2, x + w * .4, y + 2, 5);
}
function brow(x1, y1, x2, y2, w = 7, c = INK) { ln(x1, y1, x2, y2, w, c); }

function headEinstein(h) {
  const R = 57, r = mb(5), t = NOW, shock = h.shock || 0;
  const n = 19;
  for (let i = 0; i < n; i++) {
    const a = lerp(-3.55, .42, i / (n - 1)), bend = (r() - .5) * .5, L = R * (.5 + .45 * r()) + Math.sin(t * 3 + i * 1.7) * 2.5 + shock * 30;
    const a0 = a - .17, a1 = a + .17, r0 = R * .9;
    ctx.beginPath(); ctx.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0);
    ctx.quadraticCurveTo(Math.cos(a - bend * .6) * (R + L * .8), Math.sin(a - bend * .6) * (R + L * .8), Math.cos(a + bend) * (R + L), Math.sin(a + bend) * (R + L));
    ctx.quadraticCurveTo(Math.cos(a + bend * .5) * (R + L * .7), Math.sin(a + bend * .5) * (R + L * .7), Math.cos(a1) * r0, Math.sin(a1) * r0);
    fl('#f3f2f8'); stk(4.5);
  }
  circ(0, 0, R, SKIN, 6);
  // forehead fringe
  for (let i = 0; i < 6; i++) { const a = lerp(-2.45, -.7, i / 5); ctx.beginPath(); ctx.moveTo(Math.cos(a - .2) * R * .96, Math.sin(a - .2) * R * .96); ctx.quadraticCurveTo(Math.cos(a) * R * .55, Math.sin(a) * R * .45 + 8 + r() * 6, Math.cos(a + .2) * R * .96, Math.sin(a + .2) * R * .96); fl('#f3f2f8'); stk(3.5); }
  // wrinkles
  arc(0, -26, 22, 3.6, 5.8, 2.5, 'rgba(60,40,30,.45)');
  // brows (bushy)
  const bu = h.expr === 'surprised' ? -7 : 0;
  [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(sd * 8, -13 + bu); ctx.quadraticCurveTo(sd * 22, -26 + bu, sd * 38, -14 + bu + (h.expr === 'worried' ? sd * 0 : 0)); stk(10, '#d9d8e0'); ctx.beginPath(); ctx.moveTo(sd * 8, -13 + bu); ctx.quadraticCurveTo(sd * 22, -26 + bu, sd * 38, -14 + bu); stk(2.5, INK); });
  eyes(h, 19, -3, 4.3, h.look || 0);
  if (!h.blink && h.expr !== 'surprised') [-19, 19].forEach(x => { arc(x, -3, 9, Math.PI * 1.05, Math.PI * 1.95, 3.5); arc(x, 6, 8, .25, 2.9, 2.5, 'rgba(60,40,30,.45)'); });
  // nose
  circ(0, 10, 8.5, '#ffd3b5', 4);
  // mouth peeks out under moustache
  const m = h.mouth || 0;
  if (m > .1) ell(0, 36 + m * 4, 10 + 5 * m, 3 + 11 * m, '#7a2230', 4);
  // moustache
  const my = 22 + m * 2.5;
  [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(0, my - 8); ctx.bezierCurveTo(sd * 20, my - 16, sd * 46, my - 6, sd * 50, my + 14); ctx.bezierCurveTo(sd * 40, my + 8, sd * 30, my + 16, sd * 14, my + 12); ctx.bezierCurveTo(sd * 8, my + 12, sd * 3, my + 8, 0, my + 6); fl('#e4e2ea'); stk(4.5); });
  [-1, 1].forEach(sd => ln(sd * 18, my, sd * 40, my + 6, 2, 'rgba(60,50,60,.5)'));
  if (h.expr === 'happy' && m < .1) arc(0, 40, 9, .3, 2.8, 3);
}

function headGurion(h) {
  const R = 57, t = NOW;
  [-1, 1].forEach(sd => {
    const w = Math.sin(t * 3 + sd) * 1.8;
    [[sd * 54, -4, 25], [sd * 62, -34, 20], [sd * 78, -16, 21], [sd * 68, 20, 20], [sd * 88, 4, 16], [sd * 80, -42, 14]].forEach(([x, y, rr]) => circ(x + w, y, rr, '#f3f2f8', 4.5));
  });
  circ(0, 0, R, SKIN, 6);
  // bald-head shine
  arc(-4, -4, R - 12, 3.9, 4.6, 5, 'rgba(255,255,255,.9)');
  // brows, white and thick
  const bu = h.expr === 'surprised' ? -8 : 0, wr = h.expr === 'worried' ? 1 : 0;
  [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(sd * 8, -11 + bu - wr * sd * 0 - wr * 6); ctx.quadraticCurveTo(sd * 22, -21 + bu, sd * 38, -12 + bu + wr * 6); stk(11, '#f1f1f5'); ctx.beginPath(); ctx.moveTo(sd * 8, -11 + bu - wr * 6); ctx.quadraticCurveTo(sd * 22, -21 + bu, sd * 38, -12 + bu + wr * 6); stk(2.5); });
  eyes(h, 19, 1, 4, h.look || 0);
  // big nose
  ctx.beginPath(); ctx.moveTo(-3, 2); ctx.quadraticCurveTo(-14, 22, -3, 25); ctx.quadraticCurveTo(7, 27, 11, 22); stk(4.5);
  // strong chin line + jowls
  arc(0, 6, 50, .55, 2.6, 2.5, 'rgba(60,40,30,.35)');
  mouthShape(h, 0, 38, 36);
}

function headEban(h) {
  const R = 57;
  circ(0, 0, R, SKIN, 6);
  [-1, 1].forEach(sd => circ(sd * R, 4, 10, SKIN, 4.5));
  // neat dark hair with side parting
  ctx.beginPath(); ctx.moveTo(-R + 3, -8); ctx.bezierCurveTo(-R - 4, -R - 8, R + 6, -R - 14, R - 2, -10); ctx.bezierCurveTo(R * .5, -30, -R * .1, -34, -R * .45, -22); ctx.bezierCurveTo(-R * .6, -16, -R * .85, -14, -R + 3, -8); fl('#2a2430'); stk(5);
  arc(-8, -R + 2, 30, 3.9, 5, 3, 'rgba(255,255,255,.45)');
  // glasses
  const bu = h.expr === 'surprised' ? -5 : 0;
  [-1, 1].forEach(sd => { circ(sd * 21, 0, 17, 'rgba(210,235,255,.55)', 5); });
  ln(-4, -2, 4, -2, 4); ln(-38, -3, -57, -8, 4); ln(38, -3, 57, -8, 4);
  [-1, 1].forEach(sd => brow(sd * 10, -22 + bu, sd * 33, -22 + bu - sd * 0, 6, '#2a2430'));
  eyes(h, 21, 0, 4, h.look || 0);
  ctx.beginPath(); ctx.moveTo(0, 6); ctx.quadraticCurveTo(-7, 18, 2, 19); stk(4);
  // small tidy moustache
  ctx.beginPath(); ctx.moveTo(-18, 30); ctx.quadraticCurveTo(0, 24, 18, 30); stk(7, '#2a2430');
  mouthShape(h, 0, 41, 28);
}

function headWeiz(h) {
  const R = 57;
  [-1, 1].forEach(sd => [[sd * 54, 0, 12], [sd * 58, 16, 10], [sd * 52, -16, 10]].forEach(([x, y, r]) => circ(x, y, r, '#eceaf0', 4)));
  circ(0, 0, R, SKIN, 6);
  arc(-6, -8, R - 14, 3.95, 4.55, 5, 'rgba(255,255,255,.9)');
  const bu = h.expr === 'surprised' ? -5 : 0;
  [-1, 1].forEach(sd => brow(sd * 9, -17 + bu, sd * 32, -20 + bu, 6, '#c9c7d0'));
  [-1, 1].forEach(sd => circ(sd * 20, -2, 14, 'rgba(210,235,255,.45)', 3.5));
  ln(-6, -4, 6, -4, 3);
  eyes(h, 20, -2, 3.6, h.look || 0);
  circ(0, 12, 6, '#ffd3b5', 3.5);
  // goatee
  ctx.beginPath(); ctx.moveTo(-18, 38); ctx.quadraticCurveTo(0, 30, 18, 38); ctx.quadraticCurveTo(10, 78 + (h.mouth || 0) * 4, 0, 90 + (h.mouth || 0) * 4); ctx.quadraticCurveTo(-10, 78 + (h.mouth || 0) * 4, -18, 38); fl('#eceaf0'); stk(4.5);
  ctx.beginPath(); ctx.moveTo(-22, 28); ctx.quadraticCurveTo(0, 20, 22, 28); stk(6, '#eceaf0'); ctx.beginPath(); ctx.moveTo(-22, 28); ctx.quadraticCurveTo(0, 20, 22, 28); stk(1.5);
  if (h.expr === 'happy') arc(0, 38, 10, .3, 2.8, 3);
}

function headNewton(h) {
  const R = 57, t = NOW, g = '#dcdae3';
  // long curly wig behind head
  [-1, 1].forEach(sd => { for (let i = 0; i < 5; i++) circ(sd * (56 + (i > 2 ? 8 : 0)) , -20 + i * 26 + Math.sin(t * 2 + i) * 1.5, 24 - i * .5, g, 4.5); });
  circ(0, -6, R + 6, g, 5);
  circ(0, 4, R - 2, SKIN, 6);
  // wig top curls over forehead
  [[-34, -42], [-12, -52], [12, -52], [34, -42], [-48, -22], [48, -22]].forEach(([x, y]) => circ(x, y, 15, g, 4));
  const bu = h.expr === 'surprised' ? -5 : 0;
  [-1, 1].forEach(sd => brow(sd * 9, -13 + bu, sd * 31, -17 + bu, 6, '#a9a7b2'));
  eyes(h, 19, 0, 4, h.look || 0);
  [-19, 19].forEach(x => arc(x, 6, 8, .2, 2.9, 2.3, 'rgba(60,40,30,.4)'));
  // long pointy nose
  ctx.beginPath(); ctx.moveTo(-3, -2); ctx.quadraticCurveTo(-24, 24, 2, 28); stk(5);
  mouthShape(h, 0, 44, 26);
  // cravat
  poly([[-12, R - 4], [12, R - 4], [18, R + 22], [-18, R + 22]], '#fff', 4);
}

function headBenZvi(h) {
  const R = 57;
  [-1, 1].forEach(sd => [[sd * 54, 4, 11], [sd * 56, -12, 9], [sd * 52, 20, 9]].forEach(([x, y, r]) => circ(x, y, r, '#e6e4ea', 4)));
  circ(0, 0, R, SKIN, 6);
  arc(-6, -8, R - 14, 3.95, 4.55, 5, 'rgba(255,255,255,.9)');
  const bu = h.expr === 'surprised' ? -5 : 0;
  [-1, 1].forEach(sd => brow(sd * 9, -18 + bu, sd * 32, -21 + bu, 7, '#8a8892'));
  [-1, 1].forEach(sd => circ(sd * 20, -3, 15, 'rgba(210,235,255,.45)', 4.5));
  ln(-5, -4, 5, -4, 3.5);
  eyes(h, 20, -3, 3.8, h.look || 0);
  ctx.beginPath(); ctx.moveTo(0, 4); ctx.quadraticCurveTo(-8, 18, 2, 19); stk(4);
  // moustache
  const my = 28; [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(0, my - 5); ctx.bezierCurveTo(sd * 18, my - 12, sd * 36, my - 4, sd * 38, my + 8); ctx.bezierCurveTo(sd * 24, my + 4, sd * 10, my + 6, 0, my + 3); fl('#8a8892'); stk(4); });
  mouthShape({ ...h, mouth: h.mouth }, 0, 46, 26);
  if (h.expr === 'happy' && !(h.mouth > .1)) arc(0, 40, 14, .3, 2.8, 4);
}

function headElvis(h) {
  const R = 57;
  circ(0, 0, R, SKIN, 6);
  // pompadour
  ctx.beginPath(); ctx.moveTo(-R + 2, -6); ctx.bezierCurveTo(-R - 14, -R - 30, 10, -R - 56, R + 22, -R - 10); ctx.bezierCurveTo(R + 6, -30, R - 4, -22, R - 2, -6); ctx.bezierCurveTo(R * .5, -36, -R * .4, -36, -R + 2, -6); fl('#15131a'); stk(5);
  arc(0, -R - 8, 40, 3.7, 5.0, 3, 'rgba(255,255,255,.4)');
  // sideburns
  [-1, 1].forEach(sd => poly([[sd * R * .95, -6], [sd * (R - 12), -2], [sd * (R - 14), 36], [sd * (R + 2), 20]], '#15131a', 3));
  // sunglasses
  ln(-4, -4, 4, -4, 5); [-1, 1].forEach(sd => { ctx.beginPath(); ctx.roundRect(sd * 22 - 19, -14, 38, 26, 10); fl('#15131a'); stk(4); });
  ctx.beginPath(); ctx.moveTo(-24, -9); ctx.lineTo(-14, -9); stk(3, 'rgba(255,255,255,.6)');
  circ(0, 14, 6, '#ffd3b5', 3.5);
  // lip curl
  ctx.beginPath(); ctx.moveTo(-18, 34); ctx.quadraticCurveTo(0, 42, 18, 30); ctx.quadraticCurveTo(24, 26, 26, 22); stk(5);
  poly([[-16, R - 3], [0, R + 18], [16, R - 3], [34, R + 32], [-34, R + 32]], '#fff', 4);
}

function headPlain(h) {
  circ(0, 0, 57, SKIN, 6); eyes(h, 19, -4, 4.2, h.look || 0); mouthShape(h, 0, 28, 30);
}

const HEADS = { einstein: headEinstein, gurion: headGurion, eban: headEban, weiz: headWeiz, newton: headNewton, benzvi: headBenZvi, elvis: headElvis, plain: headPlain };
function drawHeadAt(kind, x, y, sc = 1, h = {}) { ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); HEADS[kind](h); ctx.restore(); }

// ------------------------------------------------------------------ stickman rig
const TH = 68, SH = 66, TO = 118, UA = 62, FA = 58, HR = 57;
const OUTFIT = {
  einstein: { col: '#9aa77a', kind: 'cardigan' }, gurion: { col: '#2f3e63', kind: 'suit', tie: '#c63a3a' },
  eban: { col: '#6b6f7d', kind: 'suit', bow: '#c63a3a' }, weiz: { col: '#f4f7ff', kind: 'robe' },
  newton: { col: '#8e2f3d', kind: 'coat' }, benzvi: { col: '#33384a', kind: 'suit', sash: true }, plain: { col: null }
};

function figure(o) {
  const s = o.s || 1, dir = o.dir || 1, t = NOW, ph = o.ph || 0, pz = o.pose || {};
  const bob = (pz.bob !== undefined ? pz.bob : Math.sin(t * 3.2 + ph) * 2.2) - (o.hop || 0);
  const hip = { x: (pz.dx || 0), y: -(TH + SH) + (pz.crouch || 0) - bob + 0 };
  const lean = (pz.lean || 0) + Math.sin(t * 1.7 + ph) * .012;
  const N = { x: hip.x + Math.sin(lean) * TO, y: hip.y - Math.cos(lean) * TO };
  const tilt = (pz.tilt || 0), hd = { x: N.x + Math.sin(lean + tilt * .5) * (HR + 8), y: N.y - Math.cos(lean + tilt * .5) * (HR + 8) };
  o.hx = o.x + dir * s * hd.x; o.hy = o.y + s * hd.y;
  const of = OUTFIT[o.kind] || OUTFIT.plain;
  const blink = ((t + ph * 1.7) % 3.3) < .11;
  const h = { mouth: o.mouth || 0, expr: o.expr || 'neutral', blink: o.blink !== undefined ? o.blink : blink, look: o.look || 0, shock: o.shock || 0 };

  ctx.save(); ctx.translate(o.x, o.y); ctx.scale(s * dir, s);
  ell(0, 4, 78, 12, 'rgba(60,45,30,.16)', 0);
  if (o.behind) o.behind(hip, N, hd);

  // legs
  const legs = pz.legs || (pz.walk !== undefined ? (() => {
    const w = pz.walk; const f = p => { const a1 = Math.sin(p) * .62, a2 = a1 - Math.max(0, Math.cos(p)) * .85; return [a1, a2]; };
    return { a: f(w), b: f(w + Math.PI) };
  })() : { a: [-.07, -.07], b: [.07, .07] });
  const legDraw = (L, back, sockOn) => {
    const [a1, a2] = L, kx = hip.x + Math.sin(a1) * TH, ky = hip.y + Math.cos(a1) * TH, ax = kx + Math.sin(a2) * SH, ay = ky + Math.cos(a2) * SH;
    ln(hip.x, hip.y, kx, ky, 10); ln(kx, ky, ax, ay, 10);
    if (sockOn) { // striped sock gag
      const sx = lerp(kx, ax, .38), sy = lerp(ky, ay, .38);
      ln(sx, sy, ax, ay, 30, INK); ln(sx, sy, ax, ay, 22, '#e5483f');
      for (let i = 0; i < 4; i++) { const f = .15 + i * .24; const px = lerp(sx, ax, f), py = lerp(sy, ay, f); ln(px - 11, py, px + 11, py, 5, '#fff'); }
    }
    // foot
    const fx = ax + 14, fy = ay - 2;
    if (o.kind === 'einstein') { ell(fx - 2, fy, 17, 8, SKIN, 5); [0, 1, 2].forEach(i => circ(fx + 11 + i * 4, fy - 1 + i * 1.2, 2.4, SKIN, 2.5)); }
    else ell(fx, fy, 19, 9, INK, 0);
    return { kx, ky, ax, ay };
  };
  const legA = legDraw(legs.a, true, o.sockA), legB = legDraw(legs.b, false, o.sockB);

  // back arm
  const sh = { x: N.x - Math.sin(lean) * 14, y: N.y + Math.cos(lean) * 14 };
  const armDraw = (A) => {
    const [a1, a2] = A, ex = sh.x + Math.sin(a1) * UA, ey = sh.y + Math.cos(a1) * UA, wx = ex + Math.sin(a1 + a2) * FA, wy = ey + Math.cos(a1 + a2) * FA;
    ln(sh.x, sh.y, ex, ey, 9); ln(ex, ey, wx, wy, 9); circ(wx, wy, 7.5, SKIN, 4.5); return { wx, wy, ex, ey };
  };
  const arms = { a: pz.la || [.12, .12], b: pz.ra || [-.12, -.1] };
  const aw = armDraw(arms.a);
  if (o.onHandA) { ctx.save(); ctx.translate(aw.wx, aw.wy); o.onHandA(aw); ctx.restore(); }

  // torso + clothes
  ln(hip.x, hip.y, N.x, N.y, 10);
  if (of.col) {
    const px = Math.cos(lean), py = Math.sin(lean), top = (of.kind === 'robe' ? 38 : 33), bot = (of.kind === 'robe' ? 52 : 27), ext = of.kind === 'robe' ? 62 : 0;
    const A = [N.x - px * top + Math.sin(lean) * 4 * 0, N.y - py * top + 4], B = [N.x + px * top, N.y + py * top + 4];
    const C = [hip.x + px * bot, hip.y + py * bot + ext * .6], D = [hip.x - px * bot, hip.y - py * bot + ext * .6];
    poly([A, B, C, D], of.col, 6);
    if (of.kind === 'suit' || of.kind === 'coat') { poly([[N.x - 11, N.y + 6], [N.x + 11, N.y + 6], [hip.x, N.y + 62]], '#fff', 3.5); ln(hip.x, N.y + 62, hip.x, hip.y, 3, 'rgba(0,0,0,.35)'); }
    if (of.tie) poly([[N.x - 5, N.y + 8], [N.x + 5, N.y + 8], [N.x + 7, N.y + 52], [N.x, N.y + 62], [N.x - 7, N.y + 52]], of.tie, 3);
    if (of.bow) { poly([[N.x, N.y + 12], [N.x - 20, N.y + 2], [N.x - 20, N.y + 22]], of.bow, 3); poly([[N.x, N.y + 12], [N.x + 20, N.y + 2], [N.x + 20, N.y + 22]], of.bow, 3); }
    if (of.kind === 'cardigan') { ln(hip.x, N.y + 10, hip.x, hip.y, 3, 'rgba(0,0,0,.35)'); [0, 1, 2].forEach(i => circ(hip.x + 8, N.y + 34 + i * 26, 4, '#5d6a45', 0)); }
    if (of.kind === 'coat') [0, 1, 2].forEach(i => circ(hip.x + 8, N.y + 42 + i * 18, 4, '#f1c453', 0));
    if (of.sash) { ctx.beginPath(); ctx.moveTo(N.x - px * top + 6, N.y + 10); ctx.lineTo(N.x - px * top + 34, N.y + 6); ctx.lineTo(hip.x + px * bot - 2, hip.y - 4); ctx.lineTo(hip.x + px * bot - 32, hip.y - 2); ctx.closePath(); fl('#6fb4ee'); stk(4); ln(N.x - 14, N.y + 18, hip.x + 14, hip.y - 6, 5, '#fff'); circ(hip.x + 20, hip.y - 20, 8, '#f1c453', 3.5); }
  }
  // front arm
  const bw = armDraw(arms.b);
  if (o.onHandB) { ctx.save(); ctx.translate(bw.wx, bw.wy); o.onHandB(bw); ctx.restore(); }
  if (o.hand) o.hand(bw, aw);

  // neck + head
  ln(N.x, N.y, hd.x - Math.sin(lean + tilt * .5) * (HR - 4) * .6, hd.y + Math.cos(lean + tilt * .5) * (HR - 4) * .6, 9);
  ctx.save(); ctx.translate(hd.x, hd.y); ctx.rotate(tilt); HEADS[o.kind](h);
  if (o.sweat) { for (let i = 0; i < 3; i++) { const p2 = ((t * 1.6 + i / 3) % 1); const sx = (i === 1 ? 0 : (i === 0 ? -1 : 1) * 78), sy = (i === 1 ? -86 : -50) + p2 * 60; ctx.beginPath(); ctx.moveTo(sx, sy - 12); ctx.quadraticCurveTo(sx + 9, sy + 2, sx, sy + 8); ctx.quadraticCurveTo(sx - 9, sy + 2, sx, sy - 12); fl('#7ec8f2'); stk(2.5, '#2b7fb3'); } }
  ctx.restore();
  if (o.after) o.after(hip, N, hd);
  ctx.restore();
  o.legA = legA; o.legB = legB;
}

// talking gesture helper: returns arm angles that pump while mouth is open
function gesture(m, base = [.9, .5], amp = .5) { const k = Math.sin(NOW * 8) * amp * m; return [base[0] + k, base[1] - k * .5]; }
