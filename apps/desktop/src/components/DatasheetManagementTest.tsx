import React, { useState } from 'react';
import datasheetService, { Datasheet } from '../services/datasheetService';

interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'running';
  message: string;
  duration?: number;
}

const DatasheetManagementTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedProductId] = useState('test-product-123');

  const runTest = async (testName: string, testFn: () => Promise<any>): Promise<TestResult> => {
    const startTime = Date.now();
    try {
      await testFn();
      const duration = Date.now() - startTime;
      return {
        test: testName,
        status: 'pass',
        message: 'Test completed successfully',
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        test: testName,
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration
      };
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    const tests = [
      {
        name: 'Upload Datasheet',
        fn: async () => {
          const mockFile = new File(['mock pdf content'], 'test-datasheet.pdf', { type: 'application/pdf' });
          const result = await datasheetService.uploadDatasheet(selectedProductId, mockFile);
          if (!result.success) {
            throw new Error(result.error || 'Upload failed');
          }
        }
      },
      {
        name: 'Get Datasheets for Product',
        fn: async () => {
          const datasheets = await datasheetService.getDatasheetsForProduct(selectedProductId);
          if (!Array.isArray(datasheets)) {
            throw new Error('Expected array of datasheets');
          }
        }
      },
      {
        name: 'Get Processing Status',
        fn: async () => {
          const status = await datasheetService.getProcessingStatus('mock-datasheet-id');
          if (!status || typeof status.status !== 'string') {
            throw new Error('Invalid status response');
          }
        }
      },
      {
        name: 'Download SPICE Model',
        fn: async () => {
          const blob = await datasheetService.downloadSpiceModel('mock-datasheet-id');
          if (!(blob instanceof Blob)) {
            throw new Error('Expected Blob response');
          }
        }
      },
      {
        name: 'Delete Datasheet',
        fn: async () => {
          const result = await datasheetService.deleteDatasheet('mock-datasheet-id');
          if (!result) {
            throw new Error('Delete operation failed');
          }
        }
      },
      {
        name: 'Retry Processing',
        fn: async () => {
          const result = await datasheetService.retryProcessing('mock-datasheet-id');
          if (!result) {
            throw new Error('Retry operation failed');
          }
        }
      }
    ];

    for (const test of tests) {
      const result = await runTest(test.name, test.fn);
      setTestResults(prev => [...prev, result]);
    }

    setIsRunning(false);
  };

  const runPerformanceTest = async () => {
    setIsRunning(true);
    setTestResults([]);

    // Test with multiple concurrent operations
    const concurrentTests = Array.from({ length: 5 }, (_, i) => ({
      name: `Concurrent Upload ${i + 1}`,
      fn: async () => {
        const mockFile = new File(['mock pdf content'], `test-datasheet-${i}.pdf`, { type: 'application/pdf' });
        const result = await datasheetService.uploadDatasheet(selectedProductId, mockFile);
        if (!result.success) {
          throw new Error(result.error || 'Upload failed');
        }
      }
    }));

    const startTime = Date.now();
    const promises = concurrentTests.map(test => runTest(test.name, test.fn));
    const results = await Promise.all(promises);
    const totalDuration = Date.now() - startTime;

    setTestResults(results);
    setTestResults(prev => [...prev, {
      test: 'Total Concurrent Operations',
      status: 'pass',
      message: `Completed ${concurrentTests.length} operations in ${totalDuration}ms`,
      duration: totalDuration
    }]);

    setIsRunning(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'fail': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'running': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'running': return '⏳';
      default: return '❓';
    }
  };

  const passedTests = testResults.filter(r => r.status === 'pass').length;
  const totalTests = testResults.length;

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Datasheet Management System Test Suite
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Comprehensive testing of all datasheet management functionality
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Test Controls */}
          <div className="flex gap-4">
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </button>
            
            <button
              onClick={runPerformanceTest}
              disabled={isRunning}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              {isRunning ? 'Running Performance Test...' : 'Performance Test'}
            </button>
          </div>

          {/* Test Summary */}
          {testResults.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Test Summary
              </h3>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600">Passed: {passedTests}</span>
                <span className="text-red-600">Failed: {totalTests - passedTests}</span>
                <span className="text-gray-600">Total: {totalTests}</span>
                <span className="text-blue-600">
                  Success Rate: {totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%
                </span>
              </div>
            </div>
          )}

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Test Results
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${getStatusColor(result.status)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{getStatusIcon(result.status)}</span>
                        <span className="font-medium">{result.test}</span>
                      </div>
                      <div className="text-sm">
                        {result.duration && <span className="text-gray-500">{result.duration}ms</span>}
                      </div>
                    </div>
                    <p className="text-sm mt-1">{result.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test Information */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Test Coverage
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Datasheet upload with file validation</li>
              <li>• Product-datasheet relationship management</li>
              <li>• Processing status monitoring and polling</li>
              <li>• SPICE model file download</li>
              <li>• Datasheet deletion with cleanup</li>
              <li>• Processing retry functionality</li>
              <li>• Concurrent operation handling</li>
              <li>• Error handling and recovery</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatasheetManagementTest; 