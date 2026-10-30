// Per-part drawing styles (the part's local frame is already translated + rotated by its body pose).
let HITS = null;     // item id -> sorted hit times (pegs light up when struck)
let FIN = null;      // finale event
function prepEvents() {
  HITS = {}; FIN = null;
  for (const e of TL.events) {
    if (e.type === 'finale') FIN = e;
    if (e.type !== 'hit') continue;
    if (e.ka === 'peg') (HITS[e.a] = HITS[e.a] || []).push(e.t);
    if (e.kb === 'peg') (HITS[e.b] = HITS[e.b] || []).push(e.t);
  }
}
function flashOf(id, T) {
  const h = HITS && HITS[id]; if (!h) return 0;
  let best = 0;
  for (let i = h.length - 1; i >= 0; i--) { const d = T - h[i]; if (d >= 0) { best = Math.max(best, 1 - d / 0.3); break; } }
  return Math.max(0, best);
}

function gearPath(r, teeth) {
  ctx.beginPath();
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i / (teeth * 4)) * Math.PI * 2, k = i % 4, rr = (k === 1 || k === 2) ? r * 1.16 : r * 0.96;
    const a2 = a - 0.5 * (Math.PI * 2 / (teeth * 4));
    ctx.lineTo(Math.cos(a2) * rr, Math.sin(a2) * rr);
  }
  ctx.closePath();
}

Object.assign(STYLES, {
  peg(it, f) {
    const r = it.shapes[0].r, fl = flashOf(it.id, FNOW / FPS), h = it.hue || 0;
    ctx.beginPath(); ctx.arc(0, 0, r + fl * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = fl > 0.05 ? hsl(h, 95, 55 + 30 * fl) : '#c9d3ff'; ctx.fill();
    ctx.lineWidth = 0.08; ctx.strokeStyle = '#26365c'; ctx.stroke();
    if (fl > 0.05) { ctx.beginPath(); ctx.arc(0, 0, r + 0.25 + fl * 0.5, 0, Math.PI * 2); ctx.strokeStyle = hsl(h, 95, 70, fl * 0.7); ctx.lineWidth = 0.1; ctx.stroke(); }
  },
  bucket(it) {
    const pal = it.mat === 'teal' ? PAL.teal : PAL.blue;
    for (const sh of it.shapes) {
      ctx.beginPath(); sh.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
      ctx.fillStyle = pal[0]; ctx.fill(); ctx.lineWidth = 0.1; ctx.lineJoin = 'round'; ctx.strokeStyle = pal[1]; ctx.stroke();
    }
    const w = it.shapes[1].pts, xs = it.shapes.flatMap(s => s.pts.map(p => p[0])), ys = it.shapes.flatMap(s => s.pts.map(p => p[1]));
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y1 = Math.max(...ys);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x0 + 0.14, Math.min(...ys) + 0.1, 0.08, y1 - Math.min(...ys) - 0.5);
    ctx.fillStyle = pal[1]; for (let x = x0 + 0.7; x < x1 - 0.5; x += 0.9) { ctx.beginPath(); ctx.arc(x, y1 - 0.14, 0.07, 0, 7); ctx.fill(); }
  },
  gate(it) { generic(it, PAL.red, 0); const p = it.shapes[0].pts; ctx.fillStyle = '#ffd23f'; for (let y = p[0][1] + 0.3; y < p[2][1] - 0.4; y += 0.7) ctx.fillRect(p[0][0] + 0.04, y, 0.24, 0.3); },
  button(it) { generic(it, PAL.red, 0); const p = it.shapes[0].pts; ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = 'bold 0.36px "Comic Neue"'; ctx.textAlign = 'center'; ctx.fillText('PRESS', 0, 0.12); },
  bigbutton(it) {
    const p = it.shapes[0].pts, w = p[1][0] - p[0][0], h = p[2][1] - p[1][1];
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#ff8a8a'); g.addColorStop(1, '#e02b3d');
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 0.3); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 0.1; ctx.strokeStyle = '#5c0f1f'; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '0.5px Bangers'; ctx.textAlign = 'center'; ctx.fillText('LIKE', 0, 0.17);
  },
  weight(it) {
    generic(it, PAL.purple, 0); const p = it.shapes[0].pts, w = p[1][0] - p[0][0], h = p[2][1] - p[1][1];
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '0.62px Bangers'; ctx.textAlign = 'center'; ctx.fillText('CW', 0, 0.22);
    ctx.fillStyle = '#ffd23f'; for (let i = -1; i <= 1; i += 2) ctx.fillRect(i * w * 0.31 - 0.1, -h / 2 + 0.12, 0.2, h - 0.24);
  },
  anvil(it) {
    const hw = 1.35, hh = 0.9;
    ctx.beginPath(); ctx.moveTo(-hw - 0.55, -hh + 0.05); ctx.lineTo(-hw + 0.2, -hh); ctx.lineTo(hw, -hh); ctx.lineTo(hw, -hh + 0.35); ctx.lineTo(0.4, -hh + 0.65);
    ctx.lineTo(0.55, hh - 0.35); ctx.lineTo(hw, hh - 0.3); ctx.lineTo(hw, hh); ctx.lineTo(-hw, hh); ctx.lineTo(-hw, hh - 0.3); ctx.lineTo(-0.55, hh - 0.35);
    ctx.lineTo(-0.4, -hh + 0.65); ctx.lineTo(-hw + 0.2, -hh + 0.4); ctx.closePath();
    const g = ctx.createLinearGradient(0, -hh, 0, hh); g.addColorStop(0, '#8c97b8'); g.addColorStop(0.5, '#4a5478'); g.addColorStop(1, '#2d3454');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 0.1; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0f1533'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-hw + 0.3, -hh + 0.08, hw * 2 - 0.4, 0.1);
    ctx.fillStyle = '#ffd23f'; ctx.font = '0.5px Bangers'; ctx.textAlign = 'center'; ctx.fillText('16 TON', 0.05, 0.42);
    ctx.beginPath(); ctx.arc(0, -hh - 0.12, 0.2, 0, 7); ctx.fillStyle = '#26365c'; ctx.fill();
  },
  scissors(it, f, x, y, a) {
    ctx.rotate(-a);
    const k = Math.max(0, a);                      // open amount (rad) is stored in the body angle
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.save(); ctx.rotate(s * (0.04 + k * 0.5));
      ctx.beginPath(); ctx.moveTo(0, -1.0); ctx.lineTo(0, 0.1); ctx.lineWidth = 0.34; ctx.strokeStyle = '#1b2547'; ctx.stroke();
      ctx.lineWidth = 0.2; ctx.strokeStyle = '#e4eeff'; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(s * 0.3, 0.95, 0.3, 0.42, s * 0.3, 0, 7); ctx.lineWidth = 0.14; ctx.strokeStyle = '#ff4b4b'; ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, 0.14, 0, 7); ctx.fillStyle = '#ffd23f'; ctx.fill();
  },
  claw(it, f, x, y, a) {
    ctx.rotate(-a); const k = a;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#26365c'; ctx.lineWidth = 0.55; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, -0.1); ctx.stroke();
    ctx.strokeStyle = '#a9bde0'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, -0.1); ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.save(); ctx.rotate(s * (0.12 + k * 0.7));
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 1.35, 0.7, s * 0.55, 1.8); ctx.lineWidth = 0.5; ctx.strokeStyle = '#26365c'; ctx.stroke();
      ctx.lineWidth = 0.3; ctx.strokeStyle = '#ffd23f'; ctx.stroke(); ctx.restore();
    }
  },
  wheel(it, f, x, y, a) {
    shapePath(it); ctx.fillStyle = '#f2b56b'; ctx.fill(); ctx.lineWidth = 0.1; ctx.lineJoin = 'round'; ctx.strokeStyle = '#5b3416'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 1.1, 0, 7); ctx.fillStyle = '#a9bde0'; ctx.fill(); ctx.stroke();
    gearPath(0.95, 9); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.lineWidth = 0.06; ctx.strokeStyle = '#6d4a00'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 0.26, 0, 7); ctx.fillStyle = '#26365c'; ctx.fill();
  },
  gear(it, f) {
    const d = it.deco, fo = byId[d.follow], [, , wa] = pose(fo, f);
    ctx.save(); ctx.rotate(d.ratio * wa + (d.phase || 0));
    gearPath(d.r, d.teeth); ctx.fillStyle = d.col; ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
    ctx.lineWidth = 0.07; ctx.strokeStyle = 'rgba(15,21,51,0.75)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, d.r * 0.38, 0, 7); ctx.fillStyle = 'rgba(15,21,51,0.65)'; ctx.fill();
    for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.fillStyle = 'rgba(15,21,51,0.4)'; ctx.fillRect(d.r * 0.45, -0.07, d.r * 0.35, 0.14); }
    ctx.restore();
  },
  pulleydeco(it, f) {
    const r = it.deco.r;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fillStyle = '#a9bde0'; ctx.fill(); ctx.lineWidth = 0.1; ctx.strokeStyle = '#26365c'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, 7); ctx.fillStyle = '#26365c'; ctx.fill();
  },
  bar(it) { generic(it, PAL.metal, 0); },
  arm(it, f, x, y, a) {
    shapePath(it); ctx.fillStyle = '#f2b56b'; ctx.fill(); ctx.lineWidth = 0.1; ctx.lineJoin = 'round'; ctx.strokeStyle = '#5b3416'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 0.42, 0, 7); ctx.fillStyle = '#a9bde0'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 0.14, 0, 7); ctx.fillStyle = '#26365c'; ctx.fill();
  },
  sign(it, f) {
    const T = f / FPS, lit = FIN ? Math.min(1, Math.max(0, (T - FIN.t) / 0.2)) : 0, r = it.deco.r;
    const pulse = lit ? 1 + 0.04 * Math.sin((T - FIN.t) * 9) : 1;
    ctx.save(); ctx.scale(pulse * r / 16, pulse * r / 16);
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) { const t = i / 80 * Math.PI * 2, X = 16 * Math.pow(Math.sin(t), 3), Y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); i ? ctx.lineTo(X, Y - 1) : ctx.moveTo(X, Y - 1); }
    ctx.closePath();
    ctx.fillStyle = lit ? `rgba(255,79,139,${0.28 * lit})` : 'rgba(120,130,255,0.08)'; ctx.fill();
    if (lit) { ctx.shadowColor = '#ff4f8b'; ctx.shadowBlur = 40 * lit; }
    ctx.lineWidth = 1.1 / (r / 16) * 0.3; ctx.lineJoin = 'round'; ctx.strokeStyle = lit ? '#ff9ac0' : 'rgba(150,160,255,0.35)'; ctx.stroke(); ctx.shadowBlur = 0;
    ctx.restore();
  },
});
