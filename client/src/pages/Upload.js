import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { addMultipleCards } from '../store/slices/cardSlice';
import { checkAIStatusAsync } from '../store/slices/cardSlice';
import UploadZone from '../components/UploadZone';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { getAIDisplayName } from '../utils/aiUtils';

const Upload = () => {
  const dispatch = useDispatch();
  const { aiStatus } = useSelector((state) => state.cards);
  const [uploadSettings, setUploadSettings] = useState({
    category: '',
    tags: '',
    useAI: false,
  });
  const [uploadResults, setUploadResults] = useState(null);

  useEffect(() => {
    dispatch(checkAIStatusAsync());
  }, [dispatch]);

  const handleUploadComplete = (result) => {
    console.log('Upload completed:', result);
    
    // Store upload results for display
    setUploadResults(result);
    
    // Add the newly created cards to the Redux store
    if (result.cards && Array.isArray(result.cards)) {
      dispatch(addMultipleCards(result.cards));
    }
  };

  const handleSettingChange = (e) => {
    const { name, value } = e.target;
    setUploadSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="space-y-4 sm:space-y-6 pt-12 sm:pt-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Upload Content
        </h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Upload files to automatically generate learning cards
        </p>
      </div>

      {/* Upload Settings */}
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4">
          Upload Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Default Category (Optional)
            </label>
            <select
              id="category"
              name="category"
              value={uploadSettings.category}
              onChange={handleSettingChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Auto-detect from content</option>
              <option value="AI">AI</option>
              <option value="Architecture">Architecture</option>
              <option value="Change Management">Change Management</option>
              <option value="Communication">Communication</option>
              <option value="Conflict Resolution">Conflict Resolution</option>
              <option value="Customer Service">Customer Service</option>
              <option value="Data">Data</option>
              <option value="Decision Making">Decision Making</option>
              <option value="Financial Management">Financial Management</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Leadership">Leadership</option>
              <option value="Management">Management</option>
              <option value="Marketing">Marketing</option>
              <option value="Operating Principles">Operating Principles</option>
              <option value="Operations">Operations</option>
              <option value="Organization">Organization</option>
              <option value="People">People</option>
              <option value="Performance Management">Performance Management</option>
              <option value="Process">Process</option>
              <option value="Sales">Sales</option>
              <option value="Strategic Planning">Strategic Planning</option>
              <option value="Team Management">Team Management</option>
              <option value="Technology">Technology</option>
              <option value="Time Management">Time Management</option>
              <option value="General">General</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Leave empty to auto-detect category from content
            </p>
          </div>
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Default Tags (Optional)
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={uploadSettings.tags}
              onChange={handleSettingChange}
              placeholder="tag1, tag2, tag3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Comma-separated tags to add to all cards
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="useAI"
                checked={uploadSettings.useAI}
                onChange={(e) => setUploadSettings((prev) => ({ ...prev, useAI: e.target.checked }))}
                disabled={!aiStatus.available}
                className="mt-0.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Use AI to create cards
                  {aiStatus.provider ? (
                    <span className="text-gray-500 dark:text-gray-400 font-normal">
                      {' '}({getAIDisplayName(aiStatus)})
                    </span>
                  ) : null}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  {aiStatus.checking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Checking AI status...</span>
                    </>
                  ) : aiStatus.available ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-green-600 dark:text-green-400">
                        AI ({getAIDisplayName(aiStatus)}) available
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-red-600 dark:text-red-400">
                        AI unavailable: {aiStatus.error || 'Not configured or not reachable'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Upload Results */}
      {uploadResults && (
        <div className="bg-green-50 dark:bg-green-900/20 p-4 sm:p-6 rounded-lg border border-green-200 dark:border-green-800">
          <h3 className="text-base sm:text-lg font-medium text-green-900 dark:text-green-100 mb-4">
            Upload Results
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                {uploadResults.details?.created || 0}
              </div>
              <div className="text-xs sm:text-sm text-green-700 dark:text-green-300">
                New Cards Created
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                {uploadResults.details?.updated || 0}
              </div>
              <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                Existing Cards Updated
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-gray-600 dark:text-gray-400">
                {(uploadResults.details?.created || 0) + (uploadResults.details?.updated || 0)}
              </div>
              <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                Total Cards Processed
              </div>
            </div>
          </div>
          <div className="mt-4 text-xs sm:text-sm text-green-800 dark:text-green-200 break-words">
            <strong>File:</strong> {uploadResults.file?.originalName}
            <br />
            <strong>Message:</strong> {uploadResults.message}
          </div>
          <Link
            to="/files"
            className="inline-block mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Manage uploaded files →
          </Link>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <UploadZone 
          onUploadComplete={handleUploadComplete}
          uploadSettings={uploadSettings}
        />
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 sm:p-6 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="text-base sm:text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
          Supported File Types
        </h3>
        <ul className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• PDF documents (.pdf)</li>
          <li>• Word documents (.docx, .doc)</li>
          <li>• Excel spreadsheets (.xlsx, .xls)</li>
          <li>• Text files (.txt)</li>
          <li>• Markdown files (.md)</li>
          <li>• JSON files (.json)</li>
          <li>• Images (.jpg, .jpeg, .png)</li>
        </ul>
        <p className="mt-3 text-xs text-blue-700 dark:text-blue-300">
          Maximum file size: 10MB per file
        </p>
      </div>
    </div>
  );
};

export default Upload;
