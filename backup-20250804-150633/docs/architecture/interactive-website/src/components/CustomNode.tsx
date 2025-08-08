import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { motion } from 'framer-motion'
import { ComponentData } from '../types'

interface CustomNodeData extends ComponentData {
  icon: React.ReactNode
  color: string
  onClick: () => void
  isSelected: boolean
}

const CustomNode: React.FC<NodeProps<CustomNodeData>> = ({ data }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500'
      case 'inactive':
        return 'bg-gray-400'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

  const getPortLabel = (port: number) => {
    return port > 0 ? `:${port}` : ''
  }

  return (
    <motion.div
      whileHover={{ 
        scale: 1.05,
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
      }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="relative"
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
      />
      
      <motion.div
        onClick={data.onClick}
        className={`
          relative cursor-pointer group
          bg-white rounded-xl shadow-md border-2 border-gray-200
          hover:shadow-lg transition-all duration-200
          ${data.isSelected ? 'border-blue-300 shadow-blue-100' : ''}
        `}
        style={{ minWidth: '200px' }}
      >
        {/* Status indicator */}
        <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor(data.status)}`} />
        
        {/* Header with gradient */}
        <div className={`
          relative overflow-hidden rounded-t-xl p-3
          bg-gradient-to-r ${data.color}
        `}>
          <div className="flex items-center space-x-2">
            <div className="text-white">
              {data.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-sm truncate">
                {data.name}
              </h3>
              <p className="text-white/80 text-xs">
                {data.type} {getPortLabel(data.port)}
              </p>
            </div>
          </div>
          
          {/* Hover overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 bg-black/20 flex items-center justify-center"
          >
            <span className="text-white text-xs font-medium">Click for details</span>
          </motion.div>
        </div>
        
        {/* Content */}
        <div className="p-3">
          <p className="text-gray-700 text-xs leading-relaxed mb-2">
            {data.description}
          </p>
          
          {/* Metrics */}
          {data.metrics && (
            <div className="space-y-1 mb-2">
              {data.metrics.requestsPerSecond && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">RPS:</span>
                  <span className="font-medium text-gray-900">
                    {data.metrics.requestsPerSecond.toLocaleString()}
                  </span>
                </div>
              )}
              {data.metrics.responseTime && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Response:</span>
                  <span className="font-medium text-gray-900">
                    {data.metrics.responseTime}ms
                  </span>
                </div>
              )}
              {data.metrics.errorRate && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Error Rate:</span>
                  <span className={`font-medium ${
                    data.metrics.errorRate < 1 ? 'text-green-600' : 
                    data.metrics.errorRate < 5 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {data.metrics.errorRate}%
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Technologies */}
          <div className="flex flex-wrap gap-1">
            {data.technologies.slice(0, 3).map((tech, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
              >
                {tech}
              </span>
            ))}
            {data.technologies.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                +{data.technologies.length - 3}
              </span>
            )}
          </div>
        </div>
        
        {/* Pulse animation for active services */}
        {data.status === 'active' && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full opacity-75"
          />
        )}
      </motion.div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
      />
    </motion.div>
  )
}

export default CustomNode 