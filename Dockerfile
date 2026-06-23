FROM alextselegidis/easyappointments:latest

# ── Shalibo Wellness — Custom EA Image ──
# Clean build: only copies the specific files we customized.
# The base image provides all EA source files; we just overlay our changes.
# No sed/php runtime injections — all edits are in the actual source files.
#
# Custom assets:
#   assets/css/custom.css         — Booking page theme
#   assets/css/login-override.css — Admin login page redesign
#   assets/js/booking-inject.js   — Logo injection + provider filter + multi-service filter
#   assets/js/login-inject.js     — Login page UI enhancer
#   landing.html                  — Service hub landing page
#
# View edits:
#   application/views/layouts/booking_layout.php  — Added CSS/JS includes + redirect script
#   application/views/pages/login.php              — Added CSS/JS includes
# ────────────────────────────────────────────────────

# Copy custom assets (new files added alongside EA's existing assets)
COPY ea/assets/css/custom.css         /var/www/html/assets/css/custom.css
COPY ea/assets/css/login-override.css /var/www/html/assets/css/login-override.css
COPY ea/assets/js/booking-inject.js   /var/www/html/assets/js/booking-inject.js
COPY ea/assets/js/login-inject.js     /var/www/html/assets/js/login-inject.js
COPY ea/landing.html                  /var/www/html/landing.html

# Copy modified view files (overlay on top of EA's originals)
COPY ea/application/views/layouts/booking_layout.php /var/www/html/application/views/layouts/booking_layout.php
COPY ea/application/views/pages/login.php             /var/www/html/application/views/pages/login.php

# Set correct ownership
RUN chown -R www-data:www-data /var/www/html/assets/css/custom.css \
    /var/www/html/assets/css/login-override.css \
    /var/www/html/assets/js/booking-inject.js \
    /var/www/html/assets/js/login-inject.js \
    /var/www/html/landing.html
