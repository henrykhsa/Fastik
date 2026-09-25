# Fastik — Motor Logístico Headless

## Visão Geral

Motor backend independente (headless) especializado em logística, cotação de frete e gerenciamento do ciclo de vida de pedidos. Funciona como o "cérebro logístico" do ecossistema Laurus.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | NestJS 11 (TypeScript strict) |
| Runtime | Bun |
| Banco | PostgreSQL 16 |
| ORM | Prisma 6 |
| Filas | Redis 7 + BullMQ |
| Pacotes | pnpm |

---

## Módulos

| Módulo | Responsabilidade |
|--------|-----------------|
| `tenant` | Provisionamento de lojas (onboarding via Bootstrap Token) |
| `delivery` | Cotação de frete (Haversine + zonas por raio) |
| `order` | Ciclo de vida completo do pedido (12 status, 3 PINs) |
| `webhook` | Notificação push com retry exponencial + log de auditoria |
| `auth` | JWT para dev/testes |

---

## Como Rodar

```bash
# 1. Dependências
pnpm install

# 2. Infraestrutura local
docker compose up -d   # PostgreSQL + Redis

# 3. Banco de dados
pnpm prisma:migrate:dev
pnpm prisma:seed

# 4. Servidor
pnpm start:dev
```

## URLs

| Serviço | URL |
|---------|-----|
| API | http://localhost:3000/api |
| Swagger | http://localhost:3000/docs |

---

## Documentação

| Arquivo | Conteúdo |
|---------|----------|
| `docs/architecture-spec.md` | Spec completa (status, fluxos, segurança, webhooks) |
| `docs/routes.md` | Todas as 16 rotas com request/response |
| `docs/data-model.md` | Modelagem de dados (legado — ver schema.prisma) |
| `docs/business-logic.md` | Lógicas de negócio detalhadas |

---

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_HOST` / `REDIS_PORT` | Redis para BullMQ |
| `BOOTSTRAP_TOKEN` | Token de uso único para provisionar tenants |
| `JWT_SECRET` | Segredo para tokens JWT (dev) |
| `PORT` | Porta da API (default: 3000) |
