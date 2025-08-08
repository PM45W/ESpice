-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "package" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProductParameter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "minValue" TEXT,
    "maxValue" TEXT,
    "typValue" TEXT,
    "category" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 1.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductParameter_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SPICEModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modelType" TEXT NOT NULL,
    "modelFormat" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sourceFile" TEXT,
    "generatedFile" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SPICEModel_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SPICEModelParameter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SPICEModelParameter_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "SPICEModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ValidationResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modelId" TEXT NOT NULL,
    "testType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "data" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ValidationResult_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "SPICEModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExtractionTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "modelFormat" TEXT NOT NULL,
    "template" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExtractionJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "templateId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "result" JSONB,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExtractionJob_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExtractionJob_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ExtractionTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GraphImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "dimensions" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GraphImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GraphExtractionJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "queueId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "result" JSONB,
    "error" TEXT,
    "extractionMethod" TEXT NOT NULL DEFAULT 'standard',
    "parameters" JSONB,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "estimatedDuration" INTEGER,
    "actualDuration" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GraphExtractionJob_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GraphExtractionJob_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "GraphImage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GraphExtractionJob_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "GraphExtractionQueue" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GraphExtractionResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "csvFilePath" TEXT NOT NULL,
    "csvData" JSONB,
    "metadata" JSONB,
    "confidence" REAL NOT NULL DEFAULT 1.0,
    "dataPoints" INTEGER,
    "processingTime" REAL,
    "extractionMethod" TEXT NOT NULL,
    "parameters" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GraphExtractionResult_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GraphExtractionJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GraphExtractionQueue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'automatic',
    "status" TEXT NOT NULL DEFAULT 'active',
    "maxConcurrentJobs" INTEGER NOT NULL DEFAULT 3,
    "priority" TEXT NOT NULL DEFAULT 'fifo',
    "description" TEXT,
    "settings" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Datasheet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "uploadDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "spiceModelPath" TEXT,
    "enhancedProductId" TEXT,
    CONSTRAINT "Datasheet_productId_fkey" FOREIGN KEY ("productId") REFERENCES "WebProduct" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Datasheet_enhancedProductId_fkey" FOREIGN KEY ("enhancedProductId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Datasheet" ("filename", "id", "productId", "spiceModelPath", "status", "uploadDate") SELECT "filename", "id", "productId", "spiceModelPath", "status", "uploadDate" FROM "Datasheet";
DROP TABLE "Datasheet";
ALTER TABLE "new_Datasheet" RENAME TO "Datasheet";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Product_partNumber_key" ON "Product"("partNumber");

-- CreateIndex
CREATE INDEX "GraphImage_productId_idx" ON "GraphImage"("productId");

-- CreateIndex
CREATE INDEX "GraphImage_status_idx" ON "GraphImage"("status");

-- CreateIndex
CREATE INDEX "GraphExtractionJob_productId_idx" ON "GraphExtractionJob"("productId");

-- CreateIndex
CREATE INDEX "GraphExtractionJob_status_idx" ON "GraphExtractionJob"("status");

-- CreateIndex
CREATE INDEX "GraphExtractionJob_priority_idx" ON "GraphExtractionJob"("priority");

-- CreateIndex
CREATE INDEX "GraphExtractionJob_queueId_idx" ON "GraphExtractionJob"("queueId");

-- CreateIndex
CREATE UNIQUE INDEX "GraphExtractionResult_jobId_key" ON "GraphExtractionResult"("jobId");
