/**
 * Filtering, red flags and the bargain score.
 *
 * The score answers one question: "is this cheap for what it is, and is it cheap
 * for a reason I can live with?" Cheapness alone is not a bargain - a car priced
 * 40% under its cohort is far more often damaged than a gift, which is exactly
 * what the too-good-to-be-true flag is for.
 */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const CURRENT_YEAR = new Date().getFullYear();

const OWNER_LABELS = {
  private: 'פרטית',
  company: 'חברה',
  rental: 'השכרה',
  leasing: 'ליסינג',
  'driving-school': 'לימוד נהיגה',
};

const SUSPICIOUS_TEXT = [
  [/לאחר\s*תאונה|תאונ[הת]|מרוסק|טוטאל\s*לוס/i, 'danger', 'הטקסט מזכיר תאונה'],
  [/לפירוק|לחלקים/i, 'danger', 'מוצע לפירוק/חלקים'],
  [/לא\s*עובר\s*טסט|ללא\s*טסט/i, 'danger', 'ללא טסט תקף'],
  [/מנוע\s*(חדש|מוחלף)|גיר\s*(חדש|מוחלף)/i, 'warn', 'מנוע/גיר הוחלפו'],
  [/ייבוא\s*אישי|יבוא\s*אישי/i, 'warn', 'ייבוא אישי - שווי מכירה חוזרת נמוך'],
  [/חליפין|טרייד/i, 'warn', 'עסקת חליפין'],
  [/מחיר\s*(גמיש|לא\s*סופי)|גמיש\s*במחיר|מזומן/i, 'good', 'המוכר רומז על גמישות במחיר'],
  [/יד\s*ראשונה|טיפולים\s*במוסך\s*מורשה|ספר\s*טיפולים/i, 'good', 'היסטוריית טיפולים מסודרת'],
];

const reCache = new Map();
const asRegExp = (pattern) => {
  if (!reCache.has(pattern)) {
    let re;
    try {
      re = new RegExp(pattern, 'i');
    } catch {
      re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
    reCache.set(pattern, re);
  }
  return reCache.get(pattern);
};

/**
 * Match a listing against model name patterns (regex or plain text, Hebrew or
 * English). This is how a search stays correct without trusting Yad2's model
 * ids: search broadly by manufacturer, narrow by the name the ad actually shows.
 */
export function matchesModel(listing, patterns) {
  if (!patterns || patterns.length === 0) return true;
  const hay = [listing.manufacturer, listing.model, listing.subModel].filter(Boolean).join(' ');
  if (!hay) return false;
  return patterns.some((p) => asRegExp(p).test(hay));
}

function daysSince(iso) {
  if (!iso) return null;
  const days = (Date.now() - new Date(iso).getTime()) / 86400000;
  return Number.isFinite(days) && days >= 0 ? Math.round(days) : null;
}

/** Apply the user's hard filters. Returns the survivors plus why the rest went. */
export function applyFilters(listings, f) {
  const kept = [];
  const rejected = [];
  const reject = (l, reason) => rejected.push({ listing: l, reason });

  for (const l of listings) {
    if (l.price != null && (l.price < f.priceMin || l.price > f.priceMax)) {
      reject(l, 'מחיר מחוץ לטווח');
      continue;
    }
    if (l.year != null && (l.year < f.yearMin || l.year > f.yearMax)) {
      reject(l, 'שנתון מחוץ לטווח');
      continue;
    }
    if (l.km != null && l.km > f.kmMax) {
      reject(l, 'קילומטראז׳ גבוה מדי');
      continue;
    }
    if (l.hand != null && l.hand > f.handMax) {
      reject(l, 'יותר מדי ידיים');
      continue;
    }
    if (f.gearbox.length && l.gearbox && !f.gearbox.includes(l.gearbox)) {
      reject(l, 'תיבת הילוכים לא מתאימה');
      continue;
    }
    if (!matchesModel(l, f.modelPatterns)) {
      reject(l, 'דגם מחוץ לרשימה');
      continue;
    }
    if (f.excludeOwnerTypes.length && l.ownerType && f.excludeOwnerTypes.includes(l.ownerType)) {
      reject(l, `בעלות: ${OWNER_LABELS[l.ownerType] || l.ownerType}`);
      continue;
    }
    if (f.excludeDealers && l.isDealer) {
      reject(l, 'מודעת סוחר');
      continue;
    }
    if (f.regions.length && l.area && !f.regions.some((r) => l.area.includes(r))) {
      reject(l, 'אזור לא מתאים');
      continue;
    }
    const text = l.text || '';
    const banned = f.excludeKeywords.find((k) => k && text.includes(k));
    if (banned) {
      reject(l, `מילת סינון: ${banned}`);
      continue;
    }
    const missing = f.requireKeywords.find((k) => k && !text.includes(k));
    if (missing) {
      reject(l, `חסרה מילת חובה: ${missing}`);
      continue;
    }
    kept.push(l);
  }
  return { kept, rejected };
}

function conditionScore(l, scoring) {
  let score = 50;
  const age = l.year ? CURRENT_YEAR - l.year : null;

  if (l.km != null && age != null && age > 0) {
    const kmPerYear = l.km / age;
    // 15k/yr is par; every 5k/yr away from par moves the score ~12 points.
    score += clamp(((scoring.kmPerYearNormal - kmPerYear) / 5000) * 12, -30, 25);
  }
  if (l.hand != null) score += clamp((2 - l.hand) * 8, -24, 16);
  if (age != null) score += clamp((8 - age) * 2, -12, 12);
  if (l.ownerType === 'private') score += 6;
  if (l.ownerType === 'company') score += 2;
  if (l.isDealer === false) score += 4;

  return clamp(score, 0, 100);
}

/** 0 = clean, 100 = walk away. */
function riskAssessment(l, scoring) {
  const flags = [];
  let risk = 0;
  const push = (level, text, weight) => {
    flags.push({ level, text });
    risk += weight;
  };

  const v = l.valuation;
  if (v?.ok && v.ratio < scoring.tooGoodToBeTrueRatio) {
    push('danger', `זול ב-${Math.abs(v.deltaPct)}% מהשוק - חשד לתאונה/היסטוריה בעייתית`, 45);
  }
  if (v?.ok && v.confidence < 0.4) {
    push('warn', 'מעט מודעות להשוואה - ההערכה פחות אמינה', 10);
  }
  if (!v?.ok) push('warn', `אין הערכת שווי: ${v?.reason || 'נתונים חסרים'}`, 12);

  if (l.hand != null && l.hand >= 4) push('warn', `יד ${l.hand}`, 12);
  const age = l.year ? CURRENT_YEAR - l.year : null;
  if (l.km != null && age) {
    const kmPerYear = Math.round(l.km / age);
    if (kmPerYear > 25000) push('warn', `${kmPerYear.toLocaleString('he-IL')} ק"מ בשנה`, 15);
  }
  if (l.km == null) push('warn', 'לא צוין קילומטראז׳', 8);
  if (l.ownerType && ['rental', 'leasing', 'driving-school'].includes(l.ownerType)) {
    push('warn', `בעלות קודמת: ${OWNER_LABELS[l.ownerType]}`, 14);
  }
  if (!l.description) push('warn', 'מודעה ללא תיאור', 5);

  for (const [re, level, text] of SUSPICIOUS_TEXT) {
    if (!re.test(l.text || '')) continue;
    flags.push({ level, text });
    risk += level === 'danger' ? 40 : level === 'warn' ? 12 : -4;
  }

  const age_days = daysSince(l.updatedAt || l.createdAt);
  if (age_days != null && age_days >= 21) {
    flags.push({ level: 'good', text: `${age_days} ימים באוויר - מרווח מיקוח` });
  }

  return { risk: clamp(risk, 0, 100), flags };
}

/** Score every listing in place and return them sorted best-first. */
export function scoreListings(listings, scoring) {
  for (const l of listings) {
    const v = l.valuation;
    // -25% vs cohort -> 100, at cohort price -> 50, +25% -> 0.
    let value = v?.ok ? clamp(50 - v.deltaPct * 2, 0, 100) : 50;
    if (v?.ok) value = 50 + (value - 50) * v.confidence;

    const condition = conditionScore(l, scoring);
    const { risk, flags } = riskAssessment(l, scoring);
    const w = scoring.weights;
    const total = w.value * value + w.condition * condition + w.risk * (100 - risk);

    l.score = {
      total: Math.round(total),
      value: Math.round(value),
      condition: Math.round(condition),
      risk: Math.round(risk),
      flags,
      verdict:
        risk >= 45 ? 'סיכון גבוה' : total >= 75 ? 'מציאה' : total >= 60 ? 'שווה בדיקה' : 'מחיר שוק',
      daysListed: daysSince(l.updatedAt || l.createdAt),
    };
  }
  return listings.sort((a, b) => b.score.total - a.score.total);
}
