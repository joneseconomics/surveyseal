-- AlterTable
ALTER TABLE "surveys" ADD COLUMN     "checkpoint_timer_seconds" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "tapin_api_key" TEXT,
ADD COLUMN     "tapin_campaign_id" TEXT;
