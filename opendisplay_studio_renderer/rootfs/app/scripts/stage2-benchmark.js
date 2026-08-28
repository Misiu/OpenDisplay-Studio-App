import { parseArgs } from "node:util";
import { createHash } from "node:crypto";

import { PersistentRenderer } from "../src/renderer.js";

const { values } = parseArgs({
  options: {
    iterations: { type: "string", default: "1000" },
    width: { type: "string", default: "800" },
    height: { type: "string", default: "480" }
  }
});
const iterations = Number.parseInt(values.iterations, 10);
const width = Number.parseInt(values.width, 10);
const height = Number.parseInt(values.height, 10);
const checkpoints = new Set([0, 10, 100, 1000, iterations]);
const logger = { info() {}, warn: console.warn };
const renderer = new PersistentRenderer({
  poolSize: 2,
  renderTimeoutMs: 10_000,
  logger
});
const html = `<main class="screen screen--color-4bwry screen--md">
  <div class="view view--full"><div class="layout layout--col gap--large">
    <div class="grid grid--cols-3 gap--large">
      <div class="item"><div class="content"><span class="value value--xxlarge">21.4°</span><span class="label">Łódź</span></div></div>
      <div class="item"><div class="content"><span class="value value--xxlarge">47%</span><span class="label">Humidity</span></div></div>
      <div class="item"><div class="content"><span class="value value--xxlarge">1017</span><span class="label">hPa</span></div></div>
    </div>
  </div><div class="title_bar"><span class="title">Stage 2 benchmark</span><span class="instance">warm</span></div></div>
</main>`;

const snapshots = [];
const samples = [];
await renderer.start();
try {
  snapshots.push({ renders: 0, ...(await renderer.diagnostics({ collectGarbage: true })) });
  let blockedNetworkVerified = false;
  try {
    await renderer.render({
      html: `${html}<img src="https://example.invalid/must-be-blocked.png" alt="">`,
      width,
      height
    });
  } catch (error) {
    blockedNetworkVerified = /Image assets failed/u.test(error.message);
  }
  if (!blockedNetworkVerified) {
    throw new Error("Undeclared network asset was not blocked");
  }
  const deterministicA = await renderer.render({ html, width, height });
  const deterministicB = await renderer.render({ html, width, height });
  const deterministic =
    createHash("sha256").update(deterministicA.png).digest("hex") ===
    createHash("sha256").update(deterministicB.png).digest("hex");
  for (let index = 1; index <= iterations; index += 1) {
    samples.push((await renderer.render({ html, width, height })).timings);
    if (checkpoints.has(index)) {
      snapshots.push({
        renders: index,
        ...(await renderer.diagnostics({ collectGarbage: true }))
      });
    }
  }
  const timings = {};
  for (const key of ["queue", "dom", "layout", "screenshot", "total"]) {
    const sorted = samples.map((sample) => sample[key]).sort((a, b) => a - b);
    timings[key] = {
      mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
      p95: sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)]
    };
  }
  console.log(
    JSON.stringify(
      { iterations, width, height, deterministic, blockedNetworkVerified, timings, snapshots },
      null,
      2
    )
  );
} finally {
  await renderer.stop();
}
