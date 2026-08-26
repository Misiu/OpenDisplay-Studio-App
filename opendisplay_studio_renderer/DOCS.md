# OpenDisplay Studio Renderer

This App is installed and started automatically by the OpenDisplay Studio
integration on Home Assistant OS and Supervised installations. The API is
internal to Home Assistant's App network and `/render` requires the bearer
token delivered through Supervisor discovery.

## API

### `GET /health`

Returns readiness and compatibility data:

```json
{"status":"ok","version":"0.2.3","rendererVersion":"0.2.3","apiVersion":1,"trmnlFrameworkVersion":"3.2.0","ready":true,"poolSize":2}
```

### `POST /render`

```json
{"width":800,"height":480,"html":"<div>OpenDisplay Studio</div>"}
```

The response body is an `image/png`, never Base64 encoded. The PNG IHDR is
validated before it is returned. Width and height are limited to 4096 pixels
and HTML size is configurable.

For standalone development, set `ODX_AUTH_TOKEN` to a known value and point
the integration's external Renderer flow at this service. In the Home
Assistant App, a strong stable token is generated under `/data` and delivered
only through Supervisor discovery.

Timing response headers:

- `X-ODX-Queue-Time`
- `X-ODX-DOM-Time`
- `X-ODX-Layout-Time`
- `X-ODX-Screenshot-Time`
- `X-ODX-Render-Time`

All values are milliseconds. The same measurements are written as structured
log fields for every successful render.

## Renderer lifecycle

At startup the App launches Chromium once, creates one browser context with
`deviceScaleFactor: 1`, creates `pool_size` pages, loads TRMNL Framework 3.2.0
and its local fonts once, then reports ready. Each warm render acquires one
page, sets its viewport, replaces only `#root.innerHTML`, runs the already
loaded Framework `terminalize()` pass, waits two animation frames, screenshots,
and returns the page to the pool.

The App never parses Liquid and never generates HTML. Its complete contract is
final HTML plus dimensions to PNG.

All HTTP and HTTPS requests initiated by render content are aborted. The
container includes its fonts and browser, so rendering has no Internet
dependency.

## POC performance bands

- under 500 ms: excellent;
- under 1000 ms: acceptable;
- over 2000 ms: investigate.

Run a repeatable warm benchmark from the source checkout with:

```bash
cd opendisplay_studio_renderer/rootfs/app
npm ci
npx playwright install chromium
npm run benchmark:stage2 -- --iterations=1000 --width=800 --height=480
```

The benchmark also records memory checkpoints, page and shell-load counts,
font readiness, determinism, and blocked external requests.
