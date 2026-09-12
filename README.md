# Shalibo Wellness — Easy!Appointments Custom Theme

Custom CSS/JS overlay injected into the EA Docker image for Shalibo Wellness.

## Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Builds the custom EA image — injects all CSS/JS into booking_layout.php |
| `custom.css` | Full booking page theme (cream + teal brand, RTL Hebrew, calendar fix) |
| `booking-inject.js` | Injects SW logo into header; filters service dropdown by provider URL param |
| `login-override.css` | Admin login page redesign |
| `login-inject.js` | Injects SW logo into admin login page |
| `landing.html` | Public booking hub at /landing.html — links to each provider |
| `build-and-push.ps1` | Builds Docker image, pushes to ECR, forces ECS redeploy |
| `scripts/inject-redirect.sh` | Injects the hub redirect into the booking layout at build time |
| `scripts/booking-redirect.html` | The redirect snippet that script injects |
| `scripts/verify-injections.sh` | Asserts every Dockerfile injection actually landed |
| `tests/` | Playwright smoke and visual tests for `landing.html` |

## The injection contract - read this before touching the Dockerfile

The most dangerous property of this repo: **every `sed` injection ends in
`|| true`**. If Easy!Appointments upstream renames a template or changes its
markup, the `sed` silently does nothing, the image builds green, and the site
deploys unstyled. Nobody finds out until a customer complains.

That is not hypothetical. Three injections were broken here at once, and every
build was green throughout:

- the landing redirect ran through an inline `python3`, and **the image has no
  python interpreter** - it could never have executed, not once
- the admin login CSS and JS targeted `views/user/login.php`, a path that does
  not exist in the image
- retargeting them at `views/pages/login.php` still did nothing, because that
  file is a partial with no `<head>`; the tags live in
  `views/layouts/account_layout.php`

`scripts/verify-injections.sh` exists because of that, and CI runs it on every
pull request. It opens the built image and asserts each injection actually
landed, printing which templates own `</head>` when one fails.

Rules that follow:

- Never add an injection without adding a matching assertion to
  `scripts/verify-injections.sh`.
- Never remove or weaken an assertion to make CI pass. A failing assertion means
  the injection broke - fix the injection.
- **Write build-time injections in POSIX sh and sed.** There is no `python3` in
  the image. Do not add a dependency on an interpreter without first proving it
  exists inside it.
- `alextselegidis/easyappointments:latest` is unpinned and can change under us.
  If verification fails with no change on our side, that is upstream drift -
  report it, do not paper over it.

The landing redirect is the one exception to `|| true`: it lives in
`scripts/inject-redirect.sh` and fails the build loudly, because a silent no-op
there sends every visitor to a bare booking wizard instead of the hub.

## Brand tokens

Design tokens live in `custom.css` `:root`. Use the variables, never raw hex.

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

The site is Hebrew and RTL first - check any layout change in RTL, and prefer
logical properties (`margin-inline-start`, `inset-inline-end`) over `left` and
`right`. Mobile is the primary booking device: check 375px before 1440px.

## Checks

```bash
# Build the image and verify every injection landed
docker build -t sw-ea:verify .
./scripts/verify-injections.sh sw-ea:verify

# Smoke and visual tests for the booking hub
cd tests && npm ci && npx playwright test
```

CI runs all of it on every pull request and uploads screenshots of the hub at
mobile, tablet and desktop widths, so a change can be judged from a picture
rather than a CSS diff.

## Known gaps

- No end-to-end test against a running Easy!Appointments instance - that needs a
  MySQL service container. CI verifies the build and the standalone hub only.
- Nothing loads the admin login page and looks at it. The injection now lands,
  but the rendering is unverified.
- `landing.html` has no navigation at all. The Playwright test for it is marked
  as a known gap (`test.fail()`); when a burger menu is added, remove that
  marker so the test becomes a real guard.

## Deploy

### Prerequisites
- Docker Desktop running
- AWS CLI configured (profile: `shalibo-eb-manage`)
- WSL updated: `wsl --update`

### Run deploy
```powershell
cd C:\path\to\shalibo-ea-custom
.\build-and-push.ps1
```

## AWS Infrastructure

| Resource | Value |
|----------|-------|
| Region | eu-central-1 |
| ECS Cluster | easyappt-cluster |
| ECS Service | easyappt-service |
| ECR Repo | 955395538866.dkr.ecr.eu-central-1.amazonaws.com/shalibo-backend |
| App URL | https://appointments.shalibowellness.com |

## Credentials
Stored in AWS SSM Parameter Store:
- `/easyappt/DB_PASS`
- `/easyappt/ADMIN_PASS`
- `/easyappt/SMTP_PASS`
- `/easyappt/DB_HOST`

Full credentials shared separately via secure channel (NOT committed to repo).

## Provider Booking Links

| Provider | URL |
|----------|-----|
| GM (Personal Training) | https://appointments.shalibowellness.com/index.php/booking?provider=18 |
| Madanes (Nails/Hair) | https://appointments.shalibowellness.com/index.php/booking?provider=37 |

## EA Admin
https://appointments.shalibowellness.com/index.php/backend
