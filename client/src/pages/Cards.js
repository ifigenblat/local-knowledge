import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { fetchCards, deleteCardAsync, updateCardAsync, createCardAsync } from '../store/slices/cardSlice';
import { fetchCollections, addCardToCollection, removeCardFromCollection, fetchCollection } from '../store/slices/collectionSlice';
import { toast } from 'react-hot-toast';
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Star,
  Calendar,
  Tag,
  FileText,
  Image as ImageIcon,
  FolderPlus,
  Folder,
  X,
  File,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BookOpen,
  Target,
  Quote,
  CheckSquare,
  Network,
  Plus
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

const Cards = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const collectionId = searchParams.get('collection');
  
  const { cards, loading, error } = useSelector((state) => state.cards);
  const { collections } = useSelector((state) => state.collections);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCard, setSelectedCard] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [cardForCollection, setCardForCollection] = useState(null);
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
  const [selectedCardIds, setSelectedCardIds] = useState(new Set());
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [provenanceExpanded, setProvenanceExpanded] = useState(false);
  const [showSourceFile, setShowSourceFile] = useState(false);
  const [sourceFileContent, setSourceFileContent] = useState(null);
  const [loadingSourceFile, setLoadingSourceFile] = useState(false);
  const [sourceFileError, setSourceFileError] = useState(null);
  const [previewHtmlUrl, setPreviewHtmlUrl] = useState(null);
  const iframeRef = React.useRef(null);

  useEffect(() => {
    dispatch(fetchCards());
    dispatch(fetchCollections());
  }, [dispatch]);

  // Fetch collection when collectionId is in URL
  useEffect(() => {
    if (collectionId) {
      dispatch(fetchCollection(collectionId))
        .unwrap()
        .then((collection) => {
          setSelectedCollection(collection);
        })
        .catch((error) => {
          toast.error('Failed to load collection');
          // Clear invalid collection ID from URL
          setSearchParams({});
        });
    } else {
      setSelectedCollection(null);
    }
  }, [collectionId, dispatch, setSearchParams]);

  const handleDeleteCard = async (cardId) => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      try {
        await dispatch(deleteCardAsync(cardId)).unwrap();
        toast.success('Card deleted successfully');
      } catch (error) {
        toast.error('Failed to delete card');
      }
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

  const handleCreateCard = async () => {
    if (!editFormData.title.trim() || !editFormData.content.trim() || !editFormData.category.trim()) {
      toast.error('Title, content, and category are required');
      return;
    }

    try {
      await dispatch(createCardAsync(editFormData)).unwrap();
      toast.success('Card created successfully');
      setShowCreateModal(false);
      setEditFormData({
        title: '',
        content: '',
        type: 'concept',
        category: '',
        tags: [],
        source: '',
        isPublic: false
      });
      setTagInput('');
      // Refresh cards to get updated data
      dispatch(fetchCards());
    } catch (error) {
      // Handle different error formats
      let errorMessage = 'Failed to create card';
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = error.error;
      }
      console.error('Create card error:', error);
      toast.error(errorMessage);
    }
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

  const handleOpenCreateModal = () => {
    setEditFormData({
      title: '',
      content: '',
      type: 'concept',
      category: '',
      tags: [],
      source: '',
      isPublic: false
    });
    setTagInput('');
    setShowCreateModal(true);
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

  const handleAddToCollection = (card) => {
    setCardForCollection(card);
    setShowCollectionModal(true);
    setShowModal(false); // Close view modal if open
  };

  const handleToggleCardInCollection = async (collectionId, cardId, isInCollection) => {
    try {
      if (isInCollection) {
        await dispatch(removeCardFromCollection({ collectionId, cardId })).unwrap();
        toast.success('Card removed from collection');
      } else {
        await dispatch(addCardToCollection({ collectionId, cardId })).unwrap();
        toast.success('Card added to collection');
      }
      // Refresh collections to get updated card counts
      dispatch(fetchCollections());
    } catch (error) {
      toast.error(error || 'Failed to update collection');
    }
  };

  const isCardInCollection = (collection, cardId) => {
    return collection.cards && collection.cards.some(
      card => (typeof card === 'string' ? card : card._id) === cardId
    );
  };

  const filteredCards = cards.filter(card => {
    // Filter by collection if a collection is selected
    if (selectedCollection && selectedCollection.cards) {
      const cardIds = selectedCollection.cards.map(c => 
        typeof c === 'string' ? c : c._id
      );
      if (!cardIds.includes(card._id)) {
        return false;
      }
    }
    
    const matchesSearch = card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         card.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         card.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || card.category === selectedCategory;
    const matchesType = selectedType === 'all' || card.type === selectedType;
    
    return matchesSearch && matchesCategory && matchesType;
  });

  const handleClearCollectionFilter = () => {
    setSearchParams({});
    setSelectedCollection(null);
  };

  // Multi-select handlers
  const handleSelectCard = (cardId) => {
    setSelectedCardIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedCardIds.size === filteredCards.length) {
      setSelectedCardIds(new Set());
    } else {
      setSelectedCardIds(new Set(filteredCards.map(card => card._id)));
    }
  };

  const handleBulkAddToCollection = async (collectionId) => {
    if (selectedCardIds.size === 0) return;

    try {
      const cardIdsArray = Array.from(selectedCardIds);
      let successCount = 0;
      let errorCount = 0;

      for (const cardId of cardIdsArray) {
        try {
          await dispatch(addCardToCollection({ collectionId, cardId })).unwrap();
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully added ${successCount} card(s) to collection`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to add ${errorCount} card(s)`);
      }

      setSelectedCardIds(new Set());
      setShowBulkAddModal(false);
      dispatch(fetchCollections());
    } catch (error) {
      toast.error('Failed to add cards to collection');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCardIds.size === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedCardIds.size} card(s)?`)) {
      return;
    }

    try {
      const cardIdsArray = Array.from(selectedCardIds);
      let successCount = 0;
      let errorCount = 0;

      for (const cardId of cardIdsArray) {
        try {
          await dispatch(deleteCardAsync(cardId)).unwrap();
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully deleted ${successCount} card(s)`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to delete ${errorCount} card(s)`);
      }

      setSelectedCardIds(new Set());
      dispatch(fetchCards());
    } catch (error) {
      toast.error('Failed to delete cards');
    }
  };

  const categories = [...new Set(cards.map(card => card.category))];
  const types = [...new Set(cards.map(card => card.type))];

  const getTypeIcon = (type) => {
    const icons = {
      concept: <FileText className="h-4 w-4" />,
      action: <Tag className="h-4 w-4" />,
      quote: <Star className="h-4 w-4" />,
      checklist: <Tag className="h-4 w-4" />,
      mindmap: <Tag className="h-4 w-4" />
    };
    return icons[type] || <FileText className="h-4 w-4" />;
  };

  const getTypeIconForHeader = (type) => {
    const icons = {
      concept: BookOpen,
      action: Target,
      quote: Quote,
      checklist: CheckSquare,
      mindmap: Network
    };
    const IconComponent = icons[type] || BookOpen;
    return <IconComponent className="h-6 w-6 sm:h-8 sm:w-8 text-white flex-shrink-0" />;
  };

  const getTypeColor = (type) => {
    const colors = {
      concept: 'bg-blue-100 text-blue-800',
      action: 'bg-green-100 text-green-800',
      quote: 'bg-purple-100 text-purple-800',
      checklist: 'bg-orange-100 text-orange-800',
      mindmap: 'bg-indigo-100 text-indigo-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-8">
        Error loading cards: {error}
      </div>
    );
  }

  return (
    <div className={`w-full px-4 pt-16 sm:pt-4 pb-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 ${selectedCardIds.size > 0 ? 'pb-24 sm:pb-24' : ''}`}>
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Cards ({filteredCards.length})
          </h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center space-x-2 px-4 py-2 text-sm sm:text-base bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Card</span>
            </button>
            {selectedCollection && (
              <button
                onClick={handleClearCollectionFilter}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              >
                <X className="h-4 w-4" />
                <span>Clear Filter</span>
              </button>
            )}
          </div>
        </div>
        {selectedCollection ? (
          <div className="flex items-center space-x-2">
            <Folder className="h-4 w-4 text-blue-500" />
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Showing cards from collection: <span className="font-semibold text-gray-900 dark:text-white">{selectedCollection.name}</span>
            </p>
          </div>
        ) : (
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Manage and view your learning cards
          </p>
        )}
      </div>

      {/* Search and Filters */}
      <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search cards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            {types.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 sm:px-6 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={filteredCards.length > 0 && selectedCardIds.size === filteredCards.length}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      title="Select All"
                    />
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Card
                  </th>
                  <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCards.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 sm:px-6 py-12 text-center">
                      <div className="text-gray-500 dark:text-gray-400">
                        {cards.length === 0 ? (
                          <div>
                            <p className="mb-4">No cards found. Upload some content to get started!</p>
                            <Link
                              to="/upload"
                              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Upload Content
                            </Link>
                          </div>
                        ) : (
                          <p>No cards match your current search and filter criteria.</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCards.map((card) => (
                    <tr key={card._id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedCardIds.has(card._id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                      <td className="px-4 sm:px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedCardIds.has(card._id)}
                          onChange={() => handleSelectCard(card._id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                            <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center ${getTypeColor(card.type)}`}>
                              {getTypeIcon(card.type)}
                            </div>
                          </div>
                          <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                            <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-words">
                              {card.title}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 break-words line-clamp-2 sm:line-clamp-2 mt-1">
                              {card.content}
                            </div>
                            <div className="mt-2 sm:hidden flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center space-x-2 text-xs">
                                <span className={`inline-flex px-2 py-0.5 font-semibold rounded-full ${getTypeColor(card.type)}`}>
                                  {card.type}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">{card.category}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => handleViewCard(card)}
                                  className="p-1.5 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 touch-manipulation"
                                  title="View Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleEditCard(card)}
                                  className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 touch-manipulation"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleAddToCollection(card)}
                                  className="p-1.5 text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 touch-manipulation"
                                  title="Add to Collection"
                                >
                                  <FolderPlus className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCard(card._id)}
                                  className="p-1.5 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 touch-manipulation"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(card.type)}`}>
                          {card.type}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {card.category}
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {card.source || '—'}
                      </td>
                      <td className="hidden sm:table-cell px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-1 sm:space-x-2">
                          <button
                            onClick={() => handleViewCard(card)}
                            className="p-1.5 sm:p-0 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 touch-manipulation"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4 sm:h-4 sm:w-4" />
                          </button>
                          <button
                            onClick={() => handleEditCard(card)}
                            className="p-1.5 sm:p-0 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 touch-manipulation"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4 sm:h-4 sm:w-4" />
                          </button>
                          <button
                            onClick={() => handleAddToCollection(card)}
                            className="p-1.5 sm:p-0 text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 touch-manipulation"
                            title="Add to Collection"
                          >
                            <FolderPlus className="h-4 w-4 sm:h-4 sm:w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCard(card._id)}
                            className="p-1.5 sm:p-0 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 touch-manipulation"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 sm:h-4 sm:w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedCardIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-blue-600 dark:bg-blue-700 text-white shadow-lg z-40 p-3 sm:p-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center space-x-3">
                <span className="font-medium">
                  {selectedCardIds.size} card{selectedCardIds.size !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setSelectedCardIds(new Set())}
                  className="text-sm underline hover:no-underline"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowBulkAddModal(true)}
                  className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm sm:text-base"
                >
                  <FolderPlus className="h-4 w-4 inline mr-2" />
                  Add to Collection
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm sm:text-base"
                >
                  <Trash2 className="h-4 w-4 inline mr-2" />
                  Delete Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add to Collection Modal */}
      {showBulkAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  Add {selectedCardIds.size} Card{selectedCardIds.size !== 1 ? 's' : ''} to Collection
                </h2>
                <button
                  onClick={() => setShowBulkAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {collections.length === 0 ? (
                <div className="text-center py-8">
                  <Folder className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    No collections available. Create a collection first.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {collections.map((collection) => {
                    const cardIdsInCollection = collection.cards?.map(c => 
                      typeof c === 'string' ? c : c._id
                    ) || [];
                    const selectedCardsInCollection = Array.from(selectedCardIds).filter(
                      id => cardIdsInCollection.includes(id)
                    );
                    const newCardsCount = selectedCardIds.size - selectedCardsInCollection.length;

                    return (
                      <div
                        key={collection._id}
                        className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <Folder className="h-5 w-5 text-blue-500" />
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {collection.name}
                            </h3>
                            {collection.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                                {collection.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {newCardsCount > 0 ? (
                                <span className="text-blue-600 dark:text-blue-400">
                                  {newCardsCount} new card{newCardsCount !== 1 ? 's' : ''} will be added
                                </span>
                              ) : (
                                <span className="text-gray-500">All selected cards already in collection</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleBulkAddToCollection(collection._id)}
                          disabled={newCardsCount === 0}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                        >
                          Add
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowBulkAddModal(false)}
                  className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
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
              <div className={`${getTypeColorForHeader(selectedCard.type)} p-4 sm:p-6 flex-shrink-0`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    <div className="h-6 w-6 sm:h-8 sm:w-8 text-white flex-shrink-0">
                      {getTypeIconForHeader(selectedCard.type)}
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
                {selectedCard.tags.length > 0 && (
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

                {/* Image Attachments */}
                {selectedCard.attachments && selectedCard.attachments.some(att => att.mimetype && att.mimetype.startsWith('image/')) && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Attachments</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedCard.attachments
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
                  const hasProvenance = selectedCard.provenance && Object.keys(selectedCard.provenance).length > 0;
                  const hasAttachments = selectedCard.attachments?.length > 0;
                  
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
                          {selectedCard.provenance?.snippet && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Snippet:</span>
                          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-1 italic break-words">{selectedCard.provenance.snippet}</p>
                        </div>
                          )}

                          {/* View Source File Button - Show if there's a file reference */}
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
                  );
                })()}

                {/* Source File Viewer - Always show when a file is available and viewer is open */}
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
                                  {(() => {
                                    const token = localStorage.getItem('token');
                                    if (!token) {
                                      return (
                                        <div className="text-center py-4 text-red-500 dark:text-red-400">
                                          <p className="mb-2">No authentication token found. Please refresh the page and try again.</p>
                                        </div>
                                      );
                                    }
                                    
                                    // Use blob URL created from the fetched HTML content
                                    // This bypasses React Router and CORS issues
                                    const previewUrl = previewHtmlUrl || '#';
                                    console.log('Loading preview from blob URL:', previewUrl ? 'blob URL created' : 'no blob URL');
                                    
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
                                            console.log('Preview iframe onLoad event fired');
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
                                snippet={selectedCard.provenance?.snippet}
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
                      );
                    })()}
                )}

                {/* Metadata */}
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2 sm:mb-3">Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                      <span className="text-gray-500 dark:text-gray-400 sm:w-24 sm:flex-shrink-0">Source:</span>
                      <span className="text-gray-900 dark:text-white break-words">{selectedCard.source || '—'}</span>
                    </div>
                    {selectedCard.metadata?.lastReviewed && (
                      <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                        <span className="text-gray-500 dark:text-gray-400 sm:w-24 sm:flex-shrink-0">Last Reviewed:</span>
                        <span className="text-gray-900 dark:text-white break-words">
                          {new Date(selectedCard.metadata.lastReviewed).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {selectedCard.metadata?.difficulty && (
                      <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                        <span className="text-gray-500 dark:text-gray-400 sm:w-24 sm:flex-shrink-0">Difficulty:</span>
                        <span className="text-gray-900 dark:text-white">{selectedCard.metadata.difficulty}/5</span>
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
                      handleAddToCollection(selectedCard);
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base bg-purple-500 text-white rounded-lg hover:bg-purple-600 active:bg-purple-700 transition-colors flex items-center justify-center space-x-2 touch-manipulation"
                  >
                    <FolderPlus className="h-4 w-4" />
                    <span>Add to Collection</span>
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

      {/* Create Card Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="relative max-w-3xl max-h-[98vh] sm:max-h-[95vh] w-full flex flex-col">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setEditFormData({
                  title: '',
                  content: '',
                  type: 'concept',
                  category: '',
                  tags: [],
                  source: '',
                  isPublic: false
                });
                setTagInput('');
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
                        Create New Card
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
                    id="isPublicCreate"
                    checked={editFormData.isPublic}
                    onChange={(e) => setEditFormData({ ...editFormData, isPublic: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPublicCreate" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
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
                      setShowCreateModal(false);
                      setEditFormData({
                        title: '',
                        content: '',
                        type: 'concept',
                        category: '',
                        tags: [],
                        source: '',
                        isPublic: false
                      });
                      setTagInput('');
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-manipulation"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCard}
                    className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors touch-manipulation"
                  >
                    Create Card
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add to Collection Modal */}
      {showCollectionModal && cardForCollection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex-1 min-w-0 pr-2">
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white truncate">
                    Add to Collection
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                    {cardForCollection.title}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCollectionModal(false);
                    setCardForCollection(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Collections List */}
              {collections.length === 0 ? (
                <div className="text-center py-8">
                  <Folder className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    You don't have any collections yet.
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Create a collection first to add cards to it.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {collections.map((collection) => {
                    const isInCollection = isCardInCollection(collection, cardForCollection._id);
                    return (
                      <div
                        key={collection._id}
                        className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                          isInCollection
                            ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                            : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <Folder className={`h-5 w-5 ${isInCollection ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`} />
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {collection.name}
                            </h3>
                            {collection.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                                {collection.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {collection.cards?.length || 0} cards
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleCardInCollection(
                            collection._id,
                            cardForCollection._id,
                            isInCollection
                          )}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            isInCollection
                              ? 'bg-purple-600 hover:bg-purple-700 text-white'
                              : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {isInCollection ? 'Remove' : 'Add'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex justify-end mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowCollectionModal(false);
                    setCardForCollection(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-manipulation"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cards;
