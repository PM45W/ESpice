import express from 'express';
import { PrismaClient } from '@prisma/client';
import { validateDownloadRequest } from '../middleware/validation.js';
import { getClientIP } from '../utils/network.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get available downloads
router.get('/', async (req, res) => {
  try {
    const downloads = await prisma.download.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        platform: true,
        version: true,
        fileName: true,
        fileSize: true,
        downloadUrl: true,
        checksum: true,
        releaseNotes: true,
        isBeta: true,
        downloadCount: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: downloads,
    });
  } catch (error) {
    console.error('Error fetching downloads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch downloads',
    });
  }
});

// Get download by platform
router.get('/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const { version } = req.query;

    const whereClause: any = {
      platform: platform.toLowerCase(),
      isActive: true,
    };

    if (version) {
      whereClause.version = version as string;
    }

    const download = await prisma.download.findFirst({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!download) {
      return res.status(404).json({
        success: false,
        error: 'Download not found',
      });
    }

    res.json({
      success: true,
      data: download,
    });
  } catch (error) {
    console.error('Error fetching download:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch download',
    });
  }
});

// Track download
router.post('/:id/track', validateDownloadRequest, async (req, res) => {
  try {
    const { id } = req.params;
    const { userAgent, referrer } = req.body;
    const clientIP = getClientIP(req);

    // Get download info
    const download = await prisma.download.findUnique({
      where: { id },
    });

    if (!download) {
      return res.status(404).json({
        success: false,
        error: 'Download not found',
      });
    }

    // Create download tracking record
    await prisma.downloadTracking.create({
      data: {
        downloadId: id,
        ipAddress: clientIP,
        userAgent: userAgent || req.get('User-Agent'),
        referrer: referrer || req.get('Referrer'),
        timestamp: new Date(),
      },
    });

    // Increment download count
    await prisma.download.update({
      where: { id },
      data: {
        downloadCount: {
          increment: 1,
        },
      },
    });

    res.json({
      success: true,
      message: 'Download tracked successfully',
      data: {
        downloadUrl: download.downloadUrl,
        fileName: download.fileName,
        checksum: download.checksum,
      },
    });
  } catch (error) {
    console.error('Error tracking download:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track download',
    });
  }
});

// Get download statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '30d' } = req.query;

    const download = await prisma.download.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            downloadTracking: true,
          },
        },
      },
    });

    if (!download) {
      return res.status(404).json({
        success: false,
        error: 'Download not found',
      });
    }

    // Calculate period-based statistics
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const periodDownloads = await prisma.downloadTracking.count({
      where: {
        downloadId: id,
        timestamp: {
          gte: startDate,
        },
      },
    });

    // Get platform distribution
    const platformStats = await prisma.downloadTracking.groupBy({
      by: ['userAgent'],
      where: {
        downloadId: id,
        timestamp: {
          gte: startDate,
        },
      },
      _count: {
        userAgent: true,
      },
    });

    res.json({
      success: true,
      data: {
        totalDownloads: download.downloadCount,
        periodDownloads,
        period,
        platformStats,
        lastUpdated: download.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching download stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch download statistics',
    });
  }
});

// Admin: Create new download
router.post('/', async (req, res) => {
  try {
    const {
      platform,
      version,
      fileName,
      fileSize,
      downloadUrl,
      checksum,
      releaseNotes,
      isBeta = false,
    } = req.body;

    const download = await prisma.download.create({
      data: {
        platform: platform.toLowerCase(),
        version,
        fileName,
        fileSize: parseInt(fileSize),
        downloadUrl,
        checksum,
        releaseNotes,
        isBeta,
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      data: download,
    });
  } catch (error) {
    console.error('Error creating download:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create download',
    });
  }
});

// Admin: Update download
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const download = await prisma.download.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: download,
    });
  } catch (error) {
    console.error('Error updating download:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update download',
    });
  }
});

// Admin: Delete download
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.download.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Download deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting download:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete download',
    });
  }
});

export default router; 