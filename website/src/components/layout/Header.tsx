import React from 'react';
import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-gray-900">
            ESpice
          </Link>
          <div className="flex items-center space-x-6">
            <Link to="/" className="text-gray-600 hover:text-gray-900">
              Home
            </Link>
            <Link to="/graph-extraction" className="text-gray-600 hover:text-gray-900">
              Graph Extraction
            </Link>
            <Link to="/download" className="text-gray-600 hover:text-gray-900">
              Download
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
} 