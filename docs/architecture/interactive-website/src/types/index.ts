export interface ComponentData {
  id: string
  name: string
  type: 'service' | 'gateway' | 'database' | 'cache' | 'ai' | 'infrastructure'
  category: 'core' | 'production' | 'enterprise' | 'infrastructure' | 'data'
  port: number
  description: string
  longDescription: string
  features: string[]
  technologies: string[]
  dependencies: string[]
  status: 'active' | 'inactive' | 'error'
  metrics?: {
    requestsPerSecond?: number
    responseTime?: number
    errorRate?: number
    cpuUsage?: number
    memoryUsage?: number
  }
  documentation: {
    overview: string
    api?: string
    configuration?: string
    troubleshooting?: string
  }
  position: {
    x: number
    y: number
  }
}

export interface ConnectionData {
  id: string
  source: string
  target: string
  type: 'http' | 'database' | 'cache' | 'message' | 'file'
  label?: string
  status: 'active' | 'inactive' | 'error'
}

export interface WorkflowStep {
  id: string
  name: string
  component: string
  description: string
  duration: number
  status: 'pending' | 'running' | 'completed' | 'error'
  data?: any
}

export interface ArchitectureData {
  components: ComponentData[]
  connections: ConnectionData[]
}

export interface SimulationState {
  isRunning: boolean
  currentStep: number
  steps: WorkflowStep[]
  elapsedTime: number
} 