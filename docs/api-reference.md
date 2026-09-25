# API Reference

## Autenticação

### JWT (Apps de Cliente/Entregador/Loja)

Todos os endpoints sob `/api/*` (exceto webhooks) requerem Bearer token:

```
Authorization: Bearer <jwt_token>
```

**Payload do JWT:**
```json
{
  "sub": "user-uuid",
  "role": "client" | "courier" | "store" | "admin",
  "iat": 1234567890,
  "exp": 1234654290
}
```

### API Key (Webhooks Server-to-Server)

Endpoints sob `/api/webhooks/*` requerem header:

```
x-api-key: <webhook_api_key>
```

---

## Endpoints

### Auth

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/api/auth/token` | Gerar token JWT (dev/test) | Nenhuma |

---

### Orders (Módulo Central)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/api/orders` | Criar pedido (gera PINs) | JWT |
| GET | `/api/orders` | Listar pedidos (filtros: status, storeId, courierId) | JWT |
| GET | `/api/orders/:id` | Buscar pedido por ID | JWT |
| PATCH | `/api/orders/:id/accept` | Loja aceita pedido | JWT |
| PATCH | `/api/orders/:id/dispatch` | Despachar (Double Handshake PIN) | JWT |
| PATCH | `/api/orders/:id/deliver` | Confirmar entrega (Clock Drift) | JWT |

#### POST /api/orders — Criar Pedido

**Request:**
```json
{
  "storeId": "uuid",
  "clientId": "uuid",
  "baseDeliveryFee": 8.50,
  "maxPrepTime": 25,
  "maxDeliveryTime": 30,
  "externalId": "erp-order-123",
  "itemsPayload": { "items": [...] }
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "status": "CREATED",
  "storePin": "A1B2C3",
  "courierPin": "D4E5F6",
  "baseDeliveryFee": 8.50,
  ...
}
```

#### PATCH /api/orders/:id/dispatch — Despachar (Double Handshake)

**Request:**
```json
{
  "pin": "D4E5F6",
  "source": "store"
}
```

**Validação OR:**
- Loja envia `courierPin` → ✅
- Entregador envia `storePin` → ✅
- Qualquer outra combinação → ❌ 400

#### PATCH /api/orders/:id/deliver — Confirmar Entrega

**Request (presencial):**
```json
{
  "pin": "CLIENT_PIN"
}
```

**Request (offline com QR Code):**
```json
{
  "isOffline": true,
  "qrPayload": {
    "timestamp": "2026-08-25T14:30:00.000Z",
    "clientId": "uuid",
    "orderId": "uuid"
  }
}
```

---

### Couriers

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/couriers` | Listar entregadores (?available=true) | JWT |
| GET | `/api/couriers/:id` | Buscar entregador | JWT |
| PATCH | `/api/couriers/:id/location` | Atualizar GPS | JWT |
| PATCH | `/api/couriers/:id/availability` | Disponibilidade on/off | JWT |

#### PATCH /api/couriers/:id/location

```json
{ "lat": -23.5590, "lng": -46.6570 }
```

#### PATCH /api/couriers/:id/availability

```json
{ "isAvailable": true }
```

---

### Stores

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/stores` | Listar lojas ativas | JWT |
| GET | `/api/stores/:id` | Buscar loja | JWT |

---

### Clients

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/clients` | Listar clientes | JWT |
| GET | `/api/clients/:id` | Buscar cliente | JWT |

---

### Webhooks (Server-to-Server)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/api/webhooks/order/created` | Receber pedido do ERP/PMS | API Key |
| POST | `/api/webhooks/order/cancelled` | Receber cancelamento | API Key |

**Header obrigatório:**
```
x-api-key: <WEBHOOK_API_KEY>
```

---

## Códigos de Erro

| HTTP | Cenário |
|------|---------|
| 400 | Validação falhou / PIN inválido / Status incompatível |
| 401 | Token JWT ausente/inválido ou API Key inválida |
| 404 | Recurso não encontrado |
| 500 | Erro interno do servidor |

### Exemplo de Erro (400)

```json
{
  "statusCode": 400,
  "message": "Order cannot be dispatched in status: CREATED",
  "error": "Bad Request"
}
```

---

## Swagger

Documentação interativa disponível em:

```
http://localhost:3000/docs
```

Permite testar todos os endpoints diretamente no navegador com autenticação configurada.
