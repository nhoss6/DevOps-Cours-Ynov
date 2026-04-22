# TrainShop — Projet de Formation Docker Complete

## Pour qui ? Pour quoi ?

**TrainShop** est un projet multi-services Docker **prêt à l'emploi** pour formateurs et apprenants DevOps. Il démontre *tout* ce qu'on apprend dans un cours Docker 3 jours : images, containers, Compose, volumes, réseaux, healthchecks, bind mounts, multi-stage builds, scaling, logs.

Ce n'est pas une app Hello World. C'est une **vraie app de catalogue produits** avec 4 services qui communiquent, du cache, une DB persistante, du front. Chaque concept Docker est appliqué **en contexte réel**.

**Trainer** : Mohamed / MD Consulting Digital  
**Audience** : Apprenants DevOps (Jour 1 → 3, ou Jour 2 → 4)  
**Durée de setup** : 2 min (si Docker Desktop est installé)

---

## Prérequis

- **Docker Desktop** 4.20+ installé et démarré
- Sur Windows : **WSL2** activé (pas Hyper-V seul)
- Sur macOS/Linux : moteur Docker natif OK
- Terminal ouvert (cmd, PowerShell, bash, zsh)
- Éditeur de texte (VS Code recommandé)
- Navigateur web (pour voir l'app)

**Vérification rapide** :
```bash
docker --version
docker compose version
docker ps
```
Si tout répond sans erreur, tu es bon.

---

## Démarrage en 3 commandes

### 1. Télécharger / cloner le projet
```bash
# Depuis Windows (cmd ou PowerShell)
cd C:\Users\moham\Downloads
git clone https://github.com/TRAINSHOP.git trainshop
# ou dézipper l'archive trainshop.zip
```

### 2. Configurer les variables d'env
```bash
cd trainshop
cp .env.example .env
```

Contenu de `.env` (déjà bon, ne change rien pour commencer) :
```
POSTGRES_USER=trainer
POSTGRES_PASSWORD=trainshop_dev_only
POSTGRES_DB=trainshop
WEB_PORT=8080
API_PORT=3000
NODE_ENV=production
REDIS_URL=redis://cache:6379
```

### 3. Lancer tout
```bash
docker compose up -d
```

**Attends 10-15 secondes** (Postgres démarre plus lentement la première fois).

---

## Vérification — Est-ce que ça marche ?

### Via le navigateur
Ouvre **http://localhost:8080** dans Chrome/Firefox/Safari.

Tu dois voir :
- En-tête "TrainShop — Catalogue Produits"
- Une liste de **10 produits** (Casque Bluetooth, Clavier mécanique, etc.)
- Chaque produit : nom, prix, stock
- En bas : badge vert **"✓ Services en bonne santé"** (si healthcheck ok)

### Via le terminal
```bash
# Voir tous les containers actifs
docker ps

# Attendre que tous passent à "healthy" (green)
docker compose ps

# Voir les logs de l'API (elles reçoivent tes requêtes du navigateur)
docker compose logs -f api

# Dans un autre terminal, teste l'API directement
curl http://localhost:3000/api/products
curl http://localhost:3000/api/health
```

Si tout répond **en JSON**, c'est bon.

---

## Architecture : 4 services + réseau + volume

```
                       Ton machine (Windows/macOS/Linux)
                       ══════════════════════════════════
                               localhost

                      ┌──────────────────────┐
                      │   Navigateur         │
                      │   :8080 (nginx)      │
                      └──────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
        ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
        │    web      │  │     api     │  │     db      │
        │  (nginx)    │  │ (Node.js)   │  │ (Postgres)  │
        │ :8080→:80   │  │ :3000→:3000 │  │ :5432       │
        └─────────────┘  └─────────────┘  └─────────────┘
                                │               │
                                ▼               ▼
                          ┌─────────────┐  ┌──────────────┐
                          │   cache     │  │   pgdata     │
                          │  (Redis)    │  │   (Volume)   │
                          │ :6379       │  │ (Persistant) │
                          └─────────────┘  └──────────────┘

Réseau : trainshop_net (bridge custom)
Services communiquent par DNS interne (api → db, api → cache par nom)
```

**Les 4 services** :
1. **web** : nginx alpine, sert HTML/CSS/JS statiques, proxy /api → api:3000
2. **api** : Node.js 20 alpine, Express, routes /api/*, gère DB + cache
3. **db** : PostgreSQL 16, table `products`, init via init.sql
4. **cache** : Redis 7, utilisé par api pour cache produits (TTL 30s)

---

## Commandes essentielles à retenir

### Container lifecycle
```bash
# Tout démarrer (création + démarrage)
docker compose up -d

# Voir l'état
docker compose ps

# Logs du service api
docker compose logs api
docker compose logs -f api      # suivi en temps réel

# Arrêter tout
docker compose down

# Arrêter + supprimer les volumes (DANGER : perte données)
docker compose down -v

# Redémarrer un service
docker compose restart api
```

### Inside containers
```bash
# Entrer dans le shell du container api
docker compose exec api sh

# Exécuter une commande (pas de shell interactif)
docker compose exec api node --version
docker compose exec db psql -U trainer -d trainshop -c "SELECT * FROM products LIMIT 3;"
```

### Images & cleanup
```bash
# Voir les images créées
docker images | grep trainshop

# Reconstruire une image (sans cache)
docker compose build --no-cache api

# Nettoyer tout (images, containers, volumes inutilisés) — ATTENTION
docker system prune -a --volumes
```

### Debugging
```bash
# Inspecter un service (config, status, healthcheck résultat)
docker compose ps api
docker inspect trainshop-api-1  # nom du container

# Stats CPU/RAM en temps réel
docker stats trainshop-api-1

# Tester la connexion au service
docker compose exec api wget -q -O - http://localhost:3000/api/health
```

---

## Pour la formation — Fichiers à lire en premier

1. **DEMO_GUIDE.md** ← commence ici ! Contient 50+ commandes classées par chapitre, avec observations pédagogiques
2. **docs/ARCHITECTURE.md** ← montre le schéma + comment les services communiquent
3. **docs/EXERCISES.md** ← 15 exercices progressifs à donner aux apprenants après chaque chapitre

Tous les fichiers source (Dockerfile, compose, code) ont des commentaires détaillés en français.

---

## Arrêter / Reset / Recommencer à zéro

### Arrêter proprement
```bash
docker compose down
# Les volumes restent (données persistantes)
```

### Tout arrêter + supprimer les données
```bash
docker compose down -v
# Les données Postgres sont supprimées
```

### Relancer après reset
```bash
docker compose up -d
# Les tables sont recréées depuis init.sql
```

### Problème ? "Port déjà en utilisation" ou autre
Voir **docs/TROUBLESHOOTING.md** (15 scénarios + solutions).

---

## Modifier le code en direct (mode dev)

Par défaut, **docker-compose.yml** est prêt pour la démo (pas de bind mount).

Pour **éditer en live** (l'app se met à jour sans rebuild) :
```bash
# Ajouter le override dev
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Les fichiers web/public/*.html et api/server.js sont maintenant liés au container
# Ouvre api/server.js → modifie une route → recharge le browser → c'est à jour
```

Revenir à la prod :
```bash
docker compose down
docker compose up -d
```

---

## Support & Contact

**Trainer** : Mohamed Djabi  
**Entreprise** : MD Consulting Digital  
**Email** : contact@md-consulting.fr  
**Tél** : +33 (sauf pour pings Docker 😊)

Pour toute question sur le projet, ses fondamentaux ou l'intégration dans votre cours.

---

## Prochaines étapes

1. Lis **DEMO_GUIDE.md** pour voir les 50+ commandes classées par thème du cours
2. Lance `docker compose up -d` et joue avec les commandes listées
3. Partage les **EXERCISES.md** aux apprenants pour qu'ils pratiquent
4. Modifie init.sql ou app.js selon tes besoins pédagogiques

Bon cours !
#   D e v O p s - C o u r s - Y n o v  
 