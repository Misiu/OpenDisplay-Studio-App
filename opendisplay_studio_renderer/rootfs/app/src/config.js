import { readFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULTS = Object.freeze({
  poolSize: 2,
  maxHtmlBytes: 1_048_576,
  renderTimeoutMs: 10_000,
  port: 8099,
  host: "0.0.0.0",
  dataDir: "/data"
});

function integer(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

export function loadConfig(environment = process.env) {
  const dataDir = environment.ODX_DATA_DIR || DEFAULTS.dataDir;
  let options = {};
  try {
    options = JSON.parse(readFileSync(join(dataDir, "options.json"), "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  return Object.freeze({
    poolSize: integer(
      environment.ODX_POOL_SIZE ?? options.pool_size,
      DEFAULTS.poolSize,
      1,
      8
    ),
    maxHtmlBytes: integer(
      environment.ODX_MAX_HTML_BYTES ?? options.max_html_bytes,
      DEFAULTS.maxHtmlBytes,
      1024,
      4_194_304
    ),
    renderTimeoutMs: integer(
      environment.ODX_RENDER_TIMEOUT_MS ?? options.render_timeout_ms,
      DEFAULTS.renderTimeoutMs,
      1000,
      60_000
    ),
    port: integer(environment.ODX_PORT, DEFAULTS.port, 1, 65_535),
    host: environment.ODX_HOST || DEFAULTS.host,
    dataDir,
    version: environment.ODX_VERSION || "0.2.3",
    executablePath: environment.ODX_CHROMIUM_PATH || undefined,
    authToken: environment.ODX_AUTH_TOKEN || undefined
  });
}
