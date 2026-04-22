FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY .npmrc* ./

COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/notifications/package.json packages/notifications/
COPY services/wa-bot/package.json services/wa-bot/

RUN pnpm install --frozen-lockfile --filter @ru/wa-bot...

COPY packages/config/ packages/config/
COPY packages/db/ packages/db/
COPY packages/notifications/ packages/notifications/
COPY services/wa-bot/ services/wa-bot/

RUN pnpm --filter @ru/db exec prisma generate
RUN pnpm --filter @ru/wa-bot... run build

WORKDIR /app/services/wa-bot

RUN printf '#!/bin/sh\nset -e\nmkdir -p /data/wwebjs_auth/session /data/wwebjs_cache\nln -sfn /data/wwebjs_auth .wwebjs_auth\nln -sfn /data/wwebjs_cache .wwebjs_cache\nexec node dist/index.js\n' > /app/services/wa-bot/start.sh \
  && chmod +x /app/services/wa-bot/start.sh

CMD ["./start.sh"]
