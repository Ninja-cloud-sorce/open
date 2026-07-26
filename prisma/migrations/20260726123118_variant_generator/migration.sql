-- CreateTable
CREATE TABLE "VariantSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "briefId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VariantSet_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "PromptBrief" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Variant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "variantSetId" TEXT NOT NULL,
    "parentId" TEXT,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "styleName" TEXT NOT NULL,
    "html" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Variant_variantSetId_fkey" FOREIGN KEY ("variantSetId") REFERENCES "VariantSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Variant_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Variant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
