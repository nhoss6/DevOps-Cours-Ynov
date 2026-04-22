# EXERCISES — 15 Exercices progressifs pour les apprenants

Chaque exercice renforce une notion Docker. À proposer aux apprenants après les chapitres correspondants.

---

## Exercice 1 : Lancer et vérifier

**Objectif** : Démarrer TrainShop et vérifier que tout fonctionne.

**Niveau** : Débutant

**Durée** : 5 minutes

**Instructions** :

1. Clone ou dézippe le projet TrainShop
2. Entre dans le dossier : `cd trainshop`
3. Configure les variables d'env : `cp .env.example .env`
4. Lance tout : `docker compose up -d`
5. Attends 20-30s que tout démarre
6. Vérifie que les 4 services sont "healthy" : `docker compose ps`
7. Ouvre http://localhost:8080 dans le navigateur
8. Tu dois voir la liste des 10 produits

**Validation** :
- [ ] 4 services affichent "Up" et "healthy"
- [ ] Page web se charge et affiche les produits
- [ ] Badges de santé affichent "✓ Services en bonne santé"

---

## Exercice 2 : Explorer les logs

**Objectif** : Comprendre d'où viennent les logs et comment les filtrer.

**Niveau** : Débutant

**Durée** : 5 minutes

**Instructions** :

1. Vois les logs de tous les services : `docker compose logs`
2. Vois juste les logs de l'API : `docker compose logs api`
3. Vois les logs en temps réel (follow) : `docker compose logs -f api`
4. Ouvre http://localhost:8080 dans le navigateur (pendant le follow)
5. Observe les requêtes HTTP arriver dans les logs
6. Quitte le follow : `Ctrl+C`
7. Vois les logs avec timestamps : `docker compose logs api --timestamps`

**Validation** :
- [ ] Tu vois les logs mélangés de tous les services
- [ ] Tu peux isoler les logs d'un service
- [ ] Tu vois les requêtes HTTP en temps réel
- [ ] Tu comprends le format et les timestamps

---

## Exercice 3 : Accéder à l'intérieur d'un container

**Objectif** : Utiliser `docker compose exec` pour explorer un container en direct.

**Niveau** : Débutant

**Durée** : 10 minutes

**Instructions** :

1. Entre dans le shell du container API : `docker compose exec api sh`
2. À l'intérieur du container :
   - Vois le contenu : `ls /app`
   - Vérifie Node.js : `node --version`
   - Vois le code : `cat /app/server.js | head -20`
   - Quitte : `exit`
3. Exécute une commande sans entrer en shell : `docker compose exec api npm list`
4. Entre dans le shell de la BD : `docker compose exec db psql -U trainer -d trainshop`
5. À l'intérieur de psql :
   - Liste les tables : `\dt`
   - Compte les produits : `SELECT COUNT(*) FROM products;`
   - Vois 5 produits : `SELECT name, price FROM products LIMIT 5;`
   - Quitte : `\q`

**Validation** :
- [ ] Tu as accédé au shell API et vu le code
- [ ] Tu as exécuté une commande npm dans le container
- [ ] Tu as accédé à la BD et exécuté des requêtes SQL
- [ ] Tu comprends la différence entre `exec -it` et `exec` seul

---

## Exercice 4 : Arrêter un service et observer le comportement

**Objectif** : Comprendre les dépendances et la résilience.

**Niveau** : Intermédiaire

**Durée** : 10 minutes

**Instructions** :

1. Vois l'état actuel : `docker compose ps`
2. Arrête le service cache (Redis) : `docker compose stop cache`
3. Recharge http://localhost:8080 dans le navigateur
4. Observe : le badge cache passe à rouge (unhealthy)
5. Vois la requête API avec cache cassé : `docker compose logs api | tail -5`
6. Vérifie l'endpoint health : `curl http://localhost:3000/api/health | jq .`
7. Observe que `"cache": "FAILED"` (l'API continue de fonctionner, mode dégradé)
8. Redémarre le cache : `docker compose start cache`
9. Attends 10s, recharge le navigateur
10. Le badge cache repasse au vert

**Validation** :
- [ ] Tu as arrêté un service sans tuer l'app
- [ ] Tu as observé le mode dégradé de l'API
- [ ] Tu as vu l'endpoint health reflétant la panne
- [ ] Le service a redémarré sans perte de données

---

## Exercice 5 : Scaling l'API

**Objectif** : Lancer plusieurs instances du même service et voir le load balancing.

**Niveau** : Intermédiaire

**Durée** : 10 minutes

**Instructions** :

1. Vois l'état actuel : `docker compose ps`
2. Scale l'API à 3 instances : `docker compose up -d --scale api=3`
3. Vérifier le nouveau state : `docker compose ps`
4. Tu dois voir api-1, api-2, api-3
5. Chacun a son propre container (même image, instances séparées)
6. Les 3 partagent la même BD et le même cache
7. Lance plusieurs requêtes en parallèle :
   ```bash
   for i in {1..10}; do curl -s http://localhost:8080/api/products | jq '.[] | .name' | head -1 & done; wait
   ```
8. Les requêtes sont distribuées entre les 3 instances
9. Redescendre à 1 API : `docker compose up -d --scale api=1`
10. Vérifier : juste api-1 reste

**Validation** :
- [ ] Tu as lancé 3 instances avec une seule commande
- [ ] Tu as observé le load balancing (requêtes distribuées)
- [ ] Tu as redescendu à 1 instance
- [ ] Tu comprends que le scaling réplique les instances, pas les données

---

## Exercice 6 : Éditer le code en live (bind mount dev)

**Objectif** : Comprendre les bind mounts et le hot reload.

**Niveau** : Intermédiaire

**Durée** : 10 minutes

**Instructions** :

1. Arrête tout : `docker compose down`
2. Lance avec l'override dev : `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d`
3. Ouvre le fichier `api/server.js` dans un éditeur (VS Code, Sublime, etc.)
4. Cherche la route `GET /api/health` (ligne ~80)
5. Change le message (ex: "status": "super-healthy")
6. Sauvegarde le fichier
7. Attends 2-3s (nodemon détecte le changement et redémarre)
8. Recharge http://localhost:8080 ou teste : `curl http://localhost:3000/api/health`
9. Le message change sans rebuild !
10. Modifie `web/public/index.html` (change le titre ou un texte)
11. Recharge le navigateur — le changement est immédiat (nginx auto-reload)

**Validation** :
- [ ] Tu as appliqué un changement sans rebuild
- [ ] Les changements API ont été visibles après nodemon restart
- [ ] Les changements web ont été visibles immédiatement
- [ ] Tu comprends le bind mount pour le développement

---

## Exercice 7 : Inspecter le réseau Docker

**Objectif** : Comprendre comment les services communiquent via le réseau.

**Niveau** : Intermédiaire

**Durée** : 10 minutes

**Instructions** :

1. Liste les réseaux Docker : `docker network ls`
2. Tu dois voir `trainshop_net` (bridge custom)
3. Inspecte le réseau : `docker network inspect trainshop_net`
4. Observe les containers et leurs IPs internes
5. Entre dans le container api : `docker compose exec api sh`
6. À l'intérieur, teste la résolution DNS :
   - `ping -c 3 db` — doit fonctionner (DB accessible)
   - `ping -c 3 cache` — doit fonctionner (Cache accessible)
   - `ping -c 3 web` — doit fonctionner (Web accessible)
   - `nslookup db` — affiche l'IP de db
7. Teste une requête HTTP vers l'API lui-même :
   - `wget -q -O - http://localhost:3000/api/health`
   - Mais pas `wget -q -O - http://api:3000/api/health` (pas de recursion)
8. Quitte : `exit`

**Validation** :
- [ ] Tu as vu le réseau trainshop_net
- [ ] Tu as observé les IPs internes et les DNS résolutions
- [ ] Tu as testé la communication inter-containers
- [ ] Tu comprends que localhost dans le container = le container lui-même

---

## Exercice 8 : Créer un backup et restore de la BD

**Objectif** : Sauvegarder et restaurer les données.

**Niveau** : Intermédiaire

**Durée** : 15 minutes

**Instructions** :

1. Insère un produit test : 
   ```bash
   docker compose exec db psql -U trainer -d trainshop -c \
     "INSERT INTO products (name, price, stock) VALUES ('Test Produit', 123.45, 99);"
   ```
2. Vérifie qu'il est là : `docker compose exec db psql -U trainer -d trainshop -c "SELECT COUNT(*) FROM products;"`
   - Doit afficher 11 (10 + 1 test)
3. Crée un backup SQL :
   ```bash
   docker compose exec -T db pg_dump -U trainer trainshop > backup-trainshop.sql
   ```
4. Vérifie le fichier : `cat backup-trainshop.sql | head -20`
5. Supprime le volume (simule une perte) : `docker compose down -v`
6. Relance sans données : `docker compose up -d`
   - Count affiche 10 (données seed restaurées)
7. Restaure depuis le backup :
   ```bash
   docker compose exec -T db psql -U trainer -d trainshop < backup-trainshop.sql
   ```
8. Vérifie : `docker compose exec db psql -U trainer -d trainshop -c "SELECT COUNT(*) FROM products;"`
   - Doit afficher 11 à nouveau

**Validation** :
- [ ] Tu as créé un backup SQL
- [ ] Tu as simulé une perte de données
- [ ] Tu as restauré depuis le backup
- [ ] Le produit test est bien revenu

---

## Exercice 9 : Ajouter un service nouveau (Adminer)

**Objectif** : Comprendre comment ajouter un service sans toucher aux autres.

**Niveau** : Intermédiaire

**Durée** : 15 minutes

**Instructions** :

1. Ouvre `docker-compose.yml`
2. Ajoute ce service avant `networks:` :
   ```yaml
   adminer:
     image: adminer:latest
     ports:
       - "8081:8080"
     depends_on:
       - db
     networks:
       - trainshop_net
     environment:
       - ADMINER_DEFAULT_SERVER=db
   ```
3. Lance le nouveau service : `docker compose up -d adminer`
4. Attends 5s
5. Vérifie : `docker compose ps` — adminer doit être là
6. Ouvre http://localhost:8081 dans le navigateur
7. Login :
   - System: PostgreSQL
   - Server: db
   - Username: trainer
   - Password: trainshop_dev_only
   - Database: trainshop
8. Tu vois la table products et les données
9. Supprime ce service :
   ```bash
   docker compose down
   # Édite docker-compose.yml pour retirer adminer
   docker compose up -d
   ```

**Validation** :
- [ ] Tu as ajouté un service au compose file
- [ ] Tu as lancé tout sans arrêter les services existants
- [ ] Tu as accédé à la BD via Adminer (GUI)
- [ ] Tu as supprimé le service proprement

---

## Exercice 10 : Passer au profil prod

**Objectif** : Comprendre les override de prod vs dev.

**Niveau** : Intermédiaire

**Durée** : 10 minutes

**Instructions** :

1. Vois la config actuelle : `docker compose config | grep restart`
2. Relance avec l'override prod : `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`
3. Vois la nouvelle config : `docker compose -f docker-compose.yml -f docker-compose.prod.yml config | grep restart`
   - Doit afficher `restart: always` au lieu de `unless-stopped`
4. Tue un container : `docker stop trainshop-api-1`
5. Attends 5s, vérifier : `docker compose ps api`
   - Le container doit être relancé automatiquement (restart: always)
6. Reviens à la config dev : `docker compose down && docker compose up -d`

**Validation** :
- [ ] Tu as lancé avec un override prod
- [ ] Tu as observé la différence de config (restart policy)
- [ ] Tu as vu le container redémarrer automatiquement en prod
- [ ] Tu comprends la différence dev vs prod

---

## Exercice 11 : Build sans cache et chronométrer

**Objectif** : Comprendre le cache de build et les couches Docker.

**Niveau** : Avancé

**Durée** : 15 minutes

**Instructions** :

1. Rebuild avec cache (normalement rapide) :
   ```bash
   time docker compose build api
   ```
2. Note le temps (ex: 2s, 5s)
3. Rebuild sans cache (plus lent) :
   ```bash
   time docker compose build --no-cache api
   ```
4. Note le temps (ex: 30s, 60s)
5. Compare les deux temps
6. Vois les couches d'une image :
   ```bash
   docker image history trainshop-api:1.0
   ```
7. Chaque ligne est une couche (RUN, COPY, etc.)
8. Modifie le Dockerfile api (ajoute une env var dans FROM) :
   - Ajoute juste avant `WORKDIR` : `ENV DEBUG=true`
9. Rebuild avec cache :
   ```bash
   time docker compose build api
   ```
10. Observe que les couches avant ta modification restent en cache, mais après sont reconstruites

**Validation** :
- [ ] Tu as mesuré le temps avec et sans cache
- [ ] Tu as vu les couches d'une image
- [ ] Tu as observé que le cache accélère les builds
- [ ] Tu comprends l'impact des modifications sur les couches

---

## Exercice 12 : Ajouter un secret Docker

**Objectif** : Comprendre comment gérer les secrets sensibles.

**Niveau** : Avancé

**Durée** : 15 minutes

**Instructions** :

1. Crée un secret Docker :
   ```bash
   echo "mysecretpassword123" | docker secret create my_secret_pass -
   ```
2. Listes les secrets : `docker secret ls`
3. Modifie `docker-compose.yml` pour utiliser le secret dans le service db :
   ```yaml
   secrets:
     - my_secret_pass

   services:
     db:
       environment:
         - POSTGRES_PASSWORD_FILE=/run/secrets/my_secret_pass
   ```
4. Relance : `docker compose down && docker compose up -d`
5. Vérifie que la BD démarre toujours
6. Inspecte le secret (tu ne peux pas voir la valeur) :
   ```bash
   docker secret inspect my_secret_pass
   ```
7. Supprime le secret : `docker secret rm my_secret_pass`
   - (Ça va fail si un service l'utilise toujours)
8. Réverte le docker-compose.yml

**Validation** :
- [ ] Tu as créé et listé un secret
- [ ] Tu as utilisé le secret dans le compose
- [ ] Tu comprends que les secrets ne sont pas visibles en plaintext
- [ ] Tu peux inspecter un secret sans voir sa valeur

---

## Exercice 13 : Pousser une image vers un registry local

**Objectif** : Comprendre tagging et registry (sans Docker Hub).

**Niveau** : Avancé

**Durée** : 20 minutes

**Instructions** :

1. Lance un registry local :
   ```bash
   docker run -d -p 5000:5000 --name local-registry registry:2
   ```
2. Vérifier : `curl http://localhost:5000/v2/`
   - Doit retourner `{}`
3. Tag ton image API pour le registry local :
   ```bash
   docker tag trainshop-api:1.0 localhost:5000/trainshop-api:1.0
   ```
4. Vérifies le tag : `docker images | grep trainshop-api`
5. Pousse l'image vers le registry local :
   ```bash
   docker push localhost:5000/trainshop-api:1.0
   ```
6. Vérifies qu'elle est dans le registry :
   ```bash
   curl http://localhost:5000/v2/_catalog
   ```
   - Doit afficher `{"repositories":["trainshop-api"]}`
7. Optionnel : supprime l'image locale et repull du registry :
   ```bash
   docker rmi trainshop-api:1.0 localhost:5000/trainshop-api:1.0
   docker pull localhost:5000/trainshop-api:1.0
   ```
8. Arrête le registry : `docker stop local-registry && docker rm local-registry`

**Validation** :
- [ ] Tu as lancé un registry local
- [ ] Tu as tagué une image pour le registry
- [ ] Tu as poussé l'image avec succès
- [ ] Tu as verrifié que l'image est dans le registry

---

## Exercice 14 : Réduire l'image API de moitié avec multi-stage

**Objectif** : Optimiser la taille d'une image avec multi-stage build.

**Niveau** : Avancé

**Durée** : 20 minutes

**Instructions** :

1. Vois la taille actuelle de l'image api :
   ```bash
   docker images trainshop-api:1.0
   ```
   - Note la taille (ex: 450MB)
2. Vois les couches :
   ```bash
   docker image history trainshop-api:1.0
   ```
3. Modifie `api/Dockerfile` pour un multi-stage build :
   ```dockerfile
   # Stage 1 : builder
   FROM node:20-alpine AS builder
   WORKDIR /build
   COPY package*.json ./
   RUN npm ci --prefer-offline
   COPY . .

   # Stage 2 : final (léger)
   FROM node:20-alpine
   WORKDIR /app
   COPY --from=builder /build/node_modules ./node_modules
   COPY --from=builder /build/*.js ./
   ENV NODE_ENV=production PORT=3000
   EXPOSE 3000
   HEALTHCHECK --interval=10s --timeout=3s --start-period=15s \
     CMD wget -q -O - http://localhost:3000/api/health || exit 1
   USER node
   CMD ["node", "server.js"]
   ```
4. Rebuild :
   ```bash
   docker compose build --no-cache api
   ```
5. Compare les tailles :
   ```bash
   docker images trainshop-api:1.0
   ```
   - La nouvelle image est plus légère
6. Relance pour vérifier que ça fonctionne :
   ```bash
   docker compose up -d api
   docker compose logs api
   ```

**Validation** :
- [ ] Tu as mesuré la taille avant/après
- [ ] Tu as créé un Dockerfile multi-stage
- [ ] L'image finale est plus légère
- [ ] L'image fonctionne toujours correctement

---

## Exercice 15 : Audit et optimisations (quiz final)

**Objectif** : Identifier 5 améliorations possibles au projet.

**Niveau** : Avancé

**Durée** : 20 minutes (débat/discussion)

**Instructions** :

1. Revois le `docker-compose.yml` (fichier complet)
2. Revois les 4 Dockerfiles (web, api, db + implicite)
3. Revois les README de chaque service
4. Identifie les 5 améliorations possibles parmi :

   **Sécurité** :
   - [ ] Les passwords sont en dur dans le .env (suggestion: Docker secrets)
   - [ ] L'API expose le port 3000 en prod (suggestion: que via nginx)
   - [ ] Pas de scan d'image pour les vulnérabilités (suggestion: Trivy)

   **Performance** :
   - [ ] Pas de limite de ressources (suggestion: mem_limit, cpus)
   - [ ] Cache Redis n'a pas de persistance (suggestion: appendonly yes)
   - [ ] Nginx compresse pas les réponses JSON (vérifier gzip on)

   **Résilience** :
   - [ ] Pas de retry logic pour DB/Cache (suggestion: exponential backoff)
   - [ ] Logs vont juste en stdout (suggestion: driver journald ou splunk)
   - [ ] Pas de monitoring/alertes (suggestion: Prometheus)

   **Scalabilité** :
   - [ ] Les sessions ne sont pas partagées (si API scaled) (suggestion: Redis sessions)
   - [ ] Pas de load balancer externe (suggestion: HAProxy ou Docker Swarm)

   **Maintenabilité** :
   - [ ] Pas de version git tags (suggestion: sémantic versioning)
   - [ ] Documentation des env vars manque (suggestion: .env.docs)

5. Écris 5 suggestions et explique chacune

**Validation** :
- [ ] Tu as identifié au moins 5 améliorations réalistes
- [ ] Tu as expliqué pourquoi chaque amélioration est utile
- [ ] Tu comprends les trade-offs (complexité vs bénéfice)
- [ ] Tu peux défendre tes choix

---

## Résumé des exercices

| # | Titre | Niveau | Durée | Concept clé |
|---|-------|--------|-------|-------------|
| 1 | Lancer et vérifier | Débutant | 5m | docker compose up, ps, healthcheck |
| 2 | Logs | Débutant | 5m | docker compose logs, -f, --timestamps |
| 3 | Exec | Débutant | 10m | docker compose exec, shell interactif |
| 4 | Arrêter un service | Intermédiaire | 10m | Résilience, mode dégradé |
| 5 | Scaling | Intermédiaire | 10m | --scale, load balancing |
| 6 | Bind mount dev | Intermédiaire | 10m | Hot reload, volumes |
| 7 | Réseau | Intermédiaire | 10m | DNS interne, bridge, ping |
| 8 | Backup/restore | Intermédiaire | 15m | pg_dump, persistance |
| 9 | Ajouter un service | Intermédiaire | 15m | Compose modulaire |
| 10 | Prod vs dev | Intermédiaire | 10m | Override, restart policies |
| 11 | Cache de build | Avancé | 15m | Layer caching, --no-cache |
| 12 | Secrets | Avancé | 15m | Secret management |
| 13 | Registry local | Avancé | 20m | Tagging, push, registry |
| 14 | Multi-stage | Avancé | 20m | Optimisation taille image |
| 15 | Audit | Avancé | 20m | Critique, améliorations |

---

## Conseils pédagogiques

1. **Progression** : Les exercices 1-3 doivent être faits tous. Les 4-10 sont recommandés. Les 11-15 sont pour les apprenants avancés.
2. **Timing** : Propose 1-2 exercices par demi-journée de cours.
3. **Pairs** : Fais les exercices en pairs (2 apprenants par machine) pour faciliter l'entraide.
4. **Débat** : Pour l'exercice 15, organise un débat / code review ouvert.
5. **Feedback** : À la fin de chaque exercice, demande aux apprenants ce qu'ils ont appris.

Bon travail !
