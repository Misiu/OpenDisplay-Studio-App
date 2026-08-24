import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { PersistentRenderer } from "../src/renderer.js";

const outputDirectory = resolve(process.argv[2] || "stage2-renders");
let input = "";
for await (const chunk of process.stdin) {
  input += chunk;
}
const documents = JSON.parse(input);
const logger = { info() {}, warn: console.warn };
const renderer = new PersistentRenderer({
  poolSize: 2,
  renderTimeoutMs: 10_000,
  logger
});

await mkdir(outputDirectory, { recursive: true });
await renderer.start();
try {
  for (const document of documents) {
    const result = await renderer.render(document);
    const path = resolve(outputDirectory, `${document.id}.png`);
    await writeFile(path, result.png);
    console.log(`${document.id} ${document.width}x${document.height} ${result.timings.total.toFixed(1)} ms`);
  }
} finally {
  await renderer.stop();
}
