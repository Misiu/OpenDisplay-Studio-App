import assert from "node:assert/strict";
import test from "node:test";

import { SupervisorDiscovery } from "../src/discovery.js";

test("announces the OpenDisplay Studio integration discovery service", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  let announced;
  const request = new Promise((resolve) => {
    globalThis.fetch = async (url, options) => {
      announced = { url, options };
      resolve();
      return { ok: true };
    };
  });
  const discovery = new SupervisorDiscovery({
    credentials: { authToken: "secret", instanceId: "instance" },
    port: 8099,
    logger: { info() {}, warn() {} },
    environment: { SUPERVISOR_TOKEN: "supervisor", HOSTNAME: "renderer" }
  });

  discovery.start();
  await request;
  discovery.stop();

  assert.equal(announced.url, "http://supervisor/discovery");
  assert.deepEqual(JSON.parse(announced.options.body), {
    service: "opendisplay_studio",
    config: {
      host: "renderer",
      port: 8099,
      auth_token: "secret",
      instance_id: "instance",
      api_version: 2
    }
  });
});
