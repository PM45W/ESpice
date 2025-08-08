import React, { useState, useEffect } from 'react';

interface PerformanceMetrics {
  fileSize: number;
  uploadTime: number;
  processingTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface OptimizationRecommendation {
  category: string;
  issue: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
  impact: string;
}

const PerformanceOptimizer: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState('');

  // Generate test files of different sizes
  const generateTestFile = (sizeInMB: number): File => {
    const sizeInBytes = sizeInMB * 1024 * 1024;
    const content = 'A'.repeat(sizeInBytes);
    return new File([content], `test-${sizeInMB}MB.pdf`, { type: 'application/pdf' });
  };

  // Simulate performance monitoring
  const getPerformanceMetrics = (): { memoryUsage: number; cpuUsage: number } => {
    // Mock performance metrics - in real implementation, use performance API
    return {
      memoryUsage: Math.random() * 100, // Mock memory usage percentage
      cpuUsage: Math.random() * 50 // Mock CPU usage percentage
    };
  };

  const runPerformanceTest = async (fileSizeMB: number) => {
    const file = generateTestFile(fileSizeMB);
    const startTime = Date.now();
    
    // Simulate upload
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
    const uploadTime = Date.now() - startTime;
    
    // Simulate processing
    const processingStart = Date.now();
    await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 1000));
    const processingTime = Date.now() - processingStart;
    
    const perfMetrics = getPerformanceMetrics();
    
    return {
      fileSize: fileSizeMB,
      uploadTime,
      processingTime,
      memoryUsage: perfMetrics.memoryUsage,
      cpuUsage: perfMetrics.cpuUsage
    };
  };

  const runComprehensiveTest = async () => {
    setIsRunning(true);
    setMetrics([]);
    setRecommendations([]);

    const testSizes = [1, 5, 10, 25, 50, 100]; // MB
    const results: PerformanceMetrics[] = [];

    for (const size of testSizes) {
      setCurrentTest(`Testing ${size}MB file...`);
      const result = await runPerformanceTest(size);
      results.push(result);
      setMetrics(prev => [...prev, result]);
    }

    // Analyze results and generate recommendations
    const newRecommendations = analyzePerformance(results);
    setRecommendations(newRecommendations);

    setIsRunning(false);
    setCurrentTest('');
  };

  const analyzePerformance = (results: PerformanceMetrics[]): OptimizationRecommendation[] => {
    const recommendations: OptimizationRecommendation[] = [];

    // Analyze upload performance
    const avgUploadTime = results.reduce((sum, r) => sum + r.uploadTime, 0) / results.length;
    if (avgUploadTime > 3000) {
      recommendations.push({
        category: 'Upload Performance',
        issue: 'Slow upload times detected',
        recommendation: 'Implement chunked uploads and progress tracking',
        priority: 'high',
        impact: 'Improves user experience for large files'
      });
    }

    // Analyze processing performance
    const avgProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
    if (avgProcessingTime > 8000) {
      recommendations.push({
        category: 'Processing Performance',
        issue: 'Long processing times for large files',
        recommendation: 'Implement background processing and status updates',
        priority: 'high',
        impact: 'Reduces perceived wait time'
      });
    }

    // Analyze memory usage
    const maxMemoryUsage = Math.max(...results.map(r => r.memoryUsage));
    if (maxMemoryUsage > 80) {
      recommendations.push({
        category: 'Memory Management',
        issue: 'High memory usage detected',
        recommendation: 'Implement file streaming and memory cleanup',
        priority: 'medium',
        impact: 'Prevents memory leaks and improves stability'
      });
    }

    // Analyze CPU usage
    const avgCpuUsage = results.reduce((sum, r) => sum + r.cpuUsage, 0) / results.length;
    if (avgCpuUsage > 30) {
      recommendations.push({
        category: 'CPU Optimization',
        issue: 'High CPU usage during processing',
        recommendation: 'Implement worker threads and task queuing',
        priority: 'medium',
        impact: 'Improves system responsiveness'
      });
    }

    // Check for scalability issues
    const largeFileResults = results.filter(r => r.fileSize >= 50);
    if (largeFileResults.length > 0) {
      const largeFileAvgTime = largeFileResults.reduce((sum, r) => sum + r.uploadTime + r.processingTime, 0) / largeFileResults.length;
      if (largeFileAvgTime > 15000) {
        recommendations.push({
          category: 'Scalability',
          issue: 'Poor performance with large files (>50MB)',
          recommendation: 'Implement file compression and parallel processing',
          priority: 'high',
          impact: 'Enables handling of enterprise-scale files'
        });
      }
    }

    return recommendations;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatFileSize = (mb: number) => {
    if (mb < 1024) return `${mb}MB`;
    return `${(mb / 1024).toFixed(1)}GB`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Performance Optimization Suite
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Test and optimize system performance with various file sizes
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Test Controls */}
          <div className="flex gap-4">
            <button
              onClick={runComprehensiveTest}
              disabled={isRunning}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              {isRunning ? 'Running Performance Test...' : 'Run Performance Test'}
            </button>
          </div>

          {/* Current Test Status */}
          {isRunning && currentTest && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-blue-800 dark:text-blue-200">{currentTest}</span>
              </div>
            </div>
          )}

          {/* Performance Metrics */}
          {metrics.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Performance Metrics
              </h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white">File Size</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white">Upload Time</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white">Processing Time</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white">Memory Usage</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white">CPU Usage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {metrics.map((metric, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                          {formatFileSize(metric.fileSize)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                          {formatTime(metric.uploadTime)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                          {formatTime(metric.processingTime)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                          {metric.memoryUsage.toFixed(1)}%
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                          {metric.cpuUsage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Optimization Recommendations */}
          {recommendations.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Optimization Recommendations
              </h3>
              
              <div className="space-y-3">
                {recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${getPriorityColor(rec.priority)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {rec.category}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                        rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {rec.priority.toUpperCase()} PRIORITY
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <p><strong>Issue:</strong> {rec.issue}</p>
                      <p><strong>Recommendation:</strong> {rec.recommendation}</p>
                      <p><strong>Impact:</strong> {rec.impact}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Tips */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
              Performance Best Practices
            </h3>
            <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
              <li>• Use chunked uploads for files larger than 10MB</li>
              <li>• Implement background processing for long-running tasks</li>
              <li>• Add progress indicators for better user experience</li>
              <li>• Use worker threads for CPU-intensive operations</li>
              <li>• Implement proper memory cleanup after file processing</li>
              <li>• Add file size limits and validation</li>
              <li>• Use compression for large files when possible</li>
              <li>• Implement caching for frequently accessed data</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceOptimizer; 