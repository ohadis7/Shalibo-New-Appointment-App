FROM alextselegidis/easyappointments:latest

# ── Shalibo Wellness — Custom EA Image ──
# Overlays our customized files (Shalibo branding, Mongodb connector)
# on top of the standard Easy!Appointments base image.
#
# Custom assets:
#   assets/img/shalibo-logo.png + logo.png  — Shalibo logo (logo.png replaces EA default)
#   assets/img/favicon.ico                   — Shalibo favicon
#   assets/css/custom.css                    — Global brand theme
#
# Modified views (all Shalibo-branded):
#   application/views/pages/*               — Login, landing, about, logout, password reset, recovery
#   application/views/layouts/*             — Booking, account, backend, message layouts
#   application/views/components/*          — Backend/booking headers & footers
#   application/views/emails/*              — All email templates with Shalibo logo
#
# New controller:
#   application/controllers/Landing.php     — Service hub landing page
#
# New library:
#   application/libraries/Mongodb_client.php — MongoDB provider email connector
#
# PHP extensions:
#   mongodb — Required for Shalibo's MongoDB provider email connector
# ────────────────────────────────────────────────────

# Install MongoDB PHP extension for provider email connector
RUN pecl install mongodb && docker-php-ext-enable mongodb

# Install composer for the mongodb library
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

# Install the mongodb/mongodb Composer library (required by Mongodb_client.php)
# Remove phpunit dev dependency first - it requires PHP ^8.3 but base image has PHP 8.2
RUN sed -i '/"phpunit\/phpunit"/d' /var/www/html/composer.json && \
    composer require mongodb/mongodb ^2.0 --no-interaction --no-ansi

# ── Custom Assets ──
COPY ea/assets/img/shalibo-logo.png /var/www/html/assets/img/shalibo-logo.png
COPY ea/assets/img/shalibo-logo.png /var/www/html/assets/img/logo.png
COPY ea/assets/img/favicon.ico /var/www/html/assets/img/favicon.ico
COPY ea/assets/css/custom.css /var/www/html/assets/css/custom.css

# ── New Controller ──
COPY ea/application/controllers/Landing.php /var/www/html/application/controllers/Landing.php

# ── All Shalibo-branded views (overlay on top of EA originals) ──
COPY --chown=www-data:www-data ea/application/views/pages/       /var/www/html/application/views/pages/
COPY --chown=www-data:www-data ea/application/views/layouts/     /var/www/html/application/views/layouts/
COPY --chown=www-data:www-data ea/application/views/components/  /var/www/html/application/views/components/
COPY --chown=www-data:www-data ea/application/views/emails/      /var/www/html/application/views/emails/

# ── Custom Libraries ──
COPY ea/application/libraries/Mongodb_client.php /var/www/html/application/libraries/Mongodb_client.php
COPY ea/application/libraries/Availability.php /var/www/html/application/libraries/Availability.php
COPY ea/application/libraries/Email_messages.php /var/www/html/application/libraries/Email_messages.php
COPY ea/application/libraries/Google_sync.php /var/www/html/application/libraries/Google_sync.php

# ── Custom Models ──
COPY ea/application/models/Providers_model.php /var/www/html/application/models/Providers_model.php

# ── Custom JS ──
COPY ea/assets/js/pages/providers.js /var/www/html/assets/js/pages/providers.js
COPY ea/assets/js/pages/booking.js /var/www/html/assets/js/pages/booking.js

# ── Custom Language ──
COPY ea/application/language/english/translations_lang.php /var/www/html/application/language/english/translations_lang.php
COPY ea/application/language/hebrew/translations_lang.php /var/www/html/application/language/hebrew/translations_lang.php

# ── Custom Config (session fix + SMTP) ──
COPY ea/application/config/config.php /var/www/html/application/config/config.php
COPY ea/application/config/email.php /var/www/html/application/config/email.php

# ── Custom Migrations ──
COPY ea/application/migrations/070_add_date_whitelist_setting.php /var/www/html/application/migrations/070_add_date_whitelist_setting.php
COPY ea/application/migrations/071_add_service_date_restrictions.php /var/www/html/application/migrations/071_add_service_date_restrictions.php

# ── Custom Controllers ──
COPY ea/application/controllers/Services.php /var/www/html/application/controllers/Services.php
COPY ea/application/controllers/Booking.php /var/www/html/application/controllers/Booking.php
COPY ea/application/controllers/Booking_confirmation.php /var/www/html/application/controllers/Booking_confirmation.php
COPY ea/application/controllers/Google_calendar_settings.php /var/www/html/application/controllers/Google_calendar_settings.php

# ── Custom Models ──
COPY ea/application/models/Services_model.php /var/www/html/application/models/Services_model.php

# ── Custom JS ──
COPY ea/assets/js/pages/services.js /var/www/html/assets/js/pages/services.js
COPY ea/assets/js/http/booking_http_client.js /var/www/html/assets/js/http/booking_http_client.js

# ── Ownership ──
RUN chown -R www-data:www-data \
    /var/www/html/assets/img/shalibo-logo.png \
    /var/www/html/assets/img/favicon.ico \
    /var/www/html/assets/css/custom.css \
    /var/www/html/application/controllers/Landing.php \
    /var/www/html/application/controllers/Services.php \
    /var/www/html/application/controllers/Booking.php \
    /var/www/html/application/controllers/Booking_confirmation.php \
    /var/www/html/application/controllers/Google_calendar_settings.php \
    /var/www/html/application/libraries/Mongodb_client.php \
    /var/www/html/application/libraries/Availability.php \
    /var/www/html/application/libraries/Email_messages.php \
    /var/www/html/application/libraries/Google_sync.php \
    /var/www/html/application/models/Providers_model.php \
    /var/www/html/application/models/Services_model.php \
    /var/www/html/assets/js/pages/providers.js \
    /var/www/html/assets/js/pages/booking.js \
    /var/www/html/assets/js/pages/services.js \
    /var/www/html/assets/js/http/booking_http_client.js \
    /var/www/html/application/language/english/translations_lang.php \
    /var/www/html/application/language/hebrew/translations_lang.php \
    /var/www/html/application/config/config.php \
    /var/www/html/application/config/email.php \
    /var/www/html/application/migrations/070_add_date_whitelist_setting.php \
    /var/www/html/application/migrations/071_add_service_date_restrictions.php
