import { randomBytes, randomUUID } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FILE_NAME = "integration_credentials.json";

export function loadOrCreateCredentials(dataDir, configuredToken) {
  if (configuredToken) {
    return Object.freeze({ instanceId: randomUUID(), authToken: configuredToken });
  }

  mkdirSync(dataDir, { recursive: true });
  const path = join(dataDir, FILE_NAME);
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    if (
      typeof data.instance_id !== "string" ||
      typeof data.auth_token !== "string" ||
      data.auth_token.length < 32
    ) {
      throw new Error("Stored integration credentials are invalid");
    }
    return Object.freeze({
      instanceId: data.instance_id,
      authToken: data.auth_token
    });
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  const credentials = Object.freeze({
    instanceId: randomUUID(),
    authToken: randomBytes(32).toString("base64url")
  });
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  writeFileSync(
    temporaryPath,
    JSON.stringify({
      instance_id: credentials.instanceId,
      auth_token: credentials.authToken
    }),
    { encoding: "utf8", mode: 0o600, flag: "wx" }
  );
  renameSync(temporaryPath, path);
  chmodSync(path, 0o600);
  return credentials;
}
