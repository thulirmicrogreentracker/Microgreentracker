# Curated sample farm for store screenshots, in the app's saved-data format (storage schema version 2).
# Writes data-sample.json; copy it into the app as microgreen/data-b.json (see docs/store/screenshots.md).
import json, random, datetime as dt
random.seed(7)
today = dt.date.today()
now = dt.datetime.now().astimezone()
def d(days): return (today + dt.timedelta(days=days)).isoformat()
def ts(days, hour=8, minute=0):
    t = dt.datetime.combine(today + dt.timedelta(days=days), dt.time(hour, minute)).astimezone()
    return t.astimezone(dt.timezone.utc).isoformat().replace('+00:00', 'Z')
uid = iter(range(1, 10**6))
def nid(p): return f"{p}{next(uid):05d}"

crop = {  # days to harvest, seed g/tray, typical yield g/tray
  'Sunflower': (10, 120, 450), 'Radish': (6, 30, 280), 'Pea Shoots': (12, 200, 400), 'Broccoli': (10, 20, 220),
  'Mustard': (8, 20, 190), 'Arugula': (7, 15, 140), 'Kale': (10, 20, 200), 'Red Cabbage': (10, 20, 210),
  'Basil': (14, 10, 110), 'Amaranth': (10, 10, 120), 'Wheatgrass': (9, 150, 500),
}
plan = [  # crop, trays, sown (days ago), stage, lost trays [(reason, note)]
  ('Sunflower', 6, 38, 'completed', []), ('Radish', 4, 36, 'completed', []), ('Pea Shoots', 5, 33, 'completed', []),
  ('Broccoli', 6, 30, 'completed', [('Fungus / mould', 'White fuzz in one corner')]),
  ('Radish', 6, 22, 'completed', []), ('Sunflower', 8, 19, 'completed', [('Fungus / mould', None)]),
  ('Mustard', 4, 15, 'completed', []), ('Arugula', 3, 11, 'completed', []),
  ('Kale', 5, 13, 'completed', [('Pest attack', 'Fungus gnats')]),
  ('Red Cabbage', 6, 9, 'harvest', []), ('Sunflower', 8, 8, 'growth', []),
  ('Pea Shoots', 6, 6, 'growth', [('Physical damage', 'Tray cracked when moved')]),
  ('Broccoli', 6, 4, 'growth', []), ('Basil', 3, 3, 'germination', []), ('Radish', 6, 2, 'germination', []),
  ('Amaranth', 4, 1, 'sowing', []), ('Wheatgrass', 5, 0, 'sowing', []),
]
notes_pool = [('observation', 'Even germination across all trays'), ('watering', 'Bottom watered, trays felt light'),
              ('fertilizer', 'Added diluted kelp to the water'), ('observation', 'Cotyledons fully open, good colour'),
              ('issue', 'A little leggy, moved closer to the lights')]
batches, tray_no, slot = [], 0, 1
for i, (name, n, ago, stage, lost) in enumerate(plan, start=1):
    dth, seed, yld = crop[name]
    done = stage == 'completed'
    trays = []
    for t in range(n):
        tray_no += 1
        tray = {'id': nid('t'), 'code': f'T{tray_no:03d}', 'status': 'active'}
        if t < len(lost):
            reason, note = lost[t]
            tray.update(status='lost', lostReason=reason, lostDate=d(-ago + min(dth - 2, 4)))
            if note: tray['lostNote'] = note
        elif done:
            tray['harvestWeight'] = round(yld * random.uniform(0.88, 1.12))
        else:
            tray['slot'] = slot; slot += 1
        trays.append(tray)
    last = min(ago, (ago - dth) if done else 0)
    water_days = list(range(-ago + 1, -last + 1)) if not done else list(range(-ago + 1, -ago + dth + 1))
    if name == 'Basil': water_days = water_days[:-2]  # one batch overdue for watering
    b = {
        'id': nid('b'), 'batchNumber': i, 'cropType': name, 'trays': trays, 'seedWeightPerTray': seed,
        'sowingDate': d(-ago), 'expectedHarvestDate': d(-ago + dth), 'stage': stage,
        'notes': [{'id': nid('n'), 'content': c, 'timestamp': ts(-ago + k + 1, 18), 'type': ty}
                  for k, (ty, c) in enumerate(random.sample(notes_pool, 2 if ago > 2 else 1))],
        'photos': [], 'lighting': [],
        'watering': [{'id': nid('w'), 'timestamp': ts(x, 7, 30), 'amount': 500, 'unit': 'ml'} for x in water_days],
        'createdAt': ts(-ago, 7), 'updatedAt': ts(-last, 19),
    }
    if done:
        b['actualHarvestDate'] = d(-ago + dth)
        b['yieldAmount'] = sum(t.get('harvestWeight', 0) for t in trays if t['status'] == 'active')
        b['yieldUnit'] = 'grams'
    batches.append(b)

data = {'batches': batches, 'config': {'totalTrays': 60, 'trayNumberPrefix': 'Tray', 'lastBatchNumber': len(batches),
        'lastTrayNumber': tray_no}, 'reminders': []}
env = {'schemaVersion': 2, 'seq': 100000, 'savedAt': now.isoformat(), 'data': data}
json.dump(env, open('data-sample.json', 'w'))
print(len(batches), 'batches,', tray_no, 'trays,', slot - 1, 'positions in use')
