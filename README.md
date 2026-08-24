# OpenDisplay Studio Renderer

Home Assistant App repository containing the deliberately small renderer used
by the OpenDisplay Studio proof of concept.

The renderer owns no Home Assistant concepts. Its stable API is:

- `GET /health` - readiness, renderer version, and API version;
- `POST /render` - `{ "html", "width", "height" }` to an exact-size PNG.

Chromium, its browser context, and a configurable pool of pages remain alive.
Warm requests update only `#root.innerHTML`. Every render logs queue, DOM,
layout, screenshot, and total timings and returns the same data in `X-ODX-*`
headers.

See [the App documentation](opendisplay_studio_renderer/DOCS.md) for setup,
API, security, and benchmarking details.

The first measured development-PC baseline is recorded in
[BENCHMARKS.md](BENCHMARKS.md): 49.1 ms mean and 50.5 ms p95 total time for
25 warm 800 x 480 renders.

## Development

```bash
cd opendisplay_studio_renderer/rootfs/app
npm ci
npx playwright install chromium
npm test
npm run benchmark -- --iterations=20
```

## Releasing

Keep all versions synchronized, then push a semantic version tag such as
`v0.1.0`. The release workflow publishes signed `amd64` and `aarch64` images
to GHCR and creates the GitHub release.

## License

MIT
