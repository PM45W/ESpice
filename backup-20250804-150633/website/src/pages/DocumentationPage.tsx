import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function DocumentationPage() {
  return (
    <>
      <Helmet>
        <title>Documentation - ESpice</title>
        <meta name="description" content="ESpice documentation and guides" />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Documentation</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-lg text-gray-600 mb-8">
              Welcome to the ESpice documentation. Here you'll find comprehensive guides and references for using the ESpice platform.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
                <p className="text-gray-600 mb-4">
                  Learn the basics of ESpice and how to get up and running quickly.
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li>• Installation guide</li>
                  <li>• Quick start tutorial</li>
                  <li>• Basic configuration</li>
                </ul>
              </div>

              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h2 className="text-2xl font-semibold mb-4">Graph Extraction</h2>
                <p className="text-gray-600 mb-4">
                  Advanced documentation for the graph extraction features.
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li>• Image processing guide</li>
                  <li>• Curve extraction techniques</li>
                  <li>• Data export formats</li>
                </ul>
              </div>

              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h2 className="text-2xl font-semibold mb-4">API Reference</h2>
                <p className="text-gray-600 mb-4">
                  Complete API documentation for developers.
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li>• REST API endpoints</li>
                  <li>• Authentication</li>
                  <li>• Rate limiting</li>
                </ul>
              </div>

              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h2 className="text-2xl font-semibold mb-4">Troubleshooting</h2>
                <p className="text-gray-600 mb-4">
                  Common issues and their solutions.
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li>• FAQ</li>
                  <li>• Error codes</li>
                  <li>• Support contact</li>
                </ul>
              </div>
            </div>

            <div className="mt-12 bg-blue-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4">Need Help?</h2>
              <p className="text-gray-600 mb-4">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <div className="flex gap-4">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Contact Support
                </button>
                <button className="border border-blue-600 text-blue-600 px-4 py-2 rounded-md hover:bg-blue-50">
                  View GitHub Issues
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 