# syntax=docker/dockerfile:1.7

# ---------- Stage 1: build ----------
FROM oven/bun:1 AS builder
WORKDIR /app

# Instala dependências primeiro (cache-friendly)
COPY package.json bun.lock* bunfig.toml ./
RUN bun install --frozen-lockfile || bun install

# Copia o restante do código
COPY . .

# Variáveis públicas do backend precisam existir também no BUILD.
# Em deploy via GitHub/Docker, configure como build args ou secrets do provedor:
#   VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY
# Também aceitamos SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY e espelhamos para VITE_*.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG SUPABASE_URL
ARG SUPABASE_PUBLISHABLE_KEY

# Força o preset do Nitro para gerar um servidor Node standalone
ENV NITRO_PRESET=node-server
# Fallback: se as variáveis não vierem por build-arg, o Vite lê do .env
# presente no repositório (copiado no passo anterior).
RUN set -eu; \
  if [ -n "${VITE_SUPABASE_URL:-${SUPABASE_URL:-}}" ]; then \
    export VITE_SUPABASE_URL="${VITE_SUPABASE_URL:-${SUPABASE_URL}}"; \
  fi; \
  if [ -n "${VITE_SUPABASE_PUBLISHABLE_KEY:-${SUPABASE_PUBLISHABLE_KEY:-}}" ]; then \
    export VITE_SUPABASE_PUBLISHABLE_KEY="${VITE_SUPABASE_PUBLISHABLE_KEY:-${SUPABASE_PUBLISHABLE_KEY}}"; \
  fi; \
  bun run build

# ---------- Stage 2: runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

ARG SUPABASE_URL
ARG SUPABASE_PUBLISHABLE_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ENV SUPABASE_URL=${SUPABASE_URL}
ENV SUPABASE_PUBLISHABLE_KEY=${SUPABASE_PUBLISHABLE_KEY}
ENV SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}

# Copia apenas o output do build (Nitro node-server gera server + estáticos em .output)
COPY --from=builder /app/.output ./.output

EXPOSE 3000

# Entry gerado pelo preset node-server do Nitro.
# Em alguns painéis, as variáveis públicas ficam apenas com prefixo VITE_*;
# espelhamos no runtime para o backend também encontrar SUPABASE_URL/KEY.
CMD ["sh", "-c", "export SUPABASE_URL=\"${SUPABASE_URL:-$VITE_SUPABASE_URL}\"; export SUPABASE_PUBLISHABLE_KEY=\"${SUPABASE_PUBLISHABLE_KEY:-$VITE_SUPABASE_PUBLISHABLE_KEY}\"; exec node .output/server/index.mjs"]
