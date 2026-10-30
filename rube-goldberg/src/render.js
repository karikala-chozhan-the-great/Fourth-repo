// usage: node render.js <timeline.json> <outDir> <startFrame> <endFrame> [workers] [step]   (frames are written as JPEGs)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const [tlPath, outDir, a, b, workers = '4', step = '1'] = process.argv.slice(2);
const tl = JSON.parse(fs.readFileSync(tlPath, 'utf8'));
const start = +a, end = Math.min(+b, tl.frames.length - 1), N = +workers, st = +step;
fs.mkdirSync(outDir, { recursive: true });
(async () => {
  const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text'] });
  const frames = []; for (let f = start; f <= end; f += st) frames.push(f);
  let next = 0, done = 0;
  const worker = async () => {
    const page = await browser.newPage({ viewport: { width: tl.vw || 1080, height: tl.vh || 1920 }, deviceScaleFactor: 1 });
    page.on('pageerror', e => { console.error('PAGEERROR', e.message); process.exit(1); });
    page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
    await page.goto('file://' + path.resolve(__dirname, 'index.html'));
    await page.evaluate(async () => { await Promise.all(['64px Bangers', 'bold 40px "Comic Neue"'].map(f => document.fonts.load(f))); await document.fonts.ready; });
    await page.evaluate(t => init(t), tl);
    if (process.env.DEBUGCAM) { const [cy, sc] = process.env.DEBUGCAM.split(',').map(Number); await page.evaluate(([cy, sc]) => TL.cam.forEach(c => { c[1] = cy; c[2] = sc; }), [cy, sc]); }
    for (;;) {
      const i = next++; if (i >= frames.length) break; const f = frames[i];
      await page.evaluate(f => drawFrame(f), f);
      const buf = await page.screenshot({ type: 'jpeg', quality: 94 });
      fs.writeFileSync(path.join(outDir, `f${String(f).padStart(5, '0')}.jpg`), buf);
      if (++done % 100 === 0) console.log(`rendered ${done}/${frames.length}`);
    }
    await page.close();
  };
  await Promise.all(Array.from({ length: N }, worker));
  await browser.close();
  console.log('done', frames.length);
})();
