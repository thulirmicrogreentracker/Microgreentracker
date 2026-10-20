// Mixed subscription boxes (picked from stock, rotating; planned from stock, growing batches and sowings), the
// delivery log (delivered, skipped, missed, overdue), and the daily reminders' content.
const { buildSync } = require('esbuild');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'subscriptions-'));
function load(file) {
  const outfile = path.join(tmp, path.basename(file) + '.cjs');
  buildSync({ entryPoints: [file], outfile, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent' });
  return require(outfile);
}
const lot = (crop, grams, useBy) => ({ id: `${crop}-${useBy}`, crop, harvestedOn: '2026-10-08', useBy, grams, remaining: grams, moves: [] });
try {
  const o = load('src/utils/orders.ts');
  const pl = load('src/utils/plan.ts');
  const ds = load('src/utils/dailySummary.ts');
  const { normalizeAppData } = load('src/storage/legacy.ts');
  const today = '2026-10-11'; // a Sunday

  // Picking a mixed box from stock: crops not in the last box first, then the ones to use first; even shares in 5 g
  // steps, topped up from the others when one runs short; expired stock is never used.
  const stock = [lot('Sunflower', 400, '2026-10-14'), lot('Pea Shoots', 300, '2026-10-13'), lot('Radish', 200, '2026-10-16'), lot('Beet', 50, '2026-10-12'), lot('Kale', 500, '2026-10-10')];
  const pick = (mix, last, taken) => o.pickMix(mix, stock, today, last, taken);
  assert.deepEqual(pick({ grams: 300, varieties: 3 }, ['Pea Shoots']), {
    items: [
      { crop: 'Beet', grams: 50 },
      { crop: 'Sunflower', grams: 150 },
      { crop: 'Radish', grams: 100 },
    ],
    short: 0,
  });
  // Only the customer's crops.
  assert.deepEqual(pick({ grams: 300, varieties: 3, crops: ['Pea Shoots', 'radish'] }).items, [
    { crop: 'Pea Shoots', grams: 150 },
    { crop: 'Radish', grams: 150 },
  ]);
  // Not enough in stock (Kale is past its use-by date): what's there, and how much is short.
  assert.deepEqual(pick({ grams: 1000, varieties: 2 }).short, 50);
  // Grams already set aside for the box's chosen crops don't count again.
  assert.deepEqual(pick({ grams: 200, varieties: 1, crops: ['Radish'] }, [], [{ crop: 'Radish', grams: 150 }]), { items: [{ crop: 'Radish', grams: 50 }], short: 150 });
  assert.equal(o.boxText({ items: [{ crop: 'Sunflower', grams: 100 }], mix: { grams: 300, varieties: 3 } }), '100 g Sunflower + 300 g mix of 3');

  // The delivery log: Mondays and Thursdays from Thursday 1 Oct. 8 Oct delivered, 5 Oct marked missed, 1 Oct too old
  // to still be overdue.
  const sub = {
    id: 's',
    customerId: 'c',
    items: [],
    mix: { grams: 300, varieties: 3 },
    weekdays: [1, 4],
    everyWeeks: 1,
    startOn: '2026-10-01',
    skipped: [],
    missed: ['2026-10-05'],
    delivered: [{ date: '2026-10-08', saleId: 'sale-8' }],
    createdAt: '',
  };
  assert.deepEqual(
    o.subscriptionLog(sub, today).map(l => [l.date, l.status]),
    [
      ['2026-10-08', 'delivered'],
      ['2026-10-05', 'missed'],
      ['2026-10-01', 'unrecorded'],
    ]
  );
  const open = { ...sub, missed: [], delivered: [] };
  assert.deepEqual(
    o.subscriptionLog(open, today).map(l => l.status),
    ['overdue', 'overdue', 'unrecorded']
  );
  // Today's delivery isn't in the log until it's done; skipped and paused days show as skipped.
  assert.deepEqual(o.subscriptionLog({ ...open, skipped: ['2026-10-08'] }, '2026-10-12')[0], { date: '2026-10-08', status: 'skipped' });
  assert.deepEqual(o.subscriptionLog({ ...open, pausedUntil: '2026-10-09' }, '2026-10-12').map(l => l.status), ['skipped', 'skipped', 'skipped']);
  // Overdue days stay on the list (with the mix) until delivered or marked missed.
  const due = o.deliveriesBetween([], [open], today, today, true);
  assert.deepEqual(due.map(d => d.key), ['s-s-2026-10-05', 's-s-2026-10-08']);
  assert.deepEqual(due[0].mix, { grams: 300, varieties: 3 });

  // Planning a 300 g mixed box of 3 every Wednesday. In stock: 100 g Sunflower (use by 15 Oct). Growing: 2 trays of
  // Radish ready 20 Oct (150 g a tray until one's weighed). Sunflower and Pea Shoots take 10 days, Radish 6.
  const crop = (name, days) => ({ name, daysToGermination: 2, daysToHarvest: days, wateringFrequency: 1, lightingHours: 12, category: 'x', shelfLifeDays: 7 });
  const cropTypes = [crop('Pea Shoots', 10), crop('Radish', 6), crop('Sunflower', 10)];
  const radish = {
    id: 'r',
    batchNumber: 7,
    cropType: 'Radish',
    trays: [{ id: 't1', code: 'T1', status: 'active' }, { id: 't2', code: 'T2', status: 'active' }],
    sowingDate: '2026-10-08',
    expectedHarvestDate: '2026-10-20',
    stage: 'sowing',
    notes: [],
    photos: [],
    watering: [{ id: 'w', timestamp: '2026-10-10T08:00:00.000Z' }],
    lighting: [],
    createdAt: '',
    updatedAt: '',
  };
  const box = { ...open, id: 'm', mix: { grams: 300, varieties: 3 }, weekdays: [3], startOn: today };
  const plan = pl.supplyPlan([radish], [lot('Sunflower', 100, '2026-10-15')], [], [box], cropTypes, today, ['Pea Shoots', 'Radish', 'Sunflower']);
  const at = date => plan.deliveries.get(`s-m-${date}`).map(a => [a.crop, a.grams, a.from, a.batchCode ?? a.sowBy ?? ''].filter(x => x !== '').join(' '));
  // 14 Oct: the Sunflower in stock; too soon to grow the rest.
  assert.deepEqual(at('2026-10-14'), ['Sunflower 100 stock', 'Mix 200 short']);
  // 21 Oct: Radish from the growing batch; Sunflower and Pea Shoots sown today for the other two shares.
  assert.deepEqual(at('2026-10-21'), ['Radish 100 batch B007', 'Sunflower 100 sow 2026-10-11', 'Pea Shoots 100 sow 2026-10-11']);
  // 28 Oct: the spare grams of those trays, and Radish (the next crop in the rotation) sown for the rest.
  assert.deepEqual(at('2026-10-28'), ['Pea Shoots 50 sow 2026-10-11', 'Sunflower 50 sow 2026-10-11', 'Radish 200 sow 2026-10-22']);
  for (const [, list] of plan.deliveries) assert.equal(list.reduce((n, a) => n + a.grams, 0), 300);
  assert.deepEqual(
    plan.plans.map(p => [p.sowBy, p.crop, p.trays, p.forMix]),
    [
      ['2026-10-11', 'Pea Shoots', 1, true],
      ['2026-10-11', 'Sunflower', 1, true],
      ['2026-10-22', 'Radish', 2, true],
      ['2026-10-25', 'Pea Shoots', 1, true],
      ['2026-10-25', 'Sunflower', 1, true],
    ]
  );
  assert.deepEqual(plan.short, [{ crop: 'Mix', date: '2026-10-14', grams: 200 }]);
  assert.deepEqual(pl.defaultMixCrops([radish], [{ crop: 'Sunflower', per100g: 80 }], cropTypes), ['Radish', 'Sunflower']);

  // The daily reminders: watering, deliveries, sowing and harvest, and stock to sell, for today and later days.
  const data = normalizeAppData({
    batches: [radish],
    cropTypes,
    stock: [lot('Sunflower', 100, '2026-10-15')],
    customers: [{ id: 'c', name: 'Kavya', type: 'home', createdAt: '' }],
    subscriptions: [{ ...box, customerId: 'c' }],
  });
  const all = { ...ds.defaultNotificationSettings(), enabled: true };
  const sum = date => ds.daySummary(data, plan.plans, all, date, today).lines;
  assert.deepEqual(sum(today), ['💧 Water 1 batch: Radish', '🌱 Sow 1 tray Pea Shoots, 1 tray Sunflower']);
  assert.deepEqual(sum('2026-10-14'), ['💧 Water 1 batch: Radish', '🚚 1 delivery: Kavya · 300 g mix of 3', '⏳ Sell soon: 100 g Sunflower']);
  assert.deepEqual(sum('2026-10-20'), ['💧 Water 1 batch: Radish', '✂️ Harvest Radish B007 (2 trays)']);
  assert.deepEqual(ds.daySummary(data, plan.plans, { ...all, watering: false, stock: false }, '2026-10-14', today).lines, ['🚚 1 delivery: Kavya · 300 g mix of 3']);
  // Watering every 2 days: due on alternate days ahead.
  const everyOther = { ...data, cropTypes: cropTypes.map(c => ({ ...c, wateringFrequency: 2 })) };
  assert.deepEqual(['2026-10-12', '2026-10-13', '2026-10-14'].map(d => ds.wateringOn([radish], everyOther, d, today).length), [1, 0, 1]);
  // At 8 am today: today's morning has passed, so today's evening and the next 6 days' mornings and evenings.
  const planned = ds.plannedNotifications(data, plan.plans, all, new Date('2026-10-11T08:00:00'), today);
  assert.equal(planned[0].id, 2000);
  assert.equal(planned[0].title, 'Still to do today: 3 things');
  assert.equal(planned.filter(n => n.id < 2000).length, 6);
  assert.equal(planned.find(n => n.id === 1003).tab, 'today'); // Wednesday: mostly the shop
  assert.equal(ds.plannedNotifications(data, plan.plans, { ...all, evening: undefined }, new Date('2026-10-11T08:00:00'), today).some(n => n.id >= 2000), false);
  // Settings are repaired; older data gets the defaults (off).
  assert.deepEqual(ds.normalizeNotificationSettings({ enabled: true, morning: '25:00', evening: null, watering: 'yes' }), {
    ...ds.defaultNotificationSettings(),
    enabled: true,
    evening: undefined,
  });
  assert.equal(normalizeAppData({}).config.notifications.enabled, false);
  // A damaged mix is repaired or dropped.
  const loaded = normalizeAppData({ subscriptions: [{ id: 'x', customerId: 'c', mix: { grams: '250', varieties: 9, crops: ['Pea', ' ', 'Pea'] } }, { id: 'y', customerId: 'c', mix: { grams: 0 } }] });
  assert.deepEqual(loaded.subscriptions.map(s => s.mix), [{ grams: 250, varieties: 6, crops: ['Pea'] }, undefined]);
  assert.deepEqual(loaded.subscriptions[0].missed, []);

  console.log('PASS: mixed boxes picked from stock and rotated, delivery log and missed days, overdue days, planning mixed boxes from stock, batches and sowings, daily reminder content and schedule, repair of damaged data.');
} catch (e) {
  console.error(e);
  process.exit(1);
}
