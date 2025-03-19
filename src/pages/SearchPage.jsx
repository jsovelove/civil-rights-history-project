/**
 * @fileoverview SearchPage component for searching interview content by keywords.
 * 
 * This component provides a simple, focused interface for users to search for
 * interview content using keywords. It includes a prominent search form and
 * a collection of popular keyword suggestions to help users discover content.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';

/**
 * SearchPage - Primary search interface for the application
 * 
 * This component:
 * 1. Provides a search form for entering keywords
 * 2. Validates input and handles form submission
 * 3. Navigates to the playlist builder with search parameters
 * 4. Offers quick access to popular keyword searches
 * 
 * @returns {React.ReactElement} The search page interface
 */
export default function SearchPage() {
  // State for the keywords input field
  const [keywords, setKeywords] = useState('');
  const navigate = useNavigate();

  /**
   * Handles search form submission
   * Validates input and navigates to playlist builder with search parameters
   * 
   * @param {React.FormEvent} e - Form submit event
   */
  const handleSearch = (e) => {
    e.preventDefault();
    if (keywords.trim()) {
      navigate(`/playlist-builder?keywords=${encodeURIComponent(keywords)}`);
    } else {
      alert('Please enter at least one keyword.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen font-sans flex flex-col items-center justify-center">
      {/* Search header and form */}
      <div className="w-full max-w-3xl text-center mb-16">
        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">
          Search Interviews
        </h1>
        <p className="text-base leading-relaxed text-gray-600 mb-10 max-w-xl mx-auto">
          Enter keywords separated by commas to find relevant interviews and create custom playlists
        </p>
        
        <form onSubmit={handleSearch} className="w-full">
          <div className="relative w-full">
            {/* Search icon */}
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <SearchIcon className="w-5 h-5 text-gray-500" />
            </div>
            
            {/* Search input field */}
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="civil rights, voting, education..."
              className="w-full pl-12 pr-32 py-5 border border-gray-200 bg-white rounded-xl shadow-sm outline-none text-base text-gray-900 transition-all duration-300 focus:shadow-blue-300 focus:ring-2 focus:ring-blue-500"
            />
            
            {/* Search submit button */}
            <button
              type="submit"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg shadow-sm border-none cursor-pointer transition-all duration-300 hover:from-blue-700 hover:to-indigo-700 hover:shadow-md"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Popular keywords section */}
      <div className="w-full max-w-3xl">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">
            Popular Keywords
          </h2>
          <div className="flex flex-wrap gap-2">
            {/* Array of popular keywords with click handlers */}
            {['civil rights', 'voting', 'education', 'segregation', 'protests', 'leadership', 'communities', 'legislation', 'equality', 'freedom'].map((keyword) => (
              <button
                key={keyword}
                onClick={() => {
                  setKeywords(keyword);
                  navigate(`/playlist-builder?keywords=${encodeURIComponent(keyword)}`);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm border-none cursor-pointer transition-colors duration-200 hover:bg-blue-100 hover:text-blue-800"
              >
                {keyword}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}