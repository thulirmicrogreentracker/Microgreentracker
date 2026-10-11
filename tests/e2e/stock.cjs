// Harvested stock: harvests added and re-weighed, shelf life, selling the earliest use-by first, waste and alerts.
const { buildSync } = require('esbuild');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stock-'));
function load(file) {
  const outfile = path.join(tmp, path.basename(file) + '.cjs');
  buildSync({ entryPoints: [file], outfile, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent' });
  return require(outfile);
}
try {
  const st = load('src/utils/stock.ts');
  const { normalizeAppData } = load('src/storage/legacy.ts');
  const crops = [{ name: 'Sunflower', shelfLifeDays: 5 }, { name: 'Radish' }];
  const batch = { id: 'b1', cropType: 'Sunflower' };

  // A weighed harvest becomes a lot; the use-by date comes from the crop's shelf life (7 days when not set).
  let stock = st.addHarvestToStock([], batch, 1200, '2026-10-10', crops);
  assert.deepEqual([stock[0].id, stock[0].grams, stock[0].remaining, stock[0].useBy], ['h-b1', 1200, 1200, '2026-10-15']);
  assert.equal(st.addHarvestToStock([], { id: 'b2', cropType: 'Radish' }, 300, '2026-10-10', crops)[0].useBy, '2026-10-17');
  assert.deepEqual(st.addHarvestToStock([], batch, 0, '2026-10-10', crops), []);

  // Wasting 200 g, then weighing the harvest again at 1,500 g keeps the 200 g out.
  stock = st.moveStock(stock, 'h-b1', { date: '2026-10-11', grams: 200, kind: 'waste' });
  assert.equal(stock[0].remaining, 1000);
  stock = st.addHarvestToStock(stock, batch, 1500, '2026-10-10', crops);
  assert.deepEqual([stock.length, stock[0].grams, stock[0].remaining], [1, 1500, 1300]);
  // A correction sets the change, up or down.
  stock = st.moveStock(stock, 'h-b1', { date: '2026-10-11', grams: -100, kind: 'adjust' });
  assert.equal(stock[0].remaining, 1200);

  // Selling takes the earliest use-by first and never expired stock.
  const older = st.newStockLot('Sunflower', 400, '2026-10-08', crops);
  const expired = st.newStockLot('Sunflower', 500, '2026-10-01', crops);
  stock = [...stock, older, expired];
  const sold = st.sellFromStock(stock, 'sunflower', 1000, '2026-10-11', 'order-1');
  const after = id => sold.stock.find(l => l.id === id).remaining;
  assert.equal(after(older.id), 0);
  assert.equal(after('h-b1'), 600);
  assert.equal(after(expired.id), 500);
  assert.equal(sold.short, 0);
  assert.equal(sold.stock.find(l => l.id === older.id).moves[0].ref, 'order-1');
  assert.equal(st.sellFromStock(stock, 'Sunflower', 5000, '2026-10-11').short, 5000 - 1600);

  // By crop, alerts and this month's waste.
  const byCrop = st.stockByCrop(sold.stock, '2026-10-11');
  assert.deepEqual([byCrop[0].crop, byCrop[0].available, byCrop[0].expired, byCrop[0].nextUseBy], ['Sunflower', 600, 500, '2026-10-15']);
  const alerts = st.stockAlerts(sold.stock, '2026-10-14');
  assert.deepEqual(alerts.map(a => [a.lot.useBy, a.expired]), [['2026-10-06', true], ['2026-10-15', false]]);
  assert.equal(st.movedSince(sold.stock, 'waste', '2026-10-01'), 200);
  assert.equal(st.movedSince(sold.stock, 'sold', '2026-10-01'), 1000);

  // Damaged stock is repaired, and data from before stock existed loads with none.
  const fixed = st.normalizeStock([{ id: 'x', grams: 100, remaining: 500, harvestedOn: 'bad', moves: [{ id: 'm' }] }, { grams: 5 }]);
  assert.equal(fixed.length, 1);
  assert.equal(fixed[0].remaining, 100);
  assert.deepEqual(fixed[0].moves, []);
  assert.deepEqual(normalizeAppData({ batches: [] }).stock, []);

  console.log('PASS: harvest to stock, re-weighing, shelf life, waste and corrections, earliest use-by sold first, alerts, repair of damaged data.');
} catch (e) {
  console.error(e);
  process.exit(1);
}
