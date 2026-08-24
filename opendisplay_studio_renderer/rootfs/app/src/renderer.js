import { performance } from "node:perf_hooks";

import { chromium } from "playwright";

import { assertPngDimensions } from "./png.js";

const SHELL = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body, #root { width: 100%; height: 100%; margin: 0; }
    html, body { overflow: hidden; background: #fff; }
    body { font-family: "DejaVu Sans", Arial, sans-serif; color: #000; }
    #root { isolation: isolate; }
  </style>
</head>
<body><div id="root"></div></body>
</html>`;

export class PersistentRenderer {
  constructor({ poolSize, renderTimeoutMs, executablePath, logger }) {
    this.poolSize = poolSize;
    this.renderTimeoutMs = renderTimeoutMs;
    this.executablePath = executablePath;
    this.logger = logger;
    this.browser = undefined;
    this.context = undefined;
    this.available = [];
    this.waiters = [];
    this.ready = false;
  }

  async start() {
    this.browser = await chromium.launch({
      headless: true,
      executablePath: this.executablePath,
      args: ["--disable-dev-shm-usage", "--no-sandbox"]
    });
    this.context = await this.browser.newContext({
      viewport: { width: 800, height: 480 },
      deviceScaleFactor: 1,
      locale: "en-US",
      timezoneId: "UTC",
      colorScheme: "light",
      reducedMotion: "reduce",
      serviceWorkers: "block"
    });
    this.available = await Promise.all(
      Array.from({ length: this.poolSize }, () => this.#createPage())
    );
    this.ready = true;
    this.logger.info(
      { poolSize: this.poolSize },
      "Persistent Chromium renderer is ready"
    );
  }

  async stop() {
    this.ready = false;
    for (const waiter of this.waiters.splice(0)) {
      waiter.reject(new Error("Renderer is stopping"));
    }
    const browser = this.browser;
    this.context = undefined;
    this.browser = undefined;
    if (browser) {
      await browser.close().catch((error) => {
        this.logger.warn(
          { error: error.message },
          "Chromium had already stopped during renderer shutdown"
        );
      });
    }
    this.available = [];
  }

  async render({ html, width, height }) {
    const totalStart = performance.now();
    const page = await this.#acquire();
    const queueEnd = performance.now();
    let healthy = true;
    try {
      const domStart = performance.now();
      await page.setViewportSize({ width, height });
      await page.evaluate((content) => {
        const root = document.querySelector("#root");
        if (!(root instanceof HTMLElement)) {
          throw new Error("Renderer shell root is missing");
        }
        root.innerHTML = content;
      }, html);
      const domEnd = performance.now();

      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        });
      });
      const layoutEnd = performance.now();

      const png = await page.screenshot({
        type: "png",
        animations: "disabled",
        caret: "hide",
        fullPage: false
      });
      const screenshotEnd = performance.now();
      assertPngDimensions(png, width, height);

      return {
        png,
        timings: {
          queue: queueEnd - totalStart,
          dom: domEnd - domStart,
          layout: layoutEnd - domEnd,
          screenshot: screenshotEnd - layoutEnd,
          total: screenshotEnd - totalStart
        }
      };
    } catch (error) {
      healthy = false;
      throw error;
    } finally {
      await this.#release(page, healthy);
    }
  }

  async #createPage() {
    if (!this.context) {
      throw new Error("Renderer context is unavailable");
    }
    const page = await this.context.newPage();
    page.setDefaultTimeout(this.renderTimeoutMs);
    await page.route("**/*", async (route) => {
      const protocol = new URL(route.request().url()).protocol;
      if (protocol === "http:" || protocol === "https:") {
        await route.abort("blockedbyclient");
      } else {
        await route.continue();
      }
    });
    await page.setContent(SHELL, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    return page;
  }

  #acquire() {
    const page = this.available.pop();
    if (page) {
      return Promise.resolve(page);
    }
    return new Promise((resolve, reject) => this.waiters.push({ resolve, reject }));
  }

  async #release(page, healthy) {
    let reusablePage = page;
    if (!healthy || page.isClosed()) {
      await page.close().catch(() => undefined);
      reusablePage = await this.#createPage();
      this.logger.warn("Replaced an unhealthy persistent rendering page");
    } else {
      await page.evaluate(() => {
        const root = document.querySelector("#root");
        if (root) {
          root.replaceChildren();
        }
      });
    }

    const waiter = this.waiters.shift();
    if (waiter) {
      waiter.resolve(reusablePage);
    } else {
      this.available.push(reusablePage);
    }
  }
}
