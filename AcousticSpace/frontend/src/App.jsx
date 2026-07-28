import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Results from './pages/Results';
import NotFound from './pages/NotFound';
import LoadingState from './components/LoadingState';
import ErrorState from "./components/ErrorState";
import EmptyState from "./components/EmptyState";
import History from "./pages/History";

function App() {
  return (
    <Router>
      <DashboardLayout>
       <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/loading" element={<LoadingState />} />
          <Route path="/results" element={<Results />} />
          <Route path="/error" element={<ErrorState />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/empty" element={<EmptyState />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </DashboardLayout>
    </Router>
  );
}
export default App;
