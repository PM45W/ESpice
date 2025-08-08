import React, { useCallback, useMemo, useState } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  EdgeTypes,
  ReactFlowProvider
} from 'reactflow'
import 'reactflow/dist/style.css'
import { motion, AnimatePresence } from 'framer-motion'
import { ComponentData, ConnectionData } from '../types'
import { architectureData } from '../data/architectureData'
import CustomNode from './CustomNode'
import CustomEdge from './CustomEdge'
import { 
  Zap, 
  Database, 
  Server, 
  Cpu, 
  Network, 
  Shield,
  Activity,
  Globe,
  Layers,
  HelpCircle,
  X
} from 'lucide-react'

interface ArchitectureGraphProps {
  onComponentClick: (component: ComponentData) => void
}

const nodeTypes: NodeTypes = {
  custom: CustomNode,
}

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
}

const getNodeIcon = (type: string) => {
  switch (type) {
    case 'gateway':
      return <Globe className="w-5 h-5" />
    case 'service':
      return <Server className="w-5 h-5" />
    case 'database':
      return <Database className="w-5 h-5" />
    case 'cache':
      return <Zap className="w-5 h-5" />
    case 'ai':
      return <Cpu className="w-5 h-5" />
    case 'infrastructure':
      return <Network className="w-5 h-5" />
    default:
      return <Activity className="w-5 h-5" />
  }
}

const getNodeColor = (category: string) => {
  switch (category) {
    case 'core':
      return 'from-blue-500 to-blue-600'
    case 'production':
      return 'from-indigo-50 to-indigo-600'
    case 'enterprise':
      return 'from-green-500 to-green-600'
    case 'infrastructure':
      return 'from-yellow-500 to-yellow-600'
    case 'data':
      return 'from-gray-500 to-gray-600'
    default:
      return 'from-gray-500 to-gray-600'
  }
}

const ArchitectureGraph: React.FC<ArchitectureGraphProps> = ({ onComponentClick }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)

  // Convert architecture data to React Flow format
  const reactFlowNodes = useMemo(() => {
    return architectureData.components.map((component) => ({
      id: component.id,
      type: 'custom',
      position: component.position,
      draggable: true,
      data: {
        ...component,
        icon: getNodeIcon(component.type),
        color: getNodeColor(component.category),
        onClick: () => onComponentClick(component),
        isSelected: selectedCategory === null || component.category === selectedCategory
      },
      style: {
        opacity: selectedCategory === null || component.category === selectedCategory ? 1 : 0.3,
        transition: 'opacity 0.3s ease'
      }
    })) as Node[]
  }, [selectedCategory, onComponentClick])

  const reactFlowEdges = useMemo(() => {
    return architectureData.connections.map((connection) => ({
      id: connection.id,
      source: connection.source,
      target: connection.target,
      type: 'custom',
      data: {
        type: connection.type,
        status: connection.status,
        label: connection.label
      },
      style: {
        opacity: selectedCategory === null || 
          architectureData.components.find(c => c.id === connection.source)?.category === selectedCategory ||
          architectureData.components.find(c => c.id === connection.target)?.category === selectedCategory ? 1 : 0.2,
        transition: 'opacity 0.3s ease'
      }
    })) as Edge[]
  }, [selectedCategory])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  )

  const categories = [
    { id: 'core', name: 'Core Services', color: 'bg-blue-500' },
    { id: 'production', name: 'Production', color: 'bg-indigo-500' },
    { id: 'enterprise', name: 'Enterprise', color: 'bg-green-500' },
    { id: 'infrastructure', name: 'Infrastructure', color: 'bg-yellow-500' },
    { id: 'data', name: 'Data Layer', color: 'bg-gray-500' }
  ]

  return (
    <div className="w-full h-full relative" style={{ minHeight: 'calc(100vh - 4rem)' }}>
      {/* Category Filter */}
      <div className="absolute top-4 left-4 z-30 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-md border border-gray-200 pointer-events-auto">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Filter by Category</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                selectedCategory === null
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } pointer-events-auto`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center space-x-1 ${
                  selectedCategory === category.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } pointer-events-auto`}
              >
                <div className={`w-2 h-2 rounded-full ${category.color.replace('primary','blue').replace('accent','indigo').replace('success','green').replace('warning','yellow').replace('secondary','gray')}`}></div>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Panel */}
      <div className="absolute top-4 right-4 z-30 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-md border border-gray-200 pointer-events-auto"
        >
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Platform Stats</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Services:</span>
              <span className="font-medium">{architectureData.components.length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Connections:</span>
              <span className="font-medium">{architectureData.connections.length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Active:</span>
              <span className="font-medium text-green-600">
                {architectureData.components.filter(c => c.status === 'active').length}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* React Flow Container */}
      <div className="w-full h-full absolute inset-0">
        <ReactFlowProvider>
          <ReactFlow
            nodes={reactFlowNodes}
            edges={reactFlowEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.1 }}
            attributionPosition="bottom-left"
            className="bg-gradient-to-br from-gray-50 to-blue-50"
            style={{ width: '100%', height: '100%' }}
          >
            <Background
              color="#94a3b8"
              gap={20}
              size={1}
              className="opacity-20"
            />
            <Controls
              className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-md"
            />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  )
}

export default ArchitectureGraph 