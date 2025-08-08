import React, { useState, useEffect } from 'react';
import { GitBranch, GitCommit, GitMerge, History, Tag, RotateCcw, Trash2, Eye, GitCompare } from 'lucide-react';
import { versionControlService, type VersionHistory, type ModelVersion, type ModelChange } from '../services/versionControlService';
import type { SPICEModel } from '../types';
// CSS moved to unified index.css

interface VersionControlPanelProps {
  model: SPICEModel;
  onVersionChange?: (version: ModelVersion) => void;
  onClose?: () => void;
}

const VersionControlPanel: React.FC<VersionControlPanelProps> = ({ 
  model, 
  onVersionChange, 
  onClose 
}) => {
  const [versionHistory, setVersionHistory] = useState<VersionHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<ModelVersion | null>(null);
  const [showCreateVersion, setShowCreateVersion] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [compareVersion1, setCompareVersion1] = useState<string>('');
  const [compareVersion2, setCompareVersion2] = useState<string>('');
  const [changes, setChanges] = useState<ModelChange[]>([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    loadVersionHistory();
  }, [model.id]);

  const loadVersionHistory = async () => {
    setLoading(true);
    try {
      const history = await versionControlService.getVersionHistory(model.id);
      setVersionHistory(history);
      
      // Set the latest version as selected
      const latestVersion = history.versions.find(v => v.isLatest);
      if (latestVersion) {
        setSelectedVersion(latestVersion);
      }
    } catch (error) {
      console.error('Failed to load version history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!commitMessage.trim()) {
      alert('Please enter a commit message');
      return;
    }

    try {
      const newVersion = await versionControlService.createVersion({
        modelId: model.id,
        commitMessage: commitMessage.trim(),
        author: 'User', // In a real app, this would come from user context
        tags: []
      });

      setCommitMessage('');
      setShowCreateVersion(false);
      await loadVersionHistory();
      
      if (onVersionChange) {
        onVersionChange(newVersion);
      }
    } catch (error) {
      console.error('Failed to create version:', error);
      alert('Failed to create version');
    }
  };

  const handleRevertToVersion = async (version: ModelVersion) => {
    if (!confirm(`Are you sure you want to revert to version ${version.version}?`)) {
      return;
    }

    try {
      const success = await versionControlService.revertToVersion(model.id, version.id);
      if (success) {
        await loadVersionHistory();
        alert(`Successfully reverted to version ${version.version}`);
      } else {
        alert('Failed to revert to version');
      }
    } catch (error) {
      console.error('Failed to revert to version:', error);
      alert('Failed to revert to version');
    }
  };

  const handleCompareVersions = async () => {
    if (!compareVersion1 || !compareVersion2) {
      alert('Please select two versions to compare');
      return;
    }

    try {
      const changes = await versionControlService.compareVersions(compareVersion1, compareVersion2);
      setChanges(changes);
      setShowCompare(true);
    } catch (error) {
      console.error('Failed to compare versions:', error);
      alert('Failed to compare versions');
    }
  };

  const handleAddTag = async (versionId: string) => {
    if (!newTag.trim()) {
      alert('Please enter a tag name');
      return;
    }

    try {
      const success = await versionControlService.tagVersion(versionId, newTag.trim());
      if (success) {
        setNewTag('');
        await loadVersionHistory();
      } else {
        alert('Failed to add tag');
      }
    } catch (error) {
      console.error('Failed to add tag:', error);
      alert('Failed to add tag');
    }
  };

  const handleDeleteVersion = async (version: ModelVersion) => {
    if (!confirm(`Are you sure you want to delete version ${version.version}?`)) {
      return;
    }

    try {
      const success = await versionControlService.deleteVersion(version.id);
      if (success) {
        await loadVersionHistory();
        alert(`Successfully deleted version ${version.version}`);
      } else {
        alert('Failed to delete version');
      }
    } catch (error) {
      console.error('Failed to delete version:', error);
      alert('Failed to delete version');
    }
  };

  if (loading) {
    return (
      <div className="version-control-panel">
        <div className="panel-header">
          <h3>Version Control</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading version history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="version-control-panel">
      <div className="panel-header">
        <h3>Version Control</h3>
        <div className="header-actions">
          <button 
            onClick={() => setShowCreateVersion(true)}
            className="create-version-btn"
          >
            <GitCommit size={16} />
            New Version
          </button>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
      </div>

      <div className="panel-content">
        {showCreateVersion && (
          <div className="create-version-modal">
            <h4>Create New Version</h4>
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Enter commit message..."
              rows={3}
            />
            <div className="modal-actions">
              <button onClick={handleCreateVersion} className="primary-btn">
                Create Version
              </button>
              <button onClick={() => setShowCreateVersion(false)} className="secondary-btn">
                Cancel
              </button>
            </div>
          </div>
        )}

        {showCompare && (
          <div className="compare-versions-modal">
            <h4>Compare Versions</h4>
            <div className="version-selectors">
              <select 
                value={compareVersion1} 
                onChange={(e) => setCompareVersion1(e.target.value)}
              >
                <option value="">Select version 1</option>
                {versionHistory?.versions.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.version} - {v.commitMessage}
                  </option>
                ))}
              </select>
              <select 
                value={compareVersion2} 
                onChange={(e) => setCompareVersion2(e.target.value)}
              >
                <option value="">Select version 2</option>
                {versionHistory?.versions.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.version} - {v.commitMessage}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={handleCompareVersions} className="primary-btn">
              Compare
            </button>
            <button onClick={() => setShowCompare(false)} className="secondary-btn">
              Close
            </button>
            
            {changes.length > 0 && (
              <div className="changes-list">
                <h5>Changes:</h5>
                {changes.map((change, index) => (
                  <div key={index} className="change-item">
                    <span className="change-type">{change.type}</span>
                    <span className="change-field">{change.field}</span>
                    <span className="change-description">{change.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="version-history">
          <h4>Version History</h4>
          {versionHistory?.versions.length === 0 ? (
            <p className="no-versions">No versions yet. Create the first version!</p>
          ) : (
            <div className="versions-list">
              {versionHistory?.versions.map(version => (
                <div 
                  key={version.id} 
                  className={`version-item ${version.isLatest ? 'latest' : ''} ${selectedVersion?.id === version.id ? 'selected' : ''}`}
                  onClick={() => setSelectedVersion(version)}
                >
                  <div className="version-header">
                    <span className="version-number">v{version.version}</span>
                    {version.isLatest && <span className="latest-badge">Latest</span>}
                    <span className="version-date">
                      {new Date(version.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="version-message">{version.commitMessage}</div>
                  
                  <div className="version-meta">
                    <span className="author">by {version.author}</span>
                    {version.changes.length > 0 && (
                      <span className="changes-count">
                        {version.changes.length} changes
                      </span>
                    )}
                  </div>

                  {version.tags.length > 0 && (
                    <div className="version-tags">
                      {version.tags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="version-actions">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRevertToVersion(version);
                      }}
                      className="action-btn"
                      title="Revert to this version"
                    >
                      <RotateCcw size={14} />
                    </button>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCompareVersion1(version.id);
                        setShowCompare(true);
                      }}
                      className="action-btn"
                      title="Compare with this version"
                    >
                      <GitCompare size={14} />
                    </button>
                    
                    {!version.isLatest && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteVersion(version);
                        }}
                        className="action-btn delete"
                        title="Delete this version"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedVersion && (
          <div className="version-details">
            <h4>Version Details</h4>
            <div className="detail-item">
              <strong>Version:</strong> {selectedVersion.version}
            </div>
            <div className="detail-item">
              <strong>Commit Message:</strong> {selectedVersion.commitMessage}
            </div>
            <div className="detail-item">
              <strong>Author:</strong> {selectedVersion.author}
            </div>
            <div className="detail-item">
              <strong>Date:</strong> {new Date(selectedVersion.timestamp).toLocaleString()}
            </div>
            
            {selectedVersion.changes.length > 0 && (
              <div className="detail-item">
                <strong>Changes:</strong>
                <ul className="changes-list">
                  {selectedVersion.changes.map((change, index) => (
                    <li key={index}>{change.description}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="add-tag-section">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag..."
                className="tag-input"
              />
              <button 
                onClick={() => handleAddTag(selectedVersion.id)}
                className="add-tag-btn"
              >
                <Tag size={14} />
                Add Tag
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VersionControlPanel; 