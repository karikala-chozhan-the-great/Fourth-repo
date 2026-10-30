// World-space effects (sparks, ghost trails, dust, confetti, shock ring) and screen-space HUD.
const STEP_TOTAL = 12;
const CONF = ['#ff4f8b', '#ffd23f', '#2ee6c5', '#4c8dff', '#9d6bff', '#ff8a3d', '#ffffff'];
const ease = { out: t => 1 - Math.pow(1 - t, 3), back: t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); } };
const clamp01 = v => Math.min(1, Math.max(0, v));

window.drawFX = (f, T) => {
  // ghost trails behind fast hero balls, speed lines behind the falling anvil
  for (const it of TL.items) {
    if (!it.hero) continue;
    const [x, y] = pose(it, f), [px, py] = pose(it, Math.max(0, f - 1));
    const sp = Math.hypot(x - px, y - py) * FPS;
    if (it.style === 'ball' && sp > 9) {
      const r = it.shapes[0].r;
      for (let k = 3; k >= 1; k--) {
        const [gx, gy] = pose(it, Math.max(0, f - k));
        ctx.beginPath(); ctx.arc(gx, gy, r * (1 - k * 0.08), 0, 7); ctx.fillStyle = hsl(it.hue || 200, 90, 70, 0.16 - k * 0.035); ctx.fill();
      }
    } else if (it.style === 'anvil' && sp > 14) {
      ctx.strokeStyle = 'rgba(210,225,255,0.45)'; ctx.lineWidth = 0.1; ctx.lineCap = 'round';
      for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x + k * 0.55, y - 1.2 - rnd(k + 9) * 1.5); ctx.lineTo(x + k * 0.55, y - 3.6 - rnd(k + 3) * 2.8); ctx.stroke(); }
    }
  }
  // impact sparks + dust puffs
  for (const e of TL.events) {
    if (e.type !== 'hit') continue;
    const dt = T - e.t; if (dt < 0 || dt > 0.7) continue;
    const peg = e.ka === 'peg' || e.kb === 'peg', pp = e.ka === 'pball' && e.kb === 'pball';
    if (peg || pp) continue;
    if (e.v >= 8 && dt < 0.4) {
      const n = Math.min(10, 4 + (e.v | 0) / 3);
      ctx.lineCap = 'round';
      for (let k = 0; k < n; k++) {
        const a = rnd(e.t * 977 + k * 13) * Math.PI * 2, sp = 3 + rnd(e.t * 311 + k) * 7;
        const px = e.x + Math.cos(a) * sp * dt, py = e.y + Math.sin(a) * sp * dt + 14 * dt * dt;
        ctx.strokeStyle = `rgba(255,${200 + (k * 13) % 55},120,${1 - dt / 0.4})`; ctx.lineWidth = 0.11;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - Math.cos(a) * 0.35, py - Math.sin(a) * 0.35 - 0.05); ctx.stroke();
      }
    }
    if ((e.ka === 'anvil' || e.kb === 'anvil') && e.v > 12) {
      for (let k = 0; k < 9; k++) {
        const dir = k < 5 ? -1 : 1, rr = (0.5 + dt * 5) * (0.6 + rnd(k) * 0.8);
        ctx.beginPath(); ctx.arc(e.x + dir * (0.6 + dt * (4 + k * 0.7)), e.y - 0.3 - dt * 1.2 * rnd(k + 4), rr, 0, 7);
        ctx.fillStyle = `rgba(200,205,255,${0.35 * (1 - dt / 0.7)})`; ctx.fill();
      }
    }
  }
  if (!FIN) return;
  const dt = T - FIN.t; if (dt < 0) return;
  const cx = byId.length ? 7.4 : FIN.x, sy = 113;
  // sunburst behind the neon heart
  ctx.save(); ctx.translate(cx, sy); ctx.globalCompositeOperation = 'lighter';
  const rayA = clamp01(dt / 0.3) * clamp01(1 - (dt - 2) / 2.5) * 0.10;
  for (let i = 0; i < 14; i++) {
    const a0 = i / 14 * Math.PI * 2 + dt * 0.35, a1 = a0 + 0.17;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 26, a0, a1); ctx.closePath(); ctx.fillStyle = `rgba(255,120,190,${rayA})`; ctx.fill();
  }
  ctx.restore();
  // shock rings
  for (let r = 0; r < 2; r++) {
    const d = dt - r * 0.18; if (d < 0 || d > 1) continue;
    ctx.beginPath(); ctx.arc(FIN.x, FIN.y - 0.5, 1 + d * 22, 0, 7); ctx.strokeStyle = `rgba(255,170,215,${0.8 * (1 - d)})`; ctx.lineWidth = 0.45 * (1 - d) + 0.05; ctx.stroke();
  }
  // confetti cannons left / right of the sign
  for (let i = 0; i < 170; i++) {
    const side = i % 2 ? 1 : -1, d = dt - rnd(i + 70) * 0.25; if (d < 0) continue;
    const x0 = side < 0 ? 0.9 : 13.9, y0 = 120.5;
    const ang = (-62 - rnd(i) * 36) * Math.PI / 180, spd = 15 + rnd(i + 5) * 17, k = 0.7, g = 20;
    const vx = Math.cos(ang) * spd * -side * -1 * (side < 0 ? 1 : -1), vy = Math.sin(ang) * spd;
    const e = 1 - Math.exp(-k * d);
    const X = x0 + vx / k * e, Y = y0 + (vy + g / k) / k * e - g * d / k;
    const life = 5.2 - rnd(i + 21) * 1.5; if (d > life) continue;
    const fl = Math.cos(d * (6 + rnd(i + 8) * 8) + i), w = 0.2 + rnd(i + 3) * 0.28, h = 0.12 + rnd(i + 4) * 0.12;
    ctx.save(); ctx.translate(X, Y); ctx.rotate(d * (rnd(i + 2) - 0.5) * 14 + i); ctx.globalAlpha = clamp01((life - d) / 0.8);
    ctx.fillStyle = CONF[i % CONF.length]; ctx.fillRect(-w / 2, -h * fl / 2, w, Math.max(0.03, Math.abs(h * fl))); ctx.restore();
  }
  // floating +1
  if (dt < 2.2) {
    const k = clamp01(dt / 0.35), s = ease.back(k) * (1 + 0.04 * Math.sin(dt * 11));
    ctx.save(); ctx.translate(cx, 119.2 - dt * 1.4); ctx.scale(s, s); ctx.globalAlpha = clamp01((2.2 - dt) / 0.6);
    ctx.font = '3.4px Bangers'; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    ctx.lineWidth = 0.42; ctx.strokeStyle = '#3a0a2a'; ctx.strokeText('+1 LIKE', 0, 0);
    ctx.fillStyle = '#ffffff'; ctx.fillText('+1 LIKE', 0, 0); ctx.restore();
  }
};

function outlined(txt, x, y, size, fill, stroke = '#12102e', lw = 14, font = 'Bangers') {
  ctx.font = `${size}px ${font}`; ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.strokeText(txt, x, y); ctx.fillStyle = fill; ctx.fillText(txt, x, y);
}

window.drawHUD = (f, T) => {
  const steps = TL.steps.filter(s => s.f <= f), cur = steps.length ? steps[steps.length - 1] : null;
  // vignette
  const vg = ctx.createRadialGradient(SW / 2, SH / 2, SH * 0.36, SW / 2, SH / 2, SH * 0.72);
  vg.addColorStop(0, 'rgba(8,6,28,0)'); vg.addColorStop(1, 'rgba(8,6,28,0.5)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, SW, SH);

  // ---- hook title (lower-middle so it never hides the cradle; Reels/Shorts UI safe)
  if (T < 2.9) {
    const a = clamp01((2.9 - T) / 0.45) * clamp01(T / 0.12);
    ctx.save(); ctx.globalAlpha = a;
    let s = ease.back(clamp01(T / 0.35)); ctx.save(); ctx.translate(SW / 2, 1150); ctx.scale(s, s); outlined('12 STEPS', 0, 0, 200, '#ffffff', '#12102e', 22); ctx.restore();
    s = ease.back(clamp01((T - 0.18) / 0.35)); ctx.save(); ctx.translate(SW / 2, 1290); ctx.scale(s, s); ctx.rotate(-0.025); outlined('TO GET 1 LIKE', 0, 0, 118, '#ffd23f', '#12102e', 18); ctx.restore();
    s = ease.out(clamp01((T - 0.5) / 0.4)); ctx.globalAlpha = a * s;
    outlined('watch to the end', SW / 2, 1372, 50, 'rgba(255,255,255,0.92)', '#12102e', 9, '"Comic Neue"');
    ctx.restore();
  }

  // ---- step pill + progress (top, below the platforms' header area)
  if (cur && T > 0.6) {
    const n = Math.min(cur.n, STEP_TOTAL), age = T - cur.f / FPS, pop = 1 + 0.12 * Math.max(0, 1 - age / 0.25);
    ctx.save(); ctx.translate(SW / 2, 256); ctx.scale(pop, pop);
    ctx.beginPath(); ctx.roundRect(-380, -42, 760, 84, 42); ctx.fillStyle = 'rgba(14,12,44,0.82)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#8f98ff'; ctx.stroke();
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.font = '40px Bangers'; ctx.fillStyle = '#ffd23f'; ctx.fillText(`STEP ${n}/${STEP_TOTAL}`, -350, 14);
    ctx.textAlign = 'right'; ctx.font = '48px Bangers'; ctx.fillStyle = '#ffffff'; ctx.fillText(cur.label, 350, 16);
    ctx.restore();
    const sw = 52, gap = 8, x0 = SW / 2 - (STEP_TOTAL * sw + (STEP_TOTAL - 1) * gap) / 2;
    for (let i = 0; i < STEP_TOTAL; i++) {
      ctx.beginPath(); ctx.roundRect(x0 + i * (sw + gap), 316, sw, 12, 6);
      ctx.fillStyle = i < n ? hsl(330 - i * 6, 95, 62) : 'rgba(255,255,255,0.18)'; ctx.fill();
    }
  }

  // ---- big pop label as each step starts
  if (cur && cur.n >= 2 && cur.n <= 9) {
    const age = T - cur.f / FPS;
    if (age < 1.5) {
      const s = ease.back(clamp01(age / 0.3)), a = clamp01((1.5 - age) / 0.35);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(SW / 2 - 40, 1395); ctx.rotate(-0.035); ctx.scale(s, s);
      outlined(cur.label, 0, 0, 104, '#ffffff', '#12102e', 16); ctx.restore();
    }
  }

  // ---- finale: flash + end card
  if (FIN) {
    const dt = T - FIN.t;
    if (dt >= 0 && dt < 0.3) { ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - dt / 0.3)})`; ctx.fillRect(0, 0, SW, SH); }
    if (dt > 1.2) {
      const a = clamp01((dt - 1.2) / 0.3);
      ctx.save(); ctx.globalAlpha = a;
      let s = ease.back(clamp01((dt - 1.2) / 0.45)); ctx.save(); ctx.translate(SW / 2, 500); ctx.scale(s, s); outlined('WORTH IT?', 0, 0, 176, '#ffffff', '#12102e', 22); ctx.restore();
      s = ease.back(clamp01((dt - 1.55) / 0.45)); ctx.save(); ctx.translate(SW / 2, 650); ctx.scale(s, s); ctx.rotate(-0.02); outlined('FOLLOW FOR MORE', 0, 0, 108, '#ff6fa8', '#12102e', 18); ctx.restore();
      ctx.restore();
    }
  }
};
