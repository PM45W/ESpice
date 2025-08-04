import React, { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ComponentData } from '../types'
import { architectureData } from '../data/architectureData'
import { 
  Filter,
  BarChart3,
  Maximize2,
  Minimize2,
  Zap,
  ChevronRight
} from 'lucide-react'

interface ArchitectureGraphProps {
  onComponentClick: (component: ComponentData) => void
}

// Isolated layout with proper spacing - each component has unique coordinates
const calculateLayout = () => {
  const nodeWidth = 220
  const nodeHeight = 140
  const spacing = 50
  
  return {
    // Layer 1: Frontend (top center) - moved down to avoid filter overlap
    frontend: { 
      x: 500, 
      y: 150, 
      width: nodeWidth, 
      height: nodeHeight 
    },
    
    // Layer 2: Core Services (middle row, spaced out)
    'api-gateway': { 
      x: 300, 
      y: 350, 
      width: nodeWidth, 
      height: nodeHeight 
    },
    'mcp-server': { 
      x: 700, 
      y: 350, 
      width: nodeWidth, 
      height: nodeHeight 
    },
    
    // Layer 3: Processing Services (bottom row, well spaced)
    'pdf-service': { 
      x: 100, 
      y: 550, 
      width: nodeWidth, 
      height: nodeHeight 
    },
    'image-service': { 
      x: 350, 
      y: 550, 
      width: nodeWidth, 
      height: nodeHeight 
    },
    'table-service': { 
      x: 600, 
      y: 550, 
      width: nodeWidth, 
      height: nodeHeight 
    },
    'spice-service': { 
      x: 850, 
      y: 550, 
      width: nodeWidth, 
      height: nodeHeight 
    },
    'external-apis': { 
      x: 1100, 
      y: 550, 
      width: nodeWidth, 
      height: nodeHeight 
    },
    
    // Layer 4: Storage & Processing (bottom, spaced)
    'batch-processor': { 
      x: 200, 
      y: 750, 
      width: nodeWidth, 
      height: nodeHeight 
    },
    'test-correlation': { 
      x: 500, 
      y: 750, 
      width: nodeWidth, 
      height: nodeHeight 
    },
    'database': { 
      x: 800, 
      y: 750, 
      width: nodeWidth, 
      height: nodeHeight 
    }
  }
}

// Simplified connections with clear routing
const getConnections = () => [
  // Frontend to API Gateway
  { from: 'frontend', to: 'api-gateway', label: 'API Calls', type: 'primary' },
  
  // API Gateway to MCP Server
  { from: 'api-gateway', to: 'mcp-server', label: 'AI Processing', type: 'primary' },
  
  // MCP Server to Processing Services
  { from: 'mcp-server', to: 'pdf-service', label: 'PDF Processing', type: 'data' },
  { from: 'mcp-server', to: 'image-service', label: 'Image Processing', type: 'data' },
  { from: 'mcp-server', to: 'table-service', label: 'Table Extraction', type: 'data' },
  { from: 'mcp-server', to: 'spice-service', label: 'Model Generation', type: 'data' },
  
  // Processing Services to Storage
  { from: 'pdf-service', to: 'database', label: 'Data Persistence', type: 'storage' },
  { from: 'image-service', to: 'database', label: 'Data Persistence', type: 'storage' },
  { from: 'table-service', to: 'database', label: 'Data Persistence', type: 'storage' },
  { from: 'spice-service', to: 'database', label: 'Data Persistence', type: 'storage' },
  
  // SPICE Service to External APIs
  { from: 'spice-service', to: 'external-apis', label: 'Foundry Integration', type: 'external' },
  
  // Processing Services to Batch/Test
  { from: 'spice-service', to: 'batch-processor', label: 'Batch Processing', type: 'processing' },
  { from: 'spice-service', to: 'test-correlation', label: 'Model Validation', type: 'validation' },
  
  // Test Correlation to Database
  { from: 'test-correlation', to: 'database', label: 'Validation Results', type: 'storage' },
  
  // Feedback loops
  { from: 'batch-processor', to: 'api-gateway', label: 'Results', type: 'feedback' },
  { from: 'test-correlation', to: 'api-gateway', label: 'Validation', type: 'feedback' }
]

const getConnectionColor = (type: string) => {
  switch (type) {
    case 'primary': return '#3b82f6' // Blue
    case 'data': return '#10b981' // Green
    case 'storage': return '#8b5cf6' // Purple
    case 'processing': return '#f59e0b' // Amber
    case 'validation': return '#ef4444' // Red
    case 'external': return '#06b6d4' // Cyan
    case 'feedback': return '#84cc16' // Lime
    default: return '#6b7280' // Gray
  }
}

// Animated Data Particle Component
const DataParticle: React.FC<{ 
  path: string, 
  color: string, 
  delay: number,
  duration: number 
}> = ({ path, color, delay, duration }) => {
  return (
    <motion.circle
      r="3"
      fill={color}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
        opacity: [0, 1, 1, 0],
        scale: [0, 1, 1, 0],
        pathLength: [0, 1]
      }}
      transition={{
        duration: duration,
        delay: delay,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <animateMotion
        dur={duration}
        repeatCount="indefinite"
        path={path}
      />
    </motion.circle>
  )
}

const ArchitectureGraph: React.FC<ArchitectureGraphProps> = ({ onComponentClick }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [animationEnabled, setAnimationEnabled] = useState(true)

  const layout = useMemo(() => calculateLayout(), [])
  const connections = useMemo(() => getConnections(), [])

  const categories = [
    { id: 'core', name: 'Core', color: 'bg-blue-500', count: architectureData.components.filter(c => c.category === 'core').length },
    { id: 'production', name: 'Production', color: 'bg-indigo-500', count: architectureData.components.filter(c => c.category === 'production').length },
    { id: 'enterprise', name: 'Enterprise', color: 'bg-emerald-500', count: architectureData.components.filter(c => c.category === 'enterprise').length },
    { id: 'infrastructure', name: 'Infrastructure', color: 'bg-amber-500', count: architectureData.components.filter(c => c.category === 'infrastructure').length },
    { id: 'data', name: 'Data', color: 'bg-purple-500', count: architectureData.components.filter(c => c.category === 'data').length }
  ]

  const activeComponents = architectureData.components.filter(c => c.status === 'active').length
  const totalComponents = architectureData.components.length

  const getNodeIcon = (name: string) => {
    const iconMap: { [key: string]: string } = {
      'frontend': '🌐',
      'api-gateway': '🛡️',
      'mcp-server': '🧠',
      'pdf-service': '📄',
      'image-service': '🖼️',
      'table-service': '📊',
      'spice-service': '⚡',
      'batch-processor': '⚙️',
      'test-correlation': '🧪',
      'database': '🗄️',
      'external-apis': '☁️'
    }
    return iconMap[name] || '🔧'
  }

  const getNodeColor = (category: string) => {
    switch (category) {
      case 'core': return 'from-blue-500 to-blue-600'
      case 'production': return 'from-indigo-500 to-indigo-600'
      case 'enterprise': return 'from-emerald-500 to-emerald-600'
      case 'infrastructure': return 'from-amber-500 to-amber-600'
      case 'data': return 'from-purple-500 to-purple-600'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const getNodeBorder = (category: string) => {
    switch (category) {
      case 'core': return 'border-blue-200'
      case 'production': return 'border-indigo-200'
      case 'enterprise': return 'border-emerald-200'
      case 'infrastructure': return 'border-amber-200'
      case 'data': return 'border-purple-200'
      default: return 'border-gray-200'
    }
  }

  const getConnectionPath = (from: string, to: string) => {
    const fromNode = layout[from as keyof typeof layout]
    const toNode = layout[to as keyof typeof layout]
    if (!fromNode || !toNode) return ''

    const fromX = fromNode.x + fromNode.width / 2
    const fromY = fromNode.y + fromNode.height / 2
    const toX = toNode.x + toNode.width / 2
    const toY = toNode.y + toNode.height / 2

    return `M ${fromX} ${fromY} L ${toX} ${toY}`
  }

  return (
    <div className={`w-full h-full relative transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Top Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between"
      >
        {/* Category Filter */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/60 p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Filter className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Filter Components</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-2 ${
                selectedCategory === null
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              <span>All</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
                {totalComponents}
              </span>
            </motion.button>
            {categories.map((category) => (
              <motion.button
                key={category.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-2 ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                <span>{category.name}</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
                  {category.count}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Stats Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/60 p-4"
        >
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Platform Stats</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 font-medium">Services:</span>
              <span className="font-bold text-gray-900">{totalComponents}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 font-medium">Active:</span>
              <span className="font-bold text-emerald-600 flex items-center">
                <Zap className="w-3 h-3 mr-1" />
                {activeComponents}
              </span>
            </div>
          </div>
        </motion.div>

        {/* View Controls */}
        <div className="flex space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setAnimationEnabled(!animationEnabled)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-2 ${
              animationEnabled
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
            }`}
            title={animationEnabled ? "Disable animations" : "Enable animations"}
          >
            <Zap className={`w-4 h-4 ${animationEnabled ? 'animate-pulse' : ''}`} />
            <span>{animationEnabled ? 'Animations ON' : 'Animations OFF'}</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/60 p-3"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5 text-gray-600" /> : <Maximize2 className="w-5 h-5 text-gray-600" />}
          </motion.button>
        </div>
      </motion.div>

      {/* Architecture Diagram */}
      <div className="w-full h-full relative">
        <div 
          className="relative bg-gradient-to-br from-gray-50/80 to-gray-100/80 overflow-auto" 
          style={{ 
            width: '1400px', 
            height: '1000px',
            position: 'relative'
          }}
        >
          {/* Grid Background */}
          <div className="absolute inset-0 opacity-5">
            <svg width="100%" height="100%">
              <defs>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#94a3b8" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
              </marker>
            </defs>
            
            {connections.map((connection, index) => {
              const isVisible = selectedCategory === null || 
                architectureData.components.find(c => c.id === connection.from)?.category === selectedCategory ||
                architectureData.components.find(c => c.id === connection.to)?.category === selectedCategory

              const path = getConnectionPath(connection.from, connection.to)
              const color = getConnectionColor(connection.type)

              return (
                <g key={index} opacity={isVisible ? 1 : 0.2}>
                  <path
                    d={path}
                    stroke={color}
                    strokeWidth="3"
                    fill="none"
                    markerEnd="url(#arrowhead)"
                    className="transition-all duration-300"
                    style={{ opacity: 0.8 }}
                  />
                  
                  {/* Animated Data Particles */}
                  {animationEnabled && isVisible && (
                    <>
                      <DataParticle path={path} color={color} delay={index * 0.5} duration={3} />
                      <DataParticle path={path} color={color} delay={index * 0.5 + 1} duration={3} />
                      <DataParticle path={path} color={color} delay={index * 0.5 + 2} duration={3} />
                    </>
                  )}
                  
                  {/* Connection Label */}
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    className="text-xs font-semibold fill-gray-700 pointer-events-auto"
                    style={{ fontSize: '10px' }}
                  >
                    <textPath href={`#path-${index}`} startOffset="50%">
                      {connection.label}
                    </textPath>
                  </text>
                  <path
                    id={`path-${index}`}
                    d={path}
                    fill="none"
                    opacity="0"
                  />
                </g>
              )
            })}
          </svg>

          {/* Nodes */}
          <div className="absolute inset-0">
            {architectureData.components.map((component) => {
              const nodeLayout = layout[component.id as keyof typeof layout]
              if (!nodeLayout) return null

              const isVisible = selectedCategory === null || component.category === selectedCategory
              const isActive = component.status === 'active'

              return (
                <motion.div
                  key={component.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ 
                    scale: isVisible ? 1 : 0.5, 
                    opacity: isVisible ? 1 : 0.3 
                  }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 20 
                  }}
                  className="absolute cursor-pointer group"
                  style={{
                    left: `${nodeLayout.x}px`,
                    top: `${nodeLayout.y}px`,
                    width: `${nodeLayout.width}px`,
                    height: `${nodeLayout.height}px`,
                    position: 'absolute',
                    zIndex: 10
                  }}
                  onClick={() => onComponentClick(component)}
                >
                  <div className={`
                    relative bg-white rounded-xl shadow-lg border-2 transition-all duration-300 w-full h-full
                    ${getNodeBorder(component.category)}
                    ${isActive ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}
                    hover:shadow-xl
                  `}>
                    {/* Header with gradient */}
                    <div className={`h-12 bg-gradient-to-r ${getNodeColor(component.category)} rounded-t-xl flex items-center justify-center`}>
                      <span className="text-xl">{getNodeIcon(component.id)}</span>
                    </div>
                    
                    {/* Content */}
                    <div className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">
                            {component.name}
                          </h3>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                            {component.description}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <div className={`w-2 h-2 ${isActive ? 'bg-emerald-500' : 'bg-gray-400'} rounded-full shadow-sm`} />
                          {component.port && (
                            <span className="text-xs text-gray-600 font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                              :{component.port}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Category Badge */}
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                          component.category === 'core' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          component.category === 'production' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                          component.category === 'enterprise' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                          component.category === 'infrastructure' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                          component.category === 'data' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                          'bg-gray-100 text-gray-800 border-gray-200'
                        }`}>
                          {component.category}
                        </span>
                        
                        <motion.div
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          whileHover={{ x: 2 }}
                        >
                          <ChevronRight className="w-3 h-3 text-gray-400" />
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ArchitectureGraph 