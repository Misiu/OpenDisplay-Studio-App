# Renderer benchmarks

Results are produced by `npm run benchmark`, after one unrecorded warm-up
render. Each sample reuses the same Chromium process, browser context, and
page. Measurements use `performance.now()` around the actual queue, DOM,
layout, and screenshot stages.

## Development PC baseline

- Date: 2026-08-24
- OS: Windows 11 Pro 10.0.26200, 64-bit
- CPU: Intel Core Ultra 7 155H, 16 cores / 22 logical processors
- Memory: 32 GiB
- Node.js: 24.14.0
- Playwright: 1.62.1
- Chromium: 151.0.7922.34
- Image: 800 x 480
- Samples: 25 warm renders

| Stage | Mean | p95 |
| --- | ---: | ---: |
| Queue | 0.0 ms | 0.0 ms |
| DOM update | 1.1 ms | 1.4 ms |
| Layout | 24.3 ms | 25.5 ms |
| Screenshot | 23.7 ms | 24.5 ms |
| Total | 49.1 ms | 50.5 ms |

This baseline is comfortably within the POC's “excellent” band of under
500 ms. It is not a substitute for the planned HA OS x86 and Raspberry Pi / HA
Green measurements; those should be appended using the same command and
sample count.

## Stage 2 TRMNL Framework persistence test

- Date: 2026-08-24
- Environment: same Windows development PC as above
- Framework: TRMNL Framework 3.2.0, loaded once per page
- Image: 800 x 480, BWRY Framework document
- Samples: 1000 warm renders
- Command: `npm run benchmark:stage2 -- --iterations=1000`

| Stage | Mean | p95 |
| --- | ---: | ---: |
| Queue | 0.004 ms | 0.006 ms |
| DOM update | 0.84 ms | 1.38 ms |
| Framework layout / terminalize | 140.32 ms | 142.57 ms |
| Screenshot | 25.12 ms | 28.63 ms |
| Total | 166.30 ms | 170.32 ms |

The same static input produced byte-identical PNGs. A deliberately injected
external image request was blocked. Chromium stayed connected with two pages,
and `shellLoads` remained exactly 2 from startup through render 1000.

Memory snapshots are taken after explicit page garbage collection:

| Completed renders | Node RSS | Page 1 JS heap | Page 2 JS heap | Root children |
| ---: | ---: | ---: | ---: | ---: |
| 0 | 121.0 MB | 0.80 MB | 0.82 MB | 0 / 0 |
| 10 | 129.2 MB | 0.83 MB | 1.13 MB | 0 / 0 |
| 100 | 99.7 MB | 0.83 MB | 1.13 MB | 0 / 0 |
| 1000 | 108.8 MB | 0.83 MB | 1.21 MB | 0 / 0 |

There is no sustained Node RSS growth. The active page adds about 78 KB of JS
heap between renders 100 and 1000; this is not a significant leak signal in
the POC, but a multi-day HA OS soak test should also record total App container
memory because browser-process RSS is outside Node's `process.memoryUsage()`.

## Real HA OS Stage 1 observation

The first real 800 x 480 request reported by the Home Assistant OS App logged
134.1 ms renderer total (DOM 7.5 ms, layout 31.2 ms, screenshot 95.3 ms) and
140.5 ms HTTP response time. This is a Stage 1 document without TRMNL's
`terminalize()` cost, so it is retained as an environment baseline rather than
compared directly with the Stage 2 1000-render document.
