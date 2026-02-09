import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const UploadZone = ({ onUpload, onUploadComplete, isUploading = false, uploadSettings = {} }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});

  const handleFileUpload = useCallback(async (fileObj) => {
    const formData = new FormData();
    formData.append('file', fileObj.file);

    if (uploadSettings.useAI) {
      formData.append('useAI', 'true');
    }
    if (uploadSettings.category) {
      formData.append('category', uploadSettings.category);
    }
    if (uploadSettings.tags) {
      formData.append('tags', uploadSettings.tags);
    }

    setUploadProgress(prev => ({
      ...prev,
      [fileObj.id]: 0
    }));

    try {
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'uploading' } : f
        )
      );

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = result?.message || result?.error || `Upload failed (${response.status})`;
        throw new Error(msg);
      }
      
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'success', result } : f
        )
      );

      setUploadProgress(prev => ({
        ...prev,
        [fileObj.id]: 100
      }));

      const { created, updated } = result.details || { created: result.cards.length, updated: 0 };
      const message = created > 0 && updated > 0 
        ? `Created ${created} new cards and updated ${updated} existing cards from ${fileObj.file.name}`
        : created > 0 
        ? `Successfully created ${created} new cards from ${fileObj.file.name}`
        : `Updated ${updated} existing cards from ${fileObj.file.name}`;
      
      toast.success(message);
      
      if (onUploadComplete) {
        onUploadComplete(result);
      }

    } catch (error) {
      console.error('Upload error:', error);
      
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'error', error: error.message } : f
        )
      );

      toast.error(error?.message || `Failed to upload ${fileObj.file.name}`);
    }
  }, [onUploadComplete, uploadSettings]);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(file => {
        toast.error(`${file.file.name} is not a supported file type`);
      });
    }

    if (acceptedFiles.length > 0) {
      const newFiles = acceptedFiles.map(file => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        status: 'pending'
      }));
      
      setUploadedFiles(prev => [...prev, ...newFiles]);
      
      // Process each file sequentially to avoid race conditions
      const processFilesSequentially = async () => {
        for (const fileObj of newFiles) {
          await handleFileUpload(fileObj);
          // Small delay between uploads to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      };
      
      processFilesSequentially();
    }
  }, [handleFileUpload]);

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/json': ['.json']
    },
    maxSize: 20 * 1024 * 1024, // 20MB
    disabled: isUploading
  });

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-4 sm:p-8 text-center cursor-pointer transition-all duration-200 touch-manipulation
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 active:border-blue-400'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mb-3 sm:mb-4" />
        <p className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
          {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          or click to select files
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 px-2">
          Supports PDF, DOCX, XLSX, TXT, MD, JSON, and images (max 10MB each)
        </p>
      </div>

      {/* Uploaded Files List */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
              Uploaded Files
            </h3>
            
            {uploadedFiles.map((fileObj) => (
              <motion.div
                key={fileObj.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center justify-between p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                  <File className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                      {fileObj.file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(fileObj.file.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                  {/* Status Icon */}
                  {fileObj.status === 'pending' && (
                    <div className="animate-pulse">
                      <div className="h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                    </div>
                  )}
                  
                  {fileObj.status === 'uploading' && (
                    <div className="animate-spin">
                      <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                  
                  {fileObj.status === 'success' && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  
                  {fileObj.status === 'error' && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}

                  {/* Progress Bar */}
                  {fileObj.status === 'uploading' && (
                    <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress[fileObj.id] || 0}%` }}
                      ></div>
                    </div>
                  )}

                  {/* Success Info */}
                  {fileObj.status === 'success' && fileObj.result && (
                    <span className="text-xs text-green-600 dark:text-green-400">
                      {fileObj.result.cards.length} cards created
                    </span>
                  )}

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFile(fileObj.id)}
                    className="p-1 text-gray-400 hover:text-red-500 active:text-red-600 transition-colors touch-manipulation"
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UploadZone;
