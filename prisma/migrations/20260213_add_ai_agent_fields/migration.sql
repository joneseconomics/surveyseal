-- CreateEnum
CREATE TYPE "AiAgentRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "survey_sessions" ADD COLUMN     "ai_model" TEXT,
ADD COLUMN     "ai_persona" TEXT,
ADD COLUMN     "ai_provider" TEXT,
ADD COLUMN     "ai_run_id" TEXT,
ADD COLUMN     "is_ai_generated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "surveys" ADD COLUMN     "ai_api_key" TEXT,
ADD COLUMN     "ai_model" TEXT,
ADD COLUMN     "ai_provider" TEXT;

-- CreateTable
CREATE TABLE "ai_agent_runs" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "session_count" INTEGER NOT NULL,
    "completed_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "status" "AiAgentRunStatus" NOT NULL DEFAULT 'RUNNING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "error_log" TEXT,

    CONSTRAINT "ai_agent_runs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ai_agent_runs" ADD CONSTRAINT "ai_agent_runs_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agent_runs" ADD CONSTRAINT "ai_agent_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
