/**
 * Defensive parser for Yad2 payloads.
 *
 * Yad2 has no public API and renames its feed keys every few months, so nothing
 * here is bound to a fixed schema: we walk whatever JSON comes back, decide which
 * objects look like car listings, and pull each field by matching key *paths*
 * against a list of candidate patterns. A rename usually costs one extra pattern.
 */

const MAX_DEPTH = 8;

/** Flatten an object into [dotted.lowercase.path, primitiveValue] pairs. */
export function flatten(obj, prefix = '', depth = 0, out = []) {
  if (depth > MAX_DEPTH || obj == null) return out;
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k.toLowerCase()}` : k.toLowerCase();
    if (v == null) continue;
    if (typeof v === 'object') {
      if (Array.isArray(v)) {
        if (v.length && typeof v[0] !== 'object') out.push([path, v.join(', ')]);
        else if (v.length) flatten(v[0], path, depth + 1, out);
      } else {
        flatten(v, path, depth + 1, out);
      }
    } else {
      out.push([path, v]);
    }
  }
  return out;
}

const num = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const cleaned = v.replace(/[^\d.]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

/** First value whose key path matches one of the patterns and passes the guard. */
function pick(flat, patterns, guard = () => true) {
  for (const pattern of patterns) {
    for (const [path, value] of flat) {
      if (pattern.test(path) && guard(value, path)) return value;
    }
  }
  return null;
}

function pickNum(flat, patterns, min = -Infinity, max = Infinity) {
  const v = pick(flat, patterns, (val) => {
    const n = num(val);
    return n != null && n >= min && n <= max;
  });
  return v == null ? null : num(v);
}

const P = {
  id: [/^(id|token|adnumber|ad_number|record_id|orderid)$/, /(^|\.)(link_)?token$/, /(^|\.)adnumber$/, /(^|\.)id$/],
  price: [/^price$/, /(^|\.)price$/, /(^|\.)(currentprice|askingprice)$/],
  year: [/(^|\.)yearofproduction$/, /^year$/, /(^|\.)year$/, /(^|\.)productionyear$/],
  km: [/^km$/, /(^|\.)km$/, /(^|\.)kilometer/, /(^|\.)mileage/],
  hand: [/(^|\.)hand\.id$/, /^hand$/, /(^|\.)hand($|\.)/, /(^|\.)owners?count/],
  manufacturer: [/(^|\.)manufacturer\.(text|title|name)$/, /(^|\.)manufacturer$/, /(^|\.)make$/, /^title_1$/],
  model: [/(^|\.)model\.(text|title|name)$/, /(^|\.)model$/, /^title_2$/],
  subModel: [/(^|\.)submodel\.(text|title|name)$/, /(^|\.)submodel$/, /(^|\.)trim/],
  gearbox: [/(^|\.)gearbox(\.(text|title|name))?$/, /(^|\.)gear_?box/, /(^|\.)transmission/],
  engine: [/(^|\.)enginevolume/, /(^|\.)engine_?val/, /(^|\.)engine(\.(text|title))?$/],
  ownerType: [/(^|\.)(previous)?owner(type)?(\.(text|title))?$/, /(^|\.)ownership/],
  city: [/(^|\.)city\.(text|title|name)$/, /(^|\.)city$/, /(^|\.)cityname/],
  area: [/(^|\.)area\.(text|title|name)$/, /(^|\.)area$/, /(^|\.)topa?rea/, /(^|\.)region/],
  createdAt: [/(^|\.)(createdat|date_added|dateadded|publishdate)/],
  updatedAt: [/(^|\.)(updatedat|date_updated|dateupdated|rebounced?at)/],
  description: [/(^|\.)(description|info_text|infotext|searchtext|comments?)$/],
  image: [/(^|\.)(coverimage|image_url|imageurl|img)$/, /(^|\.)images?\./],
  dealer: [/(^|\.)(isdealer|merchant|is_merchant|business|agency)/, /(^|\.)customer/],
  test: [/(^|\.)(testdate|test_date|licenseexpir|nexttest)/],
};

const NOW_YEAR = new Date().getFullYear();

/** Does this plain object look like a car listing? */
function looksLikeListing(obj) {
  const flat = flatten(obj);
  if (flat.length === 0) return null;
  const price = pickNum(flat, P.price, 1000, 5_000_000);
  if (price == null) return null;
  const year = pickNum(flat, P.year, 1950, NOW_YEAR + 2);
  const km = pickNum(flat, P.km, 0, 2_000_000);
  const model = pick(flat, P.model, (v) => typeof v === 'string' && v.trim().length > 0);
  if (year == null && km == null && !model) return null;
  return flat;
}

const GEAR_MAP = [
  [/אוטומט|automat|tiptronic|טיפטרוניק|רובוטית|robot|dsg|cvt/i, 'auto'],
  [/ידני|manual/i, 'manual'],
];

const OWNER_MAP = [
  [/השכר|rental|rent/i, 'rental'],
  [/ליסינג|leasing|leas/i, 'leasing'],
  [/לימוד\s*נהיגה|driving.?school/i, 'driving-school'],
  [/חבר|company|תאגיד|ממשל|gov/i, 'company'],
  [/פרטי|private/i, 'private'],
];

function mapBy(table, value, fallback = null) {
  if (value == null) return fallback;
  const s = String(value);
  for (const [re, out] of table) if (re.test(s)) return out;
  return fallback;
}

function toDate(v) {
  if (v == null) return null;
  const d = new Date(typeof v === 'number' && v < 1e12 ? v * 1000 : v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Turn a raw listing object into the agent's normalized shape. */
export function normalizeListing(raw, source = '') {
  const flat = looksLikeListing(raw);
  if (!flat) return null;

  const idVal = pick(flat, P.id, (v) => ['string', 'number'].includes(typeof v) && String(v).length >= 3);
  const manufacturer = pick(flat, P.manufacturer, (v) => typeof v === 'string' && v.trim());
  const model = pick(flat, P.model, (v) => typeof v === 'string' && v.trim());
  const subModel = pick(flat, P.subModel, (v) => typeof v === 'string' && v.trim());
  const year = pickNum(flat, P.year, 1950, NOW_YEAR + 2);
  const price = pickNum(flat, P.price, 1000, 5_000_000);
  const km = pickNum(flat, P.km, 0, 2_000_000);
  const hand = pickNum(flat, P.hand, 0, 20);
  const gearRaw = pick(flat, P.gearbox, (v) => typeof v === 'string' || typeof v === 'number');
  const ownerRaw = pick(flat, P.ownerType, (v) => typeof v === 'string');
  const city = pick(flat, P.city, (v) => typeof v === 'string' && v.trim());
  const area = pick(flat, P.area, (v) => typeof v === 'string' && v.trim());
  const description = pick(flat, P.description, (v) => typeof v === 'string' && v.length > 5);
  const image = pick(flat, P.image, (v) => typeof v === 'string' && /^https?:|^\/\//.test(v));
  const dealerRaw = pick(flat, P.dealer, (v) => v !== '' && v != null);
  const createdAt = toDate(pick(flat, P.createdAt, (v) => v));
  const updatedAt = toDate(pick(flat, P.updatedAt, (v) => v));

  const id = String(idVal ?? `${manufacturer}-${model}-${year}-${price}-${km}`);
  const text = [manufacturer, model, subModel, description].filter(Boolean).join(' ');

  return {
    id,
    source,
    url: id && /^[a-z0-9]{6,}$/i.test(String(idVal ?? '')) ? `https://www.yad2.co.il/vehicles/item/${idVal}` : null,
    manufacturer: manufacturer || null,
    model: model || null,
    subModel: subModel || null,
    title: [manufacturer, model, subModel].filter(Boolean).join(' ') || 'רכב ללא כותרת',
    year,
    price,
    km,
    hand,
    gearbox: mapBy(GEAR_MAP, gearRaw, null),
    ownerType: mapBy(OWNER_MAP, ownerRaw, null),
    city: city || null,
    area: area || null,
    description: description || null,
    image: image || null,
    isDealer: dealerRaw == null ? null : /^(1|true|yes)$/i.test(String(dealerRaw)) || /סוחר|dealer|merchant/i.test(String(dealerRaw)),
    createdAt: createdAt ? createdAt.toISOString() : null,
    updatedAt: updatedAt ? updatedAt.toISOString() : null,
    text,
    raw,
  };
}

/**
 * Walk an arbitrary payload and return the biggest coherent group of listings.
 * Yad2 sprinkles single promoted items around the tree, so we score arrays by
 * how many of their members look like listings and take the richest one(s).
 */
export function extractListings(payload, source = '') {
  const groups = [];
  const seen = new Set();

  const walk = (node, depth = 0) => {
    if (depth > MAX_DEPTH || node == null || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      const items = node.filter((x) => x && typeof x === 'object' && !Array.isArray(x));
      const hits = items.map((x) => normalizeListing(x, source)).filter(Boolean);
      if (hits.length) groups.push(hits);
      for (const child of node) walk(child, depth + 1);
      return;
    }
    for (const v of Object.values(node)) walk(v, depth + 1);
  };

  walk(payload);
  groups.sort((a, b) => b.length - a.length);

  const merged = [];
  for (const g of groups) {
    for (const l of g) {
      if (seen.has(l.id)) continue;
      seen.add(l.id);
      merged.push(l);
    }
  }
  return merged;
}

/** Pull embedded JSON out of a rendered search page and parse it. */
export function extractFromHtml(html, source = '') {
  const blobs = [];
  const nextData = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (nextData) blobs.push(nextData[1]);
  for (const m of html.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    blobs.push(m[1]);
  }
  const inline = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*;?\s*<\/script>/i);
  if (inline) blobs.push(inline[1]);

  const all = [];
  const seen = new Set();
  for (const blob of blobs) {
    let json;
    try {
      json = JSON.parse(blob);
    } catch {
      continue;
    }
    for (const l of extractListings(json, source)) {
      if (seen.has(l.id)) continue;
      seen.add(l.id);
      all.push(l);
    }
  }
  return all;
}
