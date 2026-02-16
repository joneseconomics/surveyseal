-- AlterTable
ALTER TABLE "judge_personas" ADD COLUMN     "source_session_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "judge_personas_source_session_id_key" ON "judge_personas"("source_session_id");

-- AddForeignKey
ALTER TABLE "judge_personas" ADD CONSTRAINT "judge_personas_source_session_id_fkey" FOREIGN KEY ("source_session_id") REFERENCES "survey_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
