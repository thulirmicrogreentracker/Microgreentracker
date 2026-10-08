const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = process.env.E2E_OUT || fs.mkdtempSync(require('node:path').join(require('node:os').tmpdir(), 'microgreen-visual-'));
fs.mkdirSync(out, { recursive: true });
(async () => {
  // E2E_CHANNEL=chrome uses the installed Google Chrome instead of Playwright's own download.
  const browser = await chromium.launch(process.env.E2E_CHANNEL ? { channel: process.env.E2E_CHANNEL } : {});
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.addInitScript(() => {
    if (localStorage.getItem('visual-test-seeded')) return;
    const now = new Date(),
      date = (n) => {
        const d = new Date(now);
        d.setDate(d.getDate() + n);
        return d.toISOString().slice(0, 10);
      };
    let tray = 0;
    const seed = [
      ['Radish', 'growth', 6],
      ['Broccoli', 'germination', 8],
      ['Sunflower', 'sowing', 4],
      ['Pea Shoots', 'harvest', 6],
      ['Radish', 'completed', 4],
    ];
    const batches = seed.map(([crop, stage, count], i) => ({
      id: `b${i}`,
      batchNumber: i + 1,
      cropType: crop,
      trays: Array.from({ length: count }, () => {
        const n = ++tray;
        return {
          id: `t${n}`,
          code: `T${String(n).padStart(3, '0')}`,
          slot: stage === 'completed' ? undefined : n,
          status: 'active',
          ...(stage === 'completed' ? { harvestWeight: 200 } : {}),
        };
      }),
      sowingDate: date(-6),
      expectedHarvestDate: date(3),
      stage,
      notes: [],
      photos: [],
      watering: [],
      lighting: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      ...(stage === 'completed' ? { actualHarvestDate: date(-1), yieldAmount: 800, yieldUnit: 'grams' } : {}),
    }));
    localStorage.setItem('microgreen-batches', JSON.stringify(batches));
    localStorage.setItem(
      'microgreen-config',
      JSON.stringify({
        totalTrays: 36,
        farmLayout: { rackCount: 6, shelvesPerRack: 6, traysPerShelf: 1 },
        trayNumberPrefix: 'Tray',
      })
    );
    localStorage.setItem('visual-test-seeded', '1');
  });
  await page.goto('http://localhost:4173/');
  await page.getByRole('heading', { name: 'My farm.' }).waitFor();
  await page
    .locator('.tray-art img')
    .first()
    .evaluate((img) => img.decode());
  await page.screenshot({ path: `${out}/01-home.png` });
  const nav = (name) =>
    page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name, exact: true });
  // A finger dragged from the left edge of the top page, as on a phone.
  const swipeBack = () =>
    page.evaluate(async () => {
      const pages = document.querySelectorAll('.swipe-page');
      const el = pages[pages.length - 1] ?? document.querySelector('main');
      const touch = (type, x) => {
        const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: 400 });
        el.dispatchEvent(
          new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true })
        );
      };
      touch('touchstart', 6);
      for (let x = 20; x <= 300; x += 40) touch('touchmove', x);
      touch('touchend', 300);
      await new Promise((r) => setTimeout(r, 400));
    });

  // Home shows three care tasks; the rest are on the All tasks page, which goes back with a swipe.
  assert.equal(await page.locator('.care-list > button:not(.care-more)').count(), 3);
  await page.getByRole('button', { name: /See all 5 tasks/ }).click();
  await page.locator('.swipe-page').getByRole('heading', { name: "Today's care", exact: true }).waitFor();
  assert.equal(await page.locator('.swipe-page .care-list > button').count(), 5);
  await swipeBack();
  assert.equal(await page.locator('.swipe-page').count(), 0);

  // Batches: a pill per stage with its count, and each card says where its trays are.
  await nav('Batches').click();
  assert.equal(await page.getByRole('group', { name: 'Show batches' }).getByRole('button', { name: /^Ready\s*1$/ }).count(), 1);
  await page.locator('[data-batch-card]', { hasText: 'Pea Shoots' }).getByText('Rack D · Shelves 1–6').waitFor();
  // A swipe from the left edge on a tab goes back to Home.
  await swipeBack();
  await page.getByRole('heading', { name: 'My farm.' }).waitFor();
  await nav('Shelves').click();
  await page.getByLabel('Select rack').selectOption('1');
  await page.getByRole('button', { name: /Expand shelf 1/ }).click();
  await page.getByRole('button', { name: 'Open tray T007' }).waitFor();
  await page.getByLabel('Select rack').selectOption('0');
  await page.screenshot({ path: `${out}/02-shelves.png` });
  assert.equal(await page.locator('.steel-level').count(), 6);
  assert.equal(await page.locator('.steel-tray-row.single-tray').count(), 6);
  await page.screenshot({ path: `${out}/03-expanded-shelf.png` });
  await page.getByRole('button', { name: 'Tiles', exact: true }).click();
  await page.screenshot({ path: `${out}/02-shelves.png` });
  await page.getByRole('button', { name: /Shelf 1/ }).click();
  assert.equal(await page.locator('.steel-level').count(), 1);
  await page.getByRole('button', { name: 'Open tray T001' }).click();
  await page.getByRole('heading', { name: 'Tray T001' }).waitFor();
  await page.screenshot({ path: `${out}/04-tray.png` });
  await page.locator('.swipe-page').getByRole('button', { name: /B001 · Radish/ }).click();
  await page.locator('[data-batch-card]').first().waitFor();
  await page.screenshot({ path: `${out}/05-batches.png` });
  await nav('Insights').click();
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const download = await dl;
  await download.saveAs(`${out}/report.csv`);
  assert(fs.readFileSync(`${out}/report.csv`, 'utf8').includes('Radish'));
  await page.screenshot({ path: `${out}/06-insights.png` });
  const pdf = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PDF report', exact: true }).click();
  await (await pdf).saveAs(`${out}/report.pdf`);
  assert(fs.readFileSync(`${out}/report.pdf`).subarray(0, 4).toString() === '%PDF');
  await nav('Settings').click();
  await page.getByRole('button', { name: /^Racks & shelves/ }).click();
  await page.getByLabel('Racks', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Save rack layout' }).click();
  await page.getByRole('alert').filter({ hasText: 'Rack D / Shelf 6 is in use' }).waitFor();
  await page.getByLabel('Racks', { exact: true }).fill('8');
  await page.getByRole('button', { name: 'Save rack layout' }).click();
  await page.getByText('48 total tray positions').waitFor();
  await page.screenshot({ path: `${out}/07-settings.png` });
  await page.reload();
  await nav('Shelves').click();
  assert.equal(await page.getByLabel('Select rack').locator('option').count(), 8);
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await nav('Home').click();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`);
  }
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    'PASS: five tabs, all tasks, swipe back, stage pills, batch locations, rack selection, expanded shelf, tray detail, batch navigation, PDF/CSV downloads, settings pages, capacity guard, persistence and responsive widths.'
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
