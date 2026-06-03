FROM alextselegidis/easyappointments:latest

# ── 1. Booking wizard — brand CSS + header logo injection ───────
COPY custom.css        /var/www/html/assets/css/custom.css
COPY booking-inject.js /var/www/html/assets/js/booking-inject.js

# ── Redirect root booking page to landing.html when no ?service/?provider ──
# Inject INLINE script early in <head> — runs before any rendering.
# If neither "service" nor "provider" is in the URL query-string, the visitor
# is sent to the hub landing page (/landing.html) immediately.
RUN python3 -c "
f = '/var/www/html/application/views/layouts/booking_layout.php'
c = open(f).read()
script = '<script>(function(){var p=new URLSearchParams(location.search);if(!p.get(\"service\")&&!p.get(\"provider\")){location.replace(\"/landing.html\");}})();</script>'
c = c.replace('<head>', '<head>' + script, 1)
open(f,'w').write(c)
" || true

# Inject CSS into booking page <head>
RUN sed -i 's|</head>|<link rel="stylesheet" href="/assets/css/custom.css">\n</head>|g' \
    /var/www/html/application/views/layouts/booking_layout.php || true

# Inject JS at bottom of booking page <body>
# — replaces service name in header with Shalibo Wellness logo
RUN sed -i 's|</body>|<script src="/assets/js/booking-inject.js"></script>\n</body>|g' \
    /var/www/html/application/views/layouts/booking_layout.php || true

# ── 2. Admin login page — beautiful redesign ────────────────────
COPY login-override.css /var/www/html/assets/css/login-override.css
COPY login-inject.js    /var/www/html/assets/js/login-inject.js

# Inject CSS into the admin login page head
RUN sed -i 's|</head>|<link rel="stylesheet" href="/assets/css/login-override.css">\n</head>|g' \
    /var/www/html/application/views/user/login.php || true

# Inject JS at bottom of admin login page body
RUN sed -i 's|</body>|<script src="/assets/js/login-inject.js"></script>\n</body>|g' \
    /var/www/html/application/views/user/login.php || true

# ── 3. Booking hub landing page ─────────────────────────────────
# Accessible at: https://booking.shalibowellness.com/landing.html
# Share this URL as the main entry point for all clients.
# Each service card links to its dedicated ?service=ID&provider=ID URL.
COPY landing.html /var/www/html/landing.html

# ── Debug: list login template location ─────────────────────────
RUN find /var/www/html -name "login.php" 2>/dev/null
