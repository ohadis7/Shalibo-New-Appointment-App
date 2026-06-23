/**
 * Shalibo Wellness — EA Booking Page Enhancer
 * 1. Replaces the default service/provider header with the Shalibo Wellness logo.
 * 2. Filters the service dropdown to show only services belonging to the
 *    provider specified in the URL (?provider=ID), so each provider's
 *    booking link shows only their own services.
 * 3. Filters services by a comma-separated list (?services=ID1,ID2,ID3)
 *    for shared booking links that should only show specific services.
 * Injected by Dockerfile into booking_layout.php (via assets/js/booking-inject.js)
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
        ' font-family="\\\'Cormorant Garamond\\\',\\\'Cormorant\\\',Georgia,serif"',
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

  /**
   * Helper: Hide/disable options that don't match the allowed IDs.
   * Uses option.disabled + option.style.display = 'none' instead of removeChild
   * so that EA's own JS doesn't break when options are suddenly gone.
   */
  function filterServiceOptions(allowedIds) {
    var select = document.getElementById('select-service');
    if (!select) return;

    var visibleCount = 0;

    Array.from(select.querySelectorAll('option')).forEach(function (opt) {
      if (!opt.value) return; // skip placeholder
      if (allowedIds.indexOf(String(opt.value)) !== -1) {
        // Allowed — enable and show
        opt.disabled = false;
        opt.style.display = '';
        opt.hidden = false;
        visibleCount++;
      } else {
        // Not allowed — disable and hide
        opt.disabled = true;
        opt.style.display = 'none';
        opt.hidden = true;
      }
    });

    /* Hide optgroups that have no visible options */
    Array.from(select.querySelectorAll('optgroup')).forEach(function (grp) {
      var visible = Array.from(grp.querySelectorAll('option')).filter(function (o) {
        return !o.disabled;
      });
      if (visible.length === 0) {
        grp.style.display = 'none';
      } else {
        grp.style.display = '';
      }
    });

    /* If exactly one non-placeholder option remains, auto-select it */
    var remaining = Array.from(select.querySelectorAll('option')).filter(function (o) {
      return o.value !== '' && !o.disabled;
    });
    if (remaining.length === 1) {
      select.value = remaining[0].value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    return visibleCount;
  }

  /**
   * Provider Service Filter
   * When URL contains ?provider=ID, hide all services in the dropdown
   * that don't belong to that provider.
   */
  function filterServicesByProvider() {
    var params = new URLSearchParams(window.location.search);
    var providerId = params.get('provider');
    if (!providerId) return; /* no provider param — show everything */

    var provider = null;

    /* Try EA's data factory first */
    if (typeof window.vars === 'function') {
      var allVars = window.vars();
      provider = (allVars.available_providers || []).find(function (p) {
        return String(p.id) === providerId;
      });
    }

    if (!provider || !provider.services || provider.services.length === 0) return;

    var allowed = provider.services.map(String);
    filterServiceOptions(allowed);
  }

  /**
   * Multi-Service Group Link Feature
   * When URL contains ?services=ID1,ID2,ID3, hide all services not in that list.
   * Combined with ?provider=ID — shows the intersection of both rules.
   */
  function filterServicesByList() {
    var params = new URLSearchParams(window.location.search);
    var servicesParam = params.get('services');
    if (!servicesParam) return; /* no services param — show everything */

    var allowedIds = servicesParam.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    if (allowedIds.length === 0) return;

    /* If we already have a provider filter active, intersect the allowed lists */
    var providerId = params.get('provider');
    if (providerId && typeof window.vars === 'function') {
      var allVars = window.vars();
      var provider = (allVars.available_providers || []).find(function (p) {
        return String(p.id) === providerId;
      });
      if (provider && provider.services && provider.services.length > 0) {
        var providerServices = provider.services.map(String);
        /* Intersection of both lists */
        allowedIds = allowedIds.filter(function (id) {
          return providerServices.indexOf(id) !== -1;
        });
        if (allowedIds.length === 0) return;
      }
    }

    filterServiceOptions(allowedIds);
  }

  /**
   * Combined filter — waits for EA's data to be ready, then applies all filters.
   * Uses retry polling (every 100ms, up to 20 attempts) so filter applies
   * after EA's own init settles.
   */
  function applyAllFilters(attempt) {
    attempt = attempt || 0;
    var maxAttempts = 20;

    /* Check if the select element and EA's data are ready */
    var select = document.getElementById('select-service');
    var eaReady = (typeof window.vars === 'function');
    var hasOptions = select && select.querySelectorAll('option').length > 1;

    if (!select || !eaReady || !hasOptions) {
      if (attempt < maxAttempts) {
        setTimeout(function () { applyAllFilters(attempt + 1); }, 100);
      }
      return;
    }

    /* Apply provider filter */
    filterServicesByProvider();

    /* Apply multi-service list filter */
    filterServicesByList();

    /* Re-apply on #select-service change event to survive EA re-renders */
    if (select) {
      select.removeEventListener('change', onServiceChange);
      select.addEventListener('change', onServiceChange);
    }
  }

  function onServiceChange() {
    /* Re-apply filters when the service select changes */
    filterServicesByProvider();
    filterServicesByList();
  }

  /* ── Bootstrap ── */
  function init() {
    injectBookingHeader();
    setTimeout(injectBookingHeader, 600);
    applyAllFilters();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
