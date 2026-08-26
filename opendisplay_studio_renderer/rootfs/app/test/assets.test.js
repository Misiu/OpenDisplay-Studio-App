import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { isTrustedFrameworkAsset } from "../src/renderer.js";

const CSS = new URL("../assets/trmnl/3.2.0/plugins.min.css", import.meta.url);
const JS = new URL("../assets/trmnl/3.2.0/plugins.min.js", import.meta.url);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

test("TRMNL Framework artifacts are pinned and offline", async () => {
  const [css, javascript] = await Promise.all([readFile(CSS), readFile(JS)]);
  assert.equal(
    sha256(css),
    "23f725eef1ccd8b67747f20726f3b142302c498eb91b014e0eff1e2a228f69fb"
  );
  assert.equal(
    sha256(javascript),
    "656928777af83a04902e3945dfeb06416990565d62b89a6de314b83ad4d15e0b"
  );
  assert.doesNotMatch(css.toString(), /url\(["']?https?:/u);
  assert.match(javascript.toString(), /plugins\.js v3\.2\.0/u);
});

test("only fixed TRMNL weather assets may use the network", () => {
  assert.equal(
    isTrustedFrameworkAsset("https://trmnl.com/images/plugins/weather/wi-rain.svg"),
    true
  );
  assert.equal(
    isTrustedFrameworkAsset("https://trmnl.com/images/plugins/weather--render.svg"),
    true
  );
  assert.equal(isTrustedFrameworkAsset("https://trmnl.com/other.svg"), false);
  assert.equal(isTrustedFrameworkAsset("https://example.com/wi-rain.svg"), false);
  assert.equal(
    isTrustedFrameworkAsset("https://trmnl.com/images/plugins/weather/../../private.svg"),
    false
  );
});
