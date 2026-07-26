-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "InspirationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT,
    "posterUrl" TEXT,
    "sourceUrl" TEXT,
    "title" TEXT,
    "description" TEXT,
    "typography" TEXT,
    "colorPalette" TEXT,
    "layoutStyle" TEXT,
    "motionStyle" TEXT,
    "designVocabulary" TEXT,
    "aiPrompt" TEXT,
    "aiBrief" TEXT,
    "categorizeStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "categorizeError" TEXT,
    "collectionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InspirationItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspirationSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "faviconUrl" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "_InspirationItemToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_InspirationItemToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "InspirationItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_InspirationItemToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Collection_name_key" ON "Collection"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_InspirationItemToTag_AB_unique" ON "_InspirationItemToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_InspirationItemToTag_B_index" ON "_InspirationItemToTag"("B");
