import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { fetchCards, deleteCardAsync, updateCardAsync, createCardAsync, regenerateCardAsync } from '../store/slices/cardSlice';
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
  BookOpen,
  Target,
  Quote,
  CheckSquare,
  Network,
  Plus
} from 'lucide-react';
import CardDetailModal from '../components/CardDetailModal';

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

  const handleRegenerateCard = async () => {
    if (!selectedCard) return;

    try {
      const regeneratedCard = await dispatch(regenerateCardAsync(selectedCard._id)).unwrap();
      toast.success('Card regenerated successfully');
      // Update the selected card to show regenerated content
      setSelectedCard(regeneratedCard);
      // Refresh cards list to reflect changes
      dispatch(fetchCards());
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to regenerate card';
      toast.error(errorMessage);
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
      <CardDetailModal
        card={selectedCard}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedCard(null);
        }}
        onRegenerate={handleRegenerateCard}
        onEdit={(card) => {
          setShowModal(false);
          handleEditCard(card);
        }}
        onAddToCollection={(card) => {
          handleAddToCollection(card);
        }}
        loading={loading}
      />


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
