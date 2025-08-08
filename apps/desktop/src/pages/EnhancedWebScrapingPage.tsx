import React, { useState, useEffect, useCallback } from 'react'
import { 
  Search, 
  Download, 
  Database, 
  Filter, 
  Play, 
  Pause, 
  Square,
  RefreshCw,
  FileText,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Info,
  Settings,
  Globe,
  Cpu,
  Zap,
  Shield,
  FileSpreadsheet,
  Upload,
  FolderOpen,
  BarChart3,
  Archive,
  Trash2,
  Save,
  FileDown
} from 'lucide-react'
import { 
  Button,
  Input,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Progress,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Alert,
  AlertDescription,
  AlertTitle,
  Checkbox,
  Label,
  Textarea
} from '@espice/ui'
import modularWebScraperService, { 
  XLSXFile, 
  ProcessedData, 
  StorageStats, 
  DatasheetInfo,
  ProcessingResult,
  BatchDownloadResult
} from '../services/modularWebScraperService'

interface Manufacturer {
  name: string
  display_name: string
  base_url: string
  supported: boolean
}

interface ProcessingJob {
  job_id: string
  manufacturer: string
  file_path: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  created_at: string
  started_at?: string
  completed_at?: string
  total_products: number
  processed_products: number
  errors: string[]
}

const manufacturers: Manufacturer[] = [
  {
    name: 'EPC',
    display_name: 'Efficient Power Conversion (EPC)',
    base_url: 'https://epc-co.com',
    supported: true
  },
  {
    name: 'Infineon',
    display_name: 'Infineon Technologies',
    base_url: 'https://www.infineon.com',
    supported: true
  },
  {
    name: 'Wolfspeed',
    display_name: 'Wolfspeed',
    base_url: 'https://www.wolfspeed.com',
    supported: false
  },
  {
    name: 'Qorvo',
    display_name: 'Qorvo',
    base_url: 'https://www.qorvo.com',
    supported: false
  }
]

const EnhancedWebScrapingPage: React.FC = () => {
  // State management
  const [xlsxFiles, setXlsxFiles] = useState<XLSXFile[]>([])
  const [processedData, setProcessedData] = useState<ProcessedData[]>([])
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null)
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<XLSXFile | null>(null)
  const [processingJobs, setProcessingJobs] = useState<ProcessingJob[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Load data on component mount
  useEffect(() => {
    loadData()
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      const isConnected = await modularWebScraperService.testConnection()
      setConnectionStatus(isConnected ? 'connected' : 'disconnected')
    } catch (error) {
      setConnectionStatus('disconnected')
    }
  }

  const loadData = async () => {
    try {
      // Load XLSX files
      const xlsxResponse = await modularWebScraperService.getAvailableXLSXFiles()
      setXlsxFiles(xlsxResponse.files)

      // Load storage stats
      const statsResponse = await modularWebScraperService.getStorageStats()
      setStorageStats(statsResponse)

      // Load processed data for each manufacturer
      const processedDataPromises = manufacturers
        .filter(m => m.supported)
        .map(async (manufacturer) => {
          try {
            return await modularWebScraperService.getProcessedData(manufacturer.name)
          } catch (error) {
            console.error(`Failed to load processed data for ${manufacturer.name}:`, error)
            return null
          }
        })

      const processedResults = await Promise.all(processedDataPromises)
      setProcessedData(processedResults.filter(Boolean) as ProcessedData[])

    } catch (error) {
      console.error('Failed to load data:', error)
      setError('Failed to load data from the web scraper service')
    }
  }

  const processXLSXFile = async (file: XLSXFile) => {
    if (!file) return

    const job: ProcessingJob = {
      job_id: `job_${Date.now()}`,
      manufacturer: file.manufacturer,
      file_path: file.file_path,
      status: 'pending',
      created_at: new Date().toISOString(),
      total_products: 0,
      processed_products: 0,
      errors: []
    }

    setProcessingJobs(prev => [...prev, job])
    setIsProcessing(true)

    try {
      // Update job status
      setProcessingJobs(prev => prev.map(j => 
        j.job_id === job.job_id 
          ? { ...j, status: 'in_progress', started_at: new Date().toISOString() }
          : j
      ))

      let result: ProcessingResult

      // Process based on manufacturer
      if (file.manufacturer.toLowerCase() === 'epc') {
        result = await modularWebScraperService.processEPCXLSX(file.file_path)
      } else if (file.manufacturer.toLowerCase() === 'infineon') {
        result = await modularWebScraperService.processInfineonXLSX(file.file_path)
      } else {
        result = await modularWebScraperService.processXLSXFile({
          file_path: file.file_path,
          manufacturer: file.manufacturer,
          auto_detect: true
        })
      }

      // Update job status
      setProcessingJobs(prev => prev.map(j => 
        j.job_id === job.job_id 
          ? { 
              ...j, 
              status: 'completed', 
              completed_at: new Date().toISOString(),
              total_products: result.result?.total_products || 0,
              processed_products: result.result?.total_products || 0
            }
          : j
      ))

      setSuccess(`Successfully processed ${file.file_name}`)
      
      // Reload data
      await loadData()

    } catch (error) {
      console.error('Processing failed:', error)
      
      setProcessingJobs(prev => prev.map(j => 
        j.job_id === job.job_id 
          ? { 
              ...j, 
              status: 'failed', 
              completed_at: new Date().toISOString(),
              errors: [error instanceof Error ? error.message : 'Unknown error']
            }
          : j
      ))

      setError(`Failed to process ${file.file_name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const batchDownloadDatasheets = async (manufacturer: string) => {
    setIsDownloading(true)

    try {
      const result = await modularWebScraperService.batchDownloadEPCDatasheets({
        manufacturer: manufacturer,
        include_spice: true,
        use_csv_data: true
      })

      setSuccess(`Successfully downloaded datasheets for ${manufacturer}`)
      
      // Reload data
      await loadData()

    } catch (error) {
      console.error('Batch download failed:', error)
      setError(`Failed to download datasheets: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsDownloading(false)
    }
  }

  const exportData = async (manufacturer: string) => {
    try {
      const result = await modularWebScraperService.exportData({
        manufacturer: manufacturer,
        format: 'json'
      })

      setSuccess(`Successfully exported data for ${manufacturer}`)

    } catch (error) {
      console.error('Export failed:', error)
      setError(`Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const cleanupTempFiles = async () => {
    try {
      await modularWebScraperService.cleanupTempFiles(24)
      setSuccess('Successfully cleaned up temporary files')
    } catch (error) {
      console.error('Cleanup failed:', error)
      setError(`Failed to cleanup files: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const createBackup = async () => {
    try {
      const backupName = `backup_${new Date().toISOString().split('T')[0]}`
      await modularWebScraperService.createBackup(backupName)
      setSuccess('Successfully created backup')
    } catch (error) {
      console.error('Backup failed:', error)
      setError(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'in_progress': return <Clock className="w-4 h-4" />
      case 'failed': return <XCircle className="w-4 h-4" />
      case 'pending': return <Clock className="w-4 h-4" />
      default: return <Info className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Enhanced Web Scraping</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Process XLSX files and manage datasheet downloads with modular architecture
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Badge 
            variant={connectionStatus === 'connected' ? 'default' : 'destructive'}
            className="flex items-center space-x-1"
          >
            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}</span>
          </Badge>
          
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs defaultValue="files" className="space-y-4">
        <TabsList>
          <TabsTrigger value="files">XLSX Files</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="data">Processed Data</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        {/* XLSX Files Tab */}
        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5" />
                <span>Available XLSX Files</span>
              </CardTitle>
              <CardDescription>
                Manage and process XLSX files from different manufacturers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {xlsxFiles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No XLSX files found in the datasheets directory</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Manufacturer</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Modified</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {xlsxFiles.map((file) => (
                      <TableRow key={file.file_path}>
                        <TableCell className="font-medium">{file.file_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{file.manufacturer}</Badge>
                        </TableCell>
                        <TableCell>{modularWebScraperService.formatFileSize(file.file_size)}</TableCell>
                        <TableCell>{modularWebScraperService.formatTimestamp(file.modified_at)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => processXLSXFile(file)}
                              disabled={isProcessing}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Process
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedFile(file)}
                            >
                              <Info className="w-4 h-4 mr-1" />
                              Details
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Processing Tab */}
        <TabsContent value="processing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Cpu className="w-5 h-5" />
                <span>Processing Jobs</span>
              </CardTitle>
              <CardDescription>
                Monitor and manage data processing jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processingJobs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No processing jobs found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {processingJobs.map((job) => (
                    <Card key={job.job_id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(job.status)}
                          <div>
                            <p className="font-medium">{job.manufacturer} - {job.file_path.split('/').pop()}</p>
                            <p className="text-sm text-gray-500">
                              Created: {modularWebScraperService.formatTimestamp(job.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(job.status)}>
                            {job.status.replace('_', ' ')}
                          </Badge>
                          {job.total_products > 0 && (
                            <span className="text-sm text-gray-500">
                              {job.processed_products}/{job.total_products} products
                            </span>
                          )}
                        </div>
                      </div>
                      {job.errors.length > 0 && (
                        <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                          {job.errors.join(', ')}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Processed Data Tab */}
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="w-5 h-5" />
                <span>Processed Data</span>
              </CardTitle>
              <CardDescription>
                View and manage processed data by manufacturer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {processedData.map((data) => (
                  <Card key={data.manufacturer} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">{data.manufacturer}</h3>
                      <Badge variant="outline">{data.total_files} files</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Last Updated:</span>
                        <span>{modularWebScraperService.formatTimestamp(data.timestamp)}</span>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportData(data.manufacturer)}
                        >
                          <FileDown className="w-4 h-4 mr-1" />
                          Export
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => batchDownloadDatasheets(data.manufacturer)}
                          disabled={isDownloading}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Storage Tab */}
        <TabsContent value="storage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Storage Statistics</span>
              </CardTitle>
              <CardDescription>
                Monitor storage usage and file statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {storageStats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{storageStats.stats.total_size_mb} MB</p>
                        <p className="text-sm text-gray-500">Total Storage</p>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">
                          {Object.values(storageStats.stats.manufacturers).reduce((sum, m) => sum + m.file_count, 0)}
                        </p>
                        <p className="text-sm text-gray-500">Total Files</p>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">
                          {Object.keys(storageStats.stats.manufacturers).length}
                        </p>
                        <p className="text-sm text-gray-500">Manufacturers</p>
                      </div>
                    </Card>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium">Storage by Manufacturer</h3>
                    {Object.entries(storageStats.stats.manufacturers).map(([manufacturer, stats]) => (
                      <div key={manufacturer} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="font-medium">{manufacturer}</span>
                        <div className="flex items-center space-x-4 text-sm">
                          <span>{stats.file_count} files</span>
                          <span>{stats.total_size_mb} MB</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No storage statistics available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Maintenance</span>
              </CardTitle>
              <CardDescription>
                System maintenance and cleanup operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <Trash2 className="w-5 h-5 text-orange-500" />
                    <h3 className="font-medium">Cleanup Temporary Files</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">
                    Remove temporary files older than 24 hours to free up storage space.
                  </p>
                  <Button onClick={cleanupTempFiles} variant="outline" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Cleanup
                  </Button>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <Archive className="w-5 h-5 text-blue-500" />
                    <h3 className="font-medium">Create Backup</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">
                    Create a backup of all datasheets and processed data.
                  </p>
                  <Button onClick={createBackup} variant="outline" size="sm">
                    <Archive className="w-4 h-4 mr-2" />
                    Backup
                  </Button>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* File Details Modal */}
      <Modal 
        open={!!selectedFile} 
        onClose={() => setSelectedFile(null)}
        title="File Details"
      >
        {selectedFile && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Detailed information about the selected XLSX file
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>File Name</Label>
                <p className="text-sm font-medium">{selectedFile.file_name}</p>
              </div>
              <div>
                <Label>Manufacturer</Label>
                <p className="text-sm font-medium">{selectedFile.manufacturer}</p>
              </div>
              <div>
                <Label>File Size</Label>
                <p className="text-sm font-medium">{modularWebScraperService.formatFileSize(selectedFile.file_size)}</p>
              </div>
              <div>
                <Label>Modified</Label>
                <p className="text-sm font-medium">{modularWebScraperService.formatTimestamp(selectedFile.modified_at)}</p>
              </div>
            </div>
            <div>
              <Label>File Path</Label>
              <p className="text-sm font-mono bg-gray-100 p-2 rounded">{selectedFile.file_path}</p>
            </div>
            <div className="flex space-x-2 pt-4">
              <Button onClick={() => processXLSXFile(selectedFile)} disabled={isProcessing}>
                <Play className="w-4 h-4 mr-2" />
                Process File
              </Button>
              <Button variant="outline" onClick={() => setSelectedFile(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default EnhancedWebScrapingPage 