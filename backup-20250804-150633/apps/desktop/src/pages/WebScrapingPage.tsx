import React, { useState, useEffect, useCallback } from 'react'
import { 
  Search, 
  Download, 
  Database, 
  Filter, 
  Play, 
  Pause, 
  Square, // Use Square as a stop icon
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
  Shield
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Progress } from '../components/ui/progress'
import { Separator } from '../components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'
import { 
  Alert,
  AlertDescription,
  AlertTitle,
} from '../components/ui/alert'
import { Checkbox } from '../components/ui/checkbox'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import webScrapingService, { 
  Manufacturer, 
  ProductCategory, 
  ScrapingJob, 
  GaNProduct,
  ScrapingConfig 
} from '../services/webScrapingService'
import '../styles/web-scraping-fixes.css'

// Using interfaces from webScrapingService

const WebScrapingPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [maxProducts, setMaxProducts] = useState(50)
  const [includeDatasheets, setIncludeDatasheets] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<GaNProduct[]>([])
  const [activeJobs, setActiveJobs] = useState<ScrapingJob[]>([])
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [advancedSettings, setAdvancedSettings] = useState({
    delayBetweenRequests: 1.0,
    maxRetries: 3,
    timeout: 30,
    followRedirects: true,
    respectRobotsTxt: true
  })

  // Load data from service
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load manufacturers
        const manufacturersData = await webScrapingService.getManufacturers()
        setManufacturers(manufacturersData || [])
        
        // Load categories
        const categoriesData = await webScrapingService.getCategories()
        setCategories(categoriesData || [])
        
        // Load active jobs
        const jobsData = await webScrapingService.listJobs()
        setActiveJobs(jobsData || [])
        
        // Load existing products
        const productsData = await webScrapingService.getProducts()
        setSearchResults(productsData || [])
      } catch (error) {
        console.error('Failed to load data:', error)
        setError('Failed to load data from the web scraper service')
        // Set default empty arrays to prevent undefined errors
        setManufacturers([])
        setCategories([])
        setActiveJobs([])
        setSearchResults([])
      }
    }
    
    loadData()
  }, [])

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() && !selectedManufacturer) {
      return
    }

    setIsSearching(true)
    
    try {
      const response = await webScrapingService.searchProducts(
        searchQuery,
        selectedManufacturer,
        selectedCategory,
        maxProducts
      )
      
      setSearchResults(response.products)
      setSuccess(`Found ${response.total} products`)
    } catch (error) {
      console.error('Search failed:', error)
      setError('Search failed. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery, selectedManufacturer, selectedCategory, maxProducts])

  const handleStartScraping = useCallback(async () => {
    if (!selectedManufacturer) {
      return
    }

    try {
      const config: ScrapingConfig = {
        manufacturer: selectedManufacturer,
        category: selectedCategory,
        keywords: searchQuery ? [searchQuery] : undefined,
        max_products: maxProducts,
        include_datasheets: includeDatasheets,
        delay_between_requests: advancedSettings.delayBetweenRequests,
        max_retries: advancedSettings.maxRetries,
        timeout: advancedSettings.timeout,
        follow_redirects: advancedSettings.followRedirects,
        respect_robots_txt: advancedSettings.respectRobotsTxt
      }

      const response = await webScrapingService.startScrapingJob(config)
      
      if (response.job_id) {
        setSuccess(`Scraping job started successfully. Job ID: ${response.job_id}`)
        
        // Refresh jobs list
        const jobsData = await webScrapingService.listJobs()
        setActiveJobs(jobsData)
      } else {
        setError('Failed to start scraping job')
      }
    } catch (error) {
      console.error('Failed to start scraping job:', error)
      setError('Failed to start scraping job. Please try again.')
    }
  }, [selectedManufacturer, selectedCategory, searchQuery, maxProducts, includeDatasheets, advancedSettings])

  const handleCancelJob = useCallback(async (jobId: string) => {
    try {
      const success = await webScrapingService.cancelJob(jobId)
      if (success) {
        setSuccess(`Job ${jobId} cancelled successfully`)
        
        // Refresh jobs list
        const jobsData = await webScrapingService.listJobs()
        setActiveJobs(jobsData)
      } else {
        setError('Failed to cancel job')
      }
    } catch (error) {
      console.error('Failed to cancel job:', error)
      setError('Failed to cancel job. Please try again.')
    }
  }, [])

  const handleSelectProduct = useCallback((productId: string, selected: boolean) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(productId)
      } else {
        newSet.delete(productId)
      }
      return newSet
    })
  }, [])

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected && searchResults) {
      setSelectedProducts(new Set(searchResults.map(p => p.product_id)))
    } else {
      setSelectedProducts(new Set())
    }
  }, [searchResults])

  const handleDownloadSelected = useCallback(async () => {
    if (selectedProducts.size === 0) return

    try {
      const productIds = Array.from(selectedProducts)
      const result = await webScrapingService.downloadMultipleDatasheets(productIds)
      
      if (result.success.length > 0) {
        setSuccess(`Successfully downloaded ${result.success.length} datasheets`)
      }
      
      if (result.failed.length > 0) {
        setError(`Failed to download ${result.failed.length} datasheets`)
      }
    } catch (error) {
      console.error('Download failed:', error)
      setError('Failed to download datasheets. Please try again.')
    }
  }, [selectedProducts])

  // Auto-dismiss messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccess(null)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [error, success])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-600 dark:text-emerald-400'
      case 'in_progress': return 'text-blue-600 dark:text-blue-400'
      case 'failed': return 'text-red-600 dark:text-red-400'
      case 'cancelled': return 'text-slate-500 dark:text-slate-400'
      default: return 'text-amber-600 dark:text-amber-400'
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default'
      case 'in_progress': return 'secondary'
      case 'failed': return 'destructive'
      case 'cancelled': return 'outline'
      default: return 'secondary'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'in_progress': return <RefreshCw className="w-4 h-4 animate-spin" />
      case 'failed': return <XCircle className="w-4 h-4" />
      case 'cancelled': return <XCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6 web-scraping-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Web Scraping Tool</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Search and extract datasheets from semiconductor manufacturers
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="default" className="flex items-center space-x-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700">
            <Globe className="w-3 h-3" />
            <span>Online Search</span>
          </Badge>
          <Badge variant="default" className="flex items-center space-x-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700">
            <Database className="w-3 h-3" />
            <span>Auto Extract</span>
          </Badge>
        </div>
      </div>

      {/* Error and Success Messages */}
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

      <Tabs defaultValue="search" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="search">Search & Extract</TabsTrigger>
          <TabsTrigger value="jobs">Active Jobs</TabsTrigger>
          <TabsTrigger value="results">Search Results</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-6">
          {/* Search Configuration */}
          <Card className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-gray-800 border-blue-200 dark:border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="w-5 h-5" />
                <span>Search Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure your search parameters and target manufacturers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search-query">Search Query</Label>
                  <Input
                    id="search-query"
                    placeholder="Enter keywords, part numbers, or specifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Select value={selectedManufacturer} onValueChange={setSelectedManufacturer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select manufacturer" />
                    </SelectTrigger>
                    <SelectContent>
                      {manufacturers && manufacturers.map((mfr) => (
                        <SelectItem key={mfr.name} value={mfr.name} disabled={!mfr.supported}>
                          <div className="flex items-center space-x-2">
                            <span>{mfr.display_name}</span>
                            {!mfr.supported && <Badge variant="secondary" className="text-xs">Coming Soon</Badge>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Product Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories && categories.map((cat) => (
                        <SelectItem key={cat.name} value={cat.name}>
                          {cat.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-products">Max Products</Label>
                  <Input
                    id="max-products"
                    type="number"
                    min="1"
                    max="1000"
                    value={maxProducts}
                    onChange={(e) => setMaxProducts(parseInt(e.target.value) || 50)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-datasheets"
                  checked={includeDatasheets}
                  onCheckedChange={(checked) => setIncludeDatasheets(checked as boolean)}
                />
                <Label htmlFor="include-datasheets">Automatically download datasheets</Label>
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Advanced Settings
                </Button>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedManufacturer('')
                      setSelectedCategory('')
                      setMaxProducts(50)
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    onClick={handleSearch}
                    disabled={isSearching || (!searchQuery.trim() && !selectedManufacturer)}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                  >
                    {isSearching ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Search
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {showAdvancedSettings && (
                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-medium">Advanced Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="delay">Delay Between Requests (seconds)</Label>
                      <Input
                        id="delay"
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="10"
                        value={advancedSettings.delayBetweenRequests}
                        onChange={(e) => setAdvancedSettings(prev => ({
                          ...prev,
                          delayBetweenRequests: parseFloat(e.target.value) || 1.0
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="retries">Max Retries</Label>
                      <Input
                        id="retries"
                        type="number"
                        min="1"
                        max="10"
                        value={advancedSettings.maxRetries}
                        onChange={(e) => setAdvancedSettings(prev => ({
                          ...prev,
                          maxRetries: parseInt(e.target.value) || 3
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timeout">Timeout (seconds)</Label>
                      <Input
                        id="timeout"
                        type="number"
                        min="5"
                        max="120"
                        value={advancedSettings.timeout}
                        onChange={(e) => setAdvancedSettings(prev => ({
                          ...prev,
                          timeout: parseInt(e.target.value) || 30
                        }))}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="follow-redirects"
                        checked={advancedSettings.followRedirects}
                        onCheckedChange={(checked) => setAdvancedSettings(prev => ({
                          ...prev,
                          followRedirects: checked as boolean
                        }))}
                      />
                      <Label htmlFor="follow-redirects">Follow Redirects</Label>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="w-5 h-5" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex flex-col space-y-2"
                  onClick={() => {
                    setSelectedManufacturer('infineon')
                    setSelectedCategory('gan_power')
                    setMaxProducts(100)
                  }}
                >
                  <Cpu className="w-6 h-6" />
                  <span>Infineon GaN Power</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col space-y-2"
                  onClick={() => {
                    setSelectedManufacturer('wolfspeed')
                    setSelectedCategory('gan_power')
                    setMaxProducts(100)
                  }}
                >
                  <Shield className="w-6 h-6" />
                  <span>Wolfspeed SiC/GaN</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col space-y-2"
                  onClick={() => {
                    setSelectedManufacturer('qorvo')
                    setSelectedCategory('gan_rf')
                    setMaxProducts(100)
                  }}
                >
                  <Zap className="w-6 h-6" />
                  <span>Qorvo GaN RF</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Start Scraping */}
          <Card className="bg-gradient-to-br from-white to-emerald-50 dark:from-gray-900 dark:to-gray-800 border-emerald-200 dark:border-gray-600">
            <CardHeader>
              <CardTitle>Start Automated Scraping</CardTitle>
              <CardDescription>
                Begin the automated extraction process for the selected configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {selectedManufacturer ? `Target: ${manufacturers.find(m => m.name === selectedManufacturer)?.display_name}` : 'No manufacturer selected'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedCategory ? `Category: ${categories.find(c => c.name === selectedCategory)?.display_name}` : 'All categories'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Max products: {maxProducts} | Datasheets: {includeDatasheets ? 'Yes' : 'No'}
                  </p>
                </div>
                <Button
                  onClick={handleStartScraping}
                  disabled={!selectedManufacturer}
                  className="min-w-[120px] bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Scraping
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-6">
          {/* Active Jobs */}
          <Card className="bg-gradient-to-br from-white to-green-50 dark:from-gray-900 dark:to-gray-800 border-green-200 dark:border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <RefreshCw className="w-5 h-5" />
                <span>Active Scraping Jobs</span>
              </CardTitle>
              <CardDescription>
                Monitor and manage your automated scraping jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!activeJobs || activeJobs.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No active scraping jobs</p>
                  <p className="text-sm text-gray-400">Start a new scraping job from the Search tab</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeJobs && activeJobs.map((job) => (
                    <div key={job.job_id} className="border rounded-lg p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700 border-green-200 dark:border-gray-600">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(job.status)}
                          <Badge variant={getStatusBadgeVariant(job.status) as any} className={getStatusColor(job.status)}>
                            {job.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex space-x-2">
                          {job.status === 'in_progress' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelJob(job.job_id)}
                            >
                              <Square className="w-4 h-4 mr-1" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Manufacturer</p>
                          <p className="font-medium">{job.manufacturer}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Products Found</p>
                          <p className="font-medium">{job.total_products}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Scraped</p>
                          <p className="font-medium">{job.scraped_products}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Datasheets</p>
                          <p className="font-medium">{job.downloaded_datasheets}</p>
                        </div>
                      </div>

                      {job.status === 'in_progress' && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{Math.round((job.scraped_products / job.total_products) * 100)}%</span>
                          </div>
                          <Progress value={(job.scraped_products / job.total_products) * 100} />
                        </div>
                      )}

                      {job.errors && job.errors.length > 0 && (
                        <Alert className="mt-4">
                          <AlertCircle className="w-4 h-4" />
                          <AlertTitle>Errors</AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc list-inside space-y-1">
                              {job.errors.map((error, index) => (
                                <li key={index} className="text-sm">{error}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {/* Search Results */}
          <Card className="bg-gradient-to-br from-white to-indigo-50 dark:from-gray-900 dark:to-gray-800 border-indigo-200 dark:border-gray-600">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Search Results</span>
                  </CardTitle>
                  <CardDescription>
                    {searchResults ? searchResults.length : 0} products found
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAll(selectedProducts.size < (searchResults ? searchResults.length : 0))}
                  >
                    {selectedProducts.size < (searchResults ? searchResults.length : 0) ? 'Select All' : 'Deselect All'}
                  </Button>
                  <Button
                    size="sm"
                    disabled={selectedProducts.size === 0}
                    onClick={handleDownloadSelected}
                    className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Selected ({selectedProducts.size})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!searchResults || searchResults.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No search results</p>
                  <p className="text-sm text-gray-400">Try adjusting your search criteria</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {searchResults && searchResults.map((product) => (
                    <div key={product.product_id} className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-blue-200 dark:border-gray-600">
                      <div className="flex items-start space-x-4">
                        <Checkbox
                          checked={selectedProducts.has(product.product_id)}
                          onCheckedChange={(checked) => handleSelectProduct(product.product_id, checked as boolean)}
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium text-lg">{product.part_number}</h3>
                              <p className="text-gray-600 dark:text-gray-400">{product.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{product.description}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">{product.manufacturer}</Badge>
                              <Badge variant="secondary">{product.category}</Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            {product.voltage_rating && (
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Voltage Rating</p>
                                <p className="font-medium">{product.voltage_rating}V</p>
                              </div>
                            )}
                            {product.current_rating && (
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Current Rating</p>
                                <p className="font-medium">{product.current_rating}A</p>
                              </div>
                            )}
                            {product.power_rating && (
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Power Rating</p>
                                <p className="font-medium">{product.power_rating}W</p>
                              </div>
                            )}
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Package</p>
                              <p className="font-medium">{product.specifications.Package || 'N/A'}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 mt-4">
                            {product.datasheet_url && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={product.datasheet_url} target="_blank" rel="noopener noreferrer">
                                  <FileText className="w-4 h-4 mr-2" />
                                  View Datasheet
                                </a>
                              </Button>
                            )}
                            {product.product_url && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={product.product_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Product Page
                                </a>
                              </Button>
                            )}
                            <Button variant="outline" size="sm">
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default WebScrapingPage 