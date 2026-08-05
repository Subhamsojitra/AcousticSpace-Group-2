import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Results from './pages/Results';
import LoadingState from './components/LoadingState';
import ErrorState from "./components/ErrorState";
import EmptyState from "./components/EmptyState";
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
  const [backendVersion, setBackendVersion] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function checkStatus() {
      const startTime = performance.now();
      try {
        const res = await fetch(`${API_BASE_URL}/`, { method: 'GET' });
        const data = await res.json().catch(() => ({}));
        const endTime = performance.now();
        const diff = Math.round(endTime - startTime);
        if (!res.ok) throw new Error();
        if (!cancelled) {
          setApiStatus('online');
          setLatency(diff);
          setBackendVersion(data.version || null);
        }
      } catch {
        if (!cancelled) {
          setApiStatus('offline');
          setLatency(null);
          setBackendVersion(null);
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
          <DashboardLayout apiStatus={apiStatus} latency={latency} backendVersion={backendVersion}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full p-8 text-zinc-500 font-mono text-xs">
                Loading security console...
              </div>
            }>
             <Routes>
  <Route
    path="/"
    element={<Dashboard apiStatus={apiStatus} backendVersion={backendVersion} />}
  />

  <Route path="/history" element={<History />} />

  {/* Your pages */}
  <Route path="/results" element={<Results />} />
  <Route path="/loading" element={<LoadingState />} />
  <Route path="/error" element={<ErrorState />} />
  <Route path="/empty" element={<EmptyState />} />

  {/* Friend's pages */}
  <Route
    path="/model-info"
    element={<ModelInfo apiStatus={apiStatus} latency={latency} />}
  />
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


