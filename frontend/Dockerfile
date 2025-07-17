# syntax=docker/dockerfile:1
FROM node:24-slim AS builder
WORKDIR /app
COPY index.html ./
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY public ./public
COPY src ./src
RUN npm install
RUN npm run build

# Production image
FROM nginx:alpine AS static
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/dist .
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# --- Development image for Vite dev server ---
FROM node:24-slim AS dev
WORKDIR /app
COPY --from=builder /app .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# --- Final stage ---
FROM static AS final

# Entrypoint logic (choose static or dev)
ENTRYPOINT ["/bin/sh", "-c"]
CMD [ "if [ \"$BUILD_MODE\" = \"dev\" ]; then npm run dev -- --host; else nginx -g 'daemon off;'; fi" ] 