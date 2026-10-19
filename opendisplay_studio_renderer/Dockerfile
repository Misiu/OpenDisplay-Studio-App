# syntax=docker/dockerfile:1.18
FROM mcr.microsoft.com/playwright:v1.64.1-noble@sha256:7852dc5a7d72f5fe458a597d690f6c42fbc8e9e26ddfa95f8e6ef552558d9bbf

ARG BUILD_VERSION=0.6.0
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
