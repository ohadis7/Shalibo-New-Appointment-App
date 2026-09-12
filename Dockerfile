FROM alextselegidis/easyappointments:latest

# ── 1. Booking wizard — brand CSS + header logo injection ───────
COPY custom.css        /var/www/html/assets/css/custom.css
COPY booking-inject.js /var/www/html/assets/js/booking-inject.js

# ── Redirect root booking page to landing.html when no ?service/?provider ──
# Runs inline in <head>, before any rendering. If neither "service" nor
# "provider" is in the query-string the visitor goes straight to the hub.
#
# This is a script file rather than an inline `RUN python3 -c "..."`: Docker
# reads every line of a RUN as a new instruction unless it is continued, so the
# previous multi-line form failed to parse and broke `docker build` entirely.
# It is POSIX sh because this image has no python3 at all - the old inline
# python injection could never have run, even once.
COPY scripts/inject-redirect.sh   /tmp/inject-redirect.sh
COPY scripts/booking-redirect.html /tmp/booking-redirect.html
RUN sh /tmp/inject-redirect.sh && rm -f /tmp/inject-redirect.sh /tmp/booking-redirect.html

# Inject CSS into booking page <head>
RUN sed -i 's|</head>|<link rel="stylesheet" href="/assets/css/custom.css">\n</head>|g' \
    /var/www/html/application/views/layouts/booking_layout.php || true

# Inject JS at bottom of booking page <body>
# — replaces service name in header with Shalibo Wellness logo
RUN sed -i 's|</body>|<script src="/assets/js/booking-inject.js"></script>\n</body>|g' \
    /var/www/html/application/views/layouts/booking_layout.php || true

# ── 2. Admin login page — beautiful redesign ────────────────────
# These go into views/layouts/account_layout.php, not views/pages/login.php.
# login.php is a CodeIgniter partial with no <head> or <body> of its own - the
# tags live in the layout that wraps it. The original path, views/user/login.php,
# does not exist in this image at all. Both earlier targets meant these two
# injections silently did nothing, because the seds end in `|| true`.
# The layout also wraps the other account pages, so the branding applies there.
COPY login-override.css /var/www/html/assets/css/login-override.css
COPY login-inject.js    /var/www/html/assets/js/login-inject.js

# Inject CSS into the admin login page head
RUN sed -i 's|</head>|<link rel="stylesheet" href="/assets/css/login-override.css">\n</head>|g' \
    /var/www/html/application/views/layouts/account_layout.php || true

# Inject JS at bottom of admin login page body
RUN sed -i 's|</body>|<script src="/assets/js/login-inject.js"></script>\n</body>|g' \
    /var/www/html/application/views/layouts/account_layout.php || true

# ── 3. Booking hub landing page ─────────────────────────────────
# Accessible at: https://booking.shalibowellness.com/landing.html
# Share this URL as the main entry point for all clients.
# Each service card links to its dedicated ?service=ID&provider=ID URL.
COPY landing.html /var/www/html/landing.html

