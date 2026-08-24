# Vendored TRMNL Framework assets

- Framework version: `3.2.0`
- Source repository: `https://github.com/usetrmnl/trmnl-framework`
- Source commit: `83755968c9d6d1787928f160a58e4c056e17a2f6`
- Source CSS SHA-256: `a3202dc3eadf5dcebf71e73d6b6bc6439e2202ce7e1ac7dcd6579e69a42f8c7f`
- Packaged CSS SHA-256: `23f725eef1ccd8b67747f20726f3b142302c498eb91b014e0eff1e2a228f69fb`
- JavaScript SHA-256: `656928777af83a04902e3945dfeb06416990565d62b89a6de314b83ad4d15e0b`
- TRMNL16 Regular WOFF2 SHA-256: `b2028391dce2cc9fbaaf830ce48cb31851bfa748af4bdbacf2fc132b762b163d`

The only packaging change to the generated CSS is a deterministic rewrite from
absolute `/fonts/...` URLs to `../fonts/...`, allowing the persistent `file:` shell
to resolve bundled fonts without HTTP or Internet access. The JavaScript artifact
is byte-for-byte upstream. Licenses and upstream third-party notices are included
under `licenses/`; font-specific notices are included under `fonts/bundles/`.

No Highcharts distribution and no plugin image bundle is included.
