// The machine.  Coordinates in metres, y down, x 0..21.6.  Each stage hands the "hero" ball to the next one.
const { Sim, pl, V, W } = require('./engine');

const rad = d => d * Math.PI / 180;
// plank whose TOP surface runs p1 -> p2
function plank(sim, x1, y1, x2, y2, th = 0.5, o = {}) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), dxn = dx / len, dyn = dy / len;
  const ux = dyn, uy = -dxn, mx = (x1 + x2) / 2 - ux * th / 2, my = (y1 + y2) / 2 - uy * th / 2;
  return sim.add({ type: 'static', mat: o.mat || 'wood', style: o.style || 'plank', name: o.name || 'plank', z: o.z,
    fix: [{ box: [mx, my, len / 2, th / 2, Math.atan2(dy, dx)], f: o.f !== undefined ? o.f : 0.45, e: o.e || 0.05 }] });
}

// rectangle fixture from segment a->b
function seg(ax, ay, bx, by, th, o = {}) {
  const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy), nx = -dy / l * th / 2, ny = dx / l * th / 2;
  return Object.assign({ poly: [[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]] }, o);
}

function build(opts = {}) {
  const S = new Sim(26);
  const hero = {};
  const M = { sim: S, hero };

  // ------------------------------------------------------------ frame: steel columns left/right
  S.add({ type: 'static', mat: 'metal', style: 'column', name: 'colL', fix: [{ box: [-0.8, 120, 1.2, 130], f: 0.2, e: 0.12 }] });
  S.add({ type: 'static', mat: 'metal', style: 'column', name: 'colR', fix: [{ box: [22.4, 120, 1.2, 130], f: 0.2, e: 0.12 }] });

  // ============================================================ 1. NEWTON'S CRADLE
  const beam = S.add({ type: 'static', mat: 'metal', style: 'beam', name: 'beam', fix: [{ box: [10.8, 1.1, 10.4, 0.5] }] });
  const L = 7, R = 0.7, ay = 1.7, by = ay + L;
  const cradle = [];
  for (let i = 0; i < 5; i++) {
    const bx = 15.6 - i * 1.404;
    const first = i === 0;
    const th = rad(40);
    const px = first ? bx + L * Math.sin(th) : bx, py = first ? ay + L * Math.cos(th) : by;
    const b = S.add({ type: first ? 'static' : 'dynamic', rec: true, x: px, y: py, mat: 'steel', style: 'cradle', name: 'cradle', bullet: true, ad: 0.0, ld: 0.0,
      fix: [{ c: [0, 0, R], d: 4, f: 0.05, e: 1.0 }] });
    S.joint(pl.DistanceJoint({ frequencyHz: 0, dampingRatio: 0 }, beam.body, b.body, V(bx, ay), V(px, py)));
    S.link({ kind: 'vrope', pts: [{ x: bx - 0.5, y: ay - 0.2 }, { i: b, x: 0, y: 0 }], w: 0.06 });
    S.link({ kind: 'vrope', pts: [{ x: bx + 0.5, y: ay - 0.2 }, { i: b, x: 0, y: 0 }], w: 0.06 });
    cradle.push(b);
  }
  // robotic gripper (visual only) holds ball 1 until the machine starts
  const c1p = cradle[0].body.getPosition(), c1 = { x: c1p.x, y: c1p.y };   // copy: getPosition() is a live reference
  const claw = S.add({ type: 'visual', x: c1.x, y: c1.y - 1.0, mat: 'metal', style: 'claw', name: 'claw', z: 5,
    fix: [{ box: [0, 0, 0.5, 0.5] }] });
  const tStart = 0.9;
  S.at(tStart, s => {
    cradle[0].body.setType('dynamic'); cradle[0].body.setAwake(true);
    s.sound('release', c1.x, c1.y, 1); s.step(1, 'NEWTON\'S CRADLE');
  });
  S.every(t => {   // claw opens + retreats
    const k = Math.min(1, Math.max(0, (t - tStart) / 0.35));
    claw.body.setTransform(V(c1.x, c1.y - 1.0 - 2.6 * k), k);
  });

  // target ball T on a post, to the LEFT of the cradle
  const T = S.add({ type: 'dynamic', x: 15.6 - 4 * 1.404 - R - 0.62 - 0.05, y: by, mat: 'steel', style: 'ball', name: 'T', hero: true, bullet: true,
    hue: 200, fix: [{ c: [0, 0, 0.62], d: 2, f: 0.35, e: 0.35 }] });
  const tp = T.body.getPosition();
  S.add({ type: 'static', mat: 'metal', style: 'post', name: 'tpost', fix: [{ box: [tp.x, by + 0.62 + 1.5, 0.55, 1.5] }] });
  hero.T = T;

  // ============================================================ 2. LONG RAMP (rolling) - left column -> right
  plank(S, 0.4, 17.4, 17.2, 22.9, 0.5, { name: 'R1', e: 0.1 });
  S.trigger('S2', who => S.step(2, 'THE LONG ROLL'), true, ['T']);
  S.add({ type: 'static', style: 'sensor', fix: [{ box: [6.0, 19.0, 0.5, 1.5], sensor: true, tag: 'S2' }] });

  // ============================================================ 3. DOMINO RUN (right -> left)
  const P1y = 27.2;
  plank(S, 3.2, P1y, 21.2, P1y, 0.6, { name: 'P1', f: 0.5 });
  plank(S, 21.2, 24.7, 19.3, 26.5, 0.5, { name: 'R2', f: 0.4 });     // return ramp: ball bounces off the column and rolls back left
  plank(S, 19.3, 26.5, 18.2, 27.2, 0.5, { name: 'R2b', f: 0.4 });
  const nDom = 16, dh = 1.6, dw = 0.3, dsp = 0.76, dx0 = 16.6;
  M.dominos = [];
  for (let i = 0; i < nDom; i++) {
    const last = i === nDom - 1, h = last ? 2.4 : dh, w = last ? 0.36 : dw;
    const d = S.add({ type: 'dynamic', x: dx0 - i * dsp, y: P1y - h / 2, mat: 'domino', style: 'domino', name: 'domino', hue: (i / nDom) * 320,
      fix: [{ box: [0, 0, w / 2, h / 2], d: last ? 2.2 : 1.3, f: 0.5, e: 0.0 }], sleep: false });
    M.dominos.push(d);
  }
  S.trigger('S3', who => S.step(3, 'DOMINO RUN'), true, ['T']);
  S.add({ type: 'static', style: 'sensor', fix: [{ box: [dx0 + 0.9, P1y - 1, 0.3, 1], sensor: true, tag: 'S3' }] });

  // ============================================================ 4. BOWLING BALL: drops off the platform, rolls down ramp R3
  const Bb = S.add({ type: 'dynamic', x: 3.55, y: P1y - 0.9, mat: 'steel', style: 'ball', name: 'B', hero: true, hue: 340, bullet: true,
    fix: [{ c: [0, 0, 0.9], d: 2.0, f: 0.3, e: 0.12 }] });
  hero.B = Bb; M.B = Bb;
  plank(S, 0.4, 30.4, 9.4, 33.6, 0.5, { name: 'R3', f: 0.4 });
  S.trigger('S4', who => S.step(4, 'BOWLING BALL'), true, ['B']);
  S.add({ type: 'static', style: 'sensor', fix: [{ box: [2.2, 28.6, 1.2, 0.5], sensor: true, tag: 'S4' }] });

  // ============================================================ 5. PRESSURE PLATE -> CATAPULT
  const ground = S.add({ type: 'static', name: 'ground', style: 'sensor', fix: [] });
  M.ground = ground;
  const plateY = 36.7, plateX = 11.4;
  const plate = S.add({ type: 'dynamic', x: plateX, y: plateY + 0.25, mat: 'red', style: 'button', name: 'plate', z: 2, fixedRot: true,
    fix: [{ box: [0, 0, 1.6, 0.25], d: 2.5, f: 0.5 }] });
  const pj = S.joint(pl.PrismaticJoint({ enableLimit: true, lowerTranslation: 0, upperTranslation: 0.45, enableMotor: true, motorSpeed: -3, maxMotorForce: 150 },
    ground.body, plate.body, V(plateX, plateY + 0.25), V(0, 1)));
  S.add({ type: 'static', mat: 'metal', style: 'post', name: 'baffle', fix: [{ box: [13.3, 35.0, 0.3, 2.3], e: 0.05 }] });
  S.add({ type: 'static', mat: 'metal', style: 'post', name: 'plateBase', fix: [{ box: [plateX, plateY + 1.9, 1.9, 0.9] }, { box: [plateX - 1.9 - 0.2, plateY + 0.9, 0.2, 0.3] }] });

  const cpx = 7.6, cpy = 47.0, a0 = rad(140), a1 = rad(240);
  const arm = S.add({ type: 'dynamic', x: cpx, y: cpy, a: a0, mat: 'wood', style: 'arm', name: 'arm', z: 3,
    fix: [{ box: [2.5, 0, 2.7, 0.2], d: 1.5, f: 0.5 }, { box: [-0.4, 0, 0.5, 0.2], d: 1.5, f: 0.5 },
          { box: [5.0, 0.55, 0.12, 0.5], d: 1, f: 0.5 }] });
  const armJ = S.joint(pl.RevoluteJoint({ enableLimit: true, lowerAngle: 0, upperAngle: a1 - a0, enableMotor: false, motorSpeed: 0, maxMotorTorque: 0 },
    ground.body, arm.body, V(cpx, cpy)));
  S.add({ type: 'static', mat: 'metal', style: 'post', name: 'catapultBase', fix: [{ poly: [[cpx - 0.4, cpy + 0.5], [cpx + 0.4, cpy + 0.5], [cpx + 1.2, cpy + 4], [cpx - 1.2, cpy + 4]] }] });
  S.add({ type: 'static', mat: 'metal', style: 'post', name: 'armRest', fix: [{ box: [cpx - 5.7, cpy + 4.55, 0.8, 0.3] }] });
  // catch ramp for the flung ball
  plank(S, 11.4, 44.0, 19.6, 46.6, 0.5, { name: 'R4', f: 0.4 });
  const Lb = S.add({ type: 'dynamic', x: cpx + 4.3 * Math.cos(a0) - 0.7 * Math.sin(a0), y: cpy + 4.3 * Math.sin(a0) + 0.7 * Math.cos(a0), mat: 'steel', style: 'ball', name: 'L', hero: true, hue: 45, bullet: true,
    fix: [{ c: [0, 0, 0.5], d: 1.2, f: 0.4, e: 0.3 }] });
  hero.L = Lb; M.L = Lb;
  M.plate = plate; M.plateJ = pj; M.armJ = armJ;
  let fired = false;
  S.every(() => {
    if (!fired && pj.getJointTranslation() > 0.3) {
      fired = true; S.step(5, 'CATAPULT!', 47.0); S.shake(0.5);
      armJ.enableMotor(true); armJ.setMotorSpeed(3.4); armJ.setMaxMotorTorque(8000);
      S.sound('trigger', plateX, plateY, 1);
    }
  });

  // ============================================================ 6. PULLEY GATE: ball falls in bucket -> real Box2D pulley lifts the hopper gate
  S.trigger('S6', who => S.step(6, 'PULLEY GATE', 53), true, ['L']);
  S.add({ type: 'static', style: 'sensor', fix: [{ box: [19.2, 49.6, 1.5, 0.6], sensor: true, tag: 'S6' }] });
  const bkx = 19.2, bky = 51.6;
  const bucket = S.add({ type: 'dynamic', x: bkx, y: bky, mat: 'blue', style: 'bucket', name: 'bucket', z: 2, fixedRot: true,
    fix: [{ box: [0, 0.8, 1.72, 0.12], d: 0.9, f: 0.5 }, { box: [-1.6, 0, 0.12, 0.92], d: 0.9, f: 0.3 }, { box: [1.6, 0, 0.12, 0.92], d: 0.9, f: 0.3 }] });
  const gateX = 11.7, gateY0 = 57.275, gateH = 1.075;
  const gate = S.add({ type: 'dynamic', x: gateX, y: gateY0, mat: 'red', style: 'gate', name: 'gate', z: 2,
    fix: [{ box: [0, 0, 0.16, gateH], d: 2.7, f: 0.0 }] });
  S.joint(pl.PrismaticJoint({ enableLimit: true, lowerTranslation: -1.9, upperTranslation: 0 }, ground.body, gate.body, V(gateX, gateY0), V(0, 1)));
  const gA = V(bkx, 49.4), gB = V(gateX, 49.4);
  S.joint(pl.PulleyJoint({}, bucket.body, gate.body, gA, gB, V(bkx, bky - 0.92), V(gateX, gateY0 - gateH), 1));
  S.link({ kind: 'rope', pts: [{ i: bucket, x: -1.6, y: -0.92 }, { x: gA.x, y: gA.y }], w: 0.07 });
  S.link({ kind: 'rope', pts: [{ i: bucket, x: 1.6, y: -0.92 }, { x: gA.x, y: gA.y }, { x: gB.x, y: gB.y }, { i: gate, x: 0, y: -gateH }], w: 0.07 });
  M.pulleys = [{ x: gA.x, y: gA.y, r: 0.55 }, { x: gB.x, y: gB.y, r: 0.55 }];
  S.add({ type: 'static', mat: 'metal', style: 'bar', name: 'pulleybar', z: -1, fix: [{ box: [(gA.x + gB.x) / 2, 49.4, (gA.x - gB.x) / 2 + 0.6, 0.15], sensor: true }] });
  // hopper
  const hfy = x => 56.0 + (x - 2.4) * 0.276;
  plank(S, 2.4, 56.0, 11.1, 58.4, 0.5, { name: 'hopperFloor', f: 0.1 });
  S.add({ type: 'static', mat: 'metal', style: 'post', name: 'hopperL', fix: [{ box: [2.0, 55.2, 0.3, 3.4] }] });
  S.add({ type: 'static', mat: 'metal', style: 'post', name: 'hopperR', fix: [{ box: [11.3, 54.5, 0.2, 2.0] }] });
  plank(S, 11.1, 58.4, 15.2, 59.6, 0.5, { name: 'chute', f: 0.1 });
  M.balls = [];
  for (let row = 0; row < 3; row++) for (let k = 0; k < 8; k++) {
    const x = 3.2 + k * 1.0 + (row % 2) * 0.45, y = hfy(x) - 0.62 - row * 0.9;
    const b = S.add({ type: 'dynamic', x, y, mat: 'ball', style: 'ball', name: 'pball', hue: ((k * 3 + row * 40) * 13) % 360, bullet: false,
      fix: [{ c: [0, 0, 0.42], d: 1.0, f: 0.15, e: 0.45 }], ad: 0.1 });
    M.balls.push(b);
  }

  // ============================================================ 7. PLINKO
  S.trigger('S7', who => S.step(7, 'PLINKO', 69), true, ['pball']);
  S.add({ type: 'static', style: 'sensor', fix: [{ box: [14.5, 61.5, 2.0, 0.5], sensor: true, tag: 'S7' }] });
  S.add({ type: 'static', mat: 'metal', style: 'post', name: 'plinkoL', fix: [{ box: [3.1, 70.5, 0.3, 11.0] }] });
  S.add({ type: 'static', mat: 'metal', style: 'post', name: 'plinkoR', fix: [{ box: [18.9, 70.5, 0.3, 11.0] }] });
  const pdx = 2.533;
  for (let r = 0; r < 9; r++) {
    const y = 62.8 + r * 1.75, even = r % 2 === 0;
    for (let j = even ? -3 : -3; j <= (even ? 3 : 2); j++) {
      const x = 11 + (even ? j : j + 0.5) * pdx;
      S.add({ type: 'static', x, y, mat: 'peg', style: 'peg', name: 'peg', hue: (r * 36 + (j + 3) * 22) % 360, fix: [{ c: [0, 0, 0.22], f: 0.1, e: 0.5 }] });
    }
  }
  plank(S, 3.3, 78.6, 9.8, 82.0, 0.5, { name: 'fun1', f: 0.2 });
  plank(S, 18.7, 78.6, 12.4, 82.0, 0.5, { name: 'fun2', f: 0.2 });

  // ============================================================ 8. WATER WHEEL (balls from the plinko funnel push it round)
  S.trigger('S8', who => S.step(8, 'WATER WHEEL', 86), true, ['pball']);
  S.add({ type: 'static', style: 'sensor', fix: [{ box: [11.1, 83.0, 1.5, 0.5], sensor: true, tag: 'S8' }] });
  const wx = 12.8, wy = 86.2;
  const wfix = [{ c: [0, 0, 0.9], d: 2, f: 0.3 }];
  for (let i = 0; i < 8; i++) {
    const ph = i * Math.PI / 4, c = Math.cos(ph), sn = Math.sin(ph), ha = ph + rad(118);
    wfix.push(seg(0.6 * c, 0.6 * sn, 3.3 * c, 3.3 * sn, 0.2, { d: 1.2, f: 0.3 }));
    wfix.push(seg(3.3 * c, 3.3 * sn, 3.3 * c + 1.15 * Math.cos(ha), 3.3 * sn + 1.15 * Math.sin(ha), 0.2, { d: 1.2, f: 0.3 }));
  }
  const wheel = S.add({ type: 'dynamic', x: wx, y: wy, mat: 'wood', style: 'wheel', name: 'wheel', z: 1, fix: wfix, ad: 0.15 });
  S.joint(pl.RevoluteJoint({ enableMotor: true, motorSpeed: 0, maxMotorTorque: 14 }, ground.body, wheel.body, V(wx, wy)));
  M.wheel = wheel;
  S.add({ type: 'static', style: 'gear', name: 'gearA', z: -1, deco: { kind: 'gear', r: 1.7, teeth: 12, follow: wheel.id, ratio: -2.0, col: '#ffd23f', phase: 0.2 }, x: 4.0, y: 86.6, fix: [] });
  S.add({ type: 'static', style: 'gear', name: 'gearB', z: -1, deco: { kind: 'gear', r: 1.05, teeth: 8, follow: wheel.id, ratio: 3.2, col: '#2ee6c5', phase: 0.0 }, x: 6.35, y: 85.2, fix: [] });

  // ============================================================ 9. COUNTERWEIGHT (bucket fills, drops 8 m, lifts the counterweight)
  S.add({ type: 'static', style: 'sensor', fix: [{ box: [17.5, 96.8, 2.0, 0.6], sensor: true, tag: 'S9' }] });
  S.trigger('S9', who => S.step(9, 'COUNTERWEIGHT', 98), true, ['pball']);
  plank(S, 3.6, 92.8, 16.3, 95.4, 0.5, { name: 'collector', f: 0.15 });
  S.add({ type: 'static', mat: 'wood', style: 'post', name: 'collectLip', fix: [{ box: [3.3, 91.9, 0.25, 1.1] }] });
  const b2x = 18.7, b2y = 98.0;
  const bucket2 = S.add({ type: 'dynamic', x: b2x, y: b2y, mat: 'teal', style: 'bucket', name: 'bucket2', z: 2, ld: 0.9, fixedRot: true,
    fix: [{ box: [0, 1.15, 2.1, 0.14], d: 2.4, f: 0.4 }, { box: [-2.0, 0, 0.14, 1.25], d: 2.4, f: 0.3 }, { box: [2.0, 0, 0.14, 1.25], d: 2.4, f: 0.3 }] });
  const cwx = 2.9, cwBot = 107.6, cwTop = 99.6;
  const cw = S.add({ type: 'dynamic', x: cwx, y: cwBot, mat: 'purple', style: 'weight', name: 'cw', z: 2, ld: 0.9,
    fix: [{ box: [0, 0, 1.1, 1.25], d: 2.1, f: 0.3 }] });
  const cwJ = S.joint(pl.PrismaticJoint({ enableLimit: true, lowerTranslation: cwTop - cwBot, upperTranslation: 0 }, ground.body, cw.body, V(cwx, cwBot), V(0, 1)));
  const pY = 92.0, pA = V(b2x, pY), pB = V(cwx, pY);
  S.joint(pl.PulleyJoint({}, bucket2.body, cw.body, pA, pB, V(b2x, b2y - 1.25), V(cwx, cwBot - 1.25), 1));
  S.link({ kind: 'rope', z: -1, pts: [{ i: bucket2, x: -2.0, y: -1.25 }, { x: pA.x, y: pA.y }], w: 0.08 });
  S.link({ kind: 'rope', z: -1, pts: [{ i: bucket2, x: 2.0, y: -1.25 }, { x: pA.x, y: pA.y }, { x: pB.x, y: pB.y }, { i: cw, x: 0, y: -1.25 }], w: 0.08 });
  M.pulleys.push({ x: pA.x, y: pA.y, r: 0.6 }, { x: pB.x, y: pB.y, r: 0.6 });
  S.add({ type: 'static', mat: 'metal', style: 'bar', name: 'pulleybar2', z: -1, fix: [{ box: [(pA.x + pB.x) / 2, pY, (pA.x - pB.x) / 2 + 0.6, 0.15], sensor: true }] });
  // floor stop for bucket + rails (decor)
  S.add({ type: 'static', mat: 'metal', style: 'post', name: 'bucketStop', fix: [{ box: [b2x, 109.2, 2.4, 0.5] }] });
  S.add({ type: 'static', mat: 'metal', style: 'rail', name: 'cwrail', z: -1, fix: [{ box: [cwx, 103.6, 0.12, 5.4], sensor: true }] });
  M.cw = cw; M.cwJ = cwJ; M.bucket2 = bucket2;

  // ============================================================ 10. SNIP! the rising counterweight closes a pair of scissors on the anvil's rope
  const anvX = 7.4, anvTop = 97.6;
  const anvil = S.add({ type: 'dynamic', x: anvX, y: anvTop + 3.3 + 0.9, mat: 'metal', style: 'anvil', name: 'anvil', z: 2, bullet: true, hero: true,
    fix: [{ box: [0, 0, 1.35, 0.9], d: 4, f: 0.4 }] });
  M.anvil = anvil; hero.anvil = anvil;
  const ropeJ = S.world.createJoint(pl.DistanceJoint({ frequencyHz: 0 }, ground.body, anvil.body, V(anvX, anvTop), V(anvX, anvil.y - 0.9)));
  const ropeLink = S.link({ kind: 'rope', pts: [{ x: anvX, y: anvTop }, { i: anvil, x: 0, y: -0.9 }], w: 0.09 });
  S.add({ type: 'static', mat: 'metal', style: 'post', name: 'hook', z: 1, fix: [{ box: [anvX, anvTop - 0.2, 0.5, 0.2] }] });
  const sciss = S.add({ type: 'visual', x: anvX, y: anvTop + 1.2, mat: 'metal', style: 'scissors', name: 'scissors', z: 4, fix: [{ box: [0, 0, 0.4, 0.4] }] });
  sciss.open = 1;
  // string from the counterweight over a tiny pulley to the scissors handles (visual)
  S.link({ kind: 'rope', z: 1, pts: [{ i: cw, x: 0, y: -1.25 }, { x: cwx, y: 96.6 }, { x: anvX - 0.6, y: anvTop + 1.2 }], w: 0.05, col2: '#ffb3c7' });
  S.add({ type: 'static', style: 'pulleydeco', name: 'sp', z: 1, deco: { kind: 'wheel', r: 0.35 }, x: cwx, y: 96.6, fix: [] });
  let snipped = false;
  S.every(() => {
    const prog = Math.min(1, Math.max(0, (cw.body.getPosition().y - 1.25 - (cwTop - 1.25 - 0.0)) / 1.0));
    const k = snipped ? 0 : Math.min(1, Math.max(0, (cw.body.getPosition().y - cwTop) / 2.4));
    sciss.body.setTransform(V(anvX, anvTop + 1.2), snipped ? 0 : k);
    if (!snipped && cwJ.getJointTranslation() < (cwTop - cwBot) + 0.12) {
      snipped = true; sciss.body.setTransform(V(anvX, anvTop + 1.2), 0); S.world.destroyJoint(ropeJ); ropeLink.to = S.f + 1; ropeLink.cutAt = S.f; ropeLink.cut = true;
      S.step(10, 'SNIP!', 108); S.sound('snip', anvX, anvTop + 1.2, 1); S.shake(0.3); S.punch(0.6);
    }
  });

  // ============================================================ 11. THE ANVIL falls onto the big LIKE button
  S.trigger('S11', who => { S.step(11, 'THE ANVIL', 110); }, true, ['anvil']);
  S.add({ type: 'static', style: 'sensor', fix: [{ box: [anvX, 109.0, 1.8, 0.6], sensor: true, tag: 'S11' }] });
  const btnX = 7.4, btnY = 123.0;
  const btn = S.add({ type: 'dynamic', x: btnX, y: btnY + 0.35, mat: 'red', style: 'bigbutton', name: 'btn', z: 2, fixedRot: true,
    fix: [{ box: [0, 0, 2.6, 0.35], d: 3, f: 0.5 }] });
  const bj = S.joint(pl.PrismaticJoint({ enableLimit: true, lowerTranslation: 0, upperTranslation: 0.8, enableMotor: true, motorSpeed: -4, maxMotorForce: 300 },
    ground.body, btn.body, V(btnX, btnY + 0.35), V(0, 1)));
  S.add({ type: 'static', mat: 'metal', style: 'post', name: 'btnBase', fix: [{ box: [btnX, btnY + 3.4, 3.4, 1.3] }, { box: [btnX - 3.0, btnY + 1.0, 0.4, 1.0] }, { box: [btnX + 3.0, btnY + 1.0, 0.4, 1.0] }] });
  S.add({ type: 'static', style: 'sign', name: 'likeSign', z: -2, x: btnX, y: 113.0, deco: { kind: 'heart', r: 4.2 }, fix: [] });
  M.btn = btn; M.btnJ = bj;
  let pressed = false;
  S.every(() => {
    if (!pressed && bj.getJointTranslation() > 0.5) {
      pressed = true; M.pressedAt = S.f;
      S.step(12, 'LIKE!', 112); S.sound('like', btnX, btnY, 1); S.shake(1); S.punch(1);
      S.events.push({ t: S.vt(), type: 'finale', x: btnX, y: btnY });
    }
  });

  for (const p of M.pulleys) S.add({ type: 'static', style: 'pulleydeco', name: 'pulley', z: 1, deco: { kind: 'wheel', r: p.r }, x: p.x, y: p.y, fix: [] });
  S.add({ type: 'static', style: 'gear', name: 'bigGear', z: -1, deco: { kind: 'gear', r: 1.9, teeth: 14, follow: M.wheel.id, ratio: -0.8, col: '#ff4f8b', phase: 0.0 }, x: 19.4, y: 88.4, fix: [] });

  // ------------------------------------------------------------ camera: one framing per step, follows the anvil on its way down
  const CAMY = { 0: 19.2, 1: 19.2, 2: 21, 3: 26, 4: 32, 5: 40.5, 6: 52, 7: 68, 8: 83, 9: 99, 10: 103, 11: 110, 12: 108 };
  S.camState.ts = 0.94;
  // slow-mo on the big hits, time-lapse through the long rolls (sim seconds -> playback rate, multiples of 0.25)
  const RATE = [[0, 1], [1.45, 0.5], [2.35, 1.5], [5.0, 0.75], [7.45, 1.75], [9.0, 1], [11.3, 0.5], [12.4, 1], [16.5, 1.25], [21.8, 1.5], [26.5, 1], [27.45, 0.25], [28.1, 1]];
  S.timeScale = t => { let r = 1; for (const [a, v] of RATE) if (t >= a) r = v; return r; };
  S.camFn = (c, sim) => {
    const n = sim.steps.length ? sim.steps[sim.steps.length - 1].n : 0;
    c.ty = CAMY[n] !== undefined ? CAMY[n] : c.ty; c.ts = n >= 12 ? 0.9 : 1; c.k = 3.2;
    if (n === 11) { c.ty = Math.min(111, Math.max(104, anvil.body.getPosition().y + 5)); c.k = 6; }
    if (n === 12) c.k = 1.4;
    if (n === 1) c.ts = 1;
  };
  return M;
}

module.exports = { build, plank };
