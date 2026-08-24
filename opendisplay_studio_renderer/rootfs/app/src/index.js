import { loadConfig } from "./config.js";
import { loadOrCreateCredentials } from "./credentials.js";
import { SupervisorDiscovery } from "./discovery.js";
import { PersistentRenderer } from "./renderer.js";
import { buildServer } from "./server.js";

const config = loadConfig();
const credentials = loadOrCreateCredentials(config.dataDir, config.authToken);
const bootstrapLogger = {
  info: (fields, message) =>
    console.log(message === undefined ? fields : `${message} ${JSON.stringify(fields)}`),
  warn: (fields, message) =>
    console.warn(message === undefined ? fields : `${message} ${JSON.stringify(fields)}`)
};
const renderer = new PersistentRenderer({ ...config, logger: bootstrapLogger });
await renderer.start();
const server = buildServer({ renderer, credentials, config });
const discovery = new SupervisorDiscovery({
  credentials,
  port: config.port,
  logger: server.log
});
discovery.start();

let stopping = false;
async function shutdown(signal) {
  if (stopping) {
    return;
  }
  stopping = true;
  server.log.info({ signal }, "Stopping renderer");
  discovery.stop();
  try {
    await server.close();
  } finally {
    await renderer.stop();
  }
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM").catch((error) => {
    server.log.error({ error }, "Renderer shutdown failed");
    process.exitCode = 1;
  });
});
process.on("SIGINT", () => {
  void shutdown("SIGINT").catch((error) => {
    server.log.error({ error }, "Renderer shutdown failed");
    process.exitCode = 1;
  });
});

await server.listen({ host: config.host, port: config.port });
server.log.info(
  { version: config.version, poolSize: config.poolSize, port: config.port },
  "OpenDisplay Studio Renderer started"
);
