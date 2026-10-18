FROM node:20-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-slim

# ffmpeg é obrigatório para a geração de vídeo (provider ffmpeg-slideshow).
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg curl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

# Artefatos gerados (imagens/vídeos) servidos em /files/*
RUN mkdir -p /app/uploads

EXPOSE 3000

# Migrations NÃO rodam automaticamente no boot (evita falhas de schema engine
# e segue boas práticas: rode `npx prisma migrate deploy` como passo separado
# no pipeline de deploy / Railway Release Command).
# Se o schema estiver desatualizado, a API falhará ao iniciar — o que é desejável.
CMD ["node", "dist/src/main.js"]