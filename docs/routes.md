# Rotas da API — Documentação Completa

> Prefixo global: `/api`
> Base URL (dev): `http://localhost:3000`

---

## 🔓 Auth (Dev Only)

### `POST /api/auth/token`

Gera token JWT para testes. **Não usar em produção.**

| Auth | Body | Response |
|------|------|----------|
| Nenhuma | `{ sub, role }` | `{ access_token }` |

---

## 🏪 Tenants (Provisionamento)

### `POST /api/v1/tenants/provision`

Provisiona ou atualiza uma loja no motor logístico.

| Auth | Header |
|------|--------|
| `x-bootstrap-token` | Token de uso único |

**Request:**
```json
{
  "externalPmsId": "laurus-store-001",
  "name": "Pizzaria Bella",
  "webhookUrl": "https://laurus.app/webhooks/fastik",
  "lat": -23.5613,
  "lng": -46.6560,
  "deliveryZones": [
    { "name": "Área 1", "fee": 5.00, "estimatedTimeMinutes": 25, "maxRadiusKm": 3.0 },
    { "name": "Área 2", "fee": 8.00, "estimatedTimeMinutes": 40, "maxRadiusKm": 6.0 }
  ]
}
```

**Response (201):**
```json
{
  "storeId": "uuid",
  "apiKey": "fstk_a1b2c3d4e5f6...",
  "name": "Pizzaria Bella",
  "externalPmsId": "laurus-store-001",
  "isNewStore": true,
  "deliveryZonesCount": 2
}
```

---

## 🚚 Delivery (Cotação de Frete)

### `POST /api/v1/delivery/quote`

Calcula viabilidade e custo de entrega por coordenadas.

| Auth | Header |
|------|--------|
| `x-api-key` | API Key da loja |

**Request:**
```json
{
  "clientLatitude": -23.5580,
  "clientLongitude": -46.6620
}
```

**Response (dentro da área):**
```json
{
  "isDeliverable": true,
  "deliveryFee": 5.00,
  "estimatedTimeMinutes": 25,
  "zoneName": "Área 1",
  "distanceKm": 2.34
}
```

**Response (fora da área):**
```json
{
  "isDeliverable": false,
  "distanceKm": 12.5,
  "message": "Endereço fora da área de entrega"
}
```

---

## 📦 Orders (Ciclo de Vida do Pedido)

> Todas as rotas requerem: `x-api-key` (identifica a loja)

### `POST /api/v1/orders` — Criar Pedido

Cria pedido, gera 3 PINs. Suporta header `Idempotency-Key`.

**Request:**
```json
{
  "externalId": "laurus-order-123",
  "clientAddress": {
    "address": "Rua Haddock Lobo, 200",
    "lat": -23.5580,
    "lng": -46.6620,
    "complement": "Apt 42"
  },
  "deliveryFee": 5.00,
  "onItemUnavailable": "CANCEL_ITEM",
  "itemsPayload": { "items": [...] }
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "externalId": "laurus-order-123",
  "status": "RECEIVED",
  "storePin": "A1B2C3",
  "courierPin": "D4E5F6",
  "clientPin": "G7H8I9",
  "deliveryFee": 5.00,
  "onItemUnavailable": "CANCEL_ITEM",
  "createdAt": "2026-08-26T12:00:00.000Z"
}
```

---

### `GET /api/v1/orders` — Listar Pedidos

| Query Param | Tipo | Obrigatório | Descrição |
|-------------|------|-------------|-----------|
| `status` | string | ❌ | Filtrar por status |

---

### `GET /api/v1/orders/:id` — Buscar Pedido

---

### Transições de Status

| # | Método | Rota | Transição | Body |
|---|--------|------|-----------|------|
| 1 | PATCH | `/api/v1/orders/:id/accept` | RECEIVED → ACCEPTED | — |
| 2 | PATCH | `/api/v1/orders/:id/reject` | RECEIVED → REJECTED | — |
| 3 | PATCH | `/api/v1/orders/:id/ready` | ACCEPTED → READY | — |
| 4 | PATCH | `/api/v1/orders/:id/request-change` | ACCEPTED → AWAITING_CHANGE | — |
| 5 | PATCH | `/api/v1/orders/:id/resolve-change` | AWAITING_CHANGE → ACCEPTED/CANCELLED | `{ accepted: boolean }` |
| 6 | PATCH | `/api/v1/orders/:id/dispatch` | ACCEPTED/READY → DISPATCHED | `{ pin, source }` |
| 7 | PATCH | `/api/v1/orders/:id/deliver` | DISPATCHED → DELIVERED | `{ clientPin }` |
| 8 | PATCH | `/api/v1/orders/:id/fail` | DISPATCHED → FAILED_DELIVERY | `{ faultType }` |
| 9 | PATCH | `/api/v1/orders/:id/return-decision` | AWAITING_RETURN_DECISION → RETURNING/DISCARDED | `{ decision }` |
| 10 | PATCH | `/api/v1/orders/:id/cancel` | ACCEPTED/READY/AWAITING_CHANGE → CANCELLED | — |

---

### Detalhes dos Bodies de Transição

#### Dispatch (Double Handshake — PIN OR)
```json
{ "pin": "D4E5F6", "source": "store" }
```
- `source = "store"` → pin deve ser o `courierPin`
- `source = "courier"` → pin deve ser o `storePin`

#### Deliver (Client PIN)
```json
{ "clientPin": "G7H8I9" }
```

#### Fail Delivery
```json
{ "faultType": "CLIENT_FAULT" }
```
Valores: `STORE_FAULT`, `COURIER_FAULT`, `CLIENT_FAULT`

#### Return Decision
```json
{ "decision": "RETURN" }
```
Valores: `RETURN`, `DISCARD`

#### Resolve Change
```json
{ "accepted": true }
```
- `true` → volta para ACCEPTED
- `false` → aplica regra `onItemUnavailable` (CANCEL_ITEM ou CANCEL_ORDER)

---

## 📋 Resumo de Todas as Rotas

| # | Método | Rota | Auth | Descrição |
|---|--------|------|------|-----------|
| 1 | POST | `/api/auth/token` | — | Gerar JWT (dev) |
| 2 | POST | `/api/v1/tenants/provision` | Bootstrap Token | Provisionar loja |
| 3 | POST | `/api/v1/delivery/quote` | x-api-key | Cotação de frete |
| 4 | POST | `/api/v1/orders` | x-api-key | Criar pedido |
| 5 | GET | `/api/v1/orders` | x-api-key | Listar pedidos |
| 6 | GET | `/api/v1/orders/:id` | x-api-key | Buscar pedido |
| 7 | PATCH | `/api/v1/orders/:id/accept` | x-api-key | Aceitar pedido |
| 8 | PATCH | `/api/v1/orders/:id/reject` | x-api-key | Rejeitar pedido |
| 9 | PATCH | `/api/v1/orders/:id/ready` | x-api-key | Marcar pronto |
| 10 | PATCH | `/api/v1/orders/:id/request-change` | x-api-key | Solicitar alteração |
| 11 | PATCH | `/api/v1/orders/:id/resolve-change` | x-api-key | Resolver alteração |
| 12 | PATCH | `/api/v1/orders/:id/dispatch` | x-api-key | Despachar (PIN) |
| 13 | PATCH | `/api/v1/orders/:id/deliver` | x-api-key | Entregar (clientPin) |
| 14 | PATCH | `/api/v1/orders/:id/fail` | x-api-key | Falha na entrega |
| 15 | PATCH | `/api/v1/orders/:id/return-decision` | x-api-key | Decisão de retorno |
| 16 | PATCH | `/api/v1/orders/:id/cancel` | x-api-key | Cancelar pedido |

**Total: 16 rotas**
