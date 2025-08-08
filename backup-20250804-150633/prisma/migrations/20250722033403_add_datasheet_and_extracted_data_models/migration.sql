-- CreateTable
CREATE TABLE "Datasheet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "uploadDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "spiceModelPath" TEXT,
    CONSTRAINT "Datasheet_productId_fkey" FOREIGN KEY ("productId") REFERENCES "WebProduct" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GraphicalData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "datasheetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    CONSTRAINT "GraphicalData_datasheetId_fkey" FOREIGN KEY ("datasheetId") REFERENCES "Datasheet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TableData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "datasheetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    CONSTRAINT "TableData_datasheetId_fkey" FOREIGN KEY ("datasheetId") REFERENCES "Datasheet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
