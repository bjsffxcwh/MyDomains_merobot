# merobot.org

MEROBOT's static editorial homepage: the original painted meadow, brand mark, MR—01 and four field-note topics. No framework, build step, runtime dependencies, remote assets or inline scripts/styles.

The current edition is a long-form page rather than a forced single screen: arrival, four lines of enquiry, and a collaboration footer. The meadow is intentionally stationary; movement is limited to the character's bounded gaze and optional idle gestures.

## Preview

```powershell
python -m http.server 4174 --bind 127.0.0.1
```

Open `http://127.0.0.1:4174/`. Use HTTP rather than opening `index.html` directly because the page uses root-relative `/assets/...` paths. Cloudflare Pages serves the production headers; the page also carries a matching CSP meta policy for simple previews.

## Interaction

- Stationary meadow; no pointer-driven camera or background animation.
- Mouse gaze changes eyes/head only: 48px central dead zone, ±3 SVG units X, ±2 Y and ±1.2° head. Touch does not drive gaze.
- A short first/return greeting appears when MR—01 becomes visible; HTML has a static introduction.
- One idle director uses brief glances, blinks, listening and rest after quiet periods. Speech uses existing wording and actual page context, does not repeat autonomous lines within the session and becomes silent when exhausted. Hidden, offscreen, pinned or Calm states pause idle acts.
- Hover or keyboard focus previews a topic. Click, Enter, Space or tap pins it. Pin takes priority. A second activation or Escape releases; Escape retains focus. The nearby response panel provides feedback when the robot is offscreen.
- Motion/Calm persists locally. System reduced motion takes priority, including live changes. Calm stops animations, transitions and gaze.
- All descriptions and the email remain without JS; inactive controls are disabled until initialization.

## Files

```text
/
├─ index.html
├─ 404.html                   # retained previous visual system
├─ assets/
│  ├─ css/fonts.css
│  ├─ css/home.css            # arrival, notes, footer, responsive/focus
│  ├─ css/robot.css           # original robot paint/accessories
│  ├─ css/style.css           # v5 404 base
│  ├─ css/error-v5.css        # v5 404 theme
│  ├─ css/v5.css / v6.css     # retained for cached pages
│  ├─ js/home.js              # interaction layer
│  ├─ js/main.js / v6.js      # retained for cached pages
│  ├─ fonts/                  # Archivo / IBM Plex Mono + OFL
│  └─ img/                    # original meadow, brand and sharing assets
├─ _headers                   # Cloudflare Pages security headers
├─ _redirects
├─ robots.txt
├─ sitemap.xml
└─ site.webmanifest
```

## Hosting

Production: https://merobot.org/ — Cloudflare Pages project `mydomains-merobot`, production branch `main`. Pushing `main` publishes automatically.

- Framework preset: `None`
- Build command: empty
- Output directory: `/`
- Keep `data-cfasync="false"` on the homepage script so Cloudflare Rocket Loader cannot rewrite or defer it.
- The CSP is self-only. External analytics and injected scripts are intentionally not allowlisted.

## Editorial follow-ups

- The existing mailbox, appointment wording and provisional topic copy need owner verification.
- The sharing image and 404 still use the previous visual system; both are documented as follow-ups rather than silently treated as current.
- No fabricated project claims, testimonials or commercial metrics are present.
