// Per-part drawing styles (the part's local frame is already translated + rotated by its body pose).  No lettering anywhere.
let FIN = null;      // the "button pressed" event (lights the heart)
function prepEvents() {
  FIN = null;
  for (const e of TL.events) if (e.type === 'finale') FIN = e;
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

function heartPath(r) {                       // unit heart scaled so its half-width is r
  const k = r / 16; ctx.beginPath();
  for (let i = 0; i <= 80; i++) {
    const t = i / 80 * Math.PI * 2, X = 16 * Math.pow(Math.sin(t), 3), Y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    i ? ctx.lineTo(X * k, (Y - 1) * k) : ctx.moveTo(X * k, (Y - 1) * k);
  }
  ctx.closePath();
}

Object.assign(STYLES, {
  peg(it) {
    const r = it.shapes[0].r;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = '#dfe6ff'; ctx.fill();
    ctx.lineWidth = 0.08; ctx.strokeStyle = '#26365c'; ctx.stroke();
  },
  bucket(it) {
    const pal = it.mat === 'teal' ? PAL.teal : PAL.blue;
    for (const sh of it.shapes) {
      ctx.beginPath(); sh.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
      ctx.fillStyle = pal[0]; ctx.fill(); ctx.lineWidth = 0.1; ctx.lineJoin = 'round'; ctx.strokeStyle = pal[1]; ctx.stroke();
    }
  },
  gate(it) { generic(it, PAL.red, 0); },
  button(it) { generic(it, PAL.red, 0); },
  bigbutton(it) {
    const p = it.shapes[0].pts, w = p[1][0] - p[0][0], h = p[2][1] - p[1][1];
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#ff8a8a'); g.addColorStop(1, '#e02b3d');
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 0.3); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 0.1; ctx.strokeStyle = '#5c0f1f'; ctx.stroke();
    ctx.save(); ctx.translate(0, 0.02); heartPath(0.2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();     // small heart icon
  },
  weight(it) {
    generic(it, PAL.purple, 0); const p = it.shapes[0].pts, w = p[1][0] - p[0][0], h = p[2][1] - p[1][1];
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; for (let i = -1; i <= 1; i += 2) ctx.fillRect(i * w * 0.31 - 0.08, -h / 2 + 0.14, 0.16, h - 0.28);
  },
  anvil() {
    const hw = 1.35, hh = 0.9;
    ctx.beginPath(); ctx.moveTo(-hw - 0.55, -hh + 0.05); ctx.lineTo(-hw + 0.2, -hh); ctx.lineTo(hw, -hh); ctx.lineTo(hw, -hh + 0.35); ctx.lineTo(0.4, -hh + 0.65);
    ctx.lineTo(0.55, hh - 0.35); ctx.lineTo(hw, hh - 0.3); ctx.lineTo(hw, hh); ctx.lineTo(-hw, hh); ctx.lineTo(-hw, hh - 0.3); ctx.lineTo(-0.55, hh - 0.35);
    ctx.lineTo(-0.4, -hh + 0.65); ctx.lineTo(-hw + 0.2, -hh + 0.4); ctx.closePath();
    const g = ctx.createLinearGradient(0, -hh, 0, hh); g.addColorStop(0, '#8c97b8'); g.addColorStop(0.5, '#4a5478'); g.addColorStop(1, '#2d3454');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 0.1; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0f1533'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-hw + 0.3, -hh + 0.08, hw * 2 - 0.4, 0.1);
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
    ctx.rotate(-a); const k = a;                  // opening amount is stored in the body angle
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#26365c'; ctx.lineWidth = 0.46; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, -1.2); ctx.stroke();
    ctx.strokeStyle = '#a9bde0'; ctx.lineWidth = 0.26; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, -1.2); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-0.7, -1.5, 1.4, 0.8, 0.2); ctx.fillStyle = '#a9bde0'; ctx.fill(); ctx.lineWidth = 0.1; ctx.strokeStyle = '#26365c'; ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 0.5, -0.9); ctx.rotate(s * (0.1 + k * 0.85));
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 0.32, 1.0); ctx.lineTo(-s * 0.05, 1.95);
      ctx.strokeStyle = '#26365c'; ctx.lineWidth = 0.34; ctx.stroke(); ctx.strokeStyle = '#a9bde0'; ctx.lineWidth = 0.18; ctx.stroke();
      ctx.restore();
    }
  },
  wheel(it) {
    shapePath(it); ctx.fillStyle = '#f2b56b'; ctx.fill(); ctx.lineWidth = 0.1; ctx.lineJoin = 'round'; ctx.strokeStyle = '#5b3416'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 1.1, 0, 7); ctx.fillStyle = '#a9bde0'; ctx.fill(); ctx.stroke();
    gearPath(0.95, 9); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.lineWidth = 0.06; ctx.strokeStyle = '#6d4a00'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 0.26, 0, 7); ctx.fillStyle = '#26365c'; ctx.fill();
  },
  pulleydeco(it) {
    const r = it.deco.r;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fillStyle = '#a9bde0'; ctx.fill(); ctx.lineWidth = 0.1; ctx.strokeStyle = '#26365c'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, 7); ctx.fillStyle = '#26365c'; ctx.fill();
  },
  bar(it) { generic(it, PAL.metal, 0); },
  arm(it) {
    shapePath(it); ctx.fillStyle = '#f2b56b'; ctx.fill(); ctx.lineWidth = 0.1; ctx.lineJoin = 'round'; ctx.strokeStyle = '#5b3416'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 0.42, 0, 7); ctx.fillStyle = '#a9bde0'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 0.14, 0, 7); ctx.fillStyle = '#26365c'; ctx.fill();
  },
  sign(it, f) {                                   // heart: faint outline until the button is pressed, then a plain solid pink fill
    const T = f / FPS, lit = FIN ? Math.min(1, Math.max(0, (T - FIN.t) / 0.3)) : 0, r = it.deco.r;
    heartPath(r);
    ctx.fillStyle = lit ? `rgba(255,95,150,${0.95 * lit})` : 'rgba(120,130,255,0.08)'; ctx.fill();
    ctx.lineWidth = 0.28; ctx.lineJoin = 'round'; ctx.strokeStyle = lit ? `rgba(255,170,205,${lit})` : 'rgba(150,160,255,0.35)'; ctx.stroke();
  },
});
