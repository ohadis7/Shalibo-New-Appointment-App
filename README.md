# Shalibo Wellness — Appointment Booking App

A custom-branded appointment scheduling system built on top of
[Easy!Appointments](https://easyappointments.org/), with a Shalibo Wellness
branded landing page, custom booking flow, MongoDB-backed shared provider
emails, and Resend-powered transactional emails.

**Production URL:** https://appointments.shalibowellness.com

---

## Table of Contents

- [Quick Start (for noobs)](#quick-start-for-noobs)
- [Local Development (step by step)](#local-development)
- [Project Architecture](#project-architecture)
- [Configuration Reference](#configuration-reference)
- [Data Migration](#data-migration)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)
- [Cheat Sheet](#cheat-sheet)

---

## Port Configuration (Why port 80?)

The app runs on **port 80** by default. You might have seen port 8888 in earlier versions — that was from a different docker-compose setup before we standardized.

The port is fully configurable via the `.env` file:

```bash
# In ea/.env — change the port if 80 is already in use on your machine:
NGINX_PORT=8080
```

After changing, restart:
```bash
docker compose down && docker compose up -d
```
All URLs will use the new port (e.g. `http://localhost:8080/index.php/landing`).

---

## Quick Start (for noobs)

> **Prerequisites:** You need **Docker Desktop** installed and running. That's it.

> 💡 **All local development commands run from the `ea/` subdirectory.**
> The root `Shalibo-New-Appointment-App/Dockerfile` is only used for **production ECR builds** (via `deploy.sh`).
> For local dev, the `ea/docker-compose.yml` and `ea/start-local.sh` are what you need.

```bash
# 1. Clone the repo (if you haven't already)
git clone <repo-url>

# 2. Go into the EA app directory (all local commands run from here)
cd Shalibo-New-Appointment-App/ea

# 3. Make scripts executable (needed on first clone)
chmod +x start-local.sh setup-data.sh

# 4. Create your .env file from the template
cp .env.example .env

# 5. Open .env and fill in your secrets:
#    - SMTP_PASS: get from https://resend.com
#    - MONGODB_URI: get from MongoDB Atlas

# 6. Start everything
./start-local.sh

# 7. Run data setup (one time only)
./setup-data.sh
```

**That's it!** Open http://localhost/index.php/landing in your browser.

### What you'll see

> 💡 All these URLs are accessed from your browser at `localhost` on the default port 80.
> If you changed `NGINX_PORT` in `.env`, use that port instead (e.g. `http://localhost:8080`).

| Page | URL | Description |
|------|-----|-------------|
| **Landing page** | http://localhost/index.php/landing | Service hub with Shalibo branding |
| **Booking page** | http://localhost/index.php/booking | Book appointments with providers |
| **Login page** | http://localhost/index.php/login | Admin/Provider login |
| **Admin panel** | http://localhost/index.php/backend | Manage everything |
| **phpMyAdmin** | http://localhost:8080 | MySQL database UI |
| **Mailpit** | http://localhost:8025 | Catch all emails (dev only) |

### Default admin credentials

| Username | Password | Notes |
|----------|----------|-------|
| `shalibo` | `test1234` | Full admin access |
| `developer@shalibowellness.com` | Ask a teammate | For password reset testing |

---

## Local Development

### 1. Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (must be running)
- `bash` (macOS/Linux — if you're on Windows, use WSL2 or Git Bash)
- `curl` (usually pre-installed on macOS/Linux)

### 2. Clone & setup

```bash
git clone <repo-url>
cd Shalibo-New-Appointment-App/ea
cp .env.example .env
```

### 3. Configure .env

Open `ea/.env` and fill in these values:

```bash
# Required for password reset emails
SMTP_PASS=re_xxxxxxxxxxxxxxx        # Get from https://resend.com/api-keys

# Required for shared provider emails (Task 2)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db?retryWrites=true&w=majority
MONGODB_DATABASE=your_database_name
```

**Ports** section — change only if you have conflicts (e.g., you already run something on port 80):

```bash
NGINX_PORT=80           # Change to 8080 if port 80 is taken
MYSQL_PORT=3306         # Change to 3307 if port 3306 is taken
```

### 4. Start the app

```bash
./start-local.sh
```

This will:
1. Check Docker is running
2. Create `.env` if missing (from `.env.example`)
3. Run `docker compose up -d` to start all services
4. Wait 5 seconds
5. Verify the app is responding

**First time?** This builds the custom Docker image, which takes 1–3 minutes.

### 5. Run data setup (one time only)

```bash
./setup-data.sh
```

This seeds:
- Nails Tech → linked to moon test manicure provider
- GM → Sun-Thu 09:00–20:00 working plan
- Madanes → Sun-Thu 09:00–20:00 working plan
- MongoDB → email mapping for `nuna@shalibowellness.com`

### 6. Verify it works

```bash
# Check the landing page
curl -I http://localhost/index.php/landing

# Check a booking page (GM Personal Training)
curl -I 'http://localhost/index.php/booking?service=24&provider=18'

# Check Nails Tech booking
curl -I 'http://localhost/index.php/booking?service=18&provider=58'

# Open in browser
open http://localhost/index.php/landing
```

### 7. Common dev tasks

```bash
# View logs
docker compose logs -f php-fpm
docker compose logs -f nginx

# Rebuild after code changes
docker compose up -d --build php-fpm

# Bash into the PHP container
docker exec -it ea-php-fpm-1 bash

# Run MySQL queries
docker exec -it ea-mysql-1 mysql -u root --password=secret easyappointments

# Access phpMyAdmin
open http://localhost:8080

# View emails (password reset, etc.)
open http://localhost:8025

# Stop everything
docker compose down

# Stop and delete all data (fresh start)
docker compose down -v
```

---

## Project Architecture

```
Shalibo-New-Appointment-App/
├── Dockerfile              # Custom image: base EA + Shalibo overlays
├── deploy.sh               # Prod deploy script (AWS ECS)
├── build-and-push.ps1      # PowerShell deploy script (Windows)
│
├── ea/                     # 👈 THE APP (Easy!Appointments source)
│   ├── config.php          # Active config (DB creds, MongoDB URI)
│   ├── config-sample.php   # Template for fresh installs
│   ├── docker-compose.yml  # Local environment definition
│   ├── .env.example        # Template with placeholder values
│   ├── .gitignore           # Prevents .env secrets from being committed
│   │
│   ├── start-local.sh      # 🚀 One-command launcher
│   ├── setup-data.sh       # 📦 One-time data seeder
│   │
│   ├── application/
│   │   ├── controllers/
│   │   │   └── Landing.php        # 🆕 Shalibo landing page
│   │   ├── models/
│   │   │   └── Providers_model.php # 🆕 MongoDB connector for shared emails
│   │   ├── libraries/
│   │   │   └── Mongodb_client.php  # 🆕 MongoDB client library
│   │   ├── views/
│   │   │   ├── pages/
│   │   │   │   ├── landing.php     # 🆕 Shalibo-branded landing page
│   │   │   │   ├── login.php       # 🆕 Shalibo-styled login
│   │   │   │   └── installation.php # 🆕 Shalibo-branded installer
│   │   │   ├── layouts/
│   │   │   │   └── booking_layout.php # 🆕 Redirect to landing, custom CSS
│   │   │   └── components/
│   │   │       └── booking_footer.php # 🆕 Shalibo footer
│   │   └── language/english/
│   │       └── translations_lang.php # 🆕 No EA branding references
│   │
│   └── assets/
│       ├── img/
│       │   ├── shalibo-logo.png  # 🆕 Shalibo brand logo
│       │   └── favicon.ico       # 🆕 Shalibo favicon
│       ├── css/
│       │   └── custom.css        # 🆕 Shalibo brand styles
│       └── js/
│           ├── booking-inject.js # 🆕 Booking page enhancer
│           └── login-inject.js   # 🆕 Login page enhancer
│   │
│   └── docker/               # Docker configs (nginx, PHP)
│       ├── mysql/             # MySQL data (gitignored)
│       ├── php-fpm/
│       │   └── Dockerfile     # PHP-FPM with mongodb extension
│       └── nginx/
│           └── nginx.conf
│
└── backend/                  # Shalibo Node.js backend (separate app)
```

### Custom files (what we added to EA)

| File | Purpose |
|------|---------|
| `Landing.php` + `landing.php` | Shalibo-branded service hub (replaces old landing.html) |
| `Mongodb_client.php` | Connect to MongoDB Atlas for shared provider email mapping |
| `Providers_model.php` (modified) | Allow duplicate emails if MongoDB has a mapping |
| `shalibo-logo.png` | Custom logo displayed on booking, landing, login pages |
| `custom.css` | Teal/cream Shalibo brand colors |
| `booking-inject.js` | Custom booking page enhancers (logo, provider filter) |
| `login-inject.js` | Custom login page UI enhancer |
| `config.php` | DB credentials, MongoDB URI, Resend SMTP |

---

## Configuration Reference

### `.env` (local only, gitignored)

| Variable | Default | Description |
|----------|---------|-------------|
| `NGINX_PORT` | `80` | Local web server port |
| `MYSQL_PORT` | `3306` | Local MySQL port |
| `PHPMYADMIN_PORT` | `8080` | phpMyAdmin web UI |
| `MAILPIT_HTTP_PORT` | `8025` | Mailpit web UI (catch emails in dev) |
| `SMTP_HOST` | `smtp.resend.com` | Transactional email provider |
| `SMTP_PORT` | `587` | SMTP port (TLS) |
| `SMTP_USER` | `resend` | SMTP username |
| `SMTP_PASS` | *(your key)* | Resend API key |
| `MONGODB_URI` | *(your URI)* | MongoDB Atlas connection string |
| `MONGODB_DATABASE` | *(your DB)* | MongoDB database name |

### `config.php` (inside container, not in git)

This file lives at `/var/www/html/config.php` inside the container. In production, it's configured via AWS SSM Parameter Store. In local dev, it gets created by the EA setup wizard or a `docker cp` command.

Key constants:

```php
Config::DB_HOST        // MySQL host (ea-mysql-1 in Docker)
Config::DB_NAME        // easyappointments
Config::DB_USERNAME    // root
Config::DB_PASSWORD    // secret
Config::MONGODB_URI    // MongoDB Atlas connection string
Config::MONGODB_DATABASE // MongoDB database name
```

### `email.php` (SMTP config)

Located at `/var/www/html/application/config/email.php` inside the container.

| Setting | Value |
|----------|-------|
| Protocol | `smtp` |
| SMTP Host | `smtp.resend.com` |
| SMTP Port | `587` |
| SMTP User | `resend` |
| SMTP Pass | Resend API key |
| SMTP Crypto | `tls` |
| Mail Type | `html` |
| From Name | `Shalibo Wellness` |

---

## Data Migration

### What `setup-data.sh` does

Run this once after starting the app for the first time (from the `ea/` directory):

```bash
./setup-data.sh
```

This script:

1. **Links Nails Tech (service ID 18) → moon test manicure (provider)**  
   *Why:* Nails Tech had no provider assigned, so it didn't show in the calendar.

2. **Sets GM's working plan → Sun-Thu 09:00–20:00**  
   *Why:* GM's plan was NULL, so no availability showed in the calendar.

3. **Sets Madanes' working plan → Sun-Thu 09:00–20:00**  
   *Why:* Madanes only had Wed 14:00–17:00 availability.

4. **Seeds MongoDB mapping for `nuna@shalibowellness.com`**  
   *Why:* Allows multiple providers to share this email (Nuna manages all providers).

### To reset and re-seed

```bash
# Already inside the ea/ directory
docker compose down -v    # Delete all data
docker compose up -d       # Fresh start
./setup-data.sh            # Re-seed
```

---

## Production Deployment

> 📍 **Where to run deploy commands:** Unlike local dev (which runs from `ea/`),
> the deploy script lives at the project **root**: `Shalibo-New-Appointment-App/deploy.sh`.

### Which Dockerfile is used where?

| File | Used By | Purpose |
|------|---------|---------|
| `Dockerfile` (root) | `./deploy.sh` (prod) | Merges EA base + custom files into a single image for ECR/ECS |
| `ea/docker/php-fpm/Dockerfile` | `docker compose` (local) | Extends PHP-FPM with mongodb extension for local dev (source is volume-mounted) |

In **local dev**, the `ea/docker-compose.yml` mounts the entire `ea/` directory as a volume, so code changes take effect instantly — no rebuild needed.

In **production**, the root `Dockerfile` copies all custom files into the image so they survive deployment to ECS.

### Infrastructure

- **Hosting:** AWS ECS (Fargate)
- **Cluster:** `easyappt-cluster`
- **Service:** `easyappt-service`
- **Region:** `eu-central-1` (Frankfurt)
- **Registry:** Amazon ECR (`955395538866.dkr.ecr.eu-central-1.amazonaws.com/shalibo-ea-custom`)
- **App URL:** https://appointments.shalibowellness.com

### Deploy flow

```bash
# Prerequisites
# - Docker Desktop running
# - AWS CLI with 'shalibo-eb-manage' profile configured
# - jq installed

# Deploy (build, push, update ECS)
./deploy.sh
```

The `deploy.sh` script does:
1. Authenticates Docker to ECR
2. Builds a `linux/amd64` image via Docker buildx
3. Tags and pushes to ECR
4. Fetches current ECS task definition
5. Updates container image + health check
6. Registers new task definition
7. Updates ECS service to use the new definition

### Monitor rollout

```bash
aws ecs describe-services \
  --cluster easyappt-cluster \
  --services easyappt-service \
  --region eu-central-1 \
  --profile shalibo-eb-manage
```

### Rolling back

```bash
# Find the previous task definition revision
aws ecs describe-task-definition \
  --task-definition easyappt:REVISION_NUMBER \
  --region eu-central-1 \
  --profile shalibo-eb-manage

# Update service to use it
aws ecs update-service \
  --cluster easyappt-cluster \
  --service easyappt-service \
  --task-definition easyappt:REVISION_NUMBER \
  --region eu-central-1 \
  --profile shalibo-eb-manage
```

### Production secrets

Secrets (DB password, SMTP password, admin password, MongoDB URI) are NOT in the repo.
They're stored in **AWS SSM Parameter Store** and injected into the ECS task definition.

| SSM Parameter Name | Description |
|-------------------|-------------|
| `/easyappt/DB_PASSWORD` | MySQL database password |
| `/easyappt/DB_HOST` | MySQL host (RDS endpoint) |
| `/easyappt/SMTP_PASS` | Resend API key |
| `/easyappt/ADMIN_EMAIL` | Admin login email |
| `/easyappt/MONGODB_URI` | MongoDB Atlas connection string |

To update a secret:

```bash
aws ssm put-parameter \
  --name "/easyappt/SMTP_PASS" \
  --value "new_resend_key_here" \
  --type SecureString \
  --overwrite \
  --region eu-central-1 \
  --profile shalibo-eb-manage

# Then redeploy
./deploy.sh
```

### build-and-push.ps1 (Windows alternative)

The `build-and-push.ps1` script at the project root is a PowerShell alternative to `deploy.sh`.
It performs the same steps (ECR auth → build → tag → push) but **does not** update the ECS service automatically.
After running it, you must manually trigger the ECS service update in the AWS Console.

This script is deprecated — use `./deploy.sh` instead.

---

## Troubleshooting

### "Landing page returns 404"

```bash
# Check if the Landing controller exists in the container
docker exec -it ea-php-fpm-1 ls -la /var/www/html/application/controllers/Landing.php

# If missing, copy it (run from the ea/ directory)
docker cp application/controllers/Landing.php ea-php-fpm-1:/var/www/html/application/controllers/
```

### "Service doesn't show in the calendar"

```bash
# Check service-provider links
docker exec -it ea-mysql-1 mysql -u root --password=secret easyappointments \
  -e "SELECT s.name, u.first_name, u.last_name FROM ea_services_providers sp JOIN ea_services s ON sp.id_services = s.id JOIN ea_users u ON sp.id_users = u.id;"

# Check provider working plan
docker exec -it ea-mysql-1 mysql -u root --password=secret easyappointments \
  -e "SELECT u.first_name, LEFT(up.working_plan, 200) AS plan FROM ea_user_settings up JOIN ea_users u ON up.id_users = u.id WHERE up.working_plan IS NULL;"
```

### "Password reset email doesn't arrive"

```bash
# Check SMTP config in the container
docker exec -it ea-php-fpm-1 cat /var/www/html/application/config/email.php

# Check Mailpit (local dev — real emails are intercepted here)
open http://localhost:8025
```

### "MongoDB connector not working (shared emails)"

```bash
# Check the extension is installed
docker exec -it ea-php-fpm-1 php -m | grep mongo

# Check the library is installed
docker exec -it ea-php-fpm-1 ls /var/www/html/vendor/mongodb/mongodb/src/Client.php

# Check config constants
docker exec -it ea-php-fpm-1 php -r '
require_once "/var/www/html/config.php";
$r = new ReflectionClass("Config");
echo "MONGODB_URI: " . ($r->hasConstant("MONGODB_URI") ? "OK" : "MISSING") . "\n";
'
```

### "Port 80 already in use"

Edit `ea/.env` and change:
```
NGINX_PORT=8080
```
Then restart: `docker compose down && docker compose up -d`

The app will be available at http://localhost:8080.

### "Docker build fails"

```bash
# Rebuild without cache
docker compose build --no-cache php-fpm

# Check Docker Desktop is running and has enough resources
# (minimum: 4GB RAM, 2 CPUs)
```

### "Can't log in"

```bash
# Check password hash
docker exec -it ea-mysql-1 mysql -u root --password=secret easyappointments \
  -e "SELECT us.id_users, u.email, LEFT(us.password, 80) AS pw FROM ea_user_settings us JOIN ea_users u ON u.id = us.id_users WHERE us.username = 'shalibo';"

# Reset password directly in DB (bcrypt hash for 'test1234')
docker exec -it ea-mysql-1 mysql -u root --password=secret easyappointments \
  -e "UPDATE ea_user_settings SET password = '\$2y\$12\$Bo5BwX5sdjWBdndS6EmnYOugXJH6g3tQ5eVSAR0ldnaZRlT5bNdui' WHERE id_users = 1;"
```

---

## Cheat Sheet

```bash
# ── START ──
cd Shalibo-New-Appointment-App/ea
./start-local.sh
./setup-data.sh

# ── STOP ──
docker compose down

# ── RESTART ──
docker compose restart php-fpm

# ── REBUILD ──
docker compose up -d --build php-fpm

# ── LOGS ──
docker compose logs -f php-fpm
docker compose logs -f nginx

# ── BASH INTO CONTAINER ──
docker exec -it ea-php-fpm-1 bash

# ── MYSQL ──
docker exec -it ea-mysql-1 mysql -u root --password=secret easyappointments

# ── COPY FILES TO CONTAINER ──
docker cp ea/application/controllers/Landing.php ea-php-fpm-1:/var/www/html/application/controllers/

# ── VIEW EMAILS (password reset, etc.) ──
open http://localhost:8025

# ── DEPLOY TO PROD ──
./deploy.sh

# ── FRESH START (DELETE ALL DATA) ──
docker compose down -v
docker compose up -d
./setup-data.sh
```

---

## Verification Checklist

After starting the app, run through this checklist to confirm everything works:

| # | Check | How | Expected |
|---|-------|-----|----------|
| 1 | **Landing page loads** | `curl -I http://localhost/index.php/landing` | HTTP 200 |
| 2 | **Booking page loads** | `curl -I http://localhost/index.php/booking` | HTTP 200 |
| 3 | **Login page loads** | `curl -I http://localhost/index.php/login` | HTTP 200 |
| 4 | **Password reset page loads** | `curl -I http://localhost/index.php/recovery` | HTTP 200 |
| 5 | **Shalibo branding present** | `curl -s http://localhost/index.php/landing \| grep -c 'shalibo-logo.png'` | >= 1 |
| 6 | **No EA branding in translations** | `docker exec ea-php-fpm-1 grep -c 'Easy!Appointments' /var/www/html/application/language/english/translations_lang.php` | 0 |
| 7 | **GM working plan is set** | `docker exec ea-mysql-1 mysql -u root --password=secret easyappointments -e "SELECT CASE WHEN working_plan IS NULL THEN 'NULL' ELSE 'OK' END FROM ea_user_settings WHERE id_users = 18;"` | OK |
| 8 | **Nails Tech linked to provider** | `docker exec ea-mysql-1 mysql -u root --password=secret easyappointments -e "SELECT COUNT(*) FROM ea_services_providers WHERE id_services = 18;"` | >= 1 |
| 9 | **phpMyAdmin accessible** | `curl -I http://localhost:8080` | HTTP 200 or 302 |
| 10 | **Mailpit accessible** | `curl -I http://localhost:8025` | HTTP 200 |
| 11 | **Password reset sends email** | Request password reset at /recovery, check DB token | Token generated in `ea_user_settings.password_reset_token` |

## Key URLs

| Environment | URL |
|-------------|-----|
| Local — Landing page | http://localhost/index.php/landing |
| Local — Booking page | http://localhost/index.php/booking |
| Local — Admin login | http://localhost/index.php/login |
| Local — Admin panel | http://localhost/index.php/backend |
| Local — phpMyAdmin | http://localhost:8080 |
| Local — Mailpit | http://localhost:8025 |
| Production | https://appointments.shalibowellness.com |
