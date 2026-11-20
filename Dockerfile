# Shared Dockerfile layout of the vibes projects: keep it in sync across them.

# Corepack runs pnpm (version from package.json `packageManager`); install it fresh rather than relying on the bundled one.
FROM node:24-bookworm-slim AS node
RUN npm install -g corepack && corepack enable
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /app

# Runs natively on the runner: the output is platform-independent JS, and vite's
# native binaries crash with SIGILL (exit 132) under QEMU arm64 emulation.
FROM --platform=$BUILDPLATFORM node AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
RUN pnpm install --frozen-lockfile
COPY . .
# The build validates the env vars (see src/env.ts) but does not inline them: placeholders are enough.
RUN DATABASE_URL=:memory: pnpm build

# Dependencies for the target platform: native packages ship per-platform binaries.
# Only `dependencies`: adapter-node bundles everything else into the build output.
FROM node AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
RUN pnpm install --frozen-lockfile --prod

FROM node:24-bookworm-slim
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
# Migrations are applied on server start.
COPY --from=build /app/drizzle ./drizzle

ENV NODE_ENV=production \
	HOST=0.0.0.0 \
	PORT=3000 \
	DATABASE_URL=file:/data/local.db
VOLUME /data
EXPOSE 3000

CMD ["node", "build"]
