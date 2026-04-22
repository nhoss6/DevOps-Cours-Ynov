# ARCHITECTURE — Vue d'ensemble TrainShop

## Diagramme des services

```
                            LOCALHOST (Machine hôte)
                            ════════════════════════

                         Navigateur web
                      (Firefox, Chrome, Safari...)
                                │
                                │ GET http://localhost:8080
                                │
              ┌─────────────────┴──────────────────┐
              │                                    │
              ▼                                    │
    ┌──────────────────────┐                      │
    │  Port 8080           │                      │
    │  (forwarded from 80) │                      │
    │                      │                      │
    │  ┌────────────────┐  │                      │
    │  │   Nginx        │  │                      │
    │  │   (web-1)      │  │                      │
    │  │ Port: 80       │  │                      │
    │  │                │  │                      │
    │  │ - Sert HTML    │  │                      │
    │  │ - CSS, JS      │  │                      │
    │  │ - Proxy /api/* │  │                      │
    │  │   vers api:3000│  │                      │
    │  └────────────────┘  │                      │
    └──────────────────────┘                      │
              │                                    │
              │ Requête HTTP                       │
              │ GET /api/products                  │
              │                                    │
              ▼                                    │
    ┌──────────────────────┐                      │
    │  Réseau Docker       │                      │
    │  trainshop_net       │                      │
    │  (bridge custom)     │                      │
    │  DNS interne         │                      │
    │                      │                      │
    │  Services:           │                      │
    │  ├─ web (nginx)      │                      │
    │  ├─ api (node.js)    │                      │
    │  ├─ db (postgres)    │                      │
    │  └─ cache (redis)    │                      │
    │                      │                      │
    │  ┌──────────────┐    │  ┌──────────────┐   │
    │  │   api-1      │    │  │  api-2       │   │
    │  │ (Node.js)    │    │  │ (Node.js)    │   │
    │  │ Port: 3000   │    │  │ Port: 3000   │   │
    │  │              │    │  │              │   │
    │  │ - Routes GET │    │  │ - Routes GET │   │
    │  │ - Routes POST│    │  │ - Routes POST│   │
    │  │ - Health     │    │  │ - Health     │   │
    │  │ - Cache      │    │  │ - Cache      │   │
    │  │ - DB access  │    │  │ - DB access  │   │
    │  └──────────────┘    │  └──────────────┘   │
    │         │            │         │            │
    │         │ (depends_on: service_healthy)    │
    │         │            │         │            │
    │         ▼            │         ▼            │
    │  ┌──────────────┐    │  ┌──────────────┐   │
    │  │   db-1       │    │  │ cache-1      │   │
    │  │ (PostgreSQL) │    │  │ (Redis)      │   │
    │  │ Port: 5432   │    │  │ Port: 6379   │   │
    │  │              │    │  │              │   │
    │  │ - TABLE      │    │  │ - Cache 30s  │   │
    │  │   products   │    │  │ - Stats      │   │
    │  │ - 10 rows    │    │  │ - Hits/miss  │   │
    │  │ - Persistent │    │  │              │   │
    │  │   volume     │    │  │              │   │
    │  └──────────────┘    │  └──────────────┘   │
    │         │            │         │            │
    │         │ Données    │         │            │
    │         │ seed via   │         │            │
    │         │ init.sql   │         │            │
    │         ▼            │         ▼            │
    │  ┌──────────────┐    │  (En mémoire)       │
    │  │  pgdata      │    │  (snapshots OK)     │
    │  │ (Volume)     │    │                     │
    │  │ Persistant   │    │                     │
    │  │ /var/lib/..  │    │                     │
    │  └──────────────┘    │                     │
    └──────────────────────┘                     │
                                                  │
                        (Communication externe)
                        (Logs aggregés)
                        (Stats Docker)
                                                  │
                                                  ▼
                                        Développeur / Trainer
                                        (Terminal Docker)
                                        docker compose ...
```

## Communication inter-services

### Flux normal d'une requête produit

```
Utilisateur
    │
    ├─ 1. Ouvre localhost:8080
    │
    ▼
Nginx (web)
    ├─ 2. Sert index.html (+ app.js, style.css)
    │     Charge app.js dans le navigateur
    │
    ▼
Navigateur exécute app.js
    ├─ 3. fetch('/api/products') toutes les 5s
    │
    ▼
Nginx (web) reçoit GET /api/products
    ├─ 4. Proxy vers http://api:3000/api/products
    │     (DNS interne Docker résout "api" → IP du container api-1)
    │
    ▼
Express (api-1)
    ├─ 5. Route GET /api/products reçue
    │     Check Redis : cache.get('products:all')
    │     ├─ Cache HIT → retourne JSON (rapide)
    │     └─ Cache MISS → query DB
    │
    ├─ 6. Query PostgreSQL (si miss)
    │     SELECT * FROM products (10 résultats)
    │     Stocke en Redis avec TTL 30s
    │     Retourne JSON au client
    │
    ▼
Nginx reçoit réponse JSON
    ├─ 7. Proxy la réponse vers le navigateur
    │
    ▼
Navigateur (app.js) reçoit JSON
    ├─ 8. Render la grille de produits
    │     Met à jour le DOM
    │     Affiche les cartes produits
    │
    ▼
Utilisateur voit la liste des produits
```

## Networking details

### Réseau trainshop_net (bridge custom)

```
trainshop_net (bridge)
  ├─ web    → IP interne (ex: 172.18.0.2) ← Hostname "web"
  ├─ api    → IP interne (ex: 172.18.0.3) ← Hostname "api"
  ├─ db     → IP interne (ex: 172.18.0.4) ← Hostname "db"
  └─ cache  → IP interne (ex: 172.18.0.5) ← Hostname "cache"

DNS interne Docker :
  - web.trainshop_net → 172.18.0.2
  - api.trainshop_net → 172.18.0.3
  - db.trainshop_net  → 172.18.0.4
  - cache.trainshop_net → 172.18.0.5

Depuis un container :
  $ ping db          → résout via DNS interne → 172.18.0.4
  $ curl http://api:3000/api/health  → OK (même réseau)
  $ curl http://localhost:3000  → FAIL (localhost = le container lui-même)
```

### Port mapping (hôte → container)

```
Hôte (localhost)         Container (bridge)
════════════════════════ ═══════════════════

localhost:8080 ────────► web:80         (Nginx)
localhost:3000 ────────► api:3000       (Express) — EN DEV UNIQUEMENT
                        db:5432         (Postgres) — NON EXPOSÉ en prod
                        cache:6379      (Redis) — NON EXPOSÉ
```

## Dépendances (depends_on)

```
Ordre de démarrage (dans docker-compose.yml) :

db (PostgreSQL)
  └─ healthcheck: pg_isready → "healthy" après ~5-10s
      │
      ▼
  api (Node.js) dépend de db:service_healthy
    └─ healthcheck: GET /api/health → "healthy" après ~15-20s
        │
        ├─ web (Nginx) dépend de api:service_healthy
        │   └─ healthcheck: GET / → "healthy" après ~5s
        │
        └─ cache (Redis) — no deps, démarre indépendamment
```

## Volumes

```
Machine hôte                   Container
════════════════════════════   ═════════════════════

(Volume nommé)
trainshop_pgdata ──────────► /var/lib/postgresql/data
                               (Base de données PostgreSQL)
                               Persistance entre redémarrages

Bind mount (DEV UNIQUEMENT, via compose.dev.yml)
./web/public ──────────────► /usr/share/nginx/html
./api/server.js ───────────► /app/server.js
(permet hot reload du code)

./db/init.sql ─────────────► /docker-entrypoint-initdb.d/init.sql
                               (exécuté au 1er démarrage)
```

## Multi-stage build (web)

```
Dockerfile (web/Dockerfile)
├─ Stage 1 : builder
│  FROM node:20-alpine (lourd ~150MB)
│  COPY package*.json
│  RUN npm ci
│  COPY public/
│  (Crée /build/public)
│
└─ Stage 2 : final
   FROM nginx:1.27-alpine (léger ~30MB)
   COPY --from=builder /build/public /usr/share/nginx/html
   COPY nginx.conf
   (Image finale = ~50MB, pas de node inclus)
```

## Flux de démarrage complet

```bash
$ docker compose up -d

1. Docker crée le réseau trainshop_net (bridge)
2. Docker crée les volumes trainshop_pgdata, cache_data
3. Docker démarre db (PostgreSQL)
   └─ init.sql exécuté automatiquement (CREATE TABLE, INSERT 10 produits)
   └─ healthcheck lance pg_isready chaque 10s
4. Docker démarre api (Node.js)
   └─ Attends que db soit healthy (depends_on: condition)
   └─ healthcheck teste GET /api/health
5. Docker démarre cache (Redis) — pas de dépendance
6. Docker démarre web (Nginx)
   └─ Attends que api soit healthy
   └─ healthcheck teste GET /

Après ~20-30s, tous les services sont "healthy" (vert dans docker compose ps)

$ docker compose ps
NAME                COMMAND                  SERVICE      STATUS
trainshop-web-1     "nginx -g daemon off"    web         Up 25s (healthy)
trainshop-api-1     "node server.js"         api         Up 30s (healthy)
trainshop-db-1      "postgres"               db          Up 35s (healthy)
trainshop-cache-1   "redis-server ..."       cache       Up 32s (health: starting)
```

## Scaling (--scale api=3)

```
$ docker compose up -d --scale api=3

Réseau trainshop_net
  ├─ web (Nginx) → Load balancer automatique
  │   └─ Proxy /api → api:3000
  │       ├─ api-1 (172.18.0.3:3000) Request 1
  │       ├─ api-2 (172.18.0.4:3000) Request 2
  │       └─ api-3 (172.18.0.5:3000) Request 3
  │          (Round-robin Docker built-in)
  │
  ├─ api-1, api-2, api-3 — toutes partagent
  │   ├─ Même DB (db:5432) — une seule BD
  │   └─ Même Cache (cache:6379) — un seul Redis
  │
  ├─ db — unique
  └─ cache — unique
```

Cache est partagé → hit rate optimal (10 copies du même produit en cache).

## Logs aggregés

```bash
$ docker compose logs -f

trainshop-web-1    | 2024-01-15T10:30:45.000Z INFO Nginx started
trainshop-api-1    | 2024-01-15T10:30:50.000Z INFO Server running on port 3000
trainshop-api-2    | 2024-01-15T10:30:51.000Z INFO Server running on port 3000
trainshop-api-3    | 2024-01-15T10:30:52.000Z INFO Server running on port 3000
trainshop-db-1     | 2024-01-15T10:30:40.000Z INFO Database initialized
trainshop-cache-1  | 2024-01-15T10:30:43.000Z INFO Redis ready

(Tous mélangés, mais distincts par couleur et préfixe de service)
```

## Sécurité (résumé)

```
+---------+           +---------+          +---------+
| Frontend|           | API     |          | Database|
| (nginx) |           | (node)  |          |(postgres)|
+---------+           +---------+          +---------+
   │                      │                     │
   ├─ 0.0.0.0:8080    ├─ localhost:3000    ├─ NOT exposed
   │  (accessible      │  (dev only via     │  (private, Compose)
   │   from browser)   │   compose.dev.yml)
   │
   └─ Non-root user (nginx)
                       └─ Non-root user (node) — USER node
                                           └─ Encrypted password (ne pas hardcoder)
```

## Persistance (BD)

```
Docker Engine
├─ /var/lib/docker/volumes/trainshop_pgdata/_data
│  ├─ base/
│  ├─ global/
│  ├─ pg_wal/  (Write-Ahead Logs)
│  └─ ...
│
└─ Survit :
   ├─ docker compose restart
   ├─ docker compose down
   └─ Jusqu'à docker compose down -v
```

## Performance (cache)

```
GET /api/products

Cas 1 : Cache HIT (30s)
  ├─ Request arrives → api-1
  ├─ Check Redis → HIT
  ├─ Return JSON
  └─ ~5ms latency (Redis fast)

Cas 2 : Cache MISS (after 30s TTL)
  ├─ Request arrives → api-1
  ├─ Check Redis → MISS
  ├─ Query PostgreSQL
  │  ├─ SELECT 10 rows
  │  └─ ~20-50ms latency (DB slower)
  ├─ Store in Redis (30s TTL)
  └─ Return JSON

Hit rate improving over time :
  └─ 5 requêtes = 0 hits, 5 miss (0%)
  └─ 100 requêtes (after 5s stable) = 95 hits, 5 miss (95%)
```
