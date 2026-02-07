-- CreateTable
CREATE TABLE "tapin_taps" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "tapin_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tapped_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tapin_taps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tapin_taps_session_id_tapin_id_key" ON "tapin_taps"("session_id", "tapin_id");

-- AddForeignKey
ALTER TABLE "tapin_taps" ADD CONSTRAINT "tapin_taps_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "survey_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
