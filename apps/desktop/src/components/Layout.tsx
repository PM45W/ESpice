"use client"

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { 
  LayoutDashboard, 
  Upload, 
  FileText, 
  Settings, 
  Search, 
  Bell, 
  Sun, 
  Moon,
  ChevronDown,
  User,
  LogOut,
  Database,
  BarChart3,
  Shield,
  Target,
  Globe,
  Zap,
  Menu,
  
} from 'lucide-react'
import { 
  Button,
  Input,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Separator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@espice/ui'
import { useSystemMonitor } from '../hooks/useSystemMonitor'
import Logo from '../assets/logo.svg';

interface LayoutProps {
  children: React.ReactNode
  extractButton?: React.ReactNode
  serviceStatus?: 'checking' | 'available' | 'unavailable'
  serviceError?: string
  onServiceRetry?: () => void
}

const Layout: React.FC<LayoutProps> = ({ children, extractButton, serviceStatus, serviceError, onServiceRetry }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarMinimized, setSidebarMinimized] = useState(false)
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('')
  const [darkMode, setDarkMode] = useState(() => {
    // Check for saved theme preference or default to system preference
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('espace-theme');
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
    }
    return true; // Default to dark for EDA
  });
  
  // Apply dark mode on mount and when it changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('espace-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);
  
  // Use real system monitoring data - optimized for performance
  const { metrics, systemInfo } = useSystemMonitor(10000);

  const navigation = useMemo(() => [
    { name: 'DASHBOARD', href: '/', icon: LayoutDashboard },
    { name: 'PRODUCT MANAGEMENT', href: '/product-management', icon: Database },
    { name: 'SPICE EXTRACTION', href: '/spice-gen', icon: Zap },
    { name: 'GRAPH EXTRACTION', href: '/graph-extraction', icon: BarChart3 },
    { name: 'SETTINGS', href: '/settings', icon: Settings },
  ], [])

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev)
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev)
  }, [])

  // Removed sidebar minimize toggle per UI request

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  const isActive = useCallback((href: string) => {
    return window.location.pathname === href
  }, [])

  // Get current page for navigation highlighting
  const getCurrentPage = useCallback(() => {
    const path = window.location.pathname
    if (path === '/') return 'DASHBOARD'
    if (path === '/graph-extraction') return 'GRAPH EXTRACTION'
    if (path === '/upload') return 'UPLOAD'
    if (path === '/documents') return 'DOCUMENTS'
    if (path === '/products') return 'PRODUCTS'
    if (path === '/spice-gen') return 'SPICE GENERATION'
    if (path === '/scraping') return 'WEB SCRAPING'
    if (path === '/analysis') return 'ANALYSIS'
    if (path === '/database') return 'DATABASE'
    if (path === '/processing') return 'PROCESSING'
    if (path === '/pdk') return 'PDK COMPATIBILITY'
    if (path === '/validation') return 'SILICON VALIDATION'
    if (path === '/settings') return 'SETTINGS'
    return ''
  }, [])

  // Helper function to get status color based on usage percentage
  const getStatusColor = useCallback((usage: number) => {
    if (usage < 50) return 'text-eda-success';
    if (usage < 80) return 'text-eda-warning';
    return 'text-eda-error';
  }, [])

  // Helper function to format uptime
  const formatUptime = useCallback((uptime: number) => {
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }, [])

  return (
    <div className={`h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] ${darkMode ? 'dark' : ''}`}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed left-0 right-0 bottom-0 top-16 z-40 bg-[hsl(var(--foreground))] bg-opacity-80 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Layout container */}
      <div className="flex h-screen w-full overflow-hidden">
        {/* Sidebar */}
        <aside className={`
          ${sidebarMinimized ? 'w-16 min-w-16' : 'w-80 min-w-80'}
          bg-[hsl(var(--card))] border-r border-[hsl(var(--border))] shadow-sm overflow-y-auto overflow-x-hidden flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out sidebar-container
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          fixed left-0 top-16 z-50 h-[calc(100vh-4rem)]
        `}>
          {/* Navigation */}
          <nav className={`flex-1 overflow-y-auto overflow-x-hidden pt-2 px-4 pb-4 ${sidebarMinimized ? 'px-2 py-2' : ''}`} role="navigation" aria-label="Main navigation">
            <div className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                const currentPage = getCurrentPage()
                const isCurrentPage = item.name === currentPage
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`nav-item flex items-center ${sidebarMinimized ? 'justify-center' : ''} px-4 py-4 rounded-lg text-sm font-medium text-[hsl(var(--foreground))] no-underline transition-all duration-200 whitespace-nowrap font-mono min-h-[48px] ${
                      active 
                        ? 'bg-primary text-primary-foreground shadow-sm' 
                        : isCurrentPage
                        ? 'bg-blue-900/30 text-blue-300 border-l-4 border-blue-500 shadow-sm'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <div className={`flex items-center ${sidebarMinimized ? 'justify-center w-full' : 'space-x-4 w-full'}`}>
                      <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                      {!sidebarMinimized && (
                        <span className="font-mono text-overflow-ellipsis flex-1">{item.name}</span>
                      )}
                    </div>
                  </a>
                )
              })}
            </div>
          </nav>
          {/* System Status */}
          {!sidebarMinimized && (
            <div className="p-4 border-t border-border">
              <div className="bg-[hsl(var(--card))] border-[hsl(var(--border))] rounded-lg">
                <div className="bg-muted/50 border-b border-border px-4 py-3">
                  <span className="text-sm font-semibold text-muted-foreground font-mono">SYSTEM STATUS</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-mono">CPU</span>
                    <span className={`font-mono ${getStatusColor(metrics.cpu.usage)}`}>{metrics.cpu.usage}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-mono">MEMORY</span>
                    <span className={`font-mono ${getStatusColor(metrics.memory.usage)}`}>{metrics.memory.usage}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-mono">DISK</span>
                    <span className={`font-mono ${getStatusColor(metrics.disk.usage)}`}>{metrics.disk.usage}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-mono">DOCUMENTS</span>
                    <span className="font-mono text-primary">{metrics.app.documentsCount}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-mono">UPTIME</span>
                    <span className="font-mono text-primary">{formatUptime(metrics.app.uptime)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* User Profile */}
          {!sidebarMinimized && (
            <div className="p-4 border-t border-border">
              <div className="flex items-center space-x-4 p-3 rounded-lg bg-accent/50">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatar.jpg" alt="User avatar" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-mono">JD</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[hsl(var(--foreground))] font-mono">JOHN.DOE</p>
                  <p className="text-xs text-muted-foreground font-mono">ADMIN</p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main content area */}
        <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden bg-[hsl(var(--background))] flex-container">
          {/* Header */}
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-[hsl(var(--background))]/95 backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--background))]/60 px-6 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleSidebar}
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              aria-pressed={sidebarOpen}
            >
              <Menu className="h-4 w-4" />
            </Button>

            {/* Brand */}
            <a href="/" className="hidden lg:flex items-center gap-2 no-underline">
              <img src={Logo} alt="ESpice Logo" className="w-8 h-8" />
              <span className="text-lg font-bold text-[hsl(var(--primary))] font-mono leading-tight">ESpice</span>
            </a>

            {/* Global Search Bar - Moved to Left */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search functions, pages, features..."
                className="pl-10 text-sm"
                id="global-search"
                value={sidebarSearchQuery}
                onChange={(e) => setSidebarSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && sidebarSearchQuery.trim()) {
                    const query = sidebarSearchQuery.trim().toLowerCase();
                    
                    // General search navigation logic
                    if (query.includes('product') || query.includes('manage')) {
                      window.location.href = `/product-management?search=${encodeURIComponent(sidebarSearchQuery.trim())}`;
                    } else if (query.includes('spice') || query.includes('extract') || query.includes('model')) {
                      window.location.href = `/spice-gen`;
                    } else if (query.includes('graph') || query.includes('curve') || query.includes('chart')) {
                      window.location.href = `/graph-extraction`;
                    } else if (query.includes('dashboard') || query.includes('home')) {
                      window.location.href = `/`;
                    } else if (query.includes('setting') || query.includes('config')) {
                      window.location.href = `/settings`;
                    } else {
                      // Default to product management if no specific match
                      window.location.href = `/product-management?search=${encodeURIComponent(sidebarSearchQuery.trim())}`;
                    }
                  }
                }}
              />
            </div>

            <div className="ml-auto flex items-center gap-3">

              {/* Extract Button for Graph Extraction Page */}
              {extractButton && (
                <div className="mr-4">
                  {extractButton}
                </div>
              )}
              
              {/* Service/Network indicators removed per request */}

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                className="h-8 w-8 hover:bg-accent"
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent" aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded" aria-label="User menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/avatar.jpg" alt="User" />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-mono">JD</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none font-mono">JOHN.DOE</p>
                      <p className="text-xs leading-none text-muted-foreground font-mono">
                        ADMIN@ESpice.local
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-3 h-4 w-4" />
                    <span className="font-mono">PROFILE</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-3 h-4 w-4" />
                    <span className="font-mono">SETTINGS</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <LogOut className="mr-3 h-4 w-4" />
                    <span className="font-mono">LOGOUT</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">
            <div className="mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default Layout 