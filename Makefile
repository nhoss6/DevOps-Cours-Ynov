# ============================================================
# TrainShop — Commandes Docker
# Usage : make <commande>
# ============================================================

.PHONY: help build up down restart logs ps clean fclean dev prod

# Affiche la liste des commandes disponibles
help:
	@echo ""
	@echo "  TrainShop — Commandes disponibles"
	@echo "  =================================="
	@echo "  make build      Build les images Docker"
	@echo "  make up         Démarre tous les services (production)"
	@echo "  make down       Arrête tous les services"
	@echo "  make restart    Redémarre tous les services"
	@echo "  make logs       Affiche les logs en temps réel"
	@echo "  make ps         Affiche l'état des conteneurs"
	@echo "  make dev        Démarre en mode développement (hot reload)"
	@echo "  make prod       Build + démarre en production"
	@echo "  make clean      Supprime les conteneurs et volumes"
	@echo "  make fclean     Supprime tout (images, volumes, réseau)"
	@echo ""

# Build les images sans démarrer
build:
	docker compose build

# Démarre les services en arrière-plan
up:
	docker compose up -d

# Arrête les services
down:
	docker compose down

# Redémarre tous les services
restart:
	docker compose restart

# Logs en temps réel (Ctrl+C pour quitter)
logs:
	docker compose logs -f

# État des conteneurs
ps:
	docker compose ps

# Mode développement (live reload + ports exposés)
dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d

# Build puis démarrage production
prod:
	docker compose up --build -d

# Supprime les conteneurs et volumes nommés
clean:
	docker compose down -v

# Supprime tout : conteneurs, volumes, images buildées
fclean:
	docker compose down -v --rmi local
