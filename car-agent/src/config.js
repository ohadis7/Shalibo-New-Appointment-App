import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const DEFAULTS = {
  searches: [],
  filters: {
    priceMin: 0,
    priceMax: Infinity,
    yearMin: 0,
    yearMax: 9999,
    kmMax: Infinity,
    handMax: Infinity,
    gearbox: [],
    modelPatterns: [],
    excludeOwnerTypes: [],
    excludeDealers: false,
    regions: [],
    excludeKeywords: [],
    requireKeywords: [],
  },
  scoring: {
    minBargainScore: 60,
    topN: 15,
    weights: { value: 0.6, condition: 0.25, risk: 0.15 },
    tooGoodToBeTrueRatio: 0.55,
    kmPerYearNormal: 15000,
  },
  fetch: {
    mode: 'browser',
    delayMsBetweenPages: [1500, 4000],
    timeoutMs: 45000,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
  },
  output: { dir: './out', html: true, json: true, newOnly: false },
};

function deepMerge(base, override) {
  if (!override || typeof override !== 'object' || Array.isArray(override)) {
    return override === undefined ? base : override;
  }
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(override)) {
    out[k] = k in out ? deepMerge(out[k], v) : v;
  }
  return out;
}

export function loadConfig(path) {
  const candidates = [
    path,
    resolve(process.cwd(), 'config.json'),
    resolve(HERE, '..', 'config.json'),
    resolve(HERE, '..', 'config.example.json'),
  ].filter(Boolean);

  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error('No config file found. Copy config.example.json to config.json.');

  const raw = JSON.parse(readFileSync(found, 'utf8'));
  const cfg = deepMerge(DEFAULTS, raw);
  cfg.__path = found;
  validate(cfg);
  return cfg;
}

function validate(cfg) {
  if (!Array.isArray(cfg.searches) || cfg.searches.length === 0) {
    throw new Error('config.searches must list at least one { name, url } search.');
  }
  for (const s of cfg.searches) {
    if (!s.url) throw new Error(`Search "${s.name || '?'}" is missing a url.`);
    if (!/yad2\.co\.il/.test(s.url)) {
      throw new Error(`Search "${s.name || s.url}" is not a yad2.co.il URL.`);
    }
    s.maxPages = Math.min(Math.max(1, s.maxPages ?? 3), 20);
  }
  const w = cfg.scoring.weights;
  const sum = w.value + w.condition + w.risk;
  if (sum <= 0) throw new Error('scoring.weights must sum to a positive number.');
  w.value /= sum;
  w.condition /= sum;
  w.risk /= sum;
}
