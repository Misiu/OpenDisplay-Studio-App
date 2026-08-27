# syntax=docker/dockerfile:1.18
FROM mcr.microsoft.com/playwright:v1.62.1-noble@sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e

ARG BUILD_VERSION=0.5.0
ARG BUILD_ARCH

ENV NODE_ENV=production \
    ODX_VERSION=${BUILD_VERSION} \
    ODX_DATA_DIR=/data \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app
COPY rootfs/app/package.json rootfs/app/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts \
    && npm cache clean --force

COPY rootfs/app/src/ ./src/
COPY rootfs/app/assets/ ./assets/
RUN mkdir -p /data

EXPOSE 8099
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8099/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "/app/src/index.js"]

LABEL \
  io.hass.type="app" \
  io.hass.version="${BUILD_VERSION}" \
  io.hass.arch="${BUILD_ARCH}" \
  org.opencontainers.image.title="Home Assistant App: OpenDisplay Studio Renderer" \
  org.opencontainers.image.description="Persistent Chromium HTML-to-PNG renderer" \
  org.opencontainers.image.source="https://github.com/Misiu/OpenDisplay-Studio-App" \
  org.opencontainers.image.licenses="MIT"
