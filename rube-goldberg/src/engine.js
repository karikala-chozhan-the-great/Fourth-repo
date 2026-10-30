// Tiny scene/recording layer on top of Planck (Box2D).  Units: metres, y points DOWN.  1 m = 50 px at camera scale 1.
// The sim is stepped at 120 Hz and sampled at 30 fps; every non-static body pose, every collision and the camera
// path are recorded so the browser renderer and the audio synthesiser both work from one timeline.json.
const pl = require('planck');
const V = pl.Vec2;

const FPS = 30, SUB = 120, PPM = 50, W = 21.6;      // world is 21.6 m wide  ->  1080 px
const r3 = v => Math.round(v * 1000) / 1000;

class Sim {
  constructor(gravity = 26, view = { w: 1080, h: 1920 }, worldW = W) {
    this.view = view; this.worldW = worldW; this.ox = 0; this.oy = 0;     // ox/oy: origin offset applied to everything added next
    this.world = new pl.World({ gravity: V(0, gravity) });
    this.items = [];           // render + audio metadata for every body
    this.links = [];           // ropes / rods / springs (drawn only)
    this.events = [];          // collisions + scripted sounds
    this.steps = [];           // numbered machine steps for the HUD
    this.frames = [];          // pose snapshots
    this.cam = [];             // [cx, cy, scale, shakeX, shakeY, roll]
    this.roll = [];            // per-frame rolling-noise level (0..1) for the audio mix
    this.f = 0; this.t = 0; this.subIdx = 0; this.subsPerFrame = 4;
    this.timers = []; this.triggers = new Map(); this.pending = [];
    this.camState = { cx: worldW / 2, cy: 19.2, s: 1, ty: 19.2, ts: 1, k: 3.2, trauma: 0, punch: 0 };
    this.camFn = null;
    this.timeScale = () => 1;
    this.flags = {};
    this.world.on('begin-contact', c => this._contact(c));
  }

  // ---------------------------------------------------------------- building
  // def: {type, x, y, a, mat, style, fix:[...], bullet, ld, ad, hero, name, hue, tag, fixedRot}
  // fix: {c:[x,y,r]} | {box:[cx,cy,hw,hh,ang]} | {poly:[[x,y]...]} + {d,f,e,sensor,tag}
  add(def) {
    const type = def.type || 'static';
    const body = this.world.createBody({
      type: type === 'visual' ? 'kinematic' : type, position: V((def.x || 0) + this.ox, (def.y || 0) + this.oy), angle: def.a || 0,
      bullet: !!def.bullet, linearDamping: def.ld || 0, angularDamping: def.ad || 0, fixedRotation: !!def.fixedRot,
      allowSleep: def.sleep !== undefined ? def.sleep : false,
    });
    const item = {
      id: this.items.length, body, type: def.rec ? 'dynamic' : type, mat: def.mat || 'wood', style: def.style || '', name: def.name || '',
      hue: def.hue, hero: !!def.hero, shapes: [], x: (def.x || 0) + this.ox, y: (def.y || 0) + this.oy, a: def.a || 0, z: def.z || 0, deco: def.deco,
    };
    body.setUserData(item);
    for (const fx of def.fix || []) this._fixture(item, body, fx, type === 'visual');
    this.items.push(item);
    return item;
  }

  _fixture(item, body, fx, visual) {
    let shape, rs;
    if (fx.c) { shape = pl.Circle(V(fx.c[0], fx.c[1]), fx.c[2]); rs = { t: 'c', x: fx.c[0], y: fx.c[1], r: fx.c[2] }; }
    else {
      let pts;
      if (fx.box) {
        const [cx, cy, hw, hh, ang = 0] = fx.box, ca = Math.cos(ang), sa = Math.sin(ang);
        pts = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([px, py]) => [cx + px * ca - py * sa, cy + px * sa + py * ca]);
      } else pts = fx.poly;
      shape = pl.Polygon(pts.map(p => V(p[0], p[1])));
      rs = { t: 'p', pts: pts.map(p => [r3(p[0]), r3(p[1])]) };
    }
    if (fx.col) rs.col = fx.col;
    if (fx.part) rs.part = fx.part;
    item.shapes.push(rs);
    body.createFixture(shape, {
      density: fx.d !== undefined ? fx.d : 1, friction: fx.f !== undefined ? fx.f : 0.5, restitution: fx.e || 0,
      isSensor: visual || !!fx.sensor, userData: { tag: fx.tag, mat: fx.mat, item },
      filterCategoryBits: fx.cat !== undefined ? fx.cat : 1, filterMaskBits: fx.mask !== undefined ? fx.mask : 0xffff,
    });
  }

  joint(j, link) { this.world.createJoint(j); if (link) this.link(link); return j; }

  // pts: [{i:item|null, x, y}] polyline; i given -> local to that item, else world.
  link(def) {
    const l = { id: this.links.length, kind: def.kind || 'rope', w: def.w || 0.1, col: def.col, from: def.from || 0, to: def.to === undefined ? 1e9 : def.to,
      cut: !!def.cut, pts: def.pts.map(p => ({ i: p.i ? p.i.id : -1, x: p.i ? p.x : p.x + this.ox, y: p.i ? p.y : p.y + this.oy })), n: def.n, z: def.z || 0 };
    this.links.push(l); return l;
  }

  // ---------------------------------------------------------------- scripting
  at(sec, fn) { this.timers.push({ t: sec, fn, done: false }); }
  every(fn) { this.timers.push({ t: -1, fn, done: false, every: true }); }
  trigger(tag, fn, once = true, only = null) { this.triggers.set(tag, { fn, once, fired: false, only }); }
  later(fn) { this.pending.push(fn); }
  sound(name, x, y, v = 1, extra = {}) { this.events.push({ t: this.vt(), type: 'sfx', name, x: r3(x), y: r3(y), v: r3(v), ...extra }); }
  step(n, label, camY) {                       // numbered HUD step
    this.steps.push({ f: this.f, n, label });
    if (camY !== undefined) this.camState.ty = camY;
    return n;
  }
  shake(a) { this.camState.trauma = Math.min(1, this.camState.trauma + a); }
  punch(a) { this.camState.punch = Math.max(this.camState.punch, a); }
  vt() { return r3((this.f + this.subIdx / this.subsPerFrame) / FPS); }

  _contact(c) {
    const fa = c.getFixtureA(), fb = c.getFixtureB();
    const ua = fa.getUserData() || {}, ub = fb.getUserData() || {};
    for (const [u, o] of [[ua, ub], [ub, ua]]) {
      if (u.tag && this.triggers.has(u.tag) && (fa.isSensor() || fb.isSensor())) {
        const tr = this.triggers.get(u.tag);
        if (tr.once && tr.fired) continue;
        if (o.item && o.item.type === 'dynamic' && (!tr.only || tr.only.includes(o.item.name))) {
          tr.fired = true; const who = o.item; this.later(() => tr.fn(who));
        }
      }
    }
    if (fa.isSensor() || fb.isSensor()) return;
    const ba = fa.getBody(), bb = fb.getBody();
    const m = c.getWorldManifold(null); if (!m || !m.points[0]) return;
    const p = m.points[0], n = m.normal;
    const va = ba.getLinearVelocityFromWorldPoint(p), vb = bb.getLinearVelocityFromWorldPoint(p);
    const rel = (vb.x - va.x) * n.x + (vb.y - va.y) * n.y;
    const slide = Math.abs(-(vb.x - va.x) * n.y + (vb.y - va.y) * n.x);
    const v = Math.abs(rel);
    if (v < 0.9) return;
    const ia = ua.item, ib = ub.item;
    this.events.push({ t: this.vt(), type: 'hit', x: r3(p.x), y: r3(p.y), v: r3(v), s: r3(slide), a: ia ? ia.id : -1, b: ib ? ib.id : -1,
      ma: ua.mat || (ia && ia.mat), mb: ub.mat || (ib && ib.mat), ka: ia && ia.name, kb: ib && ib.name });
  }

  // ---------------------------------------------------------------- running
  stepFrame() {
    const rate = this.timeScale(this.t, this);
    this.subAcc = (this.subAcc || 0) + rate * SUB / FPS;                     // fractional rates: some frames take one sub-step fewer (4 -> 3.6 on average at 0.9x)
    this.subsPerFrame = Math.max(1, Math.floor(this.subAcc + 1e-9)); this.subAcc -= this.subsPerFrame;
    for (let s = 0; s < this.subsPerFrame; s++) {
      this.subIdx = s;
      this.t += 1 / SUB;
      for (const tm of this.timers) {
        if (tm.every) tm.fn(this.t, this);
        else if (!tm.done && this.t >= tm.t) { tm.done = true; tm.fn(this); }
      }
      this.world.step(1 / SUB, 14, 8);
      while (this.pending.length) this.pending.shift()(this);
    }
    this.subIdx = 0;
    this._camera(1 / FPS);
    this._record();
    this.f++;
  }

  _camera(dt) {
    const c = this.camState;
    if (this.camFn) this.camFn(c, this);
    const k = 1 - Math.exp(-c.k * dt);
    c.cy += (c.ty - c.cy) * k; c.s += (c.ts - c.s) * k;
    if (c.tcx !== undefined) c.cx += (c.tcx - c.cx) * k;
    c.trauma = Math.max(0, c.trauma - dt * 1.6); c.punch = Math.max(0, c.punch - dt * 2.2);
    const sh = c.trauma * c.trauma, tt = this.f / FPS;
    this.cam.push([r3(c.cx), r3(c.cy), r3(c.s * (1 + c.punch * 0.035)),
      r3(sh * 0.45 * Math.sin(tt * 61.3)), r3(sh * 0.45 * Math.sin(tt * 47.9 + 1.3)), r3(sh * 0.012 * Math.sin(tt * 39.1 + 2.1))]);
  }

  _record() {
    let lvl = 0;
    for (const it of this.items) {
      if (it.style !== 'ball' || it.type !== 'dynamic') continue;
      let touching = false;
      for (let c = it.body.getContactList(); c; c = c.next) {
        const ct = c.contact; if (ct.isTouching() && !ct.getFixtureA().isSensor() && !ct.getFixtureB().isSensor()) { touching = true; break; }
      }
      if (touching) { const v = this.speed(it); if (v > 0.8) lvl += Math.min(1, v / 14) * (it.shapes[0].r > 0.8 ? 1.0 : 0.45); }
    }
    this.roll.push(r3(Math.min(1, lvl)));
    const fr = [];
    for (const it of this.items) {
      if (it.type === 'static') continue;
      const p = it.body.getPosition();
      fr.push(r3(p.x), r3(p.y), r3(it.body.getAngle()));
    }
    this.frames.push(fr);
  }

  Vo(x, y) { return V(x + this.ox, y + this.oy); }          // a point in the current block's coordinates, as a world Vec2
  setOrigin(x, y) { this.ox = x; this.oy = y; }

  // item helpers ------------------------------------------------------
  pos(it) { const p = it.body.getPosition(); return [p.x, p.y]; }
  speed(it) { const v = it.body.getLinearVelocity(); return Math.hypot(v.x, v.y); }

  export() {
    return {
      fps: FPS, ppm: PPM, W: this.worldW, vw: this.view.w, vh: this.view.h, hscroll: !!this.hscroll,
      items: this.items.map(it => ({ id: it.id, type: it.type, mat: it.mat, style: it.style, name: it.name, hue: it.hue, hero: it.hero, z: it.z,
        x: r3(it.x), y: r3(it.y), a: r3(it.a), shapes: it.shapes, deco: it.deco })),
      dyn: this.items.filter(i => i.type !== 'static').map(i => i.id),
      links: this.links, events: this.events, steps: this.steps, cam: this.cam, frames: this.frames, roll: this.roll,
    };
  }
}

module.exports = { Sim, pl, V, FPS, SUB, PPM, W };
