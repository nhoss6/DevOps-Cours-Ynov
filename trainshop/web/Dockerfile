# Multi-stage Dockerfile pour le frontend TrainShop
# Stage 1 : Builder (si besoin de compilation, ici simple serve)
# Stage 2 : Nginx alpine final

FROM node:20-alpine AS builder
LABEL maintainer="MD Consulting Digital"
LABEL description="TrainShop web builder stage"

WORKDIR /build

# Copie package.json (optionnel si on a juste du statique)
COPY package*.json ./

# Installe les dépendances (ici aucune, mais bonne pratique)
RUN npm ci --prefer-offline || true

# Copie les fichiers publics
COPY public ./public

# Optionnel : minifier CSS/JS (ici on skip pour simplicité)
# RUN npm run build


# Stage 2 : Nginx alpine pour servir le frontend
FROM nginx:1.27-alpine
LABEL maintainer="MD Consulting Digital"
LABEL description="TrainShop web server (nginx)"

# Copie les fichiers publics depuis le builder
COPY --from=builder /build/public /usr/share/nginx/html

# Copie la configuration nginx custom (proxy /api vers api:3000)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose le port 80 (ngix par défaut)
EXPOSE 80

# Healthcheck : vérifie que nginx répond
HEALTHCHECK --interval=10s --timeout=3s --retries=3 --start-period=5s \
  CMD wget -q -O - http://localhost/ || exit 1

# Commande par défaut : nginx en foreground
CMD ["nginx", "-g", "daemon off;"]
