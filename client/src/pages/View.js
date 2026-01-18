import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCards, deleteCardAsync, updateCardAsync, regenerateCardAsync } from '../store/slices/cardSlice';
import { toast } from 'react-hot-toast';
import { Search, Loader2, X, Star, BookOpen, Target, Quote, CheckSquare, Network } from 'lucide-react';
import Card from '../components/Card';
import CardDetailModal from '../components/CardDetailModal';

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

  useEffect(() => {
    dispatch(fetchCards());
  }, [dispatch]);

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
    </div>
  );
};

export default View;



