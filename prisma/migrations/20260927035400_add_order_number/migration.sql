-- CreateSequence
CREATE SEQUENCE IF NOT EXISTS "order_number_seq";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "order_number" INTEGER;

-- SetDefault (DB assigns atomically on insert)
ALTER TABLE "orders" ALTER COLUMN "order_number" SET DEFAULT nextval('order_number_seq');

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");
