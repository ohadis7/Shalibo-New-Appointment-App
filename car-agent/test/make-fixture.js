/**
 * Builds fixtures/sample-feed.json - a synthetic payload shaped like the Yad2
 * vehicles feed (nested envelope, mixed key styles) with a known ground truth:
 * three deliberately underpriced cars, one too-good-to-be-true wreck, one
 * overpriced ad, and a leasing car - so the tests can assert real behaviour.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
let seed = 20240917;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

const YEAR = new Date().getFullYear();
// Ground truth: a 2019 Mazda 3 at 60k km is worth ~90k, losing 11%/yr and 1.5%/10k km.
const truePrice = (year, km) => 90000 * Math.pow(0.89, YEAR - 2 - (year - 2)) * Math.pow(0.985, km / 10000);

function ad(o) {
  return {
    token: o.token,
    adNumber: o.token,
    price: Math.round(o.price),
    manufacturer: { id: 27, text: 'מאזדה' },
    model: { id: 10514, text: '3' },
    subModel: { text: o.sub || '1.5 Active אוט׳' },
    vehicleDates: { yearOfProduction: o.year },
    km: o.km,
    hand: { id: o.hand, text: `יד ${o.hand}` },
    gearBox: { text: o.gear || 'אוטומטית' },
    engineVolume: 1500,
    previousOwner: { text: o.owner || 'פרטית' },
    address: { city: { text: o.city || 'תל אביב' }, area: { text: 'מרכז' } },
    dates: { createdAt: o.created, updatedAt: o.updated || o.created },
    metaData: { coverImage: 'https://img.yad2.co.il/x.jpg', description: o.desc || 'רכב שמור, טיפולים במוסך מורשה.' },
    isDealer: !!o.dealer,
  };
}

const items = [];
let n = 0;
for (let year = 2016; year <= 2021; year++) {
  for (let i = 0; i < 7; i++) {
    const km = Math.round((YEAR - year) * (9000 + rnd() * 12000));
    const noise = 0.92 + rnd() * 0.16; // honest market spread
    items.push(
      ad({
        token: `base${String(++n).padStart(3, '0')}`,
        price: truePrice(year, km) * noise,
        year,
        km,
        hand: 1 + Math.floor(rnd() * 3),
        created: new Date(Date.now() - Math.floor(rnd() * 20) * 86400000).toISOString(),
        dealer: rnd() < 0.4,
      })
    );
  }
}

// Planted ground truth --------------------------------------------------
items.push(
  ad({ token: 'bargain01', price: truePrice(2019, 62000) * 0.79, year: 2019, km: 62000, hand: 1,
       created: new Date(Date.now() - 30 * 86400000).toISOString(), desc: 'יד ראשונה, ספר טיפולים מלא, מחיר גמיש.' }),
  ad({ token: 'bargain02', price: truePrice(2018, 71000) * 0.82, year: 2018, km: 71000, hand: 2,
       created: new Date(Date.now() - 26 * 86400000).toISOString() }),
  ad({ token: 'bargain03', price: truePrice(2020, 45000) * 0.85, year: 2020, km: 45000, hand: 1,
       created: new Date(Date.now() - 3 * 86400000).toISOString() }),
  ad({ token: 'wreck01', price: truePrice(2019, 60000) * 0.45, year: 2019, km: 60000, hand: 3,
       created: new Date().toISOString(), desc: 'הרכב לאחר תאונה, עבר תיקון במוסך.' }),
  ad({ token: 'overpriced01', price: truePrice(2017, 90000) * 1.28, year: 2017, km: 90000, hand: 2,
       created: new Date().toISOString() }),
  ad({ token: 'leasing01', price: truePrice(2020, 130000) * 0.88, year: 2020, km: 130000, hand: 1,
       owner: 'ליסינג', created: new Date().toISOString() }),
  ad({ token: 'manual01', price: truePrice(2018, 65000) * 0.9, year: 2018, km: 65000, hand: 2,
       gear: 'ידנית', created: new Date().toISOString() })
);

const payload = { data: { pagination: { current_page: 1, last_page: 4 }, feed: { feed_items: items } } };
mkdirSync(resolve(HERE, '..', 'fixtures'), { recursive: true });
writeFileSync(resolve(HERE, '..', 'fixtures', 'sample-feed.json'), JSON.stringify(payload, null, 2), 'utf8');
console.log(`wrote ${items.length} synthetic listings`);

// ---------------------------------------------------------------------------
// Second fixture: a mixed-manufacturer harvest, the shape the hatchback preset
// produces. Searches run per manufacturer, so off-segment cars come back too -
// this proves modelPatterns narrows correctly and each model is priced in its
// own cohort rather than against the whole basket.
// ---------------------------------------------------------------------------
const SEGMENT = [
  { man: 'טויוטה', model: 'יאריס', base: 82000, sub: '1.5 Hybrid אוט׳' },
  { man: 'טויוטה', model: 'אוריס', base: 82000, sub: '1.8 Hybrid אוט׳' },
  { man: 'הונדה', model: "ג'אז", base: 72000, sub: '1.3 Comfort אוט׳' },
  { man: 'סוזוקי', model: 'סוויפט', base: 66000, sub: '1.2 GL אוט׳' },
  { man: 'יונדאי', model: 'i20', base: 70000, sub: '1.4 Inspire אוט׳' },
];
const OFF_SEGMENT = [
  { man: 'קיה', model: 'ספורטאז׳', base: 130000 },
  { man: 'טויוטה', model: 'לנד קרוזר', base: 260000 },
  { man: 'יונדאי', model: 'טוסון', base: 145000 },
];

function generic(o) {
  const a = ad({ ...o, token: o.token });
  a.manufacturer = { id: 0, text: o.man };
  a.model = { id: 0, text: o.model };
  a.subModel = { text: o.sub || 'אוט׳' };
  return a;
}

const mixed = [];
let m = 0;
for (const spec of SEGMENT) {
  // base = the model's price as a 2021 car; 9%/yr back from there, 1.5% per 10k km.
  const price = (year, km) => spec.base * Math.pow(0.9, 2021 - year) * Math.pow(0.985, km / 10000);
  for (let year = 2016; year <= 2021; year++) {
    for (let i = 0; i < 3; i++) {
      const km = Math.round((YEAR - year) * (9000 + rnd() * 11000));
      mixed.push(generic({ ...spec, token: `mix${String(++m).padStart(3, '0')}`, year, km,
        price: price(year, km) * (0.93 + rnd() * 0.14), hand: 1 + Math.floor(rnd() * 3),
        created: new Date(Date.now() - Math.floor(rnd() * 25) * 86400000).toISOString() }));
    }
  }
  // one deliberate bargain per model, 20% under its own cohort
  mixed.push(generic({ ...spec, token: `deal-${spec.model}`, year: 2019, km: 58000,
    price: price(2019, 58000) * 0.8, hand: 1,
    created: new Date(Date.now() - 24 * 86400000).toISOString() }));
}
for (const spec of OFF_SEGMENT) {
  for (let i = 0; i < 3; i++) {
    mixed.push(generic({ ...spec, token: `off${String(++m).padStart(3, '0')}`, year: 2019, km: 70000,
      price: spec.base * (0.9 + rnd() * 0.2), hand: 2, created: new Date().toISOString() }));
  }
}

writeFileSync(
  resolve(HERE, '..', 'fixtures', 'mixed-segment.json'),
  JSON.stringify({ data: { feed: { feed_items: mixed } } }, null, 2),
  'utf8'
);
console.log(`wrote ${mixed.length} mixed-segment listings`);
