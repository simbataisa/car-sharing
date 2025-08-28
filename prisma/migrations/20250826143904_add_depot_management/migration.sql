/*
  Warnings:

  - You are about to drop the column `activationToken` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `activationTokenExpires` on the `users` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "user_activities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "sessionId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "description" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "method" TEXT,
    "endpoint" TEXT,
    "requestData" TEXT,
    "responseData" TEXT,
    "statusCode" INTEGER,
    "metadata" TEXT,
    "tags" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "duration" INTEGER,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "activity_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventType" TEXT NOT NULL,
    "eventCategory" TEXT NOT NULL DEFAULT 'USER_ACTION',
    "source" TEXT,
    "sourceId" TEXT,
    "payload" TEXT,
    "correlationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processedAt" DATETIME,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "activity_metrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "metricType" TEXT NOT NULL,
    "metricValue" REAL NOT NULL,
    "metricUnit" TEXT,
    "dimensions" TEXT,
    "period" TEXT NOT NULL DEFAULT 'DAILY',
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "depots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "capacity" INTEGER NOT NULL,
    "managerId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "operatingHours" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "depots_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "car_transfers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "carId" INTEGER NOT NULL,
    "fromDepotId" TEXT,
    "toDepotId" TEXT NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "initiatedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "completedBy" TEXT,
    "scheduledDate" DATETIME,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "car_transfers_carId_fkey" FOREIGN KEY ("carId") REFERENCES "cars" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "car_transfers_fromDepotId_fkey" FOREIGN KEY ("fromDepotId") REFERENCES "depots" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "car_transfers_toDepotId_fkey" FOREIGN KEY ("toDepotId") REFERENCES "depots" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "car_transfers_initiatedBy_fkey" FOREIGN KEY ("initiatedBy") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "car_transfers_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "car_transfers_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_cars" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "pricePerDay" REAL NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "features" TEXT NOT NULL,
    "depotId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "cars_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "depots" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_cars" ("available", "createdAt", "description", "features", "id", "imageUrl", "location", "make", "model", "pricePerDay", "updatedAt", "year") SELECT "available", "createdAt", "description", "features", "id", "imageUrl", "location", "make", "model", "pricePerDay", "updatedAt", "year" FROM "cars";
DROP TABLE "cars";
ALTER TABLE "new_cars" RENAME TO "cars";
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationStatus" TEXT NOT NULL DEFAULT 'VERIFIED',
    "lastLogin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "attributes" TEXT,
    "department" TEXT,
    "location" TEXT,
    "level" TEXT
);
INSERT INTO "new_users" ("attributes", "createdAt", "department", "email", "emailVerificationStatus", "emailVerified", "id", "isActive", "lastLogin", "level", "location", "name", "password", "role", "updatedAt") SELECT "attributes", "createdAt", "department", "email", "emailVerificationStatus", "emailVerified", "id", "isActive", "lastLogin", "level", "location", "name", "password", "role", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "user_activities_userId_timestamp_idx" ON "user_activities"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "user_activities_action_timestamp_idx" ON "user_activities"("action", "timestamp");

-- CreateIndex
CREATE INDEX "user_activities_resource_timestamp_idx" ON "user_activities"("resource", "timestamp");

-- CreateIndex
CREATE INDEX "user_activities_timestamp_idx" ON "user_activities"("timestamp");

-- CreateIndex
CREATE INDEX "user_activities_severity_timestamp_idx" ON "user_activities"("severity", "timestamp");

-- CreateIndex
CREATE INDEX "user_activities_sessionId_idx" ON "user_activities"("sessionId");

-- CreateIndex
CREATE INDEX "activity_events_eventType_timestamp_idx" ON "activity_events"("eventType", "timestamp");

-- CreateIndex
CREATE INDEX "activity_events_status_timestamp_idx" ON "activity_events"("status", "timestamp");

-- CreateIndex
CREATE INDEX "activity_events_correlationId_idx" ON "activity_events"("correlationId");

-- CreateIndex
CREATE INDEX "activity_events_createdAt_idx" ON "activity_events"("createdAt");

-- CreateIndex
CREATE INDEX "activity_metrics_metricType_periodStart_idx" ON "activity_metrics"("metricType", "periodStart");

-- CreateIndex
CREATE INDEX "activity_metrics_period_periodStart_idx" ON "activity_metrics"("period", "periodStart");

-- CreateIndex
CREATE INDEX "activity_metrics_periodStart_periodEnd_idx" ON "activity_metrics"("periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "depots_name_key" ON "depots"("name");
