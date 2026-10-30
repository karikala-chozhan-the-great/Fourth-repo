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
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .5, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,30,50,.28)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
const lerpC = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`; };

// ------------------------------------------------------------------ environment
function sky(y1, c1, c2) { const g = ctx.createLinearGradient(0, 0, 0, y1); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, y1); }
function sunDisk(x, y, r, col = '#fff3a0') {
  const g = ctx.createRadialGradient(x, y, r * .4, x, y, r * 4); g.addColorStop(0, 'rgba(255,240,170,.75)'); g.addColorStop(1, 'rgba(255,240,170,0)'); ctx.fillStyle = g; ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  circ(x, y, r, col, 0);
}
function cloud(x, y, s = 1, col = '#fff') {
  const parts = [[0, 0, 46], [-52, 12, 36], [50, 10, 40], [-22, -26, 36], [24, -24, 34]];
  parts.forEach(([dx, dy, r]) => circ(x + dx * s, y + dy * s, r * s, col, 0));
}
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
  ctx.fillStyle = '#b98450'; ctx.fillRect(0, y0, W, H - y0);
  const g = ctx.createLinearGradient(0, y0, 0, H); g.addColorStop(0, 'rgba(255,230,170,.18)'); g.addColorStop(1, 'rgba(60,30,10,.28)'); ctx.fillStyle = g; ctx.fillRect(0, y0, W, H - y0);
  for (let i = 0; i < 7; i++) { const y = y0 + i * 40; ln(0, y, W, y, 3, 'rgba(60,35,15,.55)'); for (let x = (i % 2) * 110 + 30; x < W; x += 230) ln(x, y, x, y + 40, 2.5, 'rgba(60,35,15,.42)'); }
}
function rail(y) {
  for (let x = 40; x < W; x += 260) rrect(x - 16, y - 80, 32, 84, 6, '#8a5a34', 5);
  rrect(-20, y - 18, W + 40, 34, 8, '#a0683a', 6); ln(0, y - 6, W, y - 6, 3, 'rgba(255,230,170,.4)');
}
function deckBG(o) {
  const t = NOW; sky(640, o.sky[0], o.sky[1]);
  if (o.sun) sunDisk(...o.sun);
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
function tag(title, sub, x, y, t0, t1, o = {}) {
  if (NOW < t0 || NOW > t1 + .25) return;
  const sc = Math.min(eBack(P(NOW, t0, t0 + .25)), 1 - P(NOW, t1, t1 + .2)); if (sc <= 0) return;
  const subs = Array.isArray(sub) ? sub : [sub];
  ctx.save(); ctx.font = `54px ${FONT.title}`; const w1 = ctx.measureText(title).width; ctx.font = `31px ${FONT.hand}`; const w2 = Math.max(...subs.map(s => ctx.measureText(s).width)); ctx.restore();
  const w = Math.max(w1, w2) + 56, h = 90 + subs.length * 36;
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
function shout(txt, x, y, t0, t1, o = {}) {
  if (NOW < t0 || NOW > t1) return; const k = eBack(P(NOW, t0, t0 + .15)) * (1 - P(NOW, t1 - .12, t1));
  text(txt, x, y, { font: o.font || 'head', size: o.size || 100, color: o.color || '#ffd23f', stroke: o.stroke || INK, sw: o.sw || 18, sc: k, rot: o.rot ?? -.08, weight: o.weight || '' });
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
      const next = b.segs[i + 1]; const t0 = a - .05, t1 = next ? next[1] - .05 : c + .3;
      if (t < t0 || t >= t1) return;
      const k = eBack(P(t, t0, t0 + .15)), size = 50, font = `bold ${size}px ${FONT.cap}`;
      const lines = wrap(s, 1500, font); ctx.font = font; const wd = Math.max(...lines.map(l => ctx.measureText(l).width)) + 80, hh = lines.length * 58 + 28;
      ctx.save(); ctx.translate(W / 2, 995 - (lines.length - 1) * 26); ctx.scale(k, k);
      rrect(-wd / 2 + 6, -hh / 2 + 8, wd, hh, 12, 'rgba(20,20,30,.28)', 0);
      ctx.save(); ctx.beginPath(); ctx.roundRect(-wd / 2, -hh / 2, wd, hh, 12); ctx.clip(); ctx.drawImage(PARCH, -wd / 2, -hh / 2, wd, hh); ctx.restore();
      rrect(-wd / 2, -hh / 2, wd, hh, 12, null, 5, '#5b3a1e');
      lines.forEach((l, j) => text(l, 0, -hh / 2 + 14 + 29 + j * 58, { font: 'cap', size, color: '#3b2a1a' })); ctx.restore();
    });
  });
}

// =========================================================================== SCENES
// ---- S1: title, Caesar sails to Rhodes, pirates ambush
function S1(t) {
  sky(560, '#74cff3', '#fff0cf'); sunDisk(1560, 200, 70);
  [[260, 170, 1.4], [980, 110, 1.1], [1500, 330, 1.0]].forEach(([x, y, s]) => cloud(((x + t * 10) % (W + 300)) - 150, y, s, 'rgba(255,255,255,.9)'));
  [[400, 330], [1200, 250], [1700, 370]].forEach(([x, y], i) => gull(x + Math.sin(t * .6 + i) * 60, y + Math.sin(t * 1.4 + i) * 12, t + i));
  // Rhodes on the horizon
  ctx.beginPath(); ctx.ellipse(1740, 568, 210, 62, 0, Math.PI, 0); fl('#9bd37a'); stk(5); ln(1700, 520, 1700, 470, 6, '#7b5a3a'); [-1, 1, 0].forEach(d => ln(1700, 470, 1700 + d * 40, 480 + Math.abs(d) * 8, 7, '#3f9f4f'));
  text('RHODES', 1790, 500, { font: 'title', size: 46, color: '#6b1d12', rot: -.04 });
  sea(560, H, t, '#37b6d6', '#0f5a85', 9);
  // Roman ship sails in
  const sx = lerp(-420, 650, eOut(P(t, 2.6, 6.0))) + (t > E.cannon ? Math.sin((t - E.cannon) * 30) * 5 * Math.max(0, 1 - (t - E.cannon) * 2) : 0);
  if (t > 2.4) {
    ctx.save(); ctx.translate(0, 0);
    romanShip(sx, 760, .95, t);
    ctx.save(); ctx.translate(sx, 760 + Math.sin(t * 1.6) * 7 * .95); ctx.rotate(Math.sin(t * 1.3) * .022); ctx.scale(.95, .95);
    const surprised = t > E.pirates + .3;
    const c = { kind: 'caesar', x: -215, y: -100, s: .82, dir: 1, expr: surprised ? 'surprised' : 'smug', look: 1, pose: surprised ? { la: [2.5, -.4], ra: [2.6, -.4] } : { ra: [.9, 1.0], la: [.7, .9] },
      onHandB: () => { if (!surprised) { ctx.save(); ctx.rotate(.1); rrect(-6, -26, 56, 38, 5, '#f6e7bd', 3); ln(2, -14, 42, -14, 2, '#5b3a1e'); ln(2, -4, 42, -4, 2, '#5b3a1e'); ctx.restore(); } } };
    figure(c); ctx.restore(); ctx.restore();
  }
  tag('JULIUS CAESAR', ['Age 25. Studying public', 'speaking. Future dictator.'], 640, 262, E.ship_in + .3, E.pirates + .1, { rot: -.03 });
  // pirate ship barrels in from the right
  if (t > E.pirates - .3) {
    const px = lerp(2500, 1420, eOut(P(t, E.pirates - .3, E.pirates + .5)));
    pirateShip(px, 770, 1.0, t, 1);
    const sh = t > E.cannon, fp = P(t, E.cannon, E.cannon + .5);
    if (sh && fp < 1) { cannonball(lerp(px - 280, sx + 200, fp), lerp(620, 640, fp) - Math.sin(fp * 3.14) * 170); }
    if (sh) { smoke(px - 300, 650, E.cannon); burst(px - 290, 650, 20, 90, E.cannon, .35, '#ffb52e'); }
    if (t > E.cannon + .5 && t < E.cannon + 1.1) { const p = P(t, E.cannon + .5, E.cannon + 1.1); for (let i = 0; i < 8; i++) { const a = -1.2 - i * .12 + (i % 2) * .5; ln(sx + 240 + Math.cos(a) * 80 * p * 2, 800 + Math.sin(a) * 140 * p - 20 * p * p, sx + 240 + Math.cos(a) * 80 * p * 2, 808 + Math.sin(a) * 140 * p, 6, '#fff'); } }
    // grappling hooks fly across
    if (t > E.grab - .15) { const g = eOut(P(t, E.grab - .15, E.grab + .35)); [0, 1].forEach(i => { const x1 = px - 250 + i * 40, y1 = 560 + i * 40, x2 = lerp(x1, sx + 300 - i * 40, g), y2 = lerp(y1, 600 + i * 20, g); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo((x1 + x2) / 2, Math.max(y1, y2) + 80 * (1 - g), x2, y2); stk(6, '#c9a06a'); circ(x2, y2, 9, '#444', 3); }); }
    shout('AMBUSH!', 980, 300, E.grab - .1, 7.5, { size: 150, color: '#ff4d3a', rot: -.07 });
  }
  jollyRoger(1660, 360, .0, t);
  // title card, then shrink to banner
  const slam = eBack(P(t, .1, .45)), shrink = eIO(P(t, 2.2, 3.0));
  if (t >= .1) {
    const sc = lerp(1.0, .52, shrink) * lerp(1.7, 1, slam), y1 = lerp(420, 62, shrink), y2 = lerp(590, 148, shrink), a = 1 - P(t, E.grab, E.grab + .4) * 0 - P(t, 5.0, 5.4) * 0;
    ctx.save(); ctx.globalAlpha = 1 - P(t, E.pirates - .4, E.pirates);
    if (shrink < 1) { ctx.fillStyle = `rgba(10,40,70,${.35 * (1 - shrink)})`; ctx.fillRect(0, 0, W, H); }
    text('JULIUS CAESAR', W / 2, y1, { font: 'roman', size: 130, weight: '900', color: '#f1c453', stroke: INK, sw: 22, sc, rot: -.01 + (t < .5 ? Math.sin(t * 90) * .01 : 0) });
    text('vs. THE PIRATES', W / 2, y2, { font: 'title', size: 170, color: '#e5483f', stroke: INK, sw: 20, sc, rot: -.01 });
    if (t > 1.0 && t < 2.3) text('(he demanded a higher ransom)', W / 2, 740, { size: 64, color: '#fff', stroke: INK, sw: 10, alpha: P(t, 1.0, 1.4) });
    ctx.restore();
  }
}

// ---- S2: ransom negotiation on the pirate ship
function S2(t) {
  deckBG({ sky: ['#6fcdf2', '#fff2d2'], sea: ['#35b3d1', '#14688f'], sun: [1500, 240, 64], gulls: [[300, 200], [900, 140]] });
  barrel(130, GY + 20, 120, 150); barrel(1810, GY + 10, 110, 140);
  // ransom board (hangs from the top)
  const drop = eElastic(P(t, E.ransom20, E.ransom20 + .8)), by = lerp(-300, 290, drop);
  const flip = P(t, E.chart, E.chart + .35), face = flip < .5 ? 0 : 1, sx = Math.abs(Math.cos(flip * Math.PI));
  if (t >= E.ransom20) {
    ctx.save(); ctx.translate(960, by); ctx.rotate(Math.sin(t * 2) * .015); ln(-210, -330, -210, -130, 5, '#c9a06a'); ln(210, -330, 210, -130, 5, '#c9a06a');
    ctx.scale(face ? sx : (flip > 0 ? sx : 1), 1); parch(0, 0, 580, 330);
    if (!face) {
      text('RANSOM DEMAND', 0, -112, { font: 'title', size: 54, color: '#6b1d12' });
      const x20 = P(t, E.cross20, E.cross20 + .15), s50 = eBack(P(t, E.price50, E.price50 + .25));
      text('20', -150, -10, { font: 'title', size: 150, color: '#3b2a1a' }); text('TALENTS', 0, 96, { font: 'title', size: 56, color: '#3b2a1a' });
      if (t < E.price50) coin(-240, 96, 26, t * 6);
      if (x20 > 0) { ln(-215, -75, -215 + 130 * x20, -75 + 130 * x20, 18, '#e5483f'); ln(-85, -75, -85 - 130 * x20, -75 + 130 * x20, 18, '#e5483f'); }
      if (s50 > 0) { ctx.save(); ctx.translate(120, -5); ctx.rotate(-.08); ctx.scale(s50, s50); text('50!', 0, 0, { font: 'title', size: 190, color: '#d6a100', stroke: '#fff', sw: 18 }); ctx.restore(); }
    } else {
      text('CAESAR\'S NEGOTIATING STYLE', 0, -130, { font: 'title', size: 40, color: '#6b1d12' });
      ln(-230, 100, -230, -90, 6, '#3b2a1a'); ln(-230, 100, 240, 100, 6, '#3b2a1a');
      const pr = P(t, E.chart + .3, E.chart + 2.2); ctx.beginPath(); for (let i = 0; i <= 60 * pr; i++) { const f = i / 60, x = -230 + f * 450, y = 100 - Math.pow(f, 1.7) * 180; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } stk(11, '#2e9c4f');
      if (pr > 0.02) { const f = pr, x = -230 + f * 450, y = 100 - Math.pow(f, 1.7) * 180; poly([[x + 6, y - 14], [x + 24, y + 14], [x - 16, y + 14]], '#2e9c4f', 3); }
      text('ASKING PRICE', -225, 128, { size: 30, color: '#3b2a1a', align: 'left' }); text('(his own!)', 150, 128, { size: 30, color: '#3b2a1a' });
      shout('UPWARDS!', 40, -20, E.upwards - .05, E.upwards + 1.3, { font: 'title', size: 110, color: '#2e9c4f', rot: -.1, sw: 16, stroke: '#fff' });
    }
    ctx.restore();
  }
  if (t > E.price50 && t < E.price50 + 1.8) coinRain(E.price50, .8, 36);
  // characters
  const cm = mouthOf('b3', t), pm = Math.max(mouthOf('b2', t), mouthOf('b3b', t));
  const jaw = t >= E.jawdrop && t < beat('b3b').start;
  const caesar = { kind: 'caesar', x: 560, y: GY, s: 1.2, dir: 1, mouth: cm, tied: true, ph: 1, expr: 'smug', look: 1,
    pose: { la: [.5, .6], ra: [.45, .75], tilt: cm > .3 ? -.07 : 0 } };
  const capt = { kind: 'captain', x: 1370, y: GY, s: 1.2, dir: -1, mouth: jaw ? .95 : pm, ph: 4, expr: (t >= E.jawdrop && t < E.capt_caves + 1) ? 'surprised' : (t > E.capt_caves + 1 ? 'worried' : 'neutral'), look: -1, sweat: t > E.capt_caves + .5 && t < E.chart + 1,
    pose: { la: gesture(pm, [.9, .6], .5), ra: t > E.jawdrop ? [2.4, -.3] : [.3, .5], lean: jaw ? -.12 * eBack(P(t, E.jawdrop, E.jawdrop + .2)) : 0, crouch: jaw ? 0 : 0 }, hop: jaw ? Math.max(0, Math.sin(P(t, E.jawdrop, E.jawdrop + .25) * 3.14)) * 30 : 0 };
  figure(caesar); figure(capt);
  bubble('Arr! We want twenty talents of silver!', 1480, 200, capt.hx - 30, capt.hy - 70, beat('b2').start, beat('b2').end + .1, { size: 46, maxW: 470 });
  bubble('Twenty? Do you know who I am? Make it fifty.', 440, 200, caesar.hx + 20, caesar.hy - 70, beat('b3').start, beat('b3').end + .1, { size: 46, maxW: 440 });
  bubble('F-fifty? ... Fine. Fifty it is.', 1490, 200, capt.hx - 30, capt.hy - 70, beat('b3b').start, beat('b3b').end + .1, { size: 46, maxW: 440 });
  tag('PIRATE CAPTAIN', ['Hobbies: kidnapping.', 'Weakness: maths.'], 1660, 600, 7.55, 9.3, { rot: .03 });
  tag('JULIUS CAESAR', ['Hostage. Does not', 'act like one.'], 300, 600, 9.7, 12.2, { rot: -.03 });
  if (t > E.jawdrop && t < E.jawdrop + .6) burst(capt.hx, capt.hy, 70, 150, E.jawdrop, .45, '#ffd23f');
}

// ---- S3: bossiest hostage ever
function S3(t) {
  deckBG({ sky: ['#ffc77d', '#ffeacb'], sea: ['#3fa7b8', '#1e6f8f'], sun: [400, 300, 70, '#fff0b0'], clouds: [[900, 130, 1.3], [1500, 220, 1.0]], cloudCol: 'rgba(255,236,210,.9)' });
  // friends' boat sets off to raise silver
  const bx = lerp(1000, 1780, eIO(P(t, 18.5, 27))), by = 700;
  dinghy(bx, by, t, .5); ln(bx - 10, by - 30, bx - 10, by - 100, 5, INK); poly([[bx - 10, by - 100], [bx + 50, by - 40], [bx - 10, by - 34]], '#fff', 4);
  figure({ kind: 'plain', x: bx + 20, y: by - 20, s: .3, dir: 1, ph: 2, expr: 'happy', pose: { la: [2.3 + Math.sin(t * 5) * .3, -.2] } });
  if (t > 19.4 && t < 22.4) { const k = Math.min(eBack(P(t, 19.4, 19.7)), 1 - P(t, 22.2, 22.5)); text('friends fetching the silver', bx - 40, by - 150, { size: 38, color: '#fff', stroke: '#14688f', sw: 10, sc: k }); }
  // day counter (calendar page)
  const day = Math.floor(1 + 37 * eIO(P(t, E.days + .1, E.days + 1.7)));
  if (t >= E.days) { const k = eBack(P(t, E.days, E.days + .3)); ctx.save(); ctx.translate(250, 250); ctx.scale(k, k); ctx.rotate(-.05); rrect(-130, -130, 260, 260, 12, '#fff', 6); rrect(-130, -130, 260, 62, 12, '#d2382f', 6); text('DAY', 0, -98, { font: 'head', size: 56, color: '#fff' }); text(String(day), 0, 18, { font: 'head', size: 160, color: INK }); if (day >= 38) text('(and counting)', 0, 98, { size: 30, color: '#6b5a44' }); ctx.restore(); }
  // mat + Caesar lying down
  const hm = mouthOf('b6', t), awake = t > E.nap + .15 && t < beat('b6').end + .05, glare = t > E.clang;
  ctx.save(); rrect(600, GY - 110, 820, 70, 30, '#c0392b', 6); ln(625, GY - 94, 1395, GY - 94, 4, '#f1c453'); ell(1330, GY - 124, 100, 32, '#fff3d6', 5); ctx.restore();
  ctx.save(); ctx.translate(930, GY - 112); ctx.rotate(1.52); const cs = 1.22;
  figure({ kind: 'caesar', x: 0, y: 134 * cs + 6, s: cs, dir: 1, mouth: hm, tied: false, ph: 3, blink: awake && !glare ? false : (glare ? false : true), expr: glare ? 'surprised' : (awake ? 'smug' : 'neutral'),
    pose: { la: [2.7, -1.2], ra: [-.2, .2], bob: 0, tilt: -.1 } }); ctx.restore();
  if (!awake && !glare) zzz(1250, GY - 230, E.days + 1.2);
  // servants
  const run = t > E.tiptoe, tp = P(t, E.tiptoe, 27.4);
  const bx2 = run ? lerp(1450, 1980, tp) : 1450, sx2 = run ? lerp(1710, 2200, tp) : 1710, cx2 = run ? lerp(470, -260, tp) : 470;
  const leaf = (rot) => () => { ctx.save(); ctx.rotate(rot); ln(0, 0, -20, -120, 6, '#5b3a22'); ell(-34, -160, 30, 92, '#58b368', 5, INK, -.25); ln(-30, -80, -44, -230, 3, '#2e7a3f'); ctx.restore(); };
  const bald = { kind: 'bald', x: bx2, y: GY, s: 1.15, dir: -1, ph: 5, expr: t > E.clang ? 'worried' : 'happy', mouth: 0, pose: run ? { walk: t * 4.2, la: [2.8, -2.0], ra: [.2, .3], bob: Math.abs(Math.sin(t * 4.2)) * 8 } : { ra: [1.6 + Math.sin(t * 5) * .1, .5], la: [.3, .3] }, onHandB: run ? undefined : leaf(Math.sin(t * 5) * .5) };
  const skin = { kind: 'skinny', x: sx2, y: GY, s: 1.15, dir: -1, ph: 6, expr: t > E.clang ? 'surprised' : 'happy', pose: run ? { walk: t * 4.2 + 1, la: [2.8, -2.0], ra: [.2, .3], bob: Math.abs(Math.sin(t * 4.2 + 1)) * 8 } : { ra: [1.3, .9], la: [.4, .4] },
    onHandB: run ? undefined : () => { ctx.save(); rrect(-34, -4, 80, 14, 6, '#8a5a34', 4); [0, 1, 2, 3].forEach(i => circ(-18 + i * 17, -14 - (i % 2) * 5, 10, '#8c4bd0', 3)); ctx.restore(); } };
  const capt = { kind: 'captain', x: cx2, y: GY, s: 1.2, dir: 1, ph: 7, expr: t > E.clang ? 'surprised' : 'neutral', pose: run ? { walk: t * 4.2 + 2, la: [-2.8, 2.0], ra: [.2, .3], bob: Math.abs(Math.sin(t * 4.2 + 2)) * 8 } : { ra: [1.0, 1.4], la: [.2, .3] },
    onHandB: run ? undefined : () => { ctx.save(); ctx.rotate(-.2); ln(0, 0, 24, -120, 7, '#cfd3da'); rrect(-14, -8, 40, 12, 3, '#6b4423', 3); ctx.restore(); } };
  figure(bald); figure(skin); figure(capt);
  if (t > E.hostage && t < E.hostage + 2.2) { const k = eBack(P(t, E.hostage, E.hostage + .18)); ctx.save(); ctx.translate(960, 240); ctx.rotate(-.1); ctx.scale(k, k); rrect(-390, -64, 780, 128, 8, 'rgba(255,255,255,.7)', 10, '#d2382f'); text('BOSSIEST HOSTAGE EVER', 0, 4, { font: 'title', size: 92, color: '#d2382f' }); ctx.restore(); }
  bubble("Quiet, please. I'm napping.", 1230, 440, 1230, GY - 250, beat('b6').start, beat('b6').end + .1, { size: 54, maxW: 420 });
  if (t > E.clang - .02 && t < E.clang + 1.4) { shout('CLANG!', 1500, 520, E.clang - .02, E.clang + .9, { size: 120, color: '#ffd23f', rot: .1 }); const p = P(t, E.clang - .3, E.clang); ctx.save(); ctx.translate(1540, 640 + (1 - p) * -240); ctx.rotate(t * 5); circ(0, 0, 36, '#6e7480', 6); rrect(-30, -10, 60, 18, 4, '#4a4f5c', 4); ctx.restore(); }
  if (t > E.tiptoe && t < 27.2) text('shhh...', 1300, 560, { size: 56, color: '#fff', stroke: '#8a5a34', sw: 10, rot: -.08, alpha: P(t, E.tiptoe, E.tiptoe + .2) });
}

// ---- S4: games, poetry, the joke
function S4(t) {
  deckBG({ sky: ['#ff8a5c', '#ffd9a0'], sea: ['#d4676a', '#4b2c5e'], sun: [1280, 590, 120, '#ffb347'], clouds: [[300, 150, 1.4], [1500, 220, 1.2], [800, 360, 1.0]], cloudCol: 'rgba(255,200,170,.75)' });
  const dice = t < 28.55, onStage = t > 28.6;
  const cx = dice ? lerp(760, 960, P(t, 27.45, 28.55) * 0) + 0 : lerp(800, 960, eOut(P(t, 28.6, 29.0)));
  const stageY = onStage ? GY - 110 * eOut(P(t, 28.6, 28.95)) : GY;
  const pm = mouthOf('b9', t);
  const cs = mouthOf('b8', t) + mouthOf('b7', t) * 0;
  // dice game
  if (dice) { barrel(1000, GY - 10, 150, 150); const r = P(t, 27.7, 28.4); [0, 1].forEach(i => { ctx.save(); ctx.translate(960 + i * 66, GY - 175 - Math.abs(Math.sin(r * 9 + i)) * 60 * (1 - r)); ctx.rotate(r * 12 + i); rrect(-22, -22, 44, 44, 8, '#fff', 4); [[-10, -10], [10, 10], [0, 0]].forEach(([x, y]) => circ(x, y, 4, INK, 0)); ctx.restore(); }); }
  else if (t < 29.4) { const sl = P(t, 28.6, 29.2); barrel(1000 + sl * 1100, GY - 10, 150, 150); }
  if (onStage) crate(960, GY + 6, 230, 112 * eOut(P(t, 28.6, 28.95)));
  const angry = t > E.barbarians && t < 32.2, bored = t >= E.snore && t < E.barbarians;
  const caesar = { kind: 'caesar', x: cx, y: stageY, s: 1.2, dir: dice ? 1 : 1, mouth: cs, ph: 1, expr: angry ? 'surprised' : (t > 36.7 ? 'smug' : 'smug'), look: 0,
    pose: dice ? { la: [1.2, .5], ra: [1.5 + Math.sin(t * 9) * .3, .4], lean: .06 } : (onStage && t < 32.5 ? (angry ? { la: [2.4 + Math.sin(t * 25) * .1, -.5], ra: [2.5, -.5], lean: .08 } : { la: [.4, .5], ra: [1.3, .9] }) : { la: gesture(cs, [.5, .4], .6), ra: [.9, .5] }),
    onHandB: onStage && t < 32.5 && !angry ? () => { ctx.save(); ctx.rotate(.15); rrect(-4, -40, 150, 190 * Math.min(1, P(t, 28.9, 29.6)), 8, '#f6e7bd', 4); text('ODE TO ME', 71, -14, { font: 'title', size: 34, color: '#6b1d12' }); for (let i = 0; i < 5; i++) ln(14, 20 + i * 24, 130, 20 + i * 24, 2.5, '#5b3a1e'); text('(47 verses)', 71, 150, { size: 24, color: '#5b3a1e' }); ctx.restore(); } : undefined };
  const sleepy = t >= E.snore && t < E.barbarians + .2;
  const skin = { kind: 'skinny', x: 340, y: GY, s: 1.15, dir: 1, ph: 3, blink: sleepy ? true : undefined, expr: dice ? 'happy' : (t > E.barbarians && t < 33.2 ? 'surprised' : (t > E.laugh - .1 && t < E.bb ? 'happy' : 'neutral')), mouth: t >= E.laugh && t < E.bb ? .8 : 0,
    pose: dice ? { la: [.3, .4], ra: [1.4, .5], lean: .07 } : { lean: sleepy ? .14 : 0, crouch: t >= E.laugh && t < E.bb ? 36 + Math.sin(t * 22) * 10 : 0, tilt: sleepy ? .25 : 0, la: [.2, .2], ra: [-.1, .2] } };
  const capt = { kind: 'captain', x: 620, y: GY, s: 1.2, dir: 1, ph: 5, blink: sleepy ? true : undefined, expr: (t > E.barbarians && t < 33.2) ? 'surprised' : (t >= E.laugh && t < E.bb ? 'happy' : 'neutral'), mouth: pm,
    pose: dice ? { la: [.3, .4], ra: [1.4, .5], lean: .07 } : { lean: sleepy ? .1 : (t >= E.laugh && t < E.bb ? .15 : 0), crouch: t >= E.laugh && t < E.bb ? 30 + Math.sin(t * 20) * 12 : 0, tilt: sleepy ? .2 : 0, la: [.25, .3], ra: t >= E.laugh && t < E.bb ? [2.1 + Math.sin(t * 20) * .3, 0] : [-.1, .2] } };
  const bald = { kind: 'bald', x: 1450, y: GY, s: 1.15, dir: -1, ph: 7, blink: sleepy ? true : undefined, expr: dice ? 'happy' : (t > E.barbarians && t < 33.2 ? 'surprised' : (t >= E.laugh && t < E.bb ? 'happy' : 'neutral')), mouth: t >= E.laugh && t < E.bb ? .8 : 0,
    pose: dice ? { la: [.3, .4], ra: [1.4, .5], lean: .07 } : { lean: sleepy ? .12 : (t >= E.laugh && t < E.bb ? .18 : 0), crouch: t >= E.laugh && t < E.bb ? 34 + Math.sin(t * 21 + 1) * 12 : 0, tilt: sleepy ? -.25 : 0, la: [.2, .2], ra: [-.1, .2] } };
  if (dice) { skin.x = 780; capt.x = 1180; capt.dir = -1; bald.x = 1330; caesar.x = 760; }
  if (bored) { bald.pose.crouch = 0; }
  const ay = (o) => { if (sleepy) { const k = Math.sin(t * 2 + o.ph) * 4; o.pose.bob = k; } };
  [skin, capt, bald].forEach(ay);
  figure(skin); figure(capt); figure(bald); figure(caesar);
  // game-time banner
  if (dice) shout('GAME NIGHT!', 960, 380, 27.55, 28.55, { size: 110, color: '#ffd23f', rot: -.04 });
  if (onStage && t < E.snore) for (let i = 0; i < 4; i++) { const p = ((t - 28.7) * .6 + i / 4) % 1; text(['♪', '♫', '♪', '♬'][i], 760 + i * 130 + Math.sin(p * 6) * 30, 640 - p * 280, { size: 64, color: '#fff', stroke: '#8a3a2a', sw: 10, alpha: Math.sin(p * 3.14) }); }
  if (t >= E.snore && t < E.barbarians + .1) { zzz(340, GY - 380, E.snore); zzz(1450, GY - 380, E.snore + .3); zzz(620, GY - 400, E.snore + .6); }
  shout('ILLITERATE BARBARIANS!', 960, 250, E.barbarians - .05, E.barbarians + 1.9, { font: 'title', size: 124, color: '#fff', stroke: '#c0392b', sw: 22, rot: -.03 });
  if (t > E.barbarians && t < E.barbarians + 1.5) { for (let i = 0; i < 6; i++) { const a = -2.6 + i * .5; ln(caesar.hx + Math.cos(a) * 90, caesar.hy + Math.sin(a) * 90, caesar.hx + Math.cos(a) * 130, caesar.hy + Math.sin(a) * 130, 6, '#e5483f'); } }
  // the to-do list while Caesar delivers the threat
  if (t >= beat('b8').start - .1 && t < E.bb + .2) {
    const k = eBack(P(t, beat('b8').start - .1, beat('b8').start + .25)) * (1 - P(t, E.bb - .2, E.bb + .15)); ctx.save(); ctx.translate(1560, 262); ctx.rotate(.04); ctx.scale(k, k);
    parch(0, 0, 560, 340); text("CAESAR'S TO-DO LIST", 0, -130, { font: 'title', size: 46, color: '#6b1d12' });
    const items = ['Get ransomed', 'Raise a fleet', 'Sail back', 'Crucify pirates'], b8 = beat('b8').start;
    items.forEach((s, i) => { const p = P(t, b8 + .3 + i * .7, b8 + .6 + i * .7); ctx.save(); ctx.globalAlpha = p; scribbleBox(s, -170, -62 + i * 56, 0); ctx.restore(); });
    ctx.restore();
  }
  bubble("Once I'm free, I'll come back and have you all crucified.", 560, 250, caesar.hx - 10, caesar.hy - 70, beat('b8').start, beat('b8').end + .1, { size: 46, maxW: 500 });
  bubble("Ha ha ha! Oh, he's a funny one!", 460, 280, capt.hx, capt.hy - 70, beat('b9').start, beat('b9').end + .1, { size: 50, maxW: 480 });
  if (t >= E.laugh && t < E.bb) { shout('HA HA HA!', 960, 520, E.laugh, E.laugh + .7, { size: 90, color: '#fff', stroke: '#8a3a2a', sw: 16, rot: .05 }); [capt, skin, bald].forEach((o, i) => { for (let k = 0; k < 2; k++) { const p = ((t * 3 + i * .3 + k * .5) % 1); ctx.beginPath(); ctx.moveTo(o.hx + (k ? 36 : -36), o.hy + 10 + p * 50); ctx.quadraticCurveTo(o.hx + (k ? 45 : -45), o.hy + 24 + p * 50, o.hx + (k ? 36 : -36), o.hy + 32 + p * 50); fl('#7ec8f2'); stk(2.5, '#2b7fb3'); } }); }
  // Blackbeard wanders in, lost
  if (t > E.bb - .5) {
    const bx = lerp(2150, 1700, eOut(P(t, E.bb - .5, E.bb + .4))), walking = P(t, E.bb - .5, E.bb + .4) < 1;
    const bb = { kind: 'blackbeard', x: bx, y: GY, s: 1.15, dir: -1, ph: 9, mouth: mouthOf('b9b', t), expr: t > E.bb + 1.5 ? 'worried' : 'neutral', look: -1, pose: walking ? { walk: t * 8, bob: Math.abs(Math.sin(t * 8)) * 5 } : { la: gesture(mouthOf('b9b', t), [.9, .6], .6), ra: [.3, .3] } };
    figure(bb);
    tag('BLACKBEARD', ['Born 1680. Wrong video.'], 1700, 395, E.bb + .2, beat('b9b').end, { rot: .03, color: '#e2e2ea' });
    bubble("Excuse me, I'm from seventeen eighteen. Why am I here?", 1240, 215, bb.hx - 20, bb.hy - 70, beat('b9b').start, beat('b9b').end + .1, { size: 44, maxW: 500 });
  }
}

// ---- S5: ransom paid, fleet raised, pirates caught
function S5(t) {
  sky(560, '#74cff3', '#fff0cf'); sunDisk(300, 190, 66);
  [[700, 140, 1.4], [1350, 220, 1.1], [1700, 120, 1.0]].forEach(([x, y, s]) => cloud(((x + t * 9) % (W + 300)) - 150, y, s, 'rgba(255,255,255,.9)'));
  sea(560, H, t, '#37b6d6', '#0f5a85', 9);
  // pirate ship (right) with its crew
  const caught = t >= E.caught, px = 1360;
  pirateShip(px, 800, 1.1, t, 1);
  ctx.save(); ctx.translate(px, 800 + Math.sin(t * 1.5 + 1) * 8 * 1.1); ctx.rotate(Math.sin(t * 1.2 + 1) * .025); ctx.scale(1.1, 1.1);
  const laugh = t < E.paid - .2 ? Math.sin(t * 20) * .5 + .5 : 0;
  const hands = caught ? { la: [2.8 + Math.sin(t * 9) * .1, -.2], ra: [2.8, -.2] } : null;
  const crew = [['captain', -150, 1.0], ['bald', 40, 1.0], ['skinny', 200, 1.0]];
  crew.forEach(([k, dx, sc], i) => figure({ kind: k, x: dx - 60, y: -100, s: .62, dir: -1, ph: i, mouth: t < E.paid - .2 ? laugh : 0, expr: caught ? 'surprised' : (t < E.paid ? 'happy' : 'neutral'), sweat: caught, pose: hands ? { ...hands, crouch: 6 } : { crouch: t < E.paid - .2 ? 12 + Math.sin(t * 20 + i) * 6 : 0, la: [.3, .3], ra: [.2, .3] } }));
  chest(-250 + 90, -100, .9, P(t, E.paid, E.paid + .4) * (t < E.silver ? 1 : 1 - P(t, E.silver, E.silver + .3)), t < E.silver + .3 ? 10 : 0);
  ctx.restore();
  if (t < E.paid - .2) shout('HA HA HA!', 1360, 330, 42.3, 43.6, { size: 80, color: '#fff', stroke: '#8a3a2a', sw: 14, rot: .04 });
  // ransom paid: dinghy with Caesar rows away
  const dx = lerp(900, 330, eIO(P(t, E.paid, E.paid + 2.0))), dinOn = t > E.paid - 1.2 && t < E.fleet + .6;
  if (dinOn) { const dv = lerp(1, 0, P(t, E.fleet, E.fleet + .6)); ctx.save(); ctx.globalAlpha = dv; dinghy(dx, 860, t, 1.1); figure({ kind: 'caesar', x: dx, y: 840, s: .56, dir: -1, ph: 2, expr: 'smug', look: -1, pose: { la: [2.5 + Math.sin(t * 6) * .3, -.3], ra: [.3, .3] }, mouth: 0 }); ctx.restore(); }
  if (t >= E.paid && t < E.fleet - .1) { shout('RANSOM PAID: 50 TALENTS', 760, 300, E.paid, E.fleet - .15, { font: 'title', size: 92, color: '#ffd23f', stroke: INK, sw: 16, rot: -.04 }); sparkles(1100, 650, 180, 12, E.paid, 1.2); }
  // fleet
  if (t >= E.fleet - .2) {
    const adv = P(t, E.back, E.caught), slide = eOut(P(t, E.fleet - .1, E.fleet + 1.0));
    [[0, 690, .62], [1, 780, .7], [2, 880, .78], [3, 970, .6]].forEach(([i, y, s]) => { const x0 = lerp(-560, 150 + i * 190, slide) + adv * 430; romanShip(x0, y, s, t, i); if (i === 1) { ctx.save(); ctx.translate(x0, y + Math.sin(t * 1.6 + i) * 7 * s); ctx.scale(s, s); figure({ kind: 'caesar', x: -60, y: -100, s: .8, dir: 1, ph: 3, expr: 'smug', look: 1, pose: { ra: [2.1, -.2], la: [.2, .3] } }); ctx.restore(); } });
    shout('FLEET SELF-FUNDED!', 960, 190, E.fleet, E.fleet + 1.8, { size: 86, color: '#fff', stroke: '#8a1d12', sw: 16, rot: -.03, font: 'title' });
    if (t >= E.back && t < E.caught) { shout('...AND BACK AGAIN', 960, 420, E.back, E.caught - .1, { size: 80, color: '#ffd23f', rot: .03, font: 'title' }); for (let i = 0; i < 5; i++) ln(200 + adv * 620, 700 + i * 50, 120 + adv * 620 - 60, 700 + i * 50, 5, 'rgba(255,255,255,.5)'); }
  }
  if (caught) { shout('CAUGHT!', 1250, 330, E.caught, E.caught + 1.4, { size: 170, color: '#ff4d3a', rot: -.06 });
    const nt = eOut(P(t, E.caught, E.caught + .5)); ctx.save(); ctx.globalAlpha = .75; for (let i = 0; i < 9; i++) { const x = px - 240 + i * 60; ln(x, 500 + 100 * nt - 150 * (1 - nt), x, 760, 5, '#c9a06a'); } for (let j = 0; j < 4; j++) ln(px - 250, 560 + j * 50 + 100 * nt - 100, px + 250, 560 + j * 50 + 100 * nt - 100, 5, '#c9a06a'); ctx.restore(); }
  // silver flies back with interest
  if (t >= E.silver) { const f = P(t, E.silver, E.silver + 1.3); for (let i = 0; i < 12; i++) { const ff = clamp(f * 1.4 - i * .06); if (ff <= 0 || ff >= 1) continue; const x = lerp(1250, 700, ff), y = lerp(700, 780, ff) - Math.sin(ff * 3.14) * 260; coin(x, y, 16, ff * 14 + i); }
    shout('+ INTEREST!', 940, 560, E.silver + .3, E.silver + 1.9, { font: 'title', size: 100, color: '#ffd23f', stroke: INK, sw: 16, rot: -.05 }); }
  // promise kept: checklist
  if (t >= E.promise - .1) { const k = eBack(P(t, E.promise - .1, E.promise + .3)); ctx.save(); ctx.translate(960, 310); ctx.rotate(-.02); ctx.scale(k, k); parch(0, 0, 640, 300); text('PROMISE: KEPT', 0, -100, { font: 'title', size: 60, color: '#6b1d12' });
    ['Get ransomed', 'Raise a fleet', 'Sail back', 'Crucify pirates'].forEach((s, i) => { const col = i % 2, row = Math.floor(i / 2); scribbleBox(s, -270 + col * 300, -20 + row * 72, P(t, E.promise + .1 + i * .25, E.promise + .3 + i * .25)); }); ctx.restore(); }
}

// ---- S6: the cell and the moral
function S6(t) {
  ctx.fillStyle = '#4a4d59'; ctx.fillRect(0, 0, W, H);
  const r = mb(12); for (let y = 0; y < 900; y += 64) for (let x = (Math.floor(y / 64) % 2) * 80 - 80; x < W; x += 160) { rrect(x + 4, y + 4, 152, 56, 6, lerpC('#585b68', '#42454f', r()), 4, 'rgba(25,26,32,.65)'); }
  ctx.fillStyle = '#34363f'; ctx.fillRect(0, GY - 30, W, H - GY + 30); ln(0, GY - 30, W, GY - 30, 6);
  [[160, 330], [1760, 330]].forEach(([x, y], i) => { const fk = 1 + Math.sin(t * 13 + i * 2) * .08; const g = ctx.createRadialGradient(x, y, 10, x, y, 320 * fk); g.addColorStop(0, 'rgba(255,190,90,.65)'); g.addColorStop(1, 'rgba(255,150,60,0)'); ctx.fillStyle = g; ctx.fillRect(x - 330, y - 330, 660, 660); ln(x, y + 20, x, y + 120, 12, '#6b4423'); ctx.beginPath(); ctx.ellipse(x, y - 10 * fk, 22, 42 * fk, 0, 0, 7); fl('#ffb52e'); stk(4); ctx.beginPath(); ctx.ellipse(x, y, 11, 24 * fk, 0, 0, 7); fl('#fff2a0'); });
  rrect(640, 60, 640, 90, 8, '#2d2f38', 6, '#8a8a92'); text('PERGAMON PRISON · PIRATE WING', 960, 105, { font: 'roman', size: 34, weight: '700', color: '#e8dcc0' });
  // prisoners
  const talk = mouthOf('b12', t), moral = t >= E.moral;
  const capt = { kind: 'captain', x: 1180, y: GY, s: 1.15, dir: -1, ph: 1, mouth: talk, expr: t > E.serious - .1 ? 'surprised' : 'worried', look: -1, sweat: true, pose: { la: [2.2, -.3 + Math.sin(t * 3) * .1], ra: [2.1, -.3] } };
  const bald = { kind: 'bald', x: 1380, y: GY, s: 1.15, dir: -1, ph: 2, expr: 'worried', look: -1, pose: { la: [2.2, -.3], ra: [2.0, -.3 + Math.sin(t * 3 + 1) * .1] } };
  const skin = { kind: 'skinny', x: 1560, y: GY, s: 1.15, dir: -1, ph: 3, expr: 'surprised', look: -1, pose: { la: [2.2, -.3], ra: [2.1, -.3] } };
  const bb = { kind: 'blackbeard', x: 1750, y: GY, s: 1.1, dir: -1, ph: 4, expr: 'worried', look: -1, pose: { la: [.4, .5], ra: [1.6, 1.2] } };
  figure(capt); figure(bald); figure(skin); figure(bb);
  bubble('Is this still 1718?', 1630, 440, bb.hx - 20, bb.hy - 80, E.moral + .5, E.moral + 3.0, { size: 44, maxW: 340 });
  // bars
  for (let x = 980; x <= 1900; x += 74) rrect(x - 8, 250, 16, GY - 220, 6, '#2a2c34', 4, '#15161b');
  rrect(960, 250, 960, 24, 6, '#2a2c34', 4, '#15161b'); rrect(960, GY - 40, 960, 22, 6, '#2a2c34', 4, '#15161b');
  rrect(900, 250, 90, GY - 210, 6, null, 0);
  // Caesar, free, smug, holding the checklist
  const wave = Math.sin(t * 6) * .25;
  const caesar = { kind: 'caesar', x: 480, y: GY, s: 1.25, dir: 1, ph: 5, expr: 'smug', look: 1, pose: { la: [.4, .5], ra: [1.3, .9], tilt: -.05 },
    onHandB: () => { ctx.save(); ctx.rotate(.25); rrect(-4, -70, 150, 110, 5, '#f6e7bd', 4, '#5b3a1e'); [0, 1, 2, 3].forEach(i => { ln(14, -48 + i * 24, 34, -40 + i * 24, 5, '#2e9c4f'); ln(46, -42 + i * 24, 128, -42 + i * 24, 2.5, '#5b3a1e'); }); ctx.restore(); } };
  figure(caesar);
  bubble('Wait... he was serious?!', 1240, 200, capt.hx - 20, capt.hy - 70, beat('b12').start, beat('b12').end + .6, { size: 54, maxW: 420 });
  if (t > E.serious && t < E.serious + 1.3) burst(capt.hx, capt.hy, 60, 140, E.serious, .5, '#ffd23f');
  tag('JULIUS CAESAR', ['Kept his word.', 'Smugly.'], 470, 320, 52.9, 54.2, { rot: -.03 });
  // moral
  if (moral) { const k = eBack(P(t, E.moral, E.moral + .3)); ctx.save(); ctx.translate(W / 2, 255); ctx.scale(k, k); parch(0, 0, 1480, 210, -.005); text('MORAL', 0, -62, { font: 'title', size: 54, color: '#c0392b' }); text('If you kidnap a Roman, never undercharge.', 0, 20, { font: 'title', size: 92, color: '#3b2a1a' }); ctx.restore(); }
  if (t > E.moral + .9) text("Based on Plutarch's Life of Caesar and Suetonius. Details dramatized for comedy.", W / 2, 1040, { size: 28, color: '#e8dcc0', alpha: .9 * P(t, E.moral + .9, E.moral + 1.4) });
}


// ---- S7: Julius asks you to follow and subscribe (or else)
function bellShape(x, y, s, ang) {
  ctx.save(); ctx.translate(x, y - 30 * s); ctx.rotate(ang); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(-34, 38); ctx.quadraticCurveTo(-34, -2, -22, -18); ctx.quadraticCurveTo(0, -42, 22, -18); ctx.quadraticCurveTo(34, -2, 34, 38); ctx.closePath(); fl('#ffd23f'); stk(5);
  ln(-40, 40, 40, 40, 7); circ(0, 52, 9, '#ffd23f', 4); circ(0, -34, 6, '#ffd23f', 4); ctx.restore();
}
function cursorArrow(x, y, press) { ctx.save(); ctx.translate(x, y); ctx.scale(1 - press * .12, 1 - press * .12); poly([[0, 0], [0, 46], [12, 35], [21, 54], [30, 50], [21, 32], [36, 32]], '#fff', 4); ctx.restore(); }
function uiButton(cx, cy, label, doneLabel, col, t0, tClick, icon) {
  if (NOW < t0) return; const k = eBack(P(NOW, t0, t0 + .28)), done = NOW >= tClick, press = NOW >= tClick - .08 && NOW < tClick + .1 ? 1 : 0;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k * (press ? .94 : 1) * (1 + (done ? Math.max(0, .08 * Math.sin(P(NOW, tClick, tClick + .35) * 6.28)) : 0)), k * (press ? .94 : 1));
  rrect(-200 + 6, -55 + 9, 400, 110, 55, 'rgba(10,10,25,.3)', 0);
  rrect(-200, -55, 400, 110, 55, done ? '#dcdce4' : col, 6);
  text(done ? doneLabel : label, icon ? 22 : 0, 4, { font: 'head', size: 60, color: done ? '#4a4a58' : '#fff', spacing: 2 });
  if (icon && !done) { ctx.beginPath(); ctx.arc(-120, 0, 24, 0, 7); stk(5, '#fff'); ln(-120, -13, -120, 13, 6, '#fff'); ln(-133, 0, -107, 0, 6, '#fff'); }
  ctx.restore();
}
function S7(t) {
  const fleetIn = eOut(P(t, E.threat, E.threat + 1.3));
  deckBG({ sky: ['#ff8a5c', '#ffd9a0'], sea: ['#d4676a', '#4b2c5e'], sun: [1000, 590, 130, '#ffb347'], clouds: [[300, 150, 1.4], [1500, 220, 1.2], [800, 330, 1.0]], cloudCol: 'rgba(255,200,170,.75)',
    mid: () => { if (t > E.threat - .1) [0, 1, 2, 3].forEach(i => romanShip(lerp(-460, 120 + i * 300, fleetIn), 655 + (i % 2) * 36, .3 + (i % 2) * .03, t, i)); } });
  const sm = mouthOf('b14', t), talking = t < beat('b14').end + .1;
  const c = { kind: 'caesar', x: 520, y: GY, s: 1.35, dir: 1, mouth: sm, ph: 1, expr: 'smug', look: 1, pose: { ra: [1.4 + Math.sin(t * 7) * .06 * (sm > .2 ? 1 : 0), .1], la: [.35, .4], tilt: -.06 + (t >= E.threat ? .08 : 0), lean: t >= E.threat ? .05 : 0 } };
  figure(c);
  bubble("Follow and subscribe, or I'll come back with a fleet.", 600, 250, c.hx + 10, c.hy - 80, beat('b14').start, beat('b14').end + .05, { size: 50, maxW: 560 });
  // follow / subscribe buttons
  const t1 = E.cut6 + .25, t2 = E.subscribe - .05, bx = 1400;
  uiButton(bx, 330, '+ FOLLOW', 'FOLLOWING ✓', '#2f6fcf', t1, E.follow_click, true);
  uiButton(bx - 40, 500, 'SUBSCRIBE', 'SUBSCRIBED ✓', '#e5283f', t2, E.sub_click, false);
  if (t >= t2) { const ring = t >= E.sub_click ? Math.sin((t - E.sub_click) * 22) * .4 * Math.exp(-(t - E.sub_click) * 1.1) : 0; const k = eBack(P(t, t2 + .1, t2 + .4)); bellShape(bx + 240, 500, 1.1 * k, ring); if (t >= E.sub_click) sparkles(bx + 240, 480, 90, 8, E.sub_click + .1, .9); }
  // cursor: glides to Follow, clicks, glides to Subscribe, clicks
  if (t >= t1 + .1) {
    const a = eIO(P(t, t1 + .1, E.follow_click - .05)), b = eIO(P(t, E.follow_click + .1, E.sub_click - .05)), out = eIO(P(t, E.sub_click + .5, E.sub_click + 1.3));
    let x = lerp(1750, 1480, a), y = lerp(800, 345, a); x = lerp(x, 1440, b); y = lerp(y, 515, b); x = lerp(x, 1800, out); y = lerp(y, 860, out);
    const press = (t >= E.follow_click - .06 && t < E.follow_click + .1) || (t >= E.sub_click - .06 && t < E.sub_click + .1) ? 1 : 0;
    cursorArrow(x, y, press);
    [E.follow_click, E.sub_click].forEach(tc => { const p = P(t, tc, tc + .4); if (p > 0 && p < 1) circ(tc === E.follow_click ? 1480 : 1440, tc === E.follow_click ? 345 : 515, 20 + p * 70, null, 6 * (1 - p), '#fff'); });
  }
  if (t >= E.sub_click + .7) text('Resistance is futile.', bx - 20, 650, { size: 62, color: '#fff', stroke: '#7b2d12', sw: 14, rot: -.03, sc: eBack(P(t, E.sub_click + .7, E.sub_click + 1.0)) });
  if (t >= E.end_ding - .05) { const k = eBack(P(t, E.end_ding - .05, E.end_ding + .3)); coinRain(E.end_ding, 1.4, 50); text('THE END', W / 2, 150, { font: 'roman', size: 150, weight: '900', color: '#f1c453', stroke: INK, sw: 22, sc: k, rot: -.02 }); }
  text("Based on Plutarch's Life of Caesar and Suetonius. Details dramatized for comedy.", W / 2, 1042, { size: 28, color: '#fff', stroke: '#4b2c5e', sw: 8, alpha: .9 });
}

// =========================================================================== frame composer
const SCENES = [S1, S2, S3, S4, S5, S6, S7], SWAY = [false, true, true, true, false, false, true];
function drawFrame(f) {
  NOW = f / FPS; BF = Math.floor(NOW * 12); JC = 0;
  const cuts = [E.cut1, E.cut2, E.cut3, E.cut4, E.cut5, E.cut6], hw = .22;
  let idx = 0; cuts.forEach(c => { if (NOW >= c) idx++; });
  let tr = -1, trIdx = 0; cuts.forEach((c, i) => { if (NOW >= c - hw && NOW < c + hw) { tr = (NOW - (c - hw)) / (2 * hw); trIdx = i; } });
  const drawScene = (i, dx) => {
    ctx.save(); const st = [0, ...cuts][i], k = 1.0 + .03 * P(NOW, st, st + 9) + (SWAY[i] ? .02 : 0);
    ctx.translate(W / 2 + dx, H / 2); if (SWAY[i]) ctx.rotate(Math.sin(NOW * 1.1 + i) * .006); ctx.scale(k, k); ctx.translate(-W / 2, -H / 2);
    ctx.beginPath(); ctx.rect(-60, -60, W + 120, H + 120); ctx.clip(); JC = i * 5000; SCENES[i](NOW); ctx.restore();
  };
  ctx.clearRect(0, 0, W, H);
  if (tr >= 0) { const e = eIO(tr); drawScene(trIdx, -W * e); drawScene(trIdx + 1, W * (1 - e)); const sx = W * (1 - e); ln(sx, 0, sx, H, 10); }
  else drawScene(idx, 0);
  captions(NOW); vignette();
}
function init(tl) { TL = tl; E = tl.events; makeTextures(); }
