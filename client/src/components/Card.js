import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Target, 
  Quote, 
  CheckSquare, 
  Network, 
  Star, 
  Eye,
  Edit,
  Trash2,
  Share2,
  Image as ImageIcon
} from 'lucide-react';
import ImageZoomViewer from './ImageZoomViewer';

const Card = ({ card, onEdit, onDelete, onReview, onRate, className = '' }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [rating, setRating] = useState(card.metadata?.rating || 0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);

  const cardTypeIcons = {
    concept: BookOpen,
    action: Target,
    quote: Quote,
    checklist: CheckSquare,
    mindmap: Network
  };

  const cardTypeColors = {
    concept: 'bg-blue-500',
    action: 'bg-green-500',
    quote: 'bg-purple-500',
    checklist: 'bg-orange-500',
    mindmap: 'bg-indigo-500'
  };

  const IconComponent = cardTypeIcons[card.type] || BookOpen;

  // Check if card has image attachments
  const hasImageAttachments = card.attachments && card.attachments.some(att => 
    att.mimetype && att.mimetype.startsWith('image/')
  );

  const imageAttachments = card.attachments ? card.attachments.filter(att => 
    att.mimetype && att.mimetype.startsWith('image/')
  ) : [];

  const handleRate = async (newRating) => {
    if (newRating === rating) return;
    
    setRating(newRating);
    if (onRate) {
      try {
        await onRate(card._id, newRating);
      } catch (error) {
        setRating(rating); // Revert on error
        console.error('Rating failed:', error);
      }
    }
  };

  const handleReview = async () => {
    if (onReview) {
      try {
        await onReview(card._id);
      } catch (error) {
        console.error('Review failed:', error);
      }
    }
  };

  return (
    <>
      <motion.div
        className={`relative group ${className}`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Card Container */}
        <div className="relative w-full h-64">
          <div className="w-full h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer"
               onClick={() => setShowFullModal(true)}>
            {/* Card Header */}
            <div className={`h-16 ${cardTypeColors[card.type]} flex items-center justify-between px-4`}>
              <div className="flex items-center space-x-2">
                <IconComponent className="h-5 w-5 text-white" />
                <span className="text-white text-sm font-medium capitalize">
                  {card.type}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                {hasImageAttachments && (
                  <ImageIcon className="h-4 w-4 text-white" />
                )}
                {card.metadata?.rating && (
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-yellow-300 fill-current" />
                    <span className="text-white text-xs">
                      {card.metadata.rating}
                    </span>
                  </div>
                )}
                {card.metadata?.reviewCount > 0 && (
                  <div className="flex items-center space-x-1">
                    <Eye className="h-3 w-3 text-white" />
                    <span className="text-white text-xs">
                      {card.metadata.reviewCount}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Card Content */}
            <div className="p-4 h-32 overflow-hidden">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2 line-clamp-2">
                {card.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-xs line-clamp-4">
                {card.content}
              </p>
            </div>

            {/* Card Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white dark:from-gray-800 to-transparent">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {card.category}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Click to view full content
                </span>
              </div>
            </div>

            {/* Action Buttons (Hidden by default, shown on hover/touch) */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-200">
              <div className="flex space-x-1">
                {hasImageAttachments && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowImageModal(true);
                    }}
                    className="p-1.5 sm:p-1 bg-white dark:bg-gray-700 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 active:bg-gray-100 transition-colors touch-manipulation"
                    aria-label="View images"
                  >
                    <ImageIcon className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-blue-500" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFullModal(true);
                  }}
                  className="p-1.5 sm:p-1 bg-white dark:bg-gray-700 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 active:bg-gray-100 transition-colors touch-manipulation"
                  aria-label="View card"
                >
                  <Eye className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-gray-600 dark:text-gray-300" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onEdit) onEdit(card);
                  }}
                  className="p-1.5 sm:p-1 bg-white dark:bg-gray-700 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 active:bg-gray-100 transition-colors touch-manipulation"
                  aria-label="Edit card"
                >
                  <Edit className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-gray-600 dark:text-gray-300" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDelete) onDelete(card._id);
                  }}
                  className="p-1.5 sm:p-1 bg-white dark:bg-gray-700 rounded shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 transition-colors touch-manipulation"
                  aria-label="Delete card"
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-red-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Full Card Modal */}
      {showFullModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowFullModal(false);
            }
          }}
        >
          <div className="relative max-w-4xl max-h-[98vh] sm:max-h-[95vh] w-full flex flex-col">
            <button
              onClick={() => setShowFullModal(false)}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white hover:text-gray-300 active:text-gray-400 z-20 bg-black bg-opacity-50 rounded-full p-2 transition-colors touch-manipulation"
              aria-label="Close"
            >
              ×
            </button>
            <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden flex flex-col max-h-full">
              {/* Modal Header - Fixed */}
              <div className={`${cardTypeColors[card.type]} p-4 sm:p-6 flex-shrink-0`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    <IconComponent className="h-6 w-6 sm:h-8 sm:w-8 text-white flex-shrink-0" />
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
                {/* Main Content */}
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Content
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4 max-h-64 sm:max-h-96 overflow-y-auto">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">
                      {card.content}
                    </p>
                  </div>
                  {card.content && card.content.length > 1000 && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                      📜 Long content - scroll within the content area above
                    </div>
                  )}
                </div>

                {/* Image Attachments */}
                {hasImageAttachments && (
                  <div className="mb-6">
                    <div className="flex items-center space-x-2 mb-4">
                      <ImageIcon className="h-5 w-5 text-blue-500" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Attached Images ({imageAttachments.length})
                      </h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {imageAttachments.map((attachment, index) => (
                          <div key={index} className="relative">
                            <img
                              src={`/uploads/${attachment.filename}`}
                              alt={attachment.originalName}
                              className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setShowImageModal(true)}
                            />
                            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                              {attachment.originalName}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {imageAttachments.length > 4 && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                        🖼️ {imageAttachments.length} images - scroll to see all
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 sm:pt-6">
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {/* Rating */}
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Rate:</span>
                      <div className="flex space-x-0.5 sm:space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleRate(star)}
                            className={`p-1 sm:p-1 rounded touch-manipulation ${
                              star <= rating
                                ? 'text-yellow-400'
                                : 'text-gray-300 dark:text-gray-600'
                            } hover:text-yellow-400 active:text-yellow-300 transition-colors`}
                            aria-label={`Rate ${star} stars`}
                          >
                            <Star className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <button
                      onClick={handleReview}
                      className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg transition-colors touch-manipulation"
                    >
                      Mark as Reviewed
                    </button>
                    
                    {hasImageAttachments && (
                      <button
                        onClick={() => setShowImageModal(true)}
                        className="bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-900/40 active:bg-blue-300 text-blue-600 dark:text-blue-400 px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg transition-colors touch-manipulation"
                      >
                        View Images
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        if (onEdit) onEdit(card);
                        setShowFullModal(false);
                      }}
                      className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 active:bg-gray-300 text-gray-600 dark:text-gray-300 px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg transition-colors touch-manipulation"
                    >
                      Edit Card
                    </button>
                  </div>

                  {/* Metadata */}
                  <div className="mt-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 space-y-1">
                    {card.source && (
                      <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                        <strong className="sm:w-24 sm:flex-shrink-0">Source:</strong>
                        <span className="break-words">{card.source}</span>
                      </div>
                    )}
                    {card.metadata?.lastReviewed && (
                      <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                        <strong className="sm:w-24 sm:flex-shrink-0">Last reviewed:</strong>
                        <span>{new Date(card.metadata.lastReviewed).toLocaleDateString()}</span>
                      </div>
                    )}
                    {card.metadata?.difficulty && (
                      <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                        <strong className="sm:w-24 sm:flex-shrink-0">Difficulty:</strong>
                        <span>{card.metadata.difficulty}/5</span>
                      </div>
                    )}
                    {card.metadata?.reviewCount > 0 && (
                      <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                        <strong className="sm:w-24 sm:flex-shrink-0">Review count:</strong>
                        <span>{card.metadata.reviewCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowImageModal(false);
            }
          }}
        >
          <div className="relative max-w-6xl max-h-full w-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white hover:text-gray-300 active:text-gray-400 z-10 bg-black bg-opacity-50 rounded-full p-2 transition-colors touch-manipulation"
              aria-label="Close"
            >
              ×
            </button>
            <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden max-h-[98vh] sm:max-h-[90vh] overflow-y-auto">
              <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {card.title} - Images
                </h3>
              </div>
              <div className="p-2 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  {imageAttachments.map((attachment, index) => (
                    <ImageZoomViewer 
                      key={index} 
                      attachment={attachment} 
                      cardTitle={card.title}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Card;
