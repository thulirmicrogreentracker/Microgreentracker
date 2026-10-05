const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = 'http://localhost:4173/';
// Screenshots and downloaded files go here.
const OUT = process.env.E2E_OUT || fs.mkdtempSync(path.join(require('os').tmpdir(), 'microgreen-e2e-'));
const ASSETS = path.join(__dirname, '..', '..', 'assets');
let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`); if (!cond) failures++; };

const disc = page => page.evaluate(() => new Promise(resolve => {
  const req = indexedDB.open('Disc');
  req.onsuccess = () => {
    const all = req.result.transaction('FileStorage', 'readonly').objectStore('FileStorage').getAll();
    all.onsuccess = () => resolve(all.result.map(e => ({ path: e.path, type: e.type, content: e.type === 'file' ? e.content : undefined })));
  };
}));
const latestData = async page => {
  const files = (await disc(page)).filter(e => /microgreen\/data-[ab]\.json$/.test(e.path)).map(e => { try { return JSON.parse(e.content); } catch { return null; } }).filter(Boolean);
  return files.sort((a, b) => b.seq - a.seq)[0].data;
};
const imgSize = (page, b64) => page.evaluate(async b64 => {
  const img = new Image(); img.src = 'data:image/jpeg;base64,' + b64; await img.decode(); return [img.naturalWidth, img.naturalHeight];
}, b64);

(async () => {
  // E2E_CHANNEL=chrome uses the installed Google Chrome instead of Playwright's own download.
  const browser = await chromium.launch(process.env.E2E_CHANNEL ? { channel: process.env.E2E_CHANNEL } : {});
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 400, height: 860 }, hasTouch: true });
  const page = await context.newPage();
  page.on('dialog', d => d.accept());
  page.on('pageerror', e => { console.log(`  PAGE ERROR: ${e.message}`); failures++; });
  page.on('console', m => { if (m.type() === 'error') console.log(`  console.error: ${m.text().slice(0, 200)}`); });

  // ---------- Seed batches with real images via the old storage format ----------
  await page.goto(URL + 'seed.html').catch(() => {});
  await page.evaluate(() => {
    const pic = (hue, label) => {
      const c = document.createElement('canvas'); c.width = 800; c.height = 600;
      const g = c.getContext('2d');
      g.fillStyle = `hsl(${hue},55%,45%)`; g.fillRect(0, 0, 800, 600);
      g.fillStyle = '#fff'; g.font = 'bold 90px sans-serif'; g.fillText(label, 60, 330);
      return c.toDataURL('image/jpeg', 0.8);
    };
    const localDate = daysAgo => { const d = new Date(); d.setDate(d.getDate() - daysAgo); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const at = (sowAgo, day, hour = 9) => { const d = new Date(); d.setDate(d.getDate() - sowAgo + day); d.setHours(hour, 0, 0, 0); return d.toISOString(); };
    const now = new Date().toISOString();
    const batch = (id, crop, tray, sowAgo, stage, photos, extra = {}) => ({
      id, cropType: crop, trayId: tray, trayNumber: Number(tray.slice(1)), sowingDate: localDate(sowAgo), expectedHarvestDate: localDate(sowAgo - 8), stage,
      notes: [], watering: [], lighting: [], createdAt: now, updatedAt: now, ...extra,
      photos: photos.map(([day, st, caption], i) => ({ id: `${id}p${i}`, url: pic(day * 12, `${tray} D${day}`), caption, timestamp: at(sowAgo, day, day === 8 ? 7 : 9), stage: st })),
    });
    const batches = [
      batch('r1', 'Radish', 'T1', 8, 'harvest', [[0, 'sowing', 'Seeds spread'], [2, 'germination', 'Dome on'], [3, 'germination', 'Pushing up'], [5, 'growth', 'Under lights'], [6, 'growth', ''], [8, 'harvest', 'Ready to cut']]),
      batch('r4', 'Radish', 'T4', 20, 'completed', [[2, 'germination', ''], [5, 'growth', ''], [8, 'harvest', 'Cut today']], { actualHarvestDate: localDate(12), yieldAmount: 120, yieldUnit: 'grams' }),
      batch('b2', 'Basil', 'T2', 2, 'germination', [[2, 'germination', 'First leaves']]),
      batch('k3', 'Kale', 'T3', 1, 'sowing', []),
    ];
    localStorage.setItem('microgreen-batches', JSON.stringify(batches));
  });
  await page.goto(URL);
  // Batches are numbered B001.. in the order they were created (all at once here, so in list order).
  const card = crop => page.locator('[data-batch-card]', { hasText: crop }).first();
  await card('Radish').waitFor();
  await page.getByRole('button', { name: 'Expand all' }).click(); // cards start collapsed

  // ---------- 1. Photo strips on cards ----------
  const radish = card('Radish');
  check(await radish.getByRole('button', { name: /^Day 8 photo$/ }).count() === 1, 'strip: newest photo (Day 8) first');
  const stripLabels = await radish.locator('.grid-cols-5 > button span.text-\\[10px\\]').allInnerTexts();
  check(stripLabels.join(',') === 'Day 8,Day 6,Day 5,Day 3,More', `strip: tiles ${stripLabels.join(',')}`);
  check(await radish.getByRole('button', { name: '2 more photos' }).locator('text=+2').count() === 1, 'strip: fifth tile shows +2');
  check(await radish.getByRole('button', { name: 'Add photo' }).count() === 0, 'strip: no Add tile when full');
  check(await card('Basil').getByRole('button', { name: 'Add photo' }).count() === 1 && await card('Basil').getByRole('button', { name: /^Day 2 photo$/ }).count() === 1, 'strip: Basil shows its 1 photo plus Add tile');
  check(await card('Kale').getByRole('button', { name: 'See all' }).count() === 0 && await card('Kale').getByRole('button', { name: 'Add photo' }).count() === 1, 'strip: Kale (no photos) shows only Add tile');
  check(await radish.locator('text=Photos').count() >= 1, 'card: photo strip shown');

  await page.waitForFunction(() => [...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth > 0).length >= 6);
  let files = await disc(page);
  const thumbs = files.filter(e => e.path.includes('/microgreen/thumbs/') && e.type === 'file');
  check(thumbs.length >= 6, `thumbs: created on demand for migrated photos (${thumbs.length})`);
  const [tw, th] = await imgSize(page, thumbs[0].content);
  check(Math.max(tw, th) === 320, `thumbs: resized to ${tw}x${th}`);

  // Kale "Add" tile opens the photo form
  await card('Kale').getByRole('button', { name: 'Add photo' }).click();
  check(await page.getByRole('heading', { name: 'Add Photo' }).count() === 1, 'strip: Add tile opens the Add Photo form');
  await page.getByRole('button', { name: 'Back' }).last().click();

  // ---------- 2. Gallery ----------
  await radish.getByRole('button', { name: 'See all' }).click();
  await page.getByRole('heading', { name: 'B001 · Radish' }).waitFor();
  check(await page.locator('text=6 photos · Day 8').count() === 1, 'gallery: header shows 6 photos · Day 8');
  // The photo screens open on top of the home screen, which has its own <main> and stage sections: check the top one.
  const top = () => page.locator('main').last();
  const badges = await top().locator('section > div:first-child > span:first-child').allInnerTexts();
  check(badges.join('|') === 'Sowing|Germination|Growing|Ready to Harvest', `gallery: grouped by stage (${badges.join('|')})`);
  check(await page.locator('text=Day 2–3 · 2 photos').count() === 1, 'gallery: section shows day range and count');
  check(await page.locator('main').getByText('No caption').count() === 1, 'gallery: empty caption shows "No caption"');
  await page.getByRole('button', { name: 'Growing', exact: true }).click();
  check(await top().locator('section').count() === 1 && await top().locator('section button').count() === 2, 'gallery: stage filter shows only Growing (2 photos)');
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await page.screenshot({ path: path.join(OUT, 'gallery.png') });

  // ---------- 3. Viewer ----------
  await page.getByRole('button', { name: /^Day 5, Under lights/ }).click();
  await page.locator('text=4 of 6').waitFor();
  check(await page.locator('text=/Day 5 · /').count() === 1 && await page.getByText('Under lights').count() >= 1, 'viewer: opens on the tapped photo (4 of 6, Day 5)');
  await page.getByRole('button', { name: 'Next photo' }).click();
  check(await page.locator('text=5 of 6').count() === 1, 'viewer: Next button');

  const cdp = await context.newCDPSession(page);
  const touch = async (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], id) => ({ x, y, id })) });
  // swipe left → next
  await touch('touchStart', [[320, 330]]);
  for (const x of [280, 220, 160, 100]) await touch('touchMove', [[x, 335]]);
  await touch('touchEnd', []);
  await page.locator('text=6 of 6').waitFor({ timeout: 3000 }).catch(() => {});
  check(await page.locator('text=6 of 6').count() === 1, 'viewer: swipe left goes to next photo');
  // swipe right → previous
  await touch('touchStart', [[100, 330]]);
  for (const x of [160, 220, 280, 320]) await touch('touchMove', [[x, 330]]);
  await touch('touchEnd', []);
  await page.waitForTimeout(200);
  check(await page.locator('text=5 of 6').count() === 1, 'viewer: swipe right goes back');
  // pinch out → zoomed; then swipe should pan, not change photo
  await touch('touchStart', [[180, 330], [220, 330]]);
  for (const d of [40, 80, 120, 160]) await touch('touchMove', [[200 - d, 330], [200 + d, 330]]);
  await touch('touchEnd', [[200 + 160, 330]]);
  await touch('touchEnd', []);
  await page.waitForTimeout(300);
  const transform = await page.locator('.touch-none > div').getAttribute('style');
  const scale = Number(/scale\(([\d.]+)\)/.exec(transform)[1]);
  check(scale > 3 && scale <= 4, `viewer: pinch zooms in (scale ${scale.toFixed(2)})`);
  await touch('touchStart', [[300, 330]]);
  for (const x of [250, 200, 150]) await touch('touchMove', [[x, 330]]);
  await touch('touchEnd', []);
  await page.waitForTimeout(200);
  check(await page.locator('text=5 of 6').count() === 1, 'viewer: while zoomed, dragging pans instead of changing photo');
  for (let i = 0; i < 2; i++) {
    await touch('touchStart', [[200, 330]]);
    await touch('touchEnd', []);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(300);
  check(/scale\(1\)/.test(await page.locator('.touch-none > div').getAttribute('style')), 'viewer: double-tap resets zoom');
  // A mouse double-click also zooms; it is ignored right after a touch, so wait first.
  await page.waitForTimeout(900);
  await page.locator('.touch-none').dblclick();
  await page.waitForTimeout(300);
  check(/scale\(2\.5\)/.test(await page.locator('.touch-none > div').getAttribute('style')), 'viewer: double-tap zooms to 2.5x');
  await page.screenshot({ path: path.join(OUT, 'viewer.png') });

  // caption edit (photo 5 = Day 6, no caption)
  check(await page.locator('section[aria-label="Photo details"]').getByText('No caption').count() === 1, 'viewer: Day 6 has no caption');
  await page.getByRole('button', { name: 'Edit caption' }).click();
  await page.getByLabel('Caption').fill('Thick and even');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  check(await page.locator('section[aria-label="Photo details"]').getByText('Thick and even').count() === 1, 'viewer: caption saved and shown');
  await page.waitForTimeout(300);
  let data = await latestData(page);
  check(data.batches.find(b => b.id === 'r1').photos.find(p => p.id === 'r1p4').caption === 'Thick and even', 'viewer: caption written to the data file');

  // share (browser = download)
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Share' }).click()]);
  check(dl.suggestedFilename() === 'Radish-B001-day-6.jpg', `viewer: share gives ${dl.suggestedFilename()}`);

  // delete → moves to next photo
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.locator('text=5 of 5').waitFor();
  const details = await page.locator('section[aria-label="Photo details"]').innerText();
  check(/Day 8 · /.test(details), `viewer: after delete shows the next photo (5 of 5): ${details.replace(/\n/g, ' | ')}`);
  await page.waitForTimeout(300);
  data = await latestData(page);
  check(data.batches.find(b => b.id === 'r1').photos.length === 5, 'viewer: delete written to the data file');
  await page.keyboard.press('ArrowLeft');
  check(await page.locator('text=4 of 5').count() === 1, 'viewer: arrow keys navigate');
  await page.keyboard.press('Escape');
  await page.locator('text=5 photos · Day 8').waitFor();
  check(true, 'viewer: Escape closes back to gallery, which shows 5 photos');

  // ---------- 4. Compare ----------
  await page.getByRole('button', { name: 'Compare photos' }).click();
  await page.getByRole('heading', { name: 'Compare' }).waitFor();
  check(await page.getByText('8 days apart.').count() === 1, 'compare: defaults to first vs last photo (8 days apart)');
  await page.getByLabel('Before photo').selectOption({ label: await page.getByLabel('Before photo').locator('option', { hasText: 'Day 3' }).innerText() });
  check(await page.getByText('5 days apart.').count() === 1, 'compare: picking Day 3 updates the gap');
  await page.waitForFunction(() => { const mains = document.querySelectorAll('main'); return [...mains[mains.length - 1].querySelectorAll('img')].filter(i => i.complete && i.naturalWidth > 0).length === 2; });
  check(true, 'compare: both photos load');
  await page.getByRole('tab', { name: 'Another batch' }).click();
  const summary = await page.locator('main').last().locator('> div.bg-white').innerText();
  check(/Day 8 of B001 next to day 8 of B002/.test(summary) && /harvested .* · 120 g/.test(summary), `compare: other batch matched by day (${summary})`);
  await page.screenshot({ path: path.join(OUT, 'compare.png') });
  await page.getByRole('button', { name: 'Back' }).last().click();
  await page.getByRole('button', { name: 'Back' }).last().click();

  // ---------- 5. Reports → photos by crop ----------
  await page.getByRole('button', { name: 'Reports' }).click();
  const row = page.getByRole('button', { name: /^Radish/ });
  check(/8 photos · 2 batches/.test(await row.innerText()), `reports: Radish row (${(await row.innerText()).replace(/\n/g, ' ')})`);
  check(/1 photo · 1 batch/.test(await page.getByRole('button', { name: /^Basil/ }).innerText()), 'reports: Basil row singular');
  await row.click();
  await page.getByRole('heading', { name: 'Radish photos' }).waitFor();
  check(await page.getByText('2 batches · 8 photos').count() === 1, 'crop photos: header counts');
  const trays = await top().locator('section h3').allInnerTexts();
  check(trays.join(',') === 'B001,B002', `crop photos: newest batch first (${trays.join(',')})`);
  check(await page.getByText(/harvested .* · 120 g/).count() === 1, 'crop photos: harvested batch shows yield');
  await page.screenshot({ path: path.join(OUT, 'crop.png') });
  await top().locator('section').nth(1).getByRole('button', { name: 'Open', exact: true }).click();
  await page.getByRole('heading', { name: 'B002 · Radish' }).waitFor();
  check(await page.getByText('3 photos · Completed').count() === 1, 'crop photos: Open goes to that batch gallery');

  // ---------- 6. Add photo from the gallery ----------
  await page.getByRole('button', { name: 'Add photo' }).last().click();
  await page.locator('input[type=file][accept="image/*"]').setInputFiles(path.join(ASSETS, 'icon-only.png'));
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByText('4 photos · Completed').waitFor({ timeout: 5000 });
  check(true, 'gallery: Add photo saves into this batch (4 photos)');
  await page.getByRole('button', { name: 'Back' }).last().click();
  await page.getByRole('button', { name: 'Reports' }).last().click();
  await page.getByRole('heading', { name: 'Radish photos' }).waitFor({ state: 'detached' }).catch(() => {});

  // ---------- 7. A missing photo file shows a placeholder, not a crash ----------
  await page.evaluate(() => new Promise(resolve => {
    const req = indexedDB.open('Disc');
    req.onsuccess = () => {
      const store = req.result.transaction('FileStorage', 'readwrite').objectStore('FileStorage');
      const all = store.getAll();
      all.onsuccess = () => { all.result.filter(e => /\/(photos|thumbs)\/b2p0\./.test(e.path)).forEach(e => store.delete(e.path)); store.transaction.oncomplete = resolve; };
    };
  }));
  await page.reload();
  await page.getByRole('button', { name: 'Expand all' }).click();
  await card('Basil').getByText('Missing').waitFor({ timeout: 5000 }).catch(() => {});
  check(await card('Basil').getByText('Missing').count() === 1, 'missing file: tile shows "Missing" placeholder');

  await page.getByRole('button', { name: 'Home' }).click();
  // Radish T1 now has exactly 5 photos: five tiles, no "+N", no Add tile wrapping to a second row
  const r = card('Radish');
  check(await r.locator('.grid-cols-5 > button').count() === 5 && await r.getByRole('button', { name: 'Add photo' }).count() === 0, 'strip: exactly 5 photos fill the row without an Add tile');
  await page.screenshot({ path: path.join(OUT, 'home-strip.png') });
  await browser.close();
  console.log(failures === 0 ? '\nALL PASSED' : `\n${failures} FAILURE(S)`);
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
