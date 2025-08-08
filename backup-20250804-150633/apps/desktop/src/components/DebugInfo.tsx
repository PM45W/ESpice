import React, { useState, useEffect } from 'react';
import { curveExtractionService } from '../services/curveExtractionService';

interface DebugInfoProps {
  isVisible?: boolean;
}

const DebugInfo: React.FC<DebugInfoProps> = ({ isVisible = true }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [debugData, setDebugData] = useState<any>({});

  useEffect(() => {
    const updateDebugData = () => {
      const win = window as any;
      const data = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        windowTauri: typeof window !== 'undefined' ? !!window.__TAURI__ : false,
        windowTauriType: typeof window !== 'undefined' ? typeof window.__TAURI__ : 'undefined',
        tauriMetadata: typeof win.__TAURI_METADATA__ !== 'undefined',
        tauriInvoke: typeof win.__TAURI_INVOKE__ !== 'undefined',
        tauriIpc: typeof win.__TAURI_IPC__ !== 'undefined',
        isSecureContext: window.isSecureContext,
        location: typeof window !== 'undefined' ? window.location.href : 'N/A',
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
        protocol: typeof window !== 'undefined' ? window.location.protocol : 'N/A',
        serviceStatus: curveExtractionService.isTauri ? '✅ Tauri' : '❌ Browser',
        serviceInitialized: curveExtractionService.initialized,
        timestamp: new Date().toISOString(),
      };
      setDebugData(data);
    };

    updateDebugData();
    const interval = setInterval(updateDebugData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleForceReinit = async () => {
    try {
      console.log('🔄 Force re-initializing service...');
      await curveExtractionService.forceReinitialize();
      console.log('✅ Service re-initialized');
    } catch (error) {
      console.error('❌ Re-initialization failed:', error);
    }
  };

  const handleHealthCheck = async () => {
    try {
      console.log('🏥 Running health check...');
      const result = await curveExtractionService.healthCheck();
      console.log('Health check result:', result);
      alert(`Health Check: ${result}`);
    } catch (error) {
      console.error('❌ Health check failed:', error);
      alert(`Health Check Failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      zIndex: 9999,
      backgroundColor: '#f8f9fa',
      color: '#333',
      padding: '12px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'Consolas, "Courier New", monospace',
      maxWidth: '380px',
      border: '1px solid #dee2e6',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <div 
        style={{ 
          cursor: 'pointer', 
          fontWeight: 'bold',
          marginBottom: isExpanded ? '12px' : '0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#2c5aa0',
          borderBottom: isExpanded ? '1px solid #dee2e6' : 'none',
          paddingBottom: isExpanded ? '8px' : '0'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        Debug Info {isExpanded ? '▼' : '▶'}
      </div>
      
      {isExpanded && (
        <div style={{ fontSize: '11px', lineHeight: '1.5' }}>
          <div style={{ marginBottom: '4px' }}>
            <strong style={{ color: '#495057' }}>Service Status:</strong> 
            <span style={{ color: debugData.serviceStatus.includes('✅') ? '#28a745' : '#dc3545' }}>
              {debugData.serviceStatus}
            </span>
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong style={{ color: '#495057' }}>Service Init:</strong> 
            <span style={{ color: debugData.serviceInitialized ? '#28a745' : '#dc3545' }}>
              {debugData.serviceInitialized ? '✅' : '❌'}
            </span>
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong style={{ color: '#495057' }}>Platform:</strong> 
            <span style={{ color: '#6c757d' }}>{debugData.platform}</span>
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong style={{ color: '#495057' }}>Hostname:</strong> 
            <span style={{ color: '#6c757d' }}>{debugData.hostname}</span>
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong style={{ color: '#495057' }}>Protocol:</strong> 
            <span style={{ color: '#6c757d' }}>{debugData.protocol}</span>
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong style={{ color: '#495057' }}>Secure Context:</strong> 
            <span style={{ color: debugData.isSecureContext ? '#28a745' : '#dc3545' }}>
              {debugData.isSecureContext ? '✅' : '❌'}
            </span>
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong style={{ color: '#495057' }}>window.__TAURI__:</strong> 
            <span style={{ color: debugData.windowTauri ? '#28a745' : '#dc3545' }}>
              {debugData.windowTauri ? '✅' : '❌'}
            </span>
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong style={{ color: '#495057' }}>__TAURI_METADATA__:</strong> 
            <span style={{ color: debugData.tauriMetadata ? '#28a745' : '#dc3545' }}>
              {debugData.tauriMetadata ? '✅' : '❌'}
            </span>
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong style={{ color: '#495057' }}>__TAURI_INVOKE__:</strong> 
            <span style={{ color: debugData.tauriInvoke ? '#28a745' : '#dc3545' }}>
              {debugData.tauriInvoke ? '✅' : '❌'}
            </span>
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong style={{ color: '#495057' }}>__TAURI_IPC__:</strong> 
            <span style={{ color: debugData.tauriIpc ? '#28a745' : '#dc3545' }}>
              {debugData.tauriIpc ? '✅' : '❌'}
            </span>
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong style={{ color: '#495057' }}>User Agent:</strong> 
            <span style={{ color: '#6c757d' }}>{debugData.userAgent?.substring(0, 35)}...</span>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <strong style={{ color: '#495057' }}>Updated:</strong> 
            <span style={{ color: '#6c757d' }}>{debugData.timestamp?.substring(11, 19)}</span>
          </div>
          
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              onClick={handleForceReinit}
              style={{
                padding: '6px 10px',
                fontSize: '10px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Re-init
            </button>
            <button 
              onClick={handleHealthCheck}
              style={{
                padding: '6px 10px',
                fontSize: '10px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Health
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugInfo; 