# Status do Projeto

> Última atualização: 2026-08-25

## ✅ Implementado

### Infraestrutura
- [x] Setup NestJS 11 + Bun + TypeScript (strict)
- [x] Prisma ORM com schema completo (Cubo Estrela)
- [x] Docker Compose (PostgreSQL 16 + Redis 7)
- [x] ConfigModule com variáveis tipadas
- [x] Swagger/OpenAPI autodocumentado
- [x] ValidationPipe global (whitelist, transform)
- [x] CORS configurável
- [x] Seed de dados de teste
- [x] Path aliases (@/, @common/, @modules/)

### Autenticação
- [x] JWT Strategy (Passport)
- [x] API Key Guard (webhooks S2S)
- [x] Endpoint de geração de token (dev/test)

### Módulo Order (Core)
- [x] CRUD de pedidos
- [x] Geração de PINs (Double Handshake)
- [x] Validação OR no dispatch (Consenso de Duas Fases)
- [x] Entrega com validação Clock Drift (offline)
- [x] Congelamento de bônus em validações suspeitas
- [x] Lazy Evaluation (cálculo de penalidades pelo servidor)
- [x] Transações imutáveis (débito loja ↔ crédito entregador)

### Módulos de Suporte
- [x] Courier service (CRUD, localização, disponibilidade)
- [x] Store service (CRUD, busca por externalId)
- [x] Client service (CRUD)
- [x] EventLog service (registro imutável, timeline)
- [x] Transaction service (criação imutável, balanço)

### Background Processing
- [x] Batching service (lógica de agrupamento por CEP)
- [x] Delay Timing service (cálculo e agendamento)
- [x] Watchdog service (arm/disarm)
- [x] Watchdog processor (BullMQ worker completo)

### Webhooks
- [x] Outbound: `order.delivered` e `order.alert_support`
- [x] Inbound: controller com API Key guard

### Documentação
- [x] README principal
- [x] docs/README.md (visão geral + setup)
- [x] docs/data-model.md (modelagem completa)
- [x] docs/business-logic.md (6 lógicas de negócio)
- [x] docs/api-reference.md (todos os endpoints)
- [x] docs/architecture.md (diagramas + integrações)

---

## 🔲 Próximos Passos (TODO)

### Prioridade Alta
- [ ] Primeira migration do Prisma (`prisma migrate dev`)
- [ ] BullMQ Processors para Batching e Delay Timing (faltam workers)
- [ ] Push notifications para o app do entregador
- [ ] Testes unitários (OrderService, BatchingService)
- [ ] Testes E2E (fluxo completo de pedido)

### Prioridade Média
- [ ] Cálculo de distância real (Haversine ou PostGIS)
- [ ] Webhook outbound com retry (fila BullMQ dedicada)
- [ ] Rate limiting nos endpoints
- [ ] Health check endpoint (`/api/health`)
- [ ] Logging estruturado (Pino/Winston)
- [ ] Métricas (Prometheus)

### Prioridade Baixa
- [ ] Dockerfile para produção (multi-stage com Bun)
- [ ] CI/CD pipeline
- [ ] Caching (Redis) para queries frequentes
- [ ] WebSocket para tracking em tempo real
- [ ] Painel admin (dashboard de operações)
- [ ] Multi-tenancy (múltiplas operações logísticas)
