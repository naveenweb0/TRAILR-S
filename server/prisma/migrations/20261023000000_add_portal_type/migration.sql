-- Persist the user's one-time portal selection separately from operational role.
CREATE TYPE "PortalType" AS ENUM ('SCHOOL', 'DESTINATION');

ALTER TABLE "User" ADD COLUMN "portalType" "PortalType";
