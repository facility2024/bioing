# syntax=docker/dockerfile:1.7

# ---------- Stage 1: build ----------
FROM oven/bun:1 AS builder
WORKDIR /app

# Dependências primeiro (cache-friendly)
COPY package.json bun.lock* bunfig.toml ./
RUN bun install --frozen-lockfile || bun install

# Código
COPY . .

# Variáveis públicas do Vite precisam existir no BUILD
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG SUPABASE_URL
ARG SUPABASE_PUBLISHABLE_KEY

# Preset do Nitro: servidor Node standalone
ENV NITRO_PRESET=node-server

RUN set -eu; \
  export VITE_SUPABASE_URL="${VITE_SUPABASE_URL:-${SUPABASE_URL:-}}"; \
  export VITE_SUPABASE_PUBLISHABLE_KEY="${VITE_SUPABASE_PUBLISHABLE_KEY:-${SUPABASE_PUBLISHABLE_KEY:-}}"; \
  bun run build

# ---------- Stage 2: runtime ----------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

ARG SUPABASE_URL
ARG SUPABASE_PUBLISHABLE_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV SUPABASE_URL=${SUPABASE_URL}
ENV SUPABASE_PUBLISHABLE_KEY=${SUPABASE_PUBLISHABLE_KEY}
ENV SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}

# Output do Nitro (server + estáticos)
COPY --from=builder /app/.output ./.output

EXPOSE 3000

CMD ["sh", "-c", "export SUPABASE_URL=\"${SUPABASE_URL:-$VITE_SUPABASE_URL}\"; export SUPABASE_PUBLISHABLE_KEY=\"${SUPABASE_PUBLISHABLE_KEY:-$VITE_SUPABASE_PUBLISHABLE_KEY}\"; exec node .output/server/index.mjs"]
