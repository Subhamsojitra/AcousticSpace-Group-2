import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import { API_BASE_URL } from './config/apiConfig';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import ToastContainer from './components/ToastContainer';

const NotFound = lazy(() => import('./pages/NotFound'));
const History = lazy(() => import('./pages/History'));
const ModelInfo = lazy(() => import('./pages/ModelInfo'));
const PipelineInfo = lazy(() => import('./pages/PipelineInfo'));

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
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <DashboardLayout apiStatus={apiStatus} latency={latency}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full p-8 text-zinc-500 font-mono text-xs">
                Loading security console...
              </div>
            }>
              <Routes>
                <Route path="/" element={<Dashboard apiStatus={apiStatus} />} />
                <Route path="/history" element={<History />} />
                <Route path="/model-info" element={<ModelInfo apiStatus={apiStatus} latency={latency} />} />
                <Route path="/pipeline-info" element={<PipelineInfo />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </DashboardLayout>
          <ToastContainer />
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;


