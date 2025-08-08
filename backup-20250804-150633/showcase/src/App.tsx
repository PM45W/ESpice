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
  Share2,
  Home,
  Layers,
  Workflow,
  Code,
  Users,
  Mail,
  ChevronRight,
  Star,
  Zap,
  Globe,
  Database,
  Server,
  Cpu,
  Shield,
  Activity,
  TrendingUp,
  DollarSign,
  Target,
  Award,
  CheckCircle,
  BarChart3,
  PieChart,
  LineChart,
  ArrowRight,
  ExternalLink,
  GitBranch,
  Cloud,
  Lock,
  Clock,
  FileText,
  Settings2,
  Monitor,
  Smartphone,
  Laptop
} from 'lucide-react'
import ArchitectureGraph from './components/ArchitectureGraph'
import ComponentDetails from './components/ComponentDetails'
import { ComponentData } from './types'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedComponent, setSelectedComponent] = useState<ComponentData | null>(null)
  const [currentSection, setCurrentSection] = useState<'home' | 'architecture' | 'features' | 'tech-stack' | 'business' | 'roadmap'>('home')

  const handleComponentClick = (component: ComponentData) => {
    setSelectedComponent(component)
    setSidebarOpen(true)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
    setSelectedComponent(null)
  }

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200">
      {/* Header */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="glass-effect sticky top-0 z-50 border-b border-gray-200/30"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <motion.div 
              className="flex items-center space-x-3"
              whileHover={{ scale: 1.02 }}
            >
              <motion.div 
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                whileHover={{ rotate: 5, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <img src="/assets/logo.svg" alt="ESpice Logo" className="w-8 h-8" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold gradient-text">ESpice</h1>
                <p className="text-sm text-soft">SPICE Model Generator</p>
              </div>
            </motion.div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-2">
              {[
                { id: 'home', label: 'Overview', icon: Home },
                { id: 'architecture', label: 'Architecture', icon: Layers },
                { id: 'features', label: 'Features', icon: Code },
                { id: 'tech-stack', label: 'Tech', icon: Server },
                { id: 'business', label: 'Business', icon: TrendingUp },
                { id: 'roadmap', label: 'Roadmap', icon: Target }
              ].map((item) => (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentSection(item.id as any)}
                  className={`nav-item nav-text-safe ${
                    currentSection === item.id ? 'active' : ''
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </motion.button>
              ))}
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <motion.button 
                className="btn-primary flex items-center space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </motion.button>
              
              <motion.button 
                className="btn-ghost"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Share2 className="w-4 h-4" />
              </motion.button>
              
              <motion.button 
                className="btn-ghost"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Settings className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Mobile menu button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden btn-ghost"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1 relative container-safe">
        <AnimatePresence mode="wait">
          {currentSection === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              {/* Hero Section */}
              <section className="py-20 px-4 relative overflow-hidden hero-gradient">
                <div className="max-w-7xl mx-auto text-center relative z-10">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="mb-8"
                  >
                    <div className="inline-flex items-center space-x-2 bg-emerald-100/80 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-emerald-200/60">
                      <Star className="w-4 h-4" />
                      <span>Trusted by 1000+ Engineers</span>
                    </div>
                  </motion.div>
                  
                  <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="text-4xl md:text-6xl lg:text-7xl font-bold gradient-text mb-6 leading-tight text-wrap-safe"
                  >
                    AI-Powered SPICE
                    <br />
                    Model Generation
                  </motion.h1>
                  
                  <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="text-lg md:text-xl text-soft mb-8 max-w-3xl mx-auto leading-relaxed text-wrap-safe"
                  >
                    Transform datasheets into accurate SPICE models. 
                    Support for TSMC, GlobalFoundries, and Samsung.
                  </motion.p>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
                  >
                    <motion.button 
                      className="btn-primary text-base md:text-lg px-6 md:px-8 py-3 md:py-4 flex items-center justify-center space-x-2 btn-text-safe"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Download className="w-4 h-4 md:w-5 md:h-5" />
                      <span>Download for Free</span>
                    </motion.button>
                    <motion.button 
                      onClick={() => setCurrentSection('architecture')}
                      className="btn-secondary text-base md:text-lg px-6 md:px-8 py-3 md:py-4 flex items-center justify-center space-x-2 btn-text-safe"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Layers className="w-4 h-4 md:w-5 md:h-5" />
                      <span>Explore Architecture</span>
                      <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                    </motion.button>
                  </motion.div>

                  {/* Stats */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                    className="stats-grid"
                  >
                    {[
                      { label: 'Models', value: '10K+', icon: Code },
                      { label: 'Foundries', value: '15+', icon: Users },
                      { label: 'Speed', value: '5x', icon: Zap }
                    ].map((stat, index) => (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 + index * 0.1, duration: 0.6 }}
                        className="stat-card"
                      >
                        <div className="stat-icon">
                          <stat.icon className="w-6 h-6 md:w-8 md:h-8" />
                        </div>
                        <div className="stat-value stat-text-safe">{stat.value}</div>
                        <div className="stat-label stat-text-safe">{stat.label}</div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </section>

              {/* Market Opportunity Section */}
              <section className="py-20 px-4 bg-white/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                  >
                    <h2 className="text-4xl font-bold gradient-text mb-6">
                      Market
                    </h2>
                    <p className="text-xl text-soft max-w-3xl mx-auto">
                      Semiconductor industry growth with increasing demand for SPICE models.
                    </p>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    {[
                      {
                        icon: TrendingUp,
                        title: '$500B Market',
                        description: 'Global semiconductor market',
                        metric: '8.4% CAGR'
                      },
                      {
                        icon: Users,
                        title: '2M Engineers',
                        description: 'Design engineers worldwide',
                        metric: '2M+'
                      },
                      {
                        icon: DollarSign,
                        title: '$50K Savings',
                        description: 'Per project savings',
                        metric: '$50K+'
                      }
                    ].map((item, index) => (
                      <motion.div
                        key={item.title}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.6 }}
                        viewport={{ once: true }}
                        className="card-hover text-center"
                      >
                        <div className="w-16 h-16 bg-emerald-100/80 rounded-xl flex items-center justify-center mb-6 mx-auto text-emerald-600">
                          <item.icon className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h3>
                        <p className="text-soft mb-4">{item.description}</p>
                        <div className="text-3xl font-bold text-emerald-600">{item.metric}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Competitive Advantage Section */}
              <section className="py-20 px-4 bg-gradient-to-r from-emerald-50 to-teal-50">
                <div className="max-w-7xl mx-auto">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                  >
                    <h2 className="text-4xl font-bold gradient-text mb-6">
                      Advantage
                    </h2>
                    <p className="text-xl text-soft max-w-3xl mx-auto">
                      What sets ESpice apart in semiconductor modeling.
                    </p>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[
                      {
                        icon: Zap,
                        title: '5x Faster Processing',
                        description: 'Advanced AI algorithms and microservices architecture enable processing speeds 5x faster than traditional methods.',
                        features: ['Parallel processing', 'AI optimization', 'Microservices']
                      },
                      {
                        icon: Target,
                        title: '99.5% Accuracy',
                        description: 'Industry-leading accuracy through advanced validation algorithms and foundry-specific optimizations.',
                        features: ['Multi-foundry validation', 'Silicon correlation', 'Quality metrics']
                      },
                      {
                        icon: Globe,
                        title: '15+ Foundry Support',
                        description: 'Comprehensive support for major foundries including TSMC, GlobalFoundries, Samsung, UMC, and SMIC.',
                        features: ['PDK compatibility', 'Process validation', 'Model verification']
                      },
                      {
                        icon: Shield,
                        title: 'Enterprise Security',
                        description: 'Bank-grade security with local processing, encryption, and compliance with industry standards.',
                        features: ['Local processing', 'AES-256 encryption', 'SOC 2 compliance']
                      }
                    ].map((advantage, index) => (
                      <motion.div
                        key={advantage.title}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.6 }}
                        viewport={{ once: true }}
                        className="card-hover"
                      >
                        <div className="w-12 h-12 bg-emerald-100/80 rounded-xl flex items-center justify-center mb-6 text-emerald-600">
                          <advantage.icon className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">{advantage.title}</h3>
                        <p className="text-soft mb-4">{advantage.description}</p>
                        <ul className="space-y-2">
                          {advantage.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center space-x-2 text-sm text-muted">
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {currentSection === 'architecture' && (
            <motion.div
              key="architecture"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-screen"
            >
              <ArchitectureGraph onComponentClick={handleComponentClick} />
            </motion.div>
          )}

          {currentSection === 'features' && (
            <motion.div
              key="features"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full py-20 px-4"
            >
              <div className="max-w-7xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="text-center mb-16"
                >
                  <h2 className="text-4xl font-bold gradient-text mb-6">
                    Features
                  </h2>
                  <p className="text-xl text-soft max-w-3xl mx-auto">
                    Tools for semiconductor SPICE model generation.
                  </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[
                    {
                      icon: FileText,
                      title: 'PDF Processing',
                      description: 'OCR text extraction from datasheets with 99.5% accuracy.',
                      features: ['OCR extraction', 'Table detection', 'Metadata', 'Multi-page'],
                      status: 'Production Ready'
                    },
                    {
                      icon: BarChart3,
                      title: 'Curve Extraction',
                      description: 'AI-powered I-V curve extraction from datasheet graphs.',
                      features: ['I-V curves', 'Coordinates', 'Data points', 'Multi-curve'],
                      status: 'Production Ready'
                    },
                    {
                      icon: Code,
                      title: 'SPICE Models',
                      description: 'Generate ASM-HEMT, MVSG, and MOSFET models.',
                      features: ['ASM-HEMT', 'MVSG', 'Optimization', 'Validation'],
                      status: 'Production Ready'
                    },
                    {
                      icon: Database,
                      title: 'Parameters',
                      description: 'Parameter storage, editing, and validation system.',
                      features: ['CRUD ops', 'Validation', 'Filtering', 'Export'],
                      status: 'Production Ready'
                    },
                    {
                      icon: Users,
                      title: 'Batch Processing',
                      description: 'Process multiple datasheets with progress tracking.',
                      features: ['Queue mgmt', 'Progress', 'Error handling', 'Export'],
                      status: 'Production Ready'
                    },
                    {
                      icon: Shield,
                      title: 'Foundry Support',
                      description: 'Validate models against major foundry PDKs.',
                      features: ['TSMC', 'GlobalFoundries', 'Samsung', 'EDA'],
                      status: 'Production Ready'
                    }
                  ].map((feature, index) => (
                                          <motion.div
                        key={feature.title}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.6 }}
                        viewport={{ once: true }}
                        className="card-hover relative card-content-safe"
                      >
                      <div className="absolute top-4 right-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          {feature.status}
                        </span>
                      </div>
                      <div className="w-12 h-12 bg-emerald-100/80 rounded-xl flex items-center justify-center mb-6 text-emerald-600">
                        <feature.icon className="w-6 h-6" />
                      </div>
                                              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 text-overflow-safe">{feature.title}</h3>
                        <p className="text-soft mb-4 text-wrap-safe">{feature.description}</p>
                      <ul className="space-y-2">
                        {feature.features.map((item, idx) => (
                          <li key={idx} className="flex items-center space-x-2 text-sm text-muted">
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {currentSection === 'tech-stack' && (
            <motion.div
              key="tech-stack"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full py-20 px-4"
            >
              <div className="max-w-7xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="text-center mb-16"
                >
                  <h2 className="text-4xl font-bold gradient-text mb-6">
                    Tech Stack
                  </h2>
                  <p className="text-xl text-soft max-w-3xl mx-auto">
                    Modern architecture with industry-leading technologies.
                  </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Frontend Stack */}
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="card-hover"
                  >
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Monitor className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">Frontend</h3>
                    </div>
                    <div className="space-y-4">
                      {[
                        { name: 'React 18.3.1', description: 'Modern UI framework' },
                        { name: 'TypeScript 5.6.2', description: 'Type-safe development' },
                        { name: 'Tauri 2.0', description: 'Cross-platform desktop' },
                        { name: 'Vite 6.0.3', description: 'Fast build tool' },
                        { name: 'Lucide React', description: 'Icon library' },
                        { name: 'Framer Motion', description: 'Animations' }
                      ].map((tech, index) => (
                        <div key={tech.name} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{tech.name}</h4>
                            <p className="text-sm text-soft">{tech.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Backend Stack */}
                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="card-hover"
                  >
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Server className="w-5 h-5 text-green-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">Backend & Services</h3>
                    </div>
                    <div className="space-y-4">
                      {[
                        { name: 'Rust 2021', description: 'High-performance systems' },
                        { name: 'Python FastAPI', description: 'Async web framework' },
                        { name: 'PostgreSQL + Redis', description: 'Database + caching' },
                        { name: 'Docker + Kubernetes', description: 'Containerization' },
                        { name: 'OpenCV + Tesseract', description: 'Computer vision + OCR' },
                        { name: 'MCP Protocol', description: 'AI agent communication' }
                      ].map((tech, index) => (
                        <div key={tech.name} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{tech.name}</h4>
                            <p className="text-sm text-soft">{tech.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Infrastructure Stack */}
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    viewport={{ once: true }}
                    className="card-hover"
                  >
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Cloud className="w-5 h-5 text-purple-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">Infrastructure</h3>
                    </div>
                    <div className="space-y-4">
                      {[
                        { name: 'Railway/Render', description: 'Cloud hosting with auto-scaling capabilities' },
                        { name: 'GitHub Actions', description: 'CI/CD pipeline with automated testing' },
                        { name: 'Prometheus + Grafana', description: 'Monitoring and observability stack' },
                        { name: 'ELK Stack', description: 'Log aggregation and analysis' },
                        { name: 'Traefik', description: 'Reverse proxy and load balancer' },
                        { name: 'Let\'s Encrypt', description: 'SSL certificate management' }
                      ].map((tech, index) => (
                        <div key={tech.name} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{tech.name}</h4>
                            <p className="text-sm text-soft">{tech.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* AI/ML Stack */}
                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    viewport={{ once: true }}
                    className="card-hover"
                  >
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Cpu className="w-5 h-5 text-orange-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">AI/ML & Processing</h3>
                    </div>
                    <div className="space-y-4">
                      {[
                        { name: 'PyTorch/TensorFlow', description: 'Deep learning frameworks for curve extraction' },
                        { name: 'NumPy + SciPy', description: 'Scientific computing and optimization' },
                        { name: 'Ollama', description: 'Local LLM for natural language processing' },
                        { name: 'OpenCV', description: 'Computer vision for image processing' },
                        { name: 'Tesseract OCR', description: 'Optical character recognition' },
                        { name: 'SPICE Engines', description: 'Circuit simulation and validation' }
                      ].map((tech, index) => (
                        <div key={tech.name} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{tech.name}</h4>
                            <p className="text-sm text-soft">{tech.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {currentSection === 'business' && (
            <motion.div
              key="business"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full py-20 px-4"
            >
              <div className="max-w-7xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="text-center mb-16"
                >
                  <h2 className="text-4xl font-bold gradient-text mb-6">
                    Business
                  </h2>
                  <p className="text-xl text-soft max-w-3xl mx-auto">
                    Scalable revenue model with strong growth potential.
                  </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                  {[
                    {
                      icon: DollarSign,
                      title: 'Revenue Model',
                      description: 'SaaS subscription with enterprise licensing',
                      metrics: [
                        { label: 'Pro Plan', value: '$99/month' },
                        { label: 'Enterprise', value: '$999/month' },
                        { label: 'Custom', value: 'Contact Sales' }
                      ]
                    },
                    {
                      icon: TrendingUp,
                      title: 'Growth Metrics',
                      description: 'Strong traction and market validation',
                      metrics: [
                        { label: 'MRR Growth', value: '25% MoM' },
                        { label: 'Churn Rate', value: '<2%' },
                        { label: 'LTV/CAC', value: '8.5x' }
                      ]
                    },
                    {
                      icon: Users,
                      title: 'Customer Metrics',
                      description: 'Growing user base with high engagement',
                      metrics: [
                        { label: 'Active Users', value: '1,000+' },
                        { label: 'Enterprise', value: '50+' },
                        { label: 'NPS Score', value: '85' }
                      ]
                    }
                  ].map((section, index) => (
                    <motion.div
                      key={section.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.6 }}
                      viewport={{ once: true }}
                      className="card-hover"
                    >
                      <div className="w-12 h-12 bg-emerald-100/80 rounded-xl flex items-center justify-center mb-6 text-emerald-600">
                        <section.icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{section.title}</h3>
                      <p className="text-soft mb-6">{section.description}</p>
                      <div className="space-y-3">
                        {section.metrics.map((metric, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-sm text-soft">{metric.label}</span>
                            <span className="font-bold text-gray-900">{metric.value}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Competitive Analysis */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                  className="card-hover mb-16"
                >
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Competitive Advantage</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">ESpice Advantages</h4>
                      <ul className="space-y-3">
                        {[
                          '5x faster processing speed',
                          '99.5% accuracy rate',
                          '15+ foundry support',
                          'Local processing for security',
                          'AI-powered automation',
                          'Enterprise-grade security'
                        ].map((advantage, index) => (
                          <li key={index} className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span className="text-soft">{advantage}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Market Position</h4>
                      <div className="space-y-4">
                        {[
                          { competitor: 'Traditional Tools', advantage: 'Manual process, slow, expensive' },
                          { competitor: 'Basic OCR Tools', advantage: 'Low accuracy, no SPICE generation' },
                          { competitor: 'Cloud Solutions', advantage: 'Security concerns, data privacy' }
                        ].map((item, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <div className="font-semibold text-gray-900">{item.competitor}</div>
                            <div className="text-sm text-soft">{item.advantage}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {currentSection === 'roadmap' && (
            <motion.div
              key="roadmap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full py-20 px-4"
            >
              <div className="max-w-7xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="text-center mb-16"
                >
                  <h2 className="text-4xl font-bold gradient-text mb-6">
                    Product Roadmap
                  </h2>
                  <p className="text-xl text-soft max-w-3xl mx-auto">
                    Strategic development plan aligned with market needs and customer feedback.
                  </p>
                </motion.div>

                <div className="space-y-12">
                  {[
                    {
                      quarter: 'Q4 2024',
                      title: 'Foundation & Core Features',
                      status: 'Completed',
                      color: 'emerald',
                      items: [
                        'Desktop application with Tauri',
                        'PDF processing and text extraction',
                        'Basic SPICE model generation',
                        'Parameter management system'
                      ]
                    },
                    {
                      quarter: 'Q1 2025',
                      title: 'AI Integration & Automation',
                      status: 'Completed',
                      color: 'emerald',
                      items: [
                        'MCP server implementation',
                        'AI-powered curve extraction',
                        'Automated parameter mapping',
                        'Batch processing capabilities'
                      ]
                    },
                    {
                      quarter: 'Q2 2025',
                      title: 'Enterprise Features',
                      status: 'In Progress',
                      color: 'blue',
                      items: [
                        'Foundry PDK compatibility',
                        'Advanced validation algorithms',
                        'Enterprise security features',
                        'Multi-user support'
                      ]
                    },
                    {
                      quarter: 'Q3 2025',
                      title: 'Scale & Optimization',
                      status: 'Planned',
                      color: 'gray',
                      items: [
                        'Performance optimization',
                        'Advanced analytics dashboard',
                        'API marketplace',
                        'Mobile application'
                      ]
                    },
                    {
                      quarter: 'Q4 2025',
                      title: 'Commercial Launch',
                      status: 'Planned',
                      color: 'gray',
                      items: [
                        'Full commercial deployment',
                        'Customer onboarding system',
                        'Support infrastructure',
                        'Partnership programs'
                      ]
                    }
                  ].map((phase, index) => (
                    <motion.div
                      key={phase.quarter}
                      initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.6 }}
                      viewport={{ once: true }}
                      className="card-hover"
                    >
                      <div className="flex items-start space-x-6">
                        <div className="flex-shrink-0">
                          <div className={`w-16 h-16 rounded-xl flex items-center justify-center bg-${phase.color}-100`}>
                            <span className={`text-${phase.color}-600 font-bold text-lg`}>
                              {phase.quarter.split(' ')[1]}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <h3 className="text-xl font-bold text-gray-900">{phase.title}</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${phase.color}-100 text-${phase.color}-800`}>
                              {phase.status}
                            </span>
                          </div>
                          <ul className="space-y-2">
                            {phase.items.map((item, idx) => (
                              <li key={idx} className="flex items-center space-x-2 text-soft">
                                <div className={`w-1.5 h-1.5 bg-${phase.color}-400 rounded-full`}></div>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Sidebar for Component Details */}
      <AnimatePresence>
        {sidebarOpen && selectedComponent && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-96 bg-white/95 backdrop-blur-md shadow-2xl border-l border-gray-200/60 z-50"
          >
            <ComponentDetails 
              component={selectedComponent} 
              onClose={closeSidebar}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            onClick={closeSidebar}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default App 