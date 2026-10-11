// Customers, prices and sales: prices by customer type, what's owed, payments oldest first, putting stock back, and
// loading old or damaged data.
const { buildSync } = require('esbuild');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sales-'));
function load(file) {
  const outfile = path.join(tmp, path.basename(file) + '.cjs');
  buildSync({ entryPoints: [file], outfile, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent' });
  return require(outfile);
}
try {
  const sa = load('src/utils/sales.ts');
  const st = load('src/utils/stock.ts');
  const { normalizeAppData } = load('src/storage/legacy.ts');

  // Prices per 100 g, with a lower restaurant price.
  const prices = [{ crop: 'Sunflower', per100g: 80, byType: { restaurant: 60 } }];
  assert.equal(sa.priceFor(prices, 'sunflower', 250), 200);
  assert.equal(sa.priceFor(prices, 'Sunflower', 500, 'restaurant'), 300);
  assert.equal(sa.priceFor(prices, 'Sunflower', 500, 'home'), 400);
  assert.equal(sa.priceFor(prices, 'Radish', 100), undefined);

  // Two sales on credit to one customer, then one payment: the oldest sale is paid first.
  const sale = (id, number, date, total, paid) => ({
    id,
    number,
    date,
    customerId: 'c1',
    items: [{ crop: 'Sunflower', grams: 100, amount: total }],
    total,
    payments: paid ? [{ id: `p-${id}`, date, amount: paid, method: 'cash' }] : [],
    createdAt: date,
  });
  let sales = [sale('s2', 2, '2026-10-05', 300, 100), sale('s1', 1, '2026-10-01', 150, 0)];
  assert.equal(sa.customerDue(sales, 'c1'), 350);
  const paid = sa.recordPayment(sales, 'c1', { id: 'pay', date: '2026-10-11', amount: 250, method: 'upi' });
  sales = paid.sales;
  assert.equal(paid.left, 0);
  assert.equal(sa.dueOn(sales.find(s => s.id === 's1')), 0);
  assert.equal(sa.dueOn(sales.find(s => s.id === 's2')), 100);
  assert.equal(sa.customerDue(sales, 'c1'), 100);
  assert.equal(sa.recordPayment(sales, 'c1', { id: 'x', date: '2026-10-11', amount: 500, method: 'cash' }).left, 400);
  assert.equal(sa.salesTotal(sales, '2026-10-05', '2026-10-05'), 300);
  assert.equal(sa.totalDue(sales), 100);
  assert.equal(sa.saleCode(7), 'S007');

  // A sale takes stock; deleting it puts the same grams back in the same harvests.
  let stock = [st.newStockLot('Sunflower', 300, '2026-10-09', []), st.newStockLot('Sunflower', 500, '2026-10-10', [])];
  stock = st.sellFromStock(stock, 'Sunflower', 450, '2026-10-11', 'sale-1').stock;
  assert.deepEqual(stock.map(l => l.remaining), [0, 350]);
  stock = st.sellFromStock(stock, 'Sunflower', 100, '2026-10-11', 'sale-2').stock;
  stock = sa.returnSaleStock(stock, 'sale-1');
  assert.deepEqual(stock.map(l => l.remaining), [300, 400]);
  assert.deepEqual(stock[1].moves.map(m => m.ref), ['sale-2']);

  // Damaged data is repaired; sales without a number are numbered after the highest; old data loads empty.
  const data = normalizeAppData({
    customers: [{ id: 'c1', name: ' Priya ', type: 'vip' }, { name: 'no id' }],
    prices: [{ crop: 'Radish', per100g: 50, byType: { home: 'x', shop: 40 } }, { crop: 'Pea', per100g: 0 }],
    sales: [
      { id: 'a', number: 4, date: '2026-10-01', items: [{ crop: 'Radish', grams: 100, amount: 50 }], discount: 10, total: 999, payments: [], createdAt: '2026-10-01' },
      { id: 'b', date: 'bad', items: [{ crop: 'Radish', grams: 100, amount: 50 }], payments: [{ id: 'p', amount: -5 }], createdAt: '2026-10-02' },
    ],
    config: { lastSaleNumber: 2 },
  });
  assert.deepEqual(data.customers.map(c => [c.name, c.type]), [['Priya', 'home']]);
  assert.deepEqual(data.prices, [{ crop: 'Radish', per100g: 50, byType: { shop: 40 } }]);
  assert.equal(data.sales.find(s => s.id === 'a').total, 40);
  assert.equal(data.sales.find(s => s.id === 'b').number, 5);
  assert.deepEqual(data.sales.find(s => s.id === 'b').payments, []);
  assert.equal(data.config.lastSaleNumber, 5);
  const old = normalizeAppData({ batches: [] });
  assert.deepEqual([old.customers, old.prices, old.sales, old.config.lastSaleNumber], [[], [], [], 0]);

  console.log('PASS: prices by customer type, amounts owed, payments oldest first, stock back on delete, sale numbering, repair of damaged data.');
} catch (e) {
  console.error(e);
  process.exit(1);
}
