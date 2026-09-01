# --- deps: full install (build needs devDependencies) ---
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- builder: generate Prisma client + build Next.js ---
FROM node:22-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
# .next/cache (build-time incremental-compile cache) and .next/dev are
# useless at runtime — next start's own required-server-files.json never
# references either — but were being copied into the runner image and
# pushed/pulled on every single deploy anyway. Measured on a real build:
# 221MB total .next output, only ~22MB (server + static + manifests)
# actually needed; the other ~200MB was pure network cost on every deploy.
RUN rm -rf .next/cache .next/dev

# --- prod-deps: production-only node_modules for the runtime image ---
FROM node:22-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- runner: production image ---
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma7.config.ts ./prisma7.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

# prisma CLI + tsx aren't in prod deps (they're devDependencies); the
# entrypoint needs them to run `prisma migrate deploy` before starting.
COPY --from=deps /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=deps /app/node_modules/@prisma/config ./node_modules/@prisma/config
COPY --from=deps /app/node_modules/dotenv ./node_modules/dotenv

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
ENV PORT=3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
