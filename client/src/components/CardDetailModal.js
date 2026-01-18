import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Target, 
  Quote, 
  CheckSquare, 
  Network, 
  Star, 
  ChevronDown,
  ChevronUp,
  File,
  ExternalLink,
  RefreshCw,
  FolderPlus
} from 'lucide-react';

// Component to highlight snippet in source file content
const SnippetHighlightedContent = ({ content, snippet }) => {
  const snippetLocation = React.useMemo(() => {
    if (!snippet || !content) return { start: -1, end: -1 };
    
    const snippetTrimmed = snippet.trim();
    const index = content.indexOf(snippetTrimmed);
    
    if (index !== -1) {
      return { start: index, end: index + snippetTrimmed.length };
    }
    
    // Try to find a partial match
    const words = snippetTrimmed.split(/\s+/).slice(0, 5).join(' ');
    const partialIndex = content.indexOf(words);
    if (partialIndex !== -1) {
      return { start: partialIndex, end: partialIndex + words.length };
    }
    
    return { start: -1, end: -1 };
  }, [content, snippet]);

  if (snippetLocation.start === -1) {
    return (
      <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
        {content}
      </pre>
    );
  }

  const before = content.substring(Math.max(0, snippetLocation.start - 300), snippetLocation.start);
  const match = content.substring(snippetLocation.start, snippetLocation.end);
  const after = content.substring(snippetLocation.end, Math.min(content.length, snippetLocation.end + 300));

  return (
    <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
      {before}
      <mark className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded font-semibold">{match}</mark>
      {after}
    </pre>
  );
};

const CardDetailModal = ({ 
  card, 
  isOpen, 
  onClose, 
  onRegenerate, 
  onEdit,
  onAddToCollection,
  loading = false 
}) => {
  const [provenanceExpanded, setProvenanceExpanded] = useState(false);
  const [showSourceFile, setShowSourceFile] = useState(false);
  const [sourceFileContent, setSourceFileContent] = useState(null);
  const [loadingSourceFile, setLoadingSourceFile] = useState(false);
  const [sourceFileError, setSourceFileError] = useState(null);
  const [previewHtmlUrl, setPreviewHtmlUrl] = useState(null);
  const iframeRef = useRef(null);

  // Reset state when modal closes or card changes
  useEffect(() => {
    if (!isOpen) {
      setProvenanceExpanded(false);
      setShowSourceFile(false);
      setSourceFileContent(null);
      if (previewHtmlUrl) {
        URL.revokeObjectURL(previewHtmlUrl);
        setPreviewHtmlUrl(null);
      }
    }
  }, [isOpen, previewHtmlUrl]);

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      if (previewHtmlUrl) {
        URL.revokeObjectURL(previewHtmlUrl);
      }
    };
  }, [previewHtmlUrl]);

  const getTypeIcon = (type) => {
    const icons = {
      concept: BookOpen,
      action: Target,
      quote: Quote,
      checklist: CheckSquare,
      mindmap: Network
    };
    const IconComponent = icons[type] || BookOpen;
    return <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-white" />;
  };

  const getTypeColorForHeader = (type) => {
    const colors = {
      concept: 'bg-blue-500',
      action: 'bg-green-500',
      quote: 'bg-purple-500',
      checklist: 'bg-orange-500',
      mindmap: 'bg-indigo-500'
    };
    return colors[type] || 'bg-gray-500';
  };

  const handleViewSourceFile = async () => {
    if (showSourceFile) {
      setShowSourceFile(false);
      setSourceFileContent(null);
      if (previewHtmlUrl) {
        URL.revokeObjectURL(previewHtmlUrl);
        setPreviewHtmlUrl(null);
      }
      return;
    }

    // Try to get file from attachments first, then fall back to provenance
    const sourceFileId = card?.attachments?.[0]?.filename || card?.provenance?.source_file_id;
    if (!sourceFileId) {
      console.error('No source file ID found. Attachments:', card?.attachments, 'Provenance:', card?.provenance);
      setSourceFileError('No source file found');
      return;
    }

    setLoadingSourceFile(true);
    setSourceFileError(null);
    setShowSourceFile(true);

    try {
      const token = localStorage.getItem('token');
      const attachment = card?.attachments?.[0];
      const fileExtension = attachment?.filename 
        ? attachment.filename.split('.').pop().toLowerCase() 
        : sourceFileId.split('.').pop()?.toLowerCase() || '';

      // Handle PDF files
      if (fileExtension === 'pdf') {
        setSourceFileContent('pdf');
        setLoadingSourceFile(false);
        return;
      }

      // Handle image files
      if (attachment?.mimetype && attachment.mimetype.startsWith('image/')) {
        setSourceFileContent('image');
        setLoadingSourceFile(false);
        return;
      }

      // Handle office documents (DOCX, XLSX) - use preview API
      if (['docx', 'doc', 'xlsx', 'xls'].includes(fileExtension)) {
        try {
          const previewResponse = await fetch(`/api/preview/${sourceFileId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (previewResponse.ok) {
            const htmlContent = await previewResponse.text();
            
            // Create a blob URL from the HTML content
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const blobUrl = URL.createObjectURL(blob);
            setPreviewHtmlUrl(blobUrl);
            setSourceFileContent('office');
          } else {
            setSourceFileContent('binary');
          }
        } catch (error) {
          console.error('Error loading preview:', error);
          setSourceFileContent('binary');
        }
        setLoadingSourceFile(false);
        return;
      }

      // Handle text files
      try {
        const response = await fetch(`/uploads/${sourceFileId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const text = await response.text();
          setSourceFileContent(text);
        } else {
          setSourceFileContent('binary');
        }
      } catch (error) {
        console.error('Error loading file:', error);
        setSourceFileContent('binary');
      }
    } catch (error) {
      console.error('Error viewing source file:', error);
      setSourceFileError('Failed to load source file');
      setSourceFileContent(null);
    } finally {
      setLoadingSourceFile(false);
    }
  };

  const handleClose = () => {
    setProvenanceExpanded(false);
    setShowSourceFile(false);
    setSourceFileContent(null);
    if (previewHtmlUrl) {
      URL.revokeObjectURL(previewHtmlUrl);
      setPreviewHtmlUrl(null);
    }
    onClose();
  };

  if (!isOpen || !card) return null;

  const sourceFileId = card?.attachments?.[0]?.filename || card?.provenance?.source_file_id;
  const attachment = card?.attachments?.[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="relative max-w-4xl max-h-[98vh] sm:max-h-[95vh] w-full flex flex-col">
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white hover:text-gray-300 active:text-gray-400 z-20 bg-black bg-opacity-50 rounded-full p-2 transition-colors touch-manipulation"
          aria-label="Close modal"
        >
          ×
        </button>
        <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden flex flex-col max-h-full">
          {/* Modal Header - Fixed with Color */}
          <div className={`${getTypeColorForHeader(card.type)} p-4 sm:p-6 flex-shrink-0`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                <div className="h-6 w-6 sm:h-8 sm:w-8 text-white flex-shrink-0">
                  {getTypeIcon(card.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-2xl font-bold text-white truncate">
                    {card.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-white/80 text-xs sm:text-sm mt-1">
                    <span className="capitalize">{card.type}</span>
                    <span>•</span>
                    <span>{card.category}</span>
                    {card.metadata?.rating && (
                      <>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-300 fill-current" />
                          <span>{card.metadata.rating}/5</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="space-y-4 sm:space-y-6">
              {/* Content */}
              <div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2 sm:mb-3">Content</h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4">
                  <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                    {card.content}
                  </p>
                </div>
              </div>

              {/* Tags */}
              {card.tags && card.tags.length > 0 && (
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2 sm:mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {card.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex px-2 sm:px-3 py-1 text-xs sm:text-sm bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Image Attachments */}
              {card.attachments && card.attachments.some(att => att.mimetype && att.mimetype.startsWith('image/')) && (
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2 sm:mb-3">Attachments</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {card.attachments
                      .filter(att => att.mimetype && att.mimetype.startsWith('image/'))
                      .map((attachment, index) => (
                        <div key={index} className="relative">
                          <img
                            src={`/uploads/${attachment.filename}`}
                            alt={attachment.originalName}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Provenance */}
              {(() => {
                const hasProvenance = card.provenance && Object.keys(card.provenance).length > 0;
                const hasAttachments = card.attachments?.length > 0;
                
                if (!hasProvenance && !hasAttachments) {
                  return null;
                }
                
                return (
                  <div key="provenance-section">
                    <button
                      onClick={() => setProvenanceExpanded(!provenanceExpanded)}
                      className="w-full flex items-center justify-between text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2 sm:mb-3 hover:text-blue-600 dark:hover:text-blue-400 transition-colors touch-manipulation"
                    >
                      <span>Provenance & Evidence</span>
                      {provenanceExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                    {provenanceExpanded && (
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3 text-xs sm:text-sm">
                        {card.provenance?.source_file_id && (
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                            <span className="text-gray-500 dark:text-gray-400 sm:w-32 sm:flex-shrink-0">Source File ID:</span>
                            <span className="text-gray-900 dark:text-white break-all">{card.provenance.source_file_id}</span>
                          </div>
                        )}
                        {card.provenance?.source_path && (
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                            <span className="text-gray-500 dark:text-gray-400 sm:w-32 sm:flex-shrink-0">Source Path:</span>
                            <span className="text-gray-900 dark:text-white break-all">{card.provenance.source_path}</span>
                          </div>
                        )}
                        {card.provenance?.file_hash && (
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                            <span className="text-gray-500 dark:text-gray-400 sm:w-32 sm:flex-shrink-0">File Hash:</span>
                            <span className="text-gray-900 dark:text-white font-mono text-xs break-all">{card.provenance.file_hash}</span>
                          </div>
                        )}
                        {card.provenance?.location && (
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                            <span className="text-gray-500 dark:text-gray-400 sm:w-32 sm:flex-shrink-0">Location:</span>
                            <span className="text-gray-900 dark:text-white break-words">{card.provenance.location}</span>
                          </div>
                        )}
                        {card.provenance?.model_name && (
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                            <span className="text-gray-500 dark:text-gray-400 sm:w-32 sm:flex-shrink-0">Model Name:</span>
                            <span className="text-gray-900 dark:text-white break-words">{card.provenance.model_name}</span>
                          </div>
                        )}
                        {card.provenance?.prompt_version && (
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                            <span className="text-gray-500 dark:text-gray-400 sm:w-32 sm:flex-shrink-0">Prompt Version:</span>
                            <span className="text-gray-900 dark:text-white break-words">{card.provenance.prompt_version}</span>
                          </div>
                        )}
                        {card.provenance?.confidence_score !== null && card.provenance?.confidence_score !== undefined && (
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                            <span className="text-gray-500 dark:text-gray-400 sm:w-32 sm:flex-shrink-0">Confidence Score:</span>
                            <span className="text-gray-900 dark:text-white">
                              {(card.provenance.confidence_score * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {card.provenance?.snippet && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Snippet:</span>
                            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-1 italic break-words">{card.provenance.snippet}</p>
                          </div>
                        )}

                        {/* Regenerate Card Button - Show if snippet exists */}
                        {card.provenance?.snippet && onRegenerate && (
                          <div className="pt-3 border-t border-gray-300 dark:border-gray-600">
                            <button
                              onClick={onRegenerate}
                              disabled={loading}
                              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors touch-manipulation"
                              title="Regenerate this card from the original snippet"
                            >
                              {loading ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  <span>Regenerating...</span>
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-4 w-4" />
                                  <span>Regenerate Card</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {/* View Source File Button - Show if there's a file reference */}
                        {(card.attachments?.length > 0 || card.provenance?.source_file_id) && (
                          <div className={`pt-3 ${card.provenance?.snippet ? '' : 'border-t border-gray-300 dark:border-gray-600'}`}>
                            <button
                              onClick={handleViewSourceFile}
                              disabled={loadingSourceFile}
                              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors touch-manipulation"
                            >
                              {loadingSourceFile ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  <span>Loading source file...</span>
                                </>
                              ) : (
                                <>
                                  <File className="h-4 w-4" />
                                  <span>{showSourceFile ? 'Hide' : 'View'} Source File</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Source File Viewer - Always show when a file is available and viewer is open */}
              {showSourceFile && sourceFileId && (
                <div className="mt-4 bg-gray-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3">
                    <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white flex items-center space-x-2">
                      <File className="h-4 w-4 flex-shrink-0" />
                      <span className="break-words">Source File: {attachment?.originalName || sourceFileId}</span>
                    </h4>
                    <a
                      href={`/uploads/${sourceFileId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-xs sm:text-sm touch-manipulation"
                    >
                      <span>Open in new tab</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  
                  {loadingSourceFile ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : sourceFileContent === 'pdf' ? (
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                      <iframe
                        src={`/uploads/${sourceFileId}`}
                        className="w-full h-96"
                        title="Source file PDF viewer"
                      />
                    </div>
                  ) : sourceFileContent === 'office' ? (
                    <div className="space-y-2">
                      {sourceFileError ? (
                        <div className="text-center py-4 text-red-500 dark:text-red-400">
                          <p className="mb-2">{sourceFileError}</p>
                          <a
                            href={`/uploads/${sourceFileId}`}
                            download={attachment?.originalName || sourceFileId}
                            className="inline-flex items-center space-x-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                          >
                            <File className="h-4 w-4" />
                            <span>Download File Instead</span>
                          </a>
                        </div>
                      ) : (
                        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800" style={{ minHeight: '400px', height: '400px' }}>
                          {(() => {
                            const token = localStorage.getItem('token');
                            if (!token) {
                              return (
                                <div className="text-center py-4 text-red-500 dark:text-red-400">
                                  <p className="mb-2">No authentication token found. Please refresh the page and try again.</p>
                                </div>
                              );
                            }
                            
                            const previewUrl = previewHtmlUrl || '#';
                            
                            return (
                              <div>
                                <iframe
                                  ref={iframeRef}
                                  key={`preview-${sourceFileId}`}
                                  src={previewUrl}
                                  className="w-full"
                                  style={{ border: 'none', minHeight: '400px', height: '400px', width: '100%', background: '#fff' }}
                                  title="Office document viewer"
                                  onLoad={(e) => {
                                    setTimeout(() => {
                                      try {
                                        const iframe = e.target;
                                        if (!iframe) return;
                                        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                                        if (!iframeDoc) return;
                                        const bodyText = iframeDoc.body?.innerText || iframeDoc.body?.textContent || '';
                                        if (bodyText && (bodyText.includes('"error"') || bodyText.includes('authorization denied') || bodyText.includes('Token is not valid'))) {
                                          setSourceFileError('Authentication failed. Please refresh the page and try again.');
                                        }
                                      } catch (err) {
                                        console.log('Could not access iframe content (same-origin policy):', err.message);
                                      }
                                    }, 1000);
                                  }}
                                  onError={(e) => {
                                    console.error('Error loading preview iframe:', e);
                                    setSourceFileError('Failed to load preview. Please try downloading the file.');
                                  }}
                                />
                              </div>
                            );
                          })()}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Previewing: {attachment?.originalName || sourceFileId}
                      </p>
                    </div>
                  ) : sourceFileContent === 'image' ? (
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                      <img
                        src={`/uploads/${sourceFileId}`}
                        alt={attachment?.originalName || 'Source file'}
                        className="w-full h-auto max-h-96 object-contain"
                      />
                    </div>
                  ) : sourceFileContent === 'binary' ? (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      <p className="mb-2">This file is in a binary format (e.g., DOCX, XLSX) and cannot be displayed as text.</p>
                      <p className="text-sm mb-4">You can download it to view in the appropriate application.</p>
                      <a
                        href={`/uploads/${sourceFileId}`}
                        download={attachment?.originalName || sourceFileId}
                        className="inline-flex items-center space-x-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                      >
                        <File className="h-4 w-4" />
                        <span>Download File</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ) : sourceFileContent ? (
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 sm:p-4 bg-white dark:bg-gray-800 max-h-96 overflow-y-auto">
                      <SnippetHighlightedContent 
                        content={sourceFileContent} 
                        snippet={card.provenance?.snippet}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      <p>Unable to load file content. The file may not be accessible or may be a binary format.</p>
                      <a
                        href={`/uploads/${sourceFileId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                      >
                        <File className="h-4 w-4" />
                        <span>Download File</span>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Metadata */}
              <div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2 sm:mb-3">Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                    <span className="text-gray-500 dark:text-gray-400 sm:w-24 sm:flex-shrink-0">Source:</span>
                    <span className="text-gray-900 dark:text-white break-words">{card.source || '—'}</span>
                  </div>
                  {card.metadata?.lastReviewed && (
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                      <span className="text-gray-500 dark:text-gray-400 sm:w-24 sm:flex-shrink-0">Last Reviewed:</span>
                      <span className="text-gray-900 dark:text-white break-words">
                        {new Date(card.metadata.lastReviewed).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {card.metadata?.difficulty && (
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                      <span className="text-gray-500 dark:text-gray-400 sm:w-24 sm:flex-shrink-0">Difficulty:</span>
                      <span className="text-gray-900 dark:text-white">{card.metadata.difficulty}/5</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 sm:p-6 pt-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={handleClose}
                className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-manipulation"
              >
                Close
              </button>
              {onAddToCollection && (
                <button
                  onClick={() => {
                    handleClose();
                    onAddToCollection(card);
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base bg-purple-500 text-white rounded-lg hover:bg-purple-600 active:bg-purple-700 transition-colors flex items-center justify-center space-x-2 touch-manipulation"
                >
                  <FolderPlus className="h-4 w-4" />
                  <span>Add to Collection</span>
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => {
                    handleClose();
                    onEdit(card);
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors touch-manipulation"
                >
                  Edit Card
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardDetailModal;
