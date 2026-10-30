// The wide (landscape) machine for the 3-minute cut.  World is 48 m wide so a 16:9 camera at 0.8x frames it edge to edge;
// the camera only scrolls down the tower.  Proven blocks from machine.js are translated into the left or right half
// (S.setOrigin), ramps and domino runs are stretched to span the width, and connector ramps hand the ball between halves.
const { Sim, pl, V } = require('./engine');
const { plank, seg, rad } = require('./machine');

const WW = 48.0;

function build(opts = {}) {
  const S = new Sim(26, { w: 1920, h: 1080 }, WW);
  const hero = {};
  const M = { sim: S, hero, blocks: {} };
  // enter a block: everything added next is translated by (ox, oy); returns a point helper that is safe to use inside callbacks
  const blk = (ox, oy) => { S.setOrigin(ox, oy); return (x, y) => V(x + ox, y + oy); };

  // ------------------------------------------------------------ frame: steel columns at the world edges
  blk(0, 0);
  S.add({ type: 'static', mat: 'metal', style: 'column', name: 'colL', fix: [{ box: [-0.8, 150, 1.2, 170], f: 0.2, e: 0.12 }] });
  S.add({ type: 'static', mat: 'metal', style: 'column', name: 'colR', fix: [{ box: [WW + 0.8, 150, 1.2, 170], f: 0.2, e: 0.12 }] });
  const ground = S.add({ type: 'static', name: 'ground', style: 'sensor', fix: [] });

  const makePlate = (P, cx, top, name) => {
    const p = S.add({ type: 'dynamic', x: cx, y: top + 0.25, mat: 'red', style: 'button', name, z: 2, fixedRot: true, fix: [{ box: [0, 0, 1.6, 0.25], d: 2.5, f: 0.5 }] });
    const j = S.joint(pl.PrismaticJoint({ enableLimit: true, lowerTranslation: 0, upperTranslation: 0.45, enableMotor: true, motorSpeed: -3, maxMotorForce: 150 },
      ground.body, p.body, P(cx, top + 0.25), V(0, 1)));
    S.add({ type: 'static', mat: 'metal', style: 'post', name: name + 'Base', fix: [{ box: [cx, top + 1.9, 1.9, 0.9] }, { box: [cx - 2.1, top + 0.9, 0.2, 0.3] }] });
    return { p, j };
  };

  // ============================================================ BLOCK A: cradle -> long ramp -> 48 dominoes (full width)
  {
    const P = blk(0, 0);
    const beam = S.add({ type: 'static', mat: 'metal', style: 'beam', name: 'beam', fix: [{ box: [10.8, 1.1, 10.4, 0.5] }] });
    const L = 7, R = 0.7, ay = 1.7, by = ay + L, th = rad(40);
    const cradle = [];
    for (let i = 0; i < 5; i++) {
      const bx = 15.6 - i * 1.404, first = i === 0;
      const px = first ? bx + L * Math.sin(th) : bx, py = first ? ay + L * Math.cos(th) : by;
      const b = S.add({ type: first ? 'static' : 'dynamic', rec: true, x: px, y: py, mat: 'steel', style: 'cradle', name: 'cradle', bullet: true,
        fix: [{ c: [0, 0, R], d: 4, f: 0.05, e: 1.0 }] });
      S.joint(pl.DistanceJoint({ frequencyHz: 0, dampingRatio: 0 }, beam.body, b.body, P(bx, ay), P(px, py)));
      S.link({ kind: 'vrope', pts: [{ x: bx - 0.5, y: ay - 0.2 }, { i: b, x: 0, y: 0 }], w: 0.06 });
      S.link({ kind: 'vrope', pts: [{ x: bx + 0.5, y: ay - 0.2 }, { i: b, x: 0, y: 0 }], w: 0.06 });
      cradle.push(b);
    }
    const c1 = { x: 15.6 + L * Math.sin(th), y: ay + L * Math.cos(th) };
    const claw = S.add({ type: 'visual', x: c1.x, y: c1.y - 1.0, mat: 'metal', style: 'claw', name: 'claw', z: 5, fix: [{ box: [0, 0, 0.5, 0.5] }] });
    const tStart = opts.tStart !== undefined ? opts.tStart : 3.5;
    S.at(tStart, s => { cradle[0].body.setType('dynamic'); cradle[0].body.setAwake(true); s.sound('release', c1.x, c1.y, 1); s.step(1, 'CRADLE'); });
    S.every(t => { const k = Math.min(1, Math.max(0, (t - tStart) / 0.35)); claw.body.setTransform(P(c1.x, c1.y - 1.0 - 2.6 * k), k); });
    const Tx = 15.6 - 4 * 1.404 - R - 0.62 - 0.05;
    const T = S.add({ type: 'dynamic', x: Tx, y: by, mat: 'steel', style: 'ball', name: 'T', hero: true, bullet: true, hue: 200, fix: [{ c: [0, 0, 0.62], d: 2, f: 0.35, e: 0.35 }] });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'tpost', fix: [{ box: [Tx, by + 0.62 + 1.5, 0.55, 1.5] }] });
    hero.T = T;

    // the target ball hits the left column, drops onto a long ramp and rolls the whole width of the machine
    plank(S, 0.4, 17.4, 43.6, 23.9, 0.5, { name: 'R1', e: 0.1 });
    S.trigger('A2', () => S.step(2, 'RAMP'), true, ['T']);
    S.add({ type: 'static', style: 'sensor', fix: [{ box: [6.0, 18.8, 0.5, 1.5], sensor: true, tag: 'A2' }] });

    // ...hits the right column, drops onto a return ramp and runs the dominoes right -> left
    const P1y = 28.2, nDom = 48, dsp = 0.76, dx0 = 40.9;
    plank(S, 3.2, P1y, 47.6, P1y, 0.6, { name: 'P1', f: 0.5 });
    plank(S, 47.6, 25.7, 45.7, 27.5, 0.5, { name: 'R2', f: 0.4 });
    plank(S, 45.7, 27.5, 44.6, P1y, 0.5, { name: 'R2b', f: 0.4 });
    for (let i = 0; i < nDom; i++) {
      const last = i === nDom - 1, h = last ? 2.4 : 1.6, w = last ? 0.36 : 0.3;
      S.add({ type: 'dynamic', x: dx0 - i * dsp, y: P1y - h / 2, mat: 'domino', style: 'domino', name: 'domino', hue: (i / nDom) * 320,
        fix: [{ box: [0, 0, w / 2, h / 2], d: last ? 2.2 : 1.3, f: 0.5, e: 0.0 }] });
    }
    S.trigger('A3', () => S.step(3, 'DOMINOES'), true, ['T']);
    S.add({ type: 'static', style: 'sensor', fix: [{ box: [dx0 + 0.9, P1y - 1, 0.3, 1], sensor: true, tag: 'A3' }] });
    // the bowling ball waits at the far end of the run
    const B = S.add({ type: 'dynamic', x: 3.55, y: P1y - 0.9, mat: 'steel', style: 'ball', name: 'B', hero: true, hue: 340, bullet: true, fix: [{ c: [0, 0, 0.9], d: 2.0, f: 0.3, e: 0.12 }] });
    hero.B = B; M.B = B;
  }

  // ============================================================ BLOCK B: long ramp -> plate -> catapult -> catch ramp (original stage 4-5, left half)
  {
    const P = blk(0, 1.0);
    plank(S, 0.4, 30.4, 9.4, 33.6, 0.5, { name: 'R3', f: 0.4 });
    S.trigger('B4', () => S.step(4, 'BOWLING BALL'), true, ['B']);
    S.add({ type: 'static', style: 'sensor', fix: [{ box: [2.2, 28.6, 1.2, 0.5], sensor: true, tag: 'B4' }] });
    const plateY = 36.7, plateX = 11.4;
    const plate = S.add({ type: 'dynamic', x: plateX, y: plateY + 0.25, mat: 'red', style: 'button', name: 'plate', z: 2, fixedRot: true, fix: [{ box: [0, 0, 1.6, 0.25], d: 2.5, f: 0.5 }] });
    const pj = S.joint(pl.PrismaticJoint({ enableLimit: true, lowerTranslation: 0, upperTranslation: 0.45, enableMotor: true, motorSpeed: -3, maxMotorForce: 150 },
      ground.body, plate.body, P(plateX, plateY + 0.25), V(0, 1)));
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'baffle', fix: [{ box: [13.3, 35.0, 0.3, 2.3], e: 0.05 }] });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'plateBase', fix: [{ box: [plateX, plateY + 1.9, 1.9, 0.9] }, { box: [plateX - 1.9 - 0.2, plateY + 0.9, 0.2, 0.3] }] });
    const cpx = 7.6, cpy = 47.0, a0 = rad(140), a1 = rad(240);
    const arm = S.add({ type: 'dynamic', x: cpx, y: cpy, a: a0, mat: 'wood', style: 'arm', name: 'arm', z: 3,
      fix: [{ box: [2.5, 0, 2.7, 0.2], d: 1.5, f: 0.5 }, { box: [-0.4, 0, 0.5, 0.2], d: 1.5, f: 0.5 }, { box: [5.0, 0.55, 0.12, 0.5], d: 1, f: 0.5 }] });
    const armJ = S.joint(pl.RevoluteJoint({ enableLimit: true, lowerAngle: 0, upperAngle: a1 - a0, enableMotor: false, motorSpeed: 0, maxMotorTorque: 0 }, ground.body, arm.body, P(cpx, cpy)));
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'catapultBase', fix: [{ poly: [[cpx - 0.4, cpy + 0.5], [cpx + 0.4, cpy + 0.5], [cpx + 1.2, cpy + 4], [cpx - 1.2, cpy + 4]] }] });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'armRest', fix: [{ box: [cpx - 5.7, cpy + 4.55, 0.8, 0.3] }] });
    plank(S, 11.4, 44.0, 19.6, 46.6, 0.5, { name: 'R4', f: 0.4 });
    const Lb = S.add({ type: 'dynamic', x: cpx + 4.3 * Math.cos(a0) - 0.7 * Math.sin(a0), y: cpy + 4.3 * Math.sin(a0) + 0.7 * Math.cos(a0), mat: 'steel', style: 'ball', name: 'L', hero: true, hue: 45, bullet: true,
      fix: [{ c: [0, 0, 0.5], d: 1.2, f: 0.4, e: 0.3 }] });
    hero.L = Lb; M.L = Lb; M.plateJ = pj;
    let fired = false;
    S.every(() => {
      if (!fired && pj.getJointTranslation() > 0.3) {
        fired = true; S.step(5, 'CATAPULT'); armJ.enableMotor(true); armJ.setMotorSpeed(3.4); armJ.setMaxMotorTorque(8000); S.sound('trigger', plateX, plateY, 1);
      }
    });
  }

  // ============================================================ BLOCK R3L: catch wall -> long ramp left -> return ramp -> TEETER-TOTTER (left half)
  {
    const P = blk(0, 0);
    // the flung ball hits a wall, drops onto a long ramp running left (the wall plays the part of the original column)
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'catchWall', fix: [{ box: [24.6, 51.5, 0.35, 6.0], e: 0.1 }] });
    plank(S, 3.0, 62.0, 24.2, 58.0, 0.5, { name: 'ZL1', f: 0.4 });
    S.trigger('C6', () => S.step(6, 'LONG ROLL LEFT'), true, ['L']);
    S.add({ type: 'static', style: 'sensor', fix: [{ box: [22.0, 57.2, 1.5, 0.8], sensor: true, tag: 'C6' }] });
    // ...falls off the left end, bounces off the column and lands on a return ramp
    plank(S, 0.4, 66.0, 12.0, 68.3, 0.5, { name: 'ZL2', f: 0.4 });
    // teeter-totter: a balanced plank on a pivot, entry end resting low; the ball climbs to the pivot and tips it
    const tx = 15.0, ty = 68.1, th0 = rad(-12);
    const tee = S.add({ type: 'dynamic', x: tx, y: ty, a: th0, mat: 'wood', style: 'plank', name: 'teeter', z: 2,
      fix: [{ box: [0, 0, 2.8, 0.2], d: 0.7, f: 0.5 }, { box: [-2.4, 0.3, 0.3, 0.3], d: 3, f: 0.5 }] });
    S.joint(pl.RevoluteJoint({ enableLimit: true, lowerAngle: 0, upperAngle: rad(24) }, ground.body, tee.body, P(tx, ty)));
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'teeterPost', fix: [{ poly: [[tx - 0.3, ty + 0.5], [tx + 0.3, ty + 0.5], [tx + 1.2, ty + 4], [tx - 1.2, ty + 4]] }] });
    S.trigger('C7', () => S.step(7, 'TEETER'), true, ['L']);
    S.add({ type: 'static', style: 'sensor', fix: [{ box: [11.8, 67.4, 0.6, 1.0], sensor: true, tag: 'C7' }] });
    plank(S, 17.9, 68.7, 23.5, 70.6, 0.5, { name: 'ZL3', f: 0.4 });
    M.tee = tee;
  }

  // ============================================================ BLOCK N3: BOUNCY STAIRCASE (right half): the ball hops down springy steps
  {
    const P = blk(0, 0);
    const n = 6, x0 = 25.0, w = 3.0, pitch = 3.2, y0 = 73.0, drop = 2.2;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * pitch, y = y0 + i * drop;
      S.add({ type: 'static', mat: 'rubber', style: 'pad', name: 'pad', hue: 330 - i * 28, fix: [{ box: [x + w / 2, y + 0.25, w / 2, 0.25], f: 0.2, e: 0.78 }] });
      S.add({ type: 'static', mat: 'metal', style: 'post', name: 'padPost', z: -1, fix: [{ box: [x + w / 2, y + 2.4, 0.2, 2.0], sensor: true }] });
    }
    S.trigger('N3', () => S.step(8, 'BOUNCY STAIRS'), true, ['L']);
    S.add({ type: 'static', style: 'sensor', fix: [{ box: [x0 + 1.5, y0 - 1.0, 1.8, 0.8], sensor: true, tag: 'N3' }] });
  }

  // ============================================================ BLOCK C: bucket on a pulley lifts a gate -> hopper pours 32 balls -> PLINKO (right half)
  {
    const P = blk(26.4, 36.0);
    S.trigger('C9', () => S.step(9, 'PULLEY GATE'), true, ['L']);
    S.add({ type: 'static', style: 'sensor', fix: [{ box: [19.2, 49.6, 1.5, 0.6], sensor: true, tag: 'C9' }] });
    const bkx = 19.2, bky = 51.6;
    const bucket = S.add({ type: 'dynamic', x: bkx, y: bky, mat: 'blue', style: 'bucket', name: 'bucket', z: 2, fixedRot: true,
      fix: [{ box: [0, 0.8, 1.72, 0.12], d: 0.9, f: 0.5 }, { box: [-1.6, 0, 0.12, 0.92], d: 0.9, f: 0.3 }, { box: [1.6, 0, 0.12, 0.92], d: 0.9, f: 0.3 }] });
    const gateX = 11.7, gateY0 = 57.1, gateH = 1.45;
    const gate = S.add({ type: 'dynamic', x: gateX, y: gateY0, mat: 'red', style: 'gate', name: 'gate', z: 2, fix: [{ box: [0, 0, 0.16, gateH], d: 2.05, f: 0.0 }] });
    S.joint(pl.PrismaticJoint({ enableLimit: true, lowerTranslation: -2.9, upperTranslation: 0 }, ground.body, gate.body, P(gateX, gateY0), V(0, 1)));
    S.joint(pl.PulleyJoint({}, bucket.body, gate.body, P(bkx, 49.4), P(gateX, 49.4), P(bkx, bky - 0.92), P(gateX, gateY0 - gateH), 1));
    S.link({ kind: 'rope', pts: [{ i: bucket, x: -1.6, y: -0.92 }, { x: bkx, y: 49.4 }], w: 0.07 });
    S.link({ kind: 'rope', pts: [{ i: bucket, x: 1.6, y: -0.92 }, { x: bkx, y: 49.4 }, { x: gateX, y: 49.4 }, { i: gate, x: 0, y: -gateH }], w: 0.07 });
    (M.pulleys = M.pulleys || []).push({ x: bkx + 26.4, y: 49.4 + 36.0, r: 0.55 }, { x: gateX + 26.4, y: 49.4 + 36.0, r: 0.55 });
    S.add({ type: 'static', mat: 'metal', style: 'bar', name: 'pulleybar', z: -1, fix: [{ box: [(bkx + gateX) / 2, 49.4, (bkx - gateX) / 2 + 0.6, 0.15], sensor: true }] });
    // hopper
    const hfy = x => 56.0 + (x - 2.4) * 0.276;
    plank(S, 2.4, 56.0, 11.1, 58.4, 0.5, { name: 'hopperFloor', f: 0.1 });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'hopperL', fix: [{ box: [2.0, 54.4, 0.3, 4.2] }] });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'hopperR', fix: [{ box: [11.3, 53.9, 0.2, 1.6] }] });
    plank(S, 11.1, 58.4, 15.2, 59.6, 0.5, { name: 'chute', f: 0.1 });
    M.balls = [];
    for (let row = 0; row < 4; row++) for (let k = 0; k < 8; k++) {
      const x = 3.2 + k * 1.0 + (row % 2) * 0.45, y = hfy(x) - 0.62 - row * 0.9;
      M.balls.push(S.add({ type: 'dynamic', x, y, mat: 'ball', style: 'ball', name: 'pball', hue: ((k * 3 + row * 40) * 13) % 360, fix: [{ c: [0, 0, 0.42], d: 1.0, f: 0.15, e: 0.45 }], ad: 0.1 }));
    }
    // plinko
    S.trigger('C10', () => S.step(10, 'PLINKO'), true, ['pball']);
    S.add({ type: 'static', style: 'sensor', fix: [{ box: [14.5, 61.5, 2.0, 0.5], sensor: true, tag: 'C10' }] });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'plinkoL', fix: [{ box: [3.1, 70.5, 0.3, 11.0] }] });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'plinkoR', fix: [{ box: [18.9, 70.5, 0.3, 11.0] }] });
    const pdx = 2.533;
    for (let r = 0; r < 9; r++) {
      const y = 62.8 + r * 1.75, even = r % 2 === 0;
      for (let j = -3; j <= (even ? 3 : 2); j++)
        S.add({ type: 'static', x: 11 + (even ? j : j + 0.5) * pdx, y, mat: 'peg', style: 'peg', name: 'peg', fix: [{ c: [0, 0, 0.22], f: 0.1, e: 0.5 }] });
    }
    plank(S, 3.3, 78.6, 9.8, 82.0, 0.5, { name: 'fun1', f: 0.2 });
    plank(S, 18.7, 78.6, 12.4, 82.0, 0.5, { name: 'fun2', f: 0.2 });
  }

  // shared between the counterweight block and the tripwire it pulls
  let cw, cwJ; const cwTop = 99.6, cwBot = 107.6, cwx = 2.9;
  const DY = 70.0;          // vertical offset of plinko #2 / wheel / counterweight / tripwire row
  const P3y = 117.0 + DY + 5.1, X2y = P3y + 5.7, SBy = X2y + 3.2, S2y = SBy + 5.9, S3y = S2y + 5.9, S4y = S3y + 5.9, R5ys = S4y + 5.9, R5ye = R5ys + 5.2, FY = R5ye - 123.4;

  // ============================================================ CONNECTOR: plinko #1's balls stream left along a long ramp onto plinko #2
  {
    blk(0, 0);
    plank(S, 13.0, 128.5, 40.0, 121.2, 0.5, { name: 'CN', f: 0.15 });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'CNwall', fix: [{ box: [40.6, 119.0, 0.3, 3.2] }] });
  }

  // ============================================================ BLOCK C2: plinko #2 (left half), its funnel feeds the wheel directly below
  {
    const P = blk(0, DY);
    S.trigger('C11', () => S.step(11, 'PLINKO 2'), true, ['pball']);
    S.add({ type: 'static', style: 'sensor', fix: [{ box: [11.0, 60.5, 5.0, 0.5], sensor: true, tag: 'C11' }] });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'plinkoL', fix: [{ box: [3.1, 70.5, 0.3, 11.0] }] });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'plinkoR', fix: [{ box: [18.9, 70.5, 0.3, 11.0] }] });
    const pdx = 2.533;
    for (let r = 0; r < 9; r++) {
      const y = 62.8 + r * 1.75, even = r % 2 === 0;
      for (let j = -3; j <= (even ? 3 : 2); j++)
        S.add({ type: 'static', x: 11 + (even ? j : j + 0.5) * pdx, y, mat: 'peg', style: 'peg', name: 'peg', fix: [{ c: [0, 0, 0.22], f: 0.1, e: 0.5 }] });
    }
    plank(S, 3.3, 78.6, 9.8, 82.0, 0.5, { name: 'fun1', f: 0.2 });
    plank(S, 18.7, 78.6, 12.4, 82.0, 0.5, { name: 'fun2', f: 0.2 });
  }

  // ============================================================ BLOCK D: water wheel -> collector -> bucket drops and lifts the counterweight (left half)
  {
    const P = blk(0, DY);
    S.trigger('D12', () => S.step(12, 'WATER WHEEL'), true, ['pball']);
    S.add({ type: 'static', style: 'sensor', fix: [{ box: [11.1, 83.0, 1.5, 0.5], sensor: true, tag: 'D12' }] });
    const wx = 12.8, wy = 86.2, wfix = [{ c: [0, 0, 0.9], d: 2, f: 0.3 }];
    for (let i = 0; i < 8; i++) {
      const ph = i * Math.PI / 4, c = Math.cos(ph), sn = Math.sin(ph), ha = ph + rad(118);
      wfix.push(seg(0.6 * c, 0.6 * sn, 3.3 * c, 3.3 * sn, 0.2, { d: 1.2, f: 0.3 }));
      wfix.push(seg(3.3 * c, 3.3 * sn, 3.3 * c + 1.15 * Math.cos(ha), 3.3 * sn + 1.15 * Math.sin(ha), 0.2, { d: 1.2, f: 0.3 }));
    }
    const wheel = S.add({ type: 'dynamic', x: wx, y: wy, mat: 'wood', style: 'wheel', name: 'wheel', z: 1, fix: wfix, ad: 0.15 });
    S.joint(pl.RevoluteJoint({ enableMotor: true, motorSpeed: 0, maxMotorTorque: 14 }, ground.body, wheel.body, P(wx, wy)));
    M.wheel = wheel;

    S.add({ type: 'static', style: 'sensor', fix: [{ box: [17.5, 96.8, 2.0, 0.6], sensor: true, tag: 'D13' }] });
    S.trigger('D13', () => S.step(13, 'COUNTERWEIGHT'), true, ['pball']);
    plank(S, 3.6, 92.8, 16.3, 95.4, 0.5, { name: 'collector', f: 0.15 });
    plank(S, 0.4, 91.9, 3.6, 92.8, 0.5, { name: 'collectorIn', f: 0.15 });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'bucketShaft', fix: [{ box: [16.05, 102.5, 0.2, 7.0] }] });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'bucketWallR', fix: [{ box: [21.6, 95.0, 0.3, 15.2] }] });   // stands in for the original right column
    const b2x = 18.7, b2y = 98.0;
    const bucket2 = S.add({ type: 'dynamic', x: b2x, y: b2y, mat: 'teal', style: 'bucket', name: 'bucket2', z: 2, ld: 0.9, fixedRot: true,
      fix: [{ box: [0, 1.15, 2.1, 0.14], d: 2.4, f: 0.4 }, { box: [-2.0, 0, 0.14, 1.25], d: 2.4, f: 0.3 }, { box: [2.0, 0, 0.14, 1.25], d: 2.4, f: 0.3 }] });
    cw = S.add({ type: 'dynamic', x: cwx, y: cwBot, mat: 'purple', style: 'weight', name: 'cw', z: 2, ld: 0.9, fix: [{ box: [0, 0, 1.1, 1.25], d: 2.1, f: 0.3 }] });
    cwJ = S.joint(pl.PrismaticJoint({ enableLimit: true, lowerTranslation: cwTop - cwBot, upperTranslation: 0 }, ground.body, cw.body, P(cwx, cwBot), V(0, 1)));
    const pY = 92.0;
    S.joint(pl.PulleyJoint({}, bucket2.body, cw.body, P(b2x, pY), P(cwx, pY), P(b2x, b2y - 1.25), P(cwx, cwBot - 1.25), 1));
    S.link({ kind: 'rope', z: -1, pts: [{ i: bucket2, x: -2.0, y: -1.25 }, { x: b2x, y: pY }], w: 0.08 });
    S.link({ kind: 'rope', z: -1, pts: [{ i: bucket2, x: 2.0, y: -1.25 }, { x: b2x, y: pY }, { x: cwx, y: pY }, { i: cw, x: 0, y: -1.25 }], w: 0.08 });
    (M.pulleys = M.pulleys || []).push({ x: b2x, y: pY + DY, r: 0.6 }, { x: cwx, y: pY + DY, r: 0.6 });
    S.add({ type: 'static', mat: 'metal', style: 'bar', name: 'pulleybar2', z: -1, fix: [{ box: [(b2x + cwx) / 2, pY, (b2x - cwx) / 2 + 0.6, 0.15], sensor: true }] });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'bucketStop', fix: [{ box: [b2x + 0.4, 109.2, 2.9, 0.5] }] });
    S.add({ type: 'static', mat: 'metal', style: 'rail', name: 'cwrail', z: -1, fix: [{ box: [cwx, 103.6, 0.12, 5.4], sensor: true }] });
    S.add({ type: 'static', style: 'pulleydeco', name: 'sp', z: 1, deco: { kind: 'wheel', r: 0.35 }, x: cwx, y: 96.6, fix: [] });
    M.cw = cw; M.bucket2 = bucket2;
  }

  // ============================================================ BLOCK E: tripwire -> ramps -> dominoes (right half)
  {
    const P = blk(24, DY);
    plank(S, 4.8, 100.3, 7.5, 100.6, 0.5, { name: 'shelf0' });
    const G = S.add({ type: 'dynamic', x: 7.0, y: 99.95, mat: 'steel', style: 'ball', name: 'G', hero: true, hue: 165, bullet: true, fix: [{ c: [0, 0, 0.55], d: 1.4, f: 0.35, e: 0.3 }] });
    hero.G = G;
    const pin = S.add({ type: 'kinematic', x: 7.78, y: 99.65, mat: 'metal', style: 'pin', name: 'pin', z: 1, fix: [{ box: [0, 0, 0.16, 0.8] }] });
    S.link({ kind: 'rope', z: 1, pts: [{ i: cw, x: 0, y: -1.25 }, { x: cwx - 24, y: 96.6 }, { i: pin, x: 0, y: -0.8 }], w: 0.05, col2: '#ffb3c7' });
    let pinT = null;
    S.every(t => {
      if (pinT === null && cwJ.getJointTranslation() < (cwTop - cwBot) + 0.12) { pinT = t; S.step(14, 'TRIPWIRE'); S.sound('release', 7.7 + 24, 99.6 + DY, 1); }
      const k = pinT === null ? 0 : Math.min(1, (t - pinT) / 0.2);
      pin.body.setTransform(P(7.78, 99.65 + 2.6 * k), 0);
    });
    plank(S, 7.7, 102.5, 14.0, 105.0, 0.5, { name: 'legA' });
    plank(S, 15.7, 108.0, 2.0, 112.4, 0.5, { name: 'legB' });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'legWall', fix: [{ box: [16.05, 106.0, 0.2, 4.0] }] });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'colE', fix: [{ box: [-0.4, 113.0, 0.8, 5.0], e: 0.12 }] });
    S.trigger('E15', () => S.step(15, 'RAMPS'), true, ['G']);
    S.add({ type: 'static', style: 'sensor', fix: [{ box: [9.0, 101.8, 1.4, 0.5], sensor: true, tag: 'E15' }] });
    plank(S, 0.4, 115.0, 4.2, 117.0, 0.5, { name: 'R2b' });
    const P2y = 117.0, nD2 = 20;
    plank(S, 4.2, P2y, 22.0, P2y, 0.6, { name: 'P2' });
    for (let i = 0; i < nD2; i++) {
      const last = i === nD2 - 1, h = last ? 2.4 : 1.6, w = last ? 0.36 : 0.3;
      S.add({ type: 'dynamic', x: 6.0 + i * 0.76, y: P2y - h / 2, mat: 'domino', style: 'domino', name: 'domino', hue: 320 - (i / nD2) * 320, fix: [{ box: [0, 0, w / 2, h / 2], d: last ? 2.2 : 1.3, f: 0.5, e: 0 }] });
    }
    S.trigger('E16', () => S.step(16, 'DOMINOES'), true, ['G']);
    S.add({ type: 'static', style: 'sensor', fix: [{ box: [5.0, 116.0, 0.5, 1.0], sensor: true, tag: 'E16' }] });
    hero.J = S.add({ type: 'dynamic', x: 21.3, y: P2y - 0.7, mat: 'steel', style: 'ball', name: 'J', hero: true, hue: 285, bullet: true, fix: [{ c: [0, 0, 0.7], d: 2.4, f: 0.3, e: 0.12 }] });
  }

  // ============================================================ BLOCK P3: a full-width domino run (right -> left); the last domino pushes a ball off the left end
  {
    blk(0, 0);
    plank(S, 47.6, P3y - 2.5, 45.7, P3y - 0.7, 0.5, { name: 'R2c', f: 0.4 });
    plank(S, 45.7, P3y - 0.7, 44.6, P3y, 0.5, { name: 'R2d', f: 0.4 });
    plank(S, 3.2, P3y, 47.6, P3y, 0.6, { name: 'P3', f: 0.5 });
    const nD = 51;
    for (let i = 0; i < nD; i++) {
      const last = i === nD - 1, h = last ? 2.4 : 1.6, w = last ? 0.36 : 0.3;
      S.add({ type: 'dynamic', x: 43.2 - i * 0.76, y: P3y - h / 2, mat: 'domino', style: 'domino', name: 'domino', hue: (i / nD) * 320, fix: [{ box: [0, 0, w / 2, h / 2], d: last ? 2.2 : 1.3, f: 0.5, e: 0 }] });
    }
    S.trigger('P17', () => S.step(17, 'DOMINOES 2'), true, ['J']);
    S.add({ type: 'static', style: 'sensor', fix: [{ box: [44.0, P3y - 1, 0.3, 1], sensor: true, tag: 'P17' }] });
    hero.H = S.add({ type: 'dynamic', x: 3.55, y: P3y - 0.9, mat: 'steel', style: 'ball', name: 'H', hero: true, hue: 15, bullet: true, fix: [{ c: [0, 0, 0.9], d: 2.0, f: 0.3, e: 0.12 }] });
  }

  // a ramp made of 16 coloured keys (same surface as a plank); H2 plays one note per key as it rolls over them
  const KEYS = 16, xyloRamps = [];
  const xylo = (x1, y1, x2, y2, name) => {
    for (let i = 0; i < KEYS; i++) {
      const ax = x1 + (x2 - x1) * i / KEYS, ay = y1 + (y2 - y1) * i / KEYS, bx = x1 + (x2 - x1) * (i + 1) / KEYS, by = y1 + (y2 - y1) * (i + 1) / KEYS;
      const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy), th = 0.5, ux = dy / len, uy = -dx / len;
      S.add({ type: 'static', mat: 'wood', style: 'pad', name, hue: (i / (KEYS - 1)) * 300,
        fix: [{ box: [(ax + bx) / 2 - ux * th / 2, (ay + by) / 2 - uy * th / 2, len / 2 + 0.01, th / 2, Math.atan2(dy, dx)], f: 0.4, e: 0.05 }] });
    }
    xyloRamps.push({ x1, y1, x2, y2, last: -1 });
  };

  // ============================================================ BLOCK X2: another full-width run, left -> right (mirror of the first); then a long return ramp
  {
    blk(0, 0);
    plank(S, 0.4, X2y - 2.5, 2.3, X2y - 0.7, 0.5, { name: 'R2e', f: 0.4 });
    plank(S, 2.3, X2y - 0.7, 3.4, X2y, 0.5, { name: 'R2f', f: 0.4 });
    plank(S, 0.4, X2y, 44.8, X2y, 0.6, { name: 'X2', f: 0.5 });
    const nD = 48;
    for (let i = 0; i < nD; i++) {
      const last = i === nD - 1, h = last ? 2.4 : 1.6, w = last ? 0.36 : 0.3;
      S.add({ type: 'dynamic', x: 7.1 + i * 0.76, y: X2y - h / 2, mat: 'domino', style: 'domino', name: 'domino', hue: 320 - (i / nD) * 320, fix: [{ box: [0, 0, w / 2, h / 2], d: last ? 2.2 : 1.3, f: 0.5, e: 0 }] });
    }
    S.trigger('X18', () => S.step(18, 'DOMINOES 3'), true, ['H']);
    S.add({ type: 'static', style: 'sensor', fix: [{ box: [3.0, X2y - 1, 0.5, 1], sensor: true, tag: 'X18' }] });
    hero.H2 = S.add({ type: 'dynamic', x: 44.45, y: X2y - 0.9, mat: 'steel', style: 'ball', name: 'H2', hero: true, hue: 330, bullet: true, fix: [{ c: [0, 0, 0.9], d: 2.0, f: 0.3, e: 0.12 }] });
    // switchbacks: the ball falls off the right end, hits the column and takes three long gentle ramps back and forth
    plank(S, 4.5, SBy + 3.4, 47.6, SBy, 0.5, { name: 'SB1', f: 0.4 });
    xylo(0.4, S2y, 44.4, S2y + 3.4, 'SB2');
    plank(S, 4.5, S3y + 3.4, 47.6, S3y, 0.5, { name: 'SB3', f: 0.4 });
    xylo(0.4, S4y, 44.4, S4y + 3.4, 'SB4');
    plank(S, 10.0, R5ye, 47.6, R5ys, 0.5, { name: 'R5L', f: 0.4 });
    S.every(() => {
      const p = hero.H2.body.getPosition();
      for (const kr of xyloRamps) {
        const u = (p.x - kr.x1) / (kr.x2 - kr.x1), yr = kr.y1 + (kr.y2 - kr.y1) * u;
        if (u < 0 || u >= 1 || Math.abs(p.y - yr) > 1.3) continue;
        const idx = Math.floor(u * KEYS);
        if (idx !== kr.last) { kr.last = idx; S.sound('key', p.x, p.y, Math.min(1, S.speed(hero.H2) / 12), { i: idx }); }
      }
    });
    S.trigger('X19', () => S.step(19, 'SWITCHBACKS'), true, ['H2']);
    S.add({ type: 'static', style: 'sensor', fix: [{ box: [45.5, SBy - 1.0, 1.4, 0.8], sensor: true, tag: 'X19' }] });
    S.trigger('X20', () => S.step(20, 'SWITCHBACK 2'), true, ['H2']);
    S.add({ type: 'static', style: 'sensor', fix: [{ box: [3.0, S2y - 0.3, 0.6, 0.5], sensor: true, tag: 'X20' }] });
    S.trigger('X21', () => S.step(21, 'SWITCHBACK 3'), true, ['H2']);
    S.add({ type: 'static', style: 'sensor', fix: [{ box: [45.5, S3y - 1.0, 1.4, 0.8], sensor: true, tag: 'X21' }] });
    S.trigger('X22', () => S.step(22, 'SWITCHBACK 4'), true, ['H2']);
    S.add({ type: 'static', style: 'sensor', fix: [{ box: [3.0, S4y - 0.3, 0.6, 0.5], sensor: true, tag: 'X22' }] });
    S.trigger('X23', () => S.step(23, 'SWITCHBACK 5'), true, ['H2']);
    S.add({ type: 'static', style: 'sensor', fix: [{ box: [45.5, R5ys - 1.0, 1.4, 0.8], sensor: true, tag: 'X23' }] });
  }

  // ============================================================ BLOCK F: plate -> wrecking ball -> tower -> ball -> plate -> scissors -> anvil -> heart (left half)
  let snipped = false, closing = null, sciss, anvilBody, snipNow;
  {
    const P = blk(0, FY);
    const anvX = 15.4, anvTop = 136.5, btnX = anvX, btnY = 163.0;
    const P3b = makePlate(P, 7.6, 124.2, 'plate3');
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'baffle3', fix: [{ box: [5.5, 122.2, 0.3, 2.2] }] });
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
      if (relT === null && P3b.j.getJointTranslation() > 0.3) { relT = t; S.step(24, 'PENDULUM'); bob.body.setType('dynamic'); bob.body.setAwake(true); S.sound('release', bx0, by0 + FY, 1); }
      const k = relT === null ? 0 : Math.min(1, (t - relT) / 0.35);
      claw2.body.setTransform(P(bx0, by0 - 1.5 - 2.4 * k), k);
    });
    plank(S, 6.5, 131.4, 12.4, 131.4, 0.6, { name: 'shelf3' });
    plank(S, 12.7, 132.6, 22.0, 134.2, 0.4, { name: 'catch3' });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'catchWall', fix: [{ box: [22.6, 131.0, 0.3, 3.2], e: 0.1 }] });
    for (let i = 0; i < 6; i++)
      S.add({ type: 'dynamic', x: 11.0, y: 131.4 - 0.5 - i * 1.002 - 0.002, mat: 'wood', style: 'block', name: 'block', hue: 20 + i * 48, fix: [{ box: [0, 0, 0.7, 0.5], d: 1.0, f: 0.6, e: 0 }] });
    S.trigger('F21', () => S.step(25, 'TOWER'), true, ['bob']);
    S.add({ type: 'static', style: 'sensor', fix: [{ box: [12.0, 130.4, 0.5, 1.0], sensor: true, tag: 'F21' }] });
    hero.K = S.add({ type: 'dynamic', x: 7.5, y: 131.4 - 0.6, mat: 'steel', style: 'ball', name: 'K', hero: true, hue: 25, bullet: true, fix: [{ c: [0, 0, 0.6], d: 3.0, f: 0.3, e: 0.25 }] });
    plank(S, 0.4, 134.4, 8.8, 137.2, 0.5, { name: 'R6' });
    S.trigger('F22', () => S.step(26, 'FINAL RAMP'), true, ['K']);
    S.add({ type: 'static', style: 'sensor', fix: [{ box: [6.0, 134.8, 1.8, 0.8], sensor: true, tag: 'F22' }] });
    const P4 = makePlate(P, 11.4, 140.0, 'plate4');
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'baffle4', fix: [{ box: [13.55, 138.6, 0.2, 1.9] }] });

    anvilBody = S.add({ type: 'dynamic', x: anvX, y: anvTop + 3.3 + 0.9, mat: 'metal', style: 'anvil', name: 'anvil', z: 2, bullet: true, hero: true, fix: [{ box: [0, 0, 1.35, 0.9], d: 4, f: 0.4 }] });
    hero.anvil = anvilBody;
    const ropeJ = S.world.createJoint(pl.DistanceJoint({ frequencyHz: 0 }, ground.body, anvilBody.body, P(anvX, anvTop), P(anvX, anvTop + 3.3)));
    const ropeLink = S.link({ kind: 'rope', pts: [{ x: anvX, y: anvTop }, { i: anvilBody, x: 0, y: -0.9 }], w: 0.09 });
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'hook', z: 1, fix: [{ box: [anvX, anvTop - 0.2, 0.5, 0.2] }] });
    sciss = S.add({ type: 'visual', x: anvX, y: anvTop + 1.2, mat: 'metal', style: 'scissors', name: 'scissors', z: 4, fix: [{ box: [0, 0, 0.4, 0.4] }] });
    snipNow = () => { snipped = true; sciss.body.setTransform(P(anvX, anvTop + 1.2), 0); S.world.destroyJoint(ropeJ); ropeLink.to = S.f + 1; ropeLink.cutAt = S.f; ropeLink.cut = true; S.step(27, 'SNIP'); S.sound('snip', anvX, anvTop + 1.2 + FY, 1); };
    S.every(t => {
      if (closing === null && !snipped && P4.j.getJointTranslation() > 0.25) closing = t;
      if (snipped) return;
      const k = closing === null ? 1 : Math.max(0, 1 - (t - closing) / 0.22);
      sciss.body.setTransform(P(anvX, anvTop + 1.2), k);
      if (closing !== null && k <= 0) snipNow();
    });
    S.trigger('F24', () => S.step(28, 'ANVIL'), true, ['anvil']);
    S.add({ type: 'static', style: 'sensor', fix: [{ box: [anvX, btnY - 14.0, 1.8, 0.6], sensor: true, tag: 'F24' }] });
    const btn = S.add({ type: 'dynamic', x: btnX, y: btnY + 0.35, mat: 'red', style: 'bigbutton', name: 'btn', z: 2, fixedRot: true, fix: [{ box: [0, 0, 2.6, 0.35], d: 3, f: 0.5 }] });
    const bj = S.joint(pl.PrismaticJoint({ enableLimit: true, lowerTranslation: 0, upperTranslation: 0.8, enableMotor: true, motorSpeed: -4, maxMotorForce: 300 }, ground.body, btn.body, P(btnX, btnY + 0.35), V(0, 1)));
    S.add({ type: 'static', mat: 'metal', style: 'post', name: 'btnBase', fix: [{ box: [btnX, btnY + 3.4, 3.4, 1.3] }, { box: [btnX - 3.0, btnY + 1.0, 0.4, 1.0] }, { box: [btnX + 3.0, btnY + 1.0, 0.4, 1.0] }] });
    S.add({ type: 'static', style: 'sign', name: 'likeSign', z: -2, x: btnX, y: btnY - 10.0, deco: { kind: 'heart', r: 4.2 }, fix: [] });
    let pressed = false;
    S.every(() => {
      if (!pressed && snipped && bj.getJointTranslation() > 0.5) {
        pressed = true; M.pressedAt = S.f; S.step(29, 'HEART'); S.sound('like', btnX, btnY + FY, 1);
        S.events.push({ t: S.vt(), type: 'finale', x: btnX, y: btnY + FY });
      }
    });
    M.P3b = P3b; M.P4 = P4; M.btn = btn;
  }

  // pulley wheels (decor) for every pulley collected above
  blk(0, 0);
  for (const p of (M.pulleys || [])) S.add({ type: 'static', style: 'pulleydeco', name: 'pulley', z: 1, deco: { kind: 'wheel', r: p.r }, x: p.x, y: p.y, fix: [] });

  // ------------------------------------------------------------ camera: one framing per step (keyed on the furthest step reached), follows the anvil
  const CAMY = { 0: 12.5, 1: 12.5, 2: 21.5, 3: 27.5, 4: 32.5, 5: 47, 6: 62, 7: 69, 8: 77, 9: 94, 10: 107, 11: 127, 12: 158, 13: 165.5, 14: 170, 15: 177,
    16: 186, 17: 190, 18: 196, 19: 203, 20: 208, 21: 214, 22: 220, 23: 226, 24: 232, 25: 235, 26: 240, 29: 261 };
  S.camState.s = S.camState.ts = 0.8; S.camState.cy = S.camState.ty = CAMY[0];
  // playback speed per step (multiples of 0.25): slow on the big moments, real time while a ball just rolls
  const RATE = { 0: 1, 1: 0.5, 2: 1, 3: 0.75, 4: 0.75, 5: 0.5, 6: 1, 7: 0.5, 8: 0.5, 9: 1, 10: 0.75, 11: 0.5, 12: 0.75, 13: 0.75, 14: 1, 15: 1, 16: 0.5, 17: 0.75, 18: 0.75,
    19: 1, 20: 1, 21: 1, 22: 1, 23: 1, 24: 0.5, 25: 0.5, 26: 1, 27: 0.5, 28: 0.5, 29: 1 };
  const farthest = sim => { let n = 0; for (const st of sim.steps) if (st.n > n) n = st.n; return n; };
  S.timeScale = (t, sim) => RATE[farthest(sim)];
  S.camFn = (c, sim) => {
    const n = farthest(sim);
    c.ty = CAMY[n] !== undefined ? CAMY[n] : c.ty; c.ts = 0.8; c.k = 2.2; c.tcx = WW / 2;
    if (n === 27 || n === 28) { c.ty = Math.min(256, Math.max(250, anvilBody.body.getPosition().y + 5)); c.k = 6; }
    if (n === 29) c.k = 1.4;
  };
  M.tail = 6.0;                                 // seconds the finished heart is held at the end (the last ball rolls off its plate a little later)
  return M;
}

module.exports = { build, WW };
