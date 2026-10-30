// usage: node sim.js <out.json> [seconds] [--long | --wide | --tour] [--probe]   -> runs the machine and writes the recorded timeline
// (default: the 29 s vertical cut; --long: the 60 s vertical cut; --wide: the first 3-minute 1920x1080 cut; --tour: the second 3-minute cut)
const fs = require('fs');
const { build } = require('./machine');
const wide = process.argv.includes('--wide'), tour = process.argv.includes('--tour');
const { FPS } = require('./engine');
const out = process.argv[2] || 'timeline.json';
const secs = +(process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : (wide || tour ? 260 : 150));
const probe = process.argv.includes('--probe');
const M = tour ? require('./machine_tour').build({}) : wide ? require('./machine_wide').build({}) : build({ long: process.argv.includes('--long') });
const S = M.sim;
const n = Math.round(secs * FPS);
const TAIL = M.tail * FPS;
const t0 = Date.now();
for (let f = 0; f < n; f++) {
  S.stepFrame();
  if (M.pressedAt !== undefined && S.f > M.pressedAt + TAIL) break;
  if (probe && f % 15 === 0) {
    const row = Object.entries(M.hero).map(([k, it]) => `${k}=(${it.body.getPosition().x.toFixed(1)},${it.body.getPosition().y.toFixed(1)}|v${S.speed(it).toFixed(1)})`).join(' ');
    console.log(`t=${(f / FPS).toFixed(1)} step=${S.steps.length ? S.steps[S.steps.length - 1].n : 0} ${row}`);
  }
}
console.log('simulated', n, 'frames in', ((Date.now() - t0) / 1000).toFixed(1), 's; events', S.events.length);
console.log('steps:', S.steps.map(s => `${s.n}@${(s.f / FPS).toFixed(1)}s ${s.label}`).join(' | '));
fs.mkdirSync(require('path').dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(S.export()));
console.log('wrote', out, (fs.statSync(out).size / 1e6).toFixed(1), 'MB');
