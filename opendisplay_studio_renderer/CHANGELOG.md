# Changelog

## 0.6.0

- Bundle Material Design Icons 7.4.47 as a local WOFF2 webfont and expose all
  icon classes to rendered widgets.
- Remove the hardcoded TRMNL Weather exception and add a generic,
  request-scoped origin allowlist to Renderer API v2. Rendering remains
  local-only when the allowlist is empty.

## 0.5.0

Align the Renderer release line with OpenDisplay Studio Integration 0.5.0
while preserving the pinned TRMNL Framework 3.2.0 and exact rendering API.

## 0.2.4

- Fix the Supervisor discovery service name to match the OpenDisplay Studio
  integration domain.

## 0.2.3

Allow only fixed TRMNL weather assets, wait for all images, and reject an
incomplete render when any image fails to load.

## 0.2.2

Add the OpenDisplay Studio icon and logo to the App store listing.

## 0.2.1

Enable GitHub OIDC for unattended Cosign signing in release builds.

## 0.2.0

Bundle TRMNL Framework 3.2.0 locally, keep it initialized across renders, and
add framework-aware persistence, memory, determinism, and offline measurements.

## 0.1.0

Initial proof of concept with a persistent Chromium page pool and render timing.
