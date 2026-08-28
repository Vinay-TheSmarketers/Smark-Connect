FROM node:22-bookworm-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV="production"
ENV PORT="3000"
ENV HOSTNAME="0.0.0.0"
ENV CHROME_PATH="/usr/bin/chromium"
ENV SMARK_REPORT_PYTHON="/app/.venv-report/bin/python"

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        chromium \
        fonts-dejavu-core \
        fonts-liberation \
        libharfbuzz0b \
        libharfbuzz-subset0 \
        libjpeg62-turbo \
        libopenjp2-7 \
        libpango-1.0-0 \
        libpangoft2-1.0-0 \
        python3 \
        python3-pip \
        python3-venv \
        shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
    && corepack prepare pnpm@11.19.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN python3 -m venv /app/.venv-report \
    && /app/.venv-report/bin/pip install --no-cache-dir --upgrade pip \
    && /app/.venv-report/bin/pip install --no-cache-dir -r requirements-report.txt

RUN pnpm exec prisma generate
RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
