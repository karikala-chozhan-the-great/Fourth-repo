'use strict';
// ---------------------------------------------------------------------------
// props, scenes, transitions, captions  --  "Julius Caesar vs. the Pirates"
// ---------------------------------------------------------------------------
const GY = 905;             // deck ground line for standing figures
let PARCH = null;
function makeTextures() {
  const c = document.createElement('canvas'); c.width = 600; c.height = 400; const g = c.getContext('2d'); const r = mb(5);
  g.fillStyle = '#f6e7bd'; g.fillRect(0, 0, 600, 400);
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${130 + r() * 40 | 0},${90 + r() * 30 | 0},40,${r() * .05})`; g.fillRect(r() * 600, r() * 400, 1 + r() * 4, 1 + r() * 3); }
  PARCH = c;
}
function vignette() {
  const g = ctx.createRadialGradient(CW / 2, CH / 2, Math.min(CW, CH) * .5, CW / 2, CH / 2, Math.max(CW, CH) * .62);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,30,50,.28)'); ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);
}
const lerpC = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`; };

// ------------------------------------------------------------------ environment
function sky(y1, c1, c2) { const g = ctx.createLinearGradient(0, 0, 0, y1); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fillRect(0, -1700, W, y1 + 1700); }
function sunDisk(x, y, r, col = '#fff3a0') {
  const g = ctx.createRadialGradient(x, y, r * .4, x, y, r * 4); g.addColorStop(0, 'rgba(255,240,170,.75)'); g.addColorStop(1, 'rgba(255,240,170,0)'); ctx.fillStyle = g; ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  circ(x, y, r, col, 0);
}
function cloud(x, y, s = 1, col = '#fff') {
  const parts = [[0, 0, 46], [-52, 12, 36], [50, 10, 40], [-22, -26, 36], [24, -24, 34]];
  parts.forEach(([dx, dy, r]) => circ(x + dx * s, y + dy * s, r * s, col, 0));
}
function topClouds(col = 'rgba(255,255,255,.9)') { if (PORTRAIT) [[600, -120, 1.6], [1350, -250, 1.4], [850, -420, 1.9], [1500, -560, 1.5]].forEach(([x, y, s]) => cloud(((x + NOW * 9) % (W + 300)) - 150, y, s, col)); }
function gull(x, y, t, s = 1) { const f = Math.sin(t * 7 + x) * .5; ctx.beginPath(); ctx.moveTo(x - 24 * s, y + 6 * s * f); ctx.quadraticCurveTo(x - 10 * s, y - 14 * s - 8 * f * s, x, y); ctx.quadraticCurveTo(x + 10 * s, y - 14 * s - 8 * f * s, x + 24 * s, y + 6 * s * f); stk(4, INK); }
function sea(hy, bottom, t, top, bot, layers = 7) {
  ctx.fillStyle = top; ctx.fillRect(0, hy, W, bottom - hy);
  for (let i = 0; i < layers; i++) {
    const f = i / (layers - 1), y0 = hy + 8 + f * (bottom - hy - 20), amp = 3 + f * 10, fr = .006 + f * .003;
    ctx.beginPath(); ctx.moveTo(0, bottom);
    for (let x = 0; x <= W + 20; x += 20) ctx.lineTo(x, y0 + Math.sin(x * fr * 2.2 + t * (.9 + f * .8) + i * 1.7) * amp);
    ctx.lineTo(W, bottom); ctx.closePath(); ctx.fillStyle = lerpC(top, bot, f * .95 + .05); ctx.fill();
    if (i % 2 === 0) { ctx.beginPath(); for (let x = 0; x <= W + 20; x += 20) { const y = y0 + Math.sin(x * fr * 2.2 + t * (.9 + f * .8) + i * 1.7) * amp; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } stk(2 + f * 2, 'rgba(255,255,255,.35)'); }
  }
  const r = mb(Math.floor(t * 4)); for (let i = 0; i < 14; i++) { const x = r() * W, y = hy + 20 + r() * (bottom - hy - 40); ln(x, y, x + 20 + r() * 30, y, 3, 'rgba(255,255,255,.55)'); }
}
function deckFloor(y0 = 812) {
  ctx.fillStyle = '#b98450'; ctx.fillRect(0, y0, W, BOT - y0);
  const g = ctx.createLinearGradient(0, y0, 0, Math.min(BOT, y0 + 1100)); g.addColorStop(0, 'rgba(255,230,170,.18)'); g.addColorStop(1, 'rgba(60,30,10,.28)'); ctx.fillStyle = g; ctx.fillRect(0, y0, W, BOT - y0);
  for (let i = 0; i < (PORTRAIT ? 28 : 7); i++) { const y = y0 + i * 40; ln(0, y, W, y, 3, 'rgba(60,35,15,.55)'); for (let x = (i % 2) * 110 + 30; x < W; x += 230) ln(x, y, x, y + 40, 2.5, 'rgba(60,35,15,.42)'); }
}
function rail(y) {
  for (let x = 40; x < W; x += 260) rrect(x - 16, y - 80, 32, 84, 6, '#8a5a34', 5);
  rrect(-20, y - 18, W + 40, 34, 8, '#a0683a', 6); ln(0, y - 6, W, y - 6, 3, 'rgba(255,230,170,.4)');
}
function deckBG(o) {
  const t = NOW; sky(640, o.sky[0], o.sky[1]);
  if (o.sun) sunDisk(...o.sun);
  topClouds(o.cloudCol || 'rgba(255,255,255,.85)');
  (o.clouds || [[300, 170, 1.4], [1250, 120, 1.1], [1700, 230, 1.2]]).forEach(([x, y, s]) => cloud(((x + t * 8) % (W + 300)) - 150, y, s, o.cloudCol || 'rgba(255,255,255,.85)'));
  if (o.gulls) o.gulls.forEach(([x, y], i) => gull(x + Math.sin(t * .8 + i) * 40, y + Math.sin(t * 1.3 + i * 2) * 14, t + i, 1));
  sea(560, 800, t, o.sea[0], o.sea[1]);
  if (o.mid) o.mid();
  rail(808); deckFloor(812);
}
function barrel(x, y, w = 110, h = 130) {
  rrect(x - w / 2, y - h, w, h, 22, '#9a6a3c', 6); [.25, .75].forEach(f => ln(x - w / 2 + 2, y - h * f, x + w / 2 - 2, y - h * f, 6, '#4a3020'));
  ell(x, y - h, w / 2, 14, '#b98450', 5);
}
function crate(x, y, w = 200, h = 110) { rrect(x - w / 2, y - h, w, h, 6, '#c08a52', 6); ln(x - w / 2, y - h, x + w / 2, y, 5, '#8a5a34'); ln(x + w / 2, y - h, x - w / 2, y, 5, '#8a5a34'); rrect(x - w / 2 + 8, y - h + 8, w - 16, h - 16, 3, null, 4, '#8a5a34'); }
function coin(x, y, r = 16, rot = 0) { ctx.save(); ctx.translate(x, y); ctx.scale(Math.abs(Math.cos(rot)) * .8 + .2, 1); circ(0, 0, r, '#ffd23f', 4); circ(0, 0, r * .6, null, 2.5, '#d9a400'); ctx.restore(); }
function chest(x, y, s = 1, open = 0, coins = 8) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rrect(-70, -70, 140, 70, 8, '#8a5a34', 6); ln(-70, -40, 70, -40, 5, '#f1c453'); rrect(-8, -52, 16, 22, 3, '#f1c453', 3);
  for (let i = 0; i < coins; i++) coin(-48 + (i % 5) * 24, -78 - Math.floor(i / 5) * 12 - open * 6, 15, i);
  ctx.save(); ctx.translate(-70, -70); ctx.rotate(-open * 1.9); rrect(0, -34, 140, 36, 14, '#a0683a', 6); ln(0, -14, 140, -14, 4, '#f1c453'); ctx.restore();
  ctx.restore();
}
function parch(x, y, w, h, rot = 0, sc = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
  rrect(-w / 2 + 8, -h / 2 + 10, w, h, 10, 'rgba(40,25,10,.25)', 0);
  ctx.save(); ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 10); ctx.clip(); ctx.drawImage(PARCH, -w / 2, -h / 2, w, h); ctx.restore();
  rrect(-w / 2, -h / 2, w, h, 10, null, 6, '#5b3a1e'); ctx.restore();
}
function tagW(title, sub, x, y, t0, t1, o = {}) {
  if (NOW < t0 || NOW > t1 + .25) return;
  const sc = Math.min(eBack(P(NOW, t0, t0 + .25)), 1 - P(NOW, t1, t1 + .2)); if (sc <= 0) return;
  const subs = Array.isArray(sub) ? sub : [sub];
  ctx.save(); ctx.font = `54px ${FONT.title}`; const w1 = ctx.measureText(title).width; ctx.font = `31px ${FONT.hand}`; const w2 = Math.max(...subs.map(s => ctx.measureText(s).width)); ctx.restore();
  const w = Math.max(w1, w2) + 56, h = 90 + subs.length * 36;
  { const q = hp(x, y); x = PORTRAIT ? clamp(q.x, w / 2 + 20, CW - w / 2 - 20) : q.x; y = q.y; }
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? -.04); ctx.scale(sc, sc);
  rrect(-w / 2 + 6, -h / 2 + 8, w, h, 8, 'rgba(20,20,30,.25)', 0);
  rrect(-w / 2, -h / 2, w, h, 8, o.color || '#f6e7bd', 4, '#5b3a1e');
  circ(-w / 2 + 14, -h / 2 + 14, 5, '#8a8a92', 2.5); circ(w / 2 - 14, -h / 2 + 14, 5, '#8a8a92', 2.5);
  text(title, 0, -h / 2 + 42, { font: 'title', size: 54, color: o.tc || '#6b1d12' });
  subs.forEach((s, i) => text(s, 0, -h / 2 + 86 + i * 36, { size: 31, color: '#4a3b2a' }));
  ctx.restore();
}
function burst(cx, cy, r0, r1, t0, dur = .5, col = '#ff7a2f') {
  const p = (NOW - t0) / dur; if (p < 0 || p > 1) return;
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283, e = eOut(p); ln(cx + Math.cos(a) * lerp(r0, r1, e), cy + Math.sin(a) * lerp(r0, r1, e), cx + Math.cos(a) * lerp(r0 + 18, r1 + 26, e), cy + Math.sin(a) * lerp(r0 + 18, r1 + 26, e), 7 * (1 - p), col); }
}
function sparkles(cx, cy, rad, n, t0, dur = 1) {
  const p = (NOW - t0) / dur; if (p < 0 || p > 1) return; const r = mb(Math.round(cx + cy));
  for (let i = 0; i < n; i++) { const a = r() * 6.283, d = rad * (.4 + r() * .6) * eOut(p), s = (1 - p) * (8 + r() * 14); star(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s, 4, '#ffd23f', 2.5, p * 3); }
}
function coinRain(t0, dur = 2.2, n = 70) {
  if (NOW < t0 || NOW > t0 + dur + 1.6) return; const r = mb(31);
  for (let i = 0; i < n; i++) { const st = t0 + r() * dur, x = r() * W, v = 500 + r() * 300, tt = NOW - st; if (tt < 0) continue; const y = -30 + tt * v + 0; if (y > H + 30) continue; coin(x, y, 12 + r() * 8, tt * 8 + i); }
}
function zzz(x, y, t0) {
  if (NOW < t0) return;
  for (let i = 0; i < 3; i++) { const p = ((NOW - t0) * .55 + i / 3) % 1; text('Z', x + p * 60 + i * 14, y - p * 140, { font: 'title', size: 34 + p * 40, color: '#2f5fa8', stroke: '#fff', sw: 8, alpha: Math.sin(p * 3.14), rot: .2 }); }
}
function shoutW(txt, x, y, t0, t1, o = {}) {
  if (NOW < t0 || NOW > t1) return; const k = eBack(P(NOW, t0, t0 + .15)) * (1 - P(NOW, t1 - .12, t1));
  const q = hp(x, y); let fit = 1; if (PORTRAIT) { ctx.save(); ctx.font = `${o.weight || ''} ${o.size || 100}px ${FONT[o.font || 'head']}`; fit = Math.min(1, CW * .92 / (ctx.measureText(txt).width + (o.sw || 18))); ctx.restore(); }
  text(txt, q.x, q.y, { font: o.font || 'head', size: o.size || 100, color: o.color || '#ffd23f', stroke: o.stroke || INK, sw: o.sw || 18, sc: k * fit, rot: o.rot ?? -.08, weight: o.weight || '' });
}
function scribbleBox(txt, x, y, done) { text(txt, x, y, { size: 40, color: '#3b2a1a', align: 'left' }); rrect(x - 56, y - 20, 34, 34, 5, null, 4, '#3b2a1a'); if (done > 0) { ctx.save(); ctx.beginPath(); ctx.rect(x - 60, y - 40, 60 * done, 70); ctx.clip(); ln(x - 52, y - 2, x - 42, y + 10, 8, '#2e9c4f'); ln(x - 42, y + 10, x - 22, y - 26, 8, '#2e9c4f'); ctx.restore(); } }

// ------------------------------------------------------------------ ships (side view, origin at waterline centre)
function romanShip(x, y, s, t, ph = 0, flip = 1) {
  ctx.save(); ctx.translate(x, y + Math.sin(t * 1.6 + ph) * 7 * s); ctx.rotate(Math.sin(t * 1.3 + ph) * .022); ctx.scale(s * flip, s);
  for (let i = 0; i < 5; i++) ln(-190 + i * 80, -40, -210 + i * 80 + Math.sin(t * 3 + i) * 22, 55, 7, '#7b5a3a');
  ctx.beginPath(); ctx.moveTo(-310, -100); ctx.quadraticCurveTo(-260, 10, -160, 14); ctx.lineTo(200, 14); ctx.quadraticCurveTo(300, 0, 340, -140); ctx.quadraticCurveTo(300, -118, 270, -100); ctx.closePath(); fl('#b2773f'); stk(6);
  ln(-296, -86, 262, -86, 4, '#f1c453');
  for (let i = 0; i < 7; i++) { const sx = -230 + i * 74; circ(sx, -62, 24, '#c0392b', 5); circ(sx, -62, 8, '#f1c453', 3); }
  ln(0, -100, 0, -470, 12, INK); ln(0, -100, 0, -470, 7, '#8a5a34');
  rrect(-150, -440, 300, 250, 6, '#fff', 6); for (let i = 0; i < 5; i++) rrect(-150 + i * 60, -440, 30, 250, 0, '#c0392b', 0); rrect(-150, -440, 300, 250, 6, null, 6);
  ln(-170, -440, 170, -440, 9, '#6b4423');
  text('SPQR', 0, -312, { font: 'roman', size: 58, weight: '900', color: '#f1c453', stroke: INK, sw: 9 });
  ln(0, -470, 70, -490, 4); poly([[0, -470], [70, -490], [0, -512]], '#7b2d8e', 3.5);
  ctx.restore();
}
function pirateShip(x, y, s, t, ph = 0, flip = 1) {
  ctx.save(); ctx.translate(x, y + Math.sin(t * 1.5 + ph) * 8 * s); ctx.rotate(Math.sin(t * 1.2 + ph) * .025); ctx.scale(s * flip, s);
  ctx.beginPath(); ctx.moveTo(-330, -150); ctx.quadraticCurveTo(-300, 10, -190, 14); ctx.lineTo(210, 14); ctx.quadraticCurveTo(310, 0, 330, -110); ctx.lineTo(290, -100); ctx.lineTo(-290, -100); ctx.closePath(); fl('#3a2a22'); stk(6);
  ln(-300, -112, 310, -112, 8, '#f1c453'); for (let i = 0; i < 4; i++) { rrect(-190 + i * 110, -78, 46, 34, 6, '#17151b', 4); }
  ln(-40, -100, -40, -520, 14, INK); ln(-40, -100, -40, -520, 8, '#5b3a22');
  ln(-250, -100, -250, -330, 12, INK); ln(-250, -100, -250, -330, 7, '#5b3a22');
  const bl = Math.sin(t * 3 + ph) * 8;
  ctx.beginPath(); ctx.moveTo(-170, -490); ctx.quadraticCurveTo(-40, -470 + bl, 90, -490); ctx.lineTo(80 + bl, -190); ctx.quadraticCurveTo(-40, -170, -160 - bl, -190); ctx.closePath(); fl('#1d1b24'); stk(6);
  circ(-40, -370, 44, '#f4f1e6', 4); [-15, 15].forEach(dx => circ(-40 + dx, -378, 12, '#1d1b24', 0)); poly([[-46, -352], [-34, -352], [-40, -360]], '#1d1b24', 0); ln(-60, -334, -20, -334, 5, '#1d1b24');
  ln(-86, -306, 6, -436, 7, '#f4f1e6'); ln(6, -306, -86, -436, 7, '#f4f1e6');
  poly([[-250, -330], [-250 + 110 + bl * 2, -318], [-250, -290]], '#c0392b', 4);
  ln(-40, -520, 60, -540, 5); poly([[-40, -520], [60 + bl, -540], [-40, -566]], '#17151b', 3.5);
  ctx.restore();
}
function jollyRoger(x, y, s, t) { ln(x, y + 150 * s, x, y - 20 * s, 8 * s, '#5b3a22'); ctx.save(); ctx.translate(x, y); ctx.scale(s, s); const w = Math.sin(t * 5) * 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(40, -8 + w, 80, 8 - w, 120, 0); ctx.lineTo(120, 80); ctx.bezierCurveTo(80, 88 - w, 40, 72 + w, 0, 80); ctx.closePath(); fl('#17151b'); stk(4); circ(60, 34, 18, '#f4f1e6', 3); ln(36, 62, 84, 12, 5, '#f4f1e6'); ln(84, 62, 36, 12, 5, '#f4f1e6'); ctx.restore(); }
function cannonball(x, y) { circ(x, y, 14, '#2a2a33', 4); ln(x - 6, y - 6, x - 1, y - 9, 3, 'rgba(255,255,255,.6)'); }
function smoke(x, y, t0, n = 5) { const p = NOW - t0; if (p < 0 || p > 2.2) return; for (let i = 0; i < n; i++) circ(x + i * 26 - 20 + p * 20, y - p * 40 - i * 10, 20 + p * 22 + i * 4, `rgba(220,220,225,${Math.max(0, .75 - p * .38)})`, 0); }
function dinghy(x, y, t, s = 1) { ctx.save(); ctx.translate(x, y + Math.sin(t * 2.4 + x) * 5); ctx.rotate(Math.sin(t * 2 + x) * .04); ctx.scale(s, s); ctx.beginPath(); ctx.moveTo(-110, -50); ctx.quadraticCurveTo(-90, 10, -40, 12); ctx.lineTo(60, 12); ctx.quadraticCurveTo(110, 0, 130, -56); ctx.closePath(); fl('#a0683a'); stk(5); ln(-50, -52, 80, -52, 5, '#6b4423'); ctx.restore(); }

// ------------------------------------------------------------------ captions (parchment strips for narration)
function captions(t) {
  TL.beats.forEach(b => {
    if (b.who !== 'narr' || b.id === 'b13') return;
    b.segs.forEach(([s, a, c], i) => {
      const next = b.segs[i + 1], nb = TL.beats[TL.beats.indexOf(b) + 1]; const t0 = a - .05, t1 = next ? next[1] - .05 : Math.min(c + .3, nb ? nb.start - .08 : 1e9);
      if (t < t0 || t >= t1) return;
      const k = eBack(P(t, t0, t0 + .15)), size = PORTRAIT ? 56 : 50, font = `bold ${size}px ${FONT.cap}`;
      const lines = wrap(s, PORTRAIT ? 880 : 1500, font); ctx.font = font; const wd = Math.max(...lines.map(l => ctx.measureText(l).width)) + 80, hh = lines.length * (size + 8) + 28;
      ctx.save(); ctx.translate(CW / 2, PORTRAIT ? 1470 - (lines.length - 1) * 32 : 995 - (lines.length - 1) * 26); ctx.scale(k, k);
      rrect(-wd / 2 + 6, -hh / 2 + 8, wd, hh, 12, 'rgba(20,20,30,.28)', 0);
      ctx.save(); ctx.beginPath(); ctx.roundRect(-wd / 2, -hh / 2, wd, hh, 12); ctx.clip(); ctx.drawImage(PARCH, -wd / 2, -hh / 2, wd, hh); ctx.restore();
      rrect(-wd / 2, -hh / 2, wd, hh, 12, null, 5, '#5b3a1e');
      lines.forEach((l, j) => text(l, 0, -hh / 2 + 14 + (size + 8) / 2 + j * (size + 8), { font: 'cap', size, color: '#3b2a1a' })); ctx.restore();
    });
  });
}


const tag = (...a) => hud(() => tagW(...a));
const shout = (...a) => hud(() => shoutW(...a));
// ------------------------------------------------------------------ acting helpers
const layDown = (o, p, side = 1, baseY = GY) => { const hs = o.s * (TH + SH); o.rot = side * 1.52 * p; o.y = lerp(baseY, baseY - 30 + hs, p); return o; };
function kf(t, keys) {
  let c; const L = keys[keys.length - 1];
  if (t <= keys[0][0]) c = keys[0]; else if (t >= L[0]) c = L; else { for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t < b[0]) { const p = eIO(P(t, a[0], b[0])); c = [t, lerp(a[1], b[1], p), lerp(a[2], b[2], p), lerp(a[3], b[3], p), lerp(a[4] || 0, b[4] || 0, p)]; break; } } }
  const z = c[3] * 1.03, x = clamp(c[1], W / (2 * z), W - W / (2 * z)), y = clamp(c[2], H / (2 * z), H - H / (2 * z));
  return { x, y, z, r: c[4] || 0, rx: c[1], ry: c[2], rz: c[3] };
}
let SHAKES = [];
function shakeOff(t) { let sx = 0, sy = 0; SHAKES.forEach(([t0, a, d]) => { const dt = t - t0; if (dt >= 0 && dt < d) { const k = a * Math.exp(-5 * dt / d); sx += Math.sin(dt * 83 + t0) * k; sy += Math.cos(dt * 97 + t0) * k * .8; } }); return { x: sx, y: sy }; }
function walkFrame(t, spd = 9) { return { walk: t * spd, bob: Math.abs(Math.sin(t * spd)) * 6 }; }

// ---- UI pieces (follow / subscribe)
function bellShape(x, y, s, ang) {
  ctx.save(); ctx.translate(x, y - 30 * s); ctx.rotate(ang); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(-34, 38); ctx.quadraticCurveTo(-34, -2, -22, -18); ctx.quadraticCurveTo(0, -42, 22, -18); ctx.quadraticCurveTo(34, -2, 34, 38); ctx.closePath(); fl('#ffd23f'); stk(5);
  ln(-40, 40, 40, 40, 7); circ(0, 52, 9, '#ffd23f', 4); circ(0, -34, 6, '#ffd23f', 4); ctx.restore();
}
function cursorArrow(x, y, press) { ctx.save(); ctx.translate(x, y); ctx.scale(1 - press * .12, 1 - press * .12); poly([[0, 0], [0, 46], [12, 35], [21, 54], [30, 50], [21, 32], [36, 32]], '#fff', 4); ctx.restore(); }
function uiButton(cx, cy, label, doneLabel, col, t0, tClick, icon) {
  if (NOW < t0) return; const k = eBack(P(NOW, t0, t0 + .28)), done = NOW >= tClick, press = NOW >= tClick - .08 && NOW < tClick + .1 ? 1 : 0;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k * (press ? .94 : 1) * (1 + (done ? Math.max(0, .08 * Math.sin(P(NOW, tClick, tClick + .35) * 6.28)) : 0)), k * (press ? .94 : 1));
  rrect(-200 + 6, -55 + 9, 400, 110, 55, 'rgba(10,10,25,.3)', 0); rrect(-200, -55, 400, 110, 55, done ? '#dcdce4' : col, 6);
  text(done ? doneLabel : label, icon ? 22 : 0, 4, { font: 'head', size: 60, color: done ? '#4a4a58' : '#fff', spacing: 2 });
  if (icon && !done) { ctx.beginPath(); ctx.arc(-120, 0, 24, 0, 7); stk(5, '#fff'); ln(-120, -13, -120, 13, 6, '#fff'); ln(-133, 0, -107, 0, 6, '#fff'); }
  ctx.restore();
}
function skyAt(phi) {   // 0 dawn, .25 day, .55 dusk, .75 night
  const K = [[0, '#ffb27a', '#ffe7c4'], [.25, '#6ec6f0', '#fff2d2'], [.5, '#ff9a5c', '#ffd9a0'], [.75, '#1b2a5e', '#4a4f8a'], [1, '#ffb27a', '#ffe7c4']];
  for (let i = 0; i < K.length - 1; i++) if (phi <= K[i + 1][0]) { const p = P(phi, K[i][0], K[i + 1][0]); return [lerpC(K[i][1], K[i + 1][1], p), lerpC(K[i][2], K[i + 1][2], p)]; }
  return [K[0][1], K[0][2]];
}
function pot(x, y, rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); circ(0, 0, 34, '#6e7480', 6); rrect(-30, -12, 60, 20, 4, '#4a4f5c', 4); ln(-34, -4, -52, -14, 6); ctx.restore(); }

// =========================================================================== SCENES (v2: cinematic camera + action)
// ---- S1: title, Caesar sails to Rhodes, pirates ambush (cannon, swinging boarders)
const camS1 = t => kf(t, [[0, 960, 540, 1], [4.8, 960, 540, 1], [E.pirates, 900, 560, 1.1], [E.cannon, 760, 650, 1.5], [E.grab + .6, 700, 650, 1.7], [E.cut1 + .4, 700, 650, 1.8]]);
function S1(t) {
  sky(560, '#74cff3', '#fff0cf'); sunDisk(1560, 200, 70); topClouds();
  [[260, 170, 1.4], [980, 110, 1.1], [1500, 330, 1.0]].forEach(([x, y, s]) => cloud(((x + t * 10) % (W + 300)) - 150, y, s, 'rgba(255,255,255,.9)'));
  [[400, 330], [1200, 250], [1700, 370]].forEach(([x, y], i) => gull(x + Math.sin(t * .6 + i) * 60, y + Math.sin(t * 1.4 + i) * 12, t + i));
  ctx.beginPath(); ctx.ellipse(1740, 568, 210, 62, 0, Math.PI, 0); fl('#9bd37a'); stk(5); ln(1700, 520, 1700, 470, 6, '#7b5a3a'); [-1, 1, 0].forEach(d => ln(1700, 470, 1700 + d * 40, 480 + Math.abs(d) * 8, 7, '#3f9f4f'));
  text('RHODES', 1790, 500, { font: 'title', size: 46, color: '#6b1d12', rot: -.04 });
  sea(560, BOT, t, '#37b6d6', '#0f5a85', 9);
  // Roman ship sails in; Caesar studies his speech on the stern
  const sx = lerp(-420, 650, eOut(P(t, 2.2, 5.4)));
  const rbob = 760 + Math.sin(t * 1.6) * 7 * .95;
  if (t > 2.1) {
    romanShip(sx, 760, .95, t);
    ctx.save(); ctx.translate(sx, rbob); ctx.rotate(Math.sin(t * 1.3) * .022); ctx.scale(.95, .95);
    const surprised = t > E.pirates + .3, tied = t > E.grab + .85;
    figure({ kind: 'caesar', x: -215, y: -100, s: .82, dir: 1, expr: surprised ? 'surprised' : 'smug', look: 1, tied, mouth: surprised && !tied ? .8 : 0,
      pose: tied ? { la: [.5, .6], ra: [.45, .75], tilt: .1 } : surprised ? { la: [2.5 + Math.sin(t * 25) * .2, -.4], ra: [2.6 - Math.sin(t * 25) * .2, -.4], crouch: 10 } : { ra: [.9, 1.0], la: [.7, .9] },
      onHandB: () => { if (!surprised) { ctx.save(); ctx.rotate(.1); rrect(-6, -26, 56, 38, 5, '#f6e7bd', 3); ln(2, -14, 42, -14, 2, '#5b3a1e'); ln(2, -4, 42, -4, 2, '#5b3a1e'); ctx.restore(); } } });
    ctx.restore();
  }
  tag('JULIUS CAESAR', ['Age 25. Studying public', 'speaking. Future dictator.'], 640, 262, E.ship_in + .4, E.pirates - .1, { rot: -.03 });
  // pirate ship barrels in, fires, and boarders swing across on ropes
  if (t > E.pirates - .3) {
    const px = lerp(2500, 1420, eOut(P(t, E.pirates - .3, E.pirates + .6)));
    pirateShip(px, 770, 1.0, t, 1);
    const fp = P(t, E.cannon, E.cannon + .5);
    if (t >= E.cannon && fp < 1) cannonball(lerp(px - 280, sx + 200, fp), lerp(620, 640, fp) - Math.sin(fp * 3.14) * 170);
    if (t >= E.cannon) { smoke(px - 300, 650, E.cannon); burst(px - 290, 650, 20, 90, E.cannon, .35, '#ffb52e'); }
    if (t > E.cannon + .5 && t < E.cannon + 1.1) { const p = P(t, E.cannon + .5, E.cannon + 1.1); for (let i = 0; i < 8; i++) { const a = -1.2 - i * .12 + (i % 2) * .5; ln(sx + 240 + Math.cos(a) * 80 * p * 2, 800 + Math.sin(a) * 140 * p - 20 * p * p, sx + 240 + Math.cos(a) * 80 * p * 2, 808 + Math.sin(a) * 140 * p, 6, '#fff'); } }
    const landY = rbob - 92;
    [['captain', 0, 130], ['skinny', .14, 30]].forEach(([k, dl, off], i) => {
      if (t < E.grab - .05) return; const u = clamp((t - E.grab - dl) / .62), flying = u < 1;
      const x = lerp(px - 130 + i * 40, sx - 70 + off, eOut(u)), y = lerp(640, landY, u) - Math.sin(u * 3.14) * 240;
      if (flying) { ln(px - 40, 255, x + 6, y - 190, 5, '#c9a06a'); circ(x + 6, y - 190, 6, '#444', 3); }
      figure({ kind: k, x, y, s: .72, dir: -1, ph: i, expr: flying ? 'happy' : 'smug', mouth: flying ? .9 : 0,
        pose: flying ? { la: [2.6, -.2], ra: [2.9, -.1], legs: { a: [.9, .4], b: [-.5, -.3] }, bob: 0 } : { ra: [1.5, .2], la: [.9, .5], lean: .1 } });
    });
    shout('AMBUSH!', 960, 150, E.grab - .05, E.cut1 + .3, { size: 150, color: '#ff4d3a', rot: -.07 });
  }
  const slam = eBack(P(t, .1, .45)), shrink = eIO(P(t, 2.2, 3.0));
  if (t >= .1 && t < E.pirates + .2) {
    const sc = lerp(1.0, .52, shrink) * lerp(1.7, 1, slam), y1 = lerp(420, 62, shrink), y2 = lerp(590, 148, shrink);
    ctx.save(); ctx.globalAlpha = 1 - P(t, E.pirates - .4, E.pirates);
    if (shrink < 1) hud(() => { ctx.fillStyle = `rgba(10,40,70,${.35 * (1 - shrink)})`; ctx.fillRect(0, 0, CW, CH); });
    hud(() => {
      const X = CW / 2, a1 = PORTRAIT ? lerp(820, 140, shrink) : y1, a2 = PORTRAIT ? lerp(985, 262, shrink) : y2;
      text('JULIUS CAESAR', X, a1, { font: 'roman', size: PORTRAIT ? 104 : 130, weight: '900', color: '#f1c453', stroke: INK, sw: 22, sc, rot: -.01 + (t < .5 ? Math.sin(t * 90) * .01 : 0) });
      text('vs. THE PIRATES', X, a2, { font: 'title', size: PORTRAIT ? 148 : 170, color: '#e5483f', stroke: INK, sw: 20, sc, rot: -.01 });
      if (t > 1.0 && t < 2.3) text('(he demanded a higher ransom)', X, PORTRAIT ? 1180 : 740, { size: PORTRAIT ? 54 : 64, color: '#fff', stroke: INK, sw: 10, alpha: P(t, 1.0, 1.4) });
    });
    ctx.restore();
  }
}

// ---- S2: the ransom negotiation: whip-pans, punch-ins, coin-eyed captain
const camS2 = t => kf(t, [[E.cut1 - .1, 1150, 560, 1.12], [11.1, 1150, 560, 1.12], [11.5, 650, 520, 1.4], [E.gong, 620, 500, 1.55], [E.cross20 - .1, 600, 480, 1.7], [E.price50 - .15, 600, 480, 1.75], [E.price50, 590, 470, 2.1], [E.jawdrop - .15, 590, 470, 2.1], [E.jawdrop + .05, 1250, 500, 2.0], [E.chart - .45, 1250, 500, 2.1], [E.chart - .02, 960, 540, 1.0], [E.cut2 + .3, 960, 540, 1.04]]);
function S2(t) {
  deckBG({ sky: ['#6fcdf2', '#fff2d2'], sea: ['#35b3d1', '#14688f'], sun: [1500, 240, 64], gulls: [[300, 200], [900, 140]] });
  barrel(130, GY + 20, 120, 150); barrel(1810, GY + 10, 110, 140);
  const jaw = t >= E.jawdrop && t < beat('b3b').start, greedy = t >= E.price50 + .3;
  const pm = Math.max(0, t < 11.2 ? 0 : 0);
  const lipC = t < beat('b3').start ? lip('b2', t) : lip('b3b', t);
  const lipH = lip('b3', t), jt = t - E.jawdrop, sq = jt > 0 && jt < 1.2 ? .14 * Math.exp(-jt * 5) * Math.sin(jt * 28) : 0;
  const caesar = { kind: 'caesar', x: 560, y: GY, s: 1.25, dir: 1, ...lipH, tied: true, ph: 1, expr: t > E.price50 - .2 ? 'smug' : (t > beat('b3').start ? 'surprised' : 'smug'), look: 1,
    pose: { la: [.5, .6], ra: [.45, .75], tilt: lipH.mouth > .3 ? -.07 : 0, lean: -.1 * P(t, 11.2, 11.5) * (1 - P(t, 12.0, 12.4)) }, anger: t > beat('b3').start && t < E.gong + 1.5 ? .5 * Math.sin(P(t, beat('b3').start, E.gong + 1.5) * 3.14) : 0 };
  const capt = { kind: 'captain', x: 1330, y: GY, s: 1.25, dir: -1, ...(jaw ? { mouth: .95, mw: .3 } : lipC), ph: 4, expr: greedy ? 'coin' : 'neutral', look: -1,
    sweat: false, sy: 1 + sq, sx: 1 - sq * .8, hop: jt > 0 && jt < .5 ? Math.sin(jt * 6.28) * 46 : 0,
    pose: t < E.jawdrop ? { la: gesture(lipC.mouth, [.9, .6], .6), ra: [1.5 + Math.sin(t * 6) * .1 * lipC.mouth, .1], lean: .05 } : { la: [.9, 1.5 + Math.sin(t * 14) * .2], ra: [.8, 1.6 - Math.sin(t * 14) * .2], lean: .1 },
    onHandB: t < E.jawdrop ? () => { ctx.save(); ctx.rotate(-.1); ln(0, 0, 150, -10, 8, '#d7dbe3'); ln(0, 0, 150, -10, 3, '#fff'); rrect(-18, -10, 24, 20, 3, '#6b4423', 3); ctx.restore(); } : undefined };
  figure(caesar); figure(capt);
  if (greedy && t < beat('b3b').end) { const dp = (t * 1.5) % 1; ctx.save(); ctx.translate(capt.hx, capt.hy); ctx.beginPath(); ctx.moveTo(-8, 70 + dp * 40); ctx.quadraticCurveTo(0, 82 + dp * 40, -8, 90 + dp * 40); fl('#bfe8ff'); stk(2.5, '#4a90c0'); ctx.restore(); }
  // ransom sign (screen space)
  hud(() => {
    if (t >= E.ransom20 && t < E.price50 + 2.1) {
      const k = eBack(P(t, E.ransom20, E.ransom20 + .3)) * (1 - P(t, E.price50 + 1.8, E.price50 + 2.1)); ctx.save(); trh(1000, PORTRAIT ? 10 : 120); ctx.rotate(-.03); ctx.scale(k, k);
      parch(0, 0, 460, 150); text('RANSOM DEMAND', 0, -42, { font: 'title', size: 44, color: '#6b1d12' }); text('20 TALENTS', 0, 18, { font: 'title', size: 74, color: '#3b2a1a' });
      const x20 = P(t, E.cross20, E.cross20 + .15); if (x20 > 0) { ln(-190, -10, -190 + 380 * x20, 60 * x20 - 10, 18, '#e5483f'); ln(-190, 50, -190 + 380 * x20, 50 - 60 * x20, 18, '#e5483f'); }
      ctx.restore();
    }
    if (t >= E.price50) { const k = eBack(P(t, E.price50, E.price50 + .22)) * (1 - P(t, E.price50 + 1.5, E.price50 + 1.8)); ctx.save(); trh(980, PORTRAIT ? 150 : 330); ctx.rotate(-.1); ctx.scale(k, k); text('50!', 0, 0, { font: 'title', size: 330, color: '#ffd23f', stroke: INK, sw: 26 }); ctx.restore(); }
    if (t > E.price50 && t < E.price50 + 1.4) coinRain(E.price50, .7, 44);
  });
  // wide shot: the chart board
  if (t >= E.chart - .1) {
    const drop = eElastic(P(t, E.chart - .1, E.chart + .7)), by = lerp(-300, 255, drop); ctx.save(); ctx.translate(960, by); ctx.rotate(Math.sin(t * 2) * .012);
    ln(-210, -330, -210, -130, 5, '#c9a06a'); ln(210, -330, 210, -130, 5, '#c9a06a'); parch(0, 0, 580, 330);
    text("CAESAR'S NEGOTIATING STYLE", 0, -130, { font: 'title', size: 40, color: '#6b1d12' });
    ln(-230, 100, -230, -90, 6, '#3b2a1a'); ln(-230, 100, 240, 100, 6, '#3b2a1a');
    const pr = P(t, E.chart + .3, E.chart + 2.2); ctx.beginPath(); for (let i = 0; i <= 60 * pr; i++) { const f = i / 60, x = -230 + f * 450, y = 100 - Math.pow(f, 1.7) * 180; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } stk(11, '#2e9c4f');
    if (pr > .02) { const x = -230 + pr * 450, y = 100 - Math.pow(pr, 1.7) * 180; poly([[x + 6, y - 14], [x + 24, y + 14], [x - 16, y + 14]], '#2e9c4f', 3); }
    text('ASKING PRICE', -225, 128, { size: 30, color: '#3b2a1a', align: 'left' }); text('(his own!)', 150, 128, { size: 30, color: '#3b2a1a' }); ctx.restore();
    shout('UPWARDS!', 960, 520, E.upwards - .05, E.upwards + 1.3, { font: 'title', size: 130, color: '#2e9c4f', rot: -.1, sw: 18, stroke: '#fff' });
  }
  bubble('Arr! We be wantin\' twenty talents o\' silver!', 1500, 240, capt.hx - 30, capt.hy - 70, beat('b2').start, beat('b2').end + .1, { size: 46, maxW: 470 });
  bubble('Twenty?! Do you have ANY idea who I am? Make it... fifty.', 470, 260, caesar.hx + 20, caesar.hy - 70, beat('b3').start, beat('b3').end + .1, { size: 46, maxW: 480 });
  bubble("F-fifty?! Aye. Fifty it is, then.", 1420, 230, capt.hx - 30, capt.hy - 70, beat('b3b').start, beat('b3b').end + .1, { size: 46, maxW: 460 });
  tag('PIRATE CAPTAIN', ['Hobbies: kidnapping.', 'Weakness: maths.'], 1640, 560, E.cut1 + .2, E.ransom20 + 1.2, { rot: .03 });
  if (t > E.price50 && t < E.price50 + .6) burst(capt.hx, capt.hy, 70, 150, E.price50, .45, '#ffd23f');
}

// ---- S3: the bossiest hostage ever (day/night time-lapse, servants, the nap, CLANG)
const camS3 = t => kf(t, [[E.cut2 - .3, 940, 590, 1.0], [E.days + 1.0, 900, 610, 1.16], [E.nap - .3, 1000, 620, 1.25], [E.nap + .35, 1220, 760, 1.9], [E.clang - .1, 1220, 760, 1.95], [E.clang + .25, 1100, 660, 1.3], [E.tiptoe + .55, 960, 560, 1.0], [E.cut3 + .3, 960, 560, 1.04]]);
function S3(t) {
  const u = P(t, E.days, E.nap - .4), end = E.nap - .4, phiTot = u < 1 ? u * 3 : 3 + eIO(P(t, end, end + .7)) * .42, phi = phiTot % 1;
  const [skyT, skyB] = skyAt(phi), isDay = phi < .62, q = isDay ? phi / .62 : (phi - .62) / .38;
  const sunP = [150 + q * 1620, 560 - Math.sin(q * Math.PI) * (isDay ? 410 : 360), isDay ? 64 : 46, isDay ? '#fff0b0' : '#e8ecff'];
  deckBG({ sky: [skyT, skyB], sea: [lerpC('#3fa7b8', '#1c3a6e', clamp(1 - Math.abs(phi - .75) / .25)), lerpC('#1e6f8f', '#10204a', clamp(1 - Math.abs(phi - .75) / .25))], sun: sunP, clouds: [[900, 130, 1.3], [1500, 220, 1.0]], cloudCol: 'rgba(255,236,210,.8)' });
  // friends' boat sets off to raise the silver
  const bx = lerp(1000, 1780, eIO(P(t, E.cut2, E.cut3))), by = 700;
  dinghy(bx, by, t, .5); ln(bx - 10, by - 30, bx - 10, by - 100, 5, INK); poly([[bx - 10, by - 100], [bx + 50, by - 40], [bx - 10, by - 34]], '#fff', 4);
  figure({ kind: 'plain', x: bx + 20, y: by - 20, s: .3, dir: 1, ph: 2, expr: 'happy', pose: { la: [2.3 + Math.sin(t * 5) * .3, -.2] } });
  // cushions + Caesar reclining
  const lap = t < E.nap - .3, awake = t > E.nap + .1, glare = t > E.clang;
  ctx.save(); rrect(600, GY - 112 + 18, 820, 64, 30, '#c0392b', 6); ln(625, GY - 112 + 34, 1395, GY - 112 + 34, 4, '#f1c453'); ell(1335, GY - 112 - 4, 100, 32, '#fff3d6', 5); ctx.restore();
  const cl = lip('b6', t);
  const caesar = layDown({ kind: 'caesar', x: 930, y: 0, s: 1.22, dir: 1, ...cl, ph: 3, blink: awake && !glare ? false : (glare ? false : true), expr: glare ? 'surprised' : (awake ? 'smug' : 'neutral'), anger: glare ? Math.min(1, P(t, E.clang, E.clang + .3)) * (1 - P(t, E.tiptoe + 1.2, E.cut3)) : 0,
    pose: { la: awake && !glare ? [2.2, -2.0] : [2.7, -1.2], ra: [-.2, .2], bob: 0, tilt: -1.05 } }, 1, 1, GY - 82);
  figure(caesar);
  // servants: frantic during the lapse, then standing by
  const run = t > E.tiptoe, tp = P(t, E.tiptoe, E.cut3 - .2), ease = P(t, E.nap - .6, E.nap - .2);
  const leaf = rot => () => { ctx.save(); ctx.rotate(rot); ln(0, 0, -20, -120, 6, '#5b3a22'); ell(-34, -160, 30, 92, '#58b368', 5, INK, -.25); ln(-30, -80, -44, -230, 3, '#2e7a3f'); ctx.restore(); };
  const skX = lap ? (PORTRAIT ? 1500 + 110 * Math.sin(t * 2.4) : 1630 + 140 * Math.sin(t * 2.4)) : (run ? lerp(PORTRAIT ? 1540 : 1710, 2200, tp) : (PORTRAIT ? 1540 : 1710)), skDir = lap ? (Math.cos(t * 2.4) > 0 ? 1 : -1) : -1;
  const balX0 = PORTRAIT ? 1320 : 1450, capX0 = PORTRAIT ? 560 : 470, balX = run ? lerp(balX0, 1980, tp) : balX0, capX = run ? lerp(capX0, -260, tp) : capX0;
  const tipW = run ? { walk: t * 3.6, bob: Math.abs(Math.sin(t * 3.6)) * 14, la: [2.8, -2.0] } : null;
  const bald = { kind: 'bald', x: balX, y: GY, s: 1.15, dir: -1, ph: 5, expr: glare ? 'worried' : 'happy', sweat: glare && !run, pose: tipW || { ra: [1.6 + Math.sin(t * (lap ? 12 : 5)) * (lap ? .35 : .1), .5], la: [.3, .3] }, onHandB: run ? undefined : leaf(Math.sin(t * (lap ? 12 : 5)) * (lap ? .8 : .5)) };
  const skin = { kind: 'skinny', x: skX, y: GY, s: 1.15, dir: skDir, ph: 6, expr: glare ? 'surprised' : 'happy', pose: lap ? { ...walkFrame(t, 13), la: [.5, .8], ra: [1.3, .8] } : (run ? { ...tipW, walk: t * 3.6 + 1 } : { ra: [1.3, .9], la: [.4, .4] }),
    onHandB: run || (t >= E.clang - .3) ? undefined : () => { ctx.save(); rrect(-34, -4, 80, 14, 6, '#8a5a34', 4); [0, 1, 2, 3].forEach(i => circ(-18 + i * 17, -14 - (i % 2) * 5, 10, '#8c4bd0', 3)); ctx.restore(); } };
  const capt = { kind: 'captain', x: lap ? 560 : capX, y: GY, s: 1.2, dir: 1, ph: 7, expr: glare ? 'surprised' : 'neutral', sweat: glare && !run,
    pose: lap ? { crouch: 60, lean: .25, ra: [1.2 + Math.sin(t * 12) * .3, .6], la: [1.0 - Math.sin(t * 12) * .3, .7] } : (run ? { walk: t * 3.6 + 2, la: [-2.8, 2.0], bob: Math.abs(Math.sin(t * 3.6 + 2)) * 14 } : { ra: [1.0, 1.4], la: [.2, .3] }),
    onHandB: lap || run ? undefined : () => { ctx.save(); ctx.rotate(-.2); ln(0, 0, 24, -120, 7, '#cfd3da'); rrect(-14, -8, 40, 12, 3, '#6b4423', 3); ctx.restore(); } };
  figure(bald); figure(skin); figure(capt);
  if (t > E.clang - .3 && t < E.clang + 1.6) { const f = P(t, E.clang - .3, E.clang), py = lerp(700, 868, f * f) - (t > E.clang ? Math.abs(Math.sin((t - E.clang) * 9)) * 40 * Math.exp(-(t - E.clang) * 2.5) : 0); pot(1700 - (t > E.clang ? (t - E.clang) * 60 : 0), py, t * 6); }
  if (!awake && !lap) zzz(1250, GY - 250, E.nap - .3);
  if (t > E.tiptoe && t < E.cut3 - .1) text('shhh...', 1300, 600, { size: 56, color: '#fff', stroke: '#8a5a34', sw: 10, rot: -.08, alpha: P(t, E.tiptoe, E.tiptoe + .2) });
  const night = clamp(1 - Math.abs(phi - .75) / .2) * (u < 1 || t < end + .7 ? 1 : 0);
  hud(() => {
    if (night > 0) { ctx.fillStyle = `rgba(8,14,48,${.4 * night})`; ctx.fillRect(0, 0, CW, CH); }
    const day = Math.floor(1 + 37 * eIO(P(t, E.days, E.days + 2.6)));
    if (t >= E.days && t < E.nap - .2) { const k = eBack(P(t, E.days, E.days + .3)) * (1 - P(t, E.nap - .5, E.nap - .2)); ctx.save(); trh(250, 250); ctx.scale(k, k); ctx.rotate(-.05); rrect(-130, -130, 260, 260, 12, '#fff', 6); rrect(-130, -130, 260, 62, 12, '#d2382f', 6); text('DAY', 0, -98, { font: 'head', size: 56, color: '#fff' }); text(String(day), 0, 18, { font: 'head', size: 160, color: INK }); if (day >= 38) text('(and counting)', 0, 98, { size: 30, color: '#6b5a44' }); ctx.restore(); }
    if (t > E.hostage && t < E.hostage + 2.0) { const k = eBack(P(t, E.hostage, E.hostage + .18)); ctx.save(); trh(960, 240); ctx.rotate(-.1); ctx.scale(PORTRAIT ? k * .88 : k, PORTRAIT ? k * .88 : k); rrect(-390, -64, 780, 128, 8, 'rgba(255,255,255,.75)', 10, '#d2382f'); text('BOSSIEST HOSTAGE EVER', 0, 4, { font: 'title', size: 92, color: '#d2382f' }); ctx.restore(); }
  });
  bubble('Shh! Some of us are trying to nap.', 720, 250, caesar.hx || 1200, GY - 230, beat('b6').start, beat('b6').end + .1, { size: 54, maxW: 520 });
  hud(() => { shoutW('CLANG!', 1440, 420, E.clang - .02, E.clang + .9, { size: 150, color: '#ffd23f', rot: .1 }); });
}

// ---- S4: poetry, snoring, the explosion, the calm threat, the laughter, Blackbeard
const camS4 = t => kf(t, [[E.cut3 - .3, 960, 600, 1.0], [E.poetry + .3, 960, 620, 1.25], [E.snore, 960, 620, 1.25], [E.barbarians - .3, 960, 640, 1.5], [E.barbarians + .8, 960, 640, 1.5], [E.threat - .6, 960, 540, 1.25], [E.threat + 2.2, 960, 500, 1.9], [E.laugh - .1, 960, 500, 1.9], [E.laugh + .35, 960, 600, 1.0], [E.bb - .2, 960, 600, 1.0], [E.bb + .5, 1350, 600, 1.35], [E.cut4 + .3, 1350, 600, 1.4]]);
function S4(t) {
  deckBG({ sky: ['#ff8a5c', '#ffd9a0'], sea: ['#d4676a', '#4b2c5e'], sun: [1280, 590, 120, '#ffb347'], clouds: [[300, 150, 1.4], [1500, 220, 1.2], [800, 360, 1.0]], cloudCol: 'rgba(255,200,170,.75)' });
  const crateIn = eOut(P(t, E.cut3 - .3, E.cut3 + .2)), cy = GY - 110 * crateIn;
  if (crateIn > 0) crate(960, GY + 6, 230, 112 * crateIn);
  const sleepP = P(t, E.snore, E.snore + .3) * (1 - P(t, E.barbarians, E.barbarians + .25)), laughP = P(t, E.laugh, E.laugh + .3) * (1 - P(t, E.bb - .1, E.bb + .45));
  const poem = t < E.snore, rant = t >= E.barbarians && t < E.barbarians + 1.7, calm = t >= E.threat - 1.8;
  const ang = t < E.barbarians ? P(t, E.snore + .2, E.barbarians) * .6 : (t < E.barbarians + 1.7 ? 1 : Math.max(0, 1 - P(t, E.barbarians + 1.7, E.threat - 1.2)));
  const hopC = rant ? Math.abs(Math.sin((t - E.barbarians) * 9)) * 44 : 0;
  const swing = poem ? Math.sin((t - E.poetry) * 5.5) : 0;
  const cLip = t >= beat('b8').start ? lip('b8', t) : { mouth: poem ? Math.abs(Math.sin(t * 11)) * .8 : 0, mw: .5 };
  const caesar = { kind: 'caesar', x: 960, y: cy, s: 1.25, dir: 1, ...cLip, ph: 1, expr: rant ? 'surprised' : 'smug', anger: ang, hop: hopC, look: 0,
    pose: poem ? { la: [.5 + swing * .3, .5], ra: [1.9 + swing * .9, -.3], tilt: -.06 - swing * .05, lean: -.05 } : rant ? { la: [2.5 + Math.sin(t * 30) * .15, -.4], ra: [2.7, -.4], lean: .08 } : { la: [.5, .4], ra: [.9 + (calm ? gesture(cLip.mouth, [0, 0], .5)[0] * .5 : 0), .5], tilt: calm ? .05 : 0 },
    onHandA: t < E.barbarians ? () => { ctx.save(); ctx.rotate(.12); rrect(-4, -20, 150, 200 * Math.min(1, P(t, E.cut3, E.cut3 + .6)), 8, '#f6e7bd', 4); text('ODE TO ME', 71, 6, { font: 'title', size: 34, color: '#6b1d12' }); for (let i = 0; i < 5; i++) ln(14, 40 + i * 24, 130, 40 + i * 24, 2.5, '#5b3a1e'); ctx.restore(); } : undefined };
  const sleepy = o => { if (sleepP > 0) { o.blink = true; o.pose = { ...o.pose, tilt: (o.pose.tilt || 0) + sleepP * .25 * (o.dir || 1), lean: (o.pose.lean || 0) + sleepP * .1, bob: Math.sin(t * 2 + o.ph) * 4 }; } return o; };
  const startled = t >= E.barbarians && t < E.barbarians + 1.0, listen = poem ? { la: [.2, .2], ra: [.2, .3] } : { la: [.2, .2], ra: [-.1, .2] };
  const tearOn = t > E.poetry + .6 && t < E.snore;
  const skin = sleepy({ kind: 'skinny', x: PORTRAIT ? 480 : 360, y: GY, s: 1.15, dir: 1, ph: 3, expr: startled ? 'surprised' : (laughP > 0 ? 'happy' : 'neutral'), mouth: laughP > 0 ? .8 : 0, hop: startled ? Math.sin(P(t, E.barbarians, E.barbarians + .4) * 3.14) * 50 : 0, look: 1,
    pose: tearOn ? { la: [.2, .2], ra: [2.5, -2.2] } : { ...listen, crouch: laughP > 0 ? 20 : 0 } });
  const capt = sleepy({ kind: 'captain', x: PORTRAIT ? 700 : 620, y: GY, s: 1.2, dir: 1, ph: 5, expr: startled ? 'surprised' : (laughP > 0 ? 'happy' : 'neutral'), ...(t >= E.laugh ? lip('b9', t) : {}), hop: startled ? Math.sin(P(t, E.barbarians, E.barbarians + .4) * 3.14) * 50 : 0, look: 1,
    pose: laughP > 0 ? { ra: [2.1 + Math.sin(t * 20) * .3, 0], la: [.3, .3], crouch: 20 } : listen });
  const baldFall = P(t, E.snore + .4, E.snore + .9) * (1 - P(t, E.barbarians + .5, E.barbarians + .85));
  const bald = sleepy({ kind: 'bald', x: PORTRAIT ? 1290 : 1450, y: GY, s: 1.15, dir: -1, ph: 7, expr: startled ? 'surprised' : (laughP > 0 ? 'happy' : 'neutral'), mouth: laughP > 0 ? .8 : 0, look: -1, pose: listen });
  // pirates fall over laughing
  [skin, capt, bald].forEach((o, i) => { const p = Math.max(laughP, i === 2 ? baldFall : 0); if (p > 0) { layDown(o, p, i === 2 ? 1 : (i === 0 ? -1 : 1)); if (laughP > baldFall) { o.rot = (i === 1 ? 1 : -1) * 1.3 * p * Math.sin(t * 6 + i * 2); o.legs = undefined; o.pose = { ...o.pose, legs: { a: [.9 + Math.sin(t * 14 + i) * .5, .3], b: [-.2 + Math.cos(t * 14 + i) * .5, .1] }, la: [2.4 + Math.sin(t * 12) * .4, 0], ra: [2.2, 0] }; } } });
  // Blackbeard wanders in
  const bbIn = P(t, E.bb - .6, E.bb + .35), bbx = lerp(2150, PORTRAIT ? 1520 : 1730, eOut(bbIn)), bbLip = lip('b9b', t);
  const blackbeard = { kind: 'blackbeard', x: bbx, y: GY, s: 1.15, dir: -1, ph: 9, ...bbLip, expr: t > E.bb + 1.5 ? 'worried' : 'neutral', look: -1, pose: bbIn < 1 && bbIn > 0 ? walkFrame(t, 8) : { la: gesture(bbLip.mouth, [.9, .6], .6), ra: [.3, .3] } };
  figure(skin); figure(capt); figure(bald); figure(caesar); if (t > E.bb - .7) figure(blackbeard);
  // thrown scroll
  if (t >= E.barbarians && t < E.barbarians + 2) { const f = P(t, E.barbarians, E.barbarians + .6); ctx.save(); ctx.translate(lerp(900, 640, f), lerp(640, GY - 20, f * f) - Math.sin(f * 3.14) * 160); ctx.rotate(f * 12); rrect(-50, -14, 100, 28, 12, '#f6e7bd', 4); ctx.restore(); }
  if (t >= E.snore && t < E.barbarians + .1) { zzz(PORTRAIT ? 480 : 360, GY - 400, E.snore); zzz(PORTRAIT ? 700 : 620, GY - 420, E.snore + .4); if (baldFall < .5) zzz(PORTRAIT ? 1290 : 1450, GY - 400, E.snore + .2); }
  if (poem) for (let i = 0; i < 4; i++) { const p = ((t - E.poetry) * .6 + i / 4) % 1; hud(() => { const q = hp(300 + i * 360 + Math.sin(p * 6) * 30, 640 - p * 280); text(['♪', '♫', '♪', '♬'][i], q.x, q.y, { size: 64, color: '#fff', stroke: '#8a3a2a', sw: 10, alpha: Math.sin(p * 3.14) }); }); }
  shout('ILLITERATE BARBARIANS!', 960, 190, E.barbarians - .05, E.barbarians + 1.9, { font: 'title', size: 124, color: '#fff', stroke: '#c0392b', sw: 22, rot: -.03 });
  // to-do list (screen space) while he delivers the threat
  hud(() => {
    const b8 = beat('b8').start; if (t >= b8 && t < E.laugh + .4) {
      const k = eBack(P(t, b8, b8 + .3)) * (1 - P(t, E.laugh, E.laugh + .4)); ctx.save(); ctx.translate(PORTRAIT ? 540 : 1560, PORTRAIT ? 215 : 280); ctx.rotate(.04); ctx.scale(PORTRAIT ? k * .82 : k, PORTRAIT ? k * .82 : k);
      parch(0, 0, 560, 340); text("CAESAR'S TO-DO LIST", 0, -130, { font: 'title', size: 46, color: '#6b1d12' });
      ['Get ransomed', 'Raise a fleet', 'Sail back', 'Crucify pirates'].forEach((s, i) => { const p = P(t, b8 + .3 + i * .55, b8 + .6 + i * .55); ctx.save(); ctx.globalAlpha = p; scribbleBox(s, -170, -62 + i * 56, i === 3 ? P(t, E.threat + 1.5, E.threat + 1.8) : 0); ctx.restore(); }); ctx.restore();
    }
  });
  bubble("Oh, and when this is over, I'll have every one of you... crucified.", 560, 240, caesar.hx - 10, caesar.hy - 70, beat('b8').start, beat('b8').end + .1, { size: 46, maxW: 540 });
  bubble("Oh, ye be a funny one, lad!", 480, 250, capt.hx, capt.hy - 70, beat('b9').segs[1][1], beat('b9').end + .1, { size: 50, maxW: 440 });
  if (t >= E.laugh && t < beat('b9').segs[1][1]) shout('HA HA HA!', 960, 440, E.laugh, beat('b9').segs[1][1], { size: 120, color: '#fff', stroke: '#8a3a2a', sw: 18, rot: .05 });
  tag('BLACKBEARD', ['Born 1680. Wrong video.'], 1700, 400, E.bb + .15, beat('b9b').end, { rot: .03, color: '#e2e2ea' });
  bubble("I'm from seventeen eighteen. Why am I here?", 1230, 215, blackbeard.hx - 20, blackbeard.hy - 70, beat('b9b').start, beat('b9b').end + .1, { size: 44, maxW: 500 });
}

// ---- S5: ransom paid, fleet raised, cannon volleys, pirates caught
const camS5 = t => kf(t, [[E.cut4 - .3, 1250, 600, 1.3], [E.paid + .3, 1250, 600, 1.3], [E.paid + 1.6, 700, 640, 1.25], [E.fleet - .2, 960, 560, 1.0], [E.back, 960, 560, 1.0], [E.caught - .3, 1150, 620, 1.3], [E.silver, 1000, 600, 1.1], [E.cut5 + .3, 960, 560, 1.04]]);
function S5(t) {
  sky(560, '#74cff3', '#fff0cf'); sunDisk(300, 190, 66); topClouds();
  [[700, 140, 1.4], [1350, 220, 1.1], [1700, 120, 1.0]].forEach(([x, y, s]) => cloud(((x + t * 9) % (W + 300)) - 150, y, s, 'rgba(255,255,255,.9)'));
  sea(560, BOT, t, '#37b6d6', '#0f5a85', 9);
  const caught = t >= E.caught, px = 1360, shk = caught ? Math.sin(t * 38) * 3 * Math.exp(-(t - E.caught) * 1.2) : 0;
  pirateShip(px + shk, 800, 1.1, t, 1);
  ctx.save(); ctx.translate(px + shk, 800 + Math.sin(t * 1.5 + 1) * 8 * 1.1); ctx.rotate(Math.sin(t * 1.2 + 1) * .025); ctx.scale(1.1, 1.1);
  const laughing = t < E.paid - .1, laugh = laughing ? Math.sin(t * 20) * .5 + .5 : 0, hands = caught ? { la: [2.8 + Math.sin(t * 9) * .1, -.2], ra: [2.8, -.2] } : null;
  [['captain', -150], ['bald', 40], ['skinny', 200]].forEach(([k, dx], i) => figure({ kind: k, x: dx - 60, y: -100, s: .62, dir: -1, ph: i, mouth: laughing ? laugh : 0, expr: caught ? 'surprised' : (t < E.paid ? 'happy' : (t < E.silver ? 'coin' : 'neutral')), sweat: caught, pose: hands ? { ...hands, crouch: 6 } : { crouch: laughing ? 12 + Math.sin(t * 20 + i) * 6 : 0, la: [.3, .3], ra: [.2, .3] } }));
  chest(-250 + 90, -100, .9, P(t, E.paid, E.paid + .4) * (t < E.silver ? 1 : 1 - P(t, E.silver, E.silver + .3)), t < E.silver + .3 ? 10 : 0);
  ctx.restore();
  if (laughing) shout('HA HA HA!', 1360, 330, E.cut4 + .2, E.paid - .15, { size: 80, color: '#fff', stroke: '#8a3a2a', sw: 14, rot: .04 });
  const dx = lerp(900, 330, eIO(P(t, E.paid, E.paid + 2.0))), dinOn = t > E.paid - 1.2 && t < E.fleet + .6;
  if (dinOn) { const dv = lerp(1, 0, P(t, E.fleet, E.fleet + .6)); ctx.save(); ctx.globalAlpha = dv; dinghy(dx, 860, t, 1.1); figure({ kind: 'caesar', x: dx, y: 840, s: .56, dir: -1, ph: 2, expr: 'smug', look: -1, pose: { la: [2.5 + Math.sin(t * 6) * .3, -.3], ra: [.3, .3] } }); ctx.restore(); }
  if (t >= E.paid && t < E.fleet - .1) { shout('RANSOM PAID: 50 TALENTS', 960, 260, E.paid, E.fleet - .15, { font: 'title', size: 92, color: '#ffd23f', stroke: INK, sw: 16, rot: -.04 }); sparkles(1100, 650, 180, 12, E.paid, 1.2); }
  if (t >= E.fleet - .2) {
    const adv = eIO(P(t, E.back, E.caught)), slide = eOut(P(t, E.fleet - .1, E.fleet + 1.0));
    [[0, 690, .62], [1, 780, .7], [2, 880, .78], [3, 970, .6]].forEach(([i, y, s]) => { const x0 = lerp(-560, 150 + i * 190, slide) + adv * 430; romanShip(x0, y, s, t, i);
      if (i === 1) { ctx.save(); ctx.translate(x0, y + Math.sin(t * 1.6 + i) * 7 * s); ctx.scale(s, s); figure({ kind: 'caesar', x: -60, y: -100, s: .8, dir: 1, ph: 3, expr: 'smug', look: 1, pose: { ra: [2.1, -.2], la: [.2, .3] } }); ctx.restore(); }
      [0, 1, 2].forEach(v => { const tv = E.back + .3 + v * .3 + i * .07, f = P(t, tv, tv + .5); if (t >= tv && f < 1 && t < E.caught + .3) cannonball(lerp(x0 + 220 * s, px - 200, f), lerp(y - 60, 760, f) - Math.sin(f * 3.14) * 210); if (t >= tv && t < tv + 1.8 && t < E.caught + .4) smoke(x0 + 240 * s, y - 70, tv, 3); }); });
    shout('FLEET SELF-FUNDED!', 960, 190, E.fleet, E.fleet + 1.7, { size: 86, color: '#fff', stroke: '#8a1d12', sw: 16, rot: -.03, font: 'title' });
    if (t >= E.back && t < E.caught) shout('...AND BACK AGAIN', 960, 420, E.back, E.caught - .1, { size: 80, color: '#ffd23f', rot: .03, font: 'title' });
  }
  if (caught) { shout('CAUGHT!', 960, 330, E.caught, E.caught + 1.4, { size: 170, color: '#ff4d3a', rot: -.06 }); const nt = eOut(P(t, E.caught, E.caught + .5)); ctx.save(); ctx.globalAlpha = .75; for (let i = 0; i < 9; i++) { const x = px - 240 + i * 60; ln(x, 500 + 100 * nt - 150 * (1 - nt), x, 760, 5, '#c9a06a'); } for (let j = 0; j < 4; j++) ln(px - 250, 560 + j * 50 + 100 * nt - 100, px + 250, 560 + j * 50 + 100 * nt - 100, 5, '#c9a06a'); ctx.restore(); }
  if (t >= E.silver) { const f = P(t, E.silver, E.silver + 1.3); for (let i = 0; i < 12; i++) { const ff = clamp(f * 1.4 - i * .06); if (ff <= 0 || ff >= 1) continue; coin(lerp(1250, 700, ff), lerp(700, 780, ff) - Math.sin(ff * 3.14) * 260, 16, ff * 14 + i); } shout('+ INTEREST!', 940, 560, E.silver + .3, E.silver + 1.8, { font: 'title', size: 100, color: '#ffd23f', stroke: INK, sw: 16, rot: -.05 }); }
  hud(() => { if (t >= E.promise - .1) { const k = eBack(P(t, E.promise - .1, E.promise + .3)); ctx.save(); trh(960, 300); ctx.rotate(-.02); ctx.scale(k, k); parch(0, 0, 640, 300); text('PROMISE: KEPT', 0, -100, { font: 'title', size: 60, color: '#6b1d12' }); ['Get ransomed', 'Raise a fleet', 'Sail back', 'Crucify pirates'].forEach((s, i) => { const col = i % 2, row = Math.floor(i / 2); scribbleBox(s, -270 + col * 300, -20 + row * 72, P(t, E.promise + .1 + i * .25, E.promise + .3 + i * .25)); }); ctx.restore(); } });
}

// ---- S6: the cell (rattling bars, sweating captain, smug Caesar), then the moral
const camS6 = t => kf(t, [[E.cut5 - .3, 1400, 600, 1.25], [E.serious + .6, 1400, 600, 1.25], [beat('b12').segs[1][1] - .05, 1250, 540, 1.8], [E.moral - .25, 1250, 540, 1.8], [E.moral + .1, 960, 540, 1.0], [E.cut6 + .3, 960, 540, 1.04]]);
function S6(t) {
  ctx.fillStyle = '#4a4d59'; ctx.fillRect(0, -1500, W, BOT + 1500);
  const r = mb(12); for (let y = PORTRAIT ? -1344 : 0; y < 900; y += 64) for (let x = (Math.floor(y / 64) % 2) * 80 - 80; x < W; x += 160) rrect(x + 4, y + 4, 152, 56, 6, lerpC('#585b68', '#42454f', r()), 4, 'rgba(25,26,32,.65)');
  ctx.fillStyle = '#34363f'; ctx.fillRect(0, GY - 30, W, BOT - GY + 30); ln(0, GY - 30, W, GY - 30, 6);
  if (PORTRAIT) for (let y = GY + 30, k = 0; y < 2300; y += 70, k++) { ln(0, y, W, y, 3, 'rgba(10,10,18,.35)'); for (let x = (k % 2) * 120 + 40; x < W; x += 240) ln(x, y, x, y + 70, 3, 'rgba(10,10,18,.3)'); }
  [[160, 330], [1760, 330]].forEach(([x, y], i) => { const fk = 1 + Math.sin(t * 13 + i * 2) * .08; const g = ctx.createRadialGradient(x, y, 10, x, y, 320 * fk); g.addColorStop(0, 'rgba(255,190,90,.65)'); g.addColorStop(1, 'rgba(255,150,60,0)'); ctx.fillStyle = g; ctx.fillRect(x - 330, y - 330, 660, 660); ln(x, y + 20, x, y + 120, 12, '#6b4423'); ctx.beginPath(); ctx.ellipse(x, y - 10 * fk, 22, 42 * fk, 0, 0, 7); fl('#ffb52e'); stk(4); ctx.beginPath(); ctx.ellipse(x, y, 11, 24 * fk, 0, 0, 7); fl('#fff2a0'); });
  rrect(640, 60, 640, 90, 8, '#2d2f38', 6, '#8a8a92'); text('PERGAMON PRISON · PIRATE WING', 960, 105, { font: 'roman', size: 34, weight: '700', color: '#e8dcc0' });
  const rat = t >= E.serious && t < E.serious + 1.9 ? Math.sin(t * 40) * 5 : 0, talk = lip('b12', t);
  const capt = { kind: 'captain', x: 1180, y: GY, s: 1.15, dir: -1, ph: 1, ...talk, expr: t > E.serious - .1 ? 'surprised' : 'worried', look: -1, sweat: true, pose: { la: [2.2 + rat * .02, -.3], ra: [2.1, -.3] } };
  const bald = { kind: 'bald', x: 1380, y: GY, s: 1.15, dir: -1, ph: 2, expr: 'worried', look: -1, pose: { la: [2.2, -.3], ra: [2.0 + rat * .02, -.3] } };
  const skin = { kind: 'skinny', x: 1560, y: GY, s: 1.15, dir: -1, ph: 3, expr: 'surprised', look: -1, pose: { la: [2.2, -.3], ra: [2.1, -.3] } };
  const bb = { kind: 'blackbeard', x: 1750, y: GY, s: 1.1, dir: -1, ph: 4, expr: 'worried', look: -1, pose: { la: [.4, .5], ra: [1.6, 1.2] } };
  [capt, bald, skin, bb].forEach(o => o.x += rat); figure(capt); figure(bald); figure(skin); figure(bb);
  for (let x = 980; x <= 1900; x += 74) rrect(x - 8 + rat * .6, 250, 16, GY - 220, 6, '#2a2c34', 4, '#15161b');
  rrect(960, 250, 960, 24, 6, '#2a2c34', 4, '#15161b'); rrect(960, GY - 40, 960, 22, 6, '#2a2c34', 4, '#15161b');
  bubble('Is this still 1718?', 1630, 440, bb.hx - 20, bb.hy - 80, E.moral + .5, E.moral + 3.0, { size: 44, maxW: 340 });
  const keysOn = Math.sin(t * 9) * .3;
  const caesar = { kind: 'caesar', x: 480, y: GY, s: 1.25, dir: 1, ph: 5, expr: 'smug', look: 1, pose: { la: [.4, .5], ra: [1.3 + keysOn * .3, .9], tilt: -.05 },
    onHandB: () => { ctx.save(); ctx.rotate(.25); rrect(-4, -70, 150, 110, 5, '#f6e7bd', 4, '#5b3a1e'); [0, 1, 2, 3].forEach(i => { ln(14, -48 + i * 24, 34, -40 + i * 24, 5, '#2e9c4f'); ln(46, -42 + i * 24, 128, -42 + i * 24, 2.5, '#5b3a1e'); }); ctx.restore(); },
    onHandA: () => { ctx.save(); ctx.rotate(keysOn); circ(0, 18, 14, null, 5, '#d7a317'); [0, 1, 2].forEach(i => { ln(0, 30, -14 + i * 14, 62, 5, '#d7a317'); circ(-14 + i * 14, 66, 6, '#d7a317', 3); }); ctx.restore(); } };
  figure(caesar);
  bubble('Wait... he was serious?!', 1240, 200, capt.hx - 20, capt.hy - 70, beat('b12').start, beat('b12').end + .6, { size: 54, maxW: 420 });
  if (t > E.serious && t < E.serious + 1.3) burst(capt.hx, capt.hy, 60, 140, E.serious, .5, '#ffd23f');
  tag('JULIUS CAESAR', ['Kept his word.', 'Smugly.'], 470, 320, E.cut5 + .4, E.serious + 1.5, { rot: -.03 });
  hud(() => { if (t >= E.moral) { const k = eBack(P(t, E.moral, E.moral + .3)); ctx.save(); ctx.translate(CW / 2, PORTRAIT ? 330 : 255); ctx.scale(k, k); if (PORTRAIT) { parch(0, 0, 980, 330, -.005); text('MORAL', 0, -105, { font: 'title', size: 56, color: '#c0392b' }); text('If you kidnap a Roman,', 0, -22, { font: 'title', size: 86, color: '#3b2a1a' }); text('never undercharge.', 0, 78, { font: 'title', size: 96, color: '#3b2a1a' }); } else { parch(0, 0, 1480, 210, -.005); text('MORAL', 0, -62, { font: 'title', size: 54, color: '#c0392b' }); text('If you kidnap a Roman, never undercharge.', 0, 20, { font: 'title', size: 92, color: '#3b2a1a' }); } ctx.restore(); }
    if (t > E.moral + .9) text("Based on Plutarch's Life of Caesar and Suetonius. Details dramatized for comedy.", CW / 2, PORTRAIT ? 1560 : 1040, { size: PORTRAIT ? 25 : 28, color: '#e8dcc0', alpha: .9 * P(t, E.moral + .9, E.moral + 1.4) }); });
}

// ---- S7: Julius asks you to follow and subscribe (or else)
const camS7 = t => kf(t, [[E.cut6 - .3, 960, 560, 1.0], [E.cta_threat, 960, 560, 1.0], [E.fleet2, 900, 570, 1.12, -.02], [E.end_ding + 1.0, 900, 570, 1.12, -.02]]);
function S7(t) {
  const fleetIn = eOut(P(t, E.cta_threat, E.cta_threat + 1.3));
  deckBG({ sky: ['#ff8a5c', '#ffd9a0'], sea: ['#d4676a', '#4b2c5e'], sun: [1000, 590, 130, '#ffb347'], clouds: [[300, 150, 1.4], [1500, 220, 1.2], [800, 330, 1.0]], cloudCol: 'rgba(255,200,170,.75)',
    mid: () => { if (t > E.cta_threat - .1) [0, 1, 2, 3].forEach(i => romanShip(lerp(-460, 120 + i * 300, fleetIn), 655 + (i % 2) * 36, .3 + (i % 2) * .03, t, i)); } });
  const cl = lip('b14', t), c = { kind: 'caesar', x: 520, y: GY, s: 1.35, dir: 1, ...cl, ph: 1, expr: 'smug', look: 1, pose: { ra: [1.4 + Math.sin(t * 7) * .06 * (cl.mouth > .2 ? 1 : 0), .1], la: [.35, .4], tilt: -.06 + (t >= E.cta_threat ? .08 : 0), lean: t >= E.cta_threat ? .05 : 0 } };
  figure(c);
  bubble("Follow and subscribe, or I'll come back with a fleet.", 600, 250, c.hx + 10, c.hy - 80, beat('b14').start, beat('b14').end + .05, { size: 50, maxW: 560 });
  hud(() => {
    const t1 = E.cut6 + .25, t2 = E.subscribe - .05;
    const L = PORTRAIT ? { bx: 540, fy: 610, sy: 770, sx: 500, bellx: 790, cf: [620, 625], cs: [580, 785], c0: [930, 1150], c1: [1010, 1250], rx: 790, ry: 1010 }
                       : { bx: 1400, fy: 330, sy: 500, sx: 1360, bellx: 1640, cf: [1480, 345], cs: [1440, 515], c0: [1750, 800], c1: [1800, 860], rx: 1380, ry: 650 };
    uiButton(L.bx, L.fy, '+ FOLLOW', 'FOLLOWING ✓', '#2f6fcf', t1, E.follow_click, true);
    uiButton(L.sx, L.sy, 'SUBSCRIBE', 'SUBSCRIBED ✓', '#e5283f', t2, E.sub_click, false);
    if (t >= t2) { const ring = t >= E.sub_click ? Math.sin((t - E.sub_click) * 22) * .4 * Math.exp(-(t - E.sub_click) * 1.1) : 0; const k = eBack(P(t, t2 + .1, t2 + .4)); bellShape(L.bellx, L.sy, 1.1 * k, ring); if (t >= E.sub_click) sparkles(L.bellx, L.sy - 20, 90, 8, E.sub_click + .1, .9); }
    if (t >= t1 + .1) {
      const a = eIO(P(t, t1 + .1, E.follow_click - .05)), b = eIO(P(t, E.follow_click + .1, E.sub_click - .05)), out = eIO(P(t, E.sub_click + .5, E.sub_click + 1.3));
      let x = lerp(L.c0[0], L.cf[0], a), y = lerp(L.c0[1], L.cf[1], a); x = lerp(x, L.cs[0], b); y = lerp(y, L.cs[1], b); x = lerp(x, L.c1[0], out); y = lerp(y, L.c1[1], out);
      cursorArrow(x, y, (t >= E.follow_click - .06 && t < E.follow_click + .1) || (t >= E.sub_click - .06 && t < E.sub_click + .1) ? 1 : 0);
      [E.follow_click, E.sub_click].forEach(tc => { const p = P(t, tc, tc + .4); const c = tc === E.follow_click ? L.cf : L.cs; if (p > 0 && p < 1) circ(c[0], c[1], 20 + p * 70, null, 6 * (1 - p), '#fff'); });
    }
    if (t >= E.sub_click + .7) text('Resistance is futile.', L.rx, L.ry, { size: PORTRAIT ? 58 : 62, color: '#fff', stroke: '#7b2d12', sw: 14, rot: -.03, sc: eBack(P(t, E.sub_click + .7, E.sub_click + 1.0)) });
    if (t >= E.end_ding - .05) { const k = eBack(P(t, E.end_ding - .05, E.end_ding + .3)); coinRain(E.end_ding, 1.4, 50); text('THE END', CW / 2, PORTRAIT ? 250 : 150, { font: 'roman', size: PORTRAIT ? 130 : 150, weight: '900', color: '#f1c453', stroke: INK, sw: 22, sc: k, rot: -.02 }); }
    text("Based on Plutarch's Life of Caesar and Suetonius. Details dramatized for comedy.", CW / 2, PORTRAIT ? 1560 : 1042, { size: PORTRAIT ? 25 : 28, color: '#fff', stroke: '#4b2c5e', sw: 8, alpha: .9 });
  });
}

// =========================================================================== frame composer
// portrait framing: shift the camera centre per scene (x) and for the subscribe scene (y) so the cast sits in the middle band
const PSHIFT = [() => 0, () => 0, () => 0, () => 0, () => 150, t => -160 * P(t, E.moral - .25, E.moral + .1), () => -297], PSHIFTY = [0, 0, 0, 0, 0, 0, -190];
const SCENES = [S1, S2, S3, S4, S5, S6, S7], CAMS = [camS1, camS2, camS3, camS4, camS5, camS6, camS7], SWAY = [false, true, true, true, false, false, true];
function drawFrame(f) {
  NOW = f / FPS; BF = Math.floor(NOW * 12); JC = 0;
  const cuts = [E.cut1, E.cut2, E.cut3, E.cut4, E.cut5, E.cut6], hw = .22;
  let idx = 0; cuts.forEach(c => { if (NOW >= c) idx++; });
  let tr = -1, trIdx = 0; cuts.forEach((c, i) => { if (NOW >= c - hw && NOW < c + hw) { tr = (NOW - (c - hw)) / (2 * hw); trIdx = i; } });
  const drawScene = (i, dx) => {
    SCR_DX = dx; const cam = CAMS[i](NOW), sh = shakeOff(NOW);
    let cx = cam.x, cy = cam.y, sc = cam.z;
    if (PORTRAIT) { const zp = 1 + (cam.rz - 1) * .55; sc = .98 * zp * 1.03; const vw = CW / sc; cx = clamp(cam.rx + PSHIFT[i](NOW), vw / 2, W - vw / 2); cy = cam.ry + 60 / sc + PSHIFTY[i]; }
    ctx.save(); ctx.translate(dx, 0); ctx.beginPath(); ctx.rect(0, 0, CW, CH); ctx.clip();
    ctx.translate(CW / 2, CH / 2); ctx.rotate(cam.r + (SWAY[i] ? Math.sin(NOW * 1.1 + i) * .005 : 0)); ctx.scale(sc, sc); ctx.translate(-cx + sh.x, -cy + sh.y);
    JC = i * 5000; SCENES[i](NOW); ctx.restore(); SCR_DX = 0;
  };
  ctx.clearRect(0, 0, CW, CH);
  if (tr >= 0) { const e = eIO(tr); drawScene(trIdx, -CW * e); drawScene(trIdx + 1, CW * (1 - e)); const sx = CW * (1 - e); ln(sx, 0, sx, CH, 10); }
  else drawScene(idx, 0);
  captions(NOW); vignette();
}
function init(tl) { TL = tl; E = tl.events; makeTextures();
  SHAKES = [[E.cannon, 16, .5], [E.cannon + .5, 12, .4], [E.grab, 10, .35], [E.price50, 14, .4], [E.jawdrop, 10, .3], [E.clang, 18, .45], [E.barbarians, 16, .7], [E.barbarians + .5, 10, .4], [E.caught, 14, .7], [E.serious, 10, .5], [E.sub_click, 5, .25]]; }
