-- CreateTable
CREATE TABLE "judge_personas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cv_text" TEXT NOT NULL,
    "cv_file_name" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "judge_personas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "judge_personas" ADD CONSTRAINT "judge_personas_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
