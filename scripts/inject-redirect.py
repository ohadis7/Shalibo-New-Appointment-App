#!/usr/bin/env python3
"""Inject the booking-hub redirect into the Easy!Appointments booking layout.

Run inside the image at build time. If a visitor lands on the booking wizard
without a ?service or ?provider query parameter, they are sent to the public
hub at /landing.html before anything renders.

This used to be an inline multi-line `RUN python3 -c "..."` in the Dockerfile.
Docker treats each line of a RUN as a new instruction unless it is continued,
so that form did not parse at all and `docker build` failed outright. Keeping
it as a real script file also makes it readable and independently testable.

Unlike the `sed` injections this script fails loudly on purpose: a silent
no-op here means every visitor without query parameters sees a bare booking
wizard instead of the hub.
"""

import sys

LAYOUT = "/var/www/html/application/views/layouts/booking_layout.php"

REDIRECT = (
    "<script>(function(){"
    "var p=new URLSearchParams(location.search);"
    'if(!p.get("service")&&!p.get("provider")){location.replace("/landing.html");}'
    "})();</script>"
)

MARKER = 'location.replace("/landing.html")'


def main(path=LAYOUT):
    try:
        with open(path, encoding="utf-8") as fh:
            content = fh.read()
    except OSError as exc:
        sys.exit(f"inject-redirect: cannot read {path}: {exc}")

    if MARKER in content:
        print(f"inject-redirect: already present in {path}, nothing to do")
        return

    if "<head>" not in content:
        sys.exit(
            f"inject-redirect: no <head> in {path}. Easy!Appointments upstream "
            "has probably restructured this template - fix the injection, do "
            "not skip it."
        )

    content = content.replace("<head>", "<head>" + REDIRECT, 1)

    with open(path, "w", encoding="utf-8") as fh:
        fh.write(content)

    print(f"inject-redirect: injected landing redirect into {path}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else LAYOUT)
