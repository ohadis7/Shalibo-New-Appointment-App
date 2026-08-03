#!/usr/bin/env bash
# ── Shalibo Wellness — Local Dev Quick-Start ─────────────
# Usage:
#   chmod +x start-local.sh
#   ./start-local.sh
#
# Prerequisites:
#   - Docker Desktop running
#   - AWS CLI configured (for prod DB pull, optional)
# ──────────────────────────────────────────────────────────
set -euo pipefail

# Script lives in the ea/ directory; all paths are relative to here
EA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$EA_DIR/docker-compose.yml"
ENV_FILE="$EA_DIR/.env"

echo "╔════════════════════════════════════════════════╗"
echo "║   Shalibo Wellness — EA Local Dev Env         ║"
echo "╚════════════════════════════════════════════════╝"

# ── 1. Check prerequisites ──
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# ── 2. Create .env from sample if missing ──
if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$EA_DIR/.env.example" ]; then
        echo "📝 Creating .env from .env.example..."
        cp "$EA_DIR/.env.example" "$ENV_FILE"
        echo "⚠️  Edit $ENV_FILE and fill in your secrets (SMTP_PASS, MONGODB_URI)."
    else
        echo "⚠️  No .env found. Creating minimal one..."
        cat > "$ENV_FILE" << 'EOF'
NGINX_PORT=80
MYSQL_PORT=3306
PHPMYADMIN_PORT=8080
MAILPIT_HTTP_PORT=8025
MAILPIT_SMTP_PORT=1025
EOF
        echo "⚠️  Edit $ENV_FILE and add SMTP_PASS + MONGODB_URI for full functionality."
    fi
fi

# ── 3. Copy config.php if using MongoDB connector ──
if grep -q "MONGODB_URI" "$ENV_FILE" 2>/dev/null; then
    echo "🔌 MongoDB connector configured in .env"
fi

# ── 4. Start services ──
echo "🚀 Starting Docker services..."
cd "$EA_DIR"
docker compose --env-file "$ENV_FILE" up -d

echo "⏳ Waiting for services to be healthy..."
sleep 5

# ── 5. Verify ──
echo ""
echo "🔍 Verifying services..."
curl -sf -o /dev/null -w '  ✅ Booking page:        HTTP %{http_code}\n' 'http://localhost/index.php/booking' || echo "  ❌ Booking page:       not ready"
curl -sf -o /dev/null -w '  ✅ Landing page:        HTTP %{http_code}\n' 'http://localhost/index.php/landing' || echo "  ❌ Landing page:       not ready"
curl -sf -o /dev/null -w '  ✅ Login page:          HTTP %{http_code}\n' 'http://localhost/index.php/login' || echo "  ❌ Login page:         not ready"

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║   ✅ Shalibo EA is running locally            ║"
echo "║                                                ║"
echo "║   Landing page:  http://localhost/index.php/landing  ║"
echo "║   Booking page:  http://localhost/index.php/booking ║"
echo "║   Login page:    http://localhost/index.php/login   ║"
echo "║   Admin panel:   http://localhost/index.php/backend ║"
echo "║   phpMyAdmin:    http://localhost:8080              ║"
echo "║   Mailpit:       http://localhost:8025              ║"
echo "║                                                ║"
echo "║   Admin creds:   shalibo / test1234            ║"
echo "╚════════════════════════════════════════════════╝"
