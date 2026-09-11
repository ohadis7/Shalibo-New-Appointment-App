#!/usr/bin/env bash
#
# Verify that every injection performed by the Dockerfile actually landed in the
# built image.
#
# Why this exists: every `sed` injection in the Dockerfile ends in `|| true`.
# If Easy!Appointments upstream renames a template or changes its markup, the
# sed silently does nothing, the image builds green, and the site deploys
# unstyled. This script is the only thing standing between that and production.
#
# Usage:  ./scripts/verify-injections.sh [image-tag]
# Default image tag: sw-ea:verify
#
# Exit 0 = every injection landed. Exit 1 = at least one did not.
# Never "fix" a failure here by deleting a check. Fix the injection.

set -uo pipefail

IMAGE="${1:-sw-ea:verify}"

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "error: image '$IMAGE' not found. Build it first:" >&2
  echo "  docker build -t $IMAGE ." >&2
  exit 1
fi

# The checks run inside the image. Each line of output is:
#   PASS|FAIL <tab> <check name> <tab> <detail>
INNER=$(cat <<'INNER_EOF'
BOOKING=/var/www/html/application/views/layouts/booking_layout.php
LOGIN=/var/www/html/application/views/pages/login.php

report() { printf '%s\t%s\t%s\n' "$1" "$2" "$3"; }

# file_exists <label> <path>
file_exists() {
  if [ -f "$2" ]; then report PASS "$1" "$2"; else report FAIL "$1" "missing: $2"; fi
}

# contains <label> <path> <needle>
contains() {
  if [ ! -f "$2" ]; then
    report FAIL "$1" "template not found: $2"
  elif grep -qF -- "$3" "$2"; then
    n=$(grep -cF -- "$3" "$2")
    report PASS "$1" "$n occurrence(s) in $(basename "$2")"
  else
    report FAIL "$1" "not injected into $(basename "$2"): $3"
  fi
}

# --- assets copied into the image ---------------------------------------
file_exists "asset: custom.css"         /var/www/html/assets/css/custom.css
file_exists "asset: booking-inject.js"  /var/www/html/assets/js/booking-inject.js
file_exists "asset: login-override.css" /var/www/html/assets/css/login-override.css
file_exists "asset: login-inject.js"    /var/www/html/assets/js/login-inject.js
file_exists "asset: landing.html"       /var/www/html/landing.html

# --- booking page injections (these back the live site) -----------------
contains "booking: theme css link"   "$BOOKING" 'assets/css/custom.css'
contains "booking: enhancer script"  "$BOOKING" 'assets/js/booking-inject.js'
contains "booking: landing redirect" "$BOOKING" 'location.replace("/landing.html")'

# --- admin login page injections ----------------------------------------
file_exists "login: template"        "$LOGIN"
contains "login: override css link"  "$LOGIN" 'assets/css/login-override.css'
contains "login: logo script"        "$LOGIN" 'assets/js/login-inject.js'

# --- template must still be valid PHP-ish, not truncated by a bad sed ----
if [ -f "$BOOKING" ] && grep -q '</body>' "$BOOKING" && grep -q '</head>' "$BOOKING"; then
  report PASS "booking: template intact" "head and body tags present"
else
  report FAIL "booking: template intact" "head/body tags missing - sed may have mangled it"
fi

# --- diagnostics -------------------------------------------------------
# When an injection does not land the next question is always the same:
# which template actually owns the </head> and </body> we are trying to
# patch? CodeIgniter views are partials - the tags usually live in a layout,
# not in the page view. Answer it here so nobody has to rebuild the image by
# hand to find out.
for f in $(find /var/www/html/application/views -name '*.php' 2>/dev/null); do
  if grep -q '</head>' "$f" 2>/dev/null; then
    printf 'DIAG\thas </head>\t%s\n' "$f"
  fi
done
INNER_EOF
)

echo "Verifying injections in image: $IMAGE"
echo

OUTPUT=$(printf '%s' "$INNER" | docker run --rm -i --entrypoint sh "$IMAGE" -s 2>&1)
RC=$?

if [ $RC -ne 0 ] && [ -z "$OUTPUT" ]; then
  echo "error: could not run checks inside the image (exit $RC)" >&2
  exit 1
fi

FAILED=0
PASSED=0
DIAGS=""
while IFS=$'\t' read -r status name detail; do
  case "$status" in
    PASS) printf '  \033[32mPASS\033[0m  %-28s %s\n' "$name" "$detail"; PASSED=$((PASSED + 1)) ;;
    FAIL) printf '  \033[31mFAIL\033[0m  %-28s %s\n' "$name" "$detail"; FAILED=$((FAILED + 1)) ;;
    DIAG) DIAGS="${DIAGS}  ${name}  ${detail}
" ;;
    *)    [ -n "$status" ] && printf '        %s %s %s\n' "$status" "$name" "$detail" ;;
  esac
done <<< "$OUTPUT"

echo
echo "$PASSED passed, $FAILED failed"

if [ "$FAILED" -gt 0 ]; then
  if [ -n "$DIAGS" ]; then
    echo
    echo "Templates in the image that contain </head>:"
    printf '%s' "$DIAGS"
  fi
  cat <<'HINT'

One or more injections did not land. This means the image would deploy with
missing theme or branding. Likely causes:

  - Easy!Appointments upstream renamed or restructured a template, so the
    Dockerfile's `sed` pattern no longer matches (the `|| true` hides it).
  - A COPY path in the Dockerfile is wrong.

Fix the Dockerfile so the injection lands. Do NOT delete the failing check.
HINT
  exit 1
fi

echo "All injections landed."
