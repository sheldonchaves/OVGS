CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

ALTER TABLE "audit_logs"
ADD COLUMN "userEmail" TEXT,
ADD COLUMN "userId" TEXT;

ALTER TABLE "audit_logs"
ALTER COLUMN "action" TYPE TEXT USING ("action"::text);

DROP TYPE "AuditAction";

CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

ALTER TABLE "audit_logs"
ADD CONSTRAINT "audit_logs_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
