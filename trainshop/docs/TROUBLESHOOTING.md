# TROUBLESHOOTING — Problèmes courants et solutions

## 1. "Port 8080 is already allocated"

**Symptôme** : `docker compose up -d` échoue avec "Error response from daemon: driver failed programming external connectivity on endpoint ... (Bind for 0.0.0.0:8080 failed)"

**Cause** : Un autre service utilise déjà le port 8080 (un navigateur local, une autre app, etc.).

**Solutions** :
```bash
# Option 1 : Trouver ce qui utilise le port (Windows PowerShell)
Get-NetTCPConnection -LocalPort 8080

# Option 2 : Changer le port dans .env
POSTGRES_USER=trainer
POSTGRES_PASSWORD=trainshop_dev_only
POSTGRES_DB=trainshop
WEB_PORT=9000        # Changé de 8080 à 9000

# Option 3 : Stopper le service concurrent
# (ex: une autre instance Docker)
docker ps
docker stop <container-id>

# Relancer
docker compose up -d
# Accès via http://localhost:9000
```

---

## 2. "Permission denied" sur le volume (Windows WSL2)

**Symptôme** : `docker compose exec api ls /app` fonctionne, mais `docker compose exec api node server.js` échoue avec permission denied sur files.

**Cause** : Problème de permissions entre host Windows et WSL2 container.

**Solutions** :
```bash
# Option 1 : Assurez-vous que WSL2 a accès au dossier
# Dans PowerShell, exécute depuis un chemin WSL2-accessible
cd C:\Users\moham\Downloads\trainshop
docker compose up -d

# Option 2 : Rebuild sans cache (force les permissions)
docker compose build --no-cache api
docker compose up -d api

# Option 3 : Vérifier les droits du fichier (ex: ssh into WSL2)
wsl
ls -la /mnt/c/Users/moham/Downloads/trainshop/api/server.js
# Si permissions bizarres, rectifier dans le Dockerfile
```

---

## 3. WSL2 freeze / Docker Desktop très lent

**Symptôme** : Docker Desktop consomme 100% CPU, WSL2 gèle, `docker ps` très lent.

**Cause** : WSL2 hypervisor saturé, virus scan de Windows interfère, ou trop de containers.

**Solutions** :
```bash
# Option 1 : Arrêter tous les containers
docker compose down

# Option 2 : Redémarrer WSL2 depuis PowerShell (admin)
wsl --shutdown
# Relance Docker Desktop manuellement

# Option 3 : Limiter les ressources WSL2
# Créer C:\Users\<username>\.wslconfig :
[wsl2]
memory=4GB
processors=2
swap=2GB

# Redémarrer WSL après
wsl --shutdown

# Option 4 : Exclure le dossier du virus scan Windows
# Windows Defender → Virus & threat protection 
# → Manage settings → Add exclusions
# → C:\Users\moham\Downloads\trainshop
```

---

## 4. PostgreSQL "no pg_hba.conf entry"

**Symptôme** : Les logs de la DB montrent "FATAL: no pg_hba.conf entry for host..." et api peut pas se connecter.

**Cause** : Rare, mais peut survenir si init.sql ou permissions PostgreSQL sont cassées.

**Solutions** :
```bash
# Option 1 : Reset complet de la BD
docker compose down -v
docker compose up -d db
# Attends 10s
docker compose logs db
# Vérifie que "database system is ready" apparaît

# Option 2 : Vérifier la config Postgres (Docker)
docker compose exec db psql -U trainer -d trainshop -c "\l"
# Si erreur, la DB n'a pas démarré correctement

# Option 3 : Si ça persiste, vérifier les variables d'env
docker compose config | grep POSTGRES
# Les variables doivent être correctes dans le output
```

---

## 5. API loopback : "Can't reach db ou cache"

**Symptôme** : `curl http://localhost:3000/api/health` retourne `"db": "FAILED"` et `"cache": "FAILED"`.

**Cause** : Confusion localhost ≠ nom du service. Dans le container, `localhost` c'est le container lui-même, pas la machine hôte.

**Solutions** :
```bash
# ✓ CORRECT (dans le code server.js, db.js, cache.js)
DATABASE_URL=postgresql://trainer:pwd@db:5432/trainshop
REDIS_URL=redis://cache:6379

# ✗ FAUX (ne fonctionne pas dans Docker)
DATABASE_URL=postgresql://trainer:pwd@localhost:5432/trainshop
REDIS_URL=redis://localhost:6379

# Vérification : la variable est bien définie dans docker-compose.yml
docker compose config | grep DATABASE_URL
# Doit afficher : DATABASE_URL: postgresql://trainer:...@db:5432/trainshop

# Check DNS interne
docker compose exec api nslookup db
# Doit résoudre db → IP du container db
```

---

## 6. Build très lent sur Windows (multi-stage)

**Symptôme** : `docker compose build api` prend 5 minutes (vs 30s sur Linux).

**Cause** : File system Windows/WSL2 est lent pour node_modules.

**Solutions** :
```bash
# Option 1 : Utiliser BuildKit (plus optimisé)
DOCKER_BUILDKIT=1 docker compose build api

# Option 2 : Vérifier le .dockerignore (exclus les gros dossiers)
cat api/.dockerignore
# Doit contenir : node_modules, .git, etc.

# Option 3 : Mono-stage Dockerfile temporaire pour dev
# (Si multi-stage ralentit trop)

# Option 4 : Utiliser un volume nommé pour node_modules
# docker-compose.dev.yml déjà inclut ceci :
volumes:
  - /app/node_modules

# Rebuild
docker compose -f docker-compose.yml -f docker-compose.dev.yml build api
```

---

## 7. "Compose ne pull pas une nouvelle image"

**Symptôme** : J'ai modifié le Dockerfile de l'API, mais `docker compose up -d` n'a pas l'air de rebuild.

**Cause** : Docker utilise le cache de build (couches existantes).

**Solutions** :
```bash
# Option 1 : Rebuild explicitement
docker compose build api
docker compose up -d api

# Option 2 : Rebuild sans cache
docker compose build --no-cache api
docker compose up -d api

# Option 3 : Pull une image externe neuve (ex: nginx)
docker pull nginx:1.27-alpine
docker compose up -d web

# Option 4 : Vérifier que tu edites le bon Dockerfile
cat api/Dockerfile
# Edite et sauvegarde bien le fichier
```

---

## 8. Redis "Connection refused" (cache pas attendu)

**Symptôme** : API démarre avant que Redis soit prêt. Logs de l'API : "Error: Connection refused at 127.0.0.1:6379"

**Cause** : Cache démarre trop lentement, API est impatient.

**Solutions** :
```bash
# Option 1 : Cache dépendance explicite dans Compose
docker-compose.yml déjà contient :
depends_on:
  db:
    condition: service_healthy
  cache:
    condition: service_started  # Redis n'a pas de healthcheck actif

# Pour ajouter un healthcheck Redis :
# Dans docker-compose.yml, ajouter à cache :
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 5s
  timeout: 3s
  retries: 5

# Puis relancer
docker compose up -d

# Option 2 : Retry logic dans server.js
# Le code inclut déjà une boucle d'attente (10 attempts)

# Option 3 : Logs pour vérifier le démarrage
docker compose logs cache
# Doit afficher "Ready to accept connections"
```

---

## 9. "docker system prune supprime tout"

**Symptôme** : J'ai lancé `docker system prune -a`, et maintenant les images/containers personalisés sont partis.

**Cause** : `prune -a` (avec -a) supprime les images non-taguées et non-en-use, y compris custom images.

**Contexte** :
```bash
# ✓ SAFE : supprime juste les containers/networks/volumes inutilisés
docker system prune

# ✗ DANGER : supprime aussi les images en local (même si non-en-use)
docker system prune -a

# ✗✗ TRÈS DANGER : idem + volumes (perte de données DB)
docker system prune -a --volumes
```

**Solutions** :
```bash
# Vérifier ce que ça va supprimer avant
docker system prune -a --dry-run

# Si déjà trop tard, rebuild les images
docker compose build

# Relancer
docker compose up -d
```

---

## 10. "Containers exited with code 1"

**Symptôme** : `docker compose ps` affiche `Exit 1` pour un service.

**Cause** : Le processus dans le container a échoué (crash, erreur fatale).

**Solutions** :
```bash
# Option 1 : Voir les logs (dernières lignes)
docker compose logs api
# Cherche le message d'erreur (Database connection failed, etc.)

# Option 2 : Voir les logs du container arrêté
docker logs trainshop-api-1

# Option 3 : Vérifier l'ordre de démarrage
# Si api démarre avant db, il crash. Attendre que db soit ready :
docker compose up -d db
sleep 5
docker compose up -d

# Option 4 : Entrer dans le container et débugger
docker run -it trainshop-api:1.0 sh
# À l'intérieur :
node server.js
# Lance manuellement pour voir l'erreur en direct

# Option 5 : Rebuild et relancer
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## 11. "Can't access http://localhost:8080"

**Symptôme** : Browser affiche "Can't reach this page" ou "Connection refused".

**Cause** : Nginx n'est pas démarré ou port mal exposé.

**Solutions** :
```bash
# Vérification 1 : Docker desktop est-il lancé ?
docker ps
# Si erreur "Cannot connect to Docker daemon", ouvre Docker Desktop

# Vérification 2 : Le container web est-il en cours d'exécution ?
docker compose ps web
# Doit afficher "Up X seconds" dans la colonne STATUS

# Vérification 3 : Le port est-il correctement mappé ?
docker port trainshop-web-1
# Doit afficher "80/tcp -> 0.0.0.0:8080"

# Vérification 4 : Vérifier les logs de nginx
docker compose logs web
# Cherche les erreurs "listen", "socket", etc.

# Vérification 5 : Relancer le service web
docker compose restart web
docker compose logs -f web
# Attends "nginx entered RUNNING state"

# Vérification 6 : Test depuis terminal
curl http://localhost:8080
# Doit retourner du HTML
```

---

## 12. "Volumes are mounted but data is empty"

**Symptôme** : J'ai arrêté le container, restart, mais les données de la BD ont disparu.

**Cause** : `docker compose down -v` supprime les volumes. Ou le volume n'était pas correctement configuré.

**Solutions** :
```bash
# Vérifier le volume
docker volume ls
# Cherche "trainshop_pgdata"

# Inspecter le volume
docker volume inspect trainshop_pgdata

# Si le volume est vide, vérifier la config
docker compose config | grep -A 5 "volumes:"

# Doit inclure :
services:
  db:
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:

# Si la config est correcte, relancer une fois (init.sql exécuté)
docker compose down
docker compose up -d db
docker compose logs db
# Attends "database system is ready"
```

---

## 13. "Compose override dev ne fonctionne pas"

**Symptôme** : `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d` lance avec les config de prod (pas de bind mount).

**Cause** : Ordre des fichiers, ou la syntaxe du compose.dev.yml est mauvaise.

**Solutions** :
```bash
# Vérifier la merge config
docker compose -f docker-compose.yml -f docker-compose.dev.yml config | grep -A 10 "api:"
# Doit inclure les volumes bind mount

# Relancer avec force
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Vérifier que bind mount est en place
docker inspect trainshop-api-1 | grep -A 20 "Mounts"
# Doit montrer "Type": "bind", "Source": ".../api", "Destination": "/app"
```

---

## 14. "Healthcheck fails" (trop long à devenir healthy)

**Symptôme** : Services restent "unhealthy" ou "health: starting" après 30s.

**Cause** : Les timeouts du healthcheck sont trop courts, ou les services démarrent lentement.

**Solutions** :
```bash
# Vérifier les healthchecks actuels
docker compose ps
# Colonne STATUS montre l'état

# Voir les détails du healthcheck
docker inspect trainshop-api-1 | grep -A 10 "Healthcheck"

# Si trop lent, augmenter les timeouts dans docker-compose.yml :
healthcheck:
  test: ["CMD", "wget", "-q", "-O", "-", "http://localhost:3000/api/health"]
  interval: 10s
  timeout: 5s        # Augmenter de 3s à 5s
  retries: 5         # Augmenter de 3 à 5
  start_period: 30s  # Augmenter de 15s à 30s

# Rebuild et relancer
docker compose up -d
```

---

## 15. "Node.js app crashes on startup"

**Symptôme** : `docker compose logs api` affiche une erreur Node/npm, le container plante.

**Cause** : Dépendance manquante, ou une erreur syntax dans server.js.

**Solutions** :
```bash
# Vérifier le package.json
cat api/package.json
# Vérifie que express, pg, redis sont listés

# Installer les dépendances localement (avant rebuild)
cd api
npm install
# Ou utiliser npm ci (plus strict)

# Rebuild l'image
docker compose build --no-cache api

# Lancer manuellement pour debugger
docker run -it trainshop-api:1.0 sh
# À l'intérieur :
npm install
node server.js
# Lance pour voir l'erreur exacte

# Vérifier la syntax JavaScript
node --check api/server.js
# Retourne sans erreur si c'est OK

# Vérifier que le code n'est pas tronqué
wc -l api/server.js
# Doit avoir les bonnes lignes (~100-150)
```

---

## Ressources supplémentaires

- [Docker Compose documentation](https://docs.docker.com/compose/)
- [Docker Desktop troubleshooting](https://docs.docker.com/desktop/troubleshoot/)
- [WSL2 issues](https://docs.microsoft.com/en-us/windows/wsl/troubleshooting)
- [PostgreSQL Docker image](https://hub.docker.com/_/postgres/)
- [Redis Docker image](https://hub.docker.com/_/redis/)

---

## Cheat sheet : Commandes de debugging

```bash
# Voir l'état global
docker compose ps

# Logs complets
docker compose logs

# Logs en live
docker compose logs -f api

# Entrer dans un container
docker compose exec api sh

# Exécuter une commande
docker compose exec db psql -U trainer -d trainshop -c "SELECT COUNT(*) FROM products;"

# Inspecter un container
docker inspect trainshop-api-1

# Voir les stats (CPU, RAM)
docker stats

# Reset complet
docker compose down -v

# Rebuild tout
docker compose build --no-cache
docker compose up -d
```

Bon debugging !
