-- CreateTable
CREATE TABLE "HeroImageSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "briefId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HeroImageSet_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "PromptBrief" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HeroImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "setId" TEXT NOT NULL,
    "parentId" TEXT,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "conceptName" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "upscaledUrl" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HeroImage_setId_fkey" FOREIGN KEY ("setId") REFERENCES "HeroImageSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HeroImage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "HeroImage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
