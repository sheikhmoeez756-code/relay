# Build stage: install all dependencies and compile the Next.js app.
FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# Runtime stage: only what the custom server and migrations need, no source or local data.
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/package*.json /app/server.ts /app/next.config.ts /app/tsconfig.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/prisma ./prisma
RUN mkdir -p uploads && chown node:node uploads
USER node
EXPOSE 3000
# Run node directly (no npm/tsx wrapper processes) to stay well inside small memory limits.
CMD ["sh", "-c", "npx prisma migrate deploy && exec node --import tsx server.ts"]
