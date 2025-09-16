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
 * 5. Sorting functionality
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
  const [sortBy, setSortBy] = useState('A-Z');
  const [totalMinutes, setTotalMinutes] = useState(0);
  const navigate = useNavigate();

  /**
   * Update filtered and sorted interviews when search term or sort changes
   */
  useEffect(() => {
    let filtered = interviews;
    
    // Apply search filter
    if (searchTerm) {
      filtered = interviews.filter(interview =>
        interview.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'A-Z':
          return a.name.localeCompare(b.name);
        case 'Z-A':
          return b.name.localeCompare(a.name);
        case 'Duration (High-Low)':
          return (b.duration || 0) - (a.duration || 0);
        case 'Duration (Low-High)':
          return (a.duration || 0) - (b.duration || 0);
        default:
          return a.name.localeCompare(b.name);
      }
    });
    
    setFilteredInterviews(sorted);
  }, [searchTerm, interviews, sortBy]);

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

      // Calculate total minutes
      const total = interviewsData.reduce((sum, interview) => {
        return sum + (interview.duration || 0);
      }, 0);
      
      setInterviews(interviewsData);
      setFilteredInterviews(interviewsData);
      setTotalMinutes(total);
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
   * Formats minutes as "X Minutes"
   */
  const formatDuration = (minutes) => {
    if (!minutes || minutes === 0) return '';
    return `${Math.floor(minutes)} Minutes`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center" style={{ backgroundColor: '#EBEAE9' }}>
        <div className="w-12 h-12 border-4 border-black/20 rounded-full animate-spin" style={{
          borderTopColor: '#F2483C'
        }}></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center" style={{ backgroundColor: '#EBEAE9' }}>
        <div className="bg-white border border-black text-black px-6 py-4" style={{
          fontFamily: 'Freight Text Pro, serif'
        }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden" style={{ backgroundColor: '#EBEAE9' }}>
      {/* Header Section */}
      <div className="w-full px-[48px] pt-[161px] pb-[48px]">
        {/* Interview count and total minutes */}
        <div className="mb-[31px]">
          <span className="text-red-500 text-base font-light" style={{ fontFamily: 'Chivo Mono, monospace' }}>
            {filteredInterviews.length} Interviews, {totalMinutes} minutes
          </span>
        </div>

        {/* Main heading */}
        <div className="mb-[32px]">
          <h1 className="text-stone-900 text-8xl font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
            Interview Index
          </h1>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-black mb-[48px]"></div>

        {/* Controls Row */}
        <div className="flex justify-between items-center mb-[48px]">
          {/* Search Section */}
          <div className="flex items-center gap-6">
            {/* Search Icon and Input */}
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 relative">
                <div className="w-2.5 h-0 absolute left-[38.34px] top-[37.79px] origin-top-left rotate-[-133.05deg] border-2 border-stone-900"></div>
                <div className="w-6 h-6 absolute left-[10px] top-[13.17px] origin-top-left rotate-[-5.18deg] rounded-full border-2 border-stone-900" />
              </div>
              <input
                type="text"
                placeholder="Search in index"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-stone-900 text-xl font-light bg-transparent border-none outline-none w-60"
                style={{ fontFamily: 'Chivo Mono, monospace' }}
              />
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-8">
            {/* Filter */}
            <div className="w-32 h-12 flex items-center">
              <div className="w-12 h-12 relative mr-[15px]">
                <div className="w-9 h-0 absolute left-[42px] top-[12px] origin-top-left rotate-180 border-2 border-stone-900"></div>
                <div className="w-9 h-0 absolute left-[42px] top-[24px] origin-top-left rotate-180 border-2 border-stone-900"></div>
                <div className="w-9 h-0 absolute left-[42px] top-[36px] origin-top-left rotate-180 border-2 border-stone-900"></div>
                <div className="w-2 h-2 absolute left-[11px] top-[9px] bg-gray-200 rounded-full border-2 border-stone-900" />
                <div className="w-2 h-2 absolute left-[29px] top-[21px] bg-gray-200 rounded-full border-2 border-stone-900" />
                <div className="w-2 h-2 absolute left-[17px] top-[33px] bg-gray-200 rounded-full border-2 border-stone-900" />
              </div>
              <span className="text-stone-900 text-xl font-light" style={{ fontFamily: 'Chivo Mono, monospace' }}>
                Filter
              </span>
            </div>

            {/* Sort by dropdown */}
            <div className="w-40 h-6 relative">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-stone-900 text-xl font-light bg-transparent border-none outline-none cursor-pointer appearance-none pr-6"
                style={{ fontFamily: 'Chivo Mono, monospace' }}
              >
                <option value="A-Z">Sort by: A-Z</option>
                <option value="Z-A">Sort by: Z-A</option>
                <option value="Duration (High-Low)">Duration (High-Low)</option>
                <option value="Duration (Low-High)">Duration (Low-High)</option>
              </select>
              <div className="w-4 h-3 absolute left-[168px] top-[3px] origin-top-left rotate-90 border border-stone-900" />
            </div>
          </div>
        </div>
      </div>

      {/* Interviews Grid */}
      <div className="px-[49px] pb-[48px]">
        {filteredInterviews.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-stone-900 text-base font-light" style={{ fontFamily: 'Chivo Mono, monospace' }}>
              No interviews found matching your search.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-x-[74px] gap-y-[87px]">
            {filteredInterviews.map((interview) => (
              <div 
                key={interview.id}
                className="w-[526.94px] h-96 cursor-pointer"
                onClick={() => handleInterviewClick(interview.id)}
              >
                <div className="w-[525.89px] flex flex-col items-center gap-3">
                  {/* Image */}
                  {interview.thumbnailUrl ? (
                    <img 
                      className="w-[526.94px] h-72 object-cover" 
                      src={interview.thumbnailUrl}
                      alt={interview.name}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-[526.94px] h-72 bg-zinc-300 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Text content */}
                  <div className="self-stretch h-20 relative">
                    <div className="absolute left-[1.04px] top-[55.41px] text-stone-900 text-base font-light" style={{ fontFamily: 'Chivo Mono, monospace' }}>
                      {formatDuration(interview.duration)}
                    </div>
                    <div className="w-[525.89px] absolute left-0 top-0 text-stone-900 text-4xl font-bold" style={{ fontFamily: 'Source Serif 4, serif' }}>
                      {interview.name}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 