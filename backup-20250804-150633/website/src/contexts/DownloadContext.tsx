import React, { createContext, useContext, ReactNode, useState } from 'react';

interface DownloadContextType {
  downloadCount: number;
  incrementDownload: () => void;
  getDownloadCount: () => number;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

interface DownloadProviderProps {
  children: ReactNode;
}

export function DownloadProvider({ children }: DownloadProviderProps) {
  const [downloadCount, setDownloadCount] = useState(0);

  const incrementDownload = () => {
    setDownloadCount(prev => prev + 1);
  };

  const getDownloadCount = () => {
    return downloadCount;
  };

  return (
    <DownloadContext.Provider value={{ downloadCount, incrementDownload, getDownloadCount }}>
      {children}
    </DownloadContext.Provider>
  );
}

export function useDownload() {
  const context = useContext(DownloadContext);
  if (context === undefined) {
    throw new Error('useDownload must be used within a DownloadProvider');
  }
  return context;
} 