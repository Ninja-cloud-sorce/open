/*
  Warnings:

  - You are about to drop the `VariantSet` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `html` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `kind` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `parentId` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `variantSetId` on the `Variant` table. All the data in the column will be lost.
  - Added the required column `lane` to the `Variant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roundId` to the `Variant` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "VariantSet";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "serviceType" TEXT,
    "description" TEXT,
    "audience" TEXT,
    "designNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VariantRound" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "parentVariantId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VariantRound_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VariantRound_parentVariantId_fkey" FOREIGN KEY ("parentVariantId") REFERENCES "Variant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_InspirationItemToProject" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_InspirationItemToProject_A_fkey" FOREIGN KEY ("A") REFERENCES "InspirationItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_InspirationItemToProject_B_fkey" FOREIGN KEY ("B") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_HeroImageSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "briefId" TEXT,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "subjectPrompt" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HeroImageSet_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "PromptBrief" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "HeroImageSet_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_HeroImageSet" ("briefId", "createdAt", "id", "title", "updatedAt") SELECT "briefId", "createdAt", "id", "title", "updatedAt" FROM "HeroImageSet";
DROP TABLE "HeroImageSet";
ALTER TABLE "new_HeroImageSet" RENAME TO "HeroImageSet";
CREATE TABLE "new_Variant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roundId" TEXT NOT NULL,
    "lane" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "styleName" TEXT NOT NULL,
    "rationale" TEXT,
    "designTokens" TEXT,
    "previewHtml" TEXT,
    "fullSiteHtml" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Variant_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "VariantRound" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Variant" ("createdAt", "error", "favorite", "id", "label", "order", "status", "styleName", "updatedAt") SELECT "createdAt", "error", "favorite", "id", "label", "order", "status", "styleName", "updatedAt" FROM "Variant";
DROP TABLE "Variant";
ALTER TABLE "new_Variant" RENAME TO "Variant";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "_InspirationItemToProject_AB_unique" ON "_InspirationItemToProject"("A", "B");

-- CreateIndex
CREATE INDEX "_InspirationItemToProject_B_index" ON "_InspirationItemToProject"("B");
