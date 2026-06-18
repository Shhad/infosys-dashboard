# Multi-stage build: no Node required on the host.
# VITE_* values are build-time only — they are inlined into the bundle here.

# --- Stage 1: build the static bundle ---
FROM node:20-alpine AS build
WORKDIR /app

# Build-time API URLs (defaults match the local docker-compose stack).
ARG VITE_AUTH_BASE_URL=http://localhost:8000
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_AUTH_BASE_URL=$VITE_AUTH_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# --- Stage 2: serve the static files ---
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
