import Fastify from "fastify";

import { TRMNL_FRAMEWORK_VERSION } from "./renderer.js";

const API_VERSION = 2;

function rounded(value) {
  return Math.round(value * 10) / 10;
}

function normalizeAllowedOrigins(values) {
  const origins = [];
  for (const value of values) {
    let url;
    try {
      url = new URL(value);
    } catch {
      const error = new Error("allowedAssetOrigins must contain HTTP(S) origins");
      error.statusCode = 400;
      throw error;
    }
    if (
      !["http:", "https:"].includes(url.protocol)
      || url.username
      || url.password
      || !["", "/"].includes(url.pathname)
      || url.search
      || url.hash
      || value.replace(/\/$/u, "") !== url.origin
    ) {
      const error = new Error("allowedAssetOrigins must contain HTTP(S) origins without paths");
      error.statusCode = 400;
      throw error;
    }
    if (!origins.includes(url.origin)) origins.push(url.origin);
  }
  return origins;
}

export function buildServer({ renderer, credentials, config }) {
  const server = Fastify({
    logger: {
      level: process.env.ODX_LOG_LEVEL || "info"
    },
    bodyLimit: config.maxHtmlBytes + 32_768
  });

  server.get("/health", async (_request, reply) => {
    const ready = renderer.ready;
    return reply.code(ready ? 200 : 503).send({
      status: ready ? "ok" : "starting",
      version: config.version,
      rendererVersion: config.version,
      apiVersion: API_VERSION,
      trmnlFrameworkVersion: TRMNL_FRAMEWORK_VERSION,
      ready,
      poolSize: config.poolSize
    });
  });

  server.post(
    "/render",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["width", "height", "html"],
          properties: {
            width: { type: "integer", minimum: 1, maximum: 4096 },
            height: { type: "integer", minimum: 1, maximum: 4096 },
            html: { type: "string", minLength: 1 },
            allowedAssetOrigins: {
              type: "array",
              maxItems: 16,
              default: [],
              items: { type: "string", minLength: 8, maxLength: 2048 }
            }
          }
        }
      },
      preHandler: async (request, reply) => {
        if (request.headers.authorization !== `Bearer ${credentials.authToken}`) {
          return reply.code(401).send({
            error: { code: "invalid_auth", message: "Invalid renderer token." }
          });
        }
      }
    },
    async (request, reply) => {
      const { html, width, height, allowedAssetOrigins = [] } = request.body;
      if (Buffer.byteLength(html, "utf8") > config.maxHtmlBytes) {
        return reply.code(413).send({
          error: { code: "html_too_large", message: "HTML exceeds the configured limit." }
        });
      }
      if (!renderer.ready) {
        return reply.code(503).send({
          error: { code: "renderer_not_ready", message: "Renderer is not ready." }
        });
      }

      const normalizedOrigins = normalizeAllowedOrigins(allowedAssetOrigins);
      const { png, timings } = await renderer.render({
        html,
        width,
        height,
        allowedAssetOrigins: normalizedOrigins
      });
      const values = Object.fromEntries(
        Object.entries(timings).map(([key, value]) => [key, rounded(value)])
      );
      request.log.info(
        { width, height, timings: values },
        "Render complete"
      );
      reply
        .header("content-type", "image/png")
        .header("cache-control", "no-store")
        .header("x-odx-queue-time", String(values.queue))
        .header("x-odx-dom-time", String(values.dom))
        .header("x-odx-layout-time", String(values.layout))
        .header("x-odx-screenshot-time", String(values.screenshot))
        .header("x-odx-render-time", String(values.total));
      return reply.send(png);
    }
  );

  server.setErrorHandler((error, request, reply) => {
    request.log.error({ error }, "Renderer request failed");
    const status = error.validation ? 400 : error.statusCode || 500;
    void reply.code(status).send({
      error: {
        code: error.validation || status === 400 ? "invalid_request" : "render_failed",
        message: status >= 500 ? "Rendering failed." : error.message
      }
    });
  });

  return server;
}
