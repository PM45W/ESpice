import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>404 - Page Not Found - ESpice</title>
        <meta name="description" content="Page not found" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <h1 className="text-9xl font-bold text-gray-300">404</h1>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Page Not Found</h2>
            <p className="text-gray-600 mb-8">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          <div className="space-y-4">
            <Link
              to="/"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              Go Home
            </Link>
            
            <div className="text-sm text-gray-500">
              <p>Or try one of these pages:</p>
              <div className="mt-2 space-x-4">
                <Link to="/graph-extraction" className="text-blue-600 hover:underline">
                  Graph Extraction
                </Link>
                <Link to="/download" className="text-blue-600 hover:underline">
                  Download
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 