// The "tour" cut (3 minutes, 1920x1080): a side-scrolling machine made of ~30 different mechanisms laid end to end.
// Every module is written in local coordinates (its entry is near x=0) and is placed by blk(ox, oy); the ball leaves one
// module and lands on the next module's entry ramp.  Real-time playback, the camera follows the action from module to module.
const { Sim, pl, V, FPS } = require('./engine');
const { plank, seg, rad } = require('./machine');

function build(opts = {}) {
  const S = new Sim(26, { w: 1920, h: 1080 }, 400);
  S.hscroll = true;
  const hero = {};
  const M = { sim: S, hero, mods: [] };
  const blk = (ox, oy) => { S.setOrigin(ox, oy); return (x, y) => V(x + ox, y + oy); };
  const ground = S.add({ type: 'static', name: 'ground', style: 'sensor', fix: [] });

  // modules: name -> { n, ox, oy, cam:[dx, dy, scale] }; S.step(n) marks the moment a module starts and the camera follows
  const mods = M.mods;
  const reg = (name, ox, oy, cam) => { const m = { n: mods.length + 1, name, ox, oy, cam }; mods.push(m); return m; };
  // a sensor near a module's entry starts it when one of the named balls touches it
  const enter = (m, box, only) => {
    const tag = 'E' + m.n;
    S.trigger(tag, () => S.step(m.n, m.name), true, only);
    S.add({ type: 'static', style: 'sensor', fix: [{ box, sensor: true, tag }] });
  };
  const ball = (x, y, r, name, hue, o = {}) => S.add(Object.assign({ type: 'dynamic', x, y, mat: 'steel', style: 'ball', name, hero: true, hue, bullet: true,
    fix: [{ c: [0, 0, r], d: o.d || 2, f: 0.35, e: o.e !== undefined ? o.e : 0.3 }] }, o.def || {}));

  // a plate that stays up until one of the named balls touches it, then the motor pushes it down (so a light, fast ball still presses it)
  const plateSensor = (P, cx, top, name, only, travel = 0.45) => {
    const p = S.add({ type: 'dynamic', x: cx, y: top + 0.25, mat: 'red', style: 'button', name, z: 2, fixedRot: true, fix: [{ box: [0, 0, 1.6, 0.25], d: 0.4, f: 0.5 }] });
    const j = S.joint(pl.PrismaticJoint({ enableLimit: true, lowerTranslation: 0, upperTranslation: travel, enableMotor: true, motorSpeed: -3, maxMotorForce: 36 }, ground.body, p.body, P(cx, top + 0.25), V(0, 1)));
    S.add({ type: 'static', mat: 'metal', style: 'post', name: name + 'Base', fix: [{ box: [cx, top + 1.9, 1.9, 0.9] }] });
    const tag = 'PL_' + name;
    S.trigger(tag, () => { j.setMotorSpeed(4); j.setMaxMotorForce(400); }, true, only);
    S.add({ type: 'static', style: 'sensor', fix: [{ box: [cx, top - 0.5, 1.4, 0.7], sensor: true, tag }] });
    return { p, j };
  };

  // ============================================================ 1. CLAW + NEWTON'S CRADLE: the flung ball leaves to the right
  let m = reg('CRADLE', 0, 0, [14, 8, 0.95]);
  {
    const m1 = m;
    const P = blk(0, 0);
    const beam = S.add({ type: 'static', mat: 'metal', style: 'beam', name: 'beam', fix: [{ box: [9.3, 1.1, 5.6, 0.5] }] });
    const L = 7, R = 0.7, ay = 1.7, by = ay + L, th = rad(opts.th || 26);
    const cradle = [];
    for (let i = 0; i < 5; i++) {
      const bx = 6.0 + i * 1.404, first = i === 0;
      const px = first ? bx - L * Math.sin(th) : bx, py = first ? ay + L * Math.cos(th) : by;
      const b = S.add({ type: first ? 'static' : 'dynamic', rec: true, x: px, y: py, mat: 'steel', style: 'cradle', name: 'cradle', bullet: true,
        fix: [{ c: [0, 0, R], d: 4, f: 0.05, e: 1.0 }] });
      S.joint(pl.DistanceJoint({ frequencyHz: 0, dampingRatio: 0 }, beam.body, b.body, P(bx, ay), P(px, py)));
      S.link({ kind: 'vrope', pts: [{ x: bx - 0.5, y: ay - 0.2 }, { i: b, x: 0, y: 0 }], w: 0.06 });
      S.link({ kind: 'vrope', pts: [{ x: bx + 0.5, y: ay - 0.2 }, { i: b, x: 0, y: 0 }], w: 0.06 });
      cradle.push(b);
    }
    const c1 = { x: 6.0 - L * Math.sin(th), y: ay + L * Math.cos(th) };
    const claw = S.add({ type: 'visual', x: c1.x, y: c1.y - 1.0, mat: 'metal', style: 'claw', name: 'claw', z: 5, fix: [{ box: [0, 0, 0.5, 0.5] }] });
    const tStart = opts.tStart !== undefined ? opts.tStart : 4.5;
    S.at(tStart, s => { cradle[0].body.setType('dynamic'); cradle[0].body.setAwake(true); s.sound('release', c1.x, c1.y, 1); s.step(m1.n, m1.name); });
    S.every(t => { const k = Math.min(1, Math.max(0, (t - tStart) / 0.35)); claw.body.setTransform(P(c1.x, c1.y - 1.0 - 2.6 * k), -k); });
    const Tx = 6.0 + 4 * 1.404 + R + 0.62 + 0.05;
    hero.T = ball(Tx, by, 0.62, 'T', 200, { d: opts.td || 2, e: 0.35 });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'tpost', fix: [{ box: [Tx, by + 0.62 + 1.5, 0.55, 1.5] }] });
  }

  // ============================================================ 2. SKIPPING STONES: rubber pads, one note each
  m = reg('PADS', 15.0, 12.6, [12, 6, 0.95]);
  {
    blk(m.ox, m.oy);
    const n = 7, pitch = opts.pitch || 4.0, drop = opts.drop || 1.6;
    enter(m, [2.0, -1.4, 2.4, 0.8], ['T']);
    for (let i = 0; i < n; i++) {
      const x = i === 0 ? 0 : 6.6 + (i - 1) * pitch, w = i === 0 ? 5.0 : 3.2, y = i * drop;
      S.add({ type: 'static', mat: 'rubber', style: 'pad', name: 'pad', hue: 330 - i * 40, fix: [{ box: [x + w / 2, y + 0.25, w / 2, 0.25], f: 0.2, e: 0.78 }] });
      S.add({ type: 'static', mat: 'metal', style: 'post', name: 'padPost', z: -1, fix: [{ box: [x + w / 2, y + 2.6, 0.2, 2.2], sensor: true }] });
    }
  }

  // ============================================================ 3. PINBALL: six bumpers, then the ball drains through the gap at the bottom
  m = reg('PINBALL', 48.5, 26.0, [9, 8, 1.0]);
  {
    blk(m.ox, m.oy);
    enter(m, [2.0, 0.0, 2.2, 1.0], ['T']);
    plank(S, 0, 0, 5.0, 1.6, 0.5, { name: 'chute', f: 0.2 });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'pinL', fix: [{ box: [4.2, 9.5, 0.3, 7.5] }] });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'pinR', fix: [{ box: [14.2, 7.0, 0.3, 10.0] }] });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'pinRoof', fix: [{ box: [10.0, -2.4, 4.2, 0.3] }] });
    const bump = [[6.3, 4.6, 20], [10.6, 5.2, 150], [8.4, 8.4, 280], [12.9, 9.4, 200], [6.0, 11.0, 60], [9.6, 12.6, 330]];
    bump.forEach(([x, y, h], i) => S.add({ type: 'static', x, y, mat: 'rubber', style: 'bumper', name: 'bumper' + i, hue: h, fix: [{ c: [0, 0, 0.9], f: 0.1, e: 0.95 }] }));
    plank(S, 4.5, 14.4, 8.2, 16.2, 0.5, { name: 'pinFloorL', f: 0.1 });
    plank(S, 13.9, 14.4, 9.8, 16.2, 0.5, { name: 'pinFloorR', f: 0.1 });
    plank(S, 7.0, 19.0, 14.0, 21.0, 0.5, { name: 'pinExit', f: 0.3 });
  }

  // ============================================================ 4. DOMINO WAVE: one rainbow run; the last (tall) domino pushes the bowling ball off the shelf
  const nDom = opts.nDom || 34, dsp = 0.76, dx0 = 6.8;
  const shelfEnd = dx0 + (nDom - 1) * dsp + 1.63 + 2.0;
  m = reg('DOMINOES', 64.5, 50.0, [16, 3, 0.9]);
  {
    blk(m.ox, m.oy);
    enter(m, [2.0, -0.2, 2.4, 1.0], ['T']);
    plank(S, 0, 0, 5.0, 2.0, 0.5, { name: 'dEntry', f: 0.3 });
    plank(S, 5.0, 2.0, shelfEnd, 2.0, 0.6, { name: 'dShelf', f: 0.5 });
    for (let i = 0; i < nDom; i++) {
      const last = i === nDom - 1, h = last ? 2.4 : 1.6, w = last ? 0.36 : 0.3;
      S.add({ type: 'dynamic', x: dx0 + i * dsp, y: 2.0 - h / 2, mat: 'domino', style: 'domino', name: 'domino', hue: (i / nDom) * 320,
        fix: [{ box: [0, 0, w / 2, h / 2], d: last ? 2.2 : 1.3, f: 0.5, e: 0.0 }] });
    }
    hero.B = ball(dx0 + (nDom - 1) * dsp + 1.63, 2.0 - 0.9, 0.9, 'B', 340, { d: 3.5, e: 0.12 });
  }

  // ============================================================ 5. STRIKE: the bowling ball rolls down a lane into a pyramid of crates, then drops onto a plate
  m = reg('STRIKE', 64.5 + shelfEnd + 0.4, 53.2, [12, 6, 0.95]);
  let plateInfo;
  {
    const P = blk(m.ox, m.oy);
    enter(m, [2.4, -0.6, 1.2, 0.8], ['B']);
    plank(S, 0, 0, 10.0, 1.5, 0.5, { name: 'lane', f: 0.3 });
    plank(S, 10.0, 1.5, 21.4, 1.5, 0.5, { name: 'lane2', f: 0.3 });
    for (let i = 0; i < 7; i++)
      S.add({ type: 'dynamic', x: 12.5 + i * 1.6, y: 1.5 - 0.9, mat: 'wood', style: 'bowlpin', name: 'bowlpin', fix: [{ box: [0, 0, 0.3, 0.9], d: 0.5, f: 0.3, e: 0.1 }] });
    // a plate at the end of the lane: the ball drops 2.5 m onto it
    const plateX = 23.4, plateTop = 4.0;
    const plate = S.add({ type: 'dynamic', x: plateX, y: plateTop + 0.25, mat: 'red', style: 'button', name: 'plate', z: 2, fixedRot: true, fix: [{ box: [0, 0, 1.6, 0.25], d: 2.5, f: 0.5 }] });
    const pj = S.joint(pl.PrismaticJoint({ enableLimit: true, lowerTranslation: 0, upperTranslation: 0.45, enableMotor: true, motorSpeed: -3, maxMotorForce: 150 },
      ground.body, plate.body, P(plateX, plateTop + 0.25), V(0, 1)));
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'baffle', fix: [{ box: [25.3, plateTop - 1.5, 0.3, 2.3], e: 0.05 }] });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'plateBase', fix: [{ box: [plateX, plateTop + 1.9, 1.9, 0.9] }, { box: [plateX - 1.9 - 0.2, plateTop + 0.9, 0.2, 0.3] }] });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'strikeWall', fix: [{ box: [27.0, -3.0, 0.3, 8.0] }] });
    plateInfo = { pj, plateX, plateTop, ox: m.ox, oy: m.oy };
  }

  // ============================================================ 6. CATAPULT: the plate starts a motor on the arm, which lobs a gold ball to the right
  m = reg('CATAPULT', plateInfo.ox, plateInfo.oy, [30, 12, 0.8]);
  const catapultLand = { x: 0, y: 0 };
  {
    const P = blk(m.ox, m.oy);
    const cpx = plateInfo.plateX - 3.8, cpy = plateInfo.plateTop + 10.3, a0 = rad(140), a1 = rad(240);
    const arm = S.add({ type: 'dynamic', x: cpx, y: cpy, a: a0, mat: 'wood', style: 'arm', name: 'arm', z: 3,
      fix: [{ box: [2.5, 0, 2.7, 0.2], d: 1.5, f: 0.5 }, { box: [-0.4, 0, 0.5, 0.2], d: 1.5, f: 0.5 }, { box: [5.0, 0.55, 0.12, 0.5], d: 1, f: 0.5 }] });
    const armJ = S.joint(pl.RevoluteJoint({ enableLimit: true, lowerAngle: 0, upperAngle: a1 - a0, enableMotor: false, motorSpeed: 0, maxMotorTorque: 0 }, ground.body, arm.body, P(cpx, cpy)));
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'catapultBase', fix: [{ poly: [[cpx - 0.4, cpy + 0.5], [cpx + 0.4, cpy + 0.5], [cpx + 1.2, cpy + 4], [cpx - 1.2, cpy + 4]] }] });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'armRest', fix: [{ box: [cpx - 5.7, cpy + 4.55, 0.8, 0.3] }] });
    hero.L = ball(cpx + 4.3 * Math.cos(a0) - 0.7 * Math.sin(a0), cpy + 4.3 * Math.sin(a0) + 0.7 * Math.cos(a0), 0.5, "L", 45, { d: 1.2, e: 0.08 });
    let fired = false;
    S.every(() => {
      if (!fired && plateInfo.pj.getJointTranslation() > 0.3) {
        fired = true; S.step(m.n, m.name); armJ.enableMotor(true); armJ.setMotorSpeed(3.4); armJ.setMaxMotorTorque(8000); S.sound('trigger', plateInfo.plateX, plateInfo.plateTop, 1);
      }
    });
  }

  // frame of the tall pulley / Plinko / wheel / counterweight tower (local coordinates as in the vertical machine)
  const F1 = { x: 119.8, y: 38.4 };
  const pulleysDeco = [];

  // ============================================================ 7. PULLEY GATE: the gold ball hits a wall, slides down a funnel into a bucket whose weight hauls up a gate
  const mPG = reg('PULLEY GATE', F1.x, F1.y, [14, 50, 0.9]);
  const mPL = reg('PLINKO', F1.x, F1.y, [11, 70, 0.8]);
  {
    const P = blk(F1.x, F1.y);
    plank(S, 14.8, 44.4, 17.8, 49.2, 0.5, { name: 'funL', f: 0.2 });
    plank(S, 23.4, 44.4, 20.6, 49.2, 0.5, { name: 'funR', f: 0.2 });
    enter(mPG, [19.2, 49.6, 1.5, 0.6], ['L']);
    const bkx = 19.2, bky = 51.6;
    const bucket = S.add({ type: 'dynamic', x: bkx, y: bky, mat: 'blue', style: 'bucket', name: 'bucket', z: 2, fixedRot: true,
      fix: [{ box: [0, 0.8, 1.72, 0.12], d: 0.9, f: 0.5 }, { box: [-1.6, 0, 0.12, 0.92], d: 0.9, f: 0.3 }, { box: [1.6, 0, 0.12, 0.92], d: 0.9, f: 0.3 }] });
    const gateX = 11.7, gateY0 = 57.1, gateH = 1.45;
    const gate = S.add({ type: 'dynamic', x: gateX, y: gateY0, mat: 'red', style: 'gate', name: 'gate', z: 2, fix: [{ box: [0, 0, 0.16, gateH], d: 2.05, f: 0.0 }] });
    S.joint(pl.PrismaticJoint({ enableLimit: true, lowerTranslation: -2.9, upperTranslation: 0 }, ground.body, gate.body, P(gateX, gateY0), V(0, 1)));
    S.joint(pl.PulleyJoint({}, bucket.body, gate.body, P(bkx, 49.4), P(gateX, 49.4), P(bkx, bky - 0.92), P(gateX, gateY0 - gateH), 1));
    S.link({ kind: 'rope', pts: [{ i: bucket, x: -1.6, y: -0.92 }, { x: bkx, y: 49.4 }], w: 0.07 });
    S.link({ kind: 'rope', pts: [{ i: bucket, x: 1.6, y: -0.92 }, { x: bkx, y: 49.4 }, { x: gateX, y: 49.4 }, { i: gate, x: 0, y: -gateH }], w: 0.07 });
    pulleysDeco.push({ x: bkx + F1.x, y: 49.4 + F1.y, r: 0.55 }, { x: gateX + F1.x, y: 49.4 + F1.y, r: 0.55 });
    S.add({ type: 'static', mat: 'metal', style: 'bar', name: 'pulleybar', z: -1, fix: [{ box: [(bkx + gateX) / 2, 49.4, (bkx - gateX) / 2 + 0.6, 0.15], sensor: true }] });
    // hopper with 32 balls behind the gate
    const hfy = x => 56.0 + (x - 2.4) * 0.276;
    plank(S, 2.4, 56.0, 11.1, 58.4, 0.5, { name: 'hopperFloor', f: 0.1 });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'hopperL', fix: [{ box: [2.0, 52.4, 0.3, 6.2] }] });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'hopperR', fix: [{ box: [11.3, 50.9, 0.2, 4.6] }] });
    plank(S, 11.1, 58.4, 15.2, 59.6, 0.5, { name: 'chute', f: 0.1 });
    M.balls = [];
    for (let row = 0; row < 8; row++) for (let k = 0; k < 8; k++) {
      const x = 3.2 + k * 1.0 + (row % 2) * 0.45, y = hfy(x) - 0.62 - row * 0.9;
      M.balls.push(S.add({ type: 'dynamic', x, y, mat: 'ball', style: 'ball', name: 'pball', hue: ((k * 3 + row * 40) * 13) % 360, fix: [{ c: [0, 0, 0.42], d: 1.0, f: 0.15, e: 0.45 }], ad: 0.1 }));
    }
    // plinko
    enter(mPL, [16.0, 61.5, 2.2, 0.6], ['pball']);
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'plinkoL', fix: [{ box: [3.1, 70.5, 0.3, 11.0] }] });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'plinkoR', fix: [{ box: [18.9, 69.25, 0.3, 12.25] }] });
    const pdx = 2.533;
    for (let r = 0; r < 9; r++) {
      const y = 62.8 + r * 1.75, even = r % 2 === 0;
      for (let j = -3; j <= (even ? 3 : 2); j++)
        S.add({ type: 'static', x: 11 + (even ? j : j + 0.5) * pdx, y, mat: 'peg', style: 'peg', name: 'peg', fix: [{ c: [0, 0, 0.22], f: 0.1, e: 0.5 }] });
    }
    plank(S, 3.3, 78.6, 9.8, 82.0, 0.5, { name: 'fun1', f: 0.2 });
    plank(S, 18.7, 78.6, 12.4, 82.0, 0.5, { name: 'fun2', f: 0.2 });
  }

  // ============================================================ 8b. WINDMILLS: the balls spin two free paddle wheels on their way down
  const DW = 16;
  const mWM = reg('WINDMILLS', F1.x, F1.y, [11, 90, 0.9]);
  {
    blk(F1.x, F1.y);
    enter(mWM, [11.1, 84.2, 2.0, 0.6], ['pball']);
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'wmL', fix: [{ box: [3.1, 90.0, 0.3, 8.2] }] });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'wmR', fix: [{ box: [19.0, 90.0, 0.3, 8.2] }] });
    const mill = (x, y, hue) => {
      const fx = [{ c: [0, 0, 0.5], d: 2, f: 0.3 }];
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; fx.push(seg(0.4 * Math.cos(a), 0.4 * Math.sin(a), 2.7 * Math.cos(a), 2.7 * Math.sin(a), 0.32, { d: 1.0, f: 0.3, e: 0.2 })); }
      const wm = S.add({ type: 'dynamic', x, y, mat: 'wood', style: 'windmill', name: 'windmill', hue, z: 1, fix: fx, ad: 0.25 });
      S.joint(pl.RevoluteJoint({ enableMotor: true, motorSpeed: 0, maxMotorTorque: 3 }, ground.body, wm.body, V(x + F1.x, y + F1.y)));
      return wm;
    };
    mill(9.4, 88.0, 200); mill(14.6, 93.0, 320);
  }


  // ============================================================ 8-9. WATER WHEEL -> collector -> bucket drops and lifts a counterweight
  let cw, cwJ; const cwTop = 99.6, cwBot = 107.6, cwx = 2.9;
  const mWH = reg('WATER WHEEL', F1.x, F1.y + DW, [12, 92, 0.85]);
  const mCW = reg('COUNTERWEIGHT', F1.x, F1.y + DW, [10, 101, 0.85]);
  const mHA = reg('HATCH', 138.5, 160.0, [0, 8, 0.85]);
  const mBG = reg('BUMPER GARDEN', 138.5, 175.0, [0, 0, 0.85]);
  const mTR = reg('TRAMPOLINES', 138.5, 199.0, [0, 0, 0.85]);
  const mPW = reg('PINWHEELS', 138.5, 218.0, [0, 0, 0.85]);
  const mZZ = reg('ZIGZAG TRAYS', 138.5, 238.0, [0, 0, 0.85]);
  const mXY = reg('XYLOPHONE SLIDES', 138.5, 258.0, [0, 0, 0.85]);
  const mDI = reg('DIAMONDS', 138.5, 277.0, [0, 0, 0.85]);
  const mSB = reg('SWINGING BARS', 138.5, 296.0, [0, 0, 0.85]);
  const mFP = reg('FLOOD PLATE', 138.5, 306.0, [0, 0, 0.95]);
  let floodPlate = null;
  {
    const P = blk(F1.x, F1.y + DW);
    enter(mWH, [11.1, 83.0, 1.5, 0.5], ['pball']);
    const wx = 12.8, wy = 86.2, wfix = [{ c: [0, 0, 0.9], d: 2, f: 0.3 }];
    for (let i = 0; i < 8; i++) {
      const ph = i * Math.PI / 4, c = Math.cos(ph), sn = Math.sin(ph), ha = ph + rad(118);
      wfix.push(seg(0.6 * c, 0.6 * sn, 3.3 * c, 3.3 * sn, 0.2, { d: 1.2, f: 0.3 }));
      wfix.push(seg(3.3 * c, 3.3 * sn, 3.3 * c + 1.15 * Math.cos(ha), 3.3 * sn + 1.15 * Math.sin(ha), 0.2, { d: 1.2, f: 0.3 }));
    }
    const wheel = S.add({ type: 'dynamic', x: wx, y: wy, mat: 'wood', style: 'wheel', name: 'wheel', z: 1, fix: wfix, ad: 0.15 });
    S.joint(pl.RevoluteJoint({ enableMotor: true, motorSpeed: 0, maxMotorTorque: 14 }, ground.body, wheel.body, P(wx, wy)));
    enter(mCW, [17.5, 96.8, 2.0, 0.6], ['pball']);
    plank(S, 3.6, 92.8, 16.3, 95.4, 0.5, { name: 'collector', f: 0.15 });
    plank(S, 0.4, 91.9, 3.6, 92.8, 0.5, { name: 'collectorIn', f: 0.15 });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'bucketShaft', fix: [{ box: [16.05, 102.5, 0.2, 7.0] }] });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'bucketWallR', fix: [{ box: [21.6, 95.0, 0.3, 15.2] }] });
    const b2x = 18.7, b2y = 98.0;
    const bucket2 = S.add({ type: 'dynamic', x: b2x, y: b2y, mat: 'teal', style: 'bucket', name: 'bucket2', z: 2, ld: 0.9, fixedRot: true,
      fix: [{ box: [-2.0, 0, 0.14, 1.25], d: 2.4, f: 0.3 }, { box: [2.0, 0, 0.14, 1.25], d: 2.4, f: 0.3 }] });
    // the floor is a hatch hinged at the left, held shut by a rope until the weight has reached the top
    const hatch = S.add({ type: 'dynamic', x: b2x - 2.1 + 2.15, y: b2y + 1.15, mat: 'teal', style: 'bucket', name: 'hatch', z: 2, ld: 0.9, fix: [{ box: [0, 0, 2.15, 0.14], d: 2.4, f: 0.4 }] });
    S.joint(pl.RevoluteJoint({ enableLimit: true, lowerAngle: 0, upperAngle: 1.5 }, bucket2.body, hatch.body, P(b2x - 2.1, b2y + 1.15)));
    const hLatch = S.world.createJoint(pl.DistanceJoint({ frequencyHz: 0 }, bucket2.body, hatch.body, P(b2x + 2.0, b2y - 1.25), P(b2x + 2.0, b2y + 1.15)));
    const hLink = S.link({ kind: 'rope', pts: [{ i: bucket2, x: 2.0, y: -1.25 }, { i: hatch, x: 2.0 - (-0.05), y: 0 }], w: 0.06 });
    S.every(() => {
      if (hLatch && !hLatch.opened && cwJ.getJointTranslation() < (cwTop - cwBot) + 0.15) {
        hLatch.opened = true; S.world.destroyJoint(hLatch); hLink.to = S.f + 1; hLink.cutAt = S.f; hLink.cut = true; S.step(mHA.n, mHA.name); S.sound('release', b2x + F1.x, b2y + F1.y + DW + 8, 1);
      }
    });
    cw = S.add({ type: 'dynamic', x: cwx, y: cwBot, mat: 'purple', style: 'weight', name: 'cw', z: 2, ld: 0.9, fix: [{ box: [0, 0, 1.1, 1.25], d: 2.1, f: 0.3 }] });
    cwJ = S.joint(pl.PrismaticJoint({ enableLimit: true, lowerTranslation: cwTop - cwBot, upperTranslation: 0 }, ground.body, cw.body, P(cwx, cwBot), V(0, 1)));
    const pY = 92.0;
    S.joint(pl.PulleyJoint({}, bucket2.body, cw.body, P(b2x, pY), P(cwx, pY), P(b2x, b2y - 1.25), P(cwx, cwBot - 1.25), 1));
    S.link({ kind: 'rope', z: -1, pts: [{ i: bucket2, x: -2.0, y: -1.25 }, { x: b2x, y: pY }], w: 0.08 });
    S.link({ kind: 'rope', z: -1, pts: [{ i: bucket2, x: 2.0, y: -1.25 }, { x: b2x, y: pY }, { x: cwx, y: pY }, { i: cw, x: 0, y: -1.25 }], w: 0.08 });
    pulleysDeco.push({ x: b2x + F1.x, y: pY + F1.y + DW, r: 0.6 }, { x: cwx + F1.x, y: pY + F1.y + DW, r: 0.6 });
    S.add({ type: 'static', mat: 'metal', style: 'bar', name: 'pulleybar2', z: -1, fix: [{ box: [(b2x + cwx) / 2, pY, (b2x - cwx) / 2 + 0.6, 0.15], sensor: true }] });
    S.add({ type: 'static', mat: 'metal', style: 'rail', name: 'cwrail', z: -1, fix: [{ box: [cwx, 103.6, 0.12, 5.4], sensor: true }] });
    S.add({ type: 'static', style: 'pulleydeco', name: 'sp', z: 1, deco: { kind: 'wheel', r: 0.35 }, x: cwx, y: 96.6, fix: [] });
  }

  // ============================================================ 9b. BUMPER GARDEN: the hatch opens and 32 balls bounce down through big rubber bumpers onto a plate
  {
    const P = blk(0, 0);
    const xc = 138.5, y0 = 168.0;
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'bgL', fix: [{ box: [xc - 10.2, 176.5, 0.3, 11.5] }] });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'bgR', fix: [{ box: [xc + 10.2, 176.5, 0.3, 11.5] }] });
    let k = 0;
    for (let r = 0; r < 6; r++) {
      const xs = r % 2 === 0 ? [-8, -4, 0, 4, 8] : [-6, -2, 2, 6];
      for (const dx of xs) S.add({ type: 'static', x: xc + dx, y: y0 + r * 2.4, mat: 'rubber', style: 'bumper', name: 'bumper', hue: (k++ * 47) % 360, fix: [{ c: [0, 0, 0.9], f: 0.1, e: 0.85 }] });
    }
    enter(mBG, [xc, y0 - 2.0, 6.0, 0.8], ['pball']);
    plank(S, xc - 9.6, 183.4, xc - 1.1, 187.2, 0.5, { name: 'bgFunL', f: 0.1 });
    plank(S, xc + 9.6, 183.4, xc + 1.1, 187.2, 0.5, { name: 'bgFunR', f: 0.1 });
    // three more courses for the same 64 balls, one under the other between two tall walls
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'cwL', fix: [{ box: [xc - 10.2, 247.5, 0.3, 60.0] }] });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'cwR', fix: [{ box: [xc + 10.2, 247.5, 0.3, 60.0] }] });
    const funnel = (yTop, yNeck, nm) => { plank(S, xc - 9.9, yTop, xc - 1.1, yNeck, 0.5, { name: nm + 'L', f: 0.1 }); plank(S, xc + 9.9, yTop, xc + 1.1, yNeck, 0.5, { name: nm + 'R', f: 0.1 }); };
    // 1) rubber trampolines, alternately tilted
    enter(mTR, [xc, 189.5, 6.0, 0.8], ['pball']);
    [[-4.5, 194.0, 0.22], [4.5, 199.0, -0.22], [-3.5, 204.0, 0.22]].forEach(([dx, y, ang], i) =>
      S.add({ type: 'static', mat: 'rubber', style: 'pad', name: 'tramp', hue: 330 - i * 70, x: xc + dx, y, a: ang, fix: [{ box: [0, 0, 2.8, 0.25], f: 0.15, e: 0.8 }] }));
    funnel(207.6, 211.4, 'trF');
    // 2) pinwheels
    enter(mPW, [xc, 212.5, 4.0, 0.8], ['pball']);
    const mill = (x, y, hue) => {
      const fx = [{ c: [0, 0, 0.55], d: 2, f: 0.3 }];
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; fx.push(seg(0.4 * Math.cos(a), 0.4 * Math.sin(a), 3.0 * Math.cos(a), 3.0 * Math.sin(a), 0.34, { d: 1.0, f: 0.3, e: 0.2 })); }
      const wm = S.add({ type: 'dynamic', x, y, mat: 'wood', style: 'windmill', name: 'windmill', hue, z: 1, fix: fx, ad: 0.25 });
      S.joint(pl.RevoluteJoint({ enableMotor: true, motorSpeed: 0, maxMotorTorque: 3 }, ground.body, wm.body, V(x, y)));
    };
    mill(xc - 3.6, 217.0, 40); mill(xc + 3.6, 222.0, 160);
    funnel(226.0, 229.8, 'pwF');
    // 3) zig-zag trays
    enter(mZZ, [xc, 231.0, 4.0, 0.8], ['pball']);
    plank(S, xc - 9.9, 233.0, xc + 4.5, 236.4, 0.5, { name: 'zz1', f: 0.1 });
    plank(S, xc + 9.9, 239.4, xc - 4.5, 242.8, 0.5, { name: 'zz2', f: 0.1 });
    funnel(244.6, 247.6, 'zzF');
    // 4) a rainbow xylophone slide, left to right and back
    enter(mXY, [xc, 249.5, 4.0, 0.8], ['pball']);
    const keys = (x1, y1, x2, y2, n, nm) => {
      for (let i = 0; i < n; i++) {
        const ax = x1 + (x2 - x1) * i / n, ay = y1 + (y2 - y1) * i / n, bx = x1 + (x2 - x1) * (i + 1) / n, by = y1 + (y2 - y1) * (i + 1) / n;
        const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy), th = 0.5, ux = dy / len, uy = -dx / len;
        S.add({ type: 'static', mat: 'wood', style: 'pad', name: nm, hue: (i / (n - 1)) * 300, fix: [{ box: [(ax + bx) / 2 - ux * th / 2, (ay + by) / 2 - uy * th / 2, len / 2 + 0.01, th / 2, Math.atan2(dy, dx)], f: 0.1, e: 0.05 }] });
      }
    };
    keys(xc - 9.9, 252.0, xc + 3.0, 255.6, 10, 'xyA');
    keys(xc + 9.9, 259.6, xc - 3.0, 263.2, 10, 'xyB');
    funnel(265.0, 268.4, 'xyF');
    // 5) a lattice of small bumpers
    enter(mDI, [xc, 269.5, 4.0, 0.8], ['pball']);
    let kk = 0;
    for (let r = 0; r < 7; r++) {
      const n = r % 2 === 0 ? 7 : 6, x0 = xc - (n - 1) * 1.3;
      for (let i = 0; i < n; i++) S.add({ type: 'static', x: x0 + i * 2.6, y: 272.0 + r * 2.0, mat: 'rubber', style: 'bumper', name: 'bumper', hue: (kk++ * 29 + 180) % 360, fix: [{ c: [0, 0, 0.55], f: 0.1, e: 0.9 }] });
    }
    funnel(286.2, 289.6, 'diF');
    // 6) a curtain of swinging bars
    enter(mSB, [xc, 291.0, 4.0, 0.8], ['pball']);
    S.add({ type: 'static', mat: 'metal', style: 'beam', name: 'sbBeam', fix: [{ box: [xc, 291.5, 9.9, 0.3], sensor: true }] });
    for (let i = 0; i < 12; i++) {
      const bx = xc - 8.25 + i * 1.5;
      const bar = S.add({ type: 'dynamic', x: bx, y: 291.9, mat: 'gold', style: 'chime', name: 'swingbar', hue: (i * 31 + 20) % 360, z: 1, ad: 0.4, fix: [{ box: [0, 1.6, 0.18, 1.6], d: 0.5, f: 0.2, e: 0.2 }] });
      S.joint(pl.RevoluteJoint({ enableLimit: true, lowerAngle: -1.2, upperAngle: 1.2 }, ground.body, bar.body, V(bx, 291.9)));
    }
    funnel(299.6, 303.0, 'sbF');
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'fpL', fix: [{ box: [xc - 2.4, 305.2, 0.25, 2.6] }] });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'fpR', fix: [{ box: [xc + 2.4, 305.2, 0.25, 2.6] }] });
    {
      const cx = xc, top = 307.2;
      const p = S.add({ type: 'dynamic', x: cx, y: top + 0.25, mat: 'red', style: 'button', name: 'plateFlood', z: 2, fixedRot: true, fix: [{ box: [0, 0, 1.6, 0.25], d: 0.4, f: 0.5 }] });
      const j = S.joint(pl.PrismaticJoint({ enableLimit: true, lowerTranslation: 0, upperTranslation: 0.45, enableMotor: true, motorSpeed: -3, maxMotorForce: 300 }, ground.body, p.body, P(cx, top + 0.25), V(0, 1)));
      S.add({ type: 'static', mat: 'metal', style: 'post', name: 'plateFloodBase', fix: [{ box: [cx, top + 1.9, 1.9, 0.9] }] });
      floodPlate = { p, j };
    }
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'fpFloor', fix: [{ box: [xc, 310.4, 2.9, 0.4] }] });
    enter(mFP, [xc, 305.2, 2.0, 0.8], ['pball']);
  }

  // ============================================================ 10. TRIPWIRE: the rising weight pulls a pin out from under a ball
  const mTW = reg('TRIPWIRE', F1.x + 24, F1.y + DW, [4, 100, 0.95]);
  let tripExit = { x: 0, y: 0 };
  {
    const P = blk(F1.x + 24, F1.y + DW);
    plank(S, 4.8, 100.3, 7.5, 100.6, 0.5, { name: 'shelf0' });
    hero.G = ball(7.0, 99.95, 0.55, 'G', 165, { d: 1.4, e: 0.3 });
    const pin = S.add({ type: 'kinematic', x: 7.78, y: 99.65, mat: 'metal', style: 'pin', name: 'pin', z: 1, fix: [{ box: [0, 0, 0.16, 0.8] }] });
    let pinT = null, held = 0;
    S.every(t => {
      if (floodPlate && floodPlate.j.getJointTranslation() > 0.38) held++; else held = 0;
      if (pinT === null && held > 90) { pinT = t; S.step(mTW.n, mTW.name); S.sound('release', 7.7 + F1.x + 24, 99.6 + F1.y + DW, 1); }
      const k = pinT === null ? 0 : Math.min(1, (t - pinT) / 0.2);
      pin.body.setTransform(P(7.78, 99.65 + 2.6 * k), 0);
    });
    plank(S, 7.7, 102.5, 16.0, 106.0, 0.5, { name: 'legA' });
    tripExit = { x: F1.x + 24 + 16.0, y: F1.y + DW + 106.0 };
  }

  // ============================================================ 11. CHIMES: the ball sweeps through a curtain of hanging bars
  const mCH = reg('CHIMES', 0, 0, [175, 163, 0.9]);
  {
    blk(0, 0);
    enter(mCH, [162.0, 163.0, 2.0, 1.4], ['G']);
    plank(S, 161.0, 163.2, 165.5, 165.95, 0.5, { name: 'chEntry', f: 0.2 });
    plank(S, 165.5, 165.95, 182.0, 166.6, 0.5, { name: 'chFloor', f: 0.3 });
    S.add({ type: 'static', mat: 'metal', style: 'beam', name: 'chBeam', fix: [{ box: [174.0, 161.8, 6.8, 0.3] }] });
    for (let i = 0; i < 8; i++) {
      const bx = 168.5 + i * 1.5;
      const bar = S.add({ type: 'dynamic', x: bx, y: 162.4, mat: 'gold', style: 'chime', name: 'chime' + i, hue: 40 + i * 38, z: 1, ad: 0.5,
        fix: [{ box: [0, 1.7, 0.16, 1.7], d: 0.12, f: 0.2, e: 0.2 }] });
      S.joint(pl.RevoluteJoint({ enableLimit: true, lowerAngle: -1.35, upperAngle: 1.35 }, ground.body, bar.body, V(bx, 162.4)));
    }
  }

  // ============================================================ 11b. ROPE BRIDGE: twelve hinged planks sag under the ball
  const mRB = reg('ROPE BRIDGE', 0, 0, [188.5, 168, 0.95]);
  {
    blk(0, 0);
    enter(mRB, [183.5, 165.5, 1.5, 1.2], ['G']);
    const N = 12, len = 1.09, x0 = 182.2, y0 = 166.75, x1 = 195.0, y1 = 170.15, pls = [];
    for (let i = 0; i < N; i++) {
      const t = (i + 0.5) / N;
      pls.push(S.add({ type: 'dynamic', x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, mat: 'wood', style: 'plank', name: 'rb' + i, z: 1, ad: 0.8, ld: 0.2, fix: [{ box: [0, 0, len / 2, 0.15], d: 0.6, f: 0.6, e: 0 }] }));
    }
    S.joint(pl.RevoluteJoint({}, ground.body, pls[0].body, V(x0, y0)));
    for (let i = 0; i < N - 1; i++) { const t = (i + 1) / N; S.joint(pl.RevoluteJoint({}, pls[i].body, pls[i + 1].body, V(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t))); }
    S.joint(pl.RevoluteJoint({}, pls[N - 1].body, ground.body, V(x1, y1)));
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'rbPostL', fix: [{ box: [x0 - 0.6, y0 + 3.9, 0.4, 2.5] }] });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'rbPostR', fix: [{ box: [x1 + 0.4, y1 + 3.9, 0.4, 2.5] }] });
  }

  // ============================================================ 12. TEETER-TOTTER: the ball climbs a plank balanced on a pivot and tips it
  const mTE = reg('TEETER', 194.6, 104.0, [12, 70, 0.95]);
  {
    const P = blk(194.6, 104.0);
    enter(mTE, [6.0, 66.0, 2.5, 1.0], ['G']);
    plank(S, 0.4, 66.0, 12.0, 68.3, 0.5, { name: 'ZL2', f: 0.4 });
    const tx = 15.0, ty = 68.1, th0 = rad(-12);
    const tee = S.add({ type: 'dynamic', x: tx, y: ty, a: th0, mat: 'wood', style: 'plank', name: 'teeter', z: 2,
      fix: [{ box: [0, 0, 2.8, 0.2], d: 0.7, f: 0.5 }, { box: [-2.4, 0.3, 0.3, 0.3], d: 3, f: 0.5 }] });
    S.joint(pl.RevoluteJoint({ enableLimit: true, lowerAngle: 0, upperAngle: rad(24) }, ground.body, tee.body, P(tx, ty)));
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'teeterPost', fix: [{ poly: [[tx - 0.3, ty + 0.5], [tx + 0.3, ty + 0.5], [tx + 1.2, ty + 4], [tx - 1.2, ty + 4]] }] });
    plank(S, 17.9, 68.7, 23.5, 70.6, 0.5, { name: 'ZL3', f: 0.4 });
  }

  // ============================================================ 13. DRAWBRIDGE: the ball presses a plate, a rope lets go and the bridge drops across the gap just ahead of it
  const dbO = { x: 220.0, y: 174.8 };
  const mDB = reg('DRAWBRIDGE', dbO.x, dbO.y, [14, 3, 0.9]);
  {
    const P = blk(dbO.x, dbO.y);
    const gy = 2.0, hx = 17.0, ang0 = -1.3;
    enter(mDB, [2.0, 0.0, 2.2, 1.0], ['G']);
    plank(S, 0, 0, 5.4, gy, 0.5, { name: 'dbEntry', f: 0.3 });
    plank(S, 8.6, gy, hx, gy, 0.5, { name: 'dbB', f: 0.3 });
    const { j: pj } = plateSensor(P, 7.0, gy, 'dbPlate', ['G'], 0.2);
    const bridge = S.add({ type: 'dynamic', x: hx, y: gy + 0.25, a: ang0, mat: 'wood', style: 'plank', name: 'bridge', z: 1, fix: [{ box: [3.5, 0, 3.5, 0.25], d: 1.0, f: 0.5 }] });
    S.joint(pl.RevoluteJoint({ enableLimit: true, lowerAngle: 0, upperAngle: -ang0 }, ground.body, bridge.body, P(hx, gy + 0.25)));
    const tip = { x: hx + 7 * Math.cos(ang0), y: gy + 0.25 + 7 * Math.sin(ang0) };
    const rope = S.world.createJoint(pl.DistanceJoint({ frequencyHz: 0 }, ground.body, bridge.body, P(tip.x + 1.5, tip.y - 6.5), P(tip.x, tip.y)));
    const ropeLink = S.link({ kind: 'rope', pts: [{ x: tip.x + 1.5, y: tip.y - 6.5 }, { i: bridge, x: 7, y: 0 }], w: 0.09 });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'dbHook', z: 1, fix: [{ box: [tip.x + 1.5, tip.y - 6.7, 0.5, 0.2] }] });
    plank(S, hx + 7.0, gy, hx + 15.0, gy, 0.5, { name: 'dbC', f: 0.3 });
    // a rail of five steel balls: the ball hits the first one and the last one shoots off the end
    for (let i = 0; i < 5; i++) hero['N' + i] = ball(hx + 10.0 + i * 1.12, gy - 0.55, 0.55, 'N' + i, 190 + i * 25, { d: 1.4, e: 0.98, def: { fix: [{ c: [0, 0, 0.55], d: 1.4, f: 0.02, e: 0.98 }] } });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'dbPylon', z: -1, fix: [{ box: [hx, gy + 4.5, 0.4, 4.0], sensor: true }, { box: [hx + 7.3, gy + 4.5, 0.4, 4.0], sensor: true }] });
    let dropped = false;
    S.every(() => {
      if (!dropped && pj.getJointTranslation() > 0.12) {
        dropped = true; S.world.destroyJoint(rope); ropeLink.to = S.f + 1; ropeLink.cutAt = S.f; ropeLink.cut = true; S.sound('release', hx + dbO.x, gy + dbO.y, 1);
      }
    });
  }

  // ============================================================ 14. DOMINO STAIRS: a rainbow run cascades down four steps; the last domino pushes a bowling ball on
  const sO = { x: 258.5, y: 179.6 };
  const mDS = reg('DOMINO STAIRS', sO.x, sO.y, [14, 2, 0.9]);
  const nTread = 9, tread = 7.0, rise = 0.8;
  const stairsEnd = { x: sO.x + nTread * tread + 1.5, y: sO.y + (nTread - 1) * rise };
  const stairDoms = [];
  {
    blk(sO.x, sO.y);
    plank(S, -5.0, -1.8, 0.0, 0.0, 0.5, { name: 'dsEntry', f: 0.3 });
    enter(mDS, [-2.5, -0.6, 2.4, 0.9], ['G', 'N4']);
    for (let k = 0; k < nTread; k++) {
      const last = k === nTread - 1, len = last ? tread + 3.0 : tread;
      plank(S, k * tread, k * rise, k * tread + len, k * rise, 0.5, { name: 'tread' + k, f: 0.5 });
      for (let i = 0; i < 9; i++) {
        const lastDom = last && i === 8, h = lastDom ? 2.4 : 1.6, w = lastDom ? 0.36 : 0.3;
        stairDoms.push(S.add({ type: 'dynamic', x: k * tread + 0.4 + i * 0.76, y: k * rise - h / 2, mat: 'domino', style: 'domino', name: 'domino', hue: ((k * 9 + i) / (nTread * 9)) * 320,
          fix: [{ box: [0, 0, w / 2, h / 2], d: lastDom ? 2.2 : 1.3, f: 0.5, e: 0 }] }));
      }
    }
    hero.H = ball((nTread - 1) * tread + 0.4 + 8 * 0.76 + 1.63, (nTread - 1) * rise - 0.9, 0.9, 'H', 330, { d: 2.0, e: 0.12 });
  }

  // ============================================================ 15. HALF-PIPE: the bowling ball swoops down a ramp, through a round bowl and out the other side
  const hO = { x: sO.x + (nTread - 1) * tread + tread + 3.0, y: sO.y + (nTread - 1) * rise };
  const mHP = reg('HALF-PIPE', hO.x + 14, hO.y + 4, [0, 0, 0.9]);
  const bowl = { cx: 0, cy: 0, R: 6.0, rim: { x: 0, y: 0 } };
  {
    blk(0, 0);
    const slope = 0.364, rimX = hO.x + 15.6, rimY = hO.y + 15.6 * slope;
    plank(S, hO.x, hO.y, rimX, rimY, 0.5, { name: 'hpRamp', f: 0.3 });
    enter(mHP, [hO.x + 2.5, hO.y + 0.4, 2.5, 1.0], ['H']);
    const R = bowl.R, th0 = Math.atan(slope);                    // the arc starts tangent to the ramp
    const a0 = Math.PI / 2 + th0;                                  // angle of the left rim point seen from the centre (y down)
    const cx = rimX + R * Math.cos(a0 - Math.PI), cy = rimY - R * Math.sin(a0 - Math.PI);
    Object.assign(bowl, { cx, cy });
    // centre so that the left rim point is (rimX, rimY): P = C + R(cos a0, sin a0) -> C = P - R(cos a0, sin a0)
    const Cx = rimX - R * Math.cos(a0), Cy = rimY - R * Math.sin(a0);
    const pts = [], a1 = Math.PI / 2 - th0 - rad(10), n = 18;       // right side stops a little lower than the entry
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([Cx + (R + 0.25) * Math.cos(a), Cy + (R + 0.25) * Math.sin(a)]); }
    const fx = [];
    for (let i = 0; i < n; i++) fx.push(Object.assign(seg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 0.5, {}), { f: 0.3, e: 0.05 }));
    S.add({ type: 'static', mat: 'wood', style: 'plank', name: 'bowl', fix: fx });
    bowl.rim = { x: pts[n][0], y: pts[n][1] };
    bowl.cx = Cx; bowl.cy = Cy;
  }

  // ============================================================ 14-19. FINALE: plate -> wrecking ball -> tower -> ball -> plate -> scissors -> anvil -> heart
  const FX = hO.x + 35.5, FY = hO.y - 104.9;
  const mPN = reg('PENDULUM', FX, FY, [12, 126, 0.95]);
  const mTO = reg('TOWER', FX, FY, [12, 128, 0.95]);
  const mFR = reg('FINAL RAMP', FX, FY, [10, 134, 0.95]);
  const mSN = reg('SNIP', FX, FY, [12, 140, 0.95]);
  const mAN = reg('ANVIL', FX, FY, [15.4, 150, 0.9]);
  const mHE = reg('HEART', FX, FY, [15.4, 152, 0.8]);
  let snipped = false, closing = null, sciss, anvilBody;
  {
    const P = blk(FX, FY);
    const anvX = 15.4, anvTop = 136.5, btnX = anvX, btnY = 163.0;
    plank(S, -6.0, 118.9, 3.4, 121.6, 0.5, { name: 'finEntry', f: 0.3 });
    const P3b = plateSensor(P, 7.6, 124.2, 'plate3', ['G', 'H']);
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'baffle3', fix: [{ box: [9.9, 122.9, 0.3, 1.5] }] });
    const pax = 14.0, pay = 123.2, PL = 7.0, th0 = rad(48);
    const bx0 = pax + PL * Math.sin(th0), by0 = pay + PL * Math.cos(th0);
    const bob = S.add({ type: 'static', rec: true, x: bx0, y: by0, mat: 'steel', style: 'cradle', name: 'bob', hero: true, bullet: true, fix: [{ c: [0, 0, 1.1], d: 6, f: 0.3, e: 0.2 }] });
    hero.bob = bob;
    S.joint(pl.DistanceJoint({ frequencyHz: 0 }, ground.body, bob.body, P(pax, pay), P(bx0, by0)));
    S.link({ kind: 'rope', pts: [{ x: pax, y: pay }, { i: bob, x: 0, y: 0 }], w: 0.08 });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'pbracket', z: 1, fix: [{ box: [pax, pay - 0.15, 0.55, 0.25] }] });
    const claw2 = S.add({ type: 'visual', x: bx0, y: by0 - 1.5, mat: 'metal', style: 'claw', name: 'claw2', z: 5, deco: { s: 1.5, rod: 3 }, fix: [{ box: [0, 0, 0.5, 0.5] }] });
    let relT = null;
    S.every(t => {
      if (relT === null && P3b.j.getJointTranslation() > 0.3) { relT = t; S.step(mPN.n, mPN.name); bob.body.setType('dynamic'); bob.body.setAwake(true); S.sound('release', bx0 + FX, by0 + FY, 1); }
      const k = relT === null ? 0 : Math.min(1, (t - relT) / 0.35);
      claw2.body.setTransform(P(bx0, by0 - 1.5 - 2.4 * k), k);
    });
    plank(S, 6.5, 131.4, 12.4, 131.4, 0.6, { name: 'shelf3' });
    plank(S, 12.7, 132.6, 22.0, 134.2, 0.4, { name: 'catch3' });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'catchWall', fix: [{ box: [22.6, 131.0, 0.3, 3.2], e: 0.1 }] });
    for (let i = 0; i < 6; i++)
      S.add({ type: 'dynamic', x: 11.0, y: 131.4 - 0.5 - i * 1.002 - 0.002, mat: 'wood', style: 'block', name: 'block', hue: 20 + i * 48, fix: [{ box: [0, 0, 0.7, 0.5], d: 1.0, f: 0.6, e: 0 }] });
    enter(mTO, [12.0, 130.4, 0.5, 1.0], ['bob']);
    hero.K = ball(7.5, 131.4 - 0.6, 0.6, 'K', 25, { d: 3.0, e: 0.25 });
    plank(S, 0.4, 134.4, 8.8, 137.2, 0.5, { name: 'R6' });
    enter(mFR, [6.0, 134.8, 1.8, 0.8], ['K']);
    const P4 = plateSensor(P, 11.4, 140.0, 'plate4', ['K']);
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'baffle4', fix: [{ box: [13.55, 138.6, 0.2, 1.9] }] });
    anvilBody = S.add({ type: 'dynamic', x: anvX, y: anvTop + 3.3 + 0.9, mat: 'metal', style: 'anvil', name: 'anvil', z: 2, bullet: true, hero: true, fix: [{ box: [0, 0, 1.35, 0.9], d: 4, f: 0.4 }] });
    hero.anvil = anvilBody;
    const ropeJ = S.world.createJoint(pl.DistanceJoint({ frequencyHz: 0 }, ground.body, anvilBody.body, P(anvX, anvTop), P(anvX, anvTop + 3.3)));
    const ropeLink = S.link({ kind: 'rope', pts: [{ x: anvX, y: anvTop }, { i: anvilBody, x: 0, y: -0.9 }], w: 0.09 });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'hook', z: 1, fix: [{ box: [anvX, anvTop - 0.2, 0.5, 0.2] }] });
    sciss = S.add({ type: 'visual', x: anvX, y: anvTop + 1.2, mat: 'metal', style: 'scissors', name: 'scissors', z: 4, fix: [{ box: [0, 0, 0.4, 0.4] }] });
    const snipNow = () => { snipped = true; sciss.body.setTransform(P(anvX, anvTop + 1.2), 0); S.world.destroyJoint(ropeJ); ropeLink.to = S.f + 1; ropeLink.cutAt = S.f; ropeLink.cut = true; S.step(mSN.n, mSN.name); S.sound('snip', anvX + FX, anvTop + 1.2 + FY, 1); };
    S.every(t => {
      if (closing === null && !snipped && P4.j.getJointTranslation() > 0.25) closing = t;
      if (snipped) return;
      const k = closing === null ? 1 : Math.max(0, 1 - (t - closing) / 0.22);
      sciss.body.setTransform(P(anvX, anvTop + 1.2), k);
      if (closing !== null && k <= 0) snipNow();
    });
    enter(mAN, [anvX, btnY - 14.0, 1.8, 0.6], ['anvil']);
    const btn = S.add({ type: 'dynamic', x: btnX, y: btnY + 0.35, mat: 'red', style: 'bigbutton', name: 'btn', z: 2, fixedRot: true, fix: [{ box: [0, 0, 2.6, 0.35], d: 3, f: 0.5 }] });
    const bj = S.joint(pl.PrismaticJoint({ enableLimit: true, lowerTranslation: 0, upperTranslation: 0.8, enableMotor: true, motorSpeed: -4, maxMotorForce: 300 }, ground.body, btn.body, P(btnX, btnY + 0.35), V(0, 1)));
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'btnBase', fix: [{ box: [btnX, btnY + 3.4, 3.4, 1.3] }, { box: [btnX - 3.0, btnY + 1.0, 0.4, 1.0] }, { box: [btnX + 3.0, btnY + 1.0, 0.4, 1.0] }] });
    S.add({ type: 'static', style: 'sign', name: 'likeSign', z: -2, x: btnX, y: btnY - 10.0, deco: { kind: 'heart', r: 4.2 }, fix: [] });
    let pressed = false;
    S.every(() => {
      if (!pressed && snipped && bj.getJointTranslation() > 0.5) {
        pressed = true; M.pressedAt = S.f; S.step(mHE.n, mHE.name); S.sound('like', btnX + FX, btnY + FY, 1);
        S.events.push({ t: S.vt(), type: 'finale', x: btnX + FX, y: btnY + FY });
      }
    });
  }

  for (const p of pulleysDeco) S.add({ type: 'static', style: 'pulleydeco', name: 'pulley', z: 1, deco: { kind: 'wheel', r: p.r }, x: p.x, y: p.y, fix: [] });

  // ------------------------------------------------------------ camera + pace
  const WIDE = { cx: 190, cy: 150, s: 0.085 };                    // the whole machine in one frame: the opening shot and the final pull-back
  const farthest = sim => { let n = 0; for (const st of sim.steps) if (st.n > n) n = st.n; return n; };
  Object.assign(S.camState, { cx: WIDE.cx, tcx: WIDE.cx, cy: WIDE.cy, ty: WIDE.cy, s: WIDE.s, ts: WIDE.s });
  // brief slow motion on the big moments: module name -> [from, to, rate] in seconds after the module starts
  const SLOW = { 'CRADLE': [0, 2.0, 0.5], 'STRIKE': [0.6, 2.4, 0.5], 'CATAPULT': [0, 2.0, 0.5], 'HATCH': [0, 2.0, 0.5], 'DRAWBRIDGE': [0, 2.0, 0.5],
    'PENDULUM': [0, 1.8, 0.5], 'TOWER': [0, 2.0, 0.5], 'SNIP': [0, 0.7, 0.5], 'ANVIL': [0, 1.3, 0.5] };
  const base = opts.rate || 0.8;
  S.timeScale = (t, sim) => {
    const n = farthest(sim); if (!n) return 1;
    const w = SLOW[mods[n - 1].name]; if (!w) return base;
    const st = sim.steps.find(x => x.n === n), dt = (sim.f - st.f) / FPS;
    return dt >= w[0] && dt < w[1] ? w[2] : base;
  };
  let cutDone = false;
  S.camFn = (c, sim) => {
    const n = farthest(sim), md = mods[Math.max(1, n) - 1];
    c.tcx = md.ox + md.cam[0]; c.ty = md.oy + md.cam[1]; c.ts = md.cam[2]; c.k = 2.4;
    if (sim.f < 45) { c.tcx = WIDE.cx; c.ty = WIDE.cy; c.ts = WIDE.s; c.k = 5; }                 // hold the wide shot for the first 1.5 s, then drop in on the claw
    if (md === mTW && !cutDone) { cutDone = true; c.cx = c.tcx; c.cy = c.ty; c.s = c.ts; }          // the next ball is far away: cut instead of pan
    if (md === mSN || md === mAN) { c.ty = Math.min(FY + 156, Math.max(FY + 146, anvilBody.body.getPosition().y + 5)); c.k = 6; }
    if (md === mHE) c.k = 1.4;
    if (md === mDS) {                                                                          // follow the front of the domino wave down the stairs
      let front = sO.x; for (const d of stairDoms) if (Math.abs(d.body.getAngle()) > 0.3) front = Math.max(front, d.body.getPosition().x);
      const kk = Math.min(nTread - 1, Math.max(0, Math.floor((front - sO.x) / tread)));
      c.tcx = Math.min(sO.x + nTread * tread - 12, Math.max(sO.x + 14, front + 7)); c.ty = sO.y + kk * rise + 2.2; c.k = 2.2;
    }
    if (M.pressedAt !== undefined && sim.f > M.pressedAt + 100) { c.tcx = WIDE.cx; c.ty = WIDE.cy; c.ts = WIDE.s; c.k = 0.9; }   // final pull-back
  };
  M.tail = 11.0;                                  // heart held ~3 s, then the camera pulls back to show the whole machine
  return M;
}

module.exports = { build };
