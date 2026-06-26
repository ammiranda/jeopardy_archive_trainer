# syntax=docker/dockerfile:1
FROM node:24-slim AS builder
WORKDIR /app
COPY index.html ./
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY public ./public
COPY src ./src
RUN --mount=type=cache,target=/app/node_modules,id=frontend-node-modules \
    npm install && npm run build

# Production image
FROM nginx:alpine AS static
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/dist .
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# --- Development image for Vite dev server ---
FROM node:24-slim AS dev
WORKDIR /app
COPY index.html ./
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY public ./public
COPY src ./src
RUN npm install
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# --- Final stage (production) ---
FROM static AS final 