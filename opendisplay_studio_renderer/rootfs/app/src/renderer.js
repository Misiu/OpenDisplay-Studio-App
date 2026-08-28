import { performance } from "node:perf_hooks";

import { chromium } from "playwright";

import { assertPngDimensions } from "./png.js";

const SHELL_URL = new URL("../assets/shell.html", import.meta.url).href;
const ASSETS_URL_PREFIX = new URL("../assets/", import.meta.url).href;
export const TRMNL_FRAMEWORK_VERSION = "3.2.0";

export function isBlockedRenderRequest(requestUrl, allowedOrigins = []) {
  try {
    const url = new URL(requestUrl);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return !new Set(allowedOrigins).has(url.origin);
    }
    return url.protocol === "file:" && !requestUrl.startsWith(ASSETS_URL_PREFIX);
  } catch {
    return true;
  }
}

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
    this.shellLoads = 0;
    this.blockedExternalRequests = 0;
    this.allowedNetworkRequests = 0;
    this.allowedOriginsByPage = new WeakMap();
    this.devtoolsByPage = new WeakMap();
  }

  async start() {
    this.browser = await chromium.launch({
      headless: true,
      executablePath: this.executablePath,
      args: [
        "--disable-dev-shm-usage",
        "--enable-precise-memory-info",
        "--no-sandbox"
      ]
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

  async render({ html, width, height, allowedAssetOrigins = [] }) {
    const totalStart = performance.now();
    const page = await this.#acquire();
    const queueEnd = performance.now();
    let healthy = true;
    try {
      this.allowedOriginsByPage.set(page, new Set(allowedAssetOrigins));
      await this.devtoolsByPage.get(page)?.send("Network.clearBrowserCache");
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
        if (typeof window.terminalize !== "function") {
          throw new Error("TRMNL Framework runtime is unavailable");
        }
        await window.terminalize();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
      const failedImages = await page.evaluate(() => Array.from(document.images)
        .filter((image) => image.naturalWidth === 0 || image.naturalHeight === 0)
        .map((image) => image.currentSrc || image.src));
      if (failedImages.length) {
        throw new Error(`Image assets failed to load: ${failedImages.join(", ")}`);
      }
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
      this.allowedOriginsByPage.delete(page);
      await this.#release(page, healthy);
    }
  }

  async diagnostics({ collectGarbage = false } = {}) {
    const pages = this.context?.pages() ?? [];
    const pageMetrics = [];
    for (const page of pages) {
      if (collectGarbage) {
        await page.requestGC();
      }
      pageMetrics.push(await page.evaluate(() => ({
        url: location.href,
        rootChildren: document.querySelector("#root")?.childElementCount ?? -1,
        frameworkBuild: window.__TRMNL_BUILD__,
        trmnlFontLoaded: document.fonts.check('16px "TRMNL16"'),
        mdiFontLoaded: document.fonts.check('24px "Material Design Icons"'),
        jsHeapBytes: performance.memory?.usedJSHeapSize ?? null
      })));
    }
    return {
      browserConnected: this.browser?.isConnected() ?? false,
      pageCount: pages.length,
      shellLoads: this.shellLoads,
      blockedExternalRequests: this.blockedExternalRequests,
      allowedNetworkRequests: this.allowedNetworkRequests,
      nodeRssBytes: process.memoryUsage().rss,
      pages: pageMetrics
    };
  }

  async #createPage() {
    if (!this.context) {
      throw new Error("Renderer context is unavailable");
    }
    const page = await this.context.newPage();
    const devtools = await this.context.newCDPSession(page);
    await devtools.send("Network.setCacheDisabled", { cacheDisabled: true });
    this.devtoolsByPage.set(page, devtools);
    page.setDefaultTimeout(this.renderTimeoutMs);
    await page.route("**/*", async (route) => {
      const requestUrl = route.request().url();
      const allowedOrigins = this.allowedOriginsByPage.get(page) ?? new Set();
      if (isBlockedRenderRequest(requestUrl, allowedOrigins)) {
        this.blockedExternalRequests += 1;
        await route.abort("blockedbyclient");
      } else {
        const protocol = new URL(requestUrl).protocol;
        if (protocol === "http:" || protocol === "https:") {
          this.allowedNetworkRequests += 1;
        }
        await route.continue();
      }
    });
    await page.goto(SHELL_URL, { waitUntil: "load" });
    this.shellLoads += 1;
    await page.evaluate(async (frameworkVersion) => {
      await document.fonts.load('16px "TRMNL16"', "OpenDisplay");
      await document.fonts.load('24px "Material Design Icons"');
      await document.fonts.ready;
      if (window.__TRMNL_BUILD__ !== `plugins.js v${frameworkVersion}`) {
        throw new Error(`Unexpected TRMNL Framework build: ${window.__TRMNL_BUILD__}`);
      }
      if (!document.fonts.check('16px "TRMNL16"')) {
        throw new Error("Bundled TRMNL font did not load");
      }
      if (!document.fonts.check('24px "Material Design Icons"')) {
        throw new Error("Bundled Material Design Icons font did not load");
      }
    }, TRMNL_FRAMEWORK_VERSION);
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
