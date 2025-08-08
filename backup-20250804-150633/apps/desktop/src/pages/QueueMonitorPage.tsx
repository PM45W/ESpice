import React, { useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Stop, 
  RefreshCw, 
  Settings, 
  Eye, 
  Trash2, 
  Download,
  Upload,
  Zap,
  Database,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Filter,
  Search,
  BarChart3,
  List,
  Grid3X3,
  MoreVertical,
  Plus,
  Minus,
  RotateCcw,
  SkipForward,
  SkipBack
} from 'lucide-react';
import SemiManualControl from '../components/SemiManualControl';

interface ExtractionJob {
  id: string;
  productId: string;
  imageId: string;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'paused';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  progress: number;
  extractionMethod: 'standard' | 'legacy' | 'llm' | 'manual';
  parameters?: any;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number;
  actualDuration?: number;
  error?: string;
  result?: any;
}

interface QueueStatus {
  id: string;
  name: string;
  mode: 'automatic' | 'manual' | 'semi-manual';
  status: 'active' | 'paused' | 'stopped';
  maxConcurrentJobs: number;
  currentJobs: number;
  pendingJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalJobs: number;
}

const QueueMonitorPage: React.FC = () => {
  const [queues, setQueues] = useState<QueueStatus[]>([]);
  const [jobs, setJobs] = useState<ExtractionJob[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [showJobDetails, setShowJobDetails] = useState<string | null>(null);
  const [showSemiManualControl, setShowSemiManualControl] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  // Mock data for demonstration
  useEffect(() => {
    const mockQueues: QueueStatus[] = [
      {
        id: 'queue-1',
        name: 'Graph Extraction Queue',
        mode: 'semi-manual',
        status: 'active',
        maxConcurrentJobs: 3,
        currentJobs: 2,
        pendingJobs: 5,
        completedJobs: 12,
        failedJobs: 1,
        totalJobs: 20
      },
      {
        id: 'queue-2',
        name: 'SPICE Generation Queue',
        mode: 'manual',
        status: 'paused',
        maxConcurrentJobs: 2,
        currentJobs: 0,
        pendingJobs: 8,
        completedJobs: 15,
        failedJobs: 2,
        totalJobs: 25
      }
    ];

    const mockJobs: ExtractionJob[] = [
      {
        id: 'job-1',
        productId: 'product-1',
        imageId: 'image-1',
        status: 'processing',
        priority: 'high',
        progress: 65,
        extractionMethod: 'standard',
        startedAt: new Date(Date.now() - 300000),
        estimatedDuration: 600
      },
      {
        id: 'job-2',
        productId: 'product-2',
        imageId: 'image-2',
        status: 'pending',
        priority: 'normal',
        progress: 0,
        extractionMethod: 'llm'
      },
      {
        id: 'job-3',
        productId: 'product-3',
        imageId: 'image-3',
        status: 'completed',
        priority: 'low',
        progress: 100,
        extractionMethod: 'manual',
        completedAt: new Date(Date.now() - 600000),
        actualDuration: 450
      }
    ];

    setQueues(mockQueues);
    setJobs(mockJobs);
  }, []);

  const refreshData = useCallback(() => {
    console.log('Refreshing queue data...');
  }, []);

  const handleQueueControl = (queueId: string, action: 'start' | 'pause' | 'stop') => {
    setQueues(prev => prev.map(queue => 
      queue.id === queueId 
        ? { ...queue, status: action === 'start' ? 'active' : action === 'pause' ? 'paused' : 'stopped' }
        : queue
    ));
  };

  const handleJobControl = (jobId: string, action: 'start' | 'pause' | 'stop' | 'retry' | 'skip') => {
    setJobs(prev => prev.map(job => {
      if (job.id !== jobId) return job;
      
      switch (action) {
        case 'start':
          return { ...job, status: 'processing', startedAt: new Date() };
        case 'pause':
          return { ...job, status: 'paused' };
        case 'stop':
          return { ...job, status: 'failed', error: 'Manually stopped' };
        case 'retry':
          return { ...job, status: 'pending', progress: 0, error: undefined };
        case 'skip':
          return { ...job, status: 'completed', progress: 100, completedAt: new Date() };
        default:
          return job;
      }
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Play className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'normal':
        return 'text-blue-600 bg-blue-100';
      case 'low':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredJobs = jobs.filter(job => {
    if (filterStatus !== 'all' && job.status !== filterStatus) return false;
    if (filterPriority !== 'all' && job.priority !== filterPriority) return false;
    if (searchTerm && !job.id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Queue Monitor</h1>
            <p className="text-muted-foreground mt-1">
              Semi-manual control for graph extraction and SPICE generation
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refreshData}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                autoRefresh 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              {autoRefresh ? 'Auto On' : 'Auto Off'}
            </button>
          </div>
        </div>

        {/* Queue Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {queues.map((queue) => (
            <div key={queue.id} className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">{queue.name}</h3>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    queue.status === 'active' ? 'bg-green-100 text-green-800' :
                    queue.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {queue.status}
                  </span>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    {queue.mode}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{queue.currentJobs}</div>
                  <div className="text-sm text-muted-foreground">Active</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{queue.pendingJobs}</div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{queue.completedJobs}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{queue.failedJobs}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleQueueControl(queue.id, 'start')}
                  disabled={queue.status === 'active'}
                  className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Play className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleQueueControl(queue.id, 'pause')}
                  disabled={queue.status === 'paused'}
                  className="flex-1 px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Pause className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleQueueControl(queue.id, 'stop')}
                  disabled={queue.status === 'stopped'}
                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Stop className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Job Management Section */}
        <div className="bg-card rounded-lg border border-border">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Job Management</h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="paused">Paused</option>
                </select>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Jobs List */}
          <div className="p-6">
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <span className="font-medium text-foreground">{job.id}</span>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(job.priority)}`}>
                        {job.priority}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {job.extractionMethod}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium text-foreground">
                          {job.progress}%
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleJobControl(job.id, 'start')}
                          disabled={job.status === 'processing'}
                          className="p-1 text-green-600 hover:bg-green-100 rounded disabled:opacity-50"
                          title="Start"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleJobControl(job.id, 'pause')}
                          disabled={job.status === 'paused'}
                          className="p-1 text-yellow-600 hover:bg-yellow-100 rounded disabled:opacity-50"
                          title="Pause"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleJobControl(job.id, 'retry')}
                          disabled={job.status === 'processing'}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded disabled:opacity-50"
                          title="Retry"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowSemiManualControl(job.id)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                          title="Semi-Manual Control"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowJobDetails(job.id)}
                          className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                          title="Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          job.status === 'completed' ? 'bg-green-500' :
                          job.status === 'failed' ? 'bg-red-500' :
                          job.status === 'processing' ? 'bg-blue-500' :
                          'bg-gray-400'
                        }`}
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Semi-Manual Control Modal */}
        {showSemiManualControl && (
          <SemiManualControl
            jobId={showSemiManualControl}
            productId="product-1"
            imageId="image-1"
            extractionMethod="standard"
            onStepComplete={(stepId, result) => {
              console.log('Step completed:', stepId, result);
            }}
            onJobComplete={(jobId, results) => {
              console.log('Job completed:', jobId, results);
              setShowSemiManualControl(null);
              // Update job status in the list
              setJobs(prev => prev.map(job => 
                job.id === jobId 
                  ? { ...job, status: 'completed', progress: 100 }
                  : job
              ));
            }}
            onCancel={() => setShowSemiManualControl(null)}
          />
        )}
      </div>
    </div>
  );
};

export default QueueMonitorPage; 