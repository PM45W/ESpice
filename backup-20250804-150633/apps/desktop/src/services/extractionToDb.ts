import { prisma } from './database';

// Save a full extraction result to the database
export async function saveExtractionResult({ pdfMeta, pages, errors }) {
  // 1. Create PDFDocument
  const pdf = await prisma.pDFDocument.create({
    data: {
      filename: pdfMeta.filename,
      pageCount: pdfMeta.pageCount,
      status: pdfMeta.status,
      // ...other metadata
    }
  });

  // 2. Create Pages, TextBlocks, Tables, Parameters, Images, Graphs
  for (const page of pages) {
    const dbPage = await prisma.page.create({
      data: {
        pdfId: pdf.id,
        pageNumber: page.pageNumber,
      }
    });

    // TextBlocks
    for (const block of page.textBlocks || []) {
      await prisma.textBlock.create({
        data: {
          pageId: dbPage.id,
          bounds: block.bounds,
          text: block.text,
          confidence: block.confidence,
        }
      });
    }

    // Tables and Parameters
    for (const table of page.tables || []) {
      const dbTable = await prisma.table.create({
        data: {
          pageId: dbPage.id,
          bounds: table.bounds,
          headers: table.headers,
          rows: table.rows,
          confidence: table.confidence,
        }
      });
      for (const param of table.parameters || []) {
        await prisma.parameter.create({
          data: {
            tableId: dbTable.id,
            pageId: dbPage.id,
            name: param.name,
            value: param.value,
            unit: param.unit,
            confidence: param.confidence,
          }
        });
      }
    }

    // Images and Graphs
    for (const image of page.images || []) {
      const dbImage = await prisma.image.create({
        data: {
          pageId: dbPage.id,
          bounds: image.bounds,
          type: image.type,
          data: image.data, // Buffer
        }
      });
      if (image.graph) {
        await prisma.graph.create({
          data: {
            imageId: dbImage.id,
            extractedData: image.graph.extractedData,
            status: image.graph.status,
          }
        });
      }
    }
  }

  // 3. Errors
  for (const error of errors || []) {
    await prisma.errorLog.create({
      data: {
        extractionRunId: pdf.id, // or the actual extractionRunId if you use ExtractionRun
        message: error.message,
        severity: error.severity,
      }
    });
  }
} 