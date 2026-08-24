import Fastify from "fastify";

import { TRMNL_FRAMEWORK_VERSION } from "./renderer.js";

function rounded(value) {
  return Math.round(value * 10) / 10;
}

export function buildServer({ renderer, credentials, config }) {
  const server = Fastify({
    logger: {
      level: process.env.ODX_LOG_LEVEL || "info"
    },
    bodyLimit: config.maxHtmlBytes + 1024
  });

  server.get("/health", async (_request, reply) => {
    const ready = renderer.ready;
    return reply.code(ready ? 200 : 503).send({
      status: ready ? "ok" : "starting",
      version: config.version,
      rendererVersion: config.version,
      apiVersion: 1,
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
            html: { type: "string", minLength: 1 }
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
      const { html, width, height } = request.body;
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

      const { png, timings } = await renderer.render({ html, width, height });
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
        code: error.validation ? "invalid_request" : "render_failed",
        message: status >= 500 ? "Rendering failed." : error.message
      }
    });
  });

  return server;
}
