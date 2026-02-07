-- AlterTable
ALTER TABLE "surveys" ADD COLUMN     "cj_prompt" TEXT,
ADD COLUMN     "comparisons_per_judge" INTEGER;

-- CreateTable
CREATE TABLE "cj_items" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "position" INTEGER NOT NULL,
    "mu" DOUBLE PRECISION NOT NULL DEFAULT 1500,
    "sigma_sq" DOUBLE PRECISION NOT NULL DEFAULT 350000,
    "comparison_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cj_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comparisons" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "left_item_id" TEXT NOT NULL,
    "right_item_id" TEXT NOT NULL,
    "winner_id" TEXT,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "judged_at" TIMESTAMP(3),

    CONSTRAINT "comparisons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cj_items_survey_id_position_key" ON "cj_items"("survey_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "comparisons_session_id_position_key" ON "comparisons"("session_id", "position");

-- AddForeignKey
ALTER TABLE "cj_items" ADD CONSTRAINT "cj_items_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "survey_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_left_item_id_fkey" FOREIGN KEY ("left_item_id") REFERENCES "cj_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_right_item_id_fkey" FOREIGN KEY ("right_item_id") REFERENCES "cj_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "cj_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
