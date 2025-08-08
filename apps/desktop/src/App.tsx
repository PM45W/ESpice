import React, { Suspense, lazy, useState, useEffect } from 'react'
import Layout from './components/Layout'
import { LoadingSpinner } from '@espice/ui'
import ErrorBoundary from './components/ErrorBoundary'

// Lazy load pages for better performance
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProductManagementPage = lazy(() => import('./pages/ProductManagementPage'))
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'))
const SPICEGenerationPage = lazy(() => import('./pages/SPICEGenerationPage'))
const GraphExtractionPage = lazy(() => import('./pages/GraphExtractionPage'))
const GraphExtractionResultPage = lazy(() => import('./pages/GraphExtractionResultPage'))
// Removed separate integration pages - now integrated into ProductManagementPage

// Placeholder components for coming soon pages
const ComingSoonPage = ({ title, description }: { title: string; description: string }) => (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </div>
    <div className="text-center py-12">
      <p className="text-gray-600 dark:text-gray-400">{title} page coming soon...</p>
    </div>
  </div>
)

function App() {
  const [extractButton, setExtractButton] = useState<React.ReactNode>(null)
  const [currentPath, setCurrentPath] = useState(window.location.pathname)
  const [serviceStatus, setServiceStatus] = useState<'checking' | 'available' | 'unavailable'>('checking')
  const [serviceError, setServiceError] = useState<string>('')
  const [onServiceRetry, setOnServiceRetry] = useState<(() => void) | undefined>(undefined)

  // Listen for route changes
  useEffect(() => {
    const handleRouteChange = () => {
      setCurrentPath(window.location.pathname)
    }

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleRouteChange)
    
    // Custom event for programmatic navigation
    window.addEventListener('routechange', handleRouteChange)

    return () => {
      window.removeEventListener('popstate', handleRouteChange)
      window.removeEventListener('routechange', handleRouteChange)
    }
  }, [])

  // Simple routing based on current path
  const getCurrentPage = () => {
    // Check for product detail route first
    if (currentPath.match(/^\/products\/.+$/)) {
      return <ProductDetailPage />
    }

    switch (currentPath) {
      case '/graph-extraction':
        return <GraphExtractionPage 
          setExtractButton={setExtractButton}
          setServiceStatus={setServiceStatus}
          setServiceError={setServiceError}
          setOnServiceRetry={setOnServiceRetry}
        />
      case '/graph-extraction/result':
        return <GraphExtractionResultPage />
      case '/product-management':
        return <ProductManagementPage />
      case '/spice-gen':
        return <SPICEGenerationPage />
      case '/settings':
        return <ComingSoonPage 
          title="Settings" 
          description="Configure your ESpice application preferences." 
        />
      default:
        return <DashboardPage />
    }
  }

  return (
    <ErrorBoundary>
      <Layout 
        extractButton={extractButton}
        serviceStatus={serviceStatus}
        serviceError={serviceError}
        onServiceRetry={onServiceRetry}
      >
        <Suspense fallback={<LoadingSpinner />}>
          {getCurrentPage()}
        </Suspense>
      </Layout>
    </ErrorBoundary>
  )
}

export default App
