import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  fetchCollections, 
  createCollection, 
  fetchCollection,
  updateCollectionAsync,
  deleteCollectionAsync,
  removeCardFromCollection,
  addCardToCollection
} from '../store/slices/collectionSlice';
import { fetchCards } from '../store/slices/cardSlice';
import { Loader2, Plus, Folder, Edit, Trash2, Eye, X, FileText, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const Collections = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { collections, loading, error } = useSelector((state) => state.collections);
  const { cards } = useSelector((state) => state.cards);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddCardsModal, setShowAddCardsModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedCardIdsForAdd, setSelectedCardIdsForAdd] = useState(new Set());
  const [addCardsSearchTerm, setAddCardsSearchTerm] = useState('');
  const [addCardsSelectedCategory, setAddCardsSelectedCategory] = useState('all');
  const [addCardsSelectedType, setAddCardsSelectedType] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    isPublic: false
  });

  useEffect(() => {
    dispatch(fetchCollections());
    dispatch(fetchCards());
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Collection name is required');
      return;
    }

    try {
      await dispatch(createCollection(formData)).unwrap();
      setFormData({ name: '', description: '', isPublic: false });
      setShowCreateForm(false);
      toast.success('Collection created successfully!');
    } catch (error) {
      toast.error(error || 'Failed to create collection');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleViewCollection = async (collection) => {
    try {
      // Fetch full collection details with populated cards
      const fullCollection = await dispatch(fetchCollection(collection._id)).unwrap();
      setSelectedCollection(fullCollection);
      setShowViewModal(true);
    } catch (error) {
      toast.error('Failed to load collection details');
    }
  };

  const handleEditCollection = (collection) => {
    setSelectedCollection(collection);
    setEditFormData({
      name: collection.name || '',
      description: collection.description || '',
      isPublic: collection.isPublic || false
    });
    setShowEditModal(true);
    setShowViewModal(false);
  };

  const handleUpdateCollection = async () => {
    if (!selectedCollection || !editFormData.name.trim()) {
      toast.error('Collection name is required');
      return;
    }

    try {
      await dispatch(updateCollectionAsync({
        collectionId: selectedCollection._id,
        collectionData: editFormData
      })).unwrap();
      toast.success('Collection updated successfully!');
      setShowEditModal(false);
      setSelectedCollection(null);
      dispatch(fetchCollections());
    } catch (error) {
      toast.error(error || 'Failed to update collection');
    }
  };

  const handleDeleteCollection = async (collection) => {
    if (!window.confirm(`Are you sure you want to delete "${collection.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await dispatch(deleteCollectionAsync(collection._id)).unwrap();
      toast.success('Collection deleted successfully!');
      if (selectedCollection && selectedCollection._id === collection._id) {
        setShowViewModal(false);
        setSelectedCollection(null);
      }
    } catch (error) {
      toast.error(error || 'Failed to delete collection');
    }
  };

  const handleRemoveCardFromCollection = async (cardId) => {
    if (!selectedCollection) return;
    
    if (!window.confirm('Remove this card from the collection?')) {
      return;
    }

    try {
      await dispatch(removeCardFromCollection({
        collectionId: selectedCollection._id,
        cardId
      })).unwrap();
      toast.success('Card removed from collection');
      // Refresh the collection view
      const updatedCollection = await dispatch(fetchCollection(selectedCollection._id)).unwrap();
      setSelectedCollection(updatedCollection);
      dispatch(fetchCollections());
    } catch (error) {
      toast.error(error || 'Failed to remove card');
    }
  };

  const handleViewCollectionCards = (collection) => {
    navigate(`/cards?collection=${collection._id}`);
  };

  const handleOpenAddCardsModal = async (collection) => {
    try {
      const fullCollection = await dispatch(fetchCollection(collection._id)).unwrap();
      setSelectedCollection(fullCollection);
      setSelectedCardIdsForAdd(new Set());
      setAddCardsSearchTerm('');
      setAddCardsSelectedCategory('all');
      setAddCardsSelectedType('all');
      setShowAddCardsModal(true);
    } catch (error) {
      toast.error('Failed to load collection details');
    }
  };

  const handleSelectCardForAdd = (cardId) => {
    setSelectedCardIdsForAdd(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const handleSelectAllCardsForAdd = () => {
    const filteredCards = getFilteredAvailableCards();
    
    if (selectedCardIdsForAdd.size === filteredCards.length && filteredCards.length > 0) {
      // Deselect all filtered cards
      const filteredCardIds = new Set(filteredCards.map(card => card._id));
      setSelectedCardIdsForAdd(prev => {
        const newSet = new Set(prev);
        filteredCardIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      // Select all filtered cards
      const filteredCardIds = filteredCards.map(card => card._id);
      setSelectedCardIdsForAdd(prev => {
        const newSet = new Set(prev);
        filteredCardIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  };

  const handleBulkAddCardsToCollection = async () => {
    if (!selectedCollection || selectedCardIdsForAdd.size === 0) return;

    try {
      const cardIdsArray = Array.from(selectedCardIdsForAdd);
      let successCount = 0;
      let errorCount = 0;

      for (const cardId of cardIdsArray) {
        try {
          await dispatch(addCardToCollection({ 
            collectionId: selectedCollection._id, 
            cardId 
          })).unwrap();
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

      // Refresh collection and collections list
      const updatedCollection = await dispatch(fetchCollection(selectedCollection._id)).unwrap();
      setSelectedCollection(updatedCollection);
      dispatch(fetchCollections());
      setSelectedCardIdsForAdd(new Set());
      setShowAddCardsModal(false);
    } catch (error) {
      toast.error('Failed to add cards to collection');
    }
  };

  // Get cards not in the collection
  const getAvailableCards = () => {
    if (!selectedCollection) return [];
    
    const cardIdsInCollection = selectedCollection.cards?.map(c => 
      typeof c === 'string' ? c : c._id
    ) || [];
    
    return cards.filter(card => !cardIdsInCollection.includes(card._id));
  };

  // Get filtered available cards with search and filters
  const getFilteredAvailableCards = () => {
    const availableCards = getAvailableCards();
    
    return availableCards.filter(card => {
      // Search filter
      const matchesSearch = addCardsSearchTerm === '' || 
        card.title.toLowerCase().includes(addCardsSearchTerm.toLowerCase()) ||
        card.content.toLowerCase().includes(addCardsSearchTerm.toLowerCase()) ||
        (card.tags && card.tags.some(tag => tag.toLowerCase().includes(addCardsSearchTerm.toLowerCase())));
      
      // Category filter
      const matchesCategory = addCardsSelectedCategory === 'all' || card.category === addCardsSelectedCategory;
      
      // Type filter
      const matchesType = addCardsSelectedType === 'all' || card.type === addCardsSelectedType;
      
      return matchesSearch && matchesCategory && matchesType;
    });
  };

  // Get unique categories and types from available cards
  const getAvailableCardCategories = () => {
    const availableCards = getAvailableCards();
    return [...new Set(availableCards.map(card => card.category))].sort();
  };

  const getAvailableCardTypes = () => {
    // Define all valid card types (from Card model enum)
    // Show all valid types in filter, not just types that exist in current cards
    const validCardTypes = ['concept', 'action', 'quote', 'checklist', 'mindmap'];
    return validCardTypes;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading collections...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading collections: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pt-12 sm:pt-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Collections ({collections.length})
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Organize your cards into collections
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Collection
        </button>
      </div>

      {/* Create Collection Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4">
              Create New Collection
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Collection Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Enter collection name"
                  required
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Enter collection description"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  name="isPublic"
                  checked={formData.isPublic}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Make this collection public
                </label>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Collection
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collections Grid */}
      {collections.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
          <Folder className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No collections yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Create your first collection to organize your cards
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Collection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {collections.map((collection) => (
            <motion.div
              key={collection._id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewCollectionCards(collection)}
            >
              <div className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Folder className="h-8 w-8 text-blue-500" />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {collection.name}
                      </h3>
                      {collection.isPublic && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Public
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => handleOpenAddCardsModal(collection)}
                      className="p-1 text-purple-400 hover:text-purple-600 dark:hover:text-purple-300"
                      title="Add Cards to Collection"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleViewCollection(collection)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title="View Collection"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleEditCollection(collection)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title="Edit Collection"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteCollection(collection)}
                      className="p-1 text-gray-400 hover:text-red-500"
                      title="Delete Collection"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {collection.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                    {collection.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>{collection.cards?.length || collection.metadata?.cardCount || 0} cards</span>
                  <span>
                    {collection.updatedAt
                      ? new Date(collection.updatedAt).toLocaleDateString()
                      : collection.metadata?.lastUpdated 
                      ? new Date(collection.metadata.lastUpdated).toLocaleDateString()
                      : 'Never updated'
                    }
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* View Collection Modal */}
      {showViewModal && selectedCollection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                  <Folder className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white truncate">
                      {selectedCollection.name}
                    </h2>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {selectedCollection.isPublic && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Public
                        </span>
                      )}
                      <span>{selectedCollection.cards?.length || 0} cards</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedCollection(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Description */}
              {selectedCollection.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Description</h3>
                  <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    {selectedCollection.description}
                  </p>
                </div>
              )}

              {/* Cards List */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Cards ({selectedCollection.cards?.length || 0})
                </h3>
                {selectedCollection.cards && selectedCollection.cards.length > 0 ? (
                  <div className="space-y-3">
                    {selectedCollection.cards.map((card) => (
                      <div
                        key={card._id || card}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {typeof card === 'object' ? card.title : 'Card'}
                            </h4>
                            {typeof card === 'object' && (
                              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                <span className="capitalize">{card.type}</span>
                                {card.category && (
                                  <>
                                    <span>•</span>
                                    <span>{card.category}</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveCardFromCollection(typeof card === 'object' ? card._id : card)}
                          className="px-3 py-1 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">
                      No cards in this collection yet.
                    </p>
                  </div>
                )}
              </div>

            </div>
            {/* Modal Footer - Fixed at bottom */}
            <div className="p-4 sm:p-6 pt-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 sm:space-x-3">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedCollection(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-manipulation"
                >
                  Close
                </button>
                <button
                  onClick={() => handleOpenAddCardsModal(selectedCollection)}
                  className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base bg-purple-500 text-white rounded-lg hover:bg-purple-600 active:bg-purple-700 transition-colors touch-manipulation flex items-center justify-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Cards</span>
                </button>
                <button
                  onClick={() => handleEditCollection(selectedCollection)}
                  className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors touch-manipulation"
                >
                  Edit Collection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Cards to Collection Modal */}
      {showAddCardsModal && selectedCollection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                    Add Cards to "{selectedCollection.name}"
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Select cards to add to this collection
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAddCardsModal(false);
                    setSelectedCardIdsForAdd(new Set());
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {getAvailableCards().length === 0 ? (
                <>
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      All your cards are already in this collection.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        setShowAddCardsModal(false);
                        setSelectedCardIdsForAdd(new Set());
                      }}
                      className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Search and Filters */}
                  <div className="mb-4 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                          type="text"
                          placeholder="Search cards..."
                          value={addCardsSearchTerm}
                          onChange={(e) => setAddCardsSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <select
                        value={addCardsSelectedCategory}
                        onChange={(e) => setAddCardsSelectedCategory(e.target.value)}
                        className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Categories</option>
                        {getAvailableCardCategories().map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                      
                      <select
                        value={addCardsSelectedType}
                        onChange={(e) => setAddCardsSelectedType(e.target.value)}
                        className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Types</option>
                        {getAvailableCardTypes().map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={getFilteredAvailableCards().length > 0 && 
                          getFilteredAvailableCards().every(card => selectedCardIdsForAdd.has(card._id))}
                        onChange={handleSelectAllCardsForAdd}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedCardIdsForAdd.size > 0 
                          ? `${selectedCardIdsForAdd.size} card${selectedCardIdsForAdd.size !== 1 ? 's' : ''} selected`
                          : `Select all (${getFilteredAvailableCards().length} available${getFilteredAvailableCards().length !== getAvailableCards().length ? ` of ${getAvailableCards().length}` : ''})`}
                      </span>
                    </div>
                    {selectedCardIdsForAdd.size > 0 && (
                      <button
                        onClick={handleBulkAddCardsToCollection}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base"
                      >
                        Add {selectedCardIdsForAdd.size} Card{selectedCardIdsForAdd.size !== 1 ? 's' : ''}
                      </button>
                    )}
                  </div>

                  {getFilteredAvailableCards().length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-gray-500 dark:text-gray-400">
                        No cards match your search and filters.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {getFilteredAvailableCards().map((card) => (
                        <div
                          key={card._id}
                          className={`flex items-center space-x-3 p-4 border rounded-lg transition-colors ${
                            selectedCardIdsForAdd.has(card._id)
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedCardIdsForAdd.has(card._id)}
                            onChange={() => handleSelectCardForAdd(card._id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 dark:text-white truncate">
                              {card.title}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">
                              {card.content}
                            </p>
                            <div className="flex items-center space-x-2 text-xs text-gray-400 dark:text-gray-500 mt-1">
                              <span className="capitalize">{card.type}</span>
                              {card.category && (
                                <>
                                  <span>•</span>
                                  <span>{card.category}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        setShowAddCardsModal(false);
                        setSelectedCardIdsForAdd(new Set());
                      }}
                      className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Collection Modal */}
      {showEditModal && selectedCollection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  Edit Collection
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedCollection(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Collection Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={editFormData.description}
                    onChange={handleEditChange}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Enter collection description"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="editIsPublic"
                    name="isPublic"
                    checked={editFormData.isPublic}
                    onChange={handleEditChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="editIsPublic" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Make this collection public
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 sm:space-x-3 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedCollection(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateCollection}
                  className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors touch-manipulation"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Collections;
