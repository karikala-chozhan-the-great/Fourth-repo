'use strict';
// ---------------------------------------------------------------------------
// engine: hand-drawn canvas primitives, stickman rig, caricature heads, props
// ---------------------------------------------------------------------------
const W = 1920, H = 1080, FPS = 30;           // world size (design space)
const PORTRAIT = /portrait/.test(location.search);   // 9:16 reels/shorts layout
const CW = PORTRAIT ? 1080 : 1920, CH = PORTRAIT ? 1920 : 1080;   // canvas size
const BOT = PORTRAIT ? 2400 : H;                      // how far seas / decks extend below the world
const hp = (x, y) => PORTRAIT ? { x: 540 + (x - 960) * .56, y: 160 + y * 1.1 } : { x, y };   // design-space HUD position -> canvas
const trh = (x, y) => { const q = hp(x, y); ctx.translate(q.x, q.y); };
const INK = '#1c1b22', SKIN = '#ffe6c9', PAPER = '#fbf5e6';
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
cv.width = CW; cv.height = CH; cv.style.width = CW + 'px'; cv.style.height = CH + 'px';
let TL = null, E = {}, NOW = 0, BF = 0, JC = 0, SCR_DX = 0;

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

const FONT = { title: '"Pirata One", "Bangers", serif', roman: '"Cinzel", serif', head: '"Bangers", Impact, sans-serif', hand: '"Patrick Hand", "Comic Sans MS", sans-serif', cap: '"Comic Neue", "Comic Sans MS", sans-serif' };
function text(s, x, y, o = {}) {
  const { font = 'hand', size = 44, color = INK, align = 'center', base = 'middle', stroke = null, sw = 8, rot = 0, sc = 1, alpha = 1, spacing = 0, weight = '' } = o;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px ${FONT[font] || font}`; ctx.textAlign = align; ctx.textBaseline = base; ctx.lineJoin = 'round';
  if (spacing) ctx.letterSpacing = spacing + 'px';
  if (stroke) { ctx.lineWidth = sw; ctx.strokeStyle = stroke; ctx.strokeText(s, 0, 0); }
  ctx.fillStyle = color; ctx.fillText(s, 0, 0); ctx.restore();
}
function wrap(s, maxW, font) { ctx.font = font; const out = []; let cur = ''; s.split(' ').forEach(w => { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }); if (cur) out.push(cur); return out; }

// ------------------------------------------------------------------ timeline helpers
const beat = id => TL.beats.find(b => b.id === id);
function mouthOf(id, t) { const b = beat(id); if (t < b.start || t > b.end) return 0; const i = Math.floor((t - b.start) * FPS); return b.env[Math.min(i, b.env.length - 1)] || 0; }
function mwOf(id, t) { const b = beat(id); if (t < b.start || t > b.end) return .5; const i = Math.floor((t - b.start) * FPS); return b.mw[Math.min(i, b.mw.length - 1)] ?? .5; }
function lip(id, t) { return { mouth: mouthOf(id, t), mw: mwOf(id, t) }; }
function w2s(x, y) { const m = ctx.getTransform(); return { x: m.a * x + m.c * y + m.e - SCR_DX, y: m.b * x + m.d * y + m.f }; }
function hud(fn) { ctx.save(); ctx.setTransform(1, 0, 0, 1, SCR_DX, 0); fn(); ctx.restore(); }
const talking = (id, t) => { const b = beat(id); return t >= b.start - .05 && t <= b.end + .1; };

// ------------------------------------------------------------------ speech + thought bubbles
function bubble(txt, cx, cy, ax, ay, t0, t1, o = {}) {
  if (NOW < t0 || NOW > t1 + .2) return;
  const tp = w2s(ax, ay); ax = clamp(tp.x, 40, CW - 40); ay = clamp(tp.y, 40, CH - 40);
  const pin = eBack(P(NOW, t0, t0 + .22)), pout = 1 - P(NOW, t1, t1 + .18);
  const sc = Math.min(pin, pout); if (sc <= 0) return;
  const size = o.size || 50, maxW = PORTRAIT ? Math.min(o.maxW || 560, 640) : (o.maxW || 560), font = `${size}px ${FONT.hand}`;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, SCR_DX, 0);
  const lines = wrap(txt, maxW, font); ctx.font = font;
  const tw = Math.max(...lines.map(l => ctx.measureText(l).width)), lh = size * 1.12;
  const bw = tw + 64, bh = lines.length * lh + 46;
  { const q = hp(cx, cy); cx = q.x; cy = q.y; if (PORTRAIT) cx = clamp(cx, bw / 2 + 24, CW - bw / 2 - 24); }
  ctx.translate(cx, cy); ctx.scale(sc, sc);
  const dx = ax - cx, dy = ay - cy;
  const bx = clamp(dx, -bw / 2 + 40, bw / 2 - 40) * .6, by = dy > 0 ? bh / 2 - 6 : -bh / 2 + 6;
  ctx.beginPath(); ctx.moveTo(bx - 26, by); ctx.lineTo(dx * .92, dy * .92); ctx.lineTo(bx + 26, by); ctx.closePath(); fl('#fff'); stk(5);
  rrect(-bw / 2, -bh / 2, bw, bh, 34, '#fff', 5);
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
  if (h.expr === 'coin') { [-ex, ex].forEach(x => { circ(x, ey, r * 2.8, '#ffd23f', 4); text('$', x, ey + 2, { font: 'head', size: r * 4.4, color: '#8a5a00' }); }); return; }
  if (h.blink) { ln(-ex - r, ey, -ex + r, ey, 4); ln(ex - r, ey, ex + r, ey, 4); return; }
  if (h.expr === 'surprised') { [-ex, ex].forEach(x => { circ(x, ey, r * 2, '#fff', 4); circ(x + look * 3, ey, r * .75, INK, 0); }); return; }
  [-ex, ex].forEach(x => { if (extra.white) circ(x, ey, r * 1.7, '#fff', 3); circ(x + look * 2.5, ey, r, INK, 0); });
}
const mx = h => .72 + .56 * (h.mw ?? .5), my = h => 1.22 - .5 * (h.mw ?? .5);
function mouthShape(h, x, y, w, extra = {}) {
  const m = h.mouth || 0;
  if (m > .1) {
    const o = Math.max(m, .18), kx = .72 + .56 * (h.mw ?? .5), ky = 1.22 - .5 * (h.mw ?? .5); ell(x, y + o * 4, w * (.45 + .2 * o) * kx, (3 + o * 13) * ky, '#7a2230', 4);
    if (o > .5) ell(x, y + o * 4 + 5, w * .26, 4, '#e0707a', 0);
  } else if (h.expr === 'happy') arc(x, y - 6, w * .5, .15, Math.PI - .15, 5);
  else if (h.expr === 'worried') arc(x, y + 14, w * .4, Math.PI + .3, -.3, 5);
  else if (h.expr === 'smug') { curve([x - w * .45, y + 2], [x, y + 8], [x + w * .45, y - 6], 5); }
  else if (h.expr === 'surprised') ell(x, y + 4, 9, 12, '#7a2230', 4);
  else ln(x - w * .4, y + 2, x + w * .4, y + 2, 5);
}
function brow(x1, y1, x2, y2, w = 7, c = INK) { ln(x1, y1, x2, y2, w, c); }


// ---- Julius Caesar: laurel wreath, receding comb-forward hair, hooked nose, deadpan smirk
function headCaesar(h) {
  const R = 57;
  [-1, 1].forEach(sd => circ(sd * R, 6, 10, SKIN, 4.5));
  circ(0, 0, R, SKIN, 6);
  [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(sd * R * .99, -4); ctx.quadraticCurveTo(sd * R * 1.04, -34, sd * R * .6, -R * .9); ctx.quadraticCurveTo(sd * R * .84, -34, sd * R * .76, -6); ctx.closePath(); fl('#4a3626'); stk(3.5); });
  for (let i = 0; i < 7; i++) { const x0 = -36 + i * 12; ln(x0, -40 + Math.abs(x0) * .12, x0 + 5, -27 + (i % 2) * 2, 2.4, '#4a3626'); }
  const bu = h.expr === 'surprised' ? -7 : 0, sm = h.expr === 'smug' ? 1 : 0;
  [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(sd * 8, -10 + bu - sm * 3 * 0); ctx.lineTo(sd * 36, -16 + bu + (sm ? sd * 0 : 0) + (sm ? -0 : 0)); stk(7.5, '#3a2a1c'); });
  if (h.expr === 'smug' && !h.blink) { [-19, 19].forEach(x => { circ(x, 1, 4, INK, 0); ln(x - 8, -3, x + 8, -3, 4); }); }
  else eyes(h, 19, 1, 4, h.look || 0);
  ctx.beginPath(); ctx.moveTo(-2, 0); ctx.quadraticCurveTo(-8, 18, 2, 24); ctx.quadraticCurveTo(10, 22, 12, 17); stk(5);
  arc(0, 30, 46, .7, 2.45, 2.5, 'rgba(60,40,30,.3)');
  mouthShape(h, 0, 38, 30);
  if (h.expr === 'smug' && !(h.mouth > .1)) ln(8, 36, 18, 31, 4);
  // laurel wreath
  const n = 14;
  for (let i = 0; i < n; i++) { const a = lerp(Math.PI * 1.06, Math.PI * 1.94, i / (n - 1)), x = Math.cos(a) * R * .98, y = Math.sin(a) * R * .94 - 2; ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2 + (i % 2 ? .55 : -.55)); ell(0, -8, 6.5, 14, '#5cae4f', 3.2); ctx.restore(); }
  [-1, 1].forEach(sd => { ln(sd * R * .95, -8, sd * R * 1.2, 6, 5, '#f1c453'); });
}

// ---- pirates (shared pieces)
function pirateEarring(x, y) { circ(x, y, 7, null, 3.5, '#f1c453'); }
function beardBottom(top, w, depth, col, scallops = 6) {
  ctx.beginPath(); ctx.moveTo(-w, top);
  ctx.bezierCurveTo(-w - 6, top + depth * .5, -w + 8, top + depth, -w * .6, top + depth * .98);
  for (let i = 0; i < scallops; i++) { const x0 = -w * .6 + (w * 1.2) * i / scallops, x1 = -w * .6 + (w * 1.2) * (i + 1) / scallops; ctx.quadraticCurveTo((x0 + x1) / 2, top + depth * 1.22 + (i % 2) * 6, x1, top + depth * .98); }
  ctx.bezierCurveTo(w - 8, top + depth, w + 6, top + depth * .5, w, top);
  ctx.quadraticCurveTo(0, top - 20, -w, top); fl(col); stk(4.5);
}
function headCaptain(h) {   // red bandana, eyepatch, bushy beard, gold earring
  const R = 57, t = NOW, m = h.mouth || 0;
  pirateEarring(-R - 2, 18); circ(0, 0, R, SKIN, 6);
  // bandana + flapping tails
  ctx.beginPath(); ctx.moveTo(-R + 2, -6); ctx.bezierCurveTo(-R - 4, -R - 8, R + 4, -R - 8, R - 2, -6); ctx.quadraticCurveTo(0, -30, -R + 2, -6); fl('#d2382f'); stk(5);
  [[-18, -40], [4, -48], [24, -38], [-36, -26], [38, -24]].forEach(([x, y]) => circ(x, y, 3.5, '#fff', 0));
  ctx.save(); ctx.translate(-R + 4, -26); [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-26, 6 + sd * 10 + Math.sin(t * 8 + sd) * 4, -48, 22 + sd * 22 + Math.sin(t * 7 + sd) * 5); ctx.lineTo(-30, 8 + sd * 16); ctx.closePath(); fl('#d2382f'); stk(4); }); ctx.restore();
  // eyes: patch on the left
  const bu = h.expr === 'surprised' ? -7 : 0;
  brow(8, -17 + bu, 36, -24 + bu, 9, '#4a2a16'); brow(-8, -17 + bu, -36, -24 + bu, 9, '#4a2a16');
  eyes(h, 19, -4, 4, h.look || 0);
  ln(-R + 4, -26, 36, -8, 4); ctx.beginPath(); ctx.ellipse(-19, -4, 17, 14, -.2, 0, 7); fl('#17151b'); stk(4);
  ln(-6, -6, 6, -14, 0);
  // scar, nose
  ln(30, -2, 38, 20, 3, '#b3473f'); ln(34, 6, 41, 4, 2.5, '#b3473f');
  circ(2, 12, 10, '#f2a58f', 4.5);
  // beard + moustache + mouth
  beardBottom(14, R - 2, 70, '#6b3f23', 7);
  [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(0, 26); ctx.bezierCurveTo(sd * 20, 16, sd * 44, 20, sd * 46, 38); ctx.bezierCurveTo(sd * 30, 30, sd * 12, 36, 0, 34); fl('#8a5330'); stk(3.5); });
  if (m > .1) { ell(0, 44 + m * 5, 14 * mx(h), (5 + m * 12) * my(h), '#5a1520', 4); ell(0, 40 + m * 3, 4, 3, '#f1c453', 0); }
  else if (h.expr === 'worried') arc(0, 50, 12, Math.PI + .3, -.3, 4.5, '#2a1608');
  else ln(-12, 44, 12, 44, 5, '#2a1608');
}
function headBald(h) {      // bald, handlebar moustache, gold tooth, earring, stubble
  const R = 57, m = h.mouth || 0;
  pirateEarring(R + 2, 18); circ(0, 0, R, SKIN, 6);
  arc(-4, -4, R - 12, 3.9, 4.6, 5, 'rgba(255,255,255,.9)');
  const r = mb(8); for (let i = 0; i < 40; i++) { const a = r() * Math.PI, d = 28 + r() * 24; ctx.fillStyle = 'rgba(60,40,30,.5)'; ctx.fillRect(Math.cos(a) * d - 1, 20 + Math.sin(a) * d * .5, 2.2, 2.2); }
  const bu = h.expr === 'surprised' ? -7 : 0;
  brow(8, -18 + bu, 36, -14 + bu, 9, '#3a2a1c'); brow(-8, -18 + bu, -36, -14 + bu, 9, '#3a2a1c');
  eyes(h, 20, -3, 4.2, h.look || 0, { white: true });
  [-20, 20].forEach(x => arc(x, 8, 9, .25, 2.9, 2.5, 'rgba(60,40,30,.4)'));
  circ(0, 12, 11, '#f2a58f', 4.5);
  // handlebar moustache
  [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(0, 28); ctx.bezierCurveTo(sd * 22, 20, sd * 46, 30, sd * 52, 44); ctx.bezierCurveTo(sd * 54, 28, sd * 40, 14, sd * 54, 8); ctx.bezierCurveTo(sd * 36, 24, sd * 14, 36, 0, 36); fl('#2a1c14'); stk(3.5); });
  if (m > .1) { ell(0, 48 + m * 4, 12 * mx(h), (4 + m * 11) * my(h), '#5a1520', 4); poly([[-3, 45], [4, 45], [4, 53], [-3, 53]], '#f1c453', 2); }
  else { arc(0, 42, 14, .25, 2.9, 4.5); poly([[-3, 49], [4, 49], [4, 56], [-3, 56]], '#f1c453', 2); }
}
function headSkinny(h) {    // black skull bandana, huge eyes, thin moustache, missing tooth
  const R = 57, m = h.mouth || 0;
  circ(0, 0, R, SKIN, 6);
  ctx.beginPath(); ctx.moveTo(-R + 2, -4); ctx.bezierCurveTo(-R - 2, -R - 10, R + 2, -R - 10, R - 2, -4); ctx.quadraticCurveTo(0, -24, -R + 2, -4); fl('#23222b'); stk(5);
  circ(0, -34, 11, '#f4f1e6', 2.5); [-4, 4].forEach(x => circ(x, -35, 2.5, '#23222b', 0)); ln(-6, -26, 6, -26, 2.5, '#23222b');
  ctx.save(); ctx.translate(R - 6, -22); [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(24, 4 + sd * 8 + Math.sin(NOW * 8 + sd) * 4, 42, 18 + sd * 18); ctx.lineTo(26, 6 + sd * 12); ctx.closePath(); fl('#23222b'); stk(4); }); ctx.restore();
  const r = mb(4); [-1, 1].forEach(sd => { for (let i = 0; i < 4; i++) circ(sd * (30 + r() * 10), 8 + r() * 10, 1.6, '#c9774a', 0); });
  [-19, 19].forEach(x => { circ(x, -2, h.blink ? 0 : 13, '#fff', 4); if (!h.blink) circ(x + (h.look || 0) * 3, -2, 5, INK, 0); });
  if (h.blink) [-19, 19].forEach(x => ln(x - 9, -2, x + 9, -2, 4));
  brow(-9, -19, -30, -24, 5); brow(9, -19, 30, -24, 5);
  circ(0, 14, 7, '#f2a58f', 4);
  ctx.beginPath(); ctx.moveTo(-26, 26); ctx.quadraticCurveTo(0, 20, 26, 26); stk(4.5, '#2a1c14');
  if (m > .1) { ell(0, 42 + m * 4, 13 * mx(h), (4 + m * 11) * my(h), '#5a1520', 4); }
  else { arc(0, 36, 16, .2, 2.95, 4.5); poly([[3, 44], [10, 44], [10, 50], [3, 50]], '#17151b', 0); }
}
function headBlackbeard(h) { // tricorn, enormous black beard with smoking fuses
  const R = 57, t = NOW, m = h.mouth || 0;
  circ(0, 0, R, SKIN, 6);
  // big beard
  ctx.beginPath(); ctx.moveTo(-R - 8, -6); ctx.bezierCurveTo(-R - 30, 40, -R - 12, 100, -20, 118); ctx.quadraticCurveTo(0, 130, 20, 118); ctx.bezierCurveTo(R + 12, 100, R + 30, 40, R + 8, -6); ctx.quadraticCurveTo(R * .5, 22, 0, 18); ctx.quadraticCurveTo(-R * .5, 22, -R - 8, -6); fl('#15131a'); stk(5);
  [[-52, 20], [52, 20], [-44, 70], [44, 70]].forEach(([x, y], i) => { ln(x, y, x + (i % 2 ? -6 : 6), y + 20, 4, '#4a4a58'); ln(x, y, x, y - 12, 4, '#8a6a3a'); const sp = (t * 9 + i) % 1; star(x + Math.sin(t * 14 + i) * 3, y - 16 - sp * 8, 7 - sp * 4, 5, '#ffb52e', 0); circ(x, y - 12, 2.5, '#ffe27a', 0); ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.bezierCurveTo(x + 8, y - 26 - Math.sin(t * 3 + i) * 6, x - 8, y - 40, x + 6, y - 58 - i * 4); stk(5, 'rgba(120,120,130,.45)'); });
  eyes(h, 19, -6, 4.5, h.look || 0, { white: true });
  const bu = h.expr === 'surprised' ? -6 : 0;
  brow(8, -14 + bu, 36, -22 + bu, 10, '#15131a'); brow(-8, -14 + bu, -36, -22 + bu, 10, '#15131a');
  circ(0, 12, 9, '#f2a58f', 4.5);
  if (m > .1) { ell(0, 40 + m * 4, 15 * mx(h), (5 + m * 14) * my(h), '#5a1520', 4); } else ln(-12, 42, 12, 42, 5, '#e9e4d6');
  // tricorn hat
  ctx.beginPath(); ctx.moveTo(-R - 36, -22); ctx.quadraticCurveTo(-R, -46, -30, -78); ctx.lineTo(30, -78); ctx.quadraticCurveTo(R, -46, R + 36, -22); ctx.quadraticCurveTo(0, -14, -R - 36, -22); fl('#1d1b24'); stk(5);
  ln(-R - 30, -24, R + 30, -24, 4, '#f1c453'); circ(0, -40, 7, '#f1c453', 3);
  ctx.beginPath(); ctx.moveTo(30, -76); ctx.quadraticCurveTo(70, -108 + Math.sin(t * 4) * 4, 80, -62); ctx.quadraticCurveTo(60, -84, 30, -70); fl('#e5483f'); stk(3.5);
}
function headFriend(h) { circ(0, 0, 57, SKIN, 6); eyes(h, 19, -4, 4.2, h.look || 0); mouthShape(h, 0, 28, 30); }

const HEADS = { caesar: headCaesar, captain: headCaptain, bald: headBald, skinny: headSkinny, blackbeard: headBlackbeard, plain: headFriend };
function drawHeadAt(kind, x, y, sc = 1, h = {}) { ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); HEADS[kind](h); ctx.restore(); }

// ------------------------------------------------------------------ stickman rig
const TH = 68, SH = 66, TO = 118, UA = 62, FA = 58, HR = 57;
const OUTFIT = {
  caesar: { col: '#fbf8ef', kind: 'toga' },
  captain: { col: '#efe9d6', kind: 'pirate', stripe: '#c0392b' },
  bald: { col: '#efe9d6', kind: 'pirate', stripe: '#2b5fa8' },
  skinny: { col: '#efe9d6', kind: 'pirate', stripe: '#2b2b36' },
  blackbeard: { col: '#2b2b36', kind: 'coat' },
  plain: { col: null }
};

function figure(o) {
  const s = o.s || 1, dir = o.dir || 1, t = NOW, ph = o.ph || 0, pz = o.pose || {};
  const talk = o.mouth || 0, beatk = Math.abs(Math.sin(t * 9.5 + ph));
  const bob = (pz.bob !== undefined ? pz.bob : Math.sin(t * 3.2 + ph) * 2.2) + talk * 4 * beatk - (o.hop || 0);
  const hip = { x: (pz.dx || 0) + Math.sin(t * 1.1 + ph) * 3, y: -(TH + SH) + (pz.crouch || 0) - bob + 0 };
  const lean = (pz.lean || 0) + Math.sin(t * 1.7 + ph) * .012 + talk * .025 * Math.sin(t * 4.3 + ph);
  const N = { x: hip.x + Math.sin(lean) * TO, y: hip.y - Math.cos(lean) * TO };
  const tilt = (pz.tilt || 0) + talk * .05 * Math.sin(t * 8.1 + ph) + (o.nod || 0), hd = { x: N.x + Math.sin(lean + tilt * .5) * (HR + 8), y: N.y - Math.cos(lean + tilt * .5) * (HR + 8) };
  o.hx = o.x + dir * s * hd.x; o.hy = o.y + s * hd.y;
  const of = OUTFIT[o.kind] || OUTFIT.plain;
  const blink = ((t + ph * 1.7) % 3.3) < .11;
  const h = { mouth: o.mouth || 0, mw: o.mw, expr: o.expr || 'neutral', blink: o.blink !== undefined ? o.blink : blink, look: o.look || 0, shock: o.shock || 0 };

  ctx.save(); ctx.translate(o.x, o.y); ctx.scale(s * dir * (o.sx || 1), s * (o.sy || 1));
  ell(0, 4, 78, 12, 'rgba(60,45,30,.16)', 0);
  if (o.rot) { ctx.translate(0, -(TH + SH)); ctx.rotate(o.rot); ctx.translate(0, TH + SH); }
  if (o.behind) o.behind(hip, N, hd);

  // legs
  const legs = pz.legs || (pz.walk !== undefined ? (() => {
    const w = pz.walk; const f = p => { const a1 = Math.sin(p) * .62, a2 = a1 - Math.max(0, Math.cos(p)) * .85; return [a1, a2]; };
    return { a: f(w), b: f(w + Math.PI) };
  })() : (() => { const sw = Math.sin(t * 1.3 + ph) * .035; return { a: [-.07 + sw, -.07 + sw], b: [.07 + sw, .07 + sw] }; })());
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
    if (o.barefoot) { ell(fx - 2, fy, 17, 8, SKIN, 5); [0, 1, 2].forEach(i => circ(fx + 11 + i * 4, fy - 1 + i * 1.2, 2.4, SKIN, 2.5)); }
    else ell(fx, fy, 19, 9, INK, 0);
    return { kx, ky, ax, ay };
  };
  const legA = legDraw(legs.a, true, o.sockA), legB = legDraw(legs.b, false, o.sockB);

  // back arm
  const sh = { x: N.x - Math.sin(lean) * 14, y: N.y + Math.cos(lean) * 14 };
  const armDraw = (A) => {
    const [a1, a2] = A, ex = sh.x + Math.sin(a1) * UA, ey = sh.y + Math.cos(a1) * UA, wx = ex + Math.sin(a1 + a2) * FA, wy = ey + Math.cos(a1 + a2) * FA;
    ln(sh.x, sh.y, ex, ey, 9); ln(ex, ey, wx, wy, 9); circ(wx, wy, 9, SKIN, 4.5); return { wx, wy, ex, ey };
  };
  const arms = { a: pz.la || [.12, .12], b: pz.ra || [-.12, -.1] };
  const aw = armDraw(arms.a);
  if (o.onHandA) { ctx.save(); ctx.translate(aw.wx, aw.wy); o.onHandA(aw); ctx.restore(); }

  // torso + clothes
  ln(hip.x, hip.y, N.x, N.y, 10);
  if (of.col) {
    const px = Math.cos(lean), py = Math.sin(lean), long = of.kind === 'robe' || of.kind === 'toga', top = long ? 38 : 33, bot = long ? 52 : 27, ext = long ? 62 : 0;
    const A = [N.x - px * top + Math.sin(lean) * 4 * 0, N.y - py * top + 4], B = [N.x + px * top, N.y + py * top + 4];
    const fl_ = long ? Math.sin(t * 5 + ph) : 0, C = [hip.x + px * bot + fl_ * 7, hip.y + py * bot + ext * .6 + fl_ * 4], D = [hip.x - px * bot + Math.sin(t * 5 + ph + 1.3) * 7 * (long ? 1 : 0), hip.y - py * bot + ext * .6];
    poly([A, B, C, D], of.col, 6);
    if (of.kind === 'toga') { poly([[A[0] + 2, A[1] + 2], [A[0] + 26, A[1]], [C[0] + 2, C[1] - 2], [C[0] - 24, C[1] - 4]], '#7b2d8e', 3.5); circ(A[0] + 16, A[1] + 12, 5, '#f1c453', 2.5); ln(D[0] + 8, D[1] - 14, C[0] - 8, C[1] - 14, 3, 'rgba(120,40,140,.5)'); }
    if (of.kind === 'pirate') {
      ctx.save(); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.lineTo(D[0], D[1]); ctx.closePath(); ctx.clip();
      for (let i = 0; i < 7; i++) ln(A[0] - 20, N.y + 18 + i * 18, B[0] + 20, N.y + 18 + i * 18, 8, of.stripe);
      ctx.restore(); poly([A, B, C, D], null, 6);
      poly([[N.x - 22, N.y + 6], [N.x, N.y + 6], [N.x - 6, hip.y - 8], [N.x - 26, hip.y - 8]], '#3b2a20', 3); poly([[N.x + 22, N.y + 6], [N.x, N.y + 6], [N.x + 6, hip.y - 8], [N.x + 26, hip.y - 8]], '#3b2a20', 3);
      ln(hip.x - 28, hip.y - 10, hip.x + 28, hip.y - 10, 9, '#4a2f1a'); rrect(hip.x - 8, hip.y - 19, 16, 18, 3, '#f1c453', 3);
    }
    if (o.tied) { for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(N.x - px * 36, N.y + 34 + i * 24); ctx.quadraticCurveTo(N.x, N.y + 46 + i * 24, N.x + px * 36, N.y + 34 + i * 24); stk(10, '#3b2a1a'); ctx.beginPath(); ctx.moveTo(N.x - px * 36, N.y + 34 + i * 24); ctx.quadraticCurveTo(N.x, N.y + 46 + i * 24, N.x + px * 36, N.y + 34 + i * 24); stk(6, '#c9a06a'); }
      circ(N.x + 8, N.y + 66, 7, '#c9a06a', 3.5); ln(N.x + 8, N.y + 70, N.x + 22, N.y + 106, 6, '#3b2a1a'); ln(N.x + 8, N.y + 70, N.x + 22, N.y + 106, 3.5, '#c9a06a'); }
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
  if (o.anger) { circ(0, 0, 55, `rgba(229,60,50,${.42 * o.anger})`, 0); for (let i = 0; i < 2; i++) { const p3 = ((t * 2.4 + i * .5) % 1); [-1, 1].forEach(sd => circ(sd * 62 + sd * p3 * 10, -10 - p3 * 90, 10 + p3 * 16, `rgba(255,255,255,${.85 * (1 - p3) * o.anger})`, 0)); } }
  ctx.restore();
  if (o.after) o.after(hip, N, hd);
  ctx.restore();
  o.legA = legA; o.legB = legB;
}

// talking gesture helper: returns arm angles that pump while mouth is open
function gesture(m, base = [.9, .5], amp = .5) { const k = Math.sin(NOW * 8) * amp * m; return [base[0] + k, base[1] - k * .5]; }
