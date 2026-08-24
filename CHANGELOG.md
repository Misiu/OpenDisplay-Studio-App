# Changelog

## 0.2.0

- Bundle pinned TRMNL Framework 3.2.0 CSS, JavaScript, fonts, and notices.
- Load the framework shell once per persistent page and run warm renders by
  replacing only `#root.innerHTML`.
- Add Framework version health data, offline request blocking verification,
  deterministic screenshot checks, and 1000-render memory benchmarks.

## 0.1.0

- Add persistent Chromium and persistent rendering page pool.
- Add exact-dimension PNG validation and per-stage render measurements.
- Add authenticated render API, health API, and Supervisor discovery.
- Add multi-architecture Home Assistant App packaging and CI/CD.
