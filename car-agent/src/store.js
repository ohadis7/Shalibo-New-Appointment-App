/**
 * Run-to-run memory: which ads we have already seen, and what they used to cost.
 * A price cut on an ad that has been sitting for weeks is the single most
 * actionable signal this agent produces, and it only exists across runs.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export function loadStore(outDir) {
  const path = resolve(outDir, 'seen.json');
  if (!existsSync(path)) return { path, data: {} };
  try {
    return { path, data: JSON.parse(readFileSync(path, 'utf8')) };
  } catch {
    return { path, data: {} };
  }
}

export function saveStore(store) {
  mkdirSync(dirname(store.path), { recursive: true });
  writeFileSync(store.path, JSON.stringify(store.data, null, 2), 'utf8');
}

/** Tag each listing as new / price-dropped / unchanged against the store. */
export function reconcile(listings, store) {
  const now = new Date().toISOString();
  for (const l of listings) {
    const prev = store.data[l.id];
    if (!prev) {
      l.history = { isNew: true, firstSeen: now, priceChange: null, previousPrice: null };
      store.data[l.id] = { firstSeen: now, lastSeen: now, prices: [{ at: now, price: l.price }] };
      continue;
    }
    const lastPrice = prev.prices?.at(-1)?.price ?? null;
    const changed = lastPrice != null && l.price != null && l.price !== lastPrice;
    l.history = {
      isNew: false,
      firstSeen: prev.firstSeen,
      previousPrice: lastPrice,
      priceChange: changed ? l.price - lastPrice : 0,
    };
    prev.lastSeen = now;
    if (changed) prev.prices.push({ at: now, price: l.price });
  }
  return listings;
}
