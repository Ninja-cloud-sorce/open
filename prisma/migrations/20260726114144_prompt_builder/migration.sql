-- CreateTable
CREATE TABLE "PromptBrief" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "aesthetic" TEXT,
    "intent" TEXT,
    "audience" TEXT,
    "constraints" TEXT,
    "guardRails" TEXT,
    "negativePrompt" TEXT,
    "componentStyle" TEXT,
    "motionStyle" TEXT,
    "typographyStyle" TEXT,
    "outputPrompt" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "_InspirationItemToPromptBrief" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_InspirationItemToPromptBrief_A_fkey" FOREIGN KEY ("A") REFERENCES "InspirationItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_InspirationItemToPromptBrief_B_fkey" FOREIGN KEY ("B") REFERENCES "PromptBrief" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_InspirationItemToPromptBrief_AB_unique" ON "_InspirationItemToPromptBrief"("A", "B");

-- CreateIndex
CREATE INDEX "_InspirationItemToPromptBrief_B_index" ON "_InspirationItemToPromptBrief"("B");
