export interface ComponentData {
  id: string
  name: string
  type: 'gateway' | 'service' | 'database' | 'cache' | 'ai' | 'infrastructure'
  category: 'core' | 'production' | 'enterprise' | 'infrastructure' | 'data'
  port?: number
  description: string
  longDescription: string
  features: string[]
  technologies: string[]
  dependencies: string[]
  status: 'active' | 'inactive' | 'maintenance'
  metrics: {
    requestsPerSecond: number
    responseTime: number
    errorRate: number
    cpuUsage: number
    memoryUsage: number
  }
  businessMetrics?: {
    [key: string]: number | string
  }
  documentation: {
    overview: string
    api: string
    configuration: string
    troubleshooting: string
  }
  position: { x: number; y: number }
}

export interface ConnectionData {
  id: string
  source: string
  target: string
  type: 'data' | 'control' | 'orchestration' | 'storage' | 'integration'
  status: 'active' | 'inactive' | 'error'
  label: string
}

export interface ArchitectureData {
  components: ComponentData[]
  connections: ConnectionData[]
}

export interface NodeData {
  id: string
  type: string
  position: { x: number; y: number }
  data: ComponentData
}

export interface EdgeData {
  id: string
  source: string
  target: string
  type: string
  data: ConnectionData
} 