# === Build stage ===
FROM oven/bun:1.4-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json bun.lockb* ./
COPY prisma ./prisma

# Instalar dependências
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# Gerar Prisma Client
RUN bunx prisma generate

# Copiar código e buildar
COPY . .
RUN bunx nest build

# === Production stage ===
FROM oven/bun:1.4-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copiar apenas o necessário do builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

# Rodar migrations e iniciar
CMD bunx prisma migrate deploy && bun run dist/main.js
