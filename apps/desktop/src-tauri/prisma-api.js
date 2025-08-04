const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function getPdfs() {
  return await prisma.pDFDocument.findMany();
}

async function getPages(pdfId) {
  return await prisma.page.findMany({ where: { pdfId } });
}

async function getPageDetails(pageId) {
  const tables = await prisma.table.findMany({ where: { pageId }, include: { parameters: true } });
  const images = await prisma.image.findMany({ where: { pageId }, include: { graph: true } });
  const textBlocks = await prisma.textBlock.findMany({ where: { pageId } });
  return { tables, images, textBlocks };
}

// Datasheet operations
async function uploadDatasheet(productId, filename, fileData, fileSize) {
  try {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Save file to disk
    const filePath = path.join(uploadsDir, filename);
    const buffer = Buffer.from(fileData, 'base64');
    fs.writeFileSync(filePath, buffer);

    // Create datasheet record in database
    const datasheet = await prisma.datasheet.create({
      data: {
        productId,
        filename,
        status: 'queued',
        uploadDate: new Date(),
      }
    });

    // TODO: Trigger processing pipeline (MCP server integration)
    // For now, simulate processing
    setTimeout(async () => {
      await prisma.datasheet.update({
        where: { id: datasheet.id },
        data: { status: 'processing' }
      });
      
      // Simulate completion after 5 seconds
      setTimeout(async () => {
        await prisma.datasheet.update({
          where: { id: datasheet.id },
          data: { 
            status: 'completed',
            spiceModelPath: path.join(uploadsDir, `${filename}_spice.lib`)
          }
        });
      }, 5000);
    }, 1000);

    return { success: true, datasheetId: datasheet.id };
  } catch (error) {
    console.error('Error uploading datasheet:', error);
    return { success: false, error: error.message };
  }
}

async function getDatasheetsForProduct(productId) {
  try {
    const datasheets = await prisma.datasheet.findMany({
      where: { productId },
      include: {
        graphicalData: true,
        tableData: true,
      },
      orderBy: { uploadDate: 'desc' }
    });
    return datasheets;
  } catch (error) {
    console.error('Error fetching datasheets:', error);
    throw error;
  }
}

async function getDatasheet(datasheetId) {
  try {
    const datasheet = await prisma.datasheet.findUnique({
      where: { id: datasheetId },
      include: {
        graphicalData: true,
        tableData: true,
      }
    });
    return datasheet;
  } catch (error) {
    console.error('Error fetching datasheet:', error);
    throw error;
  }
}

async function deleteDatasheet(datasheetId) {
  try {
    // Get datasheet info for file cleanup
    const datasheet = await prisma.datasheet.findUnique({
      where: { id: datasheetId }
    });

    if (datasheet) {
      // Delete associated files
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      const filePath = path.join(uploadsDir, datasheet.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete SPICE model file if exists
      if (datasheet.spiceModelPath && fs.existsSync(datasheet.spiceModelPath)) {
        fs.unlinkSync(datasheet.spiceModelPath);
      }
    }

    // Delete from database (cascading will handle related data)
    await prisma.datasheet.delete({
      where: { id: datasheetId }
    });

    return true;
  } catch (error) {
    console.error('Error deleting datasheet:', error);
    throw error;
  }
}

async function downloadSpiceModel(datasheetId) {
  try {
    const datasheet = await prisma.datasheet.findUnique({
      where: { id: datasheetId }
    });

    if (!datasheet || !datasheet.spiceModelPath) {
      throw new Error('SPICE model not found');
    }

    if (!fs.existsSync(datasheet.spiceModelPath)) {
      throw new Error('SPICE model file not found');
    }

    const fileContent = fs.readFileSync(datasheet.spiceModelPath);
    return fileContent.toString('base64');
  } catch (error) {
    console.error('Error downloading SPICE model:', error);
    throw error;
  }
}

async function getDatasheetProcessingStatus(datasheetId) {
  try {
    const datasheet = await prisma.datasheet.findUnique({
      where: { id: datasheetId }
    });

    if (!datasheet) {
      throw new Error('Datasheet not found');
    }

    // For now, return basic status
    // TODO: Implement real processing status tracking
    let progress = 0;
    let message = '';

    switch (datasheet.status) {
      case 'queued':
        progress = 0;
        message = 'Waiting in queue...';
        break;
      case 'processing':
        progress = 50; // Simulate progress
        message = 'Processing datasheet...';
        break;
      case 'completed':
        progress = 100;
        message = 'Processing completed successfully';
        break;
      case 'failed':
        progress = 0;
        message = 'Processing failed';
        break;
      default:
        progress = 0;
        message = 'Unknown status';
    }

    return {
      status: datasheet.status,
      progress,
      message
    };
  } catch (error) {
    console.error('Error getting processing status:', error);
    throw error;
  }
}

async function retryDatasheetProcessing(datasheetId) {
  try {
    // Update status back to queued
    await prisma.datasheet.update({
      where: { id: datasheetId },
      data: { status: 'queued' }
    });

    // TODO: Trigger processing pipeline again
    // For now, simulate processing
    setTimeout(async () => {
      await prisma.datasheet.update({
        where: { id: datasheetId },
        data: { status: 'processing' }
      });
      
      setTimeout(async () => {
        await prisma.datasheet.update({
          where: { id: datasheetId },
          data: { 
            status: 'completed',
            spiceModelPath: path.join(__dirname, '..', 'uploads', `retry_${datasheetId}_spice.lib`)
          }
        });
      }, 5000);
    }, 1000);

    return true;
  } catch (error) {
    console.error('Error retrying processing:', error);
    throw error;
  }
}

// Simple CLI for Tauri invoke
const [,, cmd, ...args] = process.argv;
(async () => {
  try {
    if (cmd === 'getPdfs') {
      const pdfs = await getPdfs();
      console.log(JSON.stringify(pdfs));
    } else if (cmd === 'getPages') {
      const pages = await getPages(args[0]);
      console.log(JSON.stringify(pages));
    } else if (cmd === 'getPageDetails') {
      const details = await getPageDetails(args[0]);
      console.log(JSON.stringify(details));
    } else if (cmd === 'uploadDatasheet') {
      const [productId, filename, fileData, fileSize] = args;
      const result = await uploadDatasheet(productId, filename, fileData, parseInt(fileSize));
      console.log(JSON.stringify(result));
    } else if (cmd === 'getDatasheetsForProduct') {
      const datasheets = await getDatasheetsForProduct(args[0]);
      console.log(JSON.stringify(datasheets));
    } else if (cmd === 'getDatasheet') {
      const datasheet = await getDatasheet(args[0]);
      console.log(JSON.stringify(datasheet));
    } else if (cmd === 'deleteDatasheet') {
      const result = await deleteDatasheet(args[0]);
      console.log(JSON.stringify(result));
    } else if (cmd === 'downloadSpiceModel') {
      const modelData = await downloadSpiceModel(args[0]);
      console.log(JSON.stringify({ success: true, data: modelData }));
    } else if (cmd === 'getDatasheetProcessingStatus') {
      const status = await getDatasheetProcessingStatus(args[0]);
      console.log(JSON.stringify(status));
    } else if (cmd === 'retryDatasheetProcessing') {
      const result = await retryDatasheetProcessing(args[0]);
      console.log(JSON.stringify(result));
    } else {
      console.error('Unknown command:', cmd);
      process.exit(1);
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})(); 