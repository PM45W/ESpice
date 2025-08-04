import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Menu, 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Play, 
  Pause,
  Info,
  Settings,
  Download,
  Share2
} from 'lucide-react'
import ArchitectureGraph from './components/ArchitectureGraph'
import ComponentDetails from './components/ComponentDetails'
import WorkflowSimulator from './components/WorkflowSimulator'
import { ComponentData } from './types'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedComponent, setSelectedComponent] = useState<ComponentData | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [viewMode, setViewMode] = useState<'architecture' | 'workflow'>('architecture')

  const handleComponentClick = (component: ComponentData) => {
    setSelectedComponent(component)
    setSidebarOpen(true)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
    setSelectedComponent(null)
  }

  const startSimulation = () => {
    setIsSimulating(true)
    setViewMode('workflow')
  }

  const stopSimulation = () => {
    setIsSimulating(false)
    setViewMode('architecture')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">E</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">ESpice Platform</h1>
                <p className="text-sm text-gray-600">Interactive Architecture Explorer</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <button
                onClick={() => setViewMode('architecture')}
                className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'architecture'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Architecture
              </button>
              <button
                onClick={() => setViewMode('workflow')}
                className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'workflow'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Workflow
              </button>
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={isSimulating ? stopSimulation : startSimulation}
                className={`bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 ${
                  isSimulating ? 'bg-red-600 hover:bg-red-700' : ''
                }`}
              >
                {isSimulating ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Stop Simulation</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Start Simulation</span>
                  </>
                )}
              </button>
              
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-all duration-200 border border-gray-200">
                <Download className="w-4 h-4" />
              </button>
              
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-all duration-200 border border-gray-200">
                <Share2 className="w-4 h-4" />
              </button>
              
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-all duration-200 border border-gray-200">
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-all duration-200 border border-gray-200"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative" style={{ height: 'calc(100vh - 4rem)' }}>
        {/* Architecture Graph */}
        <div className="w-full h-full" style={{ width: '100%', height: '100%' }}>
          {viewMode === 'architecture' ? (
            <ArchitectureGraph onComponentClick={handleComponentClick} />
          ) : (
            <WorkflowSimulator isSimulating={isSimulating} />
          )}
        </div>

        {/* Floating Info Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-6 left-6 bg-white rounded-xl shadow-lg border border-gray-100 p-6 max-w-sm"
        >
          <div className="flex items-center space-x-2 mb-2">
            <Info className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Quick Tips</h3>
          </div>
          <p className="text-sm text-gray-600">
            {viewMode === 'architecture' 
              ? "Click on any component to see detailed information. Use mouse wheel to zoom, drag to pan."
              : "Watch the data flow through the system as a datasheet is processed."
            }
          </p>
        </motion.div>

        {/* Zoom Controls - Only show in architecture mode */}
        {viewMode === 'architecture' && (
          <div className="absolute bottom-6 right-6 flex flex-col space-y-2 z-40">
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 border border-gray-200 shadow-lg">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 border border-gray-200 shadow-lg">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 border border-gray-200 shadow-lg">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>

      {/* Sidebar for Component Details */}
      <AnimatePresence>
        {sidebarOpen && selectedComponent && (
          <ComponentDetails
            component={selectedComponent}
            onClose={closeSidebar}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default App 