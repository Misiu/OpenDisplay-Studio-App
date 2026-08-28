import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import { PersistentRenderer } from "../src/renderer.js";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">
  <rect width="40" height="40" fill="black"/>
</svg>`;

test("network permission is scoped to one render and cannot leak through cache", async () => {
  const assetServer = createServer((_request, response) => {
    response.writeHead(200, {
      "cache-control": "public,max-age=3600",
      "content-type": "image/svg+xml"
    });
    response.end(SVG);
  });
  await new Promise((resolve) => assetServer.listen(0, "127.0.0.1", resolve));
  const address = assetServer.address();
  assert.notEqual(typeof address, "string");
  assert.notEqual(address, null);
  const origin = `http://127.0.0.1:${address.port}`;
  const html = `<img src="${origin}/icon.svg" alt="remote">`;
  const renderer = new PersistentRenderer({
    poolSize: 1,
    renderTimeoutMs: 5_000,
    logger: { info() {}, warn() {} }
  });

  await renderer.start();
  try {
    await renderer.render({
      html,
      width: 80,
      height: 80,
      allowedAssetOrigins: [origin]
    });
    await assert.rejects(
      renderer.render({ html, width: 80, height: 80 }),
      /Image assets failed/u
    );
    const diagnostics = await renderer.diagnostics();
    assert.equal(diagnostics.allowedNetworkRequests, 1);
    assert.equal(diagnostics.blockedExternalRequests, 1);
  } finally {
    await renderer.stop();
    await new Promise((resolve) => assetServer.close(resolve));
  }
});
