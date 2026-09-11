// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Smoke + visual tests for the public booking hub (`landing.html`).
 *
 * This page is the entry point every customer hits, and it is the only part of
 * the site that can be tested without booting a full Easy!Appointments stack.
 * Keep these assertions behavioural - "a customer can find and click a booking
 * link" - rather than pixel-exact, so they do not fight normal design work.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/landing.html', { waitUntil: 'networkidle' });
});

test('page loads with its title and heading', async ({ page }) => {
  await expect(page).toHaveTitle(/Shalibo Wellness/i);
  await expect(page.locator('h1.page-title')).toBeVisible();
});

test('the brand logo renders', async ({ page }) => {
  const logo = page.locator('.logo-wrap svg').first();
  await expect(logo).toBeVisible();

  // The logo is inline SVG - if it collapsed to zero size the page looks broken
  // but nothing throws, so assert real dimensions.
  const box = await logo.boundingBox();
  expect(box, 'logo has no layout box').not.toBeNull();
  expect(box.width).toBeGreaterThan(40);
  expect(box.height).toBeGreaterThan(40);
});

test('at least one bookable service links into the EA booking wizard', async ({ page }) => {
  const bookable = page.locator('a.service-card[href*="booking"]');
  await expect(bookable.first()).toBeVisible();

  const count = await bookable.count();
  expect(count, 'no bookable service cards on the hub').toBeGreaterThan(0);

  // Every booking link must carry a provider id, otherwise the Dockerfile's
  // redirect script bounces the visitor straight back to this page - an
  // infinite loop the customer experiences as a dead link.
  for (let i = 0; i < count; i++) {
    const href = await bookable.nth(i).getAttribute('href');
    expect(href, `booking link ${i} has no ?provider=`).toMatch(/[?&]provider=\d+/);
  }
});

test('disabled services are not clickable links', async ({ page }) => {
  // "Coming Soon" cards must not be anchors - a customer clicking one would
  // land in a booking flow for a service that cannot be booked.
  const disabledAnchors = page.locator('a.service-card.disabled');
  await expect(disabledAnchors).toHaveCount(0);
});

test('no horizontal overflow', async ({ page }, testInfo) => {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
  });

  // A couple of pixels of rounding slack; anything more is a real layout break.
  expect(
    overflow.scrollWidth,
    `page scrolls sideways at ${testInfo.project.name} width`
  ).toBeLessThanOrEqual(overflow.clientWidth + 2);
});

test('primary navigation is reachable', async ({ page }) => {
  // Standing owner rule: the burger menu is always shown, on every viewport.
  // `landing.html` currently has no navigation at all, so this is marked as a
  // known gap: the test runs and is expected to fail, which keeps CI green
  // while the requirement stays visible and executable. When the burger menu
  // is added this test starts reporting "expected to fail but passed" - at
  // that point delete the `test.fail()` line below and it becomes a real guard.
  test.fail();

  const nav = page.locator(
    '[data-nav-toggle], .burger, .hamburger, button[aria-label*="menu" i], nav'
  );
  await expect(nav.first(), 'landing.html has no navigation / burger menu').toBeVisible();
});

test('full page screenshot for human review', async ({ page }, testInfo) => {
  const shot = await page.screenshot({ fullPage: true });
  await testInfo.attach(`landing-${testInfo.project.name}.png`, {
    body: shot,
    contentType: 'image/png',
  });
});
