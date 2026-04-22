# DEMO_GUIDE — 50+ Commandes Docker à vivre sur TrainShop

Ce document guide le **formateur** pour chaque chapitre du cours Docker.  
Chaque section correspond à un jour ou thème du cours. Tape les commandes **en direct** sur le projet.

Format : 
- **Commande** à taper
- **Observation** — ce que l'apprenant doit voir/apprendre

---

## JOUR 1 — Docker Fondamentaux

### Chapitre 1 — Installer et vérifier

```bash
docker --version
```
> Observation : affiche "Docker version 27.x.x" ou plus récent

```bash
docker compose version
```
> Observation : "Docker Compose version 2.x.x"

```bash
docker info
```
> Observation : résumé complet de l'install Docker : Runtime, OS, images, containers, storage driver

```bash
docker run hello-world
```
> Observation : message d'accueil Docker, confirme que l'engine fonctionne. Note : ce container se termine seul et disparaît de `docker ps` (car pas `-d`).

### Chapitre 2 — Les images

```bash
docker images
```
> Observation : liste les images locales. On voit `hello-world` (tout frais), plus les images trainshop si tu as déjà buildup.

```bash
docker images trainshop*
```
> Observation : filtre pour voir juste nos images custom

```bash
docker search nginx
```
> Observation : cherche "nginx" dans Docker Hub (affiche les premiers résultats)

```bash
docker pull nginx:1.27-alpine
```
> Observation : télécharge l'image officielle nginx. Plus rapide si c'est déjà en cache.

```bash
docker inspect nginx:1.27-alpine
```
> Observation : détails complets de l'image : env vars, commande par défaut, volumes, exposés, etc. JSON.

```bash
docker image history nginx:1.27-alpine
```
> Observation : les couches (layers) de l'image, taille de chaque RUN/ADD/COPY. Montre pourquoi multi-stage build est utile.

### Chapitre 3 — Les containers

```bash
cd C:\Users\moham\Downloads\trainshop
docker compose up -d
```
> Observation : lance TrainShop. Affiche "Created container trainshop-web-1..." pour chaque service.

```bash
docker ps
```
> Observation : 4 containers actifs :
> - trainshop-web-1 (nginx, port 8080→80)
> - trainshop-api-1 (Node.js, port 3000→3000)
> - trainshop-db-1 (PostgreSQL, port 5432 non mappé)
> - trainshop-cache-1 (Redis, port 6379 non mappé)

```bash
docker ps -a
```
> Observation : les mêmes 4 + éventuellement des containers terminés d'avant (status Exited)

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
```
> Observation : format custom, plus lisible. Montre comment filtrer l'output.

### Chapitre 4 — Les logs

```bash
docker compose logs
```
> Observation : tout ce que tous les containers ont écrit sur stdout/stderr depuis le démarrage. Mélange coloré.

```bash
docker compose logs api
```
> Observation : juste les logs de l'api (Express startup message, si quelqu'un accède à l'app).

```bash
docker compose logs -f api
```
> Observation : `-f` = follow. Reste connecté et affiche les nouveaux logs en temps réel.
> Pendant ce temps, dans un autre terminal, ouvre http://localhost:8080 → tu vois les requêtes HTTP dans le log.
> Fais `Ctrl+C` pour sortir du follow.

```bash
docker compose logs --tail 20 db
```
> Observation : dernier 20 lignes du log Postgres. Utile pour ne pas être submergé.

```bash
docker compose logs api --timestamps
```
> Observation : ajoute timestamps à chaque ligne.

### Chapitre 5 — Executer des commandes dans un container

```bash
docker compose exec api node --version
```
> Observation : affiche v20.x.x. Montre que Node 20 tourne bien.

```bash
docker compose exec api sh
```
> Observation : lance un shell interactif. Tu es **dedans** le container.
> Tape `ls /app` → vois server.js, package.json
> Tape `ps aux` → vois les processus (node est root)
> Tape `cat /app/server.js | head -20` → vois les premières lignes du code
> Tape `exit` pour sortir du shell.

```bash
docker compose exec -u root api sh
```
> Observation : rentre en tant que root (par défaut user=node). Démontre les limites de sécurité.

```bash
docker compose exec db psql -U trainer -d trainshop -c "SELECT COUNT(*) FROM products;"
```
> Observation : exécute une requête SQL directement. Affiche 10 (le nombre de produits seed).

```bash
docker compose exec db psql -U trainer -d trainshop -c "SELECT name, price FROM products LIMIT 5;"
```
> Observation : affiche 5 produits et leurs prix. Montre que la BD est bien initialisée.

---

## JOUR 2 — Dockerfile & Images Custom

### Chapitre 6 — Lire un Dockerfile

```bash
cat api/Dockerfile
```
> Observation : affiche le Dockerfile de l'API. Points clés :
> - `FROM node:20-alpine` → image de base légère
> - `WORKDIR /app` → répertoire de travail
> - `COPY package*.json ./` → copie des dépendances
> - `RUN npm install --omit=dev` → pas de devDependencies en prod
> - `EXPOSE 3000` → documente le port (non-binding)
> - `HEALTHCHECK` → curl l'endpoint /api/health
> - `USER node` → switch vers utilisateur non-root pour sécurité
> - `CMD ["node", "server.js"]` → commande par défaut

```bash
cat web/Dockerfile
```
> Observation : multi-stage build. Démontre comment réduire la taille finale.
> - Stage 1 : node:20-alpine (builder, lourd mais temporaire)
> - Stage 2 : nginx:1.27-alpine (final, léger, copy depuis stage 1)

### Chapitre 7 — Construire une image

```bash
docker compose build api
```
> Observation : rebuild l'image trainshop-api:1.0. Montre les étapes RUN/COPY et cache.
> Si aucun changement, "Using cache" pour chaque étape (rapide).

```bash
docker compose build --no-cache api
```
> Observation : rebuild sans cache. Chaque RUN est re-exécuté (plus lent). Utile pour tester un dépôt npm frais.

```bash
docker compose build api --progress=plain
```
> Observation : affiche plus de détails sur chaque étape (--progress).

```bash
time docker compose build api
```
> Observation : mesure le temps de build. Compare avec/sans cache.

### Chapitre 8 — Inspecter les couches d'une image

```bash
docker image history trainshop-api:1.0
```
> Observation : montre les couches (layers) et leur taille. Démontre la réutilisation du cache.

```bash
docker image inspect trainshop-api:1.0
```
> Observation : JSON complet de l'image. Voir :
> - `Config.ExposedPorts` → "3000/tcp"
> - `Config.Healthcheck` → l'URL du healthcheck
> - `Config.WorkingDir` → "/app"
> - `Config.Env` → les variables d'env baked-in

### Chapitre 9 — Tagger et renommer une image

```bash
docker tag trainshop-api:1.0 trainshop-api:latest
```
> Observation : crée un alias "latest" qui pointe vers 1.0 (pas de copie, juste un tag).

```bash
docker images trainshop-api
```
> Observation : vois deux lignes pour la même image (1.0 et latest, IMAGE ID identique).

```bash
docker tag trainshop-web:1.0 docker.io/trainer/trainshop-web:1.0
```
> Observation : prépare l'image pour un push vers un registry (si tu avais des credentials).

### Chapitre 10 — Build avec argument

```bash
# Modifier web/Dockerfile : ajouter ARG NODE_ENV après FROM
# ARG NODE_ENV=production
# RUN echo "Building for ${NODE_ENV}" > /tmp/env.txt
docker compose build --build-arg NODE_ENV=staging web
```
> Observation : passe un argument au Dockerfile pour personnaliser le build. (Exemple pédagogique.)

---

## JOUR 2 (suite) — Volumes & Persistance

### Chapitre 11 — Volumes nommés

```bash
docker volume ls
```
> Observation : affiche les volumes. Tu dois voir `trainshop_pgdata` (créé par Compose pour la DB).

```bash
docker volume inspect trainshop_pgdata
```
> Observation : détails du volume :
> - `Mountpoint` : où c'est stocké sur la machine hôte
> - `Driver` : local (par défaut)
> - `Labels` : metadata

```bash
docker volume create my-data
```
> Observation : crée un nouveau volume. Inutilisé pour le moment.

```bash
docker volume ls
```
> Observation : `my-data` apparaît.

```bash
docker volume rm my-data
```
> Observation : supprime le volume. S'il était en use, ça aurait échoué.

### Chapitre 12 — Données persistantes : test

```bash
docker compose exec db psql -U trainer -d trainshop -c "INSERT INTO products (name, price, stock) VALUES ('Test Docker', 99.99, 5);"
```
> Observation : ajoute un produit à la BD.

```bash
docker compose exec db psql -U trainer -d trainshop -c "SELECT COUNT(*) FROM products;"
```
> Observation : affiche 11 (10 seed + 1 ajouté).

```bash
docker compose down
```
> Observation : arrête tout mais **préserve le volume pgdata**.

```bash
docker compose up -d
```
> Observation : relance. La BD redémarre et charge le volume.

```bash
docker compose exec db psql -U trainer -d trainshop -c "SELECT COUNT(*) FROM products;"
```
> Observation : affiche toujours 11. Les données persistent ! Montre la valeur des volumes.

### Chapitre 13 — Bind mounts pour le développement

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```
> Observation : lance avec l'override dev. Ajoute bind mounts pour api/server.js et web/public.

```bash
docker inspect trainshop-api-1 | grep -A 20 "Mounts"
```
> Observation : tu vois des mounts de type "bind" reliant ton disque dur au container.

Maintenant, édite le fichier **api/server.js** (cherche la route GET /api/health). Change le message "ok" en "super ok".

```bash
# Recharge le browser ou teste
curl http://localhost:3000/api/health
```
> Observation : la réponse change sans rebuild ! C'est le bind mount en action.

```bash
docker compose down
docker compose up -d
```
> Observation : revient à la config de prod (pas de bind mount).

---

## JOUR 3 — Docker Compose

### Chapitre 14 — Compose basique

```bash
docker compose ps
```
> Observation : état de tous les services. Colonne "Status" doit dire "Up" + age.

```bash
docker compose ps --format json
```
> Observation : même info en JSON (utile pour scripting).

```bash
docker compose config
```
> Observation : affiche la config Compose finale (merge yml + env). Utile pour debug.

```bash
docker compose config --format json | head -50
```
> Observation : config en JSON, limité à 50 lignes.

### Chapitre 15 — Services et dépendances

```bash
cat docker-compose.yml
```
> Observation : affiche le fichier. Points clés :
> - `services` : web, api, db, cache
> - `depends_on` : api attend que db et cache soient en bonne santé
> - `networks` : trainshop_net (bridge custom)
> - `volumes` : pgdata (nommé)
> - `environment` : variables lues depuis .env

```bash
docker compose up -d --no-deps api
```
> Observation : lance api seul, ignore ses dépendances. Va probablement planter (DB pas accessible).

```bash
docker compose restart api
```
> Observation : redémarre api. Après quelques secondes, il devrait se reconnecter à la DB.

```bash
docker compose up -d
```
> Observation : relance tout dans le bon ordre (health checks forcing dep order).

### Chapitre 16 — Réseaux

```bash
docker network ls
```
> Observation : affiche les réseaux. Tu dois voir `trainshop_net` (créé par Compose).

```bash
docker network inspect trainshop_net
```
> Observation : détails du réseau :
> - `Driver` : bridge (réseau interne à Docker)
> - `Containers` : les 4 services actifs (avec leurs IPs internes)
> - DNS interne : chaque container peut pinguer les autres par nom (api → db, api → cache)

```bash
docker compose exec api ping db
```
> Observation : fonctionne ! Le DNS interne du réseau résout "db" → l'IP du container Postgres. Démontre la communication inter-container.

```bash
docker compose exec api ping cache
```
> Observation : idem pour Redis.

```bash
docker compose exec api ping web
```
> Observation : idem pour nginx.

```bash
docker compose exec api ping localhost
```
> Observation : dans le container api, "localhost" pointe sur lui-même, pas sur l'hôte. D'où la nécessité d'utiliser les noms du réseau.

### Chapitre 17 — Port mapping

```bash
docker port trainshop-web-1
```
> Observation : affiche les mappages. Doit montrer : 80/tcp → 0.0.0.0:8080

```bash
docker port trainshop-api-1
```
> Observation : 3000/tcp → 0.0.0.0:3000 (si tu utilises le compose dev)
> Ou rien (si prod, car api n'expose pas ses ports à l'hôte).

```bash
curl http://localhost:8080
```
> Observation : requête HTTP à nginx sur l'hôte (port 8080), qui sert le HTML.

```bash
curl http://localhost:3000/api/products
```
> Observation : (en dev avec compose.dev.yml) requête directe à l'API. Affiche le JSON des produits.
> Sinon, il faut passer par http://localhost:8080 (et nginx proxy vers api:3000).

---

## JOUR 3 (suite) — Gestion avancée

### Chapitre 18 — Health checks

```bash
docker compose ps
```
> Observation : colonne "Status" affiche "healthy" en vert pour api et db (grâce aux HEALTHCHECK).

```bash
docker inspect trainshop-api-1 | grep -A 5 "Health"
```
> Observation : détails du healthcheck :
> - `Status` : "healthy"
> - `FailingStreak` : nombre de tests échoués de suite (0 = bon)
> - Intervals et timeouts

Tue le service DB volontairement (pour simuler une panne) :
```bash
docker compose stop db
```
> Observation : arrête juste la DB.

```bash
docker compose exec api curl -s http://localhost:3000/api/health | jq .
```
> Observation : affiche un JSON avec `"db": "FAILED"`. L'API note la panne mais continue de tourner.

```bash
docker compose ps api
```
> Observation : api reste "healthy" (le healthcheck de l'API elle-même fonctionne, mais la dépendance est cassée).

Relance la DB :
```bash
docker compose start db
```
> Observation : redémarre Postgres. Après 10 secondes, la DB devient "healthy" à nouveau.

```bash
docker compose exec api curl -s http://localhost:3000/api/health | jq .
```
> Observation : `"db": "OK"` maintenant.

### Chapitre 19 — Logs avancés

```bash
docker compose logs --since 5m
```
> Observation : logs des 5 dernières minutes (utile si la pile a longtemps tourné).

```bash
docker compose logs db --until 1m
```
> Observation : logs jusqu'à il y a 1 min (inverse de since).

```bash
docker compose logs api api api api  # répète api 4 fois
```
> Observation : filtre plusieurs services (inutile ici, mais démontre la syntax).

```bash
docker compose logs | grep "ERROR"
```
> Observation : cherche les erreurs dans tous les logs (pipe vers grep).

```bash
docker compose logs api 2>&1 | tee /tmp/api-logs.txt
```
> Observation : sauvegarde les logs api dans un fichier et les affiche (tee).

### Chapitre 20 — Stats et ressources

```bash
docker stats trainshop-api-1
```
> Observation : CPU %, mémoire, I/O en temps réel du container api.
> Affiche aussi les limites (si définies dans compose).
> Fais `Ctrl+C` pour sortir.

```bash
docker stats --no-stream
```
> Observation : snapshot unique de tous les containers (pas de mise à jour continue).

Teste la charge (curl en boucle) :
```bash
for i in {1..100}; do curl -s http://localhost:8080/api/products > /dev/null & done; wait
```
> Observation : 100 requêtes parallèles. Observe le CPU/mémoire du container api monter.

### Chapitre 21 — Profils Compose

```bash
cat docker-compose.prod.yml
```
> Observation : contient les overrides pour prod. Points clés :
> - `restart: always` (au lieu de unless-stopped)
> - `mem_limit`, `cpus` : limites ressources
> - Variables `NODE_ENV=production`

```bash
docker compose --profile prod ps
```
> Observation : actuellement vide, car aucun service ne porte le profil "prod".
> (Note : le projet utilisé ici suit une structure simple, pas de profils actifs).

### Chapitre 22 — Scaling

```bash
docker compose up -d --scale api=3
```
> Observation : lance 3 instances d'API (trainshop-api-1, -2, -3).

```bash
docker compose ps
```
> Observation : maintenant 6 containers (web, db, cache, api×3).

```bash
docker ps --filter "label=com.docker.compose.service=api"
```
> Observation : filtre pour voir juste les api.

Teste le load balancing : ouvre http://localhost:8080 et refresh plusieurs fois.
Ou teste directement :
```bash
for i in {1..6}; do curl http://localhost:8080/api/products | jq '.[] | .id' | head -2; done
```
> Observation : les requêtes sont distribuées parmi les 3 instances (cache peut être différent).

Redescendre :
```bash
docker compose up -d --scale api=1
```
> Observation : arrête les instances 2 et 3, garde juste l'api-1.

### Chapitre 23 — Redémarrage & ordre de service

```bash
docker compose restart
```
> Observation : redémarre tout dans un ordre respectant les dépendances.

```bash
docker compose restart db
```
> Observation : juste la DB.

```bash
docker compose restart api web
```
> Observation : api et web (db et cache restent intacts).

### Chapitre 24 — Arrêt propre

```bash
docker compose down
```
> Observation : arrête et supprime les containers. Les volumes restent.

```bash
docker compose ps
```
> Observation : aucun container (list vide).

```bash
docker volume ls
```
> Observation : trainshop_pgdata existe toujours.

Relance et vérifie que les données sont revenue :
```bash
docker compose up -d
docker compose exec db psql -U trainer -d trainshop -c "SELECT COUNT(*) FROM products;"
```
> Observation : affiche 10 (ou plus si tu as ajouté des données avant).

---

## JOUR 3 (suite) — Troubleshooting & Advanced

### Chapitre 25 — Inspecter les variables d'env

```bash
docker compose config | grep -A 20 "environment:"
```
> Observation : affiche toutes les env vars définies dans Compose.

```bash
docker compose exec api env | grep NODE
```
> Observation : `NODE_ENV=production` (ou development si compose dev).

```bash
docker compose exec api env | sort
```
> Observation : toutes les env vars du container api, triées.

### Chapitre 26 — Nettoyer les ressources

```bash
docker ps -a
```
> Observation : liste TOUS les containers (même terminés).

```bash
docker container prune
```
> Observation : supprime les containers arrêtés (réclame confirmation).

```bash
docker image prune
```
> Observation : supprime les images "dangling" (non taguées, non utilisées).

```bash
docker system prune
```
> Observation : supprime containers, images, réseaux inutilisés. Garanti sûr.

```bash
docker system prune -a --volumes
```
> Observation : DANGER. Supprime AUSSI les images en use et les volumes.
> À utiliser juste si tu veux repartir de zéro complet.

### Chapitre 27 — Fichier .env et secrets

```bash
cat .env
```
> Observation : affiche les variables d'env utilisées par Compose.

```bash
docker compose config | grep POSTGRES_USER
```
> Observation : les variables du .env sont bien injectées dans la config finale.

Modifie le .env (ex: POSTGRES_PASSWORD=new_password), puis :
```bash
docker compose down -v
docker compose up -d
docker compose exec db psql -U trainer -d trainshop -c "SELECT 1;"
```
> Observation : ça ne fonctionne pas (la BD s'est créée avec l'ancien password lors du down -v).
> Relance avec les bons credentials ou récréer le volume.

### Chapitre 28 — Debugging de connectivité

```bash
docker compose exec api ping -c 3 db
```
> Observation : 3 pings à "db" → résolu en interne, répond (ICMP).

```bash
docker compose exec api ping -c 3 cache
```
> Observation : Redis ping.

```bash
docker compose exec api curl -v http://db:5432
```
> Observation : essaie de faire un HTTP GET sur la DB (ça va fail, mais tu vois la connexion établie au port 5432).

```bash
docker compose exec api nslookup db
```
> Observation : regarde la résolution DNS interne. Affiche l'IP de db.

### Chapitre 29 — Logs structurés

```bash
docker compose logs --timestamps api | head -20
```
> Observation : chaque ligne a un timestamp.

```bash
docker compose logs api | grep "GET /api/products"
```
> Observation : filtre pour une route spécifique.

```bash
docker compose logs api | wc -l
```
> Observation : nombre total de lignes.

### Chapitre 30 — Persistence et backup

```bash
docker volume inspect trainshop_pgdata
```
> Observation : vérifie le Mountpoint (ex: /var/lib/docker/volumes/trainshop_pgdata/_data).

Crée un backup manuel :
```bash
docker compose exec -T db pg_dump -U trainer trainshop > /tmp/trainshop-backup.sql
```
> Observation : exporte la BD en SQL. Fichier de ~1KB (très petit pour 10 produits).

```bash
cat /tmp/trainshop-backup.sql | head -20
```
> Observation : vérifie le contenu (CREATE TABLE, INSERT, etc.).

Restaure :
```bash
docker compose down -v
docker compose up -d
docker compose exec -T db psql -U trainer -d trainshop < /tmp/trainshop-backup.sql
```
> Observation : (psql va fail si le fichier est stdin du host, mais la théorie est valide).

---

## Résumé des 30 concepts démontrés

| # | Concept | Commande clé |
|---|---------|-------------|
| 1 | Install | `docker --version` |
| 2 | Images | `docker images` |
| 3 | Containers | `docker ps` |
| 4 | Logs | `docker compose logs -f` |
| 5 | Exec | `docker compose exec api sh` |
| 6 | Dockerfile | `cat api/Dockerfile` |
| 7 | Build | `docker compose build api` |
| 8 | Layers | `docker image history trainshop-api:1.0` |
| 9 | Tags | `docker tag trainshop-api:1.0 trainshop-api:latest` |
| 10 | Build args | `--build-arg NODE_ENV=staging` |
| 11 | Volumes | `docker volume ls` |
| 12 | Persistance | `docker compose down` + `up` |
| 13 | Bind mounts | `compose.dev.yml` avec bind mount |
| 14 | Compose basics | `docker compose ps` |
| 15 | Services | `docker compose config` |
| 16 | Réseaux | `docker network inspect trainshop_net` |
| 17 | Port mapping | `docker port trainshop-web-1` |
| 18 | Health checks | `docker inspect trainshop-api-1` |
| 19 | Logs avancés | `docker compose logs --since 5m` |
| 20 | Stats | `docker stats` |
| 21 | Profils | `--profile prod` |
| 22 | Scaling | `--scale api=3` |
| 23 | Redémarrage | `docker compose restart` |
| 24 | Shutdown | `docker compose down -v` |
| 25 | Env vars | `docker compose config` |
| 26 | Cleanup | `docker system prune -a` |
| 27 | .env | `cat .env` + `docker compose config` |
| 28 | Debugging | `docker compose exec api nslookup db` |
| 29 | Logs structurés | `docker compose logs --timestamps` |
| 30 | Backup/restore | `pg_dump` + `psql` |

---

## Notes pédagogiques

1. **Progression** : Commence par basics (images, containers), puis compose et networking, puis advanced.
2. **Où les apprenants galérent** : Port mapping (ils oublient que localhost dans le container ≠ l'hôte), DNS interne, persistence.
3. **Ce qu'ils adorent** : Scaling (`--scale api=3`), healthcheck, exec interactif.
4. **Time allocation** : ~1h par chapitre. Entre chaque, laisse les apprenants essayer les commandes seuls.

Bon cours !
