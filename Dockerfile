# Dockerfile — Servidor TRANSJAP Horímetro
FROM node:20-alpine AS builder

WORKDIR /app

# Copia manifestos de dependências
COPY package*.json ./
RUN npm ci

# Copia código fonte
COPY . .

# Build do frontend e backend
RUN npm run build

# Imagem de produção enxuta
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["node", "dist/server.js"]
