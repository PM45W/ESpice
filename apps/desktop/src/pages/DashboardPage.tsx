import React, { useMemo, useCallback, useState, useEffect } from 'react'
import { Upload, FileText, Settings, CheckCircle, AlertCircle, Clock, TrendingUp, Activity, Users, Zap, Cpu, Database, BarChart3, Gauge, HardDrive, Network, Server, Play, Pause, RefreshCw, Target, Shield, Globe, Download, BarChart } from 'lucide-react'
import { SimpleToggle } from '../components/ui/simple-toggle'
import type { LucideIcon } from 'lucide-react'
import { useSystemMonitor } from '../hooks/useSystemMonitor'
import '../styles/dashboard.css'

// Compact Service Toggle Card (iPad-style)
const CompactServiceToggle = React.memo<{
  service: string
  status: 'online' | 'offline' | 'warning'
  responseTime: string
  toggleService?: () => void
  isRunning?: boolean
}>(({ service, status, responseTime, toggleService, isRunning }) => {
  return (
    <div className="service-toggle-card">
      <div className="service-info">
        <div className={`service-status-dot ${status}`}></div>
        <div className="service-details">
          <div className="service-name">{service}</div>
          <div className="service-response">{responseTime}</div>
        </div>
      </div>
      {toggleService && (
        <SimpleToggle
          checked={isRunning}
          onCheckedChange={toggleService}
        />
      )}
    </div>
  )
})

// Compact Quick Action Card
const CompactQuickAction = React.memo<{
  name: string
  icon: LucideIcon
  onClick: () => void
  shortcut?: string
  description?: string
}>(({ name, icon: Icon, onClick, shortcut, description }) => {
  return (
    <button onClick={onClick} className="quick-action-card">
      <div className="quick-action-content">
        <Icon className="quick-action-icon" />
        <div className="quick-action-text">
          <span className="quick-action-name">{name}</span>
          {description && <span className="quick-action-description">{description}</span>}
        </div>
      </div>
      {shortcut && (
        <div className="quick-action-shortcut">
          {shortcut}
        </div>
      )}
    </button>
  )
})

// Task Progress Card
const TaskProgressCard = React.memo<{
  name: string
  description: string
  progress: number
  status: 'running' | 'completed' | 'paused' | 'error'
  type: 'scraping' | 'extraction' | 'graph'
  timeElapsed: string
  itemsProcessed: number
  totalItems: number
  icon: LucideIcon
}>(({ name, description, progress, status, type, timeElapsed, itemsProcessed, totalItems, icon: Icon }) => {
  return (
    <div className="task-item">
      <div className="task-header">
        <div className="task-info">
          <Icon className={`task-icon ${type}`} />
          <div className="task-details">
            <div className="task-name">{name}</div>
            <div className="task-description">{description}</div>
          </div>
        </div>
        <div className={`task-status ${status}`}>
          {status.toUpperCase()}
        </div>
      </div>
      
      <div className="progress-container">
        <div 
          className={`progress-bar ${type}`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      <div className="task-metrics">
        <div className="task-progress-text">
          {itemsProcessed} / {totalItems} items
        </div>
        <div className="task-time">
          {timeElapsed}
        </div>
      </div>
    </div>
  )
})

// Compact Benchmark Card
const CompactBenchmark = React.memo<{
  title: string
  value: string
  unit: string
  status: 'excellent' | 'good' | 'poor'
  trend: string
}>(({ title, value, unit, status, trend }) => {
  return (
    <div className="benchmark-card">
      <div className="benchmark-header">
        <div className="benchmark-title">{title}</div>
        <div className={`benchmark-trend ${status}`}>
          {trend}
        </div>
      </div>
      <div className="benchmark-value">
        {value} <span className="benchmark-unit">{unit}</span>
      </div>
    </div>
  )
})

const DashboardPage: React.FC = () => {
  // Use real system monitoring data
  const { metrics, systemInfo } = useSystemMonitor(5000);
  
  // Service management state
  const [services, setServices] = useState({
    api: { running: true, status: 'online' as const, responseTime: '45ms' },
    database: { running: true, status: 'online' as const, responseTime: '12ms' },
    extraction: { running: true, status: 'online' as const, responseTime: '89ms' },
    scraping: { running: false, status: 'offline' as const, responseTime: 'N/A' }
  });

  // Task progress state with countdown timers
  const [tasks, setTasks] = useState([
    {
      id: 1,
      name: 'Web Scraping - EPC Products',
      description: 'Scraping semiconductor datasheets from EPC website',
      progress: 65,
      status: 'running' as const,
      type: 'scraping' as const,
      startTime: Date.now() - 154000, // 2m 34s ago
      itemsProcessed: 13,
      totalItems: 20,
      icon: Download
    },
    {
      id: 2,
      name: 'Datasheet Extraction',
      description: 'Extracting parameters from uploaded PDF datasheets',
      progress: 42,
      status: 'running' as const,
      type: 'extraction' as const,
      startTime: Date.now() - 78000, // 1m 18s ago
      itemsProcessed: 8,
      totalItems: 19,
      icon: FileText
    },
    {
      id: 3,
      name: 'Graph Data Extraction',
      description: 'Processing characteristic curves from datasheet graphs',
      progress: 100,
      status: 'completed' as const,
      type: 'graph' as const,
      startTime: Date.now() - 45000, // 45s ago
      itemsProcessed: 15,
      totalItems: 15,
      icon: BarChart
    }
  ]);

  // Format time elapsed
  const formatTimeElapsed = useCallback((startTime: number) => {
    const elapsed = Date.now() - startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }, []);

  // Simulate task progress updates with countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(prevTasks => 
        prevTasks.map(task => {
          if (task.status === 'running' && task.progress < 100) {
            const newProgress = Math.min(task.progress + Math.random() * 5, 100);
            const newItemsProcessed = Math.floor((newProgress / 100) * task.totalItems);
            
            if (newProgress >= 100) {
              return {
                ...task,
                progress: 100,
                status: 'completed' as const,
                itemsProcessed: task.totalItems
              };
            }
            
            return {
              ...task,
              progress: newProgress,
              itemsProcessed: newItemsProcessed
            };
          }
          return task;
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Toggle service function
  const toggleService = useCallback((serviceName: keyof typeof services) => {
    setServices(prev => ({
      ...prev,
      [serviceName]: {
        ...prev[serviceName],
        running: !prev[serviceName].running,
        status: !prev[serviceName].running ? 'online' as const : 'offline' as const
      }
    }));
  }, []);

  // Quick action functions
  const handleUploadPDF = useCallback(() => {
    window.location.href = '/product-management';
  }, []);

  const handleSpiceExtraction = useCallback(() => {
    window.location.href = '/spice-gen';
  }, []);

  const handleGraphExtraction = useCallback(() => {
    window.location.href = '/graph-extraction';
  }, []);

  const handleProductManagement = useCallback(() => {
    window.location.href = '/product-management';
  }, []);

  const quickActions = useMemo(() => [
    { 
      name: 'UPLOAD PDF', 
      icon: Upload, 
      onClick: handleUploadPDF,
      shortcut: 'Ctrl+U',
      description: 'Upload datasheets'
    },
    { 
      name: 'SPICE EXTRACTION', 
      icon: Zap, 
      onClick: handleSpiceExtraction,
      shortcut: 'Ctrl+S',
      description: 'Generate SPICE models'
    },
    { 
      name: 'GRAPH EXTRACTION', 
      icon: BarChart3, 
      onClick: handleGraphExtraction,
      shortcut: 'Ctrl+G',
      description: 'Extract curves'
    },
    { 
      name: 'PRODUCT MANAGEMENT', 
      icon: Database, 
      onClick: handleProductManagement,
      shortcut: 'Ctrl+P',
      description: 'Manage products'
    },
  ], [handleUploadPDF, handleSpiceExtraction, handleGraphExtraction, handleProductManagement])

  const benchmarks = useMemo(() => [
    {
      title: 'EXTRACTION SPEED',
      value: '2.3',
      unit: 'graphs/sec',
      status: 'excellent' as const,
      trend: '+27%'
    },
    {
      title: 'MODEL ACCURACY',
      value: '94.2',
      unit: '%',
      status: 'excellent' as const,
      trend: '+4.2%'
    },
    {
      title: 'PROCESSING TIME',
      value: '1.8',
      unit: 'sec',
      status: 'excellent' as const,
      trend: '-28%'
    },
    {
      title: 'MEMORY EFFICIENCY',
      value: '78',
      unit: '%',
      status: 'good' as const,
      trend: '-7%'
    }
  ], [])

  return (
    <div className="dashboard-container">
      {/* Main Content Grid - Single Page Layout */}
      <div className="dashboard-grid">
        
        {/* Left Column - Tasks & Quick Actions */}
        <div className="dashboard-left-column">
          
          {/* Task Bar with Progress Bars */}
          <div className="task-bar">
            <h3 className="section-header">ACTIVE TASKS</h3>
            <div className="task-list">
              {tasks.map((task) => (
                <TaskProgressCard
                  key={task.id}
                  name={task.name}
                  description={task.description}
                  progress={task.progress}
                  status={task.status}
                  type={task.type}
                  timeElapsed={formatTimeElapsed(task.startTime)}
                  itemsProcessed={task.itemsProcessed}
                  totalItems={task.totalItems}
                  icon={task.icon}
                />
              ))}
            </div>
          </div>

          {/* Quick Actions - 2x2 Grid */}
          <div>
            <h3 className="section-header">QUICK ACTIONS</h3>
            <div className="quick-actions-grid">
              {quickActions.map((action, index) => (
                <CompactQuickAction key={index} {...action} />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Service Status & Benchmarks */}
        <div className="dashboard-right-column">
          
          {/* Service Status */}
          <div>
            <h3 className="section-header">SERVICE STATUS</h3>
            <div className="service-toggles">
              <CompactServiceToggle
                service="API GATEWAY"
                status={services.api.status}
                responseTime={services.api.responseTime}
                toggleService={() => toggleService('api')}
                isRunning={services.api.running}
              />
              <CompactServiceToggle
                service="DATABASE"
                status={services.database.status}
                responseTime={services.database.responseTime}
                toggleService={() => toggleService('database')}
                isRunning={services.database.running}
              />
              <CompactServiceToggle
                service="EXTRACTION ENGINE"
                status={services.extraction.status}
                responseTime={services.extraction.responseTime}
                toggleService={() => toggleService('extraction')}
                isRunning={services.extraction.running}
              />
              <CompactServiceToggle
                service="WEB SCRAPER"
                status={services.scraping.status}
                responseTime={services.scraping.responseTime}
                toggleService={() => toggleService('scraping')}
                isRunning={services.scraping.running}
              />
            </div>
          </div>

          {/* Benchmarking Information */}
          <div>
            <h3 className="section-header">BENCHMARKING</h3>
            <div className="benchmarks">
              {benchmarks.map((benchmark, index) => (
                <CompactBenchmark key={index} {...benchmark} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
