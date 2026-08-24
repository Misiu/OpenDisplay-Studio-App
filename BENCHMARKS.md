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
