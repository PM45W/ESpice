import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, 
  Image, 
  Table, 
  Code, 
  CheckCircle, 
  Clock,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react'

interface WorkflowSimulatorProps {
  isSimulating: boolean
}

interface WorkflowStep {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  duration: number
  status: 'pending' | 'running' | 'completed' | 'error'
  data?: any
}

const WorkflowSimulator: React.FC<WorkflowSimulatorProps> = ({ isSimulating }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [steps, setSteps] = useState<WorkflowStep[]>([
    {
      id: 'upload',
      name: 'Datasheet Upload',
      description: 'PDF datasheet uploaded to the system',
      icon: <FileText className="w-5 h-5" />,
      duration: 1000,
      status: 'pending'
    },
    {
      id: 'pdf-processing',
      name: 'PDF Processing',
      description: 'Extracting text and tables from PDF',
      icon: <FileText className="w-5 h-5" />,
      duration: 2000,
      status: 'pending'
    },
    {
      id: 'image-processing',
      name: 'Image Processing',
      description: 'Extracting curves and graphs from images',
      icon: <Image className="w-5 h-5" />,
      duration: 3000,
      status: 'pending'
    },
    {
      id: 'table-extraction',
      name: 'Table Extraction',
      description: 'Processing tabular data and parameters',
      icon: <Table className="w-5 h-5" />,
      duration: 1500,
      status: 'pending'
    },
    {
      id: 'ai-orchestration',
      name: 'AI Orchestration',
      description: 'AI agent coordinating the workflow',
      icon: <Code className="w-5 h-5" />,
      duration: 2500,
      status: 'pending'
    },
    {
      id: 'spice-generation',
      name: 'SPICE Model Generation',
      description: 'Generating SPICE models from extracted data',
      icon: <Code className="w-5 h-5" />,
      duration: 4000,
      status: 'pending'
    },
    {
      id: 'validation',
      name: 'Model Validation',
      description: 'Validating and optimizing SPICE models',
      icon: <CheckCircle className="w-5 h-5" />,
      duration: 2000,
      status: 'pending'
    },
    {
      id: 'completion',
      name: 'Processing Complete',
      description: 'SPICE models ready for export',
      icon: <CheckCircle className="w-5 h-5" />,
      duration: 1000,
      status: 'pending'
    }
  ])

  useEffect(() => {
    if (!isSimulating) {
      setCurrentStep(0)
      setSteps(steps.map(step => ({ ...step, status: 'pending' })))
      return
    }

    const runWorkflow = async () => {
      for (let i = 0; i < steps.length; i++) {
        if (!isSimulating) break
        
        setCurrentStep(i)
        setSteps(prev => prev.map((step, index) => ({
          ...step,
          status: index === i ? 'running' : 
                 index < i ? 'completed' : 'pending'
        })))

        await new Promise(resolve => setTimeout(resolve, steps[i].duration))
      }

      if (isSimulating) {
        setSteps(prev => prev.map(step => ({ ...step, status: 'completed' })))
      }
    }

    runWorkflow()
  }, [isSimulating])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'running':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-green-500 bg-green-50'
      case 'running':
        return 'border-blue-500 bg-blue-50'
      case 'error':
        return 'border-red-500 bg-red-50'
      default:
        return 'border-gray-200 bg-white'
    }
  }

  const resetWorkflow = () => {
    setCurrentStep(0)
    setSteps(steps.map(step => ({ ...step, status: 'pending' })))
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent mb-2">
            ESpice Workflow Simulation
          </h1>
          <p className="text-gray-600">
            Watch how a datasheet flows through the entire processing pipeline
          </p>
        </div>

        {/* Workflow Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                relative p-6 rounded-xl border-2 transition-all duration-500
                ${getStatusColor(step.status)}
                ${step.status === 'running' ? 'shadow-lg scale-105' : 'shadow-md'}
              `}
            >
              {/* Step Number */}
              <div className="absolute -left-3 top-6 w-6 h-6 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-600">{index + 1}</span>
              </div>

              <div className="flex items-center space-x-4">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className={`
                    w-12 h-12 rounded-lg flex items-center justify-center
                    ${step.status === 'completed' ? 'bg-green-100 text-green-600' :
                      step.status === 'running' ? 'bg-blue-100 text-blue-600' :
                      step.status === 'error' ? 'bg-red-100 text-red-600' :
                      'bg-gray-100 text-gray-600'}
                  `}>
                    {step.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {step.name}
                    </h3>
                    {getStatusIcon(step.status)}
                  </div>
                  <p className="text-gray-600 mb-3">
                    {step.description}
                  </p>
                  
                  {/* Progress Bar */}
                  {step.status === 'running' && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: step.duration / 1000, ease: 'linear' }}
                      className="h-2 bg-blue-200 rounded-full overflow-hidden"
                    >
                      <div className="h-full bg-blue-500 rounded-full" />
                    </motion.div>
                  )}
                  
                  {step.status === 'completed' && (
                    <div className="h-2 bg-green-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" />
                    </div>
                  )}
                </div>

                {/* Duration */}
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {(step.duration / 1000).toFixed(1)}s
                  </div>
                </div>
              </div>

              {/* Connection Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-3 top-full w-0.5 h-4 bg-gray-200" />
              )}
            </motion.div>
          ))}
        </div>

        {/* Controls */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={resetWorkflow}
              className="btn-secondary flex items-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
            
            <div className="text-sm text-gray-600">
              {isSimulating ? 'Simulation running...' : 'Click "Start Simulation" to begin'}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {steps.filter(s => s.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Steps Completed</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 text-center">
            <div className="text-2xl font-bold text-gray-600">
              {(steps.reduce((acc, step) => acc + step.duration, 0) / 1000).toFixed(1)}s
            </div>
            <div className="text-sm text-gray-600">Total Duration</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 text-center">
            <div className="text-2xl font-bold text-green-600">
              {steps.filter(s => s.status === 'running').length > 0 ? 'Active' : 'Idle'}
            </div>
            <div className="text-sm text-gray-600">Current Status</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkflowSimulator 