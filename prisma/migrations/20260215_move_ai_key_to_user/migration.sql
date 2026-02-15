ALTER TABLE "users" ADD COLUMN "ai_api_key" TEXT;

-- Copy existing survey owner keys to their user records
UPDATE "users" u
SET "ai_api_key" = sub."ai_api_key"
FROM (
  SELECT DISTINCT ON (s."owner_id") s."owner_id", s."ai_api_key"
  FROM "surveys" s
  WHERE s."ai_api_key" IS NOT NULL
  ORDER BY s."owner_id", s."updated_at" DESC
) sub
WHERE u."id" = sub."owner_id";

ALTER TABLE "surveys" DROP COLUMN "ai_api_key";
