-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('STORE', 'PLATFORM');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "accepted_at" TIMESTAMP(3),
ADD COLUMN     "delivery_mode" "DeliveryMode";
