import { useEffect, useRef, useCallback } from 'react'

interface PerformanceMetrics {
  renderTime: number
  mountTime: number
  updateCount: number
}

export const usePerformanceMonitor = (componentName: string) => {
  const mountTime = useRef<number>(Date.now())
  const renderStartTime = useRef<number>(0)
  const updateCount = useRef<number>(0)
  const metrics = useRef<PerformanceMetrics>({
    renderTime: 0,
    mountTime: 0,
    updateCount: 0
  })

  const startRender = useCallback(() => {
    renderStartTime.current = performance.now()
  }, [])

  const endRender = useCallback(() => {
    const renderTime = performance.now() - renderStartTime.current
    metrics.current.renderTime = renderTime
    metrics.current.updateCount = ++updateCount.current

    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName}:`, {
        renderTime: `${renderTime.toFixed(2)}ms`,
        updateCount: updateCount.current,
        totalTime: `${(Date.now() - mountTime.current).toFixed(2)}ms`
      })
    }

    // Warn if render time is too high
    if (renderTime > 16) { // 60fps threshold
      console.warn(`[Performance] ${componentName} render time (${renderTime.toFixed(2)}ms) exceeds 16ms threshold`)
    }
  }, [componentName])

  useEffect(() => {
    metrics.current.mountTime = Date.now() - mountTime.current
    startRender()
    endRender()

    return () => {
      // Log final metrics on unmount
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${componentName} final metrics:`, metrics.current)
      }
    }
  }, [componentName, startRender, endRender])

  useEffect(() => {
    startRender()
    endRender()
  })

  return {
    metrics: metrics.current,
    startRender,
    endRender
  }
}

export default usePerformanceMonitor 