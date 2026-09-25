# Documento de Arquitetura do Sistema: Fastik

> Motor Logístico & Pedidos Headless

---

## 1. Visão Geral e Proposta de Valor

**O que é o Fastik:** Um motor backend independente (headless) especializado em logística, roteirização, cotação de frete e gerenciamento do ciclo de vida de pedidos.

**Papel no Ecossistema:** O Fastik funciona como o "cérebro logístico" por trás de múltiplos canais de venda (inicialmente integrado ao Laurus PMS/POS e, futuramente, ao app de delivery próprio da marca). Ele centraliza toda a inteligência de entrega e processamento, livrando as pontas de interface de regras matemáticas complexas.

---

## 2. Arquitetura de Identidade e Provisionamento (Onboarding)

- **Sem Cadastro Manual:** O Fastik não possui interface de cadastro de lojistas aberta ao público.

- **Provisionamento Automático via API:** Quando um cliente ativa o Fastik dentro do Laurus PMS, o próprio Laurus dispara uma requisição de provisionamento (`POST /api/v1/tenants/provision`).

- **Token de Ativação Único (Bootstrap Token):** A requisição de provisionamento utiliza um token de uso único e curtíssima duração para blindar a API contra acessos indesejados.

- **Fonte Única da Verdade (Single Source of Truth):** O Laurus gerencia os dados cadastrais da empresa. O Fastik guarda apenas a referência e as credenciais logísticas. Alterações cadastrais ocorrem exclusivamente no Laurus e, sempre que feitas, são enviadas para o Fastik que irá atualizar as informações, evitando conflitos de dados.

---

## 3. Motor de Cotação de Frete e Zonas de Entrega

- **Centralização das Regras:** A tabela de preços, os prazos e as faixas de atendimento (equivalente às zonas/raios do iFood) ficam armazenadas e sob responsabilidade exclusiva do Fastik.

- **Endpoint de Cotação (`/quote`):** Quando o cliente final digita o endereço no cardápio digital da Laurus, o sistema consulta a API do Fastik enviando as coordenadas.

- **Processamento:** O Fastik calcula a distância (fórmula de Haversine), cruza com as regras de raio daquela loja específica e devolve:
  - **Viabilidade** (`isDeliverable`)
  - **Taxa de entrega exata** (`deliveryFee`)
  - **Prazo estimado em minutos** (`estimatedTimeMinutes`)
  - **Identificação da zona de entrega** (`zoneName`)

---

## 4. Ingestão e Ciclo de Vida do Pedido

### Recepção

O pedido finalizado no canal de atendimento (WhatsApp, Cardápio Laurus ou futuro app) é enviado para a API de ingestão do Fastik.

### Segurança Integrada (3 PINs)

Na criação do pedido, o Fastik gera automaticamente **três** códigos de segurança únicos:

| PIN | Propósito |
|-----|-----------|
| `storePin` | Código da loja que pode ser passado para o entregador inserir e despachar o pedido (caso o pedido não esteja marcado como preparado) |
| `courierPin` | Código do entregador que pode ser passado para a loja confirmar o despacho, ou a loja libera sem confirmação caso o entregador não marque chegada |
| `clientPin` | Código do cliente que o entregador precisa inserir para liberar o pedido como entregue |

### Fluxo Principal (Happy Path)

```
RECEIVED → ACCEPTED → READY → DISPATCHED → DELIVERED
```

| Status | Descrição |
|--------|-----------|
| `RECEIVED` | Pedido injetado no motor logístico, aguardando ação da loja |
| `ACCEPTED` | Loja aceitou o pedido e iniciou o preparo |
| `READY` | Pedido embalado, pronto para retirada pelo entregador |
| `DISPATCHED` | Entregador pegou o pedido (validação via PIN) |
| `DELIVERED` | Entregador finalizou a entrega (validação via `clientPin`) |

### Fluxos de Exceção

#### Rejeição Inicial (loja não pode atender)
```
RECEIVED → REJECTED
```
Ex: Loja fechou, falta de ingrediente, sistema fora do ar.

#### Cancelamentos durante preparo
```
ACCEPTED ou READY → CANCELLED
```
Ex: Cliente desistiu, problema grave na cozinha.

#### Solicitação de Alteração (Loja pede mudança ao cliente)

A partir do status `ACCEPTED`, a loja (ou gestor) pode solicitar uma alteração no pedido — por exemplo, um item em falta na cozinha.

```
ACCEPTED → AWAITING_CHANGE (loja solicita alteração)
```

O sistema gestor (Laurus) negocia com o cliente e devolve a decisão:

```
AWAITING_CHANGE → ACCEPTED (cliente aceitou a alteração, pedido segue)
AWAITING_CHANGE → CANCELLED (cliente não aceitou, pedido cancelado)
```

**Regra de cancelamento de itens:**

Na criação do pedido, o cliente define sua preferência (`onItemUnavailable`):

| Preferência | Comportamento |
|-------------|--------------|
| `CANCEL_ITEM` | Se faltar um item, apenas aquele item é removido e o pedido segue com o restante |
| `CANCEL_ORDER` | Se faltar qualquer item, o pedido inteiro é cancelado |

Quando o gestor solicita cancelamento de um item, o Fastik verifica essa regra:
- Se `CANCEL_ITEM` → remove o item do payload, recalcula `deliveryFee` se necessário, volta para `ACCEPTED`
- Se `CANCEL_ORDER` → move para `CANCELLED`

> **Nota:** A negociação entre loja e cliente acontece no sistema gestor (Laurus). O Fastik apenas gerencia os estados e aplica a regra de preferência definida na criação do pedido.

#### Falha na Entrega
```
DISPATCHED → FAILED_DELIVERY (com motivo: STORE_FAULT | COURIER_FAULT | CLIENT_FAULT)
```
Ex: Cliente não atende, endereço incorreto, imprevisto com o motoboy, loja embalou errado.

O motivo da falha (`faultType`) é registrado e devolvido via webhook para o sistema gestor (Laurus, iFood, etc.) tomar a decisão sobre o pedido.

```
FAILED_DELIVERY → AWAITING_RETURN_DECISION (loja decide o próximo passo)
```

A loja então decide:
```
AWAITING_RETURN_DECISION → RETURNING (entregador retorna o pedido à loja)
AWAITING_RETURN_DECISION → DISCARDED (pedido descartado — não é viável retornar)
```

| Status | Descrição |
|--------|-----------|
| `FAILED_DELIVERY` | Entrega não efetuada (registra culpado: loja/entregador/cliente) |
| `AWAITING_RETURN_DECISION` | Aguardando decisão da loja sobre o destino do pedido |
| `RETURNING` | Entregador retornando o pedido à loja |
| `DISCARDED` | Pedido descartado (retorno inviável) |

> **Nota:** Reembolso/dispute é responsabilidade do sistema gestor (Laurus, iFood, etc.), não do Fastik. O Fastik apenas informa o motivo da falha via webhook.

### Diagrama Completo de Status

```
                    ┌──────────┐
                    │ RECEIVED │
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              ▼                      ▼
        ┌──────────┐          ┌──────────┐
        │ ACCEPTED │◄─────┐   │ REJECTED │ (terminal)
        └──┬───┬───┘      │   └──────────┘
           │   │           │
           │   └───────────┼──────────────┐
           │               │              │
           ▼               │              ▼
  ┌─────────────────┐     │        ┌───────────┐
  │ AWAITING_CHANGE │─────┘        │ CANCELLED │ (terminal)
  │ (loja pede alt.)│──────────────►│           │
  └─────────────────┘              └───────────┘
           │                             ▲
           │ (cliente aceitou)           │
           ▼                             │
        ┌──────────┐                     │
        │  READY   │─────────────────────┘
        └────┬─────┘   (cancelamento)
             │
             ▼
        ┌──────────────┐
        │  DISPATCHED  │
        └────┬────┬────┘
             │    │
             │    └──────────────────────┐
             ▼                           ▼
        ┌───────────┐         ┌─────────────────┐
        │ DELIVERED │         │ FAILED_DELIVERY │
        └───────────┘         │ (fault: store/  │
          (terminal)          │ courier/client) │
                              └────────┬────────┘
                                       │
                                       ▼
                          ┌────────────────────────────┐
                          │ AWAITING_RETURN_DECISION   │
                          │ (loja decide destino)      │
                          └─────────┬──────────┬───────┘
                                    │          │
                                    ▼          ▼
                            ┌───────────┐  ┌───────────┐
                            │ RETURNING │  │ DISCARDED │
                            └───────────┘  └───────────┘
                             (terminal)     (terminal)
```

---

## 5. Modelo de Comunicação (Event-Driven / Webhooks Push)

- **Zero Polling:** O Fastik opera em modelo Push (Orientado a Eventos) para evitar sobrecarga de rede e banco de dados.

- **Disparo Ativo:** Toda vez que um pedido sofre alteração de status, o Fastik dispara ativamente um webhook (`POST`) para a URL cadastrada pela Laurus.

- **Resiliência e Retentativas (Retry Policy):** O serviço de webhooks possui política de nova tentativa com backoff exponencial caso o servidor da Laurus esteja momentaneamente indisponível, garantindo que nenhum evento de status seja perdido.

- **Auto-Cancelamento por Timeout:** Caso o status inicial (`RECEIVED`) não seja aceito pela loja dentro de um prazo configurável (ex: dashboard offline), o pedido é automaticamente cancelado sem ser aceito.

- **Validação por PIN nas Transições:** Os demais status (após ACCEPTED) podem avançar por validação direta do entregador (na retirada) e cliente final (na entrega) usando os códigos PIN, empurrando assim o status do pedido sem depender da loja estar online.

---

## 6. Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Backend / Framework | NestJS (TypeScript) em módulos |
| Banco de Dados | PostgreSQL |
| ORM | Prisma |
| Runtime | Bun |
| Gerenciador de Pacotes | pnpm |
| Comunicação | REST APIs (x-api-key) + Webhooks HTTP Push |
| Filas / Jobs | Redis + BullMQ (retry, timers) |

---

## 7. Detalhes Avançados (Último Kilômetro)

### 7.1 Idempotência na Ingestão de Pedidos

**Problema:** Falha de rede pode causar envio duplicado do mesmo pedido.

**Solução:** Constraint `@@unique([storeId, externalId])` no Prisma. Se repetir, devolve o pedido já criado. Suporta também header `Idempotency-Key` como override.

### 7.2 Isolamento Rígido de Tenants (Multi-tenancy Safety)

**Problema:** Motor centralizado atende múltiplas lojas; erro de código poderia vazar dados entre tenants.

**Solução:** `StoreApiKeyGuard` injeta o `store` no request de forma imutável. Toda query no `OrderService` filtra por `storeId` do contexto — nenhuma operação aceita storeId como input externo.

### 7.3 Rate Limiting

**Problema:** Bug no sistema da ponta pode disparar milhares de requisições/segundo.

**Solução:** `@nestjs/throttler` integrado ao Redis para limitar por loja. (A implementar na camada de middleware.)

### 7.4 Log de Auditoria de Webhooks

**Problema:** Se Laurus ficar offline e perder um webhook, precisa de ferramentas para debug.

**Solução:** Tabela `WebhookLog` registra cada disparo com: evento, payload, status HTTP retornado, tentativa, e mensagem de erro. BullMQ com 5 tentativas e backoff exponencial (5s base).

---

## 8. Análise de Cobertura (Implementação Atual)

### ✅ Implementado

| Requisito | Módulo/Arquivo |
|-----------|---------------|
| Provisionamento de tenants (upsert) | `src/modules/tenant/` |
| Bootstrap Token (uso único) | `BootstrapTokenGuard` |
| Geração de apiKey segura (crypto) | `TenantService` |
| Zonas de entrega (fee, prazo, raio) | Schema `DeliveryZone` |
| Cotação de frete (Haversine) | `src/modules/delivery/` |
| Retorno: isDeliverable, fee, time, zone | `DeliveryService.quote()` |
| Auth por x-api-key | `StoreApiKeyGuard` |
| 3 PINs (store, courier, client) | Schema `Order` + `OrderService.create()` |
| Ciclo completo de status (12 estados) | Enum `OrderStatus` |
| Idempotência (storeId+externalId unique) | Schema `@@unique` + header `Idempotency-Key` |
| Isolamento de tenants | Guard injeta storeId imutável no request |
| Webhook push com retry exponencial | `WebhookModule` + BullMQ (5 tentativas) |
| Log de auditoria de webhooks | Tabela `WebhookLog` |
| Fluxo de falha na entrega (fault type) | `FAILED_DELIVERY` + `AWAITING_RETURN_DECISION` |
| Solicitação de alteração | `AWAITING_CHANGE` + regra `onItemUnavailable` |
| Stack: NestJS + TS + PostgreSQL + Prisma | ✅ |

### 🔲 Próximos Passos

| # | Requisito | Descrição |
|---|-----------|-----------|
| 1 | Rate Limiting | Integrar `@nestjs/throttler` por tenant |
| 2 | Auto-cancelamento por timeout | Job BullMQ que cancela se loja não aceitar em X min |
| 3 | Integração webhook no OrderService | Chamar `webhookService.notifyStatusChange()` em cada transição |
| 4 | Testes | Unitários + E2E para o ciclo completo |
| 5 | Migration | `prisma migrate dev` para criar tabelas no banco |
