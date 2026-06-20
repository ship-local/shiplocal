#!/usr/bin/env bash
# Sync ShipLocal Core (public OSS subset) to a sibling git repo for github.com/ship-local/shiplocal
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-$ROOT/../shiplocal-core}"

echo "→ Syncing Core from $ROOT"
echo "→ Target: $TARGET"

mkdir -p "$TARGET"

rsync -a --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude 'dist' \
  --exclude '.turbo' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude 'apps/server/.env' \
  --exclude 'apps/dashboard/.env.local' \
  --exclude 'packages/feedback-overlay' \
  --exclude 'discuss*.md' \
  --exclude 'DEVELOPMENT.md' \
  --exclude 'docs/articles' \
  --exclude 'apps/server/src/generated' \
  --exclude '.pnpm-store' \
  "$ROOT/" "$TARGET/"

# Core README and edition defaults
cp "$ROOT/README.core.md" "$TARGET/README.md"

if ! grep -q '^SHIPLOCAL_EDITION=' "$TARGET/apps/server/.env.example" 2>/dev/null; then
  echo '' >> "$TARGET/apps/server/.env.example"
  echo '# core = OSS tunnel only | cloud = full SaaS (private repo only)' >> "$TARGET/apps/server/.env.example"
  echo 'SHIPLOCAL_EDITION=core' >> "$TARGET/apps/server/.env.example"
fi

if ! grep -q '^NEXT_PUBLIC_SHIPLOCAL_EDITION=' "$TARGET/apps/dashboard/.env.example" 2>/dev/null; then
  echo '' >> "$TARGET/apps/dashboard/.env.example"
  echo 'NEXT_PUBLIC_SHIPLOCAL_EDITION=core' >> "$TARGET/apps/dashboard/.env.example"
fi

# Core Dockerfile without feedback-overlay (optional self-host)
cat > "$TARGET/deploy/Dockerfile.server.core" << 'DOCKER'
# Core edition — tunnel server without feedback overlay
FROM node:22-alpine AS base
ENV CI=1 SHIPLOCAL_EDITION=core
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN rm -rf node_modules && pnpm install --frozen-lockfile
RUN pnpm --filter @shiplocal/shared build \
 && pnpm --filter @shiplocal/server build \
 && pnpm --filter @shiplocal/server db:generate

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production SHIPLOCAL_EDITION=core
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/server/package.json ./apps/server/package.json
COPY --from=build /app/apps/server/prisma ./apps/server/prisma
COPY --from=build /app/apps/server/prisma.config.ts ./apps/server/
COPY --from=build /app/apps/server/src/generated ./apps/server/src/generated
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
EXPOSE 4000
CMD ["node", "apps/server/dist/index.js"]
DOCKER

if [[ ! -d "$TARGET/.git" ]]; then
  echo "→ Initializing git in $TARGET"
  git -C "$TARGET" init -b main
  git -C "$TARGET" remote add origin https://github.com/ship-local/shiplocal.git 2>/dev/null || true
fi

echo ""
echo "✓ Core sync complete."
echo ""
echo "Next steps:"
echo "  cd $TARGET"
echo "  git add -A && git status"
echo "  git commit -m \"chore: sync Core from Cloud monorepo\""
echo "  git push -u origin main"
echo ""
echo "Ensure github.com/ship-local/shiplocal is PUBLIC (Settings → Danger zone → Change visibility)."
