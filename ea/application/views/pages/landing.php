<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Shalibo Wellness — <?= e(vars('page_title')) ?></title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Raleway:wght@300;400;500;600;700&family=Cinzel:wght@600;700&family=Cormorant+Garamond:ital,wght@1,600;1,700&display=swap" rel="stylesheet">
<link rel="icon" type="image/x-icon" href="<?= base_url('assets/img/favicon.ico') ?>">
<link rel="icon" sizes="192x192" href="<?= base_url('assets/img/shalibo-logo.png') ?>">

<style>
/* ── Brand tokens ── */
:root {
  --cream:       #F0EAD6;
  --teal:        #5BB5B0;
  --teal-dark:   #3D8B87;
  --teal-dim:    rgba(91,181,176,.12);
  --ink:         #1C2B2A;
  --ink-mid:     #3D5250;
  --ink-soft:    #7A9290;
  --ink-muted:   #b0bcba;
  --white:       #FFFFFF;
  --card-bg:     rgba(255,255,255,0.88);
  --r-card:      20px;
  --r-btn:       50px;
  --shadow-card: 0 4px 6px -1px rgba(30,43,42,.06), 0 16px 40px -4px rgba(30,43,42,.10);
  --shadow-btn:  0 4px 18px rgba(91,181,176,.38);
  --shadow-btn-h:0 8px 28px rgba(91,181,176,.50);
  --trans:       all 0.22s cubic-bezier(0.4,0,0.2,1);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration:.01ms !important; transition-duration:.01ms !important; }
}

@keyframes bandSlide { to { background-position: 200% 50%; } }
@keyframes fadeUp {
  from { opacity:0; transform:translateY(18px); }
  to   { opacity:1; transform:translateY(0); }
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Raleway', -apple-system, sans-serif;
  background: var(--cream);
  background-image:
    radial-gradient(ellipse 55% 45% at 8% 6%,  rgba(91,181,176,.14) 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 92% 94%, rgba(91,181,176,.10) 0%, transparent 55%);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64px 20px 56px;
  overflow-x: hidden;
}

body::before {
  content: '';
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg,
    var(--teal), var(--teal-dark), var(--teal), var(--teal-dark), var(--teal));
  background-size: 200% 100%;
  animation: bandSlide 2.8s linear infinite;
  z-index: 9999;
}

.logo-wrap {
  margin-bottom: 28px;
  animation: fadeUp .6s cubic-bezier(0.34,1.1,.64,1) both;
}

.logo-wrap img {
  width: 196px;
  height: 196px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow:
    0 8px 28px rgba(0,0,0,.10),
    0 0 0 2px rgba(91,181,176,.16);
  transition: box-shadow .3s ease;
}

.logo-wrap img:hover {
  box-shadow:
    0 12px 36px rgba(0,0,0,.13),
    0 0 0 3px rgba(91,181,176,.30);
}

.page-header {
  text-align: center;
  margin-bottom: 36px;
  animation: fadeUp .6s cubic-bezier(0.34,1.1,.64,1) .08s both;
}

.page-title {
  font-family: 'Lora', Georgia, serif;
  font-size: 28px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -.3px;
  margin-bottom: 8px;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 15px;
  font-weight: 400;
  color: var(--ink-soft);
  line-height: 1.5;
}

.services-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  width: 100%;
  max-width: 420px;
}

@media (min-width: 720px) {
  .services-grid {
    grid-template-columns: 1fr 1fr;
    max-width: 860px;
  }
}

.service-card {
  background: var(--card-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,.92);
  border-top: 3px solid var(--teal);
  border-radius: var(--r-card);
  box-shadow: var(--shadow-card);
  padding: 28px 24px 24px;
  cursor: pointer;
  transition: var(--trans);
  animation: fadeUp .55s cubic-bezier(0.34,1.1,.64,1) .14s both;
  position: relative;
  overflow: hidden;
  text-decoration: none;
  display: block;
  color: inherit;
}

.service-card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 8px 12px -2px rgba(30,43,42,.08),
    0 24px 48px -6px rgba(30,43,42,.14);
}

.service-card:active {
  transform: translateY(-1px);
}

.service-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,.22) 0%, transparent 55%);
  pointer-events: none;
}

.service-card.disabled {
  cursor: default;
  border-top-color: rgba(91,181,176,.30);
  animation-delay: .20s;
}

.service-card.disabled:hover {
  transform: none;
  box-shadow: var(--shadow-card);
}

.card-icon {
  width: 54px;
  height: 54px;
  background: var(--teal-dim);
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--teal-dark);
  margin-bottom: 16px;
  flex-shrink: 0;
}

.service-card.disabled .card-icon {
  background: rgba(91,181,176,.06);
  color: var(--ink-muted);
}

.card-name {
  font-family: 'Lora', Georgia, serif;
  font-size: 19px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 5px;
  line-height: 1.25;
}

.service-card.disabled .card-name { color: var(--ink-soft); }

.card-provider {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink-soft);
  margin-bottom: 14px;
}

.service-card.disabled .card-provider { color: var(--ink-muted); }

.card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 20px;
}

.badge {
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: .2px;
  color: var(--teal-dark);
  background: var(--teal-dim);
  border: 1px solid rgba(91,181,176,.22);
  border-radius: 20px;
  padding: 3px 10px;
}

.service-card.disabled .badge {
  color: var(--ink-muted);
  background: rgba(91,181,176,.05);
  border-color: rgba(91,181,176,.12);
}

.btn-book {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 24px;
  background: linear-gradient(135deg, var(--teal) 0%, var(--teal-dark) 100%);
  color: var(--white);
  border: none;
  border-radius: var(--r-btn);
  font-family: 'Raleway', sans-serif;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: .5px;
  cursor: pointer;
  box-shadow: var(--shadow-btn);
  transition: var(--trans);
  text-decoration: none;
  position: relative;
  overflow: hidden;
}

.btn-book::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,.14) 0%, transparent 55%);
  pointer-events: none;
}

.btn-book:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-btn-h);
}

.btn-book:active {
  transform: translateY(0);
  box-shadow: var(--shadow-btn);
}

.btn-coming {
  display: block;
  width: 100%;
  padding: 14px 24px;
  background: transparent;
  color: var(--ink-muted);
  border: 1.5px dashed rgba(91,181,176,.30);
  border-radius: var(--r-btn);
  font-family: 'Raleway', sans-serif;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
}

.divider {
  width: 100%;
  max-width: 420px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(91,181,176,.25), transparent);
  margin: 36px 0 28px;
}

@media (min-width: 720px) {
  .divider { max-width: 860px; }
}

.info-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  color: var(--ink-soft);
  max-width: 420px;
  width: 100%;
  justify-content: center;
}

.footer {
  margin-top: 48px;
  text-align: center;
  color: var(--ink-muted);
  font-size: 12.5px;
  line-height: 1.7;
}

.footer a {
  color: var(--teal-dark);
  text-decoration: none;
  font-weight: 500;
}

.footer a:hover { text-decoration: underline; }

::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: var(--cream); }
::-webkit-scrollbar-thumb { background: var(--teal); border-radius: 10px; }

@media (max-width: 480px) {
  body { padding: 52px 16px 40px; }
  .page-title { font-size: 23px; }
  .logo-wrap img { width: 164px; height: 164px; }
}
</style>
</head>

<body>

<!-- ── Logo (PNG) ── -->
<div class="logo-wrap">
  <img src="<?= base_url('assets/img/shalibo-logo.png') ?>" alt="Shalibo Wellness">
</div>

<!-- ── Header ── -->
<div class="page-header">
  <h1 class="page-title">Book Your Appointment</h1>
  <p class="page-subtitle">Choose a service to get started</p>
</div>

<!-- ── Service cards ── -->
<div class="services-grid">

  <!-- Personal Training — GM -->
  <a class="service-card" href="<?= site_url('booking?service=24&provider=18') ?>">

    <div class="card-icon">
      <svg width="27" height="27" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    </div>

    <div class="card-name">Personal Training Program</div>
    <div class="card-provider">with GM</div>

    <div class="card-badges">
      <span class="badge">Fitness</span>
      <span class="badge">1:1 Session</span>
    </div>

    <span class="btn-book">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
      Book a Session
    </span>

  </a>

  <!-- Nails Tech — Coming Soon -->
  <div class="service-card disabled">

    <div class="card-icon">
      <svg width="27" height="27" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        <path d="M5 3v4M19 17v4M3 5h4M17 19h4"/>
      </svg>
    </div>

    <div class="card-name">Nails Tech</div>
    <div class="card-provider">with Jean — Coming Soon</div>

    <div class="card-badges">
      <span class="badge">Beauty</span>
      <span class="badge">Nail Care</span>
    </div>

    <span class="btn-coming">Coming Soon</span>

  </div>

</div><!-- /services-grid -->

<div class="divider"></div>

<!-- ── Contact info row ── -->
<div class="info-row">
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
       stroke="#5BB5B0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.06 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/>
  </svg>
  Need help? Call us or send a WhatsApp message
</div>

<!-- ── Footer ── -->
<div class="footer">
  <p>&copy; 2025 <?= e(vars('company_name')) ?> &nbsp;·&nbsp; By Daniel David Shalibo</p>
  <p style="margin-top:6px;">
    <a href="mailto:daniel@shalibowellness.com">daniel@shalibowellness.com</a>
  </p>
</div>

</body>
</html>
