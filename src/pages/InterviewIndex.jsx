/**
 * @fileoverview InterviewIndex page for browsing interviews in a card-based layout.
 * 
 * This page provides an index view of interviews with thumbnails and basic information,
 * displaying them in a clean card grid with search functionality.
 * It uses pre-aggregated data from Firestore for optimal performance.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * InterviewIndex Page - Card-based interview directory with search
 * 
 * This page provides:
 * 1. A card grid layout of interviews with thumbnails
 * 2. Search functionality by interviewee name
 * 3. Navigation to individual interview players
 * 4. Efficient data loading using pre-aggregated data
 * 5. Responsive design with hover effects
 * 
 * @component
 * @returns {React.ReactElement} Interview index page
 */
export default function InterviewIndex() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredInterviews, setFilteredInterviews] = useState([]);
  const navigate = useNavigate();

  /**
   * Update filtered interviews when search term changes
   */
  useEffect(() => {
    if (searchTerm) {
      const filtered = interviews.filter(interview =>
        interview.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredInterviews(filtered);
    } else {
      setFilteredInterviews(interviews);
    }
  }, [searchTerm, interviews]);

  /**
   * Fetch interviews on component mount
   */
  useEffect(() => {
    fetchInterviews();
  }, []);

  /**
   * Fetches pre-aggregated interview data from the 'interviewIndex' collection in Firestore.
   */
  const fetchInterviews = async () => {
    try {
      setLoading(true);
      
      const indexCollection = collection(db, 'interviewIndex');
      const indexSnapshot = await getDocs(indexCollection);
      
      const interviewsData = indexSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setInterviews(interviewsData);
      setFilteredInterviews(interviewsData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching interviews:", error);
      setError("Failed to load interview data");
      setLoading(false);
    }
  };

  /**
   * Handle interview card click to navigate to interview player
   */
  const handleInterviewClick = (interviewId) => {
    navigate(`/interview-player?documentName=${encodeURIComponent(interviewId)}`);
  };

  /**
   * Formats minutes as hours and minutes
   */
  const formatDuration = (minutes) => {
    if (!minutes || minutes === 0) return 'Duration not available';
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.floor(minutes % 60);
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    } else {
      return `${remainingMinutes}m`;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-200 flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-black/20 rounded-full animate-spin" style={{
          borderTopColor: '#F2483C'
        }}></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-200 flex justify-center items-center">
        <div className="bg-white border border-black text-black px-6 py-4" style={{
          fontFamily: 'Freight Text Pro, serif'
        }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EBEAE9' }}>
      {/* Header Section */}
      <div className="px-12 pt-9 pb-6">
        {/* Interview count */}
        <div className="mb-4">
          <span className="text-red-500 text-xl font-light" style={{ fontFamily: 'Chivo Mono, monospace' }}>
            {filteredInterviews.length} Interviews
          </span>
        </div>

        {/* Main heading */}
        <div className="mb-6">
          <h1 className="text-stone-900 text-8xl font-medium" style={{ fontFamily: 'Acumin Pro, sans-serif' }}>
            Interview Index
          </h1>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-black mb-6"></div>

        {/* Controls Row */}
        <div className="flex justify-between items-center mb-8">
          {/* Filter Section */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex flex-col justify-center">
                <div className="w-9 h-0.5 bg-black mb-1.5"></div>
                <div className="w-9 h-0.5 bg-black mb-1.5"></div>
                <div className="w-9 h-0.5 bg-black"></div>
              </div>
              <span className="text-stone-900 text-xl font-light" style={{ fontFamily: 'Chivo Mono, monospace' }}>
                Filter
              </span>
            </div>
            
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search interviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-black bg-white text-base font-light"
              style={{ fontFamily: 'Chivo Mono, monospace' }}
            />
          </div>

          {/* View Map Button */}
          <div className="flex items-center gap-4">
            <button className="px-6 py-3 rounded-full border border-black">
              <span className="text-black text-base font-light" style={{ fontFamily: 'Chivo Mono, monospace' }}>
                View Map
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Interviews Grid */}
      <div className="px-12 pb-12">
        {filteredInterviews.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-stone-900 text-base font-light" style={{ fontFamily: 'Chivo Mono, monospace' }}>
              No interviews found matching your search.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredInterviews.map((interview) => (
              <div 
                key={interview.id}
                className="cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => handleInterviewClick(interview.id)}
              >
                {/* Thumbnail */}
                <div className="w-full h-72 bg-black/10 overflow-hidden border border-black">
                  {interview.thumbnailUrl ? (
                    <img 
                      src={interview.thumbnailUrl} 
                      alt={interview.name}
                      className="w-full h-full object-cover transition-all duration-300"
                      style={{ 
                        filter: 'grayscale(100%)',
                      }}
                      onMouseEnter={(e) => e.target.style.filter = 'grayscale(0%)'}
                      onMouseLeave={(e) => e.target.style.filter = 'grayscale(100%)'}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-black/20">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-black/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* Name - Plain text below thumbnail */}
                <div className="mt-4">
                  <h3 className="text-stone-900 text-4xl font-bold" style={{ 
                    fontFamily: 'Freight Text Pro, serif'
                  }}>
                    {interview.name}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 