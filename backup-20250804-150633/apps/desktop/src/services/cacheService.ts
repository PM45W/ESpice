import type { PDFProcessingResult } from '../types/pdf';

export interface CacheEntry {
  key: string;
  data: PDFProcessingResult;
  timestamp: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  averageAccessCount: number;
  oldestEntry: number;
  newestEntry: number;
}

export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number = 100 * 1024 * 1024; // 100MB default
  private maxEntries: number = 100; // Maximum number of entries
  private hitCount: number = 0;
  private missCount: number = 0;

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Set cache configuration
   */
  public configure(maxSize: number, maxEntries: number): void {
    this.maxSize = maxSize;
    this.maxEntries = maxEntries;
    this.cleanup(); // Clean up if new limits are smaller
  }

  /**
   * Store a result in cache
   */
  public set(key: string, data: PDFProcessingResult): void {
    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      size: this.calculateSize(data),
      accessCount: 0,
      lastAccessed: Date.now()
    };

    // Check if we need to make space
    if (this.shouldEvict(entry.size)) {
      this.evictEntries(entry.size);
    }

    this.cache.set(key, entry);
  }

  /**
   * Retrieve a result from cache
   */
  public get(key: string): PDFProcessingResult | null {
    const entry = this.cache.get(key);
    
    if (entry) {
      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      this.hitCount++;
      
      return entry.data;
    } else {
      this.missCount++;
      return null;
    }
  }

  /**
   * Check if a key exists in cache
   */
  public has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Remove a specific entry from cache
   */
  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const totalAccessCount = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    const timestamps = entries.map(entry => entry.timestamp);

    return {
      totalEntries: this.cache.size,
      totalSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: this.hitCount + this.missCount > 0 ? this.hitCount / (this.hitCount + this.missCount) : 0,
      averageAccessCount: entries.length > 0 ? totalAccessCount / entries.length : 0,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0
    };
  }

  /**
   * Get all cache keys
   */
  public getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache entries sorted by access count (most accessed first)
   */
  public getMostAccessedEntries(limit: number = 10): CacheEntry[] {
    return Array.from(this.cache.values())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  /**
   * Get cache entries sorted by last accessed time (most recent first)
   */
  public getRecentlyAccessedEntries(limit: number = 10): CacheEntry[] {
    return Array.from(this.cache.values())
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
      .slice(0, limit);
  }

  /**
   * Get cache entries sorted by size (largest first)
   */
  public getLargestEntries(limit: number = 10): CacheEntry[] {
    return Array.from(this.cache.values())
      .sort((a, b) => b.size - a.size)
      .slice(0, limit);
  }

  /**
   * Clean up old entries based on LRU (Least Recently Used) policy
   */
  public cleanup(): void {
    if (this.cache.size <= this.maxEntries && this.getCurrentSize() <= this.maxSize) {
      return; // No cleanup needed
    }

    // Sort entries by last accessed time (oldest first)
    const entries = Array.from(this.cache.values())
      .sort((a, b) => a.lastAccessed - b.lastAccessed);

    // Remove entries until we're under limits
    for (const entry of entries) {
      if (this.cache.size <= this.maxEntries && this.getCurrentSize() <= this.maxSize) {
        break;
      }
      this.cache.delete(entry.key);
    }
  }

  /**
   * Calculate approximate size of a PDF processing result
   */
  private calculateSize(data: PDFProcessingResult): number {
    let size = 0;
    
    // Estimate size based on content
    if (data.text) size += data.text.length * 2; // UTF-16 characters
    if (data.tables) {
      size += data.tables.reduce((sum, table) => {
        return sum + (table.headers?.join('').length || 0) * 2 +
               (table.rows?.flat().join('').length || 0) * 2;
      }, 0);
    }
    if (data.parameters) {
      size += data.parameters.reduce((sum, param) => {
        return sum + (param.name?.length || 0) * 2 +
               (param.value?.toString().length || 0) * 2 +
               (param.unit?.length || 0) * 2;
      }, 0);
    }
    if (data.ocrResults) {
      size += data.ocrResults.reduce((sum, ocr) => {
        return sum + (ocr.text?.length || 0) * 2;
      }, 0);
    }

    // Add overhead for object structure
    size += 1024; // 1KB overhead per entry
    
    return size;
  }

  /**
   * Get current total cache size
   */
  private getCurrentSize(): number {
    return Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
  }

  /**
   * Check if we need to evict entries to make space
   */
  private shouldEvict(newEntrySize: number): boolean {
    const currentSize = this.getCurrentSize();
    return this.cache.size >= this.maxEntries || (currentSize + newEntrySize) > this.maxSize;
  }

  /**
   * Evict entries to make space for new entry
   */
  private evictEntries(requiredSpace: number): void {
    const entries = Array.from(this.cache.values());
    let freedSpace = 0;
    let freedEntries = 0;

    // Sort by access count and last accessed time (least used first)
    entries.sort((a, b) => {
      if (a.accessCount !== b.accessCount) {
        return a.accessCount - b.accessCount;
      }
      return a.lastAccessed - b.lastAccessed;
    });

    // Remove entries until we have enough space
    for (const entry of entries) {
      if (freedSpace >= requiredSpace && this.cache.size < this.maxEntries) {
        break;
      }
      
      this.cache.delete(entry.key);
      freedSpace += entry.size;
      freedEntries++;
    }

    console.log(`Cache eviction: freed ${freedSpace} bytes from ${freedEntries} entries`);
  }

  /**
   * Export cache data for persistence
   */
  public export(): string {
    const data = {
      entries: Array.from(this.cache.entries()),
      stats: {
        hitCount: this.hitCount,
        missCount: this.missCount
      },
      timestamp: Date.now()
    };
    
    return JSON.stringify(data);
  }

  /**
   * Import cache data from persistence
   */
  public import(data: string): void {
    try {
      const parsed = JSON.parse(data);
      
      // Clear current cache
      this.clear();
      
      // Import entries
      if (parsed.entries) {
        for (const [key, entry] of parsed.entries) {
          this.cache.set(key, entry as CacheEntry);
        }
      }
      
      // Import statistics
      if (parsed.stats) {
        this.hitCount = parsed.stats.hitCount || 0;
        this.missCount = parsed.stats.missCount || 0;
      }
      
      console.log(`Cache imported: ${this.cache.size} entries`);
    } catch (error) {
      console.error('Failed to import cache data:', error);
    }
  }

  /**
   * Get cache entry details
   */
  public getEntryDetails(key: string): CacheEntry | null {
    return this.cache.get(key) || null;
  }

  /**
   * Update cache entry access time
   */
  public touch(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastAccessed = Date.now();
    }
  }

  /**
   * Get cache entries by age (in milliseconds)
   */
  public getEntriesByAge(maxAge: number): CacheEntry[] {
    const now = Date.now();
    return Array.from(this.cache.values())
      .filter(entry => (now - entry.timestamp) <= maxAge);
  }

  /**
   * Remove entries older than specified age
   */
  public removeOldEntries(maxAge: number): number {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) > maxAge) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    return removedCount;
  }

  /**
   * Get cache memory usage estimate
   */
  public getMemoryUsage(): number {
    return this.getCurrentSize();
  }

  /**
   * Check if cache is full
   */
  public isFull(): boolean {
    return this.cache.size >= this.maxEntries || this.getCurrentSize() >= this.maxSize;
  }

  /**
   * Get cache utilization percentage
   */
  public getUtilization(): { entries: number; size: number } {
    return {
      entries: (this.cache.size / this.maxEntries) * 100,
      size: (this.getCurrentSize() / this.maxSize) * 100
    };
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance(); 