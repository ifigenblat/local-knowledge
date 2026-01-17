import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCards, deleteCardAsync, updateCardAsync } from '../store/slices/cardSlice';
import { toast } from 'react-hot-toast';
import { Search, Loader2, ChevronUp, ChevronDown, File, ExternalLink, X, Star, BookOpen, Target, Quote, CheckSquare, Network } from 'lucide-react';
import Card from '../components/Card';

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

const View = () => {
  const dispatch = useDispatch();
  const { cards, loading, error } = useSelector((state) => state.cards);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    content: '',
    type: 'concept',
    category: '',
    tags: [],
    source: '',
    isPublic: false
  });
  const [tagInput, setTagInput] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [provenanceExpanded, setProvenanceExpanded] = useState(false);
  const [showSourceFile, setShowSourceFile] = useState(false);
  const [sourceFileContent, setSourceFileContent] = useState(null);
  const [loadingSourceFile, setLoadingSourceFile] = useState(false);
  const [sourceFileError, setSourceFileError] = useState(null);
  const [previewHtmlUrl, setPreviewHtmlUrl] = useState(null);
  const iframeRef = React.useRef(null);

  useEffect(() => {
    dispatch(fetchCards());
  }, [dispatch]);

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      if (previewHtmlUrl) {
        URL.revokeObjectURL(previewHtmlUrl);
      }
    };
  }, [previewHtmlUrl]);

  const handleDeleteCard = async (cardId) => {
    // Show confirmation dialog
    const isConfirmed = window.confirm('Are you sure you want to delete this card? This action cannot be undone.');
    
    if (!isConfirmed) {
      return;
    }

    try {
      await dispatch(deleteCardAsync(cardId)).unwrap();
      toast.success('Card deleted successfully');
    } catch (error) {
      toast.error(error || 'Failed to delete card');
    }
  };

  const handleViewCard = (card) => {
    setSelectedCard(card);
    setShowModal(true);
    setProvenanceExpanded(false);
    setShowSourceFile(false);
    setSourceFileContent(null);
    // Clean up blob URL if it exists
    if (previewHtmlUrl) {
      URL.revokeObjectURL(previewHtmlUrl);
      setPreviewHtmlUrl(null);
    }
  };

  const handleEditCard = (card) => {
    setEditingCard(card);
    setEditFormData({
      title: card.title || '',
      content: card.content || '',
      type: card.type || 'concept',
      category: card.category || '',
      tags: card.tags || [],
      source: card.source || '',
      isPublic: card.isPublic || false
    });
    setTagInput('');
    setShowEditModal(true);
    setShowModal(false); // Close view modal if open
  };

  const handleUpdateCard = async () => {
    if (!editingCard) return;

    if (!editFormData.title.trim() || !editFormData.content.trim() || !editFormData.category.trim()) {
      toast.error('Title, content, and category are required');
      return;
    }

    try {
      await dispatch(updateCardAsync({
        cardId: editingCard._id,
        cardData: editFormData
      })).unwrap();
      toast.success('Card updated successfully');
      setShowEditModal(false);
      setEditingCard(null);
      // Refresh cards to get updated data
      dispatch(fetchCards());
    } catch (error) {
      toast.error(error || 'Failed to update card');
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !editFormData.tags.includes(tagInput.trim())) {
      setEditFormData({
        ...editFormData,
        tags: [...editFormData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setEditFormData({
      ...editFormData,
      tags: editFormData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleViewSourceFile = async () => {
    if (showSourceFile) {
      setShowSourceFile(false);
      setSourceFileContent(null);
      // Clean up blob URL if it exists
      if (previewHtmlUrl) {
        URL.revokeObjectURL(previewHtmlUrl);
        setPreviewHtmlUrl(null);
      }
      return;
    }

    // Try to get file from attachments first, then fall back to provenance
    const sourceFileId = selectedCard?.attachments?.[0]?.filename || selectedCard?.provenance?.source_file_id;
    if (!sourceFileId) {
      console.error('No source file ID found. Attachments:', selectedCard?.attachments, 'Provenance:', selectedCard?.provenance);
      return;
    }

    console.log('Viewing source file:', sourceFileId);
    setLoadingSourceFile(true);
    try {
      // Check file extension first
      const fileExtension = sourceFileId.split('.').pop()?.toLowerCase() || '';
      
      // Office documents can be previewed via the preview API
      const officeExtensions = ['docx', 'doc', 'xlsx', 'xls'];
      if (officeExtensions.includes(fileExtension)) {
        // For office files, use the preview route which converts them to HTML
        // Test the route first to make sure it's accessible
        const token = localStorage.getItem('token');
        if (!token) {
          setSourceFileError('No authentication token found. Please refresh the page and try again.');
          setSourceFileContent('binary');
          setLoadingSourceFile(false);
          setShowSourceFile(true);
          return;
        }
        
        const previewUrl = `/api/preview/${sourceFileId}?token=${encodeURIComponent(token)}`;
        console.log('Testing preview route for office file:', previewUrl);
        
        // Test preview route by checking response type (don't consume body)
        try {
          const testResponse = await fetch(previewUrl);
          const contentType = testResponse.headers.get('content-type') || '';
          
          if (!testResponse.ok) {
            // Error response - try to read as text to get error message
            const errorText = await testResponse.text();
            let errorMsg = `Failed to load preview: ${testResponse.status}`;
            try {
              const errorJson = JSON.parse(errorText);
              errorMsg = errorJson.error || errorMsg;
            } catch (e) {
              // Not JSON, use text as is
            }
            console.error('Preview route error:', testResponse.status, errorMsg);
            setSourceFileError(errorMsg);
            setSourceFileContent('binary');
          } else if (contentType.includes('application/json')) {
            // Got JSON instead of HTML - means it's an error
            const errorData = await testResponse.json();
            console.error('Preview route returned JSON error:', errorData);
            setSourceFileError(`Preview failed: ${errorData.error || 'Unknown error'}`);
            setSourceFileContent('binary');
          } else if (contentType.includes('text/html')) {
            // Success - HTML response
            // Fetch the HTML and create a blob URL for the iframe
            console.log('Preview route returned HTML - fetching content for iframe');
            try {
              const htmlResponse = await fetch(previewUrl);
              const htmlContent = await htmlResponse.text();
              // Create a blob URL from the HTML content
              const blob = new Blob([htmlContent], { type: 'text/html' });
              const blobUrl = URL.createObjectURL(blob);
              setPreviewHtmlUrl(blobUrl);
              setSourceFileContent('office');
              setSourceFileError(null); // Clear any previous errors
            } catch (err) {
              console.error('Error fetching HTML content:', err);
              setSourceFileError(`Failed to load preview content: ${err.message}`);
              setSourceFileContent('binary');
            }
          } else {
            // Unexpected content type
            console.warn('Preview route returned unexpected content type:', contentType);
            setSourceFileContent('office'); // Try to load anyway
          }
        } catch (error) {
          console.error('Error testing preview route:', error);
          setSourceFileError(`Failed to connect to preview service: ${error.message}`);
          setSourceFileContent('binary');
        }
        
        setLoadingSourceFile(false);
        setShowSourceFile(true);
        return;
      }
      
      // Archive files that can't be previewed
      const archiveExtensions = ['zip', 'rar', '7z', 'tar', 'gz'];
      if (archiveExtensions.includes(fileExtension)) {
        setSourceFileContent('binary');
        setLoadingSourceFile(false);
        setShowSourceFile(true);
        return;
      }

      // Try to fetch the file content from the backend via proxy
      const response = await fetch(`/uploads/${sourceFileId}`);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        
        // Check if it's a text file
        if (contentType.startsWith('text/') || 
            contentType.includes('json') ||
            contentType.includes('xml')) {
          const text = await response.text();
          setSourceFileContent(text);
        } else if (contentType.includes('pdf') || fileExtension === 'pdf') {
          // For PDF, we'll show it in an iframe
          setSourceFileContent('pdf');
        } else if (contentType.startsWith('image/')) {
          // Images are handled differently
          setSourceFileContent('image');
        } else if (contentType.includes('wordprocessingml') || 
                   contentType.includes('spreadsheetml') ||
                   contentType.includes('officedocument')) {
          // Binary Office documents - can't display as text
          setSourceFileContent('binary');
        } else {
          // Try to read as text for unknown types
          try {
            const text = await response.text();
            // If it contains null bytes or is very large and looks binary, it's likely binary
            if (text.includes('\0') || (text.length > 0 && text.charCodeAt(0) < 32 && text.charCodeAt(0) !== 9 && text.charCodeAt(0) !== 10 && text.charCodeAt(0) !== 13)) {
              setSourceFileContent('binary');
            } else {
              setSourceFileContent(text);
            }
          } catch (error) {
            console.error('Error reading file as text:', error);
            setSourceFileContent('binary');
          }
        }
      } else {
        console.error('Failed to fetch file:', response.status, response.statusText, `File: ${sourceFileId}`);
        setSourceFileContent(null);
      }
    } catch (error) {
      console.error('Error loading source file:', error);
      setSourceFileContent(null);
    } finally {
      setLoadingSourceFile(false);
      setShowSourceFile(true);
    }
  };

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

  const getTypeColor = (type) => {
    const colors = {
      concept: 'bg-blue-500',
      action: 'bg-green-500',
      quote: 'bg-purple-500',
      checklist: 'bg-orange-500',
      mindmap: 'bg-indigo-500'
    };
    return colors[type] || 'bg-gray-500';
  };

  const getTypeIconForHeader = (type) => {
    const IconComponent = getTypeIcon(type);
    return IconComponent;
  };

  const getTypeColorForHeader = (type) => {
    return getTypeColor(type);
  };

  // Filter cards based on search and filters
  const filteredCards = cards.filter(card => {
    const matchesSearch = card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         card.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         card.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' || card.type === filterType;
    const matchesCategory = filterCategory === 'all' || card.category === filterCategory;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  // Get unique types and categories for filters
  const types = [...new Set(cards.map(card => card.type))];
  const categories = [...new Set(cards.map(card => card.category))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading cards...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading cards: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pt-12 sm:pt-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          View Cards ({filteredCards.length})
        </h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Browse and view your learning cards
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search cards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="sm:w-48">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Types</option>
              {types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="sm:w-48">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {filteredCards.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
          {cards.length === 0 ? (
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No cards found. Upload some content to get started!
              </p>
              <a
                href="/upload"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload Content
              </a>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              No cards match your current search and filter criteria.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredCards.map((card) => (
            <Card 
              key={card._id} 
              card={card} 
              disableDefaultModal={true}
              onCardClick={handleViewCard}
              onEdit={(card) => {
                setShowModal(false);
                handleEditCard(card);
              }}
              onDelete={handleDeleteCard}
            />
          ))}
        </div>
      )}

      {/* Card Detail Modal */}
      {showModal && selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="relative max-w-4xl max-h-[98vh] sm:max-h-[95vh] w-full flex flex-col">
            <button
              onClick={() => {
                setShowModal(false);
                setSelectedCard(null);
                setProvenanceExpanded(false);
                setShowSourceFile(false);
                if (previewHtmlUrl) {
                  URL.revokeObjectURL(previewHtmlUrl);
                  setPreviewHtmlUrl(null);
                }
              }}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white hover:text-gray-300 active:text-gray-400 z-20 bg-black bg-opacity-50 rounded-full p-2 transition-colors touch-manipulation"
              aria-label="Close modal"
            >
              ×
            </button>
            <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden flex flex-col max-h-full">
              {/* Modal Header - Fixed with Color */}
              <div className={`${getTypeColor(selectedCard.type)} p-4 sm:p-6 flex-shrink-0`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    <div className="h-6 w-6 sm:h-8 sm:w-8 text-white flex-shrink-0">
                      {getTypeIcon(selectedCard.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg sm:text-2xl font-bold text-white truncate">
                        {selectedCard.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-white/80 text-xs sm:text-sm mt-1">
                        <span className="capitalize">{selectedCard.type}</span>
                        <span>•</span>
                        <span>{selectedCard.category}</span>
                        {selectedCard.metadata?.rating && (
                          <>
                            <span>•</span>
                            <div className="flex items-center space-x-1">
                              <Star className="h-4 w-4 text-yellow-300 fill-current" />
                              <span>{selectedCard.metadata.rating}/5</span>
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

              {/* Modal Content */}
              <div className="space-y-4 sm:space-y-6">
                {/* Content */}
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2 sm:mb-3">Content</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4">
                    <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                      {selectedCard.content}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                {selectedCard.tags && selectedCard.tags.length > 0 && (
                  <div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2 sm:mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedCard.tags.map((tag, index) => (
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

                {/* Provenance */}
                {(selectedCard.provenance || selectedCard.attachments?.length > 0) && (
                  <div>
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
                        {selectedCard.provenance?.source_file_id && (
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                            <span className="text-gray-500 dark:text-gray-400 sm:w-32 sm:flex-shrink-0">Source File ID:</span>
                            <span className="text-gray-900 dark:text-white break-all">{selectedCard.provenance.source_file_id}</span>
                          </div>
                        )}
                        {selectedCard.provenance?.source_path && (
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                            <span className="text-gray-500 dark:text-gray-400 sm:w-32 sm:flex-shrink-0">Source Path:</span>
                            <span className="text-gray-900 dark:text-white break-all">{selectedCard.provenance.source_path}</span>
                          </div>
                        )}
                        {selectedCard.provenance?.file_hash && (
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                            <span className="text-gray-500 dark:text-gray-400 sm:w-32 sm:flex-shrink-0">File Hash:</span>
                            <span className="text-gray-900 dark:text-white font-mono text-xs break-all">{selectedCard.provenance.file_hash}</span>
                          </div>
                        )}
                        {selectedCard.provenance?.location && (
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                            <span className="text-gray-500 dark:text-gray-400 sm:w-32 sm:flex-shrink-0">Location:</span>
                            <span className="text-gray-900 dark:text-white break-words">{selectedCard.provenance.location}</span>
                          </div>
                        )}
                        {selectedCard.provenance?.model_name && (
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                            <span className="text-gray-500 dark:text-gray-400 sm:w-32 sm:flex-shrink-0">Model Name:</span>
                            <span className="text-gray-900 dark:text-white break-words">{selectedCard.provenance.model_name}</span>
                          </div>
                        )}
                        {selectedCard.provenance?.prompt_version && (
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                            <span className="text-gray-500 dark:text-gray-400 sm:w-32 sm:flex-shrink-0">Prompt Version:</span>
                            <span className="text-gray-900 dark:text-white break-words">{selectedCard.provenance.prompt_version}</span>
                          </div>
                        )}
                        {selectedCard.provenance?.confidence_score !== null && selectedCard.provenance?.confidence_score !== undefined && (
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                            <span className="text-gray-500 dark:text-gray-400 sm:w-32 sm:flex-shrink-0">Confidence Score:</span>
                            <span className="text-gray-900 dark:text-white">
                              {(selectedCard.provenance.confidence_score * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {selectedCard.createdAt && (
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                            <span className="text-gray-500 dark:text-gray-400 sm:w-32 sm:flex-shrink-0">Created:</span>
                            <span className="text-gray-900 dark:text-white break-words">
                              {new Date(selectedCard.createdAt).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {selectedCard.provenance?.snippet && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Snippet:</span>
                            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-1 italic break-words">{selectedCard.provenance.snippet}</p>
                          </div>
                        )}

                        {/* View Source File Button */}
                        {(selectedCard.attachments?.length > 0 || selectedCard.provenance?.source_file_id) && (
                          <div className="pt-3 border-t border-gray-300 dark:border-gray-600">
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
                )}

                {/* Source File Viewer */}
                {showSourceFile && (selectedCard.provenance?.source_file_id || selectedCard.attachments?.[0]?.filename) && (() => {
                  const sourceFileId = selectedCard.attachments?.[0]?.filename || selectedCard.provenance.source_file_id;
                  const attachment = selectedCard.attachments?.[0];
                  
                  return (
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
                              <iframe
                                ref={iframeRef}
                                key={`preview-${sourceFileId}`}
                                src={previewHtmlUrl || '#'}
                                className="w-full"
                                style={{ border: 'none', minHeight: '400px', height: '400px', width: '100%', background: '#fff' }}
                                title="Office document viewer"
                              />
                            </div>
                          )}
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
                          <p className="mb-2">This file is in a binary format and cannot be displayed as text.</p>
                          <a
                            href={`/uploads/${sourceFileId}`}
                            download={attachment?.originalName || sourceFileId}
                            className="inline-flex items-center space-x-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors mt-4"
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
                            snippet={selectedCard.provenance?.snippet}
                          />
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          <p>Unable to load file content.</p>
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
                  );
                })()}
              </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-6 pt-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setSelectedCard(null);
                      setProvenanceExpanded(false);
                      setShowSourceFile(false);
                      if (previewHtmlUrl) {
                        URL.revokeObjectURL(previewHtmlUrl);
                        setPreviewHtmlUrl(null);
                      }
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-manipulation"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      handleEditCard(selectedCard);
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors touch-manipulation"
                  >
                    Edit Card
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Card Modal */}
      {showEditModal && editingCard && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="relative max-w-3xl max-h-[98vh] sm:max-h-[95vh] w-full flex flex-col">
            <button
              onClick={() => {
                setShowEditModal(false);
                setEditingCard(null);
              }}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white hover:text-gray-300 active:text-gray-400 z-20 bg-black bg-opacity-50 rounded-full p-2 transition-colors touch-manipulation"
              aria-label="Close modal"
            >
              ×
            </button>
            <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden flex flex-col max-h-full">
              {/* Modal Header - Fixed with Color */}
              <div className={`${getTypeColorForHeader(editFormData.type)} p-4 sm:p-6 flex-shrink-0`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    <div className="h-6 w-6 sm:h-8 sm:w-8 text-white flex-shrink-0">
                      {getTypeIconForHeader(editFormData.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg sm:text-2xl font-bold text-white truncate">
                        Edit Card
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-white/80 text-xs sm:text-sm mt-1">
                        <span className="capitalize">{editFormData.type}</span>
                        {editFormData.category && (
                          <>
                            <span>•</span>
                            <span>{editFormData.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {/* Form */}
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={editFormData.content}
                    onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    required
                  />
                </div>

                {/* Type and Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Type
                    </label>
                    <select
                      value={editFormData.type}
                      onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="concept">Concept</option>
                      <option value="action">Action</option>
                      <option value="quote">Quote</option>
                      <option value="checklist">Checklist</option>
                      <option value="mindmap">Mindmap</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editFormData.category}
                      onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Add a tag and press Enter"
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {editFormData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {editFormData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-full"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Source */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Source
                  </label>
                  <input
                    type="text"
                    value={editFormData.source}
                    onChange={(e) => setEditFormData({ ...editFormData, source: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Is Public */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={editFormData.isPublic}
                    onChange={(e) => setEditFormData({ ...editFormData, isPublic: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Make this card public
                  </label>
                </div>
              </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-6 pt-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingCard(null);
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-manipulation"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateCard}
                    className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors touch-manipulation"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default View;



