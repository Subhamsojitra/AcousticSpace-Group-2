import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import { API_BASE_URL } from './config/apiConfig';

function App() {
  const [apiStatus, setApiStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
  const [latency, setLatency] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function checkStatus() {
      const startTime = performance.now();
      try {
        const res = await fetch(`${API_BASE_URL}/`, { method: 'GET' });
        const endTime = performance.now();
        const diff = Math.round(endTime - startTime);
        if (!res.ok) throw new Error();
        if (!cancelled) {
          setApiStatus('online');
          setLatency(diff);
        }
      } catch {
        if (!cancelled) {
          setApiStatus('offline');
          setLatency(null);
        }
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <Router>
      <DashboardLayout apiStatus={apiStatus} latency={latency}>
        <Routes>
          <Route path="/" element={<Dashboard apiStatus={apiStatus} latency={latency} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </DashboardLayout>
    </Router>
  );
}

export default App;

