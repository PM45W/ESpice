import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function AdminPage() {
  return (
    <>
      <Helmet>
        <title>Admin - ESpice</title>
        <meta name="description" content="ESpice administration panel" />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Admin Panel</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* System Status */}
            <div className="lg:col-span-2">
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h2 className="text-2xl font-semibold mb-6">System Status</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-green-800">API Gateway</h3>
                        <p className="text-green-600 text-sm">Running</p>
                      </div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-green-800">Curve Extraction Service</h3>
                        <p className="text-green-600 text-sm">Running</p>
                      </div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-green-800">Database</h3>
                        <p className="text-green-600 text-sm">Connected</p>
                      </div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-yellow-800">Web Scraper</h3>
                        <p className="text-yellow-600 text-sm">Idle</p>
                      </div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white p-6 rounded-lg border shadow-sm mt-8">
                <h2 className="text-2xl font-semibold mb-6">Recent Activity</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Graph extraction completed</p>
                      <p className="text-sm text-gray-600">3 curves extracted from datasheet</p>
                    </div>
                    <span className="text-sm text-gray-500">2 minutes ago</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">New datasheet uploaded</p>
                      <p className="text-sm text-gray-600">EPC2040 datasheet processed</p>
                    </div>
                    <span className="text-sm text-gray-500">15 minutes ago</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Service restart</p>
                      <p className="text-sm text-gray-600">Curve extraction service restarted</p>
                    </div>
                    <span className="text-sm text-gray-500">1 hour ago</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h2 className="text-2xl font-semibold mb-6">Quick Actions</h2>
                
                <div className="space-y-4">
                  <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors">
                    Restart Services
                  </button>
                  
                  <button className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors">
                    Backup Database
                  </button>
                  
                  <button className="w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 transition-colors">
                    View Logs
                  </button>
                  
                  <button className="w-full bg-orange-600 text-white py-3 px-4 rounded-md hover:bg-orange-700 transition-colors">
                    System Health Check
                  </button>
                </div>
              </div>

              {/* Statistics */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h2 className="text-2xl font-semibold mb-6">Statistics</h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Extractions</span>
                    <span className="font-semibold">1,247</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Active Users</span>
                    <span className="font-semibold">23</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Storage Used</span>
                    <span className="font-semibold">2.4 GB</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Uptime</span>
                    <span className="font-semibold">99.8%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 