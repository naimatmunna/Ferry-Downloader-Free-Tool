# syntax=docker/dockerfile:1.7
# Ferry — single-container image (API + worker + egress guard).
#   docker build -f deploy/Dockerfile -t ferry:1.0.0 .

# ---------- build the web app ----------
FROM node:24-trixie-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci --no-audit --no-fund
COPY packages packages
COPY apps apps
RUN npm run build \
 && npm prune --omit=dev --no-audit --no-fund

# ---------- runtime ----------
FROM node:24-trixie-slim AS runtime
ARG YTDLP_VERSION=2026.11.23

# FFmpeg and Python from Debian's signed repositories. tini reaps zombie engine processes.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg python3 python3-venv ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*

# yt-dlp pinned, without curl_cffi: browser impersonation must never be available.
RUN python3 -m venv /opt/yt-dlp \
 && /opt/yt-dlp/bin/pip install --no-cache-dir "yt-dlp[default]==${YTDLP_VERSION}" \
 && (/opt/yt-dlp/bin/pip uninstall -y curl_cffi curl-cffi >/dev/null 2>&1 || true) \
 && ! /opt/yt-dlp/bin/python -c "import curl_cffi" 2>/dev/null

RUN useradd --system --uid 10001 --home-dir /data --shell /usr/sbin/nologin ferry \
 && mkdir -p /data && chown ferry:ferry /data

WORKDIR /app
COPY --from=build --chown=root:root /app/package.json /app/package-lock.json ./
COPY --from=build --chown=root:root /app/node_modules node_modules
COPY --from=build --chown=root:root /app/packages packages
COPY --from=build --chown=root:root /app/apps/server apps/server
COPY --from=build --chown=root:root /app/apps/web/dist apps/web/dist

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    DATA_DIR=/data \
    YTDLP_PATH=/opt/yt-dlp/bin/yt-dlp \
    FFMPEG_PATH=/usr/bin/ffmpeg \
    FFPROBE_PATH=/usr/bin/ffprobe \
    PYTHONDONTWRITEBYTECODE=1

USER ferry
EXPOSE 8787
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/readyz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "apps/server/src/main.js"]
