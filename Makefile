.PHONY: install build dev docker-build docker-up docker-down prisma-generate prisma-migrate

compose_service = api

PARAMS =

install:
	docker-compose exec ${compose_service} npm install

uninstall:
	docker-compose exec ${compose_service} npm uninstall ${PARAMS}

build:
	npm run build

dev:
	npm run start:dev

run-test:
	docker-compose exec ${compose_service} npm test

run-e2e-test:
	docker-compose exec ${compose_service} npm run test:e2e

docker-build:
	docker-compose build

docker-up:
	docker-compose up

init-docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

prisma-migrate:
	docker-compose exec ${compose_service} npx prisma migrate dev

prisma-generate:
	docker-compose exec ${compose_service} npx prisma generate

prisma-migrate-init:
	docker-compose exec ${compose_service} npx prisma migrate dev --name "init"

setup: docker-build init-docker-up prisma-migrate-init

# Development startup
dev-docker:
	docker-compose up --build
