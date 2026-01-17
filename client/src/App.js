import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { loadUser } from './store/slices/authSlice';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Cards from './pages/Cards';
import View from './pages/View';
import Collections from './pages/Collections';
import Layout from './components/Layout';

const App = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, loading, token } = useSelector(state => state.auth);

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
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
        
        {/* Protected routes */}
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
        <Route path="/dashboard" element={isAuthenticated ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />} />
        <Route path="/upload" element={isAuthenticated ? <Layout><Upload /></Layout> : <Navigate to="/login" />} />
        <Route path="/cards" element={isAuthenticated ? <Layout><Cards /></Layout> : <Navigate to="/login" />} />
        <Route path="/view" element={isAuthenticated ? <Layout><View /></Layout> : <Navigate to="/login" />} />
        <Route path="/collections" element={isAuthenticated ? <Layout><Collections /></Layout> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
};

export default App;
