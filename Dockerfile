# --- build ---
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite підставляє ці змінні на етапі build
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_DISABLE_GOOGLE_API=false
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
ENV VITE_DISABLE_GOOGLE_API=$VITE_DISABLE_GOOGLE_API

# VITE_API_BASE_URL НЕ задаємо — лишаємо порожнім для same-origin /api
RUN npm run build

# --- run ---
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80