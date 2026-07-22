#!/usr/bin/env bash
# Test login with CSRF token from the page
set -euo pipefail

echo "=== Fetch login page ==="
PAGE=$(curl -s 'http://localhost/index.php/login')

# Extract CSRF token from JavaScript variables
CSRF=$(echo "$PAGE" | grep -oP 'csrfToken\s*=\s*"[^"]+' | head -1 | sed 's/csrfToken\s*=\s*"//')
echo "CSRF token: $CSRF"

echo ""
echo "=== Login attempt (developer@shalibowellness.com) ==="
curl -s -X POST 'http://localhost/index.php/login' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'X-Requested-With: XMLHttpRequest' \
  -d "username=developer@shalibowellness.com&password=Shalibo1234567&csrf_token=$CSRF" 2>&1 | head -30

echo ""
echo "=== Login attempt (admin credentials) ==="
CSRF2=$(curl -s 'http://localhost/index.php/login' | grep -oP 'csrfToken\s*=\s*"[^"]+' | head -1 | sed 's/csrfToken\s*=\s*"//')
curl -s -X POST 'http://localhost/index.php/login' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'X-Requested-With: XMLHttpRequest' \
  -d "username=developer@shalibowellness.com&password=Shalibo1234567&csrf_token=$CSRF2" 2>&1
