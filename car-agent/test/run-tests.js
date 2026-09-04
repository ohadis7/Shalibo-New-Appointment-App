/** Zero-dependency assertions over the synthetic fixture. */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractListings, extractFromHtml } from '../src/parse.js';
import { valueListings } from '../src/valuation.js';
import { applyFilters, scoreListings, matchesModel } from '../src/score.js';
import { buildHtml } from '../src/report.js';
import { sanityCheck, feedUrl, pageUrl } from '../src/yad2.js';
import { loadConfig } from '../src/config.js';

const HERE = dirname(fileURLToPath(import.meta.url));
let failed = 0;
const ok = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond || !extra ? '' : ` -> ${extra}`}`);
  if (!cond) failed++;
};

const payload = JSON.parse(readFileSync(resolve(HERE, '..', 'fixtures', 'sample-feed.json'), 'utf8'));
const listings = extractListings(payload, 'test');
const byId = (id) => listings.find((l) => l.id === id);

// --- parsing -----------------------------------------------------------
ok('extracts every listing', listings.length === 49, `got ${listings.length}`);
const b1 = byId('bargain01');
ok('maps core fields', b1 && b1.year === 2019 && b1.km === 62000 && b1.hand === 1, JSON.stringify(b1 && { y: b1.year, km: b1.km, hand: b1.hand }));
ok('maps manufacturer + model', b1?.manufacturer === 'מאזדה' && b1?.model === '3', `${b1?.manufacturer}/${b1?.model}`);
ok('maps gearbox to canonical value', b1?.gearbox === 'auto', String(b1?.gearbox));
ok('maps manual gearbox', byId('manual01')?.gearbox === 'manual');
ok('maps leasing ownership', byId('leasing01')?.ownerType === 'leasing');
ok('builds item url', b1?.url === 'https://www.yad2.co.il/vehicles/item/bargain01', String(b1?.url));

const html = `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(payload)}</script></html>`;
ok('parses listings out of an HTML page', extractFromHtml(html, 'test').length === 49);

// --- valuation ---------------------------------------------------------
const cfg = loadConfig(resolve(HERE, '..', 'config.example.json'));
valueListings(listings, cfg.scoring);
const v = (id) => byId(id).valuation;
ok('prices the cohort with a good fit', v('bargain01').ok && v('bargain01').r2 > 0.8, `r2=${v('bargain01').r2}`);
ok('planted bargain reads as underpriced', v('bargain01').deltaPct < -12, `${v('bargain01').deltaPct}%`);
ok('planted bargain shows a shekel saving', v('bargain01').savingIls > 5000, String(v('bargain01').savingIls));
ok('overpriced ad reads as expensive', v('overpriced01').deltaPct > 12, `${v('overpriced01').deltaPct}%`);
ok('honest ad sits near the market', Math.abs(v('base010').deltaPct) < 20, `${v('base010').deltaPct}%`);

// --- filters -----------------------------------------------------------
const wide = { ...cfg.filters, priceMin: 0, priceMax: Infinity, yearMin: 0, yearMax: 9999, kmMax: Infinity, handMax: 99, gearbox: [], excludeOwnerTypes: [], excludeKeywords: [] };
ok('wide filter keeps everything', applyFilters(listings, wide).kept.length === 49);
ok('gearbox filter drops the manual', !applyFilters(listings, { ...wide, gearbox: ['auto'] }).kept.some((l) => l.id === 'manual01'));
ok('owner filter drops the leasing car', !applyFilters(listings, { ...wide, excludeOwnerTypes: ['leasing'] }).kept.some((l) => l.id === 'leasing01'));
ok('keyword filter drops the wreck', !applyFilters(listings, { ...wide, excludeKeywords: ['לאחר תאונה'] }).kept.some((l) => l.id === 'wreck01'));
ok('km filter works', applyFilters(listings, { ...wide, kmMax: 50000 }).kept.every((l) => l.km == null || l.km <= 50000));

// --- scoring -----------------------------------------------------------
const scored = scoreListings(applyFilters(listings, wide).kept, cfg.scoring);
const s = (id) => byId(id).score;
ok('wreck is flagged too-good-to-be-true', s('wreck01').flags.some((f) => f.level === 'danger' && /זול ב-/.test(f.text)));
ok('wreck is flagged for accident text', s('wreck01').flags.some((f) => /תאונה/.test(f.text)));
ok('wreck verdict is high risk', s('wreck01').verdict === 'סיכון גבוה', s('wreck01').verdict);
ok('bargain outranks the overpriced ad', s('bargain01').total > s('overpriced01').total, `${s('bargain01').total} vs ${s('overpriced01').total}`);
ok('bargain outranks the wreck', s('bargain01').total > s('wreck01').total, `${s('bargain01').total} vs ${s('wreck01').total}`);
ok('bargain clears the bargain threshold', s('bargain01').total >= cfg.scoring.minBargainScore, String(s('bargain01').total));
ok('all three planted bargains rank in the top 6', ['bargain01', 'bargain02', 'bargain03'].every((id) => scored.slice(0, 6).some((l) => l.id === id)), scored.slice(0, 6).map((l) => l.id).join(','));
ok('stale ad gets a negotiation hint', s('bargain01').flags.some((f) => /מיקוח/.test(f.text)));
ok('leasing ownership adds risk and a flag', s('leasing01').risk >= 10 && s('leasing01').flags.some((f) => /ליסינג/.test(f.text)), String(s('leasing01').risk));
ok('good history text offsets some risk', s('leasing01').flags.some((f) => f.level === 'good'));

// --- mixed segment / model patterns -------------------------------------
const preset = loadConfig(resolve(HERE, '..', 'config.hatchback.example.json'));
const mixed = extractListings(
  JSON.parse(readFileSync(resolve(HERE, '..', 'fixtures', 'mixed-segment.json'), 'utf8')),
  'mixed'
);
ok('reads the mixed-manufacturer harvest', mixed.length === 104, `got ${mixed.length}`);
ok('matchesModel finds Yaris by Hebrew name', matchesModel({ manufacturer: 'טויוטה', model: 'יאריס' }, preset.filters.modelPatterns));
ok('matchesModel finds Jazz with a straight apostrophe', matchesModel({ manufacturer: 'הונדה', model: "ג'אז" }, preset.filters.modelPatterns));
ok('matchesModel rejects an off-segment SUV', !matchesModel({ manufacturer: 'טויוטה', model: 'לנד קרוזר' }, preset.filters.modelPatterns));
ok('no patterns means no filtering', matchesModel({ manufacturer: 'x', model: 'y' }, []));

valueListings(mixed, preset.scoring);
const segment = applyFilters(mixed, preset.filters).kept;
const inSegment = mixed.filter((l) => matchesModel(l, preset.filters.modelPatterns));
ok('the nine off-segment cars are recognised as such', mixed.length - inSegment.length === 9, `${mixed.length - inSegment.length}`);
ok('every survivor is in the segment', segment.every((l) => matchesModel(l, preset.filters.modelPatterns)));
ok('no SUV survives the segment filter', !segment.some((l) => /ספורטאז|לנד קרוזר|טוסון/.test(l.model)));
ok('within the segment only the over-km cars are dropped',
   inSegment.length - segment.length === inSegment.filter((l) => l.km > preset.filters.kmMax).length,
   `kept ${segment.length} of ${inSegment.length}`);

const cohorts = new Set(segment.map((l) => l.valuation.cohortKey));
ok('each model is priced in its own cohort', cohorts.size === 5, [...cohorts].join(' / '));
ok('a Yaris is never compared to a Jazz', segment.filter((l) => l.model === 'יאריס').every((l) => l.valuation.cohortKey.includes('יאריס')));

scoreListings(segment, preset.scoring);
const planted = ['יאריס', 'אוריס', "ג'אז", 'סוויפט', 'i20'].map((mdl) => segment.find((l) => l.id === `deal-${mdl}`));
ok('every planted per-model bargain is found', planted.every(Boolean));
ok('each planted bargain reads ~20% under its own cohort', planted.every((l) => l.valuation.deltaPct < -12), planted.map((l) => l.valuation.deltaPct).join(', '));
ok('all five planted bargains land in the top 10', planted.every((l) => segment.slice(0, 10).includes(l)), segment.slice(0, 10).map((l) => l.id).join(','));

// --- stale-id sanity check ----------------------------------------------
const yarisSearch = { name: 'טויוטה', expect: ['יאריס|yaris', 'אוריס|auris'] };
ok('a matching harvest raises no warning', sanityCheck(yarisSearch, mixed.filter((l) => /יאריס|אוריס/.test(l.model))) === null);
const wrongIds = mixed.filter((l) => /ספורטאז|טוסון|לנד קרוזר/.test(l.model));
const warning = sanityCheck(yarisSearch, wrongIds);
ok('a wrong manufacturer id is caught', typeof warning === 'string' && /קוד יצרן/.test(warning));
ok('the warning names what came back instead', warning.includes('ספורטאז') || warning.includes('טוסון') || warning.includes('לנד קרוזר'));
ok('an empty harvest raises no warning', sanityCheck(yarisSearch, []) === null);
ok('a search with no expectation raises no warning', sanityCheck({ name: 'x' }, wrongIds) === null);

// --- url building --------------------------------------------------------
ok('page 1 carries no page param', !pageUrl('https://www.yad2.co.il/vehicles/cars?manufacturer=19', 1).includes('page='));
ok('page 2 does', pageUrl('https://www.yad2.co.il/vehicles/cars?manufacturer=19', 2).endsWith('page=2'));
ok('feed url keeps the search params', feedUrl('https://www.yad2.co.il/vehicles/cars?manufacturer=19&year=2015-2022', 1) === 'https://gw.yad2.co.il/vehicles-feed/cars?manufacturer=19&year=2015-2022');

// --- report ------------------------------------------------------------
for (const l of scored) l.history = { isNew: true, priceChange: 0 };
const out = buildHtml(scored, cfg, { total: 49, kept: 49, bargains: 3, newCount: 49 });
ok('report renders a burger menu', out.includes('class="burger"') && out.includes('☰'));
ok('report is RTL Hebrew', out.includes('dir="rtl"') && out.includes('lang="he"'));
ok('report lists the bargain', out.includes('bargain') || out.includes('מציאה'));

console.log(failed === 0 ? '\nAll tests passed.' : `\n${failed} test(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
