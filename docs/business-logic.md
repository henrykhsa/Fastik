# Lógicas de Negócio

## 1. Consenso de Duas Fases (Double Handshake / PINs)

**Objetivo:** Garantir transferência de responsabilidade e eliminar disputas.

### Como Funciona

1. Ao criar um pedido, o sistema gera dois PINs aleatórios (6 caracteres):
   - `storePin` — exibido para a loja
   - `courierPin` — exibido para o entregador

2. No momento do despacho (`PATCH /api/orders/:id/dispatch`), a validação é **OR lógico**:
   - A **Loja** envia o PIN do **Entregador** → confirma presença física
   - OU o **Entregador** envia o PIN da **Loja** → confirma presença física

3. Uma única validação bem-sucedida = ambos estavam juntos fisicamente.

### Código Relevante

```typescript
// src/modules/order/services/order.service.ts → dispatch()
const isValid =
  (dto.source === 'store' && dto.pin === order.courierPin) ||
  (dto.source === 'courier' && dto.pin === order.storePin);
```

### Endpoint

```
PATCH /api/orders/:id/dispatch
Body: { pin: "ABC123", source: "store" | "courier" }
```

---

## 2. Delay Timing (Sincronização de Preparo)

**Objetivo:** Evitar que o entregador espere muito ou que a comida esfrie.

### Fórmula

```
delay = maxPrepTime - courierTravelTime
```

**Exemplo:**
- Tempo de preparo: 25 minutos
- Distância do entregador: 10 minutos
- **Resultado:** Notificar entregador em 15 minutos após a loja aceitar

### Fluxo

```
Loja aceita (ACCEPTED)
    ↓
Timer de (prepTime - travelTime) minutos inicia [BullMQ delayed job]
    ↓
Timer expira → Status muda para WAITING_COURIER
    ↓
Push notification para o entregador
```

### Código Relevante

```typescript
// src/modules/delay-timing/services/delay-timing.service.ts
const delayMinutes = Math.max(0, prepTimeMinutes - courierTravelTimeMinutes);
const delayMs = delayMinutes * 60 * 1000;

await this.delayQueue.add('notify-courier', { orderId }, { delay: delayMs });
```

---

## 3. Batching Inteligente (Empilhamento por CEP)

**Objetivo:** Agrupar pedidos próximos para otimizar lucro e eficiência.

### Regras

1. Pedidos criados dentro de uma **janela de tempo** (default: 120s)
2. Com **mesmos 5 primeiros dígitos de CEP** do cliente
3. Da **mesma loja** de origem
4. São agrupados sob um mesmo `batchId`

### Fluxo

```
Pedido criado
    ↓
Entra na fila de avaliação [BullMQ delayed job, 120s]
    ↓
Após 120s: busca pedidos compatíveis na janela
    ↓
Se encontrar → agrupa com batchId único
Se não → pedido segue individual
```

### Código Relevante

```typescript
// src/modules/batching/services/batching.service.ts → processBatch()
const compatibleOrders = await this.prisma.order.findMany({
  where: {
    storeId: order.storeId,
    batchId: null,
    createdAt: { gte: windowStart },
    client: {
      zipCode: { startsWith: order.client.zipCode.substring(0, 5) },
    },
  },
});
```

---

## 4. Lazy Evaluation (Cálculo no Servidor)

**Regra de Ouro:** O front-end NUNCA dita valores financeiros.

### Como Funciona

1. O app do entregador exibe um cronômetro visual (*Optimistic UI*)
2. Quando a corrida termina, o **servidor** faz a matemática
3. Subtrai timestamps da tabela `EventLog` (imutável, UTC)
4. Se houver divergência com o front-end, a **palavra final é do servidor**

### Cálculo de Penalidades

```
tempoPreparoReal = timestamp(PICKUP_CONFIRMED) - timestamp(ACCEPTED_BY_STORE)

SE tempoPreparoReal > maxPrepTime:
    atrasoMinutos = tempoPreparoReal - maxPrepTime
    penalidade = atrasoMinutos × R$ 0.50/min

    → Débito Loja: R$ penalidade (DELAY_PENALTY_STORE)
    → Crédito Entregador: R$ penalidade (DELAY_BONUS_COURIER)
```

### Código Relevante

```typescript
// src/modules/order/services/order.service.ts → calculateDeliveryCompensations()
const prepTimeActual = (pickupEvent.timestamp - acceptedEvent.timestamp) / (1000 * 60);

if (prepTimeActual > order.maxPrepTime) {
  const penaltyAmount = (prepTimeActual - order.maxPrepTime) * 0.5;
  // Criar transações imutáveis de débito e crédito
}
```

---

## 5. Validação Cruzada Offline (Clock Drift)

**Objetivo:** Processar entregas 100% offline (ex: subsolos sem sinal).

### Fluxo

1. O app do **cliente** gera um QR Code com timestamp dinâmico
2. O **entregador** escaneia o QR Code (offline)
3. Quando volta online, envia o payload ao servidor
4. O servidor aplica **Janela de Tolerância de 3 minutos** (Clock Drift)

### Regras de Segurança

| Cenário | Ação |
|---------|------|
| Drift ≤ 3 min | ✅ Entrega normal, bônus calculado |
| Drift > 3 min | ⚠️ Status avança (não trava logística), MAS bônus **congelado** |

**Trava Antifraude:** Se `isOffline = true` e drift excede tolerância, o cálculo de bônus financeiro é congelado para evitar adulteração manual do relógio do celular.

### Código Relevante

```typescript
// src/modules/order/services/order.service.ts → deliver()
const driftMinutes = Math.abs(now - qrTimestamp) / (1000 * 60);
const tolerance = config.get('app.delivery.clockDriftToleranceMinutes') ?? 3;

if (driftMinutes > tolerance) {
  freezeBonus = true; // Avança status, congela bônus
}
```

---

## 6. Watchdog Timer (Cão de Guarda)

**Objetivo:** Detectar "deadlocks" logísticos (pedidos presos sem conclusão).

### Fluxo

```
Pedido despachado (DISPATCHED)
    ↓
Timer de 4 horas inicia [BullMQ delayed job]
    ↓
Timer expira: verifica se o pedido foi concluído
    ↓
SE status ∉ [DELIVERED, CANCELLED]:
    → Status → ALERT_SUPPORT
    → EventLog: WATCHDOG_TRIGGERED
    → Webhook: alert_support para o sistema externo
```

### Desarmamento

Se a entrega é concluída normalmente antes do timeout, o job é removido da fila:

```typescript
// src/modules/watchdog/services/watchdog.service.ts → disarm()
const job = await this.watchdogQueue.getJob(`watchdog-${orderId}`);
if (job) await job.remove();
```

### Benefício

Zera a necessidade de atendimento humano preventivo. Suporte só é acionado em desastres reais.
