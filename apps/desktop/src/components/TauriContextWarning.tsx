import React, { useState, useEffect } from 'react';
import { curveExtractionService } from '../services/curveExtractionService';
import { AlertTriangle, Globe, Download, X } from 'lucide-react';
import { Button } from '@espice/ui';

export const TauriContextWarning: React.FC = () => {
  const [contextInfo, setContextInfo] = useState<{
    context: string;
    backend: string;
    available: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const loadContextInfo = async () => {
      try {
        const info = await curveExtractionService.getContextInfo();
        setContextInfo(info);
        console.log('🔍 TauriContextWarning - Context Info:', info);
      } catch (error) {
        console.error('Failed to get context info:', error);
        setContextInfo({
          context: 'Browser',
          backend: 'Error',
          available: false
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadContextInfo();
  }, []);

  // Don't show anything while loading
  if (isLoading) {
    return null;
  }

  // Don't show warning if Tauri is available (desktop app)
  if (contextInfo?.available) {
    return null;
  }

  // Only show warning if we're actually in browser context
  if (contextInfo?.context !== 'Browser') {
    return null;
  }

  // Don't show if dismissed
  if (isDismissed) {
    return null;
  }

  return (
    <div className="relative bg-gradient-to-r from-orange-500 to-orange-600 border border-orange-400 border-orange-400/20 rounded-xl shadow-lg overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-orange-600/10" />
      <div className="relative p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur">
              <Globe className="h-5 w-5 text-white" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Browser Mode - Limited Functionality
              </h3>
            </div>
            
            <p className="text-orange-50 text-sm leading-relaxed mb-4">
              You're running ESpice in a web browser. For full functionality including curve extraction, 
              please use the desktop application.
            </p>
            
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <Download className="h-4 w-4 text-orange-100" />
                <span className="text-sm font-medium text-white">To use the desktop app:</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="bg-white/20 text-white px-3 py-1.5 rounded-md text-sm font-mono border border-white/30">
                  npm run tauri:dev
                </code>
                <span className="text-xs text-orange-100">in the project directory</span>
              </div>
            </div>
          </div>
          
          <div className="flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDismissed(true)}
              className="h-8 w-8 text-white hover:bg-white/20 hover:text-white rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}; 