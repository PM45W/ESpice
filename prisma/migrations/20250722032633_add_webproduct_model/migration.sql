-- CreateTable
CREATE TABLE "PDFDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "uploadDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "ExtractionRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pdfId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "finishedAt" DATETIME,
    "status" TEXT NOT NULL,
    "error" TEXT,
    CONSTRAINT "ExtractionRun_pdfId_fkey" FOREIGN KEY ("pdfId") REFERENCES "PDFDocument" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pdfId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    CONSTRAINT "Page_pdfId_fkey" FOREIGN KEY ("pdfId") REFERENCES "PDFDocument" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TextBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "bounds" JSONB NOT NULL,
    "text" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    CONSTRAINT "TextBlock_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Table" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "bounds" JSONB NOT NULL,
    "headers" JSONB NOT NULL,
    "rows" JSONB NOT NULL,
    "confidence" REAL NOT NULL,
    CONSTRAINT "Table_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Parameter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tableId" TEXT,
    "pageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    CONSTRAINT "Parameter_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Parameter_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "bounds" JSONB NOT NULL,
    "type" TEXT NOT NULL,
    "data" BLOB NOT NULL,
    CONSTRAINT "Image_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Graph" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imageId" TEXT NOT NULL,
    "extractedData" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "Graph_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "extractionRunId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    CONSTRAINT "ErrorLog_extractionRunId_fkey" FOREIGN KEY ("extractionRunId") REFERENCES "ExtractionRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "specs" JSONB NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "dateAdded" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Graph_imageId_key" ON "Graph"("imageId");
