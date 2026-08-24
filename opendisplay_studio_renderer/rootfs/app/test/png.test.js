import assert from "node:assert/strict";
import test from "node:test";

import { assertPngDimensions, readPngDimensions } from "../src/png.js";

function fakePng(width, height) {
  const png = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
  png.write("IHDR", 12, "ascii");
  png.writeUInt32BE(width, 16);
  png.writeUInt32BE(height, 20);
  return png;
}

test("reads and validates exact PNG dimensions", () => {
  const png = fakePng(800, 480);
  assert.deepEqual(readPngDimensions(png), { width: 800, height: 480 });
  assert.doesNotThrow(() => assertPngDimensions(png, 800, 480));
  assert.throws(() => assertPngDimensions(png, 801, 480), /expected 801x480/);
});

test("rejects invalid PNG data", () => {
  assert.throws(() => readPngDimensions(Buffer.from("not a png")), /invalid PNG/);
});
