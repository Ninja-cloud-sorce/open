/*
  Warnings:

  - You are about to drop the column `aiBrief` on the `InspirationItem` table. All the data in the column will be lost.
  - You are about to drop the column `aiPrompt` on the `InspirationItem` table. All the data in the column will be lost.
  - You are about to drop the column `categorizeError` on the `InspirationItem` table. All the data in the column will be lost.
  - You are about to drop the column `categorizeStatus` on the `InspirationItem` table. All the data in the column will be lost.
  - You are about to drop the column `colorPalette` on the `InspirationItem` table. All the data in the column will be lost.
  - You are about to drop the column `designVocabulary` on the `InspirationItem` table. All the data in the column will be lost.
  - You are about to drop the column `layoutStyle` on the `InspirationItem` table. All the data in the column will be lost.
  - You are about to drop the column `motionStyle` on the `InspirationItem` table. All the data in the column will be lost.
  - You are about to drop the column `typography` on the `InspirationItem` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "InspirationAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "title" TEXT,
    "description" TEXT,
    "primaryStyle" TEXT,
    "secondaryStyles" TEXT,
    "confidence" REAL,
    "visualTone" TEXT,
    "designLanguage" TEXT,
    "mood" TEXT,
    "industry" TEXT,
    "layoutStyle" TEXT,
    "gridSystem" TEXT,
    "spacingDensity" TEXT,
    "visualHierarchy" TEXT,
    "typographyHeadline" TEXT,
    "typographyBody" TEXT,
    "typographyWeight" TEXT,
    "typographyStyle" TEXT,
    "colorPalette" TEXT,
    "illustrationStyle" TEXT,
    "iconStyle" TEXT,
    "textures" TEXT,
    "lighting" TEXT,
    "depth" TEXT,
    "animationStyle" TEXT,
    "components" TEXT,
    "keywords" TEXT,
    "recommendedTags" TEXT,
    "scoreMinimalism" INTEGER,
    "scorePremium" INTEGER,
    "scoreCreativity" INTEGER,
    "scoreTechnical" INTEGER,
    "scoreStorytelling" INTEGER,
    "scoreVisualDensity" INTEGER,
    "scoreAccessibility" INTEGER,
    "scoreConsistency" INTEGER,
    "aiNotes" TEXT,
    "embedding" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InspirationAnalysis_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InspirationItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InspirationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT,
    "posterUrl" TEXT,
    "sourceUrl" TEXT,
    "title" TEXT,
    "description" TEXT,
    "collectionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InspirationItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_InspirationItem" ("collectionId", "createdAt", "description", "fileUrl", "id", "posterUrl", "sourceUrl", "title", "type", "updatedAt") SELECT "collectionId", "createdAt", "description", "fileUrl", "id", "posterUrl", "sourceUrl", "title", "type", "updatedAt" FROM "InspirationItem";
DROP TABLE "InspirationItem";
ALTER TABLE "new_InspirationItem" RENAME TO "InspirationItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "InspirationAnalysis_itemId_key" ON "InspirationAnalysis"("itemId");
