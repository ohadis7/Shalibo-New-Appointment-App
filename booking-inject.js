/**
 * Shalibo Wellness — EA Booking Page Enhancer
 * 1. Replaces the default service/provider header with the Shalibo Wellness logo.
 * 2. Filters the service dropdown to show only services belonging to the
 *    provider specified in the URL (?provider=ID), so each provider's
 *    booking link shows only their own services.
 * Injected by Dockerfile into booking_layout.php
 */
(function () {
  'use strict';

  /* Same SVG logo as login page — scaled to 52×52 for header */
  var LOGO_SVG = [
    '<svg viewBox="0 0 240 240" width="52" height="52" xmlns="http://www.w3.org/2000/svg">',
      '<defs>',
        '<path id="bk-top" d="M 25,120 A 95,95 0 0 1 215,120"/>',
        '<path id="bk-bot" d="M 25,120 A 95,95 0 0 0 215,120"/>',
      '</defs>',
      '<circle cx="120" cy="120" r="119" fill="white"/>',
      '<circle cx="120" cy="120" r="116" fill="none" stroke="#5BB5B0" stroke-width="2.5"/>',
      '<circle cx="120" cy="120" r="104" fill="none" stroke="#5BB5B0" stroke-width="1.2"/>',
      '<text fill="#5BB5B0" font-size="14" font-family="Cinzel,serif" font-weight="700" letter-spacing="3.5">',
        '<textPath href="#bk-top" startOffset="50%" text-anchor="middle">SHALIBO WELLNESS</textPath>',
      '</text>',
      '<text fill="#5BB5B0" font-size="10.5" font-family="Cinzel,serif" font-weight="600" letter-spacing="1.5">',
        '<textPath href="#bk-bot" startOffset="50%" text-anchor="middle">• BY DANIEL DAVID SHALIBO •</textPath>',
      '</text>',
      '<circle cx="108" cy="78" r="8" fill="#5BB5B0"/>',
      '<text x="120" y="148"',
        ' fill="#5BB5B0"',
        ' font-size="82"',
        ' font-family="\'Cormorant Garamond\',\'Cormorant\',Georgia,serif"',
        ' font-style="italic"',
        ' font-weight="700"',
        ' text-anchor="middle">S</text>',
    '</svg>'
  ].join('');

  function injectBookingHeader() {
    var nameEl = document.querySelector('#company-name');
    if (!nameEl) return;

    /* 1. Remove the service/provider <small> tag */
    var small = nameEl.querySelector('small');
    if (small) small.remove();

    /* 2. Remove any plain-text service-name nodes left behind */
    nameEl.childNodes.forEach(function (node) {
      if (node.nodeType === 3 /* TEXT_NODE */) {
        var txt = node.textContent.trim();
        /* Keep only if it looks like the actual company name, not a service name */
        if (txt && txt !== 'Shalibo Wellness' && txt !== 'שליבו וולנס') {
          node.textContent = '';
        }
      }
    });

    /* 3. If logo ring not yet injected, add it */
    if (!nameEl.querySelector('.sw-booking-logo-ring')) {
      var ring = document.createElement('div');
      ring.className = 'sw-booking-logo-ring';
      ring.innerHTML = LOGO_SVG;

      var brand = document.createElement('div');
      brand.className = 'sw-booking-brand';
      brand.innerHTML = [
        '<span class="sw-booking-brand-name">Shalibo Wellness</span>',
        '<span class="sw-booking-brand-sub">by Daniel David Shalibo</span>'
      ].join('');

      /* Clear & rebuild header content */
      nameEl.innerHTML = '';
      nameEl.appendChild(ring);
      nameEl.appendChild(brand);
    }
  }

  /* ── Provider Service Filter ── */
  /* When URL contains ?provider=ID, hide all services in the dropdown
     that don't belong to that provider. EA exposes window.vars() with
     available_providers[] each having a services[] array of IDs.       */
  function filterServicesByProvider() {
    var params = new URLSearchParams(window.location.search);
    var providerId = params.get('provider');
    if (!providerId) return; /* no provider param — show everything */

    /* EA's data factory */
    if (typeof window.vars !== 'function') return;
    var allVars = window.vars();
    var provider = (allVars.available_providers || []).find(function (p) {
      return String(p.id) === providerId;
    });
    if (!provider || !provider.services || provider.services.length === 0) return;

    var allowed = provider.services.map(String);
    var select = document.getElementById('select-service');
    if (!select) return;

    /* Remove options whose value is not in this provider's service list */
    Array.from(select.querySelectorAll('option')).forEach(function (opt) {
      if (opt.value && allowed.indexOf(opt.value) === -1) {
        opt.parentNode.removeChild(opt);
      }
    });

    /* Remove optgroups that are now empty */
    Array.from(select.querySelectorAll('optgroup')).forEach(function (grp) {
      if (grp.querySelectorAll('option').length === 0) {
        grp.parentNode.removeChild(grp);
      }
    });

    /* If exactly one service remains, auto-select it so EA skips the step */
    var remaining = Array.from(select.querySelectorAll('option')).filter(function (o) {
      return o.value !== '';
    });
    if (remaining.length === 1) {
      select.value = remaining[0].value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  /* ── Bootstrap ── */
  /* Run immediately and after a short delay
     (EA sometimes re-renders the header via JS after page load) */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      injectBookingHeader();
      filterServicesByProvider();
      setTimeout(injectBookingHeader, 600);
    });
  } else {
    injectBookingHeader();
    filterServicesByProvider();
    setTimeout(injectBookingHeader, 600);
  }
})();
