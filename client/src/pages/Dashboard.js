import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCards, deleteCardAsync, updateCardAsync, regenerateCardAsync } from '../store/slices/cardSlice';
import { fetchCollections, fetchCollection } from '../store/slices/collectionSlice';
import { toast } from 'react-hot-toast';
import { BookOpen, Target, Quote, CheckSquare, Network, Folder, FileText, X } from 'lucide-react';
import Card from '../components/Card';
import CardDetailModal from '../components/CardDetailModal';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { cards, loading: cardsLoading } = useSelector(state => state.cards);
  const { collections, loading: collectionsLoading } = useSelector(state => state.collections);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
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

  React.useEffect(() => {
    dispatch(fetchCards());
    dispatch(fetchCollections());
  }, [dispatch]);

  const recentCards = cards.slice(0, 6);
  const recentCollections = collections.slice(0, 3);

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

  const handleCardClick = (card) => {
    setSelectedCard(card);
    setShowCardModal(true);
  };

  const handleDeleteCard = async (cardId) => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      try {
        await dispatch(deleteCardAsync(cardId)).unwrap();
        toast.success('Card deleted successfully');
        // Refresh cards
        dispatch(fetchCards());
        // Close modal if the deleted card is selected
        if (selectedCard && selectedCard._id === cardId) {
          setShowCardModal(false);
          setSelectedCard(null);
        }
      } catch (error) {
        toast.error('Failed to delete card');
      }
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
    setShowCardModal(false); // Close view modal if open
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

  const handleRegenerateCard = async (regeneratedCard) => {
    // If regeneratedCard is provided (from CardDetailModal), use it directly
    // Otherwise, if it's a boolean (useAI), regenerate
    if (typeof regeneratedCard === 'object' && regeneratedCard !== null) {
      // Card object passed from CardDetailModal
      setSelectedCard(regeneratedCard);
      dispatch(fetchCards());
    } else {
      // Legacy: useAI boolean parameter (shouldn't happen from CardDetailModal)
      const useAI = regeneratedCard === true;
      if (!selectedCard) return;

      try {
        const result = await dispatch(regenerateCardAsync({ cardId: selectedCard._id, useAI })).unwrap();
        toast.success(`Card regenerated successfully ${useAI ? 'using AI' : 'using rule-based'}`);
        setSelectedCard(result);
        dispatch(fetchCards());
      } catch (error) {
        const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to regenerate card';
        toast.error(errorMessage);
      }
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

  const handleCollectionClick = async (collection) => {
    try {
      const fullCollection = await dispatch(fetchCollection(collection._id)).unwrap();
      setSelectedCollection(fullCollection);
      setShowCollectionModal(true);
    } catch (error) {
      console.error('Failed to load collection details:', error);
    }
  };
  return (
    <div className="px-4 pt-16 sm:pt-4 pb-4 sm:px-6 sm:py-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome to Your Local Knowledge
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Manage your learning cards and collections
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Link
          to="/upload"
          className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white p-4 sm:p-6 rounded-lg shadow-md transition-colors touch-manipulation"
        >
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Upload Content</h3>
          <p className="text-sm sm:text-base text-blue-100">Add new files to create cards</p>
        </Link>
        
        <Link
          to="/cards"
          className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white p-4 sm:p-6 rounded-lg shadow-md transition-colors touch-manipulation"
        >
          <h3 className="text-lg sm:text-xl font-semibold mb-2">View Cards</h3>
          <p className="text-sm sm:text-base text-green-100">Browse all your cards</p>
        </Link>
        
        <Link
          to="/collections"
          className="bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white p-4 sm:p-6 rounded-lg shadow-md transition-colors touch-manipulation sm:col-span-2 lg:col-span-1"
        >
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Collections</h3>
          <p className="text-sm sm:text-base text-purple-100">Organize your cards</p>
        </Link>
      </div>

      {/* Recent Cards */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
            Recent Cards
          </h2>
          <Link
            to="/cards"
            className="text-sm sm:text-base text-blue-500 hover:text-blue-600 active:text-blue-700 font-medium touch-manipulation"
          >
            View All →
          </Link>
        </div>
        
        {cardsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">Loading cards...</p>
          </div>
        ) : recentCards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {recentCards.map(card => (
              <Card
                key={card._id}
                card={card}
                disableDefaultModal={true}
                onCardClick={handleCardClick}
                onEdit={handleEditCard}
                onDelete={handleDeleteCard}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 sm:py-8 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
              No cards yet. Upload some content to get started!
            </p>
            <Link
              to="/upload"
              className="inline-block bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-4 py-2 sm:px-6 sm:py-2 rounded-md transition-colors touch-manipulation text-sm sm:text-base"
            >
              Upload Content
            </Link>
          </div>
        )}
      </div>

      {/* Recent Collections */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
            Recent Collections
          </h2>
          <Link
            to="/collections"
            className="text-sm sm:text-base text-blue-500 hover:text-blue-600 active:text-blue-700 font-medium touch-manipulation"
          >
            View All →
          </Link>
        </div>
        
        {collectionsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">Loading collections...</p>
          </div>
        ) : recentCollections.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {recentCollections.map(collection => (
              <div
                key={collection._id}
                onClick={() => handleCollectionClick(collection)}
                className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Folder className="h-4 w-4 text-purple-500" />
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white line-clamp-1">
                    {collection.name}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {collection.cards?.length || 0} cards
                </p>
                {collection.description && (
                  <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 line-clamp-2 sm:line-clamp-3">
                    {collection.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 sm:py-8 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
              No collections yet. Create your first collection!
            </p>
            <Link
              to="/collections"
              className="inline-block bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white px-4 py-2 sm:px-6 sm:py-2 rounded-md transition-colors touch-manipulation text-sm sm:text-base"
            >
              Create Collection
            </Link>
          </div>
        )}
      </div>

      {/* Card Detail Modal */}
      <CardDetailModal
        card={selectedCard}
        isOpen={showCardModal}
        onClose={() => {
          setShowCardModal(false);
          setSelectedCard(null);
        }}
        onRegenerate={handleRegenerateCard}
        onEdit={(card) => {
          setShowCardModal(false);
          handleEditCard(card);
        }}
        loading={cardsLoading}
      />

      {/* Collection Detail Modal */}
      {showCollectionModal && selectedCollection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                  <Folder className="h-8 w-8 sm:h-10 sm:w-10 text-purple-500 flex-shrink-0" />
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
                    setShowCollectionModal(false);
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
                        className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                      >
                        <FileText className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">
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

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 pt-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setShowCollectionModal(false);
                    setSelectedCollection(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-manipulation"
                >
                  Close
                </button>
                <Link
                  to="/collections"
                  onClick={() => {
                    setShowCollectionModal(false);
                    setSelectedCollection(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base bg-purple-500 text-white rounded-lg hover:bg-purple-600 active:bg-purple-700 transition-colors touch-manipulation text-center"
                >
                  View All Collections
                </Link>
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

export default Dashboard;
