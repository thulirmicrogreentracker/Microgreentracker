// Supplies and Shop settings: stock taken oldest first, what a batch uses and costs, alerts, and loading old or damaged data.
const { buildSync } = require('esbuild');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'supplies-'));
function load(file) {
  const outfile = path.join(tmp, path.basename(file) + '.cjs');
  buildSync({ entryPoints: [file], outfile, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent' });
  return require(outfile);
}
try {
  const s = load('src/utils/supplies.ts');
  const { normalizeAppData } = load('src/storage/legacy.ts');
  const { normalizeShopSettings, formatMoney } = load('src/data/shop.ts');

  const lot = (id, quantity, extra = {}) => ({ id, quantity, remaining: quantity, purchasedOn: '2026-09-01', ...extra });
  const seed = {
    id: 'sun',
    kind: 'seed',
    name: 'Sunflower seed',
    crop: 'Sunflower',
    unit: 'g',
    lowAt: 200,
    createdAt: '2026-09-01T00:00:00Z',
    lots: [
      lot('new', 1000, { purchasedOn: '2026-10-01', price: 400 }),
      lot('old', 300, { purchasedOn: '2026-09-01', price: 150 }),
      lot('expiring', 100, { purchasedOn: '2026-10-05', expiresOn: '2026-10-20', price: 60 }),
    ],
  };
  const peat = { id: 'peat', kind: 'media', name: 'Coco peat', unit: 'block', traysPerUnit: 8, autoUse: true, createdAt: '', lots: [lot('p1', 2, { price: 300 })] };

  // Stock leaves the lot that expires first, then the oldest purchase.
  const taken = s.takeFromStock(seed, 500);
  assert.deepEqual(
    taken.use.map(u => [u.lotId, u.amount, u.cost]),
    [
      ['expiring', 100, 60],
      ['old', 300, 150],
      ['new', 100, 40],
    ]
  );
  assert.equal(s.stockOf(taken.item), 900);
  assert.equal(taken.short, 0);
  assert.equal(s.takeFromStock(seed, 1500).short, 100);

  // A new 5-tray batch takes 5 × 120 g of its crop's seed and 5/8 of a coco peat block.
  const batch = { cropType: 'sunflower', seedWeightPerTray: 120, trays: Array.from({ length: 5 }, (_, i) => ({ id: `t${i}`, code: '', status: 'active' })) };
  const result = s.suppliesForBatch([seed, peat], batch);
  assert.equal(s.stockOf(result.supplies[0]), 800);
  assert.equal(s.stockOf(result.supplies[1]), 1.375);
  assert.deepEqual(result.short, []);
  assert.equal(s.batchSupplyCost({ supplyUse: result.use }), 60 + 150 + 80 + 93.75);
  // Not enough seed: takes what's there and reports the rest.
  const short = s.suppliesForBatch([{ ...seed, lots: [lot('only', 100)] }], batch);
  assert.equal(short.short[0].amount, 500);
  // No seed in Supplies for the crop, and media not used for every batch: nothing is taken.
  assert.deepEqual(s.suppliesForBatch([{ ...peat, autoUse: false }], { ...batch, cropType: 'Radish' }).use, []);

  // Alerts: low stock, expired and expiring lots.
  const lowSeed = { ...seed, lots: [lot('a', 150, { expiresOn: '2026-10-01' })] };
  const alerts = s.supplyAlerts([lowSeed, { ...peat, lots: [lot('b', 2, { expiresOn: '2026-10-25' })] }], '2026-10-11');
  assert.deepEqual(
    alerts.map(a => [a.item.id, a.kind]),
    [
      ['sun', 'low'],
      ['sun', 'expired'],
      ['peat', 'expiring'],
    ]
  );
  assert.equal(s.formatAmount(2.375, 'block'), '2.38 blocks');
  assert.equal(s.formatAmount(1, 'block'), '1 block');
  assert.equal(s.formatAmount(1250, 'g'), '1,250 g');
  assert.equal(s.traysCovered(peat, []), 16);
  assert.equal(s.traysCovered(seed, [{ cropType: 'Sunflower', seedWeightPerTray: 120, sowingDate: '2026-10-01' }]), 11);

  // Damaged supplies data is repaired rather than crashing the app.
  const fixed = s.normalizeSupplies([
    { id: 'x', kind: 'nonsense', name: '  ', lots: [{ id: 'l', quantity: 5, remaining: 9, purchasedOn: 'bad' }] },
    { kind: 'seed' }, // no id: dropped
    'junk',
  ]);
  assert.equal(fixed.length, 1);
  assert.equal(fixed[0].kind, 'other');
  assert.equal(fixed[0].name, 'Supply');
  assert.equal(fixed[0].lots[0].remaining, 5);
  assert.match(fixed[0].lots[0].purchasedOn, /^\d{4}-\d{2}-\d{2}$/);

  // Data saved before supplies and Shop settings existed loads with defaults.
  const old = normalizeAppData({ batches: [], config: { totalTrays: 12 } });
  assert.deepEqual(old.supplies, []);
  assert.deepEqual(old.config.shop, { enabled: true, accent: 'terracotta', currency: 'INR' });
  assert.deepEqual(normalizeShopSettings({ enabled: false, accent: 'blue', currency: 'usd' }), { enabled: false, accent: 'blue', currency: 'INR' });
  assert.deepEqual(normalizeShopSettings({ accent: 'neon', currency: 'GBP' }), { enabled: true, accent: 'terracotta', currency: 'GBP' });
  assert.match(formatMoney(1250, 'INR'), /1,250/);

  console.log('PASS: stock oldest first, batch supplies and cost, shortfalls, alerts, amounts, repair of damaged data, defaults for old data.');
} catch (e) {
  console.error(e);
  process.exit(1);
}
