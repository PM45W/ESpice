import { useState, useEffect, useRef } from 'react';

interface BatchJob {
  job_id: string;
  batch_id: string;
  file_path: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'elled';
  progress: number;
  result?: any;
  error?: string;
  created_at: string;
  updated_at: string;
  celery_task_id?: string;
}

export const useBatchWebSocket = (batchId: string | null) => {
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!batchId) {
      setJobs([]);
      return;
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Create new WebSocket connection
    const ws = new WebSocket(`ws://localhost:8007ws/batch/${batchId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
      console.log('WebSocket connected for batch:', batchId);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data)) {
          setJobs(data);
        } else if (data.error) {
          setError(data.error);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
        setError('Failed to parse batch status update');
      }
    };

    ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      setError('WebSocket connection error');
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected for batch:', batchId);
      setIsConnected(false);
    };

    // Cleanup function
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [batchId]);

  return jobs;
}; 