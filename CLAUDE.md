# Shalibo Wellness - Easy!Appointments Custom Theme

This is the "brain" of the project. Every agent session - human-driven or scheduled -
reads this file first. Keep it accurate; a stale CLAUDE.md is worse than none.

## What this repo is

A CSS/JS overlay baked into the official Easy!Appointments Docker image.
We do NOT fork or modify EA source. We inject our own assets into EA's PHP
templates at image-build time via `sed` / `python3` in the `Dockerfile`.

| File | Purpose |
|------|---------|
| `Dockerfile` | Builds the custom EA image - injects all CSS/JS into EA templates |
| `custom.css` | Booking page theme (cream + teal brand, RTL Hebrew, calendar fixes) |
| `booking-inject.js` | Injects SW logo into booking header; filters services by `?provider=` |
| `login-override.css` | Admin login page redesign |
| `login-inject.js` | Injects SW logo into admin login page |
| `landing.html` | Standalone public booking hub at `/landing.html` |
| `build-and-push.ps1` | HUMAN ONLY - builds, pushes to ECR, redeploys ECS |
| `scripts/inject-redirect.sh` | Injects the hub redirect into the booking layout at build time |
| `scripts/booking-redirect.html` | The redirect snippet that script injects |
| `scripts/verify-injections.sh` | Asserts every Dockerfile injection actually landed |
| `tests/` | Playwright visual + smoke tests for `landing.html` |

## The injection contract - read this before touching the Dockerfile

The single most dangerous property of this repo: **every `sed` injection ends in
`|| true`**. If EA upstream renames a template or changes its markup, the `sed`
silently does nothing, the image builds green, and the site deploys unstyled.
Nobody finds out until a customer complains.

The landing-page redirect is the exception - it lives in
`scripts/inject-redirect.sh` and fails the build loudly, because a silent no-op
there sends every visitor to a bare booking wizard instead of the hub. New
injections should follow that pattern rather than the `|| true` one.

That is why `scripts/verify-injections.sh` exists and why CI runs it on every PR.
Rules:

- Never add a new injection without adding a matching assertion to
  `scripts/verify-injections.sh`.
- Never remove or weaken an assertion to make CI pass. A failing assertion means
  the injection broke - fix the injection, not the test.
- **The image has no `python3`.** Write build-time injections in POSIX sh and
  sed. Do not add a dependency on an interpreter without first proving it
  exists inside the image - an inline python injection sat in this Dockerfile
  and could never have run.
- `alextselegidis/easyappointments:latest` is an unpinned upstream tag. It can
  change under us. If verification suddenly fails with no change on our side,
  that is upstream drift - report it, do not paper over it.

## Brand and UI rules

Design tokens live in `custom.css` `:root`. Use the variables, never raw hex:

| Token | Value | Use |
|-------|-------|-----|
| `--sw-cream` | `#F0EAD6` | Page background |
| `--sw-cream-dark` | `#E5DABD` | Secondary surfaces |
| `--sw-teal` | `#5BB5B0` | Primary brand, logo, CTAs |
| `--sw-teal-dark` | `#4A9E9A` | Hover states |
| `--sw-teal-darker` | `#3D8B87` | Active / pressed |
| `--sw-text` | `#2D2D2D` | Body text |
| `--sw-text-light` | `#6B7280` | Secondary text |
| `--sw-radius` | `16px` | Card / button radius |

Standing UI rules - these are owner preferences, treat them as requirements:

- **Always show the burger menu.** Navigation must be reachable on every page and
  every viewport. Do not hide the burger behind a desktop breakpoint, and do not
  ship a page whose only navigation is off-screen on mobile.
- **Use short hyphens (`-`), never em dashes (`—`)**, in all Hebrew and English
  copy we author, in code comments, in commit messages, and in PR descriptions.
- The site is **Hebrew and RTL first.** Any layout change must be checked in RTL.
  Use logical CSS properties (`margin-inline-start`, `padding-inline-end`,
  `inset-inline-start`) rather than `left` / `right` wherever possible.
- Mobile is the primary device for booking. Check 375px width before 1440px.

## Environment and deploy

| Resource | Value |
|----------|-------|
| Region | `eu-central-1` |
| ECS Cluster | `easyappt-cluster` |
| ECS Service | `easyappt-service` |
| ECR Repo | `955395538866.dkr.ecr.eu-central-1.amazonaws.com/shalibo-backend` |
| Live URL | https://appointments.shalibowellness.com |
| Admin | https://appointments.shalibowellness.com/index.php/backend |

Provider booking links:

- GM (Personal Training) - `/index.php/booking?provider=18`
- Madanes (Nails/Hair) - `/index.php/booking?provider=37`

Secrets live in AWS SSM Parameter Store (`/easyappt/DB_PASS`, `ADMIN_PASS`,
`SMTP_PASS`, `DB_HOST`). They are never committed and never printed.

## Hard rules for every agent

These are not style suggestions. Violating any of them is a failed task.

1. **Never push to `main`.** All work goes to a branch and a pull request.
2. **Never deploy.** `build-and-push.ps1` touches a production service that real
   customers book through. Only a human runs it. Never run it, never invoke the
   AWS CLI, never push to ECR, never touch ECS.
3. **Never commit secrets**, credentials, `.env` files, or AWS keys - and never
   print the contents of SSM parameters into logs, PR bodies, or comments.
4. **Never weaken a test or an assertion to get green.** See the injection
   contract above.
5. **One issue, one branch, one PR.** Do not bundle unrelated changes.
6. **Verify before you open a PR.** Run `scripts/verify-injections.sh` against a
   freshly built image and run the Playwright tests. A PR that was never run
   locally is not ready.
7. **If you are blocked or the task is ambiguous, stop and say so.** Label the
   issue `needs-human` and explain the ambiguity. Guessing at 3am is how this
   system produces garbage. Stopping is a successful outcome.

## Local commands

```bash
# Build the image and verify every injection landed
docker build -t sw-ea:verify .
./scripts/verify-injections.sh sw-ea:verify

# Visual + smoke tests for the landing page
cd tests && npm ci && npx playwright test
```

## Known gaps - good candidates for agent work

- There is no end-to-end test against a running EA instance (needs a MySQL
  service container). Current CI verifies the build and the standalone landing
  page only.
- `landing.html` has no navigation at all, which conflicts with the standing
  "always show the burger menu" rule. The Playwright test for it is marked as a
  known gap (`test.fail()`); when the burger menu is added, remove that marker
  so the test becomes a real guard.
- No end-to-end check that the admin login redesign actually renders. The
  injection now lands, but nothing loads the page and looks at it.
