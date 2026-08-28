import assert from "node:assert/strict";
import test from "node:test";

import { buildServer } from "../src/server.js";

const PNG = (() => {
  const value = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(value);
  value.write("IHDR", 12, "ascii");
  value.writeUInt32BE(800, 16);
  value.writeUInt32BE(480, 20);
  return value;
})();

function fixture() {
  const renderCalls = [];
  const renderer = {
    ready: true,
    async render(input) {
      renderCalls.push(input);
      return {
        png: PNG,
        timings: { queue: 0.4, dom: 2.8, layout: 14.7, screenshot: 71.2, total: 89.1 }
      };
    }
  };
  const server = buildServer({
    renderer,
    credentials: { authToken: "test-token" },
    config: { version: "0.2.0", poolSize: 2, maxHtmlBytes: 1024 }
  });
  return { server, renderCalls };
}

test("health exposes compatibility and readiness", async () => {
  const { server } = fixture();
  const response = await server.inject({ method: "GET", url: "/health" });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: "ok",
    version: "0.2.0",
    rendererVersion: "0.2.0",
    apiVersion: 2,
    trmnlFrameworkVersion: "3.2.0",
    ready: true,
    poolSize: 2
  });
  await server.close();
});

test("render requires auth and returns raw PNG with timing headers", async () => {
  const { server, renderCalls } = fixture();
  const unauthorized = await server.inject({
    method: "POST",
    url: "/render",
    payload: {
      width: 800,
      height: 480,
      html: '<img src="https://cdn.example.com/icon.svg">',
      allowedAssetOrigins: ["https://cdn.example.com/"]
    }
  });
  assert.equal(unauthorized.statusCode, 401);

  const response = await server.inject({
    method: "POST",
    url: "/render",
    headers: { authorization: "Bearer test-token" },
    payload: {
      width: 800,
      height: 480,
      html: '<img src="https://cdn.example.com/icon.svg">',
      allowedAssetOrigins: ["https://cdn.example.com/"]
    }
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["content-type"], "image/png");
  assert.equal(response.headers["x-odx-render-time"], "89.1");
  assert.deepEqual(response.rawPayload, PNG);
  assert.deepEqual(renderCalls, [{
    html: '<img src="https://cdn.example.com/icon.svg">',
    width: 800,
    height: 480,
    allowedAssetOrigins: ["https://cdn.example.com"]
  }]);
  await server.close();
});

test("render validates dimensions", async () => {
  const { server } = fixture();
  const response = await server.inject({
    method: "POST",
    url: "/render",
    headers: { authorization: "Bearer test-token" },
    payload: { width: 0, height: 480, html: "<div>test</div>" }
  });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error.code, "invalid_request");
  await server.close();
});

test("render rejects malformed asset origins", async () => {
  const { server } = fixture();
  const response = await server.inject({
    method: "POST",
    url: "/render",
    headers: { authorization: "Bearer test-token" },
    payload: {
      width: 800,
      height: 480,
      html: "<div>test</div>",
      allowedAssetOrigins: ["https://example.com/path"]
    }
  });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error.code, "invalid_request");
  await server.close();
});
