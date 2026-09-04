/**
 * Fetch layer. Three interchangeable modes:
 *   browser - drives the pre-installed Chromium via Playwright, captures the
 *             feed XHRs the page itself makes. Survives Cloudflare; the one to use.
 *   http    - plain fetch of the gateway feed. Fast, but usually challenged.
 *   file    - reads saved .json/.html payloads. Offline dev, tests, and a manual
 *             escape hatch: save the page from your own browser, point at it.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { extractListings, extractFromHtml } from './parse.js';
import { matchesModel } from './score.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = ([min, max]) => min + Math.random() * Math.max(0, max - min);

export function pageUrl(baseUrl, page) {
  const u = new URL(baseUrl);
  if (page > 1) u.searchParams.set('page', String(page));
  else u.searchParams.delete('page');
  return u.toString();
}

/** The search page URL rewritten as its underlying feed endpoint. */
export function feedUrl(baseUrl, page) {
  const u = new URL(pageUrl(baseUrl, page));
  const category = /\/vehicles\/([a-z-]+)/.exec(u.pathname)?.[1] || 'cars';
  const gw = new URL(`https://gw.yad2.co.il/vehicles-feed/${category}`);
  for (const [k, v] of u.searchParams) gw.searchParams.set(k, v);
  return gw.toString();
}

function headers(cfg) {
  return {
    'User-Agent': cfg.fetch.userAgent,
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8',
    Referer: 'https://www.yad2.co.il/vehicles/cars',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
  };
}

async function fetchHttp(search, cfg, log) {
  const out = [];
  for (let page = 1; page <= search.maxPages; page++) {
    const url = feedUrl(search.url, page);
    log(`  GET ${url}`);
    const res = await fetch(url, {
      headers: headers(cfg),
      signal: AbortSignal.timeout(cfg.fetch.timeoutMs),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} from Yad2 feed (page ${page}). Blocked - use fetch.mode "browser".`);
    const body = await res.text();
    const listings = body.trimStart().startsWith('{')
      ? extractListings(JSON.parse(body), search.name)
      : extractFromHtml(body, search.name);
    log(`  page ${page}: ${listings.length} listings`);
    out.push(...listings);
    if (listings.length === 0) break;
    if (page < search.maxPages) await sleep(jitter(cfg.fetch.delayMsBetweenPages));
  }
  return out;
}

async function loadPlaywright() {
  try {
    return (await import('playwright')).chromium;
  } catch {
    try {
      return (await import('playwright-core')).chromium;
    } catch {
      throw new Error(
        'fetch.mode "browser" needs Playwright: npm i playwright (Chromium is already on this machine at /opt/pw-browsers).'
      );
    }
  }
}

async function fetchBrowser(search, cfg, log) {
  const chromium = await loadPlaywright();
  const launch = { headless: true };
  if (process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH;

  const browser = await chromium.launch(launch);
  const context = await browser.newContext({
    userAgent: cfg.fetch.userAgent,
    locale: 'he-IL',
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const out = [];

  // The page fetches its own feed - grab those responses instead of scraping DOM.
  const captured = [];
  page.on('response', async (res) => {
    const url = res.url();
    if (!/yad2|y2\./i.test(url)) return;
    if (!/feed|search|item|api/i.test(url)) return;
    const type = res.headers()['content-type'] || '';
    if (!type.includes('json')) return;
    try {
      captured.push(await res.json());
    } catch {
      /* non-JSON body, ignore */
    }
  });

  try {
    for (let p = 1; p <= search.maxPages; p++) {
      const url = pageUrl(search.url, p);
      log(`  open ${url}`);
      captured.length = 0;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: cfg.fetch.timeoutMs });
      await page.waitForTimeout(2500);
      await page.mouse.wheel(0, 4000);
      await page.waitForTimeout(1500);

      let listings = [];
      for (const payload of captured) listings.push(...extractListings(payload, search.name));
      if (listings.length === 0) listings = extractFromHtml(await page.content(), search.name);

      log(`  page ${p}: ${listings.length} listings`);
      out.push(...listings);
      if (listings.length === 0) break;
      if (p < search.maxPages) await sleep(jitter(cfg.fetch.delayMsBetweenPages));
    }
  } finally {
    await browser.close();
  }
  return out;
}

function readOne(path, source) {
  const body = readFileSync(path, 'utf8');
  return extname(path).toLowerCase() === '.html'
    ? extractFromHtml(body, source)
    : extractListings(JSON.parse(body), source);
}

function fetchFile(search, cfg, log) {
  const path = resolve(process.cwd(), search.file || cfg.fetch.file || '');
  const paths = statSync(path).isDirectory()
    ? readdirSync(path)
        .filter((f) => /\.(json|html)$/i.test(f))
        .map((f) => resolve(path, f))
    : [path];

  const out = [];
  for (const p of paths) {
    const listings = readOne(p, search.name);
    log(`  ${p}: ${listings.length} listings`);
    out.push(...listings);
  }
  return out;
}

/**
 * Yad2 manufacturer/model ids in a pasted URL can go stale, and a stale id
 * silently returns the wrong cars rather than an error. If a search declares
 * what it expects to find, check that the ads actually say so.
 */
export function sanityCheck(search, listings) {
  const expect = search.expect || [];
  if (expect.length === 0 || listings.length === 0) return null;
  const hits = listings.filter((l) => matchesModel(l, expect)).length;
  const ratio = hits / listings.length;
  if (ratio >= 0.3) return null;
  const sample = listings.slice(0, 3).map((l) => l.title).join(' | ');
  return `החיפוש "${search.name || search.url}" החזיר ${listings.length} מודעות אבל רק ${hits} תואמות את הדגם המצופה - כנראה קוד יצרן/דגם שגוי ב-URL. דוגמאות שהתקבלו: ${sample}`;
}

/** Run every configured search and return de-duplicated listings. */
export async function fetchAll(cfg, log = () => {}) {
  const byId = new Map();
  const errors = [];
  const warnings = [];

  for (const search of cfg.searches) {
    log(`\n[${search.name || search.url}]`);
    try {
      let listings;
      if (cfg.fetch.mode === 'file') listings = fetchFile(search, cfg, log);
      else if (cfg.fetch.mode === 'http') listings = await fetchHttp(search, cfg, log);
      else listings = await fetchBrowser(search, cfg, log);

      const warning = sanityCheck(search, listings);
      if (warning) {
        log(`  ! ${warning}`);
        warnings.push(warning);
      }
      for (const l of listings) if (!byId.has(l.id)) byId.set(l.id, l);
    } catch (err) {
      log(`  ! ${err.message}`);
      errors.push({ search: search.name || search.url, error: err.message });
    }
  }
  return { listings: [...byId.values()], errors, warnings };
}
