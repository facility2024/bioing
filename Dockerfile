# syntax=docker/dockerfile:1.7

# ---------- Stage 1: build ----------
FROM oven/bun:1 AS builder
WORKDIR /app

# Instala dependências primeiro (cache-friendly)
COPY package.json bun.lock* bunfig.toml ./
RUN bun install --frozen-lockfile || bun install

# Copia o restante do código
COPY . .

# Força o preset do Nitro para gerar um servidor Node standalone
ENV NITRO_PRESET=node-server
RUN bun run build

# ---------- Stage 2: runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copia apenas o output do build (Nitro node-server gera server + estáticos em .output)
COPY --from=builder /app/.output ./.output

EXPOSE 3000

# Entry gerado pelo preset node-server do Nitro
CMD ["node", ".output/server/index.mjs"]
