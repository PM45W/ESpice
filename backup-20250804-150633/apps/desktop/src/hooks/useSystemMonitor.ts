import { useState, useEffect, useCallback } from 'react';
import { systemMonitor, SystemMetrics } from '../services/systemMonitor';

export const useSystemMonitor = (updateInterval: number = 5000) => {
  const [metrics, setMetrics] = useState<SystemMetrics>(systemMonitor.getMetrics());
  const [isMonitoring, setIsMonitoring] = useState(false);

  const startMonitoring = useCallback(() => {
    systemMonitor.startMonitoring(updateInterval);
    setIsMonitoring(true);
  }, [updateInterval]);

  const stopMonitoring = useCallback(() => {
    systemMonitor.stopMonitoring();
    setIsMonitoring(false);
  }, []);

  const refreshMetrics = useCallback(() => {
    setMetrics(systemMonitor.getMetrics());
  }, []);

  useEffect(() => {
    // Start monitoring when hook is mounted
    startMonitoring();

    // Set up manual refresh interval for UI updates - reduced frequency for better performance
    const refreshInterval = setInterval(refreshMetrics, 3000);

    // Cleanup on unmount
    return () => {
      stopMonitoring();
      clearInterval(refreshInterval);
    };
  }, [startMonitoring, stopMonitoring, refreshMetrics]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setMetrics(prev => ({
        ...prev,
        network: { ...prev.network, status: 'online' }
      }));
    };

    const handleOffline = () => {
      setMetrics(prev => ({
        ...prev,
        network: { ...prev.network, status: 'offline' }
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    refreshMetrics,
    systemInfo: systemMonitor.getSystemInfo()
  };
};

export default useSystemMonitor; 