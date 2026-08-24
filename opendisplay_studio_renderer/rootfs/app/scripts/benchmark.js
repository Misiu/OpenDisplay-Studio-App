import { parseArgs } from "node:util";

import { PersistentRenderer } from "../src/renderer.js";

const { values } = parseArgs({
  options: {
    iterations: { type: "string", default: "20" },
    width: { type: "string", default: "800" },
    height: { type: "string", default: "480" }
  }
});
const iterations = Number.parseInt(values.iterations, 10);
const width = Number.parseInt(values.width, 10);
const height = Number.parseInt(values.height, 10);
const logger = { info() {}, warn: console.warn };
const renderer = new PersistentRenderer({
  poolSize: 2,
  renderTimeoutMs: 10_000,
  logger
});
const html = `<style>
.screen{width:100%;height:100%;padding:36px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;font-size:28px}
.cell{border:3px solid #000;display:flex;align-items:center;justify-content:center}.wide{grid-column:1/3}
</style><main class="screen"><section class="cell">21.4 C</section><section class="cell">22.7 C</section><section class="cell wide">OpenDisplay Studio benchmark</section></main>`;

await renderer.start();
try {
  await renderer.render({ html, width, height });
  const samples = [];
  for (let index = 0; index < iterations; index += 1) {
    samples.push((await renderer.render({ html, width, height })).timings);
  }
  for (const key of ["queue", "dom", "layout", "screenshot", "total"]) {
    const sorted = samples.map((sample) => sample[key]).sort((a, b) => a - b);
    const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
    const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
    console.log(`${key.padEnd(10)} mean=${mean.toFixed(1)} ms p95=${p95.toFixed(1)} ms`);
  }
} finally {
  await renderer.stop();
}
