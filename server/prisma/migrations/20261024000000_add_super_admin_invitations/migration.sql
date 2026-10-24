-- CreateEnum
CREATE TYPE "SuperAdminInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "SuperAdminInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "SuperAdminInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "invitedById" TEXT NOT NULL,
    "acceptedById" TEXT,

    CONSTRAINT "SuperAdminInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SuperAdminInvitation_token_key" ON "SuperAdminInvitation"("token");

-- CreateIndex
CREATE INDEX "SuperAdminInvitation_email_idx" ON "SuperAdminInvitation"("email");

-- CreateIndex
CREATE INDEX "SuperAdminInvitation_status_idx" ON "SuperAdminInvitation"("status");

-- AddForeignKey
ALTER TABLE "SuperAdminInvitation" ADD CONSTRAINT "SuperAdminInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuperAdminInvitation" ADD CONSTRAINT "SuperAdminInvitation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
