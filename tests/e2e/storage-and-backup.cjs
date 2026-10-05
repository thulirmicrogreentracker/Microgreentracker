const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const URL = 'http://localhost:4173/';
// Screenshots and downloaded files go here.
const OUT = process.env.E2E_OUT || fs.mkdtempSync(path.join(require('os').tmpdir(), 'microgreen-e2e-'));
const ASSETS = path.join(__dirname, '..', '..', 'assets');
let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`); if (!cond) failures++; };

// Lists paths in the Filesystem plugin's browser store (IndexedDB "Disc").
const listDisc = page => page.evaluate(() => new Promise(resolve => {
  const req = indexedDB.open('Disc');
  req.onsuccess = () => {
    const db = req.result;
    const all = db.transaction('FileStorage', 'readonly').objectStore('FileStorage').getAll();
    all.onsuccess = () => resolve(all.result.map(e => ({ path: e.path, type: e.type, size: e.size, mtime: e.mtime, content: e.type === 'file' && e.path.endsWith('.json') ? e.content : undefined })));
  };
}));
const putDisc = (page, entry) => page.evaluate(entry => new Promise(resolve => {
  const req = indexedDB.open('Disc');
  req.onsuccess = () => {
    const tx = req.result.transaction('FileStorage', 'readwrite');
    tx.objectStore('FileStorage').put(entry);
    tx.oncomplete = resolve;
  };
}), entry);
const dataFiles = async page => (await listDisc(page)).filter(e => /microgreen\/data-[ab]\.json$/.test(e.path)).map(e => ({ path: e.path, env: (() => { try { return JSON.parse(e.content); } catch { return null; } })() }));
const latestData = async page => (await dataFiles(page)).filter(f => f.env).sort((a, b) => b.env.seq - a.env.seq)[0].env;

(async () => {
  // E2E_CHANNEL=chrome uses the installed Google Chrome instead of Playwright's own download.
  const browser = await chromium.launch(process.env.E2E_CHANNEL ? { channel: process.env.E2E_CHANNEL } : {});
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 400, height: 860 } });
  const page = await context.newPage();
  page.on('dialog', d => { console.log(`  dialog: ${d.message().slice(0, 110)}`); d.accept(); });
  page.on('pageerror', e => { console.log(`  PAGE ERROR: ${e.message}`); failures++; });

  // ---------- 1. Seed the OLD storage format (localStorage + IndexedDB snapshots) ----------
  await page.goto(URL + 'nonexistent.html').catch(() => {});
  await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 40; c.height = 30;
    const g = c.getContext('2d'); g.fillStyle = '#0a0'; g.fillRect(0, 0, 40, 30);
    const dataUrl = c.toDataURL('image/png');
    const now = new Date().toISOString();
    const batch = (id, crop, tray, photos) => ({ id, cropType: crop, trayId: tray, trayNumber: Number(tray.slice(1)), sowingDate: '2026-09-28', expectedHarvestDate: '2026-10-08', stage: 'growth', notes: [], photos, watering: [], lighting: [], createdAt: now, updatedAt: now });
    const batches = [
      batch('legacy1', 'Radish', 'T1', [{ id: 'ph1abc', url: dataUrl, caption: 'old photo', timestamp: now, stage: 'growth' }]),
      batch('legacy2', 'Basil', 'T2', []),
    ];
    localStorage.setItem('microgreen-batches', JSON.stringify(batches));
    localStorage.setItem('microgreen-config', JSON.stringify({ totalTrays: 15, trayNumberPrefix: 'Rack' }));
    localStorage.setItem('microgreen-reminders', JSON.stringify([]));
    await new Promise(resolve => {
      const req = indexedDB.open('microgreen-backups', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('snapshots', { keyPath: 'id' });
      req.onsuccess = () => {
        const tx = req.result.transaction('snapshots', 'readwrite');
        tx.objectStore('snapshots').put({ id: 'backup-old', timestamp: '2026-09-30T08:00:00.000Z', label: 'old', size: 1, data: { 'microgreen-batches': [batches[1]] } });
        tx.oncomplete = () => { req.result.close(); resolve(); };
      };
    });
  });

  // ---------- 2. First launch of the new version migrates it ----------
  await page.goto(URL);
  await page.getByText('Radish').first().waitFor();
  check(await page.getByText('Basil').count() > 0, 'migration: both legacy batches shown');
  await page.waitForFunction(() => /Backup:/.test(document.body.innerText)); // daily snapshot runs after data loads
  let disc = await listDisc(page);
  check(disc.some(e => e.path.endsWith('/microgreen/photos/ph1abc.png')), 'migration: embedded photo written as photos/ph1abc.png');
  let env = await latestData(page);
  check(env.data.batches[0].photos[0].file === 'ph1abc.png' && !('url' in env.data.batches[0].photos[0]), 'migration: batch photo now references the file, no data URL');
  check(env.data.config.totalTrays === 15 && env.data.config.trayNumberPrefix === 'Rack', 'migration: config carried over');
  check(env.data.cropTypes.length === 53, 'migration: missing crop types fall back to the 53 standard crops');
  const snaps = disc.filter(e => /microgreen\/snapshots\/snapshot-\d+\.json$/.test(e.path));
  check(snaps.some(e => e.path.includes(`snapshot-${Date.parse('2026-09-30T08:00:00.000Z')}`)), 'migration: old IndexedDB snapshot moved to a snapshot file');
  check(snaps.length === 2, `migration: old snapshot + today's daily snapshot (${snaps.length})`);
  check(await page.evaluate(() => localStorage.getItem('microgreen-batches') !== null), 'migration: old localStorage left in place as fallback');

  // ---------- 3. Changes persist across restarts ----------
  const seqBefore = env.seq;
  await page.locator('button.fixed').click(); // floating add button
  await page.locator('select').first().selectOption('Kale');
  await page.getByRole('button', { name: /^Add \d+ tray/ }).click(); // tray ID and number are automatic
  await page.getByText('Kale').first().waitFor();
  await page.waitForTimeout(300);
  env = await latestData(page);
  check(env.seq > seqBefore && env.data.batches.some(b => b.cropType === 'Kale'), 'save: new batch written to data file');
  await page.reload();
  await page.getByText('Radish').first().waitFor();
  check(await page.getByText('Kale').count() > 0, 'save: new batch still there after restart');
  check(await page.evaluate(() => !localStorage.getItem('microgreen-batches').includes('Kale')), 'save: old localStorage no longer written');

  // ---------- 5. Adding a photo stores a compressed JPEG file ----------
  const kaleCard = page.locator('[data-batch-card]', { hasText: 'Kale' }).first();
  if (await kaleCard.locator('button[aria-expanded="false"]').count()) await kaleCard.locator('button[aria-expanded]').click(); // cards start collapsed
  await kaleCard.getByRole('button', { name: /Photo/ }).click();
  await page.locator('input[type=file][accept="image/*"]').setInputFiles(path.join(ASSETS, 'splash.png')); // 2732x2732
  await page.getByPlaceholder('Describe this photo...').fill('new photo');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(1500);
  env = await latestData(page);
  const kale = env.data.batches.find(b => b.cropType === 'Kale');
  const photoName = kale.photos[0] && kale.photos[0].file;
  check(/^\d+-[a-z0-9]+\.jpg$/.test(photoName || ''), `photo: batch references ${photoName}`);
  disc = await listDisc(page);
  const photoEntry = disc.find(e => e.path.endsWith('/photos/' + photoName));
  const originalSize = fs.statSync(path.join(ASSETS, 'splash.png')).size;
  check(photoEntry && photoEntry.size > 0, `photo: file stored (${photoEntry && photoEntry.size} base64 chars vs ${originalSize} byte original)`);
  const dims = await page.evaluate(async name => {
    const req = indexedDB.open('Disc');
    const entry = await new Promise(r => { req.onsuccess = () => { const g = req.result.transaction('FileStorage').objectStore('FileStorage').getAll(); g.onsuccess = () => r(g.result.find(e => e.path.endsWith('/photos/' + name))); }; });
    const img = new Image(); img.src = 'data:image/jpeg;base64,' + entry.content; await img.decode();
    return [img.naturalWidth, img.naturalHeight];
  }, photoName);
  check(dims[0] === 1600 && dims[1] === 1600, `photo: resized to ${dims.join('x')} (max 1600)`);

  // ---------- 6. Export backup file ----------
  await page.getByRole('button', { name: 'Config' }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save File' }).click()]);
  const zipPath = path.join(OUT, download.suggestedFilename());
  await download.saveAs(zipPath);
  check(/^microgreen-backup-\d{4}-\d{2}-\d{2}\.zip$/.test(download.suggestedFilename()), `export: file name ${download.suggestedFilename()}`);
  const listing = execSync(`unzip -l ${zipPath}`).toString();
  console.log(listing.split('\n').filter(l => /backup|photos/.test(l)).map(l => '  ' + l.trim()).join('\n'));
  check(listing.includes('backup.json') && listing.includes('photos/ph1abc.png') && listing.includes('photos/' + photoName), 'export: zip has backup.json and both photos');
  const manifest = JSON.parse(execSync(`unzip -p ${zipPath} backup.json`).toString());
  check(manifest.format === 'microgreen-manager-backup' && manifest.schemaVersion === 2 && manifest.data.batches.length === 3, 'export: manifest has format, version and 3 batches');

  // ---------- 7. Wipe data, then restore from the file ----------
  await page.getByRole('button', { name: 'Home' }).click();
  for (const crop of ['Radish', 'Basil', 'Kale']) {
    const c = page.locator('[data-batch-card]', { hasText: crop }).first();
    if (await c.locator('button[aria-expanded="false"]').count()) await c.locator('button[aria-expanded]').click();
    await c.getByRole('button', { name: 'Delete batch' }).click();
    await page.waitForTimeout(200);
  }
  await page.getByText('No batches yet').waitFor();
  check(true, 'restore: all batches deleted, empty state shown');
  // simulate the photo files being gone too (e.g. a new phone)
  await page.evaluate(() => new Promise(resolve => {
    const req = indexedDB.open('Disc');
    req.onsuccess = () => {
      const store = req.result.transaction('FileStorage', 'readwrite').objectStore('FileStorage');
      const all = store.getAll();
      all.onsuccess = () => { all.result.filter(e => e.path.includes('/photos/') && e.type === 'file').forEach(e => store.delete(e.path)); store.transaction.oncomplete = resolve; };
    };
  }));
  await page.getByRole('button', { name: 'Restore from a backup file' }).click();
  await page.locator('input[type=file][accept^=".zip"]').setInputFiles(zipPath);
  await page.getByText('Kale').first().waitFor({ timeout: 10000 });
  check(await page.getByText('Radish').count() > 0 && await page.getByText('Basil').count() > 0, 'restore: all 3 batches back');
  await page.waitForTimeout(500);
  disc = await listDisc(page);
  check(disc.some(e => e.path.endsWith('/photos/ph1abc.png')) && disc.some(e => e.path.endsWith('/photos/' + photoName)), 'restore: photo files written back');
  await page.reload();
  await page.getByText('Kale').first().waitFor();
  check(true, 'restore: survives restart');

  // ---------- 8. Old .json downloads can still be restored ----------
  const legacyJson = path.join(OUT, 'microgreen-backup-legacy.json');
  fs.writeFileSync(legacyJson, JSON.stringify({ 'microgreen-batches': [{ id: 'j1', cropType: 'Sunflower', trayId: 'T5', trayNumber: 5, sowingDate: '2026-09-01', expectedHarvestDate: '2026-09-11', stage: 'completed', notes: [], photos: [], watering: [], lighting: [], createdAt: 'x', updatedAt: 'x' }] }));
  await page.getByRole('button', { name: 'Config' }).click();
  await page.getByRole('button', { name: 'Restore File' }).click();
  await page.locator('input[type=file][accept^=".zip"]').setInputFiles(legacyJson);
  await page.getByText('Sunflower').first().waitFor({ timeout: 10000 });
  check(await page.getByText('Kale').count() === 0, 'legacy json: restored, replacing current data');

  // ---------- 9. Not-a-backup file is rejected without changing data ----------
  const junk = path.join(OUT, 'junk.zip');
  fs.writeFileSync(junk, 'hello');
  await page.getByRole('button', { name: 'Config' }).click();
  await page.getByRole('button', { name: 'Restore File' }).click();
  await page.locator('input[type=file][accept^=".zip"]').setInputFiles(junk);
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Home' }).click();
  check(await page.getByText('Sunflower').count() > 0, 'junk file: rejected, data unchanged');

  // ---------- 10. On-phone snapshot restore (undo the legacy import) ----------
  await page.getByRole('button', { name: 'Config' }).click();
  await page.getByRole('button', { name: /^Restore$/ }).click();
  await page.getByText('Daily Backups').waitFor();
  await page.locator('div.rounded-t-2xl').getByRole('button', { name: 'Restore' }).first().click(); // newest = copy taken right before the .json import
  await page.getByText('Kale').first().waitFor({ timeout: 10000 });
  check(await page.getByText('Sunflower').count() === 0, 'snapshot: restoring the pre-import copy brings back the 3 batches');

  // ---------- 11. A half-written data file falls back to the other copy ----------
  const files = await dataFiles(page);
  const newest = files.filter(f => f.env).sort((a, b) => b.env.seq - a.env.seq)[0];
  const older = files.find(f => f.path !== newest.path);
  const all = await page.evaluate(p => new Promise(r => { const q = indexedDB.open('Disc'); q.onsuccess = () => { const g = q.result.transaction('FileStorage').objectStore('FileStorage').get(p); g.onsuccess = () => r(g.result); }; }), newest.path);
  await putDisc(page, { ...all, content: all.content.slice(0, 50) }); // truncated, like a crash mid-write
  await page.reload();
  await page.locator('h1').waitFor();
  await page.waitForTimeout(800);
  const olderBatches = older.env.data.batches.map(b => b.cropType).sort().join(',');
  const shown = [];
  for (const c of ['Radish', 'Basil', 'Kale', 'Sunflower']) if (await page.getByText(c).count() > 0) shown.push(c);
  check(shown.sort().join(',') === olderBatches, `crash: loaded the previous copy (${shown.join(',')}) instead of failing`);

  // ---------- 12. Orphaned old photo files are cleaned up; recent ones kept ----------
  await putDisc(page, { path: '/DATA/microgreen/photos/orphan-old.jpg', folder: '/DATA/microgreen/photos', type: 'file', size: 4, ctime: 1, mtime: 1, content: 'AAAA' });
  await putDisc(page, { path: '/DATA/microgreen/photos/orphan-new.jpg', folder: '/DATA/microgreen/photos', type: 'file', size: 4, ctime: Date.now() + 60000, mtime: Date.now() + 60000, content: 'AAAA' });
  await page.reload();
  await page.locator('h1').waitFor();
  await page.waitForTimeout(1500);
  disc = await listDisc(page);
  check(!disc.some(e => e.path.endsWith('orphan-old.jpg')), 'cleanup: unused old photo deleted');
  check(disc.some(e => e.path.endsWith('orphan-new.jpg')), 'cleanup: photo written after launch kept');
  check(disc.some(e => e.path.endsWith('ph1abc.png')), 'cleanup: photo used by data/snapshots kept');

  await page.screenshot({ path: path.join(OUT, 'home.png') });
  await page.getByRole('button', { name: 'Config' }).click();
  await page.screenshot({ path: path.join(OUT, 'config.png') });
  await browser.close();
  console.log(failures === 0 ? '\nALL PASSED' : `\n${failures} FAILURE(S)`);
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
