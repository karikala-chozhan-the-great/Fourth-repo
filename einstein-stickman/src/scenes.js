'use strict';
// ---------------------------------------------------------------------------
// props, scenes, transitions, captions
// ---------------------------------------------------------------------------
let PAPERC = null;
function makePaper() {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
  const r = mb(42);
  for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${120 + r() * 60 | 0},${90 + r() * 40 | 0},50,${r() * .04})`; g.fillRect(r() * W, r() * H, 1 + r() * 3, 1 + r() * 2); }
  PAPERC = c;
}
function vignette() {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .5, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(90,60,20,.20)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
const GY = 872; // ground line
function bg(o = {}) {
  ctx.drawImage(PAPERC, 0, 0);
  if (o.sky) { const g = ctx.createLinearGradient(0, 0, 0, GY); g.addColorStop(0, o.sky[0]); g.addColorStop(1, o.sky[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, GY); }
  (o.blobs || []).forEach(([x, y, r, c]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = c; ctx.fill(); });
  ctx.fillStyle = o.floor || '#eadfc2'; ctx.fillRect(0, GY, W, H - GY);
  ctx.beginPath(); ctx.moveTo(0, GY); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, GY + jit(1.6)); stk(5);
}
function tag(title, sub, x, y, t0, t1, o = {}) {
  if (NOW < t0 || NOW > t1 + .25) return;
  const sc = Math.min(eBack(P(NOW, t0, t0 + .25)), 1 - P(NOW, t1, t1 + .2)); if (sc <= 0) return;
  const subs = Array.isArray(sub) ? sub : [sub];
  ctx.save(); ctx.font = `56px ${FONT.head}`; const w1 = ctx.measureText(title).width; ctx.font = `31px ${FONT.hand}`; const w2 = Math.max(...subs.map(s => ctx.measureText(s).width)); ctx.restore();
  const w = Math.max(w1, w2) + 56, h = 92 + subs.length * 36;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? -.04); ctx.scale(sc, sc);
  rrect(-w / 2 + 6, -h / 2 + 8, w, h, 10, 'rgba(60,40,20,.18)', 0);
  rrect(-w / 2, -h / 2, w, h, 10, o.color || '#fff0a0', 4);
  ctx.save(); ctx.rotate(.05); rrect(-44, -h / 2 - 15, 88, 28, 4, 'rgba(255,255,255,.75)', 2, 'rgba(0,0,0,.25)'); ctx.restore();
  text(title, 0, -h / 2 + 44, { font: 'head', size: 56 });
  subs.forEach((s, i) => text(s, 0, -h / 2 + 88 + i * 36, { size: 31, color: '#4a3b2a' }));
  ctx.restore();
}
function cloud(x, y, s = 1, col = '#fff') {
  const parts = [[0, 0, 46], [-52, 12, 36], [50, 10, 40], [-22, -26, 36], [24, -24, 34]];
  parts.forEach(([dx, dy, r]) => circ(x + dx * s, y + dy * s, r * s, col, 5));
  parts.forEach(([dx, dy, r]) => circ(x + dx * s, y + dy * s, r * s - 2, col, 0));
}
function chalkboard(x, y, w, h) {
  rrect(x - 16, y - 16, w + 32, h + 32, 14, '#b98a58', 6);
  rrect(x, y, w, h, 8, '#2d4a42', 4);
  ctx.save(); ctx.globalAlpha = .12; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(x + w * (.15 + i * .15), y + h * (.3 + (i % 3) * .2), 120, 40, .3, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); } ctx.restore();
  rrect(x + 30, y + h + 16, w - 60, 14, 5, '#8a6238', 4);
  rrect(x + w * .3, y + h + 4, 40, 10, 3, '#f5f2e8', 2); rrect(x + w * .3 + 50, y + h + 6, 28, 8, 3, '#f5f2e8', 2);
}
function chalkText(s, x, y, size, prog, o = {}) {
  ctx.save(); ctx.font = `${size}px ${FONT[o.font || 'hand']}`; const wd = ctx.measureText(s).width; ctx.restore();
  const left = (o.align === 'center') ? x - wd / 2 : x;
  ctx.save(); ctx.beginPath(); ctx.rect(left - 14, y - size, (wd + 28) * clamp(prog), size * 2); ctx.clip();
  text(s, left, y, { font: o.font || 'hand', size, color: o.color || '#f5f2e8', align: 'left' }); ctx.restore();
  return left + wd * clamp(prog);
}
function desk(x, y, w, h = 190, col = '#b9814a') {
  rrect(x, y, w, 26, 6, '#cf9a60', 6);
  rrect(x + 16, y + 26, w - 32, h - 26, 4, col, 6);
  rrect(x + 36, y + 50, w * .36, 56, 6, '#a56f3c', 4); circ(x + 36 + w * .18, y + 78, 6, '#f1c453', 3);
  rrect(x + w - 36 - w * .36, y + 50, w * .36, 56, 6, '#a56f3c', 4); circ(x + w - 36 - w * .18, y + 78, 6, '#f1c453', 3);
}
function bulb(x, y, r, on, t = NOW) {
  if (on > 0) { ctx.save(); ctx.globalAlpha = .35 * on; const g = ctx.createRadialGradient(x, y, r * .3, x, y, r * 4.2); g.addColorStop(0, '#ffe66b'); g.addColorStop(1, 'rgba(255,230,107,0)'); ctx.fillStyle = g; ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10); ctx.restore();
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283 + t * .5, d1 = r * 1.5, d2 = r * (2.1 + .3 * Math.sin(t * 9 + i)); ln(x + Math.cos(a) * d1, y + Math.sin(a) * d1, x + Math.cos(a) * d2 * on, y + Math.sin(a) * d2 * on, 5, '#f2b705'); } }
  circ(x, y, r, on > 0 ? '#fff0a0' : '#e8eef2', 5); rrect(x - r * .5, y + r * .85, r, r * .7, 4, '#9aa0a8', 4);
  if (on > 0) { ctx.beginPath(); ctx.moveTo(x - r * .3, y + r * .7); ctx.lineTo(x - r * .2, y); ctx.lineTo(x, y + r * .3); ctx.lineTo(x + r * .2, y); ctx.lineTo(x + r * .3, y + r * .7); stk(3.5, '#e07b00'); }
}
function envelope(x, y, w, rot = 0, label = '') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); const h = w * .66;
  rrect(-w / 2, -h / 2, w, h, 6, '#fff7d6', 5);
  ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(0, h * .12); ctx.lineTo(w / 2, -h / 2); stk(4);
  circ(0, h * .1, w * .09, '#d63c3c', 4); star(0, h * .1, w * .06, 5, '#ffd23f', 0);
  if (label) text(label, 0, h * .33, { font: 'head', size: w * .18, color: '#c0392b' });
  ctx.restore();
}
function flag(x, y, w) {
  const h = w * .68; ln(x, y + h + 120, x, y - 20, 8, '#7b5a3a'); circ(x, y - 24, 8, '#f1c453', 3);
  ctx.save(); ctx.translate(x, y); const wv = Math.sin(NOW * 4) * 3;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(w * .3, -8 + wv, w * .7, 8 - wv, w, 0); ctx.lineTo(w, h); ctx.bezierCurveTo(w * .7, h + 8 - wv, w * .3, h - 8 + wv, 0, h); ctx.closePath(); fl('#fff'); stk(4);
  [h * .14, h * .74].forEach(yy => { ctx.beginPath(); ctx.moveTo(0, yy); ctx.bezierCurveTo(w * .3, yy - 8 + wv, w * .7, yy + 8 - wv, w, yy); stk(h * .12, '#2f6fcf'); });
  const cx = w / 2, cy = h / 2, r = h * .2; poly([[cx, cy - r], [cx + r * .87, cy + r * .5], [cx - r * .87, cy + r * .5]], null, 3.5, '#2f6fcf'); poly([[cx, cy + r], [cx + r * .87, cy - r * .5], [cx - r * .87, cy - r * .5]], null, 3.5, '#2f6fcf');
  ctx.restore();
}
function sparkles(cx, cy, rad, n, t0, dur = 1) {
  const p = (NOW - t0) / dur; if (p < 0 || p > 1) return; const r = mb(Math.round(cx + cy));
  for (let i = 0; i < n; i++) { const a = r() * 6.283, d = rad * (.4 + r() * .6) * eOut(p), s = (1 - p) * (8 + r() * 14); star(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s, 4, '#ffd23f', 2.5, p * 3); }
}
function burst(cx, cy, r0, r1, t0, dur = .5, col = '#ff7a2f') {
  const p = (NOW - t0) / dur; if (p < 0 || p > 1) return;
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; ln(cx + Math.cos(a) * lerp(r0, r1, eOut(p)), cy + Math.sin(a) * lerp(r0, r1, eOut(p)), cx + Math.cos(a) * lerp(r0 + 18, r1 + 26, eOut(p)), cy + Math.sin(a) * lerp(r0 + 18, r1 + 26, eOut(p)), 7 * (1 - p), col); }
}
function dizzy(cx, cy, t0) {
  if (NOW < t0) return; for (let i = 0; i < 4; i++) { const a = NOW * 7 + i * 1.57; star(cx + Math.cos(a) * 62, cy + Math.sin(a) * 18, 12, 5, '#ffd23f', 3); }
}
function confetti(t0, n = 150) {
  if (NOW < t0) return; const r = mb(77), cols = ['#e5483f', '#2f6fcf', '#ffd23f', '#3fb67a', '#a64dd6', '#ff8c42'];
  for (let i = 0; i < n; i++) {
    const st = t0 + r() * 1.6, v = 180 + r() * 220, x0 = r() * W, sw = 30 + r() * 60, ph = r() * 6, c = cols[i % cols.length], sz = 8 + r() * 10, rt = r() * 6;
    const tt = NOW - st; if (tt < 0) continue; const y = -30 + tt * v; if (y > H + 20) continue;
    ctx.save(); ctx.translate(x0 + Math.sin(tt * 2 + ph) * sw, y); ctx.rotate(rt + tt * 5); ctx.scale(1, Math.cos(tt * 6 + ph)); ctx.fillStyle = c; ctx.fillRect(-sz / 2, -sz / 4, sz, sz / 2); ctx.restore();
  }
}
function tumbleweed(x, y, rot) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1.5, 1.5); ctx.rotate(rot); const r = mb(3);
  for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(0, 0, 36 - i, 30 + i * .5, r() * 3, 0, 7); stk(3, '#8a6a3a'); }
  ctx.restore();
}
function chair(x, y) {
  rrect(x - 56, y - 270, 112, 190, 26, '#b03a48', 6); rrect(x - 48, y - 262, 96, 174, 20, '#c9505e', 0);
  star(x, y - 190, 20, 5, '#f1c453', 3.5);
  rrect(x - 70, y - 90, 140, 40, 12, '#8e2f3d', 6);
  ln(x - 56, y - 50, x - 56, y, 9); ln(x + 56, y - 50, x + 56, y, 9);
}
function tree(x, y, s = 1) {
  rrect(x - 36 * s, y - 330 * s, 72 * s, 330 * s, 18, '#8a5a34', 6);
  [[0, -420, 190], [-150, -360, 130], [150, -360, 130], [-70, -470, 120], [90, -480, 115]].forEach(([dx, dy, r]) => circ(x + dx * s, y + dy * s, r * s, '#7fc27a', 6));
  [[0, -420, 190], [-150, -360, 130], [150, -360, 130], [-70, -470, 120], [90, -480, 115]].forEach(([dx, dy, r]) => circ(x + dx * s, y + dy * s, r * s - 3, '#7fc27a', 0));
}
function apple(x, y, r = 22, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); circ(-r * .25, 0, r * .85, '#e5483f', 5); circ(r * .25, 0, r * .85, '#e5483f', 5); circ(0, 2, r * .8, '#e5483f', 0);
  ln(0, -r * .7, r * .2, -r * 1.2, 4, '#5b3a1e'); ell(r * .55, -r * 1.05, r * .4, r * .2, '#58b368', 3, INK, -.4); ctx.restore();
}
function paper(x, y, w, h, rot = 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); rrect(-w / 2, -h / 2, w, h, 3, '#fff', 4); for (let i = 1; i < 4; i++) ln(-w / 2 + 10, -h / 2 + i * h / 4.5, w / 2 - 10, -h / 2 + i * h / 4.5, 2, 'rgba(0,0,0,.28)'); ctx.restore(); }
function clock(x, y, r, ang, fast) {
  circ(x, y, r, '#fff', 7); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; ln(x + Math.cos(a) * r * .82, y + Math.sin(a) * r * .82, x + Math.cos(a) * r * .94, y + Math.sin(a) * r * .94, 4); }
  ln(x, y, x + Math.cos(ang) * r * .78, y + Math.sin(ang) * r * .78, 5); ln(x, y, x + Math.cos(ang / 12) * r * .5, y + Math.sin(ang / 12) * r * .5, 7); circ(x, y, 6, INK, 0);
  if (fast) for (let i = 0; i < 3; i++) ln(x - r - 22 - i * 12, y - 12 + i * 12, x - r - 6 - i * 12, y - 12 + i * 12, 4);
}
function sock(x, y, s = 1) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.beginPath(); ctx.moveTo(-20, -40); ctx.lineTo(20, -40); ctx.lineTo(20, 10); ctx.quadraticCurveTo(52, 24, 40, 40); ctx.quadraticCurveTo(0, 50, -20, 30); ctx.closePath(); fl('#e5483f'); stk(5); for (let i = 0; i < 3; i++) ln(-20, -28 + i * 14, 20, -28 + i * 14, 5, '#fff'); ctx.restore(); }

// caption bar for narrator lines (sentence at a time)
function captions(t) {
  TL.beats.forEach(b => {
    if (b.who !== 'narr' || b.id === 'b14') return;
    b.segs.forEach(([s, a, c], i) => {
      const next = b.segs[i + 1]; const t0 = a - .05, t1 = next ? next[1] - .05 : c + .3;
      if (t < t0 || t >= t1) return;
      const k = eBack(P(t, t0, t0 + .15)); const size = 50, font = `bold ${size}px ${FONT.cap}`;
      const lines = wrap(s, 1500, font); ctx.font = font; const wd = Math.max(...lines.map(l => ctx.measureText(l).width)) + 70, hh = lines.length * 58 + 26;
      ctx.save(); ctx.translate(W / 2, 990 - (lines.length - 1) * 26); ctx.scale(k, k);
      rrect(-wd / 2, -hh / 2, wd, hh, 28, 'rgba(255,255,255,.94)', 5);
      lines.forEach((l, j) => text(l, 0, -hh / 2 + 13 + 29 + j * 58, { font: 'cap', size, color: INK, base: 'middle' })); ctx.restore();
    });
  });
}
function headline(txt, sub, y = 130) { text(txt, W / 2, y, { font: 'head', size: 74, color: INK, stroke: '#fff', sw: 14 }); if (sub) text(sub, W / 2, y + 58, { size: 38, color: '#6b5a44' }); }

// =========================================================================== SCENES
// ---- S1: title + Einstein intro
function S1(t) {
  bg({ blobs: [[1330, 520, 470, '#ffe9a8'], [300, 400, 250, '#dff0ea']] });
  // chalkboard with a clean E=mc^2
  chalkboard(150, 300, 650, 410);
  chalkText('E = mc²', 215, 460, 150, P(t, 3.0, 5.0));
  chalkText('IQ: ∞', 230, 620, 70, P(t, 5.0, 5.7), { color: '#ffe27a' });
  [[620, 360], [700, 400], [690, 330]].forEach(([x, y], i) => P(t, 3.4 + i * .5, 3.9 + i * .5) > 0 && star(x, y, 18, 4, '#f5f2e8', 0, t));
  // Einstein
  const pin = eBack(P(t, 2.1, 2.6)), hit = P(t, 6.85, 7.0) > 0 && t < 8.5;
  const shock = t > 6.85 ? Math.max(0, 1 - (t - 6.85) * .5) * eElastic(P(t, 6.85, 7.6)) : 0;
  const ein = { kind: 'einstein', x: 960, y: GY + 10 - (1 - pin) * 260, s: 1.3 * clamp(pin, .001, 1.2), dir: -1, expr: t > 6.85 ? 'surprised' : 'neutral', shock, look: -1,
    pose: { lean: -.03, ra: [2.05 + Math.sin(t * 9) * (t < 6.8 ? .09 : 0), -.35], la: [-.15, .12], tilt: t > 6.85 ? .12 : 0 }, hop: t > 6.85 && t < 7.2 ? Math.sin(P(t, 6.85, 7.2) * 3.14) * 40 : 0,
    onHandB: () => { ctx.save(); ctx.rotate(-.3); rrect(-3, -10, 20, 8, 3, '#f5f2e8', 2); ctx.restore(); } };
  if (t >= 2.1) figure(ein);
  // flying job-offer envelope: arcs in and bonks him
  if (t >= 6.0) {
    const f = P(t, 6.0, 6.85); const sx = 1900, sy = 120, tx = 960 - 20, ty = 880 - 1.3 * 317 - 40;
    if (t < 6.85) { const x = lerp(sx, tx, eIO(f)), y = lerp(sy, ty, f * f) - Math.sin(f * 3.14) * 150; for (let i = 1; i < 5; i++) ln(x + 40 * i, y - 6 * i + 10, x + 40 * i + 28, y - 6 * i + 12, 5, 'rgba(0,0,0,.25)'); envelope(x, y, 180, -.3 + f * 1.5, 'JOB OFFER'); }
    else { const g = P(t, 6.85, 7.4); const x = lerp(tx, 1190, eOut(g)), y = lerp(ty, GY - 40, g * g) - Math.sin(g * 3.14) * 40; envelope(x, y, 180, .2 * g, 'JOB OFFER'); }
    burst(940, 880 - 1.3 * 330, 40, 140, 6.85, .5);
    if (t > 6.85) text('!?', 1120, 400 + Math.sin(t * 20) * 3, { font: 'head', size: 120, color: '#e5483f', stroke: '#fff', sw: 12, sc: eBack(P(t, 6.9, 7.2)), rot: .15 });
  }
  tag('ALBERT EINSTEIN', ['Smartest man alive.', 'Hair: unionized.'], 1500, 470, 3.1, 7.4);
  // title slam, then shrinks to a banner
  const slam = eBack(P(t, .1, .45)), shrink = eIO(P(t, 2.3, 3.0));
  if (t >= .1) {
    const sc = lerp(1.0, .56, shrink) * lerp(1.6, 1, slam), y1 = lerp(430, 92, shrink), y2 = lerp(570, 178, shrink);
    ctx.save(); ctx.globalAlpha = 1 - P(t, 7.4, 7.9);
    text('THE TIME EINSTEIN WAS OFFERED', W / 2, y1, { font: 'head', size: 96, color: INK, stroke: '#fff', sw: 18, sc, rot: -.015 + (t < .5 ? Math.sin(t * 90) * .01 : 0) });
    text('THE PRESIDENCY OF ISRAEL', W / 2, y2, { font: 'head', size: 140, color: '#2f6fcf', stroke: '#fff', sw: 22, sc, rot: -.015 });
    if (t > 1.0 && t < 2.4) text('A (mostly) true story  •  1952', W / 2, 700, { size: 56, color: '#6b5a44', alpha: P(t, 1.0, 1.4) });
    ctx.restore();
  }
}

// ---- S2: Israel's office  (Weizmann leaves, Ben-Gurion panics, Einstein pops into his head)
function S2(t) {
  bg({ blobs: [[330, 440, 400, '#dfeaf7'], [1380, 560, 400, '#ffe3d1']], floor: '#e6d9b8' });
  // wall clock
  const fast = t > 14.5, ang = fast ? 14.5 * 1.2 + (t - 14.5) * 14 : t * 1.2;
  clock(1790, 130, 74, ang, fast && t < 18.6);
  flag(1650, 300, 150);
  // --- Weizmann
  const wl = t - E.b2_float, rise = Math.pow(P(t, 9.9, 12.5), 2) * 1100;
  const wz = { kind: 'weiz', x: 470, y: GY + 8 - rise, s: 1.2, dir: 1, expr: t > E.b2_float ? 'happy' : 'neutral', ph: 1,
    pose: { la: t > E.b2_float ? [2.5 + Math.sin(t * 10) * .35, -.5] : [.12, .1], ra: [-.1, -.1] },
    behind: () => { if (t > E.b2_float) { const k = eBack(P(t, E.b2_float, E.b2_float + .4)); [-1, 1].forEach(sd => { ctx.save(); ctx.translate(-8, -230); ctx.rotate(sd * (.9 + Math.sin(t * 9) * .25)); ctx.scale(k, k); ell(sd * 70, -10, 82, 28, '#fff', 5, INK, 0); ell(sd * 62, 16, 66, 20, '#f3f6fb', 4, INK, 0); ctx.restore(); }); } },
    after: (hip, N, hd) => { if (t > E.b2_float) { const k = eBack(P(t, E.b2_float, E.b2_float + .4)); ctx.save(); ctx.translate(hd.x, hd.y - 88 - Math.sin(t * 4) * 3); ctx.scale(k, k); ell(0, 0, 40, 11, null, 7, '#f2b705'); ctx.restore(); } } };
  if (rise < 1000) {
    if (t > E.b2_float) { cloud(470, GY + 22 - rise, 1.5); }
    figure(wz);
  }
  tag('CHAIM WEIZMANN', ['1st President of Israel', '(retiring from the chair)'], 470, 390, 8.15, 9.6);
  // empty chair once he's gone
  if (t > 12.0) { const k = eBack(P(t, 12.0, 12.4)); ctx.save(); ctx.translate(470, GY); ctx.scale(k, k); ctx.translate(-470, -GY); chair(470, GY - 10); ctx.restore(); }
  if (t > 12.3 && t < 17.5) tumbleweed(lerp(-80, 850, P(t, 12.3, 18.5)), GY - 36 - Math.abs(Math.sin(t * 5)) * 16, t * 5);
  // WANTED sign
  if (t >= E.sign_drop) { const k = eElastic(P(t, E.sign_drop, E.sign_drop + .7)), y = lerp(-260, 270, k), rot = Math.sin(t * 2.2) * .02 * (1 + (1 - k) * 4);
    ctx.save(); ctx.translate(480, y); ctx.rotate(rot); ln(-200, -300, -200, -100, 4); ln(200, -300, 200, -100, 4);
    rrect(-250, -112, 500, 240, 14, '#fffbe8', 6);
    text('WANTED:', 0, -62, { font: 'head', size: 54, color: '#c0392b' }); text('PRESIDENT', 0, -4, { font: 'head', size: 84, color: INK });
    text('Must be: famous, wise,', 0, 52, { size: 33, color: '#4a3b2a' }); text('and free on weekends.  Pay: honor™', 0, 88, { size: 33, color: '#4a3b2a' }); ctx.restore(); }
  // --- Ben-Gurion at desk
  const bm = mouthOf('b3', t), inb3 = t > beat('b3').start - .05 && t < beat('b3').end + .2, dingP = P(t, E.ding, E.ding + .5);
  const panicky = t < E.ding;
  const bg_ = { kind: 'gurion', x: 1330, y: GY + 4, s: 1.22, dir: -1, mouth: bm, sweat: t > 11.6 && t < E.ding, ph: 2, expr: t > E.ding ? 'happy' : (t > 11.6 ? 'worried' : 'neutral'),
    hop: t > E.ding ? Math.abs(Math.sin((t - E.ding) * 7)) * 36 * (1 - P(t, E.ding, E.ding + 1.1)) : 0,
    pose: panicky ? { la: [2.75 + Math.sin(t * 9) * .08 * (t > 14.5 ? 3 : 1), -1.4], ra: [2.6 + Math.cos(t * 9) * .08, -1.5], tilt: Math.sin(t * 3) * .05 } : { la: [-2.5 + Math.sin(t * 12) * .35, .2], ra: [2.5 - Math.sin(t * 12) * .35, -.2] } };
  if (t > 11.6 && t < E.ding && inb3) { bg_.pose.la = gesture(bm, [2.6, -1], .6); }
  figure(bg_);
  desk(1110, 700, 470, 172);
  // pile of paper
  const sheets = Math.floor(P(t, 11.5, 14.4) * 13);
  for (let i = 0; i < sheets; i++) { const drop = P(t, 11.5 + i * .22, 11.5 + i * .22 + .18); paper(1195 + ((i * 37) % 40) - 20, 690 - i * 7 - (1 - eOut(drop)) * 180, 140, 100, ((i * 53) % 9 - 4) * .02); }
  paper(1510, 690 - 4, 80, 58, .15);
  if (t > E.sign_drop && t < E.sign_drop + .6) burst(1195, 660, 60, 150, E.sign_drop + .35, .4, '#c9a46a');
  tag('DAVID BEN-GURION', ['Prime Minister.', 'Stress level: 100%.'], 1000, 400, 11.85, 14.2, { rot: .035 });
  // thought bubble sequence
  if (t > beat('b3').start - .2) {
    const bcx = 1230, bcy = 240; thought(bcx, bcy, 640, 300, bg_.hx - 40, bg_.hy - 70, beat('b3').start - .15, 18.7);
    const slot = (t0, t1, fn) => { if (t < t0 || t >= t1) return; const k = eBack(P(t, t0, t0 + .22)) * (1 - P(t, t1 - .1, t1)); ctx.save(); ctx.translate(bcx, bcy); ctx.scale(k, k); fn(); ctx.restore(); };
    slot(E.star, E.brain, () => { star(0, 0, 125, 5, '#ffd23f', 6, Math.sin(t * 4) * .2); text('FAMOUS', 0, 14, { font: 'head', size: 54, color: INK, stroke: '#ffd23f', sw: 12 }); });
    slot(E.brain, E.elvis, () => {
      ell(-26, 0, 52, 66, '#ffb3c7', 6); ell(26, 0, 52, 66, '#ffb3c7', 6); curve([-60, -20], [-20, -50], [-8, -10], 4); curve([60, -20], [20, -50], [8, -10], 4); curve([-50, 18], [-20, 0], [-6, 30], 4); curve([50, 18], [20, 0], [6, 30], 4);
      text('BRILLIANT', 0, 100, { font: 'head', size: 54, color: INK, stroke: '#fff', sw: 12 }); });
    slot(E.elvis, E.ding, () => { drawHeadAt('elvis', 0, 6, 1.3, { expr: 'smug' }); const x = eOut(P(t, E.elvis_x, E.elvis_x + .12)); if (x > 0) { ln(-84 * x, -84 * x, 84 * x, 84 * x, 20, '#e5483f'); ln(84 * x, -84 * x, -84 * x, 84 * x, 20, '#e5483f'); } });
    slot(E.ding, 18.8, () => { drawHeadAt('einstein', 0, 24, 1.45, { expr: 'happy', shock: .3 }); });
    if (t > E.ding) { bulb(bcx + 150, bcy - 160, 34, clamp(1 - (t - E.ding) * .1) , t); sparkles(bcx, bcy, 200, 12, E.ding, 1.0); burst(bcx, bcy, 120, 260, E.ding, .5, '#f2b705'); }
  }
  bubble('Einstein!', 1620, 600, bg_.hx + 40, bg_.hy + 0, E.ding + .05, 18.5, { size: 64, maxW: 400 });
}

// ---- S3: Princeton
function S3(t) {
  bg({ sky: ['#bfe3f7', '#fff6d8'], floor: '#bfe3a4', blobs: [[260, 190, 110, '#fff1a6']] });
  [[300, 800, 420], [900, 840, 360], [1500, 820, 400]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.ellipse(x, y + 120, r, 160, 0, 0, 7); ctx.fillStyle = '#a6d68e'; ctx.fill(); });
  cloud(1000, 190, 1.2); cloud(1620, 140, 1);
  ctx.fillStyle = '#bfe3a4'; ctx.fillRect(0, GY, W, H - GY); ctx.beginPath(); ctx.moveTo(0, GY); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, GY + jit(1.6)); stk(5);
  for (let i = 0; i < 26; i++) { const gx = 40 + i * 76, gy = GY + 40 + (i * 53) % 120; ln(gx, gy, gx - 6, gy - 16, 4, '#6aa84f'); ln(gx, gy, gx + 6, gy - 18, 4, '#6aa84f'); }
  // house
  rrect(1380, 460, 440, 412, 8, '#f2d9a8', 6); poly([[1350, 468], [1600, 270], [1850, 468]], '#b45a4a', 6);
  rrect(1420, 520, 100, 100, 6, '#cfe9fb', 5); ln(1470, 520, 1470, 620, 4); ln(1420, 570, 1520, 570, 4);
  rrect(1690, 520, 100, 100, 6, '#cfe9fb', 5); ln(1740, 520, 1740, 620, 4); ln(1690, 570, 1790, 570, 4);
  const door = P(t, 22.2, 22.6); rrect(1560, 690, 110, 182, 6, door > 0 ? '#3b2a20' : '#8a5a34', 6);
  if (door < 1) rrect(1560, 690, 110 * (1 - door * .85), 182, 6, '#8a5a34', 6);
  // sign
  ln(1300, 872, 1300, 760, 8, '#7b5a3a'); rrect(1180, 700, 240, 84, 8, '#fff', 5); text('112 MERCER ST.', 1300, 730, { font: 'head', size: 36 }); text('Princeton, NJ', 1300, 762, { size: 28, color: '#6b5a44' });
  tree(160, GY + 10, .8);
  // Eban walking in
  const arrive = P(t, 18.8, 22.7), ex = lerp(-200, 700, eIO(arrive)), walking = arrive > 0 && arrive < 1;
  const em = mouthOf('b5', t);
  const eban = { kind: 'eban', x: ex, y: GY + 8, s: 1.3, dir: 1, mouth: em, ph: 3, expr: t > 23.4 ? 'happy' : 'neutral',
    pose: walking ? { walk: t * 9, ra: [.5, .5], la: [-.5, .1], bob: Math.abs(Math.sin(t * 9)) * 5 } : { ra: t > 22.9 ? [1.45 + Math.sin(t * 3) * .05, .15] : [.5, .5], la: gesture(em, [.4, .4], .5), lean: .03 },
    onHandB: () => { const out = t > 22.9; envelope(out ? 36 : 22, out ? -6 : 28, out ? 110 : 80, out ? -.1 : .5, out ? 'OFFICIAL' : ''); } };
  figure(eban);
  tag('ABBA EBAN', ['Ambassador.', 'Human mailbox.'], 560, 200, 19.3, 22.3, { rot: .03 });
  if (arrive > 0 && arrive < 1) text('VERY OFFICIAL LETTER', ex + 20, 338, { font: 'head', size: 44, color: '#c0392b', stroke: '#fff', sw: 9, rot: -.04 });
  // Einstein steps out
  if (t > 22.4) {
    const walkP = P(t, 22.4, 23.4), exx = lerp(1610, 1100, eIO(walkP)), im = mouthOf('b6', t);
    const ein = { kind: 'einstein', x: exx, y: GY + 8, s: 1.3, dir: -1, mouth: im, ph: 5, expr: (t > 23.5 && t < 27) ? 'surprised' : (t > 27 ? 'surprised' : 'neutral'),
      pose: walkP < 1 ? { walk: t * 8, bob: Math.abs(Math.sin(t * 8)) * 4 } : { la: gesture(im, [.5, .6], .6), ra: t > 27.0 && t < 28.6 ? [1.2 + Math.sin(t * 12) * .3, -.4] : [-.1, -.1], tilt: t > 23.5 ? .1 : 0 }, hop: t > E.sock_reveal && t < E.sock_reveal + .4 ? Math.sin(P(t, E.sock_reveal, E.sock_reveal + .4) * 3.14) * 34 : 0 };
    figure(ein);
    
    // speech
    bubble('Professor Einstein, would you like to be President of Israel?', 560, 250, eban.hx - 10, eban.hy - 60, beat('b5').start, beat('b5').end + .1, { size: 46, maxW: 520 });
    bubble("Me? I don't even wear socks!", 1290, 240, ein.hx - 20, ein.hy - 60, beat('b6').start, 28.7, { size: 52, maxW: 440 });
  }
  // sock loupe
  if (t >= E.sock_reveal) {
    const k = eBack(P(t, E.sock_reveal, E.sock_reveal + .3)), lx = 1580, ly = 590; ctx.save(); ctx.setLineDash([16, 14]); ln(1130, 850, lx - 110, ly + 110, 6, INK); ctx.setLineDash([]); ctx.translate(lx, ly); ctx.scale(k, k);
    circ(0, 0, 150, '#fff', 9);
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 142, 0, 7); ctx.clip();
    ctx.fillStyle = '#eaf6ff'; ctx.fillRect(-150, -150, 300, 300); ln(-70, 30, -74, -70, 26, INK); ln(-70, 30, -74, -70, 16, SKIN); ell(-6, 52, 96, 34, SKIN, 6); [[92, 40, 16], [112, 50, 14], [124, 62, 12], [132, 73, 11], [135, 83, 9]].forEach(([x, y, r]) => circ(x - 14, y, r, SKIN, 4.5)); ctx.restore();
    text('SOCKS: 0', 0, -96, { font: 'head', size: 54, color: '#c0392b', rot: -.05 }); ctx.restore();
  }
}

// ---- S4: the letter
function S4(t) {
  bg({ blobs: [[480, 450, 520, '#fde7c0'], [1500, 520, 360, '#e3dcf3']], floor: '#dccaa0' });
  // big letter
  const lp = eBack(P(t, 28.9, 29.3)); ctx.save(); ctx.translate(520, 450); ctx.rotate(-.025); ctx.scale(clamp(lp, 0, 1.1), clamp(lp, 0, 1.1));
  rrect(-340 + 12, -300 + 14, 680, 600, 8, 'rgba(60,40,20,.2)', 0); rrect(-340, -300, 680, 600, 8, '#fffdf4', 5);
  for (let i = 0; i < 9; i++) ln(-300, -190 + i * 58, 300, -190 + i * 58, 1.5, 'rgba(100,140,200,.35)');
  ln(-340, -300, -340, 300, 0);
  const hw = '#1f3a8a'; const L = [['Dear Mr. Ben-Gurion,', -230, 29.2, 30.1, 0], ['I am deeply moved... but', -172, 30.1, 31.2, 0], ['I lack the experience to', -114, 31.2, 32.3, 0], ['deal properly with people.', -56, 32.3, 33.3, 0], ['— A. Einstein  (sorry!)', 8, 33.0, 33.6, 0]];
  L.forEach(([s, y, a, b]) => { chalkText(s, -290, y, 46, P(t, a, b), { color: hw }); });
  if (t > 33.0) { doodleSad(150, 120, P(t, 33.0, 33.6)); }
  if (t >= E.stamp) { const k = eBack(P(t, E.stamp, E.stamp + .18)); ctx.save(); ctx.translate(120, 246); ctx.rotate(-.08); ctx.scale(k * .9, k * .9); rrect(-200, -46, 400, 92, 10, 'rgba(255,255,255,.7)', 9, '#d63c3c'); text('TRANSLATION:', 0, 2, { font: 'head', size: 70, color: '#d63c3c' }); ctx.restore();
    chalkText('HAVE YOU MET ME?!', -300, 118, 84, P(t, E.stamp + .3, E.stamp + 1.3), { font: 'head', color: '#d63c3c' }); }
  ctx.restore();
  // Einstein writing at his desk
  const im = mouthOf('b8', t), speak = t >= beat('b8').start - .1;
  const ein = { kind: 'einstein', x: 1430, y: GY + 6, s: 1.3, dir: -1, mouth: im, ph: 4, look: speak ? 0 : -1, expr: speak ? 'smug' : 'neutral',
    pose: speak ? { la: [2.3 + Math.sin(t * 10) * .06, -.9], ra: [2.3, -.9], lean: -.02, tilt: .08 } : { ra: [1.45 + Math.sin(t * 11) * .12, .55], la: [.9, .8], lean: .08, tilt: -.1 },
    onHandB: () => { if (!speak) { ctx.save(); ctx.rotate(-.6); ln(0, 0, -50, 40, 5, '#5b3a1e'); ctx.restore(); } } };
  figure(ein); desk(1180, 700, 480, 172);
  paper(1330, 690, 180, 20, 0);
  bubble('Translation: have you met me?', 1500, 255, ein.hx - 10, ein.hy - 60, beat('b8').start, beat('b8').end + .1, { size: 54, maxW: 460 });
  // people flee from the hair
  if (t > 34.35) for (let i = 0; i < 4; i++) { const x = 1050 - (t - 34.35 - i * .12) * 780; if (x < -100 || t - 34.35 - i * .12 < 0) continue; figure({ kind: 'plain', x, y: GY + 80 + (i % 2) * 24, s: .5, dir: -1, ph: i, expr: 'surprised', pose: { walk: t * 14 + i, la: [2.4, 0], ra: [2.4, 0], bob: Math.abs(Math.sin(t * 14 + i)) * 7 } }); }
  const rim = (name, t0, x, y, rot) => { if (t < t0) return; const k = eBack(P(t, t0, t0 + .12)); text(name, x, y, { font: 'head', size: 120, color: '#ffd23f', stroke: INK, sw: 18, sc: k, rot }); };
  rim('BA', E.rimshot, 1150, 200, -.12); rim('DUM', E.rimshot + .12, 1420, 150, .05); rim('TSS!', E.rimshot + .26, 1700, 210, -.08);
}
function doodleSad(x, y, p) { if (p <= 0) return; ctx.save(); ctx.globalAlpha = p; circ(x, y + 130, 0, null, 0); ctx.restore(); }

// ---- S5: Ben-Gurion's relief
function S5(t) {
  bg({ blobs: [[520, 470, 440, '#dfeaf7'], [1450, 480, 400, '#ffe9c9']], floor: '#e6d9b8' });
  flag(120, 330, 140);
  const bm = mouthOf('b10', t), ph = t >= E.phew, rd = t < 37.4;
  const b = { kind: 'gurion', x: 760, y: GY + 4, s: 1.3, dir: 1, mouth: bm, ph: 6, sweat: t > 37.7 && t < E.phew,
    expr: ph ? 'happy' : (t > 37.6 ? 'worried' : 'neutral'), blink: ph && t < E.phew + .5 ? true : undefined,
    pose: ph ? { lean: -.12 - eElastic(P(t, E.phew, E.phew + .5)) * .05, la: [2.55 + Math.sin(t * 7) * .12, -1.5], ra: [-.1, .1], tilt: -.12 } : (rd ? { ra: [1.5, 1.0], la: [1.1, .9], tilt: .05 } : { ra: [1.5, 1.0], la: [1.1, .9], lean: .03, tilt: .08 + Math.sin(t * 20) * .02 }),
    onHandB: () => { if (!ph) { ctx.save(); ctx.rotate(.12); paper(78, 4, 160, 116, 0); text('NO,', 78, -20, { font: 'head', size: 32 }); text('THANKS!', 78, 14, { font: 'head', size: 36, color: '#c0392b' }); text('- A.E.', 78, 42, { size: 22 }); ctx.restore(); } },
    onHandA: () => { if (ph) { ctx.save(); rrect(-24, -18, 50, 36, 8, '#fff', 4); ctx.restore(); } } };
  figure(b); desk(520, 700, 460, 172); paper(660, 690, 170, 20, 0);
  tag('(reportedly)', ['relieved. Very relieved.'], 330, 300, 36.1, 37.3, { rot: -.05, color: '#d5f2d8' });
  // what-if comic panel
  if (t > 37.6 && t < 40.85) {
    const k = eBack(P(t, 37.6, 37.95)) * (1 - P(t, 40.5, 40.85)); ctx.save(); ctx.translate(1440, 450); ctx.rotate(.02); ctx.scale(k, k);
    rrect(-310 + 10, -300 + 12, 620, 560, 12, 'rgba(60,40,20,.2)', 0); rrect(-310, -300, 620, 560, 12, '#fffdf1', 7);
    ctx.save(); ctx.beginPath(); ctx.roundRect(-304, -294, 608, 548, 8); ctx.clip();
    ctx.fillStyle = '#d8ecfb'; ctx.fillRect(-310, -300, 620, 330); ctx.fillStyle = '#e9d3b0'; ctx.fillRect(-310, 30, 620, 240);
    rrect(-310, -300, 620, 74, 0, '#f1c453', 5); text('IF HE ACCEPTS...', 0, -262, { font: 'head', size: 54 });
    // melting clock + flying papers
    ctx.save(); ctx.translate(205, -20); ell(0, 0, 66, 56, '#fff', 5); ctx.beginPath(); ctx.moveTo(-50, 36); ctx.quadraticCurveTo(-40, 100 + Math.sin(t * 3) * 6, -20, 70); ctx.quadraticCurveTo(0, 130, 24, 66); ctx.quadraticCurveTo(46, 100, 54, 34); fl('#fff'); stk(5); ln(0, 0, 0, -34, 5); ln(0, 0, 28, 8, 5); ctx.restore();
    for (let i = 0; i < 5; i++) { const px = -250 + ((t * 120 + i * 130) % 500), py = -90 + Math.sin(t * 3 + i) * 34 + (i % 3) * 22; paper(px, py, 52, 40, Math.sin(t * 4 + i) * .6); }
    // President Einstein
    figure({ kind: 'einstein', x: -40, y: 250, s: .62, dir: 1, expr: 'surprised', shock: .6, mouth: Math.abs(Math.sin(t * 7)) * .8, ph: 2, pose: { la: [2.6 + Math.sin(t * 8) * .2, -.3], ra: [2.5 - Math.sin(t * 8) * .2, -.3], tilt: Math.sin(t * 3) * .08 },
      after: (hip, N, hd) => { ctx.save(); ctx.translate(hd.x, hd.y - 98); ctx.rotate(-.35 + Math.sin(t * 3) * .1); poly([[-34, 0], [-34, -34], [-17, -16], [0, -44], [17, -16], [34, -34], [34, 0]], '#ffd23f', 5); ctx.restore(); } });
    text('"Meeting at 3? What is time?', -20, -178, { size: 40, color: INK }); text('It\'s all relative!"', -20, -134, { size: 40, color: INK });
    ctx.restore(); rrect(-310, -300, 620, 560, 12, null, 7); ctx.restore();
  }
  bubble('Phew!', 980, 330, b.hx + 20, b.hy - 40, E.phew, 42.1, { size: 82, maxW: 300 });
  if (t >= E.phew) { for (let i = 0; i < 8; i++) { const tt = t - E.phew, a = -1.2 - i * .42, vx = Math.cos(a) * 300, vy = Math.sin(a) * 300 - 120; if (tt < 1.2) { const x = b.hx + 10 + vx * tt, y = b.hy - 40 + vy * tt + 700 * tt * tt; ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.quadraticCurveTo(x + 9, y + 2, x, y + 8); ctx.quadraticCurveTo(x - 9, y + 2, x, y - 12); fl('#7ec8f2'); stk(2.5, '#2b7fb3'); } } }
}

// ---- S6: equations are forever
function S6(t) {
  bg({ blobs: [[560, 470, 520, '#e0efe3'], [1560, 480, 330, '#ffefc9']], floor: '#e6d9b8' });
  chalkboard(100, 230, 900, 490);
  // left half: politics spaghetti
  const lp = P(t, 42.4, 45.6);
  chalkText('POLITICS', 300, 330, 70, P(t, 42.2, 43.2), { font: 'head', align: 'center', color: '#ff9a8a' });
  ctx.beginPath(); const nPts = Math.floor(300 * lp); for (let i = 0; i <= nPts; i++) { const px = 330 + 150 * Math.sin(i * .21) + 42 * Math.sin(i * .93), py = 525 + 85 * Math.sin(i * .17 + 1) + 48 * Math.cos(i * .63); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } stk(4, '#f5f2e8');
  chalkText('meetings', 140, 405, 38, P(t, 43.6, 44.2), { color: '#cfd8d2' }); chalkText('speeches', 380, 690, 38, P(t, 44.0, 44.6), { color: '#cfd8d2' }); chalkText('more meetings', 130, 690, 36, P(t, 44.5, 45.2), { color: '#cfd8d2' });
  // divider
  ln(560, 270, 560, 690, 4, 'rgba(245,242,232,.6)');
  // right half: equation
  const ep = P(t, E.e_chalk, E.e_chalk + 1.2);
  chalkText('EQUATION', 780, 330, 70, P(t, E.e_chalk - 1.6, E.e_chalk - .6), { font: 'head', align: 'center', color: '#ffe27a' });
  chalkText('E = mc²', 620, 500, 130, ep);
  if (t >= E.forever) { const g = P(t, E.forever, E.forever + 1.0); chalkText('∞', 700, 650, 150, g, { color: '#ffe27a' }); chalkText('forever', 830, 640, 56, P(t, E.forever + .5, E.forever + 1.2), { color: '#ffe27a' }); sparkles(780, 480, 200, 14, E.forever + .2, 1.1); }
  tag('FOR THE PRESENT', ['politics is a', 'today problem'], 330, 125, 43.2, 51.3, { rot: -.03, color: '#ffd1c9' });
  tag('FOR ETERNITY', ['equations outlast', 'everyone'], 770, 125, E.forever - .3, 51.3, { rot: .03, color: '#d5f2d8' });
  // Einstein
  const ein = { kind: 'einstein', x: 1175, y: GY + 8, s: 1.25, dir: -1, ph: 7, expr: t > E.forever ? 'happy' : 'smug',
    pose: { ra: [2.0 + Math.sin(t * 6) * (t > E.e_chalk && t < E.e_chalk + 1.3 ? .1 : .02), -.3], la: [.3, .5], lean: -.02, tilt: .06 },
    onHandB: () => { ctx.save(); ctx.rotate(-.3); rrect(-3, -10, 22, 8, 3, '#f5f2e8', 2); ctx.restore(); } };
  figure(ein);
  // Newton + tree + apple
  tree(1680, GY + 10, 1.0);
  const nm = mouthOf('b12', t), hit = t >= E.apple_hit; const nIn = eBack(P(t, 47.7, 48.1));
  if (t > 47.6) {
    const nw = { kind: 'newton', x: 1560, y: GY + 8 + (1 - nIn) * 200, s: 1.1 * clamp(nIn, .01, 1.1), dir: -1, mouth: nm, ph: 9, expr: hit ? 'surprised' : 'neutral', blink: hit ? true : undefined,
      pose: { ra: hit ? [2.6, -.2] : gesture(nm, [.9, .9], .5), la: [.2, .3], tilt: hit ? -.25 : .04, crouch: hit ? 10 : 0 } };
    figure(nw);
    tag('SIR ISAAC NEWTON', ['Famous apple incident.', 'Still bitter.'], 1630, 170, 48.0, 51.3, { rot: .03 });
    bubble("Politics? I'd rather be hit by an apple.", 1440, 330, nw.hx - 20, nw.hy - 50, beat('b12').start, 50.5, { size: 46, maxW: 420 });
    if (hit) { dizzy(nw.hx, nw.hy - 90, E.apple_hit); burst(nw.hx - 10, nw.hy - 90, 30, 120, E.apple_hit, .4); text('BONK!', nw.hx - 150, nw.hy - 150, { font: 'head', size: 90, color: '#e5483f', stroke: '#fff', sw: 14, sc: eBack(P(t, E.apple_hit, E.apple_hit + .15)), rot: -.15 }); }
  }
  // the apple
  if (t < E.apple_fall) apple(1560, 322 + Math.sin(t * 2) * 2, 24);
  else { const f = P(t, E.apple_fall, E.apple_hit); if (t < E.apple_hit) apple(1560, lerp(322, 456, f * f), 24, f * 2); else { const g = P(t, E.apple_hit, E.apple_hit + .7); apple(1560 + g * 120, 458 - Math.sin(g * 3.14) * 120 + g * 40, 24, g * 8); } }
}

// ---- S7: Ben-Zvi gets the job; moral
function S7(t) {
  bg({ blobs: [[960, 480, 560, '#ffe9a8'], [250, 560, 250, '#dfeaf7'], [1700, 520, 260, '#e3dcf3']] });
  flag(1560, 330, 190);
  // curtain-ish bunting
  for (let i = 0; i < 14; i++) { const x = 60 + i * 140, y = 60 + Math.sin(i * .7) * 14; poly([[x, y], [x + 70, y], [x + 35, y + 62]], ['#e5483f', '#2f6fcf', '#ffd23f', '#3fb67a'][i % 4], 4); }
  // Ben-Zvi
  const bz = mouthOf('b13', t) * 0; const up = t >= E.sock_ben && t < E.sock_ben + 2.3;
  const jump = P(t, 51.9, 52.4);
  const z = { kind: 'benzvi', x: 960, y: GY + 8 + (1 - eBack(jump)) * 300, s: 1.45 * clamp(eBack(jump), .01, 1.1), dir: 1, expr: 'happy', ph: 3,
    pose: { la: [-2.5 - Math.sin(t * 6) * .25, .3], ra: [2.5 + Math.sin(t * 6) * .25, -.3], legs: up ? { a: [1.25, .45], b: [0, 0] } : undefined, lean: up ? -.08 : 0 }, sockA: up };
  if (!up) delete z.pose.legs;
  figure(z);
  if (up) { const k = eBack(P(t, E.sock_ben, E.sock_ben + .25)); text('SOCKS ✓', 1290, 810, { font: 'head', size: 74, color: '#3fb67a', stroke: '#fff', sw: 14, sc: k, rot: -.08 }); sparkles(1110, 760, 90, 8, E.sock_ben, .8); const ax = 1230 + Math.sin(t * 10) * 6; ln(ax, 790, ax - 70, 770, 7, '#3fb67a'); }
  tag('YITZHAK BEN-ZVI', ['2nd President of Israel, 1952–1963', 'Accepted. Owns socks.'], 1480, 570, 52.2, 56.4, { rot: .03 });
  // Einstein enjoying freedom
  const e = { kind: 'einstein', x: 300, y: GY + 8, s: 1.0, dir: 1, expr: 'happy', ph: 1, pose: { la: [2.7 + Math.sin(t * 5) * .2, -.2], ra: [.6, .9] }, onHandB: () => { ctx.save(); ctx.rotate(.3); rrect(-3, -10, 22, 8, 3, '#f5f2e8', 2); ctx.restore(); } };
  figure(e);
  tag('EINSTEIN', ['Back to physics.', 'Still no socks.'], 310, 330, 53.4, 56.4, { rot: -.04 });
  confetti(E.cheer);
  // moral
  if (t >= beat('b14').start - .1) {
    const k = eBack(P(t, beat('b14').start - .1, beat('b14').start + .3));
    ctx.save(); ctx.translate(W / 2, 205); ctx.scale(k, k); rrect(-640, -105, 1280, 210, 26, 'rgba(255,255,255,.95)', 6);
    text('MORAL', 0, -52, { font: 'head', size: 54, color: '#c0392b' }); text("GENIUS IS KNOWING WHAT YOU'RE BAD AT.", 0, 22, { font: 'head', size: 78, color: INK }); ctx.restore();
  }
  if (t >= E.end_ding - .05) { const k = eBack(P(t, E.end_ding - .05, E.end_ding + .3)); burst(W / 2, 700, 120, 330, E.end_ding, .5, '#ffd23f'); text('THE END', W / 2, 700, { font: 'head', size: 170, color: '#2f6fcf', stroke: '#fff', sw: 26, sc: k, rot: -.03 }); }
  if (t > 57.3) text("Based on Einstein's Nov 1952 letter declining Israel's presidency. Quotes lightly paraphrased for comedy.", W / 2, 1040, { size: 28, color: '#6b5a44', alpha: .85 * P(t, 57.3, 57.8) });
}

// =========================================================================== frame composer
const SCENES = [S1, S2, S3, S4, S5, S6, S7];
function drawFrame(f) {
  NOW = f / FPS; BF = Math.floor(NOW * 12); JC = 0;
  const cuts = [E.cut1, E.cut2, E.cut3, E.cut4, E.cut5, E.cut6], hw = .22;
  let idx = 0; cuts.forEach(c => { if (NOW >= c) idx++; });
  let tr = -1, trIdx = 0; cuts.forEach((c, i) => { if (NOW >= c - hw && NOW < c + hw) { tr = (NOW - (c - hw)) / (2 * hw); trIdx = i; } });
  const drawScene = (i, dx) => {
    ctx.save(); const st = [0, ...cuts][i], k = 1 + .03 * P(NOW, st, st + 9); ctx.translate(W / 2 + dx, H / 2); ctx.scale(k, k); ctx.translate(-W / 2, -H / 2);
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip(); JC = i * 5000; SCENES[i](NOW); ctx.restore();
  };
  ctx.clearRect(0, 0, W, H);
  if (tr >= 0) { const e = eIO(tr); drawScene(trIdx, -W * e); drawScene(trIdx + 1, W * (1 - e)); const sx = W * (1 - e); ln(sx, 0, sx, H, 10); }
  else drawScene(idx, 0);
  captions(NOW);
  vignette();
}
function init(tl) { TL = tl; E = tl.events; makePaper(); }
