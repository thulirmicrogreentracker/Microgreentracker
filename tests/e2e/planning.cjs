// Sowing for orders (stock and growing batches first, then trays to sow and by when, and what's too soon to grow) and
// the profit report (sales, growing costs, waste, supplies bought, CSV).
const { buildSync } = require('esbuild');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'planning-'));
function load(file) {
  const outfile = path.join(tmp, path.basename(file) + '.cjs');
  buildSync({ entryPoints: [file], outfile, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent' });
  return require(outfile);
}
const tray = (id, harvestWeight, status = 'active', lostDate) => ({ id, code: id, status, harvestWeight, lostDate });
const batch = (id, crop, stage, trays, dates = {}, supplyUse) => ({
  id,
  batchNumber: 1,
  cropType: crop,
  trays,
  sowingDate: '2026-09-20',
  expectedHarvestDate: '2026-10-01',
  stage,
  notes: [],
  photos: [],
  watering: [],
  lighting: [],
  supplyUse,
  createdAt: '',
  updatedAt: '',
  ...dates,
});
try {
  const pl = load('src/utils/plan.ts');
  const pr = load('src/utils/profit.ts');
  const today = '2026-10-11'; // a Sunday
  const cropTypes = [{ name: 'Sunflower', daysToGermination: 2, daysToHarvest: 10, wateringFrequency: 1, lightingHours: 12, category: 'x', shelfLifeDays: 7 }];

  // Yield per tray: from weighed harvests (800 g from 4 trays), or 150 g until there is one.
  const done = batch('done', 'Sunflower', 'completed', [tray('a', 200), tray('b', 200), tray('c', 200), tray('d', 200)], { actualHarvestDate: '2026-10-02' });
  assert.deepEqual(pl.yieldPerTray([done], 'sunflower'), { grams: 200, estimated: false });
  assert.deepEqual(pl.yieldPerTray([done], 'Radish'), { grams: 150, estimated: true });

  // 500 g every Wednesday. 300 g in stock (use by 15 Oct) and 2 trays growing (ready 19 Oct, so 400 g).
  const sub = { id: 's', customerId: 'c', items: [{ crop: 'Sunflower', grams: 500 }], weekdays: [3], everyWeeks: 1, startOn: today, skipped: [], missed: [], delivered: [], createdAt: '' };
  const growing = batch('g', 'Sunflower', 'growth', [tray('e'), tray('f')], { expectedHarvestDate: '2026-10-19' });
  const stock = [{ id: 'l', crop: 'Sunflower', harvestedOn: '2026-10-08', useBy: '2026-10-15', grams: 300, remaining: 300, moves: [] }];
  const { plans, short } = pl.sowPlans([done, growing], stock, [], [sub], cropTypes, today);
  // Wed 14 Oct: 200 g short, too soon to grow. 21 Oct: 100 g short → 1 tray today. 28 Oct: the spare 100 g, then 400 g
  // → 2 trays by 18 Oct. 4 Nov: 500 g → 3 trays by 25 Oct.
  assert.deepEqual(short, [{ crop: 'Sunflower', date: '2026-10-14', grams: 200 }]);
  assert.deepEqual(
    plans.map(p => [p.sowBy, p.trays, p.forDate, p.grams]),
    [
      ['2026-10-11', 1, '2026-10-21', 100],
      ['2026-10-18', 2, '2026-10-28', 400],
      ['2026-10-25', 3, '2026-11-04', 500],
    ]
  );
  // Nothing to plan without orders; an order with no grow history uses the default yield.
  assert.deepEqual(pl.sowPlans([done], stock, [], [], cropTypes, today), { plans: [], short: [] });
  const order = { id: 'o', number: 1, customerId: 'c', deliverOn: '2026-10-25', items: [{ crop: 'Pea Shoots', grams: 400 }], status: 'open', createdAt: '' };
  const pea = pl.sowPlans([], [], [order], [], cropTypes, today).plans;
  assert.deepEqual(pea.map(p => [p.crop, p.trays, p.sowBy, p.estimated]), [['Pea Shoots', 3, '2026-10-15', true]]);

  // Profit for October: two sales (one with a discount, one partly paid), a harvested batch's supplies, a lost batch,
  // waste, a supply bought, and a payment in October for a September sale.
  const sales = [
    { id: '1', number: 1, date: '2026-10-03', customerId: 'c1', items: [{ crop: 'Sunflower', grams: 500, amount: 400 }, { crop: 'Radish', grams: 100, amount: 60 }], discount: 10, total: 450, payments: [{ id: 'p1', date: '2026-10-03', amount: 450, method: 'cash' }], createdAt: '' },
    { id: '2', number: 2, date: '2026-10-09', customerId: 'c2', items: [{ crop: 'Sunflower', grams: 250, amount: 150 }], total: 150, payments: [{ id: 'p2', date: '2026-10-09', amount: 50, method: 'upi' }], createdAt: '' },
    { id: '3', number: 3, date: '2026-09-28', items: [{ crop: 'Radish', grams: 100, amount: 80 }], total: 80, payments: [{ id: 'p3', date: '2026-10-01', amount: 80, method: 'cash' }], createdAt: '' },
  ];
  const cost = c => [{ itemId: 'i', lotId: 'l', amount: 1, cost: c }];
  const batches = [
    batch('h', 'Sunflower', 'completed', [tray('a', 400)], { actualHarvestDate: '2026-10-02' }, cost(120)),
    batch('lost', 'Radish', 'growth', [tray('b', undefined, 'lost', '2026-10-05')], {}, cost(30)),
    batch('sep', 'Sunflower', 'completed', [tray('c', 400)], { actualHarvestDate: '2026-09-25' }, cost(999)),
    batch('pea', 'Pea Shoots', 'completed', [tray('x', 300)], { actualHarvestDate: '2026-10-06' }), // no cost, not sold
  ];
  const wasted = [{ id: 'w', crop: 'Sunflower', harvestedOn: '', useBy: '', grams: 0, remaining: 0, moves: [{ id: 'm', date: '2026-10-08', grams: 75, kind: 'waste' }] }];
  const supplies = [{ id: 'i', kind: 'seed', name: 'Seed', unit: 'g', lots: [{ id: 'l', purchasedOn: '2026-10-04', quantity: 1000, remaining: 1000, price: 500 }, { id: 'old', purchasedOn: '2026-09-04', quantity: 1, remaining: 0, price: 70 }], createdAt: '' }];
  const customers = [{ id: 'c1', name: 'Hotel, "Annapoorna"', type: 'restaurant', createdAt: '' }];
  const r = pr.profitReport(sales, batches, wasted, supplies, customers, '2026-10-01', '2026-10-31');
  assert.deepEqual(
    [r.sales, r.discounts, r.salesCount, r.collected, r.owed, r.growCost, r.suppliesBought, r.profit, r.margin],
    [600, 10, 2, 580, 100, 150, 500, 450, 75]
  );
  assert.deepEqual(
    r.crops.map(c => [c.crop, c.gramsSold, c.sales, c.wasteGrams, c.growCost, c.profit]),
    [
      ['Sunflower', 750, 550, 75, 120, 430],
      ['Radish', 100, 60, 0, 30, 30],
    ]
  );
  assert.deepEqual(r.customers, [{ id: 'c1', name: 'Hotel, "Annapoorna"', sales: 450 }, { id: 'c2', name: 'Deleted customer', sales: 150 }]);
  assert.equal(pr.profitReport([], [], [], [], [], '2026-10-01', '2026-10-31').margin, null);

  const csv = pr.salesCsv(sales, customers, '2026-10-01', '2026-10-31', n => `S00${n}`).split('\n');
  assert.equal(csv.length, 4);
  assert.equal(csv[1], '2026-10-03,S001,"Hotel, ""Annapoorna""",Sunflower,500,400,10,450,450,0');
  assert.equal(csv[2], '2026-10-03,S001,"Hotel, ""Annapoorna""",Radish,100,60,,,,');
  assert.equal(csv[3], '2026-10-09,S002,Deleted customer,Sunflower,250,150,0,150,50,100');

  console.log('PASS: yield per tray, sowing for orders from stock and growing batches, too soon to grow, profit by crop and customer, costs, CSV.');
} catch (e) {
  console.error(e);
  process.exit(1);
}
