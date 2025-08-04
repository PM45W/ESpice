import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, Code, Settings, AlertTriangle, Activity, Database, Server, Globe, Cpu, Network, TrendingUp, DollarSign, Target, CheckCircle } from 'lucide-react'
import { ComponentData } from '../types'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface ComponentDetailsProps {
  component: ComponentData
  onClose: () => void
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'text-emerald-600 bg-emerald-100/80 border border-emerald-200/60'
    case 'inactive':
      return 'text-gray-600 bg-gray-100/80 border border-gray-200/60'
    case 'maintenance':
      return 'text-amber-600 bg-amber-100/80 border border-amber-200/60'
    default:
      return 'text-gray-600 bg-gray-100/80 border border-gray-200/60'
  }
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'gateway':
      return <Globe className="w-5 h-5" />
    case 'service':
      return <Server className="w-5 h-5" />
    case 'database':
      return <Database className="w-5 h-5" />
    case 'ai':
      return <Cpu className="w-5 h-5" />
    case 'infrastructure':
      return <Network className="w-5 h-5" />
    default:
      return <Activity className="w-5 h-5" />
  }
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'core':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'production':
      return 'bg-indigo-100 text-indigo-700 border-indigo-200'
    case 'enterprise':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'infrastructure':
      return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'data':
      return 'bg-purple-100 text-purple-700 border-purple-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

const ComponentDetails: React.FC<ComponentDetailsProps> = ({ component, onClose }) => {
  const statusColor = getStatusColor(component.status)
  const typeIcon = getTypeIcon(component.type)
  const categoryColor = getCategoryColor(component.category)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 h-full w-80 md:w-96 bg-white/95 backdrop-blur-md shadow-2xl border-l border-gray-200/60 z-50 overflow-y-auto component-details"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-gray-200/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                {typeIcon}
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-gray-900 text-overflow-safe">{component.name}</h2>
                <p className="text-sm text-soft text-wrap-safe">{component.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Status, Category, and Port */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${statusColor}`}>
                {component.status}
              </span>
              <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${categoryColor}`}>
                {component.category}
              </span>
            </div>
            {component.port && (
              <span className="text-sm text-muted font-mono bg-gray-100/80 px-3 py-1.5 rounded-lg border border-gray-200/60">
                Port: {component.port}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
            <p className="text-soft text-sm leading-relaxed text-wrap-safe">{component.longDescription}</p>
          </div>

          {/* Business Value */}
          {component.businessMetrics && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>Business Value</span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(component.businessMetrics).map(([key, value]) => (
                  <div key={key} className="metric-card">
                    <div className="text-xl font-bold text-emerald-600">
                      {typeof value === 'number' && key.includes('Rate') ? `${value}%` : 
                       typeof value === 'number' && key.includes('Savings') ? `$${value.toLocaleString()}` :
                       typeof value === 'number' && key.includes('Speed') ? `${value}x` :
                       typeof value === 'number' && key.includes('Accuracy') ? `${value}%` :
                       typeof value === 'number' && key.includes('Uptime') ? `${value}%` :
                       typeof value === 'number' && key.includes('Score') ? `${value}/100` :
                       typeof value === 'number' && key.includes('Level') ? `${value}%` :
                       typeof value === 'number' && key.includes('Success') ? `${value}%` :
                       typeof value === 'number' && key.includes('Integrity') ? `${value}%` :
                       typeof value === 'number' && key.includes('Reliability') ? `${value}%` :
                       typeof value === 'number' && key.includes('Compatibility') ? `${value}` :
                       typeof value === 'number' && key.includes('Support') ? `${value}+` :
                       typeof value === 'number' && key.includes('Efficiency') ? `${value}%` :
                       typeof value === 'number' && key.includes('Scalability') ? `${value}x` :
                       typeof value === 'number' && key.includes('Throughput') ? `${value}/sec` :
                       typeof value === 'number' && key.includes('Time') ? `${value}s` :
                       typeof value === 'number' && key.includes('Quality') ? `${value}%` :
                       typeof value === 'number' && key.includes('Satisfaction') ? `${value}/5` :
                       typeof value === 'number' && key.includes('Adoption') ? `${value}%` :
                       typeof value === 'number' && key.includes('Retention') ? `${value}%` :
                       typeof value === 'number' && key.includes('Usage') ? `${value}%` :
                       typeof value === 'number' && key.includes('Automation') ? `${value}%` :
                       typeof value === 'number' && key.includes('Processing') ? `${value}x` :
                       typeof value === 'number' && key.includes('Validation') ? `${value}%` :
                       typeof value === 'number' && key.includes('Correlation') ? `${value}%` :
                       typeof value === 'number' && key.includes('Confidence') ? `${value}%` :
                       typeof value === 'number' && key.includes('Integration') ? `${value}%` :
                       typeof value === 'number' && key.includes('Foundry') ? `${value}+` :
                       typeof value === 'number' && key.includes('Eda') ? `${value}+` :
                       typeof value === 'number' && key.includes('Api') ? `${value}%` :
                       typeof value === 'number' && key.includes('Backup') ? `${value}%` :
                       typeof value === 'number' && key.includes('Security') ? `${value}/100` :
                       typeof value === 'number' && key.includes('Latency') ? `${value}ms` :
                       typeof value === 'number' && key.includes('Availability') ? `${value}%` :
                       typeof value === 'number' && key.includes('Cost') ? `$${value.toLocaleString()}` :
                       value}
                    </div>
                    <div className="text-xs text-muted capitalize">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Features */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span>Features</span>
            </h3>
            <ul className="space-y-2">
              {component.features.map((feature, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-soft">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Technologies */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
              <Code className="w-5 h-5 text-emerald-600" />
              <span>Technologies</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {component.technologies.map((tech, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-gray-100/80 text-gray-700 text-xs font-medium rounded-lg border border-gray-200/60"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Performance Metrics */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <span>Performance Metrics</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="metric-card">
                <div className="text-2xl font-bold text-emerald-600">{component.metrics.requestsPerSecond}</div>
                <div className="text-xs text-muted">Requests/sec</div>
              </div>
              <div className="metric-card">
                <div className="text-2xl font-bold text-emerald-600">{component.metrics.responseTime}ms</div>
                <div className="text-xs text-muted">Response Time</div>
              </div>
              <div className="metric-card">
                <div className="text-2xl font-bold text-emerald-600">{component.metrics.cpuUsage}%</div>
                <div className="text-xs text-muted">CPU Usage</div>
              </div>
              <div className="metric-card">
                <div className="text-2xl font-bold text-emerald-600">{component.metrics.memoryUsage}MB</div>
                <div className="text-xs text-muted">Memory</div>
              </div>
            </div>
          </div>

          {/* Dependencies */}
          {component.dependencies.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Dependencies</h3>
              <div className="flex flex-wrap gap-2">
                {component.dependencies.map((dep, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-blue-100/80 text-blue-700 text-xs font-medium rounded-lg border border-blue-200/60"
                  >
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Documentation */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Documentation</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Overview</h4>
                <p className="text-sm text-soft">{component.documentation.overview}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">API</h4>
                <p className="text-sm text-soft">{component.documentation.api}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Configuration</h4>
                <p className="text-sm text-soft">{component.documentation.configuration}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Troubleshooting</h4>
                <p className="text-sm text-soft">{component.documentation.troubleshooting}</p>
              </div>
            </div>
          </div>

          {/* Example Configuration */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Example Configuration</h3>
            <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl p-4 border border-gray-800/60">
              <SyntaxHighlighter
                language="yaml"
                style={tomorrow}
                customStyle={{
                  margin: 0,
                  background: 'transparent',
                  fontSize: '12px'
                }}
              >
                {`# ${component.name} Configuration
service:
  name: ${component.name.toLowerCase().replace(' ', '-')}
  port: ${component.port || 8000}
  host: 0.0.0.0

logging:
  level: INFO
  format: json

database:
  url: sqlite:///espice.db
  pool_size: 10

# Add your specific configuration here`}
              </SyntaxHighlighter>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200/60">
            <button className="flex-1 btn-primary flex items-center justify-center space-x-2">
              <ExternalLink className="w-4 h-4" />
              <span>View API Docs</span>
            </button>
            <button className="flex-1 btn-secondary flex items-center justify-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Configure</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ComponentDetails 