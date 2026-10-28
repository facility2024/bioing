# syntax=docker/dockerfile:1.7

# ---------- Stage 1: build ----------
FROM oven/bun:1 AS builder
WORKDIR /app

# Dependências primeiro (cache-friendly)
COPY package.json bun.lock* bunfig.toml ./
RUN bun install --frozen-lockfile || bun install

# Código
COPY . .

# Variáveis públicas do Supabase precisam existir durante a build do Vite.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}

# Preset do Nitro: servidor Node standalone
ENV NITRO_PRESET=node-server

RUN bun run build

# ---------- Stage 2: runtime ----------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Output do Nitro (server + estáticos)
COPY --from=builder /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
