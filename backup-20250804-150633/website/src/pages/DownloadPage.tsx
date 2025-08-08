import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Download, 
  Monitor, 
  Apple, 
  Linux, 
  Windows, 
  CheckCircle,
  Clock,
  FileText,
  Zap,
  Shield
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useDownload } from '@/hooks/useDownload';
import { useAnalytics } from '@/hooks/useAnalytics';

const DownloadPage: React.FC = () => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const { trackDownload } = useAnalytics();
  const { downloadFile } = useDownload();

  const platforms = [
    {
      id: 'windows',
      name: 'Windows',
      icon: <Windows className="h-8 w-8" />,
      description: 'Windows 10/11 (64-bit)',
      fileSize: '45.2 MB',
      downloadUrl: '/downloads/espice-windows-x64.msi',
      requirements: ['Windows 10 or later', '4GB RAM', '2GB free space']
    },
    {
      id: 'macos',
      name: 'macOS',
      icon: <Apple className="h-8 w-8" />,
      description: 'macOS 12.0 or later',
      fileSize: '42.8 MB',
      downloadUrl: '/downloads/espice-macos-x64.dmg',
      requirements: ['macOS 12.0 or later', '4GB RAM', '2GB free space']
    },
    {
      id: 'linux',
      name: 'Linux',
      icon: <Linux className="h-8 w-8" />,
      description: 'Ubuntu 20.04+ / AppImage',
      fileSize: '38.5 MB',
      downloadUrl: '/downloads/espice-linux-x64.AppImage',
      requirements: ['Ubuntu 20.04 or later', '4GB RAM', '2GB free space']
    }
  ];

  const features = [
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Lightning Fast",
      description: "Native performance with Rust backend"
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: "Secure",
      description: "Code signed and verified downloads"
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: "Auto Updates",
      description: "Automatic updates with rollback support"
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: "Offline Ready",
      description: "Works completely offline"
    }
  ];

  const releaseNotes = [
    {
      version: "1.0.0",
      date: "2025-03-21",
      changes: [
        "Initial release with SPICE model generation",
        "Support for GaN-HEMT, SiC-MOSFET, and Si-MOSFET devices",
        "Advanced PDF processing with OCR",
        "Curve extraction from datasheet graphs",
        "Parameter management and validation",
        "Export to LTSpice, KiCad, and other EDA tools"
      ]
    }
  ];

  const handleDownload = async (platform: typeof platforms[0]) => {
    setIsDownloading(true);
    setSelectedPlatform(platform.id);
    setDownloadProgress(0);

    try {
      // Track download analytics
      trackDownload(platform.id, platform.name);

      // Simulate download progress
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Download the file
      await downloadFile(platform.downloadUrl, platform.name);
      
      setDownloadProgress(100);
      
      // Reset after completion
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
        setSelectedPlatform('');
      }, 2000);

    } catch (error) {
      console.error('Download failed:', error);
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  return (
    <>
      <Helmet>
        <title>Download ESpice - Professional SPICE Model Generator</title>
        <meta name="description" content="Download ESpice for Windows, macOS, or Linux. Generate accurate SPICE models from semiconductor datasheets." />
      </Helmet>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Download ESpice
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Choose your platform and start generating accurate SPICE models from semiconductor datasheets today.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Download Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Platform Selection */}
            <div className="lg:col-span-2">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
                Choose Your Platform
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {platforms.map((platform, index) => (
                  <motion.div
                    key={platform.id}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                  >
                    <Card className={`h-full cursor-pointer transition-all hover:shadow-lg ${
                      selectedPlatform === platform.id ? 'ring-2 ring-blue-500' : ''
                    }`}>
                      <CardHeader className="text-center">
                        <div className="mx-auto mb-4 text-blue-600 dark:text-blue-400">
                          {platform.icon}
                        </div>
                        <CardTitle className="text-xl">{platform.name}</CardTitle>
                        <CardDescription>{platform.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          File size: {platform.fileSize}
                        </p>
                        <div className="space-y-2 mb-4">
                          {platform.requirements.map((req, idx) => (
                            <div key={idx} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                              {req}
                            </div>
                          ))}
                        </div>
                        <Button 
                          onClick={() => handleDownload(platform)}
                          disabled={isDownloading}
                          className="w-full"
                          size="lg"
                        >
                          {isDownloading && selectedPlatform === platform.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Downloading...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-2" />
                              Download for {platform.name}
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Download Progress */}
              {isDownloading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8"
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Download Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Progress value={downloadProgress} className="mb-4" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {downloadProgress}% complete
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Features Sidebar */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Why Choose ESpice?
              </h3>
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                  >
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="text-blue-600 dark:text-blue-400 mt-1">
                            {feature.icon}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {feature.title}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Release Notes */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Release Notes
          </h2>
          <div className="max-w-4xl mx-auto">
            {releaseNotes.map((release, index) => (
              <motion.div
                key={release.version}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Card className="mb-6">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          Version {release.version}
                        </CardTitle>
                        <CardDescription>
                          Released on {release.date}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">Latest</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {release.changes.map((change, idx) => (
                        <li key={idx} className="flex items-start">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300">{change}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* System Requirements */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            System Requirements
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Monitor className="h-5 w-5 mr-2" />
                  Minimum Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• 4GB RAM</li>
                  <li>• 2GB free disk space</li>
                  <li>• 1GHz processor</li>
                  <li>• 1024x768 display</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Recommended
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• 8GB RAM</li>
                  <li>• 5GB free disk space</li>
                  <li>• 2GHz processor</li>
                  <li>• 1920x1080 display</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Code signed executables</li>
                  <li>• SHA256 verification</li>
                  <li>• Secure update channel</li>
                  <li>• No telemetry data</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
};

export default DownloadPage; 