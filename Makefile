.PHONY: install build dev docker-build docker-up docker-down prisma-generate prisma-migrate

install:
	npm install

build:
	npm run build

dev:
	npm run start:dev

docker-build:
	docker-compose build --no-cache

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

prisma-migrate:
	docker-compose exec api npx prisma migrate dev

prisma-migrate-init:
	docker-compose exec api npx prisma migrate dev --name "init"

setup: install docker-build docker-up prisma-migrate-init

# Development startup
dev-docker:
	docker-compose up --build