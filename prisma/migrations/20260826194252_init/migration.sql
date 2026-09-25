-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('RECEIVED', 'ACCEPTED', 'AWAITING_CHANGE', 'READY', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'REJECTED', 'FAILED_DELIVERY', 'AWAITING_RETURN_DECISION', 'RETURNING', 'DISCARDED');

-- CreateEnum
CREATE TYPE "FaultType" AS ENUM ('STORE_FAULT', 'COURIER_FAULT', 'CLIENT_FAULT');

-- CreateEnum
CREATE TYPE "ItemUnavailablePolicy" AS ENUM ('CANCEL_ITEM', 'CANCEL_ORDER');

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "external_pms_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "webhook_url" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_zones" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL,
    "estimated_time_minutes" INTEGER NOT NULL,
    "max_radius_km" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'RECEIVED',
    "store_pin" TEXT NOT NULL,
    "courier_pin" TEXT NOT NULL,
    "client_pin" TEXT NOT NULL,
    "delivery_fee" DOUBLE PRECISION NOT NULL,
    "client_address" JSONB NOT NULL,
    "fault_type" "FaultType",
    "on_item_unavailable" "ItemUnavailablePolicy" NOT NULL DEFAULT 'CANCEL_ORDER',
    "items_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "order_id" TEXT,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "http_status" INTEGER,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stores_external_pms_id_key" ON "stores"("external_pms_id");

-- CreateIndex
CREATE UNIQUE INDEX "stores_api_key_key" ON "stores"("api_key");

-- CreateIndex
CREATE INDEX "delivery_zones_store_id_idx" ON "delivery_zones"("store_id");

-- CreateIndex
CREATE INDEX "orders_store_id_idx" ON "orders"("store_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "orders_store_id_external_id_key" ON "orders"("store_id", "external_id");

-- CreateIndex
CREATE INDEX "webhook_logs_store_id_idx" ON "webhook_logs"("store_id");

-- CreateIndex
CREATE INDEX "webhook_logs_order_id_idx" ON "webhook_logs"("order_id");

-- CreateIndex
CREATE INDEX "webhook_logs_created_at_idx" ON "webhook_logs"("created_at");

-- AddForeignKey
ALTER TABLE "delivery_zones" ADD CONSTRAINT "delivery_zones_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
