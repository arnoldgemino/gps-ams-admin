CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "adminId" TEXT,
    "officerId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_adminId_idx" ON "PasswordResetToken"("adminId");
CREATE INDEX "PasswordResetToken_officerId_idx" ON "PasswordResetToken"("officerId");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

ALTER TABLE "PasswordResetToken"
ADD CONSTRAINT "PasswordResetToken_adminId_fkey"
FOREIGN KEY ("adminId") REFERENCES "Admin"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PasswordResetToken"
ADD CONSTRAINT "PasswordResetToken_officerId_fkey"
FOREIGN KEY ("officerId") REFERENCES "Officer"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
