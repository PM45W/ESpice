import { spiceModelService, versionControlService as dbVersionService } from './database';
import type { SPICEModel } from '../types';

export interface ModelVersion {
  id: string;
  modelId: string;
  version: string;
  commitMessage: string;
  author: string;
  timestamp: Date;
  changes: ModelChange[];
  modelSnapshot: SPICEModel;
  parentVersionId?: string;
  tags: string[];
  isLatest: boolean;
}

export interface ModelChange {
  type: 'parameter' | 'model_text' | 'validation' | 'metadata';
  field: string;
  oldValue?: any;
  newValue: any;
  description: string;
}

export interface VersionControlConfig {
  autoCommit: boolean;
  maxVersions: number;
  requireCommitMessage: boolean;
  enableBranching: boolean;
}

export interface CreateVersionRequest {
  modelId: string;
  commitMessage: string;
  author: string;
  tags?: string[];
  changes?: ModelChange[];
}

export interface VersionHistory {
  modelId: string;
  versions: ModelVersion[];
  branches: BranchInfo[];
  currentVersion: string;
}

export interface BranchInfo {
  name: string;
  headVersionId: string;
  createdAt: Date;
  lastModified: Date;
}

export class VersionControlService {
  private static instance: VersionControlService;
  private config: VersionControlConfig = {
    autoCommit: true,
    maxVersions: 50,
    requireCommitMessage: false,
    enableBranching: false
  };

  static getInstance(): VersionControlService {
    if (!VersionControlService.instance) {
      VersionControlService.instance = new VersionControlService();
    }
    return VersionControlService.instance;
  }

  /**
   * Create a new version of a model
   */
  async createVersion(request: CreateVersionRequest): Promise<ModelVersion> {
    try {
      // Get the current model
      const currentModel = await spiceModelService.findById(request.modelId);
      if (!currentModel) {
        throw new Error('Model not found');
      }

      // Get the latest version to determine parent
      const latestVersion = await this.getLatestVersion(request.modelId);
      
      // Generate new version number
      const newVersionNumber = this.generateVersionNumber(latestVersion?.version);

      // Create version record
      const version: ModelVersion = {
        id: this.generateId(),
        modelId: request.modelId,
        version: newVersionNumber,
        commitMessage: request.commitMessage,
        author: request.author,
        timestamp: new Date(),
        changes: request.changes || [],
        modelSnapshot: { ...currentModel },
        parentVersionId: latestVersion?.id,
        tags: request.tags || [],
        isLatest: true
      };

      // Mark previous version as not latest
      if (latestVersion) {
        await dbVersionService.updateVersionIsLatest(latestVersion.id, false);
      }

      // Store version in database
      await dbVersionService.createVersion(version);

      // Update model with new version
      await spiceModelService.update(request.modelId, {
        version: newVersionNumber
      });

      return version;
    } catch (error) {
      console.error('Failed to create version:', error);
      throw new Error(`Failed to create version: ${error}`);
    }
  }

  /**
   * Get version history for a model
   */
  async getVersionHistory(modelId: string): Promise<VersionHistory> {
    try {
      const versions = await dbVersionService.getVersionsForModel(modelId);
      const currentModel = await spiceModelService.findById(modelId);
      
      return {
        modelId,
        versions: versions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
        branches: await dbVersionService.getBranchesForModel(modelId),
        currentVersion: currentModel?.version || '1.0.0'
      };
    } catch (error) {
      console.error('Failed to get version history:', error);
      throw new Error(`Failed to get version history: ${error}`);
    }
  }

  /**
   * Get a specific version of a model
   */
  async getVersion(versionId: string): Promise<ModelVersion | null> {
    try {
      return await dbVersionService.getVersionById(versionId);
    } catch (error) {
      console.error('Failed to get version:', error);
      return null;
    }
  }

  /**
   * Revert model to a specific version
   */
  async revertToVersion(modelId: string, versionId: string): Promise<boolean> {
    try {
      const targetVersion = await dbVersionService.getVersionById(versionId);
      if (!targetVersion) {
        throw new Error('Version not found');
      }

      // Create a new version with revert changes
      const revertChanges: ModelChange[] = [
        {
          type: 'model_text',
          field: 'modelText',
          oldValue: (await spiceModelService.findById(modelId))?.modelText,
          newValue: targetVersion.modelSnapshot.modelText,
          description: `Reverted to version ${targetVersion.version}`
        },
        {
          type: 'parameter',
          field: 'parameters',
          oldValue: (await spiceModelService.findById(modelId))?.parameters,
          newValue: targetVersion.modelSnapshot.parameters,
          description: `Reverted parameters to version ${targetVersion.version}`
        }
      ];

      await this.createVersion({
        modelId,
        commitMessage: `Revert to version ${targetVersion.version}`,
        author: 'System',
        changes: revertChanges
      });

      return true;
    } catch (error) {
      console.error('Failed to revert to version:', error);
      return false;
    }
  }

  /**
   * Compare two versions of a model
   */
  async compareVersions(versionId1: string, versionId2: string): Promise<ModelChange[]> {
    try {
      const version1 = await dbVersionService.getVersionById(versionId1);
      const version2 = await dbVersionService.getVersionById(versionId2);

      if (!version1 || !version2) {
        throw new Error('One or both versions not found');
      }

      const changes: ModelChange[] = [];

      // Compare model text
      if (version1.modelSnapshot.modelText !== version2.modelSnapshot.modelText) {
        changes.push({
          type: 'model_text',
          field: 'modelText',
          oldValue: version1.modelSnapshot.modelText,
          newValue: version2.modelSnapshot.modelText,
          description: 'Model text changed'
        });
      }

      // Compare parameters
      const params1 = version1.modelSnapshot.parameters;
      const params2 = version2.modelSnapshot.parameters;
      
      const allParams = new Set([...Object.keys(params1), ...Object.keys(params2)]);
      
      for (const param of allParams) {
        const value1 = params1[param];
        const value2 = params2[param];
        
        if (value1 !== value2) {
          changes.push({
            type: 'parameter',
            field: param,
            oldValue: value1,
            newValue: value2,
            description: `Parameter ${param} changed`
          });
        }
      }

      return changes;
    } catch (error) {
      console.error('Failed to compare versions:', error);
      throw new Error(`Failed to compare versions: ${error}`);
    }
  }

  /**
   * Tag a version
   */
  async tagVersion(versionId: string, tag: string): Promise<boolean> {
    try {
      const version = await dbVersionService.getVersionById(versionId);
      if (!version) {
        throw new Error('Version not found');
      }

      if (!version.tags.includes(tag)) {
        version.tags.push(tag);
        await dbVersionService.updateVersion(versionId, { tags: version.tags });
      }

      return true;
    } catch (error) {
      console.error('Failed to tag version:', error);
      return false;
    }
  }

  /**
   * Delete a version
   */
  async deleteVersion(versionId: string): Promise<boolean> {
    try {
      const version = await dbVersionService.getVersionById(versionId);
      if (!version) {
        throw new Error('Version not found');
      }

      // Don't allow deletion of the latest version
      if (version.isLatest) {
        throw new Error('Cannot delete the latest version');
      }

      await dbVersionService.deleteVersion(versionId);
      return true;
    } catch (error) {
      console.error('Failed to delete version:', error);
      return false;
    }
  }

  /**
   * Get configuration
   */
  getConfig(): VersionControlConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VersionControlConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Private helper methods

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
  }

  private generateVersionNumber(currentVersion?: string): string {
    if (!currentVersion) {
      return '1.0.0';
    }

    const parts = currentVersion.split('.').map(Number);
    if (parts.length !== 3) {
      return '1.0.0';
    }

    // Increment patch version
    parts[2]++;
    return parts.join('.');
  }

  private async getLatestVersion(modelId: string): Promise<ModelVersion | null> {
    return await dbVersionService.getLatestVersion(modelId);
  }
}

// Export singleton instance
export const versionControlService = VersionControlService.getInstance(); 