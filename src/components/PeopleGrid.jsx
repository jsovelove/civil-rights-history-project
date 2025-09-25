/**
 * @fileoverview PeopleGrid component for displaying and navigating interview subjects.
 * 
 * This component provides a grid-based display of interview subjects with search functionality,
 * modal details view, and keyboard navigation support. It implements caching for improved
 * performance and responsive layout for different screen sizes.
 */

import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllInterviews } from '../services/firebase';
import { DirectoryCacheContext } from '../pages/ContentDirectory';

/**
 * PeopleGrid - Grid display of interview subjects with search and details view
 * 
 * This component provides:
 * 1. A grid-based display of interview subjects with thumbnails
 * 2. Search functionality by name
 * 3. Modal details view with navigation
 * 4. Keyboard navigation support
 * 5. Caching integration for performance
 * 6. Responsive layout for different devices
 * 
 * @component
 * @example
 * <PeopleGrid />
 * 
 * @returns {React.ReactElement} People grid component
 */
export default function PeopleGrid() {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPeople, setFilteredPeople] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  // Get cache context for data persistence
  const { cache, updateCache } = useContext(DirectoryCacheContext);

  /**
   * Initialize data from cache or fetch new data
   */
  useEffect(() => {
    if (cache.people) {
      console.log('Using cached people data');
      setPeople(cache.people);
      setFilteredPeople(cache.people);
      setLoading(false);
    } else {
      fetchPeople();
    }
  }, [cache.people]);

  /**
   * Filter people based on search term
   */
  useEffect(() => {
    if (searchTerm) {
      const filtered = people.filter(person =>
        person.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPeople(filtered);
    } else {
      setFilteredPeople(people);
    }
  }, [searchTerm, people]);

  /**
   * Open modal when a person is selected
   */
  useEffect(() => {
    if (selectedPerson) {
      setIsModalOpen(true);
    }
  }, [selectedPerson]);

  /**
   * Close modal and maintain selection
   * 
   * The selection is maintained to allow reopening the same modal
   * when needed without having to reselect the person.
   */
  const closeModal = () => {
    setIsModalOpen(false);
  };

  /**
   * Extract YouTube video ID from embed URL
   * 
   * @param {string} url - YouTube embed URL
   * @returns {string|null} YouTube video ID or null if not found
   */
  const extractVideoId = (url) => {
    const match = url?.match(/embed\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  /**
   * Fetch people data from Firebase
   * 
   * Retrieves all interview subjects, extracts thumbnails from YouTube links,
   * and updates both state and cache with the results.
   */
  const fetchPeople = async () => {
    try {
      setLoading(true);
      
      // Use enhanced service that handles collection switching
      const interviews = await getAllInterviews({ limit: 200 });
      const peopleData = [];

      interviews.forEach(interview => {
        const videoId = extractVideoId(interview.videoEmbedLink);

        peopleData.push({
          id: interview.id,
          name: interview.name || interview.documentName || 'Unknown Name',
          role: interview.role || 'Unknown Role',
          videoEmbedLink: interview.videoEmbedLink,
          thumbnailUrl: videoId ?
            `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` :
            null,
          // Enhanced fields from metadataV2
          keyThemes: interview.keyThemes || [],
          historicalSignificance: interview.historicalSignificance || '',
          processingInfo: interview.processingInfo || {}
        });
      });

      setPeople(peopleData);
      setFilteredPeople(peopleData);
      
      // Store in cache for future use
      updateCache('people', peopleData);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching people:', err);
      setError('Failed to load interview subjects');
      setLoading(false);
    }
  };

  /**
   * Navigate to previous person in the filtered list
   * 
   * Implements circular navigation (wraps to end when at the beginning)
   */
  const navigateToPrev = () => {
    if (!selectedPerson) return;

    // Get filtered people based on search
    const currentIndex = filteredPeople.findIndex(p => p.id === selectedPerson.id);
    if (currentIndex > 0) {
      // Go to previous person
      setSelectedPerson(filteredPeople[currentIndex - 1]);
    } else {
      // Wrap around to the last person
      setSelectedPerson(filteredPeople[filteredPeople.length - 1]);
    }
  };

  /**
   * Navigate to next person in the filtered list
   * 
   * Implements circular navigation (wraps to beginning when at the end)
   */
  const navigateToNext = () => {
    if (!selectedPerson) return;

    // Get filtered people based on search
    const currentIndex = filteredPeople.findIndex(p => p.id === selectedPerson.id);
    if (currentIndex < filteredPeople.length - 1) {
      // Go to next person
      setSelectedPerson(filteredPeople[currentIndex + 1]);
    } else {
      // Wrap around to the first person
      setSelectedPerson(filteredPeople[0]);
    }
  };

  /**
   * Set up keyboard navigation for the modal
   * 
   * Enables left/right arrow keys for navigation and Escape to close
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isModalOpen) return;

      if (e.key === 'ArrowLeft') {
        navigateToPrev();
      } else if (e.key === 'ArrowRight') {
        navigateToNext();
      } else if (e.key === 'Escape') {
        closeModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, selectedPerson, filteredPeople]);

  /**
   * Navigation icon components for modal
   */
  const ChevronLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  );

  const ChevronRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  );

  const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );

  /**
   * Modal component for displaying person details
   * 
   * @component
   * @param {Object} props - Component props
   * @param {Object} props.person - Person data to display
   * @param {boolean} props.isOpen - Whether the modal is open
   * @param {Function} props.onClose - Function to close the modal
   * @param {Function} props.onPrev - Function to navigate to previous person
   * @param {Function} props.onNext - Function to navigate to next person
   * @returns {React.ReactElement|null} Modal or null if not open
   */
  const PersonModal = ({ person, isOpen, onClose, onPrev, onNext }) => {
    if (!isOpen || !person) return null;

    // Handle click on backdrop to close (but not when clicking the modal itself)
    const handleBackdropClick = (e) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    };

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black bg-opacity-60"
          onClick={handleBackdropClick}
        ></div>

        {/* Left navigation arrow - positioned outside the modal */}
        <button
          className="absolute left-4 md:left-8 z-50 bg-black bg-opacity-60 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-80 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          aria-label="Previous person"
        >
          <ChevronLeftIcon />
        </button>

        {/* Right navigation arrow - positioned outside the modal */}
        <button
          className="absolute right-4 md:right-8 z-50 bg-black bg-opacity-60 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-80 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          aria-label="Next person"
        >
          <ChevronRightIcon />
        </button>

        {/* Modal content */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-fadeIn z-50 relative border border-white/30">
          {/* Modal Header */}
          <div className="relative">
            {person.thumbnailUrl && (
              <div className="w-full h-48 overflow-hidden">
                <img
                  src={person.thumbnailUrl}
                  alt={person.name}
                  className="w-full h-full object-cover scale-125"
                />
              </div>
            )}
            {/* Close button */}
            <button
              className="absolute top-2 right-2 bg-black bg-opacity-60 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-80 transition-colors"
              onClick={onClose}
              aria-label="Close"
            >
              <XIcon />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6">
            <h2 className="text-2xl font-bold text-black mb-2" style={{
              fontFamily: 'Freight Text Pro, Lora, serif'
            }}>{person.name}</h2>
            <p className="text-black/70 mb-6 font-mono tracking-wide text-sm">{person.role}</p>

            <button
              onClick={() => navigate(`/interview-player?documentName=${encodeURIComponent(person.id)}`)}
              className="w-full text-white px-4 py-3 rounded-md transition-colors duration-200 font-medium"
              style={{
                backgroundColor: '#F2483C',
                fontFamily: 'Freight Text Pro, Lora, serif'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#D63C30'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#F2483C'}
            >
              View Interview
            </button>
          </div>
        </div>
      </div>
    );
  };

  /**
   * PhotoCard component for displaying a person thumbnail
   * 
   * @component
   * @param {Object} props - Component props
   * @param {Object} props.person - Person data to display
   * @returns {React.ReactElement} Photo card component
   */
  const PhotoCard = ({ person }) => {
    const isSelected = selectedPerson?.id === person.id;

    return (
      <div className="flex flex-col items-center space-y-2">
        <div></div>
        {/* Square card container */}
        <div
          className={`w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-md 
                    overflow-hidden shadow-md cursor-pointer transition-all duration-200
                    ${isSelected ? 'ring-4' : 'hover:ring-2 hover:ring-black/30'}`}
          onClick={() => setSelectedPerson(person)}
          style={{ 
            touchAction: 'manipulation',
            ringColor: isSelected ? '#F2483C' : undefined
          }}
        >
          {person.thumbnailUrl ? (
            <div className="w-full h-full overflow-hidden">
              <img
                src={person.thumbnailUrl}
                alt={person.name}
                className="w-full h-full object-cover object-center scale-150"
                draggable={false}
                loading="lazy"
              />
            </div>
          ) : (
            <div className="w-full h-full bg-black/20 flex items-center justify-center">
              <span className="text-black/40 text-xs font-mono">No photo</span>
            </div>
          )}
        </div>

        {/* Name below card */}
        <div className="text-center w-full">
          <p className={`text-xs sm:text-sm truncate max-w-full ${
            isSelected ? 'font-bold' : 'text-black/80'
          }`} style={{
            color: isSelected ? '#F2483C' : undefined,
            fontFamily: 'Freight Text Pro, Lora, serif'
          }}>
            {person.name}
          </p>
        </div>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-black/20" style={{
          borderTopColor: '#F2483C'
        }} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-black/70" style={{
          fontFamily: 'Freight Text Pro, Lora, serif'
        }}>{error}</div>
      </div>
    );
  }

  // Empty state
  if (people.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-black/60" style={{
          fontFamily: 'Freight Text Pro, Lora, serif'
        }}>No interview subjects found</div>
      </div>
    );
  }

  return (
    <>
      {/* Search header */}
      <div className="mb-6 max-w-xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-6 border border-white/20">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-black mb-4" style={{
              fontFamily: 'Freight Text Pro, Lora, serif'
            }}>
              {searchTerm ? `${filteredPeople.length} of ${people.length} People` : `${people.length} People`}
            </h2>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name..."
              className="w-full p-3 border border-black/20 rounded-md focus:outline-none focus:ring-2 focus:border-black/40 transition-colors bg-white/80 backdrop-blur-sm"
              style={{
                fontFamily: 'Freight Text Pro, Lora, serif'
              }}
            />
          </div>
        </div>
      </div>

      {/* People Grid */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-4 gap-y-6">
            {filteredPeople.map((person) => (
              <PhotoCard key={person.id} person={person} />
            ))}
          </div>
        </div>
      </div>

      {/* Modal for selected person with navigation */}
      <PersonModal
        person={selectedPerson}
        isOpen={isModalOpen}
        onClose={closeModal}
        onPrev={navigateToPrev}
        onNext={navigateToNext}
      />
    </>
  );
}