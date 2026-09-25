# Modelagem de Dados

## Filosofia

A modelagem foge do CRUD tradicional e adota **Event Sourcing simplificado** em um **Cubo Estrela**:

- **Tabela `Order`** = Fato central (chaves estrangeiras para todas as dimensões)
- **Tabela `EventLog`** = Imutável, fonte da verdade dos timestamps
- **Tabela `Transaction`** = Imutável, cofre financeiro (nunca UPDATE, só INSERT)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Store     │     │   Client    │     │   Courier   │
│ (Dimensão)  │     │ (Dimensão)  │     │ (Dimensão)  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────┬───────┴───────────────────┘
                   │
            ┌──────▼──────┐
            │    Order    │
            │   (Fato)    │
            └──────┬──────┘
                   │
        ┌──────────┼──────────┐
        │                     │
  ┌─────▼─────┐       ┌──────▼──────┐
  │ EventLog  │       │ Transaction │
  │ (Imutável)│       │  (Imutável) │
  └───────────┘       └─────────────┘
```

---

## Entidades

### Store (Loja / Origem)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| externalId | String (unique) | ID no ERP/PMS externo |
| name | String | Nome da loja |
| zipCode | String | CEP (usado no Batching) |
| address | String | Endereço completo |
| lat/lng | Float? | Coordenadas geográficas |
| isActive | Boolean | Se a loja está ativa |

### Client (Cliente / Destino)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| externalId | String? (unique) | ID no app do cliente |
| name | String | Nome |
| phone | String? | Telefone |
| zipCode | String | CEP (usado no Batching) |
| address | String | Endereço de entrega |
| lat/lng | Float? | Coordenadas |

### Courier (Entregador)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| externalId | String? (unique) | ID externo |
| name | String | Nome |
| phone | String | Telefone |
| vehicleType | Enum | MOTORCYCLE, BICYCLE, CAR, ON_FOOT |
| isActive | Boolean | Ativo no sistema |
| isAvailable | Boolean | Disponível para corridas |
| currentLat/Lng | Float? | Posição atual (GPS) |

### Order (Pedido — Fato Central)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| externalId | String? | ID do pedido no ERP |
| status | Enum | Estado atual (ver ciclo abaixo) |
| storeId | FK → Store | Loja de origem |
| clientId | FK → Client | Cliente destino |
| courierId | FK → Courier? | Entregador atribuído |
| baseDeliveryFee | Float | Taxa cobrada do cliente (R$) |
| maxPrepTime | Int | Tempo máx. preparo (min) |
| maxDeliveryTime | Int | Tempo máx. entrega (min) |
| storePin | String? | PIN para Double Handshake (loja) |
| courierPin | String? | PIN para Double Handshake (entregador) |
| batchId | UUID? | Agrupa pedidos na mesma rota |
| itemsPayload | JSON? | Itens do pedido (payload do ERP) |
| isOfflineDelivery | Boolean | Se foi validado offline |

#### Status do Pedido (Ciclo de Vida)

```
CREATED → ACCEPTED → WAITING_COURIER → COURIER_ASSIGNED → ARRIVED_AT_STORE → DISPATCHED → DELIVERED
                                                                                    ↓
                                                                              ALERT_SUPPORT
                                                                              (Watchdog)
```

- `CREATED` — Pedido criado, aguardando loja aceitar
- `ACCEPTED` — Loja aceitou, Delay Timing inicia
- `WAITING_COURIER` — Delay expirou, hora de notificar entregador
- `COURIER_ASSIGNED` — Entregador aceitou a corrida
- `ARRIVED_AT_STORE` — Entregador chegou na loja
- `DISPATCHED` — PIN validado (Double Handshake), saiu para entrega
- `DELIVERED` — Entrega confirmada
- `CANCELLED` — Cancelado
- `ALERT_SUPPORT` — Watchdog disparou (deadlock detectado)

### EventLog (Fonte da Verdade — Imutável)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| orderId | FK → Order | Pedido relacionado |
| event | Enum | Tipo de evento |
| timestamp | DateTime | **SEMPRE UTC** (relógio do servidor) |
| metadata | JSON? | Dados extras (lat/lng, device info) |
| source | Enum | Quem gerou (SERVER, STORE_APP, COURIER_APP, etc.) |

**Regra:** Nunca deletar ou atualizar. Apenas INSERT.

#### Eventos Possíveis

`CREATED`, `ACCEPTED_BY_STORE`, `COURIER_NOTIFIED`, `COURIER_ACCEPTED`, `ARRIVED_AT_STORE`, `PICKUP_CONFIRMED`, `DISPATCHED`, `ARRIVED_AT_CLIENT`, `DELIVERED`, `DELIVERY_CONFIRMED`, `CANCELLED`, `WATCHDOG_TRIGGERED`

### Transaction (O Cofre — Imutável)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| orderId | FK → Order | Pedido relacionado |
| type | Enum | Tipo da transação |
| amount | Float | Valor (sempre positivo) |
| direction | Enum | CREDIT ou DEBIT |
| description | String? | Descrição legível |
| metadata | JSON? | Dados de contexto |

**Regra:** Nunca atualizar um valor antigo. Para ajustes, criar transação de compensação.

#### Tipos de Transação

| Tipo | Descrição |
|------|-----------|
| `DELIVERY_FEE` | Taxa de entrega padrão |
| `DELAY_PENALTY_STORE` | Penalidade à loja por atraso no preparo |
| `DELAY_BONUS_COURIER` | Bônus ao entregador pela espera |
| `CANCELLATION_FEE` | Taxa de cancelamento |
| `ADJUSTMENT` | Compensação manual |

---

## Índices

Otimizações para queries frequentes:

- `orders.status` — filtrar por status
- `orders.store_id`, `orders.client_id`, `orders.courier_id` — joins
- `orders.batch_id` — agrupar pedidos do mesmo batch
- `event_logs.order_id` — timeline de um pedido
- `event_logs.event` — buscar por tipo de evento
- `event_logs.timestamp` — range queries temporais
- `transactions.order_id` — balanço financeiro de um pedido
- `transactions.type` — relatórios por tipo
