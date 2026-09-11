#!/bin/sh
#
# Inject the booking-hub redirect into the Easy!Appointments booking layout.
# Runs inside the image at build time.
#
# If a visitor lands on the booking wizard without a ?service or ?provider
# query parameter, they are sent to the public hub at /landing.html before
# anything renders.
#
# POSIX sh and sed only, on purpose. The Easy!Appointments image has no
# python3 - the previous version of this injection was inline python, so it
# could never have run even once. Do not reintroduce a dependency on an
# interpreter without first proving it exists in the image.
#
# Unlike the sed injections in the Dockerfile this fails loudly rather than
# ending in `|| true`: a silent no-op here sends every visitor without query
# parameters to a bare booking wizard instead of the hub.

set -e

LAYOUT="${1:-/var/www/html/application/views/layouts/booking_layout.php}"
SNIPPET="${2:-/tmp/booking-redirect.html}"
MARKER='location.replace("/landing.html")'

fail() { echo "inject-redirect: $1" >&2; exit 1; }

[ -f "$LAYOUT" ]  || fail "layout not found: $LAYOUT"
[ -f "$SNIPPET" ] || fail "snippet not found: $SNIPPET"

if grep -qF "$MARKER" "$LAYOUT"; then
  echo "inject-redirect: already present in $LAYOUT, nothing to do"
  exit 0
fi

HEADS=$(grep -cF '<head>' "$LAYOUT" || true)
if [ "$HEADS" -eq 0 ]; then
  fail "no <head> in $LAYOUT. Easy!Appointments upstream has probably restructured this template - fix the injection, do not skip it."
fi
if [ "$HEADS" -gt 1 ]; then
  fail "$HEADS <head> tags in $LAYOUT - refusing to guess which one to patch."
fi

# `r` appends the snippet file immediately after the line holding <head>.
sed -i "/<head>/r $SNIPPET" "$LAYOUT"

# Never trust the edit - prove it landed.
grep -qF "$MARKER" "$LAYOUT" || fail "sed reported success but the marker is absent in $LAYOUT"

echo "inject-redirect: injected landing redirect into $LAYOUT"
