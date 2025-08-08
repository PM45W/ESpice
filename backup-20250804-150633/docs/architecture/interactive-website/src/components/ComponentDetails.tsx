import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  ExternalLink, 
  Code, 
  Settings, 
  AlertTriangle, 
  CheckCircle,
  Activity,
  Clock,
  Zap,
  Database,
  Server,
  Globe,
  Cpu,
  Network
} from 'lucide-react'
import { ComponentData } from '../types'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface ComponentDetailsProps {
  component: ComponentData
  onClose: () => void
}

const ComponentDetails: React.FC<ComponentDetailsProps> = ({ component, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'api' | 'config' | 'troubleshooting'>('overview')

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-success-500" />
      case 'inactive':
        return <Clock className="w-4 h-4 text-secondary-500" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-error-500" />
      default:
        return <Activity className="w-4 h-4 text-secondary-500" />
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

  const tabs = [
    { id: 'overview', name: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'api', name: 'API', icon: <Code className="w-4 h-4" /> },
    { id: 'config', name: 'Configuration', icon: <Settings className="w-4 h-4" /> },
    { id: 'troubleshooting', name: 'Troubleshooting', icon: <AlertTriangle className="w-4 h-4" /> }
  ]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 h-full w-96 bg-white shadow-large border-l border-secondary-200 z-50 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getTypeIcon(component.type)}
              <div>
                <h2 className="text-lg font-semibold">{component.name}</h2>
                <p className="text-primary-100 text-sm">
                  {component.type} • Port {component.port}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {getStatusIcon(component.status)}
              <span className="text-sm capitalize">{component.status}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                component.category === 'core' ? 'bg-primary-500' :
                component.category === 'production' ? 'bg-accent-500' :
                component.category === 'enterprise' ? 'bg-success-500' :
                component.category === 'infrastructure' ? 'bg-warning-500' :
                'bg-secondary-500'
              }`} />
              <span className="text-sm capitalize">{component.category}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Tabs */}
          <div className="border-b border-secondary-200">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                      : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Description */}
                    <div>
                      <h3 className="text-lg font-semibold text-secondary-900 mb-2">Description</h3>
                      <p className="text-secondary-700 leading-relaxed">
                        {component.longDescription}
                      </p>
                    </div>

                    {/* Features */}
                    <div>
                      <h3 className="text-lg font-semibold text-secondary-900 mb-3">Key Features</h3>
                      <div className="grid grid-cols-1 gap-2">
                        {component.features.map((feature, index) => (
                          <div key={index} className="flex items-start space-x-2">
                            <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
                            <span className="text-secondary-700 text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Technologies */}
                    <div>
                      <h3 className="text-lg font-semibold text-secondary-900 mb-3">Technologies</h3>
                      <div className="flex flex-wrap gap-2">
                        {component.technologies.map((tech, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-secondary-100 text-secondary-700 text-sm rounded-full"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Dependencies */}
                    {component.dependencies.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-secondary-900 mb-3">Dependencies</h3>
                        <div className="flex flex-wrap gap-2">
                          {component.dependencies.map((dep, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-warning-100 text-warning-700 text-sm rounded-full"
                            >
                              {dep}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metrics */}
                    {component.metrics && (
                      <div>
                        <h3 className="text-lg font-semibold text-secondary-900 mb-3">Performance Metrics</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {component.metrics.requestsPerSecond && (
                            <div className="bg-secondary-50 rounded-lg p-3">
                              <div className="text-2xl font-bold text-secondary-900">
                                {component.metrics.requestsPerSecond.toLocaleString()}
                              </div>
                              <div className="text-xs text-secondary-600">Requests/sec</div>
                            </div>
                          )}
                          {component.metrics.responseTime && (
                            <div className="bg-secondary-50 rounded-lg p-3">
                              <div className="text-2xl font-bold text-secondary-900">
                                {component.metrics.responseTime}ms
                              </div>
                              <div className="text-xs text-secondary-600">Avg Response</div>
                            </div>
                          )}
                          {component.metrics.errorRate && (
                            <div className="bg-secondary-50 rounded-lg p-3">
                              <div className={`text-2xl font-bold ${
                                component.metrics.errorRate < 1 ? 'text-success-600' : 
                                component.metrics.errorRate < 5 ? 'text-warning-600' : 'text-error-600'
                              }`}>
                                {component.metrics.errorRate}%
                              </div>
                              <div className="text-xs text-secondary-600">Error Rate</div>
                            </div>
                          )}
                          {component.metrics.cpuUsage && (
                            <div className="bg-secondary-50 rounded-lg p-3">
                              <div className="text-2xl font-bold text-secondary-900">
                                {component.metrics.cpuUsage}%
                              </div>
                              <div className="text-xs text-secondary-600">CPU Usage</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'api' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-secondary-900 mb-2">API Documentation</h3>
                      <ReactMarkdown
                        className="prose prose-sm max-w-none"
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '')
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={tomorrow}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            )
                          }
                        }}
                      >
                        {component.documentation.api || 'API documentation not available.'}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {activeTab === 'config' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-secondary-900 mb-2">Configuration</h3>
                      <ReactMarkdown
                        className="prose prose-sm max-w-none"
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '')
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={tomorrow}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            )
                          }
                        }}
                      >
                        {component.documentation.configuration || 'Configuration documentation not available.'}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {activeTab === 'troubleshooting' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-secondary-900 mb-2">Troubleshooting</h3>
                      <ReactMarkdown
                        className="prose prose-sm max-w-none"
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '')
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={tomorrow}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            )
                          }
                        }}
                      >
                        {component.documentation.troubleshooting || 'Troubleshooting guide not available.'}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ComponentDetails 