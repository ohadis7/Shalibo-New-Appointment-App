/**
 * Price model.
 *
 * There is no Levi-Yitzhak feed here, so "what should this car cost" is learned
 * from the market itself: for every model cohort we fit
 *
 *     ln(price) = b0 + b1 * age + b2 * (km / 10,000)
 *
 * by least squares, then refit without the residual outliers so that a handful of
 * wrecks or wishful-thinking sellers do not drag the baseline. A listing's value
 * signal is its price divided by what the cohort says that car should cost.
 */

const CURRENT_YEAR = new Date().getFullYear();
const KM_UNIT = 10000;

/** Solve a small dense system by Gaussian elimination with partial pivoting. */
function solve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    if (Math.abs(M[pivot][col]) < 1e-12) return null;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

export function normKey(l) {
  const clean = (s) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
  return `${clean(l.manufacturer)}|${clean(l.model)}`;
}

export function ageOf(l) {
  return l.year ? Math.max(0, CURRENT_YEAR - l.year) : null;
}

/** km, imputed from age when the listing does not state it. */
export function kmOf(l, kmPerYearNormal) {
  if (l.km != null && l.km > 0) return l.km;
  const age = ageOf(l);
  return age == null ? null : age * kmPerYearNormal;
}

function features(l, kmPerYearNormal) {
  const age = ageOf(l);
  const km = kmOf(l, kmPerYearNormal);
  if (age == null || km == null || !l.price || l.price <= 0) return null;
  return { x: [1, age, km / KM_UNIT], y: Math.log(l.price) };
}

function fit(rows) {
  const k = 3;
  const A = Array.from({ length: k }, () => new Array(k).fill(0));
  const b = new Array(k).fill(0);
  for (const { x, y } of rows) {
    for (let i = 0; i < k; i++) {
      b[i] += x[i] * y;
      for (let j = 0; j < k; j++) A[i][j] += x[i] * x[j];
    }
  }
  return solve(A, b);
}

function r2Of(rows, beta) {
  const mean = rows.reduce((s, r) => s + r.y, 0) / rows.length;
  let ssRes = 0;
  let ssTot = 0;
  for (const { x, y } of rows) {
    const pred = x.reduce((s, xi, i) => s + xi * beta[i], 0);
    ssRes += (y - pred) ** 2;
    ssTot += (y - mean) ** 2;
  }
  return ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);
}

function median(arr) {
  if (arr.length === 0) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Least squares, refit once without residual outliers (> 2.5 MAD). */
function robustFit(rows) {
  let beta = fit(rows);
  if (!beta) return null;
  const resid = rows.map(({ x, y }) => y - x.reduce((s, xi, i) => s + xi * beta[i], 0));
  const med = median(resid);
  const mad = median(resid.map((r) => Math.abs(r - med))) || 0;
  if (mad > 0) {
    const kept = rows.filter((_, i) => Math.abs(resid[i] - med) <= 2.5 * mad * 1.4826);
    if (kept.length >= 6 && kept.length < rows.length) {
      const refit = fit(kept);
      if (refit) return { beta: refit, rows: kept, r2: r2Of(kept, refit) };
    }
  }
  return { beta, rows, r2: r2Of(rows, beta) };
}

/** Median-only fallback for cohorts too small to regress. */
function medianModel(rows) {
  const m = median(rows.map((r) => r.y));
  return m == null ? null : { beta: [m, 0, 0], rows, r2: 0, fallback: true };
}

const MIN_REGRESSION = 8;
const MIN_COHORT = 3;

/**
 * Attach `valuation` to every listing.
 * Cohort preference: exact model -> manufacturer -> whole result set.
 */
export function valueListings(listings, scoring) {
  const kmPerYear = scoring.kmPerYearNormal;
  const prepared = listings.map((l) => ({ listing: l, f: features(l, kmPerYear) }));

  const buckets = new Map();
  const add = (key, entry) => {
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(entry);
  };
  for (const p of prepared) {
    if (!p.f) continue;
    add(normKey(p.listing), p.f);
    add(`${(p.listing.manufacturer || '?').toLowerCase()}|*`, p.f);
    add('*|*', p.f);
  }

  const models = new Map();
  const modelFor = (key) => {
    if (models.has(key)) return models.get(key);
    const rows = buckets.get(key) || [];
    let m = null;
    if (rows.length >= MIN_REGRESSION) m = robustFit(rows);
    else if (rows.length >= MIN_COHORT) m = medianModel(rows);
    models.set(key, m);
    return m;
  };

  for (const { listing, f } of prepared) {
    if (!f) {
      listing.valuation = { ok: false, reason: 'חסרים שנה/מחיר/ק"מ' };
      continue;
    }
    const tries = [normKey(listing), `${(listing.manufacturer || '?').toLowerCase()}|*`, '*|*'];
    let model = null;
    let cohortKey = null;
    for (const key of tries) {
      const m = modelFor(key);
      if (m) {
        model = m;
        cohortKey = key;
        break;
      }
    }
    if (!model) {
      listing.valuation = { ok: false, reason: 'אין מספיק מודעות להשוואה' };
      continue;
    }

    const expected = Math.exp(f.x.reduce((s, xi, i) => s + xi * model.beta[i], 0));
    const ratio = listing.price / expected;
    // Confidence grows with cohort size and model fit; a median fallback is capped low.
    const sizeScore = Math.min(1, model.rows.length / 25);
    const confidence = model.fallback
      ? 0.35 * sizeScore + 0.1
      : Math.min(1, 0.35 + 0.4 * sizeScore + 0.35 * model.r2);

    listing.valuation = {
      ok: true,
      cohortKey,
      cohortSize: model.rows.length,
      r2: Number(model.r2.toFixed(3)),
      fallback: !!model.fallback,
      expectedPrice: Math.round(expected),
      ratio: Number(ratio.toFixed(3)),
      deltaPct: Number(((ratio - 1) * 100).toFixed(1)),
      savingIls: Math.round(expected - listing.price),
      confidence: Number(confidence.toFixed(2)),
    };
  }

  return listings;
}
