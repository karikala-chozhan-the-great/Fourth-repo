// Canvas 2D renderer: drawFrame(f) paints one 1080x1920 frame from the recorded timeline.  World units are metres (1 m = 50 px).
const PPM = 50;
let SW = 1080, SH = 1920;
let TL, cv, ctx, byId = [], dynPos = [], FPS = 30;
const PAL = {
  wood: ['#f2b56b', '#5b3416', '#ffd9a0'], metal: ['#a9bde0', '#26365c', '#e4eeff'], steel: ['#e7eef8', '#26365c', '#ffffff'],
  rubber: ['#ff5c8a', '#6a1230', '#ff9db9'], gold: ['#ffd23f', '#6d4a00', '#fff1a8'], bell: ['#ffd23f', '#6d4a00', '#fff1a8'],
  teal: ['#2ee6c5', '#0c4f45', '#a8fff0'], red: ['#ff4b4b', '#5c0f0f', '#ff9a9a'], blue: ['#4c8dff', '#12326b', '#a8c8ff'],
  purple: ['#9d6bff', '#33196b', '#cbb0ff'], domino: ['#ffffff', '#222', '#ffffff'], paper: ['#fff6df', '#5a4a2a', '#ffffff'],
};
const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function init(tl) {
  TL = tl; FPS = tl.fps; SW = tl.vw || 1080; SH = tl.vh || 1920;
  cv = document.getElementById('c'); cv.width = SW; cv.height = SH; ctx = cv.getContext('2d');
  TL.items.forEach(it => { byId[it.id] = it; });
  TL.dyn.forEach((id, k) => { dynPos[id] = k; });
  for (const it of TL.items) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const sh of it.shapes) {
      if (sh.t === 'c') { x0 = Math.min(x0, sh.x - sh.r); x1 = Math.max(x1, sh.x + sh.r); y0 = Math.min(y0, sh.y - sh.r); y1 = Math.max(y1, sh.y + sh.r); }
      else for (const p of sh.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    }
    it.bb = [x0, y0, x1, y1]; it.rad = Math.hypot(Math.max(Math.abs(x0), Math.abs(x1)), Math.max(Math.abs(y0), Math.abs(y1)));
  }
  if (typeof prepEvents === 'function') prepEvents();
  TL.order = [...TL.items].sort((a, b) => (a.z || 0) - (b.z || 0) || a.id - b.id);
}

function pose(it, f) {
  const k = dynPos[it.id];
  if (k === undefined) return [it.x, it.y, it.a];
  const fr = TL.frames[f]; return [fr[k * 3], fr[k * 3 + 1], fr[k * 3 + 2]];
}

// ------------------------------------------------------------------ frame
let CAM, FNOW;
function drawFrame(f) {
  f = Math.min(f, TL.frames.length - 1); FNOW = f;
  const c = TL.cam[f]; CAM = { cx: c[0], cy: c[1], s: c[2], sx: c[3], sy: c[4], roll: c[5] };
  const T = f / FPS;
  drawBackground(T);
  const S = CAM.s * PPM;
  ctx.save();
  ctx.translate(SW / 2 + CAM.sx * S, SH / 2 + CAM.sy * S); ctx.rotate(CAM.roll);
  ctx.scale(S, S); ctx.translate(-CAM.cx, -CAM.cy);
  const vx0 = CAM.cx - SW / 2 / S - 1, vx1 = CAM.cx + SW / 2 / S + 1, vy0 = CAM.cy - SH / 2 / S - 1, vy1 = CAM.cy + SH / 2 / S + 1;
  const vis = it => { const [x, y] = pose(it, f); return x + it.rad > vx0 && x - it.rad < vx1 && y + it.rad > vy0 && y - it.rad < vy1; };
  // shadows first (cheap offset silhouettes)
  ctx.save(); ctx.translate(0.18, 0.26); ctx.fillStyle = 'rgba(5,3,20,0.28)';
  for (const it of TL.order) {
    if (it.style === 'sensor' || it.style === 'claw' || !it.shapes.length || !vis(it)) continue;
    if (it.mat === 'ghost') continue;
    const [x, y, a] = pose(it, f); ctx.save(); ctx.translate(x, y); ctx.rotate(a); shapePath(it); ctx.fill(); ctx.restore();
  }
  ctx.restore();
  for (const l of TL.links) if (l.z < 0 && f >= l.from && f < l.to) drawLink(l, f);
  for (const it of TL.order) {
    if (it.style === 'sensor' || !vis(it)) continue;
    const [x, y, a] = pose(it, f);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    drawItem(it, f, x, y, a);
    ctx.restore();
  }
  for (const l of TL.links) if (l.z >= 0 && f >= l.from && f < l.to) drawLink(l, f);
  if (window.drawFX) window.drawFX(f, T);
  ctx.restore();
  if (window.drawHUD) window.drawHUD(f, T);
}

function shapePath(it) {
  ctx.beginPath();
  for (const sh of it.shapes) {
    if (sh.t === 'c') { ctx.moveTo(sh.x + sh.r, sh.y); ctx.arc(sh.x, sh.y, sh.r, 0, Math.PI * 2); }
    else { sh.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }
  }
}

function drawItem(it, f, x, y, a) {
  const fn = STYLES[it.style];
  if (fn) return fn(it, f, x, y, a);
  const pal = PAL[it.mat] || PAL.wood;
  generic(it, pal, a);
}

// fill + outline + highlight on up-facing edges (+ wood grain)
function generic(it, pal, a, fill) {
  shapePath(it);
  ctx.fillStyle = fill || pal[0]; ctx.fill();
  ctx.lineWidth = 0.1; ctx.lineJoin = 'round'; ctx.strokeStyle = pal[1]; ctx.stroke();
  for (const sh of it.shapes) {
    if (sh.t !== 'p') continue;
    const n = sh.pts.length; let area = 0;
    for (let i = 0; i < n; i++) { const p = sh.pts[i], q = sh.pts[(i + 1) % n]; area += p[0] * q[1] - q[0] * p[1]; }
    const sg = area > 0 ? 1 : -1, ca = Math.cos(a), sa = Math.sin(a);
    for (let i = 0; i < n; i++) {
      const p = sh.pts[i], q = sh.pts[(i + 1) % n]; const ex = q[0] - p[0], ey = q[1] - p[1], len = Math.hypot(ex, ey);
      if (len < 0.5) continue;
      const nx = sg * ey / len, ny = -sg * ex / len;       // outward normal (local)
      const wy = nx * sa + ny * ca;                          // world-y of outward normal
      if (wy < -0.6) {
        const ux = ex / len, uy = ey / len, ix = -nx * 0.09, iy = -ny * 0.09;
        ctx.beginPath(); ctx.moveTo(p[0] + ux * 0.1 + ix, p[1] + uy * 0.1 + iy); ctx.lineTo(q[0] - ux * 0.1 + ix, q[1] - uy * 0.1 + iy);
        ctx.strokeStyle = pal[2]; ctx.lineWidth = 0.09; ctx.lineCap = 'round'; ctx.stroke();
      }
    }
    if (it.mat === 'wood' && (it.style === 'plank' || !it.style)) {          // grain
      const xs = sh.pts.map(p => p[0]), ys = sh.pts.map(p => p[1]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const e0 = [sh.pts[1][0] - sh.pts[0][0], sh.pts[1][1] - sh.pts[0][1]], el = Math.hypot(...e0);
      if (el > 1.5) {
        ctx.strokeStyle = 'rgba(91,52,22,0.35)'; ctx.lineWidth = 0.04;
        for (let k = -2; k <= 2; k += 2) {
          const t = k * 0.14; const nx = -e0[1] / el * t * 0.0, ny = 0;
          ctx.beginPath(); ctx.moveTo(cx - e0[0] / 2 * 0.9, cy - e0[1] / 2 * 0.9 + t * 0.4); ctx.lineTo(cx + e0[0] / 2 * 0.9, cy + e0[1] / 2 * 0.9 + t * 0.4); ctx.stroke();
          break;
        }
      }
    }
  }
}

function sphere(r, base, dark, a, mark) {
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, base); g.addColorStop(1, dark);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  if (mark) {            // one small dot that turns with the ball, so rolling is readable
    ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.arc(r * 0.58, 0, r * 0.15, 0, Math.PI * 2); ctx.fillStyle = mark; ctx.fill(); ctx.restore();
  }
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.lineWidth = 0.1; ctx.strokeStyle = '#1b2547'; ctx.stroke();
  ctx.beginPath(); ctx.arc(-r * 0.38, -r * 0.42, r * 0.17, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
}

const STYLES = {
  ball(it, f, x, y, a) { const r = it.shapes[0].r; const h = it.hue === undefined ? 200 : it.hue; sphere(r, hsl(h, 80, 62), hsl(h, 70, 30), a, hsl(h, 70, 24, 0.5)); },
  cradle(it, f, x, y, a) { sphere(it.shapes[0].r, '#dfe9f7', '#4b5f8c', a, 'rgba(50,70,120,0.4)'); },
  domino(it, f) {
    const sh = it.shapes[0].pts, w = sh[1][0] - sh[0][0], h = sh[2][1] - sh[1][1];
    generic(it, [hsl(it.hue, 85, 58), hsl(it.hue, 70, 20), hsl(it.hue, 90, 80)], 0);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(-w / 2 + 0.05, -0.04, w - 0.1, 0.08);
    for (const py of [-0.42, 0.42]) { ctx.beginPath(); ctx.arc(0, py, 0.06, 0, Math.PI * 2); ctx.fill(); }
  },
  column(it) {
    const sh = it.shapes[0].pts; const x0 = sh[0][0], x1 = sh[1][0];
    ctx.fillStyle = '#2a2f5c'; ctx.fillRect(x0, sh[0][1], x1 - x0, sh[2][1] - sh[0][1]);
    ctx.fillStyle = '#3a4280'; ctx.fillRect(x0, sh[0][1], (x1 - x0) * 0.55, sh[2][1] - sh[0][1]);
    const left = it.name === 'colL'; const ex = left ? x1 : x0;
    ctx.fillStyle = '#6f7dd1'; ctx.fillRect(left ? x1 - 0.22 : x0, sh[0][1], 0.22, sh[2][1] - sh[0][1]);
    ctx.strokeStyle = '#0f1236'; ctx.lineWidth = 0.1; ctx.beginPath(); ctx.moveTo(ex, sh[0][1]); ctx.lineTo(ex, sh[2][1]); ctx.stroke();
    // hazard rungs + rivets every 3 m
    const y0 = Math.floor(CAM.cy - 30), y1 = Math.ceil(CAM.cy + 30);
    for (let yy = y0 - (y0 % 3); yy < y1; yy += 3) {
      ctx.fillStyle = '#6f7dd1'; ctx.beginPath(); ctx.arc(left ? x1 - 0.55 : x0 + 0.55, yy, 0.12, 0, 7); ctx.fill();
    }
  },
  beam(it) { generic(it, PAL.metal, 0); const sh = it.shapes[0].pts; for (let x = sh[0][0] + 0.6; x < sh[1][0]; x += 1.2) { ctx.beginPath(); ctx.arc(x, (sh[0][1] + sh[2][1]) / 2, 0.1, 0, 7); ctx.fillStyle = '#26365c'; ctx.fill(); } },
  post(it) { generic(it, PAL.metal, 0); },
  rail(it) { generic(it, PAL.metal, 0); },
  plank(it, f, x, y, a) { generic(it, PAL[it.mat] || PAL.wood, a); },
  claw(it, f, x, y) {
    const k = it.open || 0;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#26365c'; ctx.lineWidth = 0.55; ctx.beginPath(); ctx.moveTo(0.2, -5); ctx.lineTo(0.2, -0.2); ctx.stroke();
    ctx.strokeStyle = '#a9bde0'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(0.2, -5); ctx.lineTo(0.2, -0.2); ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(0, 0); ctx.rotate(s * (0.15 + k * 0.7) * 1);
      ctx.beginPath(); ctx.moveTo(0.1, 0); ctx.quadraticCurveTo(s * 1.5 + 0.1, 0.8, s * 0.9, 1.9); ctx.lineWidth = 0.5; ctx.strokeStyle = '#26365c'; ctx.stroke();
      ctx.lineWidth = 0.3; ctx.strokeStyle = '#ffd23f'; ctx.stroke(); ctx.restore();
    }
  },
};

function drawLink(l, f) {
  const P = l.pts.map(p => {
    if (p.i < 0) return [p.x, p.y];
    const it = byId[p.i], [x, y, a] = pose(it, f), ca = Math.cos(a), sa = Math.sin(a);
    return [x + p.x * ca - p.y * sa, y + p.x * sa + p.y * ca];
  });
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const w = l.w || 0.1;
  if (l.kind === 'vrope' || l.kind === 'rope') {
    ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.strokeStyle = l.col || '#2b2350'; ctx.lineWidth = w * 1.8; ctx.stroke();
    ctx.strokeStyle = l.col2 || '#e9d8a6'; ctx.lineWidth = w; ctx.stroke();
  }
}

// ------------------------------------------------------------------ background
function drawBackground(T) {
  const g = ctx.createLinearGradient(0, 0, 0, SH);
  g.addColorStop(0, '#1d1a45'); g.addColorStop(1, '#2c2166');
  ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
  const cy = CAM ? CAM.cy : 0, S = PPM * 0.55;
  // parallax tile grid
  ctx.strokeStyle = 'rgba(140,150,255,0.07)'; ctx.lineWidth = 2;
  const gs = 3 * S, oy = (-cy * S) % gs;
  ctx.beginPath();
  for (let y = oy - gs; y < SH + gs; y += gs) { ctx.moveTo(0, y); ctx.lineTo(SW, y); }
  for (let x = 0; x < SW + gs; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, SH); }
  ctx.stroke();
}
