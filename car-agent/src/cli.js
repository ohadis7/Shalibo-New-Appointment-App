#!/usr/bin/env node
/**
 * car-agent - scans Yad2 searches, prices every listing against its own market
 * cohort and ranks the ones that are genuinely cheap for what they are.
 *
 *   node src/cli.js --config config.json
 *   node src/cli.js --mode file --file fixtures/sample-feed.json
 *   node src/cli.js --new-only --quiet
 */
import { resolve } from 'node:path';
import { loadConfig } from './config.js';
import { fetchAll } from './yad2.js';
import { valueListings } from './valuation.js';
import { applyFilters, scoreListings } from './score.js';
import { loadStore, saveStore, reconcile } from './store.js';
import { printConsole, writeReports } from './report.js';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i++;
    } else {
      args[key] = true;
    }
  }
  return args;
}

const HELP = `
car-agent - סוכן מומחה רכב יד 2

  --config <path>   קובץ הגדרות (ברירת מחדל: ./config.json)
  --mode <m>        browser | http | file  - דורס את fetch.mode
  --file <path>     קובץ/תיקיית JSON או HTML שמורים (למצב file)
  --top <n>         כמה תוצאות להציג
  --min-score <n>   סף ציון למציאה
  --new-only        רק מודעות שלא נראו בריצה קודמת
  --out <dir>       תיקיית פלט
  --quiet           בלי לוג התקדמות
  --help
`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }

  const cfg = loadConfig(args.config ? resolve(process.cwd(), args.config) : null);
  if (args.mode) cfg.fetch.mode = args.mode;
  if (args.file) cfg.fetch.file = args.file;
  if (args.top) cfg.scoring.topN = Number(args.top);
  if (args['min-score']) cfg.scoring.minBargainScore = Number(args['min-score']);
  if (args.out) cfg.output.dir = args.out;
  if (args['new-only']) cfg.output.newOnly = true;

  const log = args.quiet ? () => {} : (m) => console.log(m);
  log(`config: ${cfg.__path}`);
  log(`mode:   ${cfg.fetch.mode}`);

  const { listings, errors } = await fetchAll(cfg, log);
  if (listings.length === 0) {
    console.error('\nלא נאספו מודעות.');
    for (const e of errors) console.error(`  ${e.search}: ${e.error}`);
    process.exitCode = 1;
    return;
  }

  // Value against the full harvest, then filter - a car excluded by the user's
  // filters is still a valid comparable for pricing the ones that survive.
  valueListings(listings, cfg.scoring);
  const { kept, rejected } = applyFilters(listings, cfg.filters);
  scoreListings(kept, cfg.scoring);

  const store = loadStore(resolve(process.cwd(), cfg.output.dir));
  reconcile(kept, store);
  saveStore(store);

  const shown = cfg.output.newOnly ? kept.filter((l) => l.history.isNew) : kept;
  const stats = {
    total: listings.length,
    kept: kept.length,
    rejected: rejected.length,
    bargains: kept.filter((l) => l.score.total >= cfg.scoring.minBargainScore && l.score.risk < 45).length,
    newCount: kept.filter((l) => l.history.isNew).length,
    errors,
  };

  printConsole(shown, cfg, stats);
  const files = writeReports(shown, cfg, stats);
  for (const f of files) log(`נכתב: ${f}`);
  if (errors.length) {
    console.error('\nחיפושים שנכשלו:');
    for (const e of errors) console.error(`  ${e.search}: ${e.error}`);
  }
}

main().catch((err) => {
  console.error(`\nשגיאה: ${err.message}`);
  process.exitCode = 1;
});
