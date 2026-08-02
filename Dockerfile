FROM node:24-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV WRANGLER_WRITE_LOGS=false
ENV WRANGLER_LOG_PATH=/app/.wrangler/logs
ENV MINIFLARE_REGISTRY_PATH=/app/.wrangler/registry

COPY --from=build /app /app
RUN mkdir -p /app/.wrangler/state /app/.wrangler/logs /app/.wrangler/registry /app/node_modules/.vite-temp \
  && chown -R node:node /app/.wrangler /app/node_modules/.vite-temp

USER node
EXPOSE 3000

HEALTHCHECK --interval=20s --timeout=5s --start-period=25s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["npm", "run", "preview:docker"]
