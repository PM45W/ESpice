import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from '@/components/ui/toaster';
import { AnalyticsProvider } from '@/contexts/AnalyticsContext';
import { DownloadProvider } from '@/contexts/DownloadContext';

// Layout Components
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// Page Components
import HomePage from '@/pages/HomePage';
import DownloadPage from '@/pages/DownloadPage';
import GraphExtractionPage from '@/pages/GraphExtractionPage';
import DocumentationPage from '@/pages/DocumentationPage';
import AdminPage from '@/pages/AdminPage';
import NotFoundPage from '@/pages/NotFoundPage';

// Styles
import '@/styles/globals.css';

function App() {
  return (
    <HelmetProvider>
      <AnalyticsProvider>
        <DownloadProvider>
          <Router>
            <div className="min-h-screen bg-background font-sans antialiased">
              <Header />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/download" element={<DownloadPage />} />
                  <Route path="/graph-extraction" element={<GraphExtractionPage />} />
                  <Route path="/docs/*" element={<DocumentationPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </main>
              <Footer />
              <Toaster />
            </div>
          </Router>
        </DownloadProvider>
      </AnalyticsProvider>
    </HelmetProvider>
  );
}

export default App; 