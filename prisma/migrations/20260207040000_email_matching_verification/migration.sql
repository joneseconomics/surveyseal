-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('VERIFIED', 'UNVERIFIED', 'PARTIAL');

-- DropForeignKey
ALTER TABLE "cards" DROP CONSTRAINT "cards_owner_id_fkey";

-- DropForeignKey
ALTER TABLE "checkpoints" DROP CONSTRAINT "checkpoints_card_id_fkey";

-- DropForeignKey
ALTER TABLE "survey_sessions" DROP CONSTRAINT "survey_sessions_card_id_fkey";

-- AlterTable
ALTER TABLE "checkpoints" DROP COLUMN "card_id",
DROP COLUMN "expires_at",
DROP COLUMN "phrase_hash",
DROP COLUMN "tap_counter",
ADD COLUMN     "skipped" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verified_email" TEXT;

-- AlterTable
ALTER TABLE "survey_sessions" DROP COLUMN "card_id",
DROP COLUMN "session_secret",
ADD COLUMN     "participant_email" TEXT,
ADD COLUMN     "verification_status" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';

-- DropTable
DROP TABLE "cards";
