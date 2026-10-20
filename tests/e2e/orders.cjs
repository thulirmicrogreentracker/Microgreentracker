// Orders and subscriptions: which dates a subscription delivers on (weekdays, every other week, start/end, pause),
// skipped and delivered dates, the delivery list, grams needed, and loading old or damaged data.
const { buildSync } = require('esbuild');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orders-'));
function load(file) {
  const outfile = path.join(tmp, path.basename(file) + '.cjs');
  buildSync({ entryPoints: [file], outfile, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent' });
  return require(outfile);
}
try {
  const o = load('src/utils/orders.ts');
  const { normalizeAppData } = load('src/storage/legacy.ts');

  // Mondays and Thursdays from Monday 5 October 2026.
  const sub = {
    id: 's1',
    customerId: 'c1',
    items: [{ crop: 'Sunflower', grams: 200 }],
    weekdays: [1, 4],
    everyWeeks: 1,
    startOn: '2026-10-05',
    skipped: [], missed: [],
    delivered: [],
    createdAt: '2026-10-01',
  };
  assert.equal(o.deliversOn(sub, '2026-10-05'), true);
  assert.equal(o.deliversOn(sub, '2026-10-08'), true);
  assert.equal(o.deliversOn(sub, '2026-10-07'), false);
  assert.equal(o.deliversOn(sub, '2026-10-01'), false); // before it starts
  assert.equal(o.deliversOn({ ...sub, endOn: '2026-10-10' }, '2026-10-12'), false);
  assert.equal(o.deliversOn({ ...sub, pausedUntil: '2026-10-15' }, '2026-10-12'), false);
  assert.equal(o.deliversOn({ ...sub, pausedUntil: '2026-10-15' }, '2026-10-15'), true);
  assert.equal(o.scheduleText(sub), 'Mon and Thu');
  assert.equal(o.scheduleText({ weekdays: [0, 1, 2, 3, 4, 5, 6], everyWeeks: 2 }), 'Every day, every other week');

  // Every other week, starting on a Thursday: weeks are counted from that week's Monday.
  const fortnightly = { ...sub, everyWeeks: 2, startOn: '2026-10-08' };
  assert.deepEqual(
    o.nextDates(fortnightly, '2026-10-05', 4).map(d => d.date),
    ['2026-10-08', '2026-10-19', '2026-10-22', '2026-11-02']
  );

  // Status: paused until a later date, ended once the end date has passed.
  assert.equal(o.subStatus(sub, '2026-10-11'), 'active');
  assert.equal(o.subStatus({ ...sub, pausedUntil: '2026-10-20' }, '2026-10-11'), 'paused');
  assert.equal(o.subStatus({ ...sub, endOn: '2026-10-10' }, '2026-10-11'), 'ended');

  // Deliveries: skipped and delivered dates are left out; open orders only, overdue ones when asked.
  const subs = [{ ...sub, skipped: ['2026-10-12'], delivered: [{ date: '2026-10-08', saleId: 'x' }] }];
  const orders = [
    { id: 'a', number: 1, customerId: 'c2', deliverOn: '2026-10-09', items: [{ crop: 'Radish', grams: 100 }], status: 'open', createdAt: '' },
    { id: 'b', number: 2, customerId: 'c2', deliverOn: '2026-10-15', items: [{ crop: 'Sunflower', grams: 300 }], status: 'open', createdAt: '' },
    { id: 'c', number: 3, customerId: 'c2', deliverOn: '2026-10-15', items: [{ crop: 'Pea', grams: 100 }], status: 'cancelled', createdAt: '' },
  ];
  const keys = list => list.map(d => d.key);
  assert.deepEqual(keys(o.deliveriesBetween(orders, subs, '2026-10-08', '2026-10-15')), ['o-a', 'o-b', 's-s1-2026-10-15']);
  assert.deepEqual(keys(o.deliveriesBetween(orders, subs, '2026-10-11', '2026-10-15')), ['o-b', 's-s1-2026-10-15']);
  // Overdue: the open order from 9 Oct, and the subscription's Monday 5 Oct (within a week, not delivered or skipped).
  assert.deepEqual(keys(o.deliveriesBetween(orders, subs, '2026-10-11', '2026-10-15', true)), ['s-s1-2026-10-05', 'o-a', 'o-b', 's-s1-2026-10-15']);
  // Marked missed, it leaves the list.
  assert.deepEqual(keys(o.deliveriesBetween(orders, [{ ...subs[0], missed: ['2026-10-05'] }], '2026-10-11', '2026-10-15', true)), ['o-a', 'o-b', 's-s1-2026-10-15']);
  const next = o.nextDates(subs[0], '2026-10-08', 3);
  assert.deepEqual(
    next.map(d => [d.date, d.skipped, d.delivered]),
    [
      ['2026-10-08', false, true],
      ['2026-10-12', true, false],
      ['2026-10-15', false, false],
    ]
  );

  // The list to share.
  const text = o.deliveryListText(o.deliveriesBetween(orders, subs, '2026-10-15', '2026-10-15'), [
    { id: 'c1', name: 'Priya', phone: '98765 43210', type: 'home', createdAt: '' },
    { id: 'c2', name: 'Hotel Annapoorna', address: 'Main Road', type: 'restaurant', createdAt: '' },
  ], 'Deliveries');
  assert.match(text, /2\. Priya \(98765 43210\)\n {3}200 g Sunflower/);
  assert.match(text, /1\. Hotel Annapoorna\n {3}300 g Sunflower\n {3}Main Road/);
  assert.equal(o.orderCode(12), 'O012');

  // Damaged data is repaired; orders without a number are numbered after the highest; old data loads empty.
  const data = normalizeAppData({
    orders: [
      { id: 'a', number: 7, customerId: 'c1', deliverOn: '2026-10-12', items: [{ crop: 'Radish', grams: 100 }, { crop: '', grams: 5 }], status: 'weird' },
      { id: 'b', customerId: 'c1', deliverOn: 'soon', items: [] },
      { customerId: 'no id' },
    ],
    subscriptions: [
      { id: 's', customerId: 'c1', items: [{ crop: 'Pea', grams: '150' }], weekdays: [1, 9, 1, '4'], everyWeeks: 3, startOn: '2026-10-01', skipped: ['bad', '2026-10-05'], delivered: [{ date: '2026-10-02' }] },
      { id: 't' },
    ],
    config: { lastOrderNumber: 3 },
  });
  assert.deepEqual(data.orders.map(x => [x.id, x.number, x.status, x.items.length]), [['a', 7, 'open', 1], ['b', 8, 'open', 0]]);
  assert.match(data.orders[1].deliverOn, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(data.config.lastOrderNumber, 8);
  assert.deepEqual(data.subscriptions.map(x => [x.weekdays, x.everyWeeks, x.items[0].grams, x.skipped, x.delivered]), [[[1, 4], 1, 150, ['2026-10-05'], []]]);
  const old = normalizeAppData({ batches: [] });
  assert.deepEqual([old.orders, old.subscriptions, old.config.lastOrderNumber], [[], [], 0]);

  console.log('PASS: subscription dates (weekdays, every other week, start, end, pause), skips, overdue and missed days, deliveries, list to share, order numbering, repair of damaged data.');
} catch (e) {
  console.error(e);
  process.exit(1);
}
