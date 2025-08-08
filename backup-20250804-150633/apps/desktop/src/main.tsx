import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeDatabase } from './services/database';
import './index.css';

// Initialize database before rendering the app
const initializeApp = async () => {
  try {
    await initializeDatabase();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    // Continue with app initialization even if database fails
  }
  
  try {
    ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('React app rendered successfully');
  } catch (error) {
    console.error('Failed to render React app:', error);
  }
};

initializeApp();
