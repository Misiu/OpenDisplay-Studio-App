# Changelog

## 0.2.4

- Announce the Renderer with the `opendisplay_studio` integration domain so
  Home Assistant routes Supervisor discovery to the installed integration.

## 0.2.3

- Allow only the fixed TRMNL weather asset namespace during rendering.
- Wait for every image and reject renders containing missing assets instead of
  silently producing incomplete PNGs.

## 0.2.2

- Add the Home Assistant App icon and logo.

## 0.2.1

- Enable GitHub OIDC for unattended Cosign signing in release builds.

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
