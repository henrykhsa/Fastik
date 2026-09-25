# Arquitetura e Integrações

## Princípio SOA (Service-Oriented Architecture)

O Fastik é **isolado e agnóstico** — não sabe nada sobre o negócio do cliente. Ele orquestra logística pura, servindo tanto:

- **Delivery B2C** (entregas de rua)
- **Logística corporativa** (PMS/POS de hotéis, stewards em eventos)

---

## Diagrama de Integração

```
┌─────────────────────────────────────────────────────────────────┐
│                    ECOSSISTEMA LAURUS                            │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ App Cliente │  │ App Entregad.│  │ Laurus Cloud Core    │  │
│  │ (React Nat.)│  │ (React Nat.) │  │ (ERP/PMS/POS)        │  │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                │                      │              │
│         │ JWT            │ JWT                  │ API Key      │
│         │                │                      │ (Webhooks)   │
└─────────┼────────────────┼──────────────────────┼──────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                         FASTIK                                   │
│                  (Motor de Inteligência Logística)                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    NestJS API Layer                      │   │
│  │  /api/orders  /api/couriers  /api/stores  /api/webhooks │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │                                    │
│  ┌─────────────────────────▼───────────────────────────────┐   │
│  │                  Business Logic Layer                    │   │
│  │  OrderService │ BatchingService │ DelayTimingService     │   │
│  │  WatchdogService │ WebhookService │ TransactionService   │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │                                    │
│  ┌──────────┬──────────────┼──────────────────────────────┐   │
│  │          │              │                              │   │
│  ▼          ▼              ▼                              │   │
│ ┌────┐  ┌───────┐  ┌─────────────┐                      │   │
│ │ PG │  │ Redis │  │   BullMQ    │                      │   │
│ │    │  │       │  │   Workers   │                      │   │
│ └────┘  └───────┘  └─────────────┘                      │   │
│                                                          │   │
│  PostgreSQL 16     Redis 7        Background Jobs        │   │
│  (Dados logíst.)   (Cache/Queue)  (Watchdog, Batching,   │   │
│                                    Delay Timing)         │   │
│                                                          │   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Fluxos de Comunicação

### 1. Entrada: REST API (JWT)

Apps do cliente e entregador consomem a API via tokens JWT padrão.

```
App → POST /api/orders (JWT) → Fastik cria pedido → Retorna PINs
```

### 2. Entrada: Webhooks (API Key)

O Laurus Cloud Core envia pedidos diretamente via webhook protegido:

```
Laurus Core → POST /api/webhooks/order/created (x-api-key) → Fastik cria pedido
```

### 3. Saída: Webhooks Outbound

Quando um pedido é entregue, o Fastik dispara webhook para o POS fechar a conta:

```
Fastik (order.delivered) → POST webhook_url → POS fecha mesa/quarto
```

### 4. Saída: Alertas (Watchdog)

Quando o Watchdog detecta deadlock:

```
Fastik (order.alert_support) → POST webhook_url → Sistema de suporte
```

---

## Isolamento de Banco de Dados

O Fastik possui **banco próprio e independente** do ERP/PMS. Armazena apenas:

| Armazena | NÃO armazena |
|----------|--------------|
| Entregadores (posição, disponibilidade) | Dados financeiros do ERP |
| Corridas/Pedidos (status, timestamps) | Estoque |
| EventLogs (auditoria) | Cardápio/Menu |
| Transações logísticas | Dados de pagamento do cliente |

Os dados de negócio (itens do pedido, valor total) chegam como **payload JSON** no momento da criação e são armazenados "as is" no campo `itemsPayload`.

---

## Background Jobs (BullMQ + Redis)

| Fila | Propósito | Trigger |
|------|-----------|---------|
| `batching` | Agrupar pedidos por CEP | Pedido criado (delayed 120s) |
| `delay-timing` | Sincronizar preparo ↔ entregador | Loja aceita pedido |
| `watchdog` | Detectar deadlocks | Pedido despachado (delayed 4h) |

Todos os jobs usam **delayed jobs** do BullMQ — entram na fila com um `delay` em ms e são processados automaticamente quando o timer expira.

---

## Segurança

| Mecanismo | Protege contra |
|-----------|---------------|
| JWT (Bearer Token) | Acesso não autorizado aos endpoints |
| API Key (x-api-key) | Webhooks falsos |
| ValidationPipe (whitelist + forbidNonWhitelisted) | Injeção de campos extras |
| Lazy Evaluation | Front-end manipulando valores financeiros |
| Clock Drift tolerance | Adulteração de relógio (entregas offline) |
| Double Handshake (PINs) | Disputas de entrega ("não pegou" vs "não deu") |
| EventLog imutável | Adulteração retroativa de timestamps |
| Transaction imutável | Alteração de valores financeiros históricos |
