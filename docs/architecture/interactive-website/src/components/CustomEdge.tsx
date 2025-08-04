import React from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, EdgeProps } from 'reactflow'
import { motion } from 'framer-motion'

interface CustomEdgeData {
  type: string
  status: string
  label?: string
}

const CustomEdge: React.FC<EdgeProps<CustomEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
  markerEnd,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const getEdgeColor = (type: string, status: string) => {
    if (status === 'error') return '#ef4444'
    
    switch (type) {
      case 'http':
        return '#3b82f6'
      case 'database':
        return '#10b981'
      case 'cache':
        return '#f59e0b'
      case 'message':
        return '#8b5cf6'
      case 'file':
        return '#6b7280'
      default:
        return '#94a3b8'
    }
  }

  const getEdgeWidth = (type: string) => {
    switch (type) {
      case 'http':
        return 2
      case 'database':
        return 3
      case 'cache':
        return 2
      case 'message':
        return 2
      case 'file':
        return 1
      default:
        return 1
    }
  }

  const getConnectionType = (type: string) => {
    switch (type) {
      case 'http':
        return 'HTTP'
      case 'database':
        return 'DB'
      case 'cache':
        return 'Cache'
      case 'message':
        return 'Msg'
      case 'file':
        return 'File'
      default:
        return type.toUpperCase()
    }
  }

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: getEdgeColor(data?.type || 'http', data?.status || 'active'),
          strokeWidth: getEdgeWidth(data?.type || 'http'),
          strokeDasharray: data?.status === 'error' ? '5,5' : 'none',
        }}
      />
      
      {/* Animated flow indicator */}
      {data?.status === 'active' && (
        <motion.circle
          r={3}
          fill={getEdgeColor(data?.type || 'http', data?.status || 'active')}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            path={edgePath}
          />
        </motion.circle>
      )}
      
      {/* Edge Label */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 10,
            fontWeight: 500,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`
              px-2 py-1 rounded-full text-xs font-medium
              ${data?.status === 'error' 
                ? 'bg-error-100 text-error-700 border border-error-200' 
                : 'bg-white/90 backdrop-blur-sm text-secondary-700 border border-secondary-200 shadow-soft'
              }
            `}
          >
            {data?.label || getConnectionType(data?.type || 'http')}
          </motion.div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export default CustomEdge 