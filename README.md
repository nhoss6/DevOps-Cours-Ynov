# TrainShop — Projet de Formation Docker

## Présentation

TrainShop est un projet multi-services Docker prêt à l'emploi pour formateurs et apprenants DevOps. Il couvre l'ensemble des concepts abordés dans un cours Docker de 3 jours : images, containers, Compose, volumes, réseaux, healthchecks, bind mounts, multi-stage builds, scaling et logs.

Il s'agit d'une application de catalogue produits complète avec 4 services interconnectés, du cache, une base de données persistante et un frontend. Chaque concept Docker est appliqué dans un contexte réel.

| | |
|---|---|
| **Formateur** | Mohamed Djabi — MD Consulting Digital |
| **Public** | Apprenants DevOps (Jour 1 à 3, ou Jour 2 à 4) |
| **Durée de setup** | 2 minutes (Docker Desktop requis) |

---

## Prérequis

- Docker Desktop 4.20+ installé et démarré
- Sur Windows : WSL2 activé
- Terminal ouvert (cmd, PowerShell, bash ou zsh)
- VS Code recommandé

Vérification :

```bash
docker --version
docker compose version
docker ps
```

---

## Démarrage

### 1. Cloner le projet

```bash
cd C:\Users\moham\Downloads
git clone https://github.com/nhoss6/DevOps-Cours-Ynov.git trainshop
```

### 2. Configurer l'environnement

```bash
cd trainshop
cp .env.example .env
```

Contenu du fichier `.env` :

```
POSTGRES_USER=trainer
POSTGRES_PASSWORD=trainshop_dev_only
POSTGRES_DB=trainshop
WEB_PORT=8080
API_PORT=3000
NODE_ENV=production
REDIS_URL=redis://cache:6379
```

### 3. Lancer les services

```bash
docker compose up -d
```

Attendre 10 à 15 secondes le temps que PostgreSQL démarre.

---

## Vérification

### Navigateur

Ouvrir `http://localhost:8080`. La page doit afficher :

- L'en-tête TrainShop — Catalogue Produits
- Une liste de 10 produits avec nom, prix et stock
- Un badge vert "Services en bonne santé" en bas de page

### Terminal

```bash
docker ps
docker compose ps
docker compose logs -f api
curl http://localhost:3000/api/products
curl http://localhost:3000/api/health
```

---

## Architecture

```
             Machine locale (Windows / macOS / Linux)
             ==========================================
                          localhost

                 +----------------------+
                 |      Navigateur      |
                 |    :8080 (nginx)     |
                 +----------------------+
                           |
         +-----------------+-----------------+
         |                 |                 |
         v                 v                 v
 +-------------+   +-------------+   +-------------+
 |     web     |   |     api     |   |     db      |
 |   (nginx)   |   |  (Node.js)  |   | (Postgres)  |
 | :8080->:80  |   | :3000->3000 |   |    :5432    |
 +-------------+   +-------------+   +-------------+
                         |                 |
                         v                 v
                  +-------------+   +-------------+
                  |    cache    |   |   pgdata    |
                  |   (Redis)   |   |  (Volume)   |
                  |    :6379    |   | Persistant  |
                  +-------------+   +-------------+

Reseau : trainshop_net (bridge custom)
Communication par DNS interne (api -> db, api -> cache)
```

### Services

| Service | Image | Role |
|---------|-------|------|
| web | nginx alpine | Fichiers statiques, proxy /api vers api:3000 |
| api | Node.js 20 alpine | Express, routes /api/*, DB et cache |
| db | PostgreSQL 16 | Table products, init via init.sql |
| cache | Redis 7 | Cache produits, TTL 30s |

---

## Commandes de référence

### Cycle de vie

```bash
docker compose up -d
docker compose ps
docker compose logs -f api
docker compose down
docker compose down -v
docker compose restart api
```

### Accès aux containers

```bash
docker compose exec api sh
docker compose exec api node --version
docker compose exec db psql -U trainer -d trainshop -c "SELECT * FROM products LIMIT 3;"
```

### Images et nettoyage

```bash
docker images | grep trainshop
docker compose build --no-cache api
docker system prune -a --volumes
```

### Debugging

```bash
docker compose ps api
docker inspect trainshop-api-1
docker stats trainshop-api-1
docker compose exec api wget -q -O - http://localhost:3000/api/health
```

---

## Fichiers de formation

| Fichier | Contenu |
|---------|---------|
| `DEMO_GUIDE.md` | 50+ commandes classées par chapitre avec notes pédagogiques |
| `docs/ARCHITECTURE.md` | Schéma détaillé et communication entre services |
| `docs/EXERCISES.md` | 15 exercices progressifs par chapitre |

Tous les fichiers source sont commentés en français.

---

## Reset

```bash
# Arrêt propre, données conservées
docker compose down

# Suppression complète des données
docker compose down -v

# Relancer depuis zéro
docker compose up -d
```

En cas de problème, consulter `docs/TROUBLESHOOTING.md`.

---

## Mode développement

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

Les fichiers `web/public/*.html` et `api/server.js` sont montés en bind mount. Toute modification est prise en compte sans rebuild.

Retour en production :

```bash
docker compose down
docker compose up -d
```

---

## Contact

Mohamed Djabi — MD Consulting Digital  
contact@md-consulting.fr
