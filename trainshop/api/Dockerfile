# Dockerfile pour l'API TrainShop
# Node.js 20 alpine, Express, PostgreSQL + Redis

FROM node:20-alpine
LABEL maintainer="MD Consulting Digital"
LABEL description="TrainShop API server"

WORKDIR /app

# Copie les manifests npm
COPY package*.json ./

# Installe les dépendances (production uniquement, sans devDependencies)
RUN npm install --omit=dev

# Copie le code source
COPY . .

# Environnement
ENV NODE_ENV=production
ENV PORT=3000

# Expose le port
EXPOSE 3000

# Healthcheck : vérifie l'endpoint /api/health
HEALTHCHECK --interval=10s --timeout=3s --retries=3 --start-period=15s \
  CMD wget -q -O - http://localhost:3000/api/health || exit 1

# User non-root pour la sécurité
USER node

# Commande de démarrage
CMD ["node", "server.js"]
