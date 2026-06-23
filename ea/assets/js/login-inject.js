/**
 * Shalibo Wellness — EA Admin Login Enhancer
 * Soft UI Evolution · Lora + Raleway · Teal brand
 * Logo arcs mathematically corrected for 240×240 viewBox, center (120,120)
 */
(function () {
  'use strict';

  /*
   * SVG LOGO — arc calculation notes
   * ViewBox: 0 0 240 240, center: (120,120)
   * Outer ring radius: 116  → points at y=4 / y=236
   * Inner ring radius: 104  → points at y=16 / y=224
   * Text arc radius:   109  → sits between both rings
   *   Left edge: (120-109, 120) = (11, 120)
   *   Right edge:(120+109, 120) = (229, 120)
   *   Top:  (120, 11)  — sweep=1 (clockwise)
   *   Bottom:(120,229) — sweep=0 (counter-clockwise)
   */
  /*
   * SVG LOGO — corrected proportions
   * ViewBox 240×240, center (120,120)
   * Outer ring r=116, Inner ring r=104
   * Text arcs r=95: sits INSIDE inner ring (matches real logo)
   *   Left  anchor: (120-95, 120) = (25, 120)
   *   Right anchor: (120+95, 120) = (215, 120)
   *   Top midpoint : (120, 25)   sweep=1 (clockwise)
   *   Bot midpoint : (120, 215)  sweep=0 (counter-clockwise)
   * S font-size 82 → cap-height ≈57px, baseline y=148, top≈91
   * i dot: cy=78, cx=108, r=8 (just above S top)
   */
  var LOGO_SVG = [
    '<svg viewBox="0 0 240 240" width="170" height="170" xmlns="http://www.w3.org/2000/svg">',

      '<defs>',
        '<path id="sw-top" d="M 25,120 A 95,95 0 0 1 215,120"/>',
        '<path id="sw-bot" d="M 25,120 A 95,95 0 0 0 215,120"/>',
      '</defs>',

      /* White fill */
      '<circle cx="120" cy="120" r="119" fill="white"/>',
      /* Outer ring */
      '<circle cx="120" cy="120" r="116" fill="none" stroke="#5BB5B0" stroke-width="2.2"/>',
      /* Inner ring */
      '<circle cx="120" cy="120" r="104" fill="none" stroke="#5BB5B0" stroke-width="1"/>',

      /* SHALIBO WELLNESS — top */
      '<text fill="#5BB5B0" font-size="14" font-family="Cinzel,serif" font-weight="700" letter-spacing="3.5">',
        '<textPath href="#sw-top" startOffset="50%" text-anchor="middle">SHALIBO WELLNESS</textPath>',
      '</text>',

      /* • BY DANIEL DAVID SHALIBO • — bottom */
      '<text fill="#5BB5B0" font-size="10.5" font-family="Cinzel,serif" font-weight="600" letter-spacing="1.5">',
        '<textPath href="#sw-bot" startOffset="50%" text-anchor="middle">• BY DANIEL DAVID SHALIBO •</textPath>',
      '</text>',

      /* i dot — above S top */
      '<circle cx="108" cy="78" r="8" fill="#5BB5B0"/>',

      /* S monogram — font-size 82, baseline 148 */
      '<text x="120" y="148"',
        ' fill="#5BB5B0"',
        ' font-size="82"',
        ' font-family="\'Cormorant Garamond\',\'Cormorant\',Georgia,serif"',
        ' font-style="italic"',
        ' font-weight="700"',
        ' text-anchor="middle">S</text>',

    '</svg>'
  ].join('');

  /* ── Lucide icons (stroke-only, no fill) ── */
  var ICON_EMAIL = [
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"',
      ' stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">',
      '<rect x="2" y="4" width="20" height="16" rx="2"/>',
      '<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    '</svg>'
  ].join('');

  var ICON_LOCK = [
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"',
      ' stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">',
      '<rect x="3" y="11" width="18" height="11" rx="2"/>',
      '<path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    '</svg>'
  ].join('');

  /* ── Inject logo above panel ── */
  function injectLogo() {
    var frame = document.getElementById('login-frame');
    if (!frame) return;

    var sec = document.createElement('div');
    sec.className = 'sw-logo-section';
    sec.innerHTML = [
      '<div class="sw-logo-ring">',
        LOGO_SVG,
      '</div>'
    ].join('');

    frame.insertBefore(sec, frame.firstChild);
  }

  /* ── Inject welcome text into card ── */
  function injectWelcome() {
    var body = document.querySelector('.panel-body');
    if (!body) return;

    var wrap = document.createElement('div');
    wrap.className = 'sw-welcome';
    wrap.innerHTML = [
      '<h1 class="sw-title">Welcome Back</h1>',
      '<p class="sw-subtitle">Sign in to your account to continue</p>'
    ].join('');

    body.insertBefore(wrap, body.firstChild);
  }

  /* ── Wrap input with left-side icon ── */
  function wrapInput(id, iconHtml) {
    var input = document.getElementById(id);
    if (!input) return;

    var wrap = document.createElement('div');
    wrap.className = 'sw-field';

    var iconSpan = document.createElement('span');
    iconSpan.className = 'sw-field-icon';
    iconSpan.setAttribute('aria-hidden', 'true');
    iconSpan.innerHTML = iconHtml;

    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(iconSpan);
    wrap.appendChild(input);
  }

  /* ── Update labels ── */
  function setLabel(forId, text) {
    var el = document.querySelector('label[for="' + forId + '"]');
    if (el) el.textContent = text;
  }

  /* ── Update placeholders ── */
  function setAttr(id, attr, val) {
    var el = document.getElementById(id);
    if (el) el.setAttribute(attr, val);
  }

  /* ── Update submit button ── */
  function updateButton() {
    var btn = document.getElementById('login');
    if (!btn) return;
    btn.textContent = 'Sign In';
  }

  /* ── Forgot password ── */
  function updateForgot() {
    var link = document.querySelector(
      'a[href*="forgot_password"], .forgot-password-link, a[href*="forgot"]'
    );
    if (!link) return;
    link.textContent = 'Forgot Password?';
  }

  /* ── Run ── */
  function run() {
    injectLogo();
    injectWelcome();
    wrapInput('username', ICON_EMAIL);
    wrapInput('password', ICON_LOCK);
    setLabel('username', 'Email');
    setLabel('password', 'Password');
    setAttr('username', 'placeholder', 'you@example.com');
    setAttr('username', 'inputmode', 'email');
    setAttr('password', 'placeholder', '••••••••');
    updateButton();
    updateForgot();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
