-- AlterTable
ALTER TABLE "responses" ADD COLUMN     "telemetry" JSONB;

-- AlterTable
ALTER TABLE "survey_sessions" ADD COLUMN     "bot_score" DOUBLE PRECISION,
ADD COLUMN     "bot_signals" JSONB;
