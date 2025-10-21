/**
 * @fileoverview RelatedTopics component for displaying related topic links in video player pages.
 * 
 * This component shows a list of topics related to the current topic/video,
 * allowing users to navigate to playlists for related content.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRelatedTermsForTopic, formatRelatedTermsForDisplay, filterRelatedTermsByAvailability } from '../services/relatedTermsService';

/**
 * RelatedTopics - Displays related topic links for navigation
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.currentTopic - The current topic to find related terms for
 * @param {Object} props.relatedTermsCache - Cache of related terms data
 * @param {Array} props.availableTopics - Array of available topics in the glossary
 * @param {number} props.maxDisplay - Maximum number of related topics to display (default: 5)
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showTitle - Whether to show the section title (default: true)
 * @param {boolean} props.collapsible - Whether the section can be collapsed (default: false)
 * @returns {React.ReactElement} Related topics component
 */
export default function RelatedTopics({ 
  currentTopic, 
  relatedTermsCache, 
  availableTopics = [], 
  maxDisplay = 5,
  className = '',
  showTitle = true,
  collapsible = false
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const navigate = useNavigate();

  // Get related terms for the current topic
  const rawRelatedTerms = getRelatedTermsForTopic(currentTopic, relatedTermsCache);
  
  // Filter to only include available topics and format for display
  const filteredRelatedTerms = filterRelatedTermsByAvailability(rawRelatedTerms, availableTopics);
  const relatedTerms = formatRelatedTermsForDisplay(filteredRelatedTerms, maxDisplay);

  // Don't render if no related terms
  if (!relatedTerms || relatedTerms.length === 0) {
    return null;
  }

  /**
   * Handles clicking on a related topic
   */
  const handleTopicClick = (topicName) => {
    navigate(`/playlist-builder?keywords=${encodeURIComponent(topicName)}`);
  };

  return (
    <div className={`related-topics ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-black text-2xl font-medium font-['Inter']">
            Related Topics
          </h3>
          {collapsible && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-600 hover:text-black transition-colors"
              aria-label={isExpanded ? 'Collapse related topics' : 'Expand related topics'}
            >
              <svg 
                className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      )}

      {isExpanded && (
        <div className="space-y-3">
          {relatedTerms.map((relatedTerm, index) => (
            <div
              key={index}
              onClick={() => handleTopicClick(relatedTerm.name)}
              className="group cursor-pointer p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-black text-base font-medium font-['Inter'] group-hover:text-blue-600 transition-colors">
                    {relatedTerm.name}
                  </div>
                  <div className="text-gray-500 text-sm font-light font-['Chivo_Mono'] mt-1">
                    {relatedTerm.coOccurrenceCount} shared clip{relatedTerm.coOccurrenceCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="flex items-center text-gray-400 group-hover:text-blue-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show count if there are more related topics than displayed */}
      {rawRelatedTerms.length > maxDisplay && (
        <div className="mt-3 text-center">
          <span className="text-gray-500 text-sm font-light font-['Chivo_Mono']">
            +{rawRelatedTerms.length - maxDisplay} more related topics
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version of RelatedTopics for smaller spaces
 */
export function RelatedTopicsCompact({ 
  currentTopic, 
  relatedTermsCache, 
  availableTopics = [], 
  maxDisplay = 3,
  className = ''
}) {
  const navigate = useNavigate();

  // Get related terms for the current topic
  const rawRelatedTerms = getRelatedTermsForTopic(currentTopic, relatedTermsCache);
  
  // Filter to only include available topics and format for display
  const filteredRelatedTerms = filterRelatedTermsByAvailability(rawRelatedTerms, availableTopics);
  const relatedTerms = formatRelatedTermsForDisplay(filteredRelatedTerms, maxDisplay);

  // Don't render if no related terms
  if (!relatedTerms || relatedTerms.length === 0) {
    return null;
  }

  /**
   * Handles clicking on a related topic
   */
  const handleTopicClick = (topicName) => {
    navigate(`/playlist-builder?keywords=${encodeURIComponent(topicName)}`);
  };

  return (
    <div className={`related-topics-compact ${className}`}>
      <div className="mb-2">
        <span className="text-gray-600 text-sm font-medium font-['Inter']">
          Related:
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {relatedTerms.map((relatedTerm, index) => (
          <button
            key={index}
            onClick={() => handleTopicClick(relatedTerm.name)}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-black rounded-full border border-gray-200 hover:border-gray-300 transition-all duration-200 font-['Chivo_Mono']"
          >
            {relatedTerm.name}
          </button>
        ))}
        {rawRelatedTerms.length > maxDisplay && (
          <span className="px-3 py-1 text-sm text-gray-500 font-['Chivo_Mono']">
            +{rawRelatedTerms.length - maxDisplay}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Inline version for displaying within text or smaller contexts
 */
export function RelatedTopicsInline({ 
  currentTopic, 
  relatedTermsCache, 
  availableTopics = [], 
  maxDisplay = 3,
  separator = ' • '
}) {
  const navigate = useNavigate();

  // Get related terms for the current topic
  const rawRelatedTerms = getRelatedTermsForTopic(currentTopic, relatedTermsCache);
  
  // Filter to only include available topics and format for display
  const filteredRelatedTerms = filterRelatedTermsByAvailability(rawRelatedTerms, availableTopics);
  const relatedTerms = formatRelatedTermsForDisplay(filteredRelatedTerms, maxDisplay);

  // Don't render if no related terms
  if (!relatedTerms || relatedTerms.length === 0) {
    return null;
  }

  /**
   * Handles clicking on a related topic
   */
  const handleTopicClick = (topicName) => {
    navigate(`/playlist-builder?keywords=${encodeURIComponent(topicName)}`);
  };

  return (
    <span className="related-topics-inline">
      {relatedTerms.map((relatedTerm, index) => (
        <span key={index}>
          <button
            onClick={() => handleTopicClick(relatedTerm.name)}
            className="text-blue-600 hover:text-blue-800 underline font-['Chivo_Mono'] text-sm transition-colors"
          >
            {relatedTerm.name}
          </button>
          {index < relatedTerms.length - 1 && separator}
        </span>
      ))}
      {rawRelatedTerms.length > maxDisplay && (
        <span className="text-gray-500 font-['Chivo_Mono'] text-sm">
          {separator}+{rawRelatedTerms.length - maxDisplay} more
        </span>
      )}
    </span>
  );
}

