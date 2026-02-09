-- AlterTable
ALTER TABLE "comparisons" ADD COLUMN     "prev_left_mu" DOUBLE PRECISION,
ADD COLUMN     "prev_left_sigma_sq" DOUBLE PRECISION,
ADD COLUMN     "prev_right_mu" DOUBLE PRECISION,
ADD COLUMN     "prev_right_sigma_sq" DOUBLE PRECISION;
