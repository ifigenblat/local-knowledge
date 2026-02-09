import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { loadUser } from './store/slices/authSlice';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Files from './pages/Files';
import Cards from './pages/Cards';
import View from './pages/View';
import Collections from './pages/Collections';
import Settings from './pages/Settings';
import Roles from './pages/Roles';
import Users from './pages/Users';
import ContentRules from './pages/ContentRules';
import AISettings from './pages/AISettings';
import Layout from './components/Layout';

const App = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, loading, token, mustChangePassword } = useSelector(state => state.auth);

  // Load user on app initialization if token exists
  useEffect(() => {
    if (token && !isAuthenticated) {
      dispatch(loadUser());
    }
  }, [dispatch, token, isAuthenticated]);

  // Show loading state while checking authentication
  if (loading && token) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
        <Route path="/forgot-password" element={!isAuthenticated ? <ForgotPassword /> : <Navigate to="/dashboard" />} />
        <Route path="/reset-password" element={!isAuthenticated ? <ResetPassword /> : <Navigate to="/dashboard" />} />
        
        {/* Protected routes */}
        <Route path="/" element={isAuthenticated ? (mustChangePassword ? <Navigate to="/settings?changePassword=true" /> : <Navigate to="/dashboard" />) : <Navigate to="/login" />} />
        <Route path="/dashboard" element={isAuthenticated ? (mustChangePassword ? <Navigate to="/settings?changePassword=true" /> : <Layout><Dashboard /></Layout>) : <Navigate to="/login" />} />
        <Route path="/upload" element={isAuthenticated ? (mustChangePassword ? <Navigate to="/settings?changePassword=true" /> : <Layout><Upload /></Layout>) : <Navigate to="/login" />} />
        <Route path="/files" element={isAuthenticated ? (mustChangePassword ? <Navigate to="/settings?changePassword=true" /> : <Layout><Files /></Layout>) : <Navigate to="/login" />} />
        <Route path="/cards" element={isAuthenticated ? (mustChangePassword ? <Navigate to="/settings?changePassword=true" /> : <Layout><Cards /></Layout>) : <Navigate to="/login" />} />
        <Route path="/view" element={isAuthenticated ? (mustChangePassword ? <Navigate to="/settings?changePassword=true" /> : <Layout><View /></Layout>) : <Navigate to="/login" />} />
        <Route path="/collections" element={isAuthenticated ? (mustChangePassword ? <Navigate to="/settings?changePassword=true" /> : <Layout><Collections /></Layout>) : <Navigate to="/login" />} />
        <Route path="/settings" element={isAuthenticated ? <Layout><Settings /></Layout> : <Navigate to="/login" />} />
        <Route path="/roles" element={isAuthenticated ? (mustChangePassword ? <Navigate to="/settings?changePassword=true" /> : <Layout><Roles /></Layout>) : <Navigate to="/login" />} />
        <Route path="/users" element={isAuthenticated ? (mustChangePassword ? <Navigate to="/settings?changePassword=true" /> : <Layout><Users /></Layout>) : <Navigate to="/login" />} />
        <Route path="/content-rules" element={isAuthenticated ? (mustChangePassword ? <Navigate to="/settings?changePassword=true" /> : <Layout><ContentRules /></Layout>) : <Navigate to="/login" />} />
        <Route path="/ai-settings" element={isAuthenticated ? (mustChangePassword ? <Navigate to="/settings?changePassword=true" /> : <Layout><AISettings /></Layout>) : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
};

export default App;
