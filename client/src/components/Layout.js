import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { 
  Home, 
  Upload, 
  FolderOpen,
  Table,
  Grid,
  LogOut,
  User,
  Menu,
  X,
  Settings
} from 'lucide-react';

const Layout = ({ children }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getActiveClass = (path) => {
    return isActive(path) 
      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700' 
      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-transparent';
  };

  const handleLinkClick = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Toggle menu"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 h-16 border-b border-gray-200 dark:border-gray-700 px-4">
            <img 
              src={`${process.env.PUBLIC_URL || ''}/logo.png`}
              alt="LocalKnowledge Logo" 
              className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 object-contain"
              onError={(e) => {
                console.error('Logo failed to load:', e.target.src);
                e.target.style.display = 'none';
              }}
            />
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
              LocalKnowledge
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <Link
              to="/dashboard"
              onClick={handleLinkClick}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${getActiveClass('/dashboard')}`}
            >
              <Home className="w-5 h-5 mr-3" />
              Dashboard
            </Link>

            <Link
              to="/upload"
              onClick={handleLinkClick}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${getActiveClass('/upload')}`}
            >
              <Upload className="w-5 h-5 mr-3" />
              Upload
            </Link>

            {/* View Cards - Grid Layout */}
            <Link
              to="/view"
              onClick={handleLinkClick}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${getActiveClass('/view')}`}
            >
              <Grid className="w-5 h-5 mr-3" />
              View
            </Link>

            {/* Cards - Table Layout */}
            <Link
              to="/cards"
              onClick={handleLinkClick}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${getActiveClass('/cards')}`}
            >
              <Table className="w-5 h-5 mr-3" />
              Cards
            </Link>

            <Link
              to="/collections"
              onClick={handleLinkClick}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${getActiveClass('/collections')}`}
            >
              <FolderOpen className="w-5 h-5 mr-3" />
              Collections
            </Link>

            <Link
              to="/settings"
              onClick={handleLinkClick}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${getActiveClass('/settings')}`}
            >
              <Settings className="w-5 h-5 mr-3" />
              Settings
            </Link>
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="lg:ml-64">
        <main className="p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
