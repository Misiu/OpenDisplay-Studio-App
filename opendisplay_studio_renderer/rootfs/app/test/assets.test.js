import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { isBlockedRenderRequest } from "../src/renderer.js";

const CSS = new URL("../assets/trmnl/3.2.0/plugins.min.css", import.meta.url);
const JS = new URL("../assets/trmnl/3.2.0/plugins.min.js", import.meta.url);
const MDI_CSS = new URL("../assets/mdi/css/materialdesignicons.min.css", import.meta.url);
const MDI_FONT = new URL("../assets/mdi/fonts/materialdesignicons-webfont.woff2", import.meta.url);

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

test("Material Design Icons are pinned and bundled locally", async () => {
  const [css, font] = await Promise.all([readFile(MDI_CSS), readFile(MDI_FONT)]);
  assert.equal(
    sha256(css),
    "03fe3caba05e65b14e4035139eee89b12be87cd0bcf342ac3886770eec3a9962"
  );
  assert.equal(
    sha256(font),
    "662fefa8f2f8a95c18588d21774789c107c64e771cbe65a69af46291c4311afc"
  );
  assert.match(css.toString(), /\.mdi-weather-rainy::before/u);
  assert.match(css.toString(), /\.mdi-weather-sunny::before/u);
  assert.doesNotMatch(css.toString(), /url\(["']?https?:/u);
});

test("render content can only load explicitly allowed origins", () => {
  assert.equal(isBlockedRenderRequest("https://trmnl.com/images/weather.svg"), true);
  assert.equal(
    isBlockedRenderRequest(
      "https://cdn.example.com/images/weather.svg",
      ["https://cdn.example.com"]
    ),
    false
  );
  assert.equal(
    isBlockedRenderRequest("http://cdn.example.com/icon.svg", ["https://cdn.example.com"]),
    true
  );
  assert.equal(
    isBlockedRenderRequest("https://other.example.com/icon.svg", ["https://cdn.example.com"]),
    true
  );
  assert.equal(isBlockedRenderRequest("data:image/svg+xml;base64,PHN2Zz4="), false);
  assert.equal(isBlockedRenderRequest(new URL("../assets/shell.html", import.meta.url).href), false);
  assert.equal(isBlockedRenderRequest("file:///etc/passwd"), true);
  assert.equal(isBlockedRenderRequest("not a URL"), true);
});
