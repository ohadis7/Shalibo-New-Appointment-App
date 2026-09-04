/** Console summary + a standalone RTL HTML report. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ils = (n) => (n == null ? '—' : `₪${Math.round(n).toLocaleString('he-IL')}`);
const knum = (n) => (n == null ? '—' : Math.round(n).toLocaleString('he-IL'));
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function printConsole(listings, cfg, stats) {
  const top = listings.slice(0, cfg.scoring.topN);
  console.log('\n' + '═'.repeat(78));
  console.log(`נסרקו ${stats.total} מודעות · עברו סינון ${stats.kept} · מציאות ${stats.bargains}`);
  console.log('═'.repeat(78));

  if (top.length === 0) {
    console.log('לא נמצאו מודעות מתאימות.');
    return;
  }

  for (const [i, l] of top.entries()) {
    const v = l.valuation;
    const delta = v?.ok ? `${v.deltaPct > 0 ? '+' : ''}${v.deltaPct}% מול השוק` : 'אין הערכה';
    const drop =
      l.history?.priceChange < 0 ? ` · ירידת מחיר ${ils(Math.abs(l.history.priceChange))}` : '';
    console.log(
      `\n${String(i + 1).padStart(2)}. [${l.score.total}] ${l.title} ${l.year ?? ''}`.trimEnd()
    );
    console.log(
      `    ${ils(l.price)} · ${knum(l.km)} ק"מ · יד ${l.hand ?? '?'} · ${l.city || l.area || '—'}`
    );
    console.log(`    שווי מוערך ${ils(v?.expectedPrice)} · ${delta} · ${l.score.verdict}${drop}`);
    for (const f of l.score.flags.slice(0, 4)) {
      console.log(`    ${f.level === 'danger' ? '⛔' : f.level === 'warn' ? '⚠️ ' : '✅'} ${f.text}`);
    }
    if (l.url) console.log(`    ${l.url}`);
  }
  console.log('');
}

function card(l, i) {
  const v = l.valuation;
  const flagHtml = l.score.flags
    .map((f) => `<span class="flag ${f.level}">${esc(f.text)}</span>`)
    .join('');
  const deltaCls = v?.ok ? (v.deltaPct < -5 ? 'good' : v.deltaPct > 5 ? 'bad' : '') : '';
  const drop =
    l.history?.priceChange < 0
      ? `<span class="flag good">ירד ב-${ils(Math.abs(l.history.priceChange))}</span>`
      : '';
  const isNew = l.history?.isNew ? '<span class="flag new">חדש</span>' : '';

  return `
  <article class="card" data-score="${l.score.total}" data-risk="${l.score.risk}" data-new="${l.history?.isNew ? 1 : 0}" data-price="${l.price ?? 0}" data-delta="${v?.ok ? v.deltaPct : 0}">
    <div class="rank">${i + 1}</div>
    <div class="body">
      <h3>${esc(l.title)} ${l.year ?? ''} ${isNew}${drop}</h3>
      <div class="specs">
        <span>${ils(l.price)}</span><span>${knum(l.km)} ק"מ</span>
        <span>יד ${l.hand ?? '?'}</span><span>${esc(l.city || l.area || '—')}</span>
        ${l.score.daysListed != null ? `<span>${l.score.daysListed} ימים באוויר</span>` : ''}
      </div>
      <div class="valuation">
        שווי מוערך <b>${ils(v?.expectedPrice)}</b>
        ${v?.ok ? `<b class="${deltaCls}">${v.deltaPct > 0 ? '+' : ''}${v.deltaPct}%</b>` : '<i>אין מספיק נתוני השוואה</i>'}
        ${v?.ok && v.savingIls > 0 ? `<span class="save">חיסכון ${ils(v.savingIls)}</span>` : ''}
        ${v?.ok ? `<span class="conf">ביטחון ${Math.round(v.confidence * 100)}% · ${v.cohortSize} מודעות</span>` : ''}
      </div>
      <div class="flags">${flagHtml}</div>
      ${l.url ? `<a class="link" href="${esc(l.url)}" target="_blank" rel="noopener">פתח ביד2 ↗</a>` : ''}
    </div>
    <div class="score ${l.score.total >= 75 ? 'hot' : l.score.total >= 60 ? 'mid' : ''}">
      <b>${l.score.total}</b><small>${esc(l.score.verdict)}</small>
      <div class="bars">
        <div title="מחיר">מחיר<i style="--w:${l.score.value}%"></i></div>
        <div title="מצב">מצב<i style="--w:${l.score.condition}%"></i></div>
        <div title="סיכון">סיכון<i class="risk" style="--w:${l.score.risk}%"></i></div>
      </div>
    </div>
  </article>`;
}

export function buildHtml(listings, cfg, stats) {
  const generated = new Date().toLocaleString('he-IL');
  const cards = listings.slice(0, Math.max(cfg.scoring.topN, 50)).map(card).join('');

  return `<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>סוכן רכב יד 2 — דוח מציאות</title>
<style>
  :root{--bg:#f7f5f0;--card:#fff;--ink:#1d2a2b;--muted:#6b7a7b;--line:#e3ded3;--teal:#0f766e;--good:#12805c;--bad:#b3261e;--warn:#a35b00}
  @media (prefers-color-scheme:dark){:root{--bg:#14191a;--card:#1d2426;--ink:#e9eceb;--muted:#94a3a3;--line:#2b3436}}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 "Segoe UI",Arial,sans-serif}
  header{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--teal);color:#fff}
  header h1{font-size:17px;margin:0;font-weight:600}
  header .meta{margin-inline-start:auto;font-size:12px;opacity:.85}
  .burger{width:40px;height:40px;border:0;border-radius:10px;background:rgba(255,255,255,.15);color:#fff;font-size:18px;cursor:pointer;display:grid;place-items:center}
  .burger:hover{background:rgba(255,255,255,.28)}
  nav{position:fixed;inset-block:0;inset-inline-start:0;width:280px;transform:translateX(100%);transition:.25s;background:var(--card);border-inline-end:1px solid var(--line);padding:20px;z-index:30;overflow:auto}
  nav.open{transform:none;box-shadow:0 0 40px rgba(0,0,0,.25)}
  nav h2{font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:20px 0 8px}
  nav h2:first-child{margin-top:0}
  nav label{display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer}
  nav select,nav input[type=range]{width:100%}
  .scrim{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:25;display:none}
  .scrim.open{display:block}
  main{max-width:980px;margin:0 auto;padding:20px 16px 60px}
  .stats{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px}
  .stat{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 14px}
  .stat b{display:block;font-size:20px}
  .stat span{font-size:12px;color:var(--muted)}
  .card{display:flex;gap:14px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:12px}
  .rank{font-size:13px;color:var(--muted);min-width:22px}
  .body{flex:1;min-width:0}
  .body h3{margin:0 0 6px;font-size:16px}
  .specs{display:flex;flex-wrap:wrap;gap:10px;color:var(--muted);font-size:13px}
  .valuation{margin-top:8px;font-size:13px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
  .valuation .good{color:var(--good)}.valuation .bad{color:var(--bad)}
  .save{color:var(--good);font-weight:600}.conf{color:var(--muted)}
  .flags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  .flag{font-size:12px;padding:2px 8px;border-radius:999px;background:var(--line);color:var(--ink)}
  .flag.danger{background:#fde8e6;color:var(--bad)}
  .flag.warn{background:#fdf1dd;color:var(--warn)}
  .flag.good{background:#e2f5ec;color:var(--good)}
  .flag.new{background:var(--teal);color:#fff}
  @media (prefers-color-scheme:dark){.flag.danger{background:#3a1f1d}.flag.warn{background:#3a2c14}.flag.good{background:#173229}}
  .link{display:inline-block;margin-top:8px;color:var(--teal);font-weight:600;text-decoration:none}
  .score{text-align:center;min-width:96px;border-inline-start:1px solid var(--line);padding-inline-start:12px}
  .score b{font-size:26px;display:block}
  .score.hot b{color:var(--good)}.score.mid b{color:var(--warn)}
  .score small{color:var(--muted);font-size:12px}
  .bars{margin-top:8px;font-size:10px;color:var(--muted);text-align:start}
  .bars div{margin-bottom:3px}
  .bars i{display:block;height:4px;border-radius:2px;background:var(--teal);width:var(--w)}
  .bars i.risk{background:var(--bad)}
  .empty{text-align:center;color:var(--muted);padding:40px}
</style></head><body>

<header>
  <button class="burger" id="burger" aria-label="תפריט" aria-expanded="false">☰</button>
  <h1>סוכן רכב יד 2 — דוח מציאות</h1>
  <div class="meta">${esc(generated)}</div>
</header>

<div class="scrim" id="scrim"></div>
<nav id="menu" aria-label="סינון ומיון">
  <h2>מיון</h2>
  <select id="sort">
    <option value="score">ציון מציאה</option>
    <option value="delta">הכי זול מול השוק</option>
    <option value="price">מחיר - מהנמוך</option>
  </select>
  <h2>סינון</h2>
  <label><input type="checkbox" id="onlyBargains"> רק ציון ${cfg.scoring.minBargainScore}+</label>
  <label><input type="checkbox" id="hideRisky"> הסתר סיכון גבוה</label>
  <label><input type="checkbox" id="onlyNew"> רק מודעות חדשות</label>
  <h2>חיפושים</h2>
  ${cfg.searches.map((s) => `<div style="font-size:12px;color:var(--muted);padding:4px 0">${esc(s.name || s.url)}</div>`).join('')}
</nav>

<main>
  <div class="stats">
    <div class="stat"><b>${stats.total}</b><span>מודעות נסרקו</span></div>
    <div class="stat"><b>${stats.kept}</b><span>עברו סינון</span></div>
    <div class="stat"><b>${stats.bargains}</b><span>מציאות</span></div>
    <div class="stat"><b>${stats.newCount}</b><span>חדשות מאז הריצה הקודמת</span></div>
  </div>
  <div id="list">${cards || '<p class="empty">לא נמצאו מודעות מתאימות.</p>'}</div>
</main>

<script>
  const menu = document.getElementById('menu');
  const scrim = document.getElementById('scrim');
  const burger = document.getElementById('burger');
  const toggle = (open) => {
    menu.classList.toggle('open', open);
    scrim.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
  };
  burger.onclick = () => toggle(!menu.classList.contains('open'));
  scrim.onclick = () => toggle(false);
  addEventListener('keydown', (e) => e.key === 'Escape' && toggle(false));

  const list = document.getElementById('list');
  const cards = [...list.querySelectorAll('.card')];
  const n = (el, k) => Number(el.dataset[k]);
  function apply() {
    const onlyBargains = document.getElementById('onlyBargains').checked;
    const hideRisky = document.getElementById('hideRisky').checked;
    const onlyNew = document.getElementById('onlyNew').checked;
    const sort = document.getElementById('sort').value;
    for (const c of cards) {
      const ok = (!onlyBargains || n(c,'score') >= ${cfg.scoring.minBargainScore})
              && (!hideRisky || n(c,'risk') < 45)
              && (!onlyNew || n(c,'new') === 1);
      c.style.display = ok ? '' : 'none';
    }
    const key = { score: (c) => -n(c,'score'), delta: (c) => n(c,'delta'), price: (c) => n(c,'price') }[sort];
    [...cards].sort((a,b) => key(a) - key(b)).forEach((c) => list.appendChild(c));
  }
  for (const id of ['onlyBargains','hideRisky','onlyNew','sort']) document.getElementById(id).onchange = apply;
</script>
</body></html>`;
}

export function writeReports(listings, cfg, stats) {
  const dir = resolve(process.cwd(), cfg.output.dir);
  mkdirSync(dir, { recursive: true });
  const written = [];

  if (cfg.output.json) {
    const path = resolve(dir, 'report.json');
    const payload = listings.map(({ raw, text, ...rest }) => rest);
    writeFileSync(path, JSON.stringify({ generatedAt: new Date().toISOString(), stats, listings: payload }, null, 2), 'utf8');
    written.push(path);
  }
  if (cfg.output.html) {
    const path = resolve(dir, 'report.html');
    writeFileSync(path, buildHtml(listings, cfg, stats), 'utf8');
    written.push(path);
  }
  return written;
}
