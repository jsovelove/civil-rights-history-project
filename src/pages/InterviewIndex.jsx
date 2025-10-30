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
import arrowRight from '../assetts/vectors/arrow right.svg';

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
          return (b.totalMinutes || 0) - (a.totalMinutes || 0);
        case 'Duration (Low-High)':
          return (a.totalMinutes || 0) - (b.totalMinutes || 0);
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
        return sum + (interview.totalMinutes || 0);
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
      <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 xl:px-[48px] pt-3 pb-6">
        {/* Main heading */}
        <div className="mb-6 sm:mb-7 md:mb-8 lg:mb-[32px]">
          <h1 className="text-stone-900 text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
            Interview Index
          </h1>
        </div>

        {/* Interview count and total minutes */}
        <div className="mb-[31px]">
          <span className="text-red-500 text-base font-light" style={{ fontFamily: 'Chivo Mono, monospace' }}>
            {filteredInterviews.length} Interviews, {totalMinutes} minutes
          </span>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-black mb-8 sm:mb-10 md:mb-12 lg:mb-[48px]"></div>

        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-8 sm:mb-10 md:mb-12 lg:mb-[48px]">
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
                className="text-stone-900 text-base sm:text-lg md:text-xl font-light bg-transparent border-none outline-none w-40 sm:w-48 md:w-60"
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
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 xl:px-[49px] pb-8 sm:pb-12 md:pb-16 lg:pb-[48px]">
        {filteredInterviews.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-stone-900 text-base font-light" style={{ fontFamily: 'Chivo Mono, monospace' }}>
              No interviews found matching your search.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-3 sm:gap-x-4 md:gap-x-5 lg:gap-x-6 xl:gap-x-8 gap-y-4 sm:gap-y-5 md:gap-y-6 lg:gap-y-8 xl:gap-y-10">
            {filteredInterviews.map((interview) => (
              <div 
                key={interview.id}
                className="w-full max-w-xs sm:max-w-sm lg:max-w-md xl:max-w-lg mx-auto cursor-pointer group"
                onClick={() => handleInterviewClick(interview.id)}
              >
                <div className="w-full flex flex-col items-center gap-3">
                  {/* Image with zoom effect */}
                  <div className="w-full aspect-[1.83/1] overflow-hidden">
                    {interview.thumbnailUrl ? (
                      <img 
                        className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110" 
                        src={interview.thumbnailUrl}
                        alt={interview.name}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-300 flex items-center justify-center transition-transform duration-300 ease-in-out group-hover:scale-110">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 sm:h-16 sm:w-16 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {/* Text content */}
                  <div className="self-stretch min-h-20 relative">
                    <div className="w-full relative">
                      {/* Arrow that appears on hover - positioned absolutely */}
                      <img 
                        src={arrowRight}
                        alt=""
                        className="h-8 w-8 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex-shrink-0 absolute left-0 top-1"
                        style={{ filter: 'invert(35%) sepia(89%) saturate(2893%) hue-rotate(345deg) brightness(97%) contrast(93%)' }}
                      />
                      {/* Name that slides right on hover */}
                      <div className="text-stone-900 text-4xl font-bold font-['Source_Serif_4'] transition-all duration-300 group-hover:text-[#F2483C] group-hover:underline group-hover:translate-x-11">
                        {interview.name}
                      </div>
                      {/* Role and duration stay in place */}
                      <div className="justify-start text-stone-900 text-base font-light font-['Chivo_Mono'] transition-colors duration-300 group-hover:text-[#F2483C]">
                        {interview.roleSimplified} | {formatDuration(interview.totalMinutes)}
                      </div>
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