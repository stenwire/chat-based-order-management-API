.PHONY: install build dev docker-build docker-up docker-down prisma-generate prisma-migrate

install:
	docker-compose exec api npm install

build:
	npm run build

dev:
	npm run start:dev

run-test:
	docker-compose exec api npm test

docker-build:
	docker-compose build

docker-up:
	docker-compose up

docker-down:
	docker-compose down

prisma-migrate:
	docker-compose exec api npx prisma migrate dev

prisma-generate:
	docker-compose exec api npx prisma generate

prisma-migrate-init:
	docker-compose exec api npx prisma migrate dev --name "init"

setup: install docker-build docker-up prisma-migrate-init

# Development startup
dev-docker:
	docker-compose up --build