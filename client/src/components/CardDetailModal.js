import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
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
  FolderPlus,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { checkAIStatusAsync, regenerateCardAsync } from '../store/slices/cardSlice';
import { toast } from 'react-hot-toast';

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

// Component to load and display images with authentication
const AuthenticatedImage = ({ src, alt, className }) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadImage = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(src, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to load');
        const blob = await response.blob();
        if (!cancelled) {
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };
    loadImage();
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  if (loading) {
    return <div className={`${className} bg-gray-200 dark:bg-gray-700 animate-pulse`} />;
  }
  if (error || !blobUrl) {
    return <div className={`${className} bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 text-xs`}>Failed to load</div>;
  }
  return <img src={blobUrl} alt={alt} className={className} />;
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
  const dispatch = useDispatch();
  const { aiStatus, loading: cardsLoading } = useSelector(state => state.cards);
  const [provenanceExpanded, setProvenanceExpanded] = useState(false);
  const [showSourceFile, setShowSourceFile] = useState(false);
  const [sourceFileContent, setSourceFileContent] = useState(null);
  const [loadingSourceFile, setLoadingSourceFile] = useState(false);
  const [sourceFileError, setSourceFileError] = useState(null);
  const [copiedCardId, setCopiedCardId] = useState(false);
  const [previewHtmlUrl, setPreviewHtmlUrl] = useState(null);
  const [fileBlobUrl, setFileBlobUrl] = useState(null);
  const iframeRef = useRef(null);
  // Use refs to persist comparison state across re-renders caused by card prop changes
  const comparisonDataRef = useRef(null);
  const showComparisonRef = useRef(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const timeoutRef = useRef(null);
  const isRegeneratingRef = useRef(false); // Prevent double-clicks
  
  // Sync refs with state - but only update refs when state is truthy to prevent reset
  useEffect(() => {
    if (comparisonData) {
      comparisonDataRef.current = comparisonData;
    }
    if (showComparison) {
      showComparisonRef.current = showComparison;
    }
    // Don't reset refs when state becomes false - let them persist
  }, [comparisonData, showComparison]);

  // Check AI status when modal opens
  useEffect(() => {
    if (isOpen) {
      dispatch(checkAIStatusAsync());
    }
  }, [isOpen, dispatch]);

  // Track previous isOpen to detect when modal actually closes (not just re-renders)
  const prevIsOpenRef = useRef(isOpen);
  
  // Reset state when modal closes (but NOT when card changes during comparison)
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    const isNowOpen = isOpen;
    prevIsOpenRef.current = isOpen;
    
    // Always reset when modal closes, regardless of comparison state
    if (wasOpen && !isNowOpen) {
      setProvenanceExpanded(false);
      setShowSourceFile(false);
      setSourceFileContent(null);
      setShowComparison(false);
      setComparisonData(null);
      setLoadingComparison(false);
      // Reset refs
      comparisonDataRef.current = null;
      showComparisonRef.current = false;
      isRegeneratingRef.current = false;
      // Clear timeout if any
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (previewHtmlUrl) {
        URL.revokeObjectURL(previewHtmlUrl);
        setPreviewHtmlUrl(null);
      }
      if (fileBlobUrl) {
        URL.revokeObjectURL(fileBlobUrl);
        setFileBlobUrl(null);
      }
    }
    // Only reset when modal closes, not when card or other props change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, showComparison]);


  // Clean up blob URLs when previewHtmlUrl or fileBlobUrl changes
  useEffect(() => {
    return () => {
      if (previewHtmlUrl) {
        URL.revokeObjectURL(previewHtmlUrl);
      }
      if (fileBlobUrl) {
        URL.revokeObjectURL(fileBlobUrl);
      }
    };
  }, [previewHtmlUrl, fileBlobUrl]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);


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
      if (fileBlobUrl) {
        URL.revokeObjectURL(fileBlobUrl);
        setFileBlobUrl(null);
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

      // Handle PDF files - fetch with auth and create blob URL
      if (fileExtension === 'pdf') {
        try {
          const response = await fetch(`/uploads/${sourceFileId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            setFileBlobUrl(blobUrl);
            setSourceFileContent('pdf');
          } else {
            setSourceFileError('Failed to load PDF file');
            setSourceFileContent('binary');
          }
        } catch (error) {
          console.error('Error loading PDF:', error);
          setSourceFileError('Failed to load PDF file');
          setSourceFileContent('binary');
        }
        setLoadingSourceFile(false);
        return;
      }

      // Handle image files - fetch with auth and create blob URL
      if (attachment?.mimetype && attachment.mimetype.startsWith('image/')) {
        try {
          const response = await fetch(`/uploads/${sourceFileId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            setFileBlobUrl(blobUrl);
            setSourceFileContent('image');
          } else {
            setSourceFileError('Failed to load image');
            setSourceFileContent('binary');
          }
        } catch (error) {
          console.error('Error loading image:', error);
          setSourceFileError('Failed to load image');
          setSourceFileContent('binary');
        }
        setLoadingSourceFile(false);
        return;
      }
      
      // Also check file extension for images (in case mimetype is not set)
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension)) {
        try {
          const response = await fetch(`/uploads/${sourceFileId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            setFileBlobUrl(blobUrl);
            setSourceFileContent('image');
          } else {
            setSourceFileError('Failed to load image');
            setSourceFileContent('binary');
          }
        } catch (error) {
          console.error('Error loading image:', error);
          setSourceFileError('Failed to load image');
          setSourceFileContent('binary');
        }
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
    // Reset all state when closing, including comparison state
    setProvenanceExpanded(false);
    setShowSourceFile(false);
    setSourceFileContent(null);
    setShowComparison(false);
    setComparisonData(null);
    setLoadingComparison(false);
    // Reset refs
    comparisonDataRef.current = null;
    showComparisonRef.current = false;
    isRegeneratingRef.current = false;
    // Clear timeout if any
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (previewHtmlUrl) {
      URL.revokeObjectURL(previewHtmlUrl);
      setPreviewHtmlUrl(null);
    }
    if (fileBlobUrl) {
      URL.revokeObjectURL(fileBlobUrl);
      setFileBlobUrl(null);
    }
    onClose();
  };

  // Don't return null if we're in comparison mode - preserve the view even if card is temporarily null
  // This prevents the blank page issue when card prop changes during comparison
  if (!isOpen) return null;
  if (!card && !showComparison) return null;

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
          <div className={`${getTypeColorForHeader(card?.type || 'concept')} p-4 sm:p-6 flex-shrink-0`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                <div className="h-6 w-6 sm:h-8 sm:w-8 text-white flex-shrink-0">
                  {getTypeIcon(card?.type || 'concept')}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-2xl font-bold text-white truncate">
                    {card?.title || comparisonData?.ruleBased?.title || 'Loading...'}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-white/80 text-xs sm:text-sm mt-1">
                    {card && (
                      <>
                        <span className="capitalize">{card.type}</span>
                        <span>•</span>
                        <span>{card.category}</span>
                        <span>•</span>
                        <span>{card.generatedBy === 'ai' ? 'AI' : 'Rule-based'}</span>
                        {card.metadata?.rating && (
                          <>
                            <span>•</span>
                            <div className="flex items-center space-x-1">
                              <Star className="h-4 w-4 text-yellow-300 fill-current" />
                              <span>{card.metadata.rating}/5</span>
                            </div>
                          </>
                        )}
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
              {/* Card ID - Shareable */}
              {card?.cardId && (
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2 sm:mb-3">Card ID</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <code className="text-lg sm:text-xl font-mono font-bold text-blue-600 dark:text-blue-400">
                          {card.cardId}
                        </code>
                        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
                          (Share this ID to point to this card)
                        </span>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(card.cardId);
                            setCopiedCardId(true);
                            toast.success('Card ID copied to clipboard!');
                            setTimeout(() => setCopiedCardId(false), 2000);
                          } catch (err) {
                            toast.error('Failed to copy Card ID');
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm sm:text-base"
                        title="Copy Card ID"
                      >
                        {copiedCardId ? (
                          <>
                            <Check className="h-4 w-4" />
                            <span className="hidden sm:inline">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            <span className="hidden sm:inline">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 sm:hidden">
                      Share this ID to point to this card
                    </p>
                  </div>
                </div>
              )}
              
              {/* Content */}
              <div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2 sm:mb-3">Content</h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4">
                  <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                    {card?.content || ''}
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
                          <AuthenticatedImage
                            src={`/uploads/${attachment.filename}`}
                            alt={attachment.originalName}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Regenerate buttons - directly before Provenance, only when snippet exists */}
              {card?.provenance?.snippet && onRegenerate && !showComparison && (
                <div className="mb-4 space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={async () => {
                        if (!card) return;
                        try {
                          const result = await dispatch(regenerateCardAsync({ 
                            cardId: card?._id || comparisonData?.ruleBased?._id, 
                            useAI: false 
                          })).unwrap();
                          toast.success('Card regenerated successfully using rule-based');
                          onRegenerate(result);
                        } catch (error) {
                          const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to regenerate card';
                          toast.error(errorMessage);
                        }
                      }}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors touch-manipulation"
                      title="Regenerate using rule-based algorithm (fast, deterministic)"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span className="text-xs sm:text-sm">Regenerating...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          <span className="text-xs sm:text-sm">Regenerate (Rule-based)</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={async () => {
                        if (isRegeneratingRef.current) return;
                        if (!card && !comparisonData?.ruleBased) {
                          toast.error('No card selected');
                          return;
                        }
                        if (!aiStatus.available) {
                          toast.error(aiStatus.error || 'AI is not available. Please check Ollama configuration.');
                          return;
                        }
                        try {
                          isRegeneratingRef.current = true;
                          setLoadingComparison(true);
                          const timeoutId = setTimeout(() => {
                            if (loadingComparison) {
                              toast.error('AI regeneration is taking too long. Please try again.');
                              setLoadingComparison(false);
                              setShowComparison(false);
                              setComparisonData(null);
                              isRegeneratingRef.current = false;
                            }
                          }, 60000);
                          timeoutRef.current = timeoutId;
                          const result = await dispatch(regenerateCardAsync({ 
                            cardId: card?._id || comparisonData?.ruleBased?._id, 
                            useAI: true,
                            comparisonMode: true
                          })).unwrap();
                          if (timeoutRef.current) {
                            clearTimeout(timeoutRef.current);
                            timeoutRef.current = null;
                          }
                          if (result && result.comparison === true && result.ruleBased) {
                            const comparisonDataToSet = {
                              ruleBased: result.ruleBased,
                              ai: result.ai || null,
                              aiError: result.aiError || null
                            };
                            if (timeoutRef.current) {
                              clearTimeout(timeoutRef.current);
                              timeoutRef.current = null;
                            }
                            setLoadingComparison(false);
                            comparisonDataRef.current = comparisonDataToSet;
                            showComparisonRef.current = true;
                            setComparisonData(comparisonDataToSet);
                            setShowComparison(true);
                          } else {
                            if (timeoutRef.current) {
                              clearTimeout(timeoutRef.current);
                              timeoutRef.current = null;
                            }
                            toast.success('Card regenerated successfully using AI');
                            onRegenerate(result);
                            setShowComparison(false);
                            setComparisonData(null);
                            setLoadingComparison(false);
                          }
                        } catch (error) {
                          console.error('AI regeneration error:', error);
                          if (timeoutRef.current) {
                            clearTimeout(timeoutRef.current);
                            timeoutRef.current = null;
                          }
                          const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to regenerate card';
                          toast.error(errorMessage);
                          setShowComparison(false);
                          setComparisonData(null);
                          setLoadingComparison(false);
                        } finally {
                          isRegeneratingRef.current = false;
                        }
                      }}
                      disabled={loading || loadingComparison || !aiStatus.available}
                      className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 ${
                        aiStatus.available 
                          ? 'bg-purple-500 hover:bg-purple-600 active:bg-purple-700' 
                          : 'bg-gray-400 cursor-not-allowed'
                      } disabled:bg-gray-400 text-white rounded-lg transition-colors touch-manipulation`}
                      title={
                        aiStatus.checking 
                          ? 'Checking AI availability...'
                          : aiStatus.available 
                          ? 'Regenerate using AI and compare with rule-based (requires Ollama)'
                          : aiStatus.error || 'AI (Ollama) is not available. See tooltip for details.'
                      }
                    >
                      {loading || loadingComparison ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span className="text-xs sm:text-sm">Generating comparison...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          <span className="text-xs sm:text-sm">Regenerate (AI)</span>
                          {!aiStatus.available && !aiStatus.checking && (
                            <AlertCircle className="h-3 w-3" />
                          )}
                        </>
                      )}
                    </button>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      Rule-based: Fast and deterministic. AI: Better quality, requires Ollama.
                    </p>
                    {aiStatus.checking && (
                      <p className="text-xs text-blue-500 dark:text-blue-400 text-center">
                        Checking AI availability...
                      </p>
                    )}
                    {!aiStatus.checking && !aiStatus.available && aiStatus.error && (
                      <div className="text-xs text-amber-600 dark:text-amber-400 text-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded">
                        <div className="flex items-center justify-center space-x-1">
                          <AlertCircle className="h-3 w-3" />
                          <span className="font-medium">AI Unavailable:</span>
                        </div>
                        <span className="block mt-1">{aiStatus.error}</span>
                      </div>
                    )}
                    {!aiStatus.checking && aiStatus.available && (
                      <p className="text-xs text-green-600 dark:text-green-400 text-center">
                        ✓ AI (Ollama) is available and ready
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Compare Regeneration Results - shown when AI returns comparison (same level as regenerate buttons) */}
              {(() => {
                const shouldShow = showComparison || showComparisonRef.current;
                const dataToUse = comparisonData || comparisonDataRef.current;
                if (!showComparison && showComparisonRef.current) {
                  setTimeout(() => {
                    setShowComparison(true);
                    if (comparisonDataRef.current && !comparisonData) {
                      setComparisonData(comparisonDataRef.current);
                    }
                  }, 0);
                }
                if (!shouldShow || !dataToUse?.ruleBased) {
                  return null;
                }
                return (
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 space-y-4">
                    {loadingComparison ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Generating both versions for comparison...</p>
                      </div>
                    ) : comparisonData && dataToUse.ruleBased ? (
                      <div className="space-y-4">
                        <div className="text-center">
                          <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Compare Regeneration Results</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Choose which version to apply to your card</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50 dark:bg-green-900/10">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <h5 className="font-semibold text-green-700 dark:text-green-400">Rule-Based</h5>
                              </div>
                              <span className="text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded">Fast</span>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div><span className="font-medium text-gray-700 dark:text-gray-300">Title:</span><p className="text-gray-900 dark:text-white mt-1">{dataToUse.ruleBased?.title || 'N/A'}</p></div>
                              <div><span className="font-medium text-gray-700 dark:text-gray-300">Content:</span><p className="text-gray-900 dark:text-white mt-1 text-xs line-clamp-4">{dataToUse.ruleBased?.content || 'N/A'}</p></div>
                              <div><span className="font-medium text-gray-700 dark:text-gray-300">Type:</span><span className="ml-2 text-gray-900 dark:text-white capitalize">{dataToUse.ruleBased?.type || 'N/A'}</span></div>
                              <div><span className="font-medium text-gray-700 dark:text-gray-300">Category:</span><span className="ml-2 text-gray-900 dark:text-white">{dataToUse.ruleBased?.category || 'N/A'}</span></div>
                              {dataToUse.ruleBased?.tags && dataToUse.ruleBased.tags.length > 0 && (
                                <div><span className="font-medium text-gray-700 dark:text-gray-300">Tags:</span><div className="flex flex-wrap gap-1 mt-1">{dataToUse.ruleBased.tags.map((tag, idx) => (<span key={idx} className="text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-0.5 rounded">{tag}</span>))}</div></div>
                              )}
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  const result = await dispatch(regenerateCardAsync({ cardId: card?._id || comparisonData?.ruleBased?._id || dataToUse?.ruleBased?._id, useAI: true, selectedVersion: 'ruleBased', comparisonData: comparisonData || dataToUse })).unwrap();
                                  setShowComparison(false); setComparisonData(null); comparisonDataRef.current = null; showComparisonRef.current = false; setLoadingComparison(false);
                                  toast.success('Card updated with rule-based version');
                                  setTimeout(() => { if (result && typeof result === 'object') onRegenerate(result); }, 0);
                                } catch (error) {
                                  toast.error(typeof error === 'string' ? error : error?.message || 'Failed to apply version');
                                }
                              }}
                              className="w-full mt-4 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
                            >Use This Version</button>
                          </div>
                          <div className={`border-2 rounded-lg p-4 ${dataToUse.ai ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'}`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-full ${dataToUse.ai ? 'bg-purple-500' : 'bg-gray-400'}`}></div>
                                <h5 className={`font-semibold ${dataToUse.ai ? 'text-purple-700 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`}>AI-Generated</h5>
                              </div>
                              {dataToUse.ai && <span className="text-xs bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">Smart</span>}
                            </div>
                            {dataToUse.ai ? (
                              <div className="space-y-2 text-sm">
                                <div><span className="font-medium text-gray-700 dark:text-gray-300">Title:</span><p className="text-gray-900 dark:text-white mt-1">{dataToUse.ai?.title || 'N/A'}</p></div>
                                <div><span className="font-medium text-gray-700 dark:text-gray-300">Content:</span><p className="text-gray-900 dark:text-white mt-1 text-xs line-clamp-4">{dataToUse.ai?.content || 'N/A'}</p></div>
                                <div><span className="font-medium text-gray-700 dark:text-gray-300">Type:</span><span className="ml-2 text-gray-900 dark:text-white capitalize">{dataToUse.ai?.type || 'N/A'}</span></div>
                                <div><span className="font-medium text-gray-700 dark:text-gray-300">Category:</span><span className="ml-2 text-gray-900 dark:text-white">{dataToUse.ai?.category || 'N/A'}</span></div>
                                {dataToUse.ai?.tags && dataToUse.ai.tags.length > 0 && (
                                  <div><span className="font-medium text-gray-700 dark:text-gray-300">Tags:</span><div className="flex flex-wrap gap-1 mt-1">{dataToUse.ai.tags.map((tag, idx) => (<span key={idx} className="text-xs bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded">{tag}</span>))}</div></div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-500 dark:text-gray-400">{dataToUse.aiError || 'AI regeneration failed'}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Only rule-based version is available</p>
                              </div>
                            )}
                            {dataToUse.ai ? (
                              <button
                                onClick={async () => {
                                  try {
                                    const result = await dispatch(regenerateCardAsync({ cardId: card?._id || comparisonData?.ruleBased?._id || dataToUse?.ruleBased?._id, useAI: true, selectedVersion: 'ai', comparisonData: comparisonData || dataToUse })).unwrap();
                                    setShowComparison(false); setComparisonData(null); comparisonDataRef.current = null; showComparisonRef.current = false; setLoadingComparison(false);
                                    toast.success('Card updated with AI-generated version');
                                    setTimeout(() => { if (result && typeof result === 'object') onRegenerate(result); }, 0);
                                  } catch (error) {
                                    toast.error(typeof error === 'string' ? error : error?.message || 'Failed to apply version');
                                  }
                                }}
                                className="w-full mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm font-medium"
                              >Use This Version</button>
                            ) : (
                              <button disabled className="w-full mt-4 px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed text-sm font-medium">Not Available</button>
                            )}
                          </div>
                        </div>
                        <button onClick={() => { setShowComparison(false); setComparisonData(null); }} className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium">Cancel</button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">No comparison data available</p>
                      </div>
                    )}
                  </div>
                );
              })()}

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
                    {(fileBlobUrl || previewHtmlUrl) ? (
                      <button
                        type="button"
                        onClick={() => {
                          // Office docs: blob URL can show blank in new tab; write HTML to new window
                          if (sourceFileContent === 'office' && previewHtmlUrl) {
                            const win = window.open('', '_blank');
                            if (win) {
                              fetch(previewHtmlUrl)
                                .then(r => r.text())
                                .then(html => {
                                  win.document.open();
                                  win.document.write(html);
                                  win.document.close();
                                })
                                .catch(() => {
                                  win.document.body.innerHTML = '<p>Failed to load preview.</p>';
                                });
                            }
                          } else if (sourceFileContent === 'pdf' && fileBlobUrl) {
                            const html = `<!DOCTYPE html><html><head><title>PDF Preview</title><style>body{margin:0;height:100vh}</style></head><body><embed src="${fileBlobUrl}" type="application/pdf" width="100%" height="100%" style="position:absolute;top:0;left:0;border:none" /></body></html>`;
                            const blob = new Blob([html], { type: 'text/html' });
                            const htmlUrl = URL.createObjectURL(blob);
                            window.open(htmlUrl, '_blank');
                            setTimeout(() => URL.revokeObjectURL(htmlUrl), 5000);
                          } else if (sourceFileContent === 'image' && fileBlobUrl) {
                            const html = `<!DOCTYPE html><html><head><title>Image Preview</title><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#1f2937}</style></head><body><img src="${fileBlobUrl}" alt="Preview" style="max-width:100%;max-height:100%;object-fit:contain" /></body></html>`;
                            const blob = new Blob([html], { type: 'text/html' });
                            const htmlUrl = URL.createObjectURL(blob);
                            window.open(htmlUrl, '_blank');
                            setTimeout(() => URL.revokeObjectURL(htmlUrl), 5000);
                          } else if (fileBlobUrl) {
                            window.open(fileBlobUrl, '_blank');
                          }
                        }}
                        className="flex items-center space-x-1 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-xs sm:text-sm touch-manipulation cursor-pointer bg-transparent border-none p-0 font-inherit"
                      >
                        <span>Open in new tab</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs sm:text-sm">Loading...</span>
                    )}
                  </div>
                  
                  {loadingSourceFile ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : sourceFileContent === 'pdf' ? (
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                      {fileBlobUrl ? (
                        <iframe
                          src={fileBlobUrl}
                          className="w-full h-96"
                          title="Source file PDF viewer"
                        />
                      ) : (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          <p>Unable to load PDF preview.</p>
                        </div>
                      )}
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
                                        // Silently handle same-origin policy restrictions
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
                      {fileBlobUrl ? (
                        <img
                          src={fileBlobUrl}
                          alt={attachment?.originalName || 'Source file'}
                          className="w-full h-auto max-h-96 object-contain"
                        />
                      ) : (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          <p>Unable to load image preview.</p>
                        </div>
                      )}
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
