import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function KeywordDirectory() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keywordData, setKeywordData] = useState([]);
  const [expandedKeyword, setExpandedKeyword] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAndProcessKeywords();
  }, []);

  const fetchAndProcessKeywords = async () => {
    try {
      setLoading(true);
      const keywordCounts = {};
      const interviewsSnapshot = await getDocs(collection(db, "interviewSummaries"));

      // Process interviews
      for (const interviewDoc of interviewsSnapshot.docs) {
        const interviewId = interviewDoc.id;
        const subSummariesRef = collection(db, "interviewSummaries", interviewId, "subSummaries");
        const subSummariesSnapshot = await getDocs(subSummariesRef);

        subSummariesSnapshot.forEach((doc) => {
          const subSummary = doc.data();
          if (subSummary.keywords) {
            const keywords = subSummary.keywords.split(",").map(kw => kw.trim().toLowerCase());
            keywords.forEach(keyword => {
              if (!keywordCounts[keyword]) {
                keywordCounts[keyword] = { count: 0, summaries: [] };
              }
              keywordCounts[keyword].count++;
              keywordCounts[keyword].summaries.push(subSummary);
            });
          }
        });
      }

      // Transform data for display
      const processedData = Object.entries(keywordCounts)
        .map(([keyword, details]) => {
          let totalLengthSeconds = 0;
          details.summaries.forEach(subSummary => {
            if (subSummary.timestamp && subSummary.timestamp.includes(" - ")) {
              const start = extractStartTimestamp(subSummary.timestamp);
              const end = extractStartTimestamp(subSummary.timestamp.split(" - ")[1]);
              totalLengthSeconds += Math.max(0, convertTimestampToSeconds(end) - convertTimestampToSeconds(start));
            }
          });
          return {
            keyword,
            count: details.count,
            totalLengthSeconds,
            summaries: details.summaries
          };
        })
        .sort((a, b) => b.count - a.count);

      setKeywordData(processedData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching keywords:", error);
      setError("Failed to load keyword data");
      setLoading(false);
    }
  };

  const extractStartTimestamp = (rawTimestamp) => {
    const match = rawTimestamp.match(/(?:\[)?(\d{1,2}:\d{2}(?::\d{2})?)/);
    return match ? match[1] : "00:00";
  };

  const convertTimestampToSeconds = (timestamp) => {
    const parts = timestamp.split(":").map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hrs > 0
      ? `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      : `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleKeyword = (keyword) => {
    if (expandedKeyword === keyword) {
      setExpandedKeyword(null);
    } else {
      setExpandedKeyword(keyword);
    }
  };

  const handleViewPlaylist = (keyword) => {
    navigate(`/playlist-builder?keywords=${encodeURIComponent(keyword)}`);
  };
  
  const handleEditPlaylist = (keyword) => {
    navigate(`/playlist-editor?keywords=${encodeURIComponent(keyword)}`);
  };

  const filteredKeywords = searchTerm 
    ? keywordData.filter(item => 
        item.keyword.toLowerCase().includes(searchTerm.toLowerCase()))
    : keywordData;

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="bg-red-100 border border-red-500 text-red-700 px-6 py-4 rounded-lg shadow-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen font-sans">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Keyword Directory
        </h1>
        <p className="text-base text-gray-600 max-w-3xl leading-relaxed">
          Browse all keywords from the interview collection. Click on any keyword to see details,
          or create a custom playlist based on specific keywords.
        </p>
      </div>

      {/* Search filter */}
      <div className="mb-6">
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter Keywords
          </label>
          <input
            type="text"
            placeholder="Type to filter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Stats summary */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex flex-col items-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-800 mb-2">
              {keywordData.length}
            </div>
            <div className="text-sm text-gray-500">
              Total Keywords
            </div>
          </div>
          <div className="flex flex-col items-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-800 mb-2">
              {keywordData.reduce((sum, item) => sum + item.count, 0)}
            </div>
            <div className="text-sm text-gray-500">
              Total Clips
            </div>
          </div>
          <div className="flex flex-col items-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-800 mb-2">
              {formatTime(keywordData.reduce((sum, item) => sum + item.totalLengthSeconds, 0))}
            </div>
            <div className="text-sm text-gray-500">
              Total Content Duration
            </div>
          </div>
        </div>
      </div>

      {/* Keywords list */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {filteredKeywords.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No keywords found matching your search.
          </div>
        ) : (
          <ul className="list-none m-0 p-0 border-t border-gray-100">
            {filteredKeywords.map((item) => (
              <li 
                key={item.keyword} 
                className="border-b border-gray-100 transition-colors hover:bg-gray-50"
              >
                <div className="p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 
                        className="text-lg font-semibold text-blue-600 mb-2 cursor-pointer transition-colors hover:text-blue-800"
                        onClick={() => toggleKeyword(item.keyword)}
                      >
                        {item.keyword}
                      </h3>
                      <div className="my-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium mr-2">
                          {item.count} clips
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                          {formatTime(item.totalLengthSeconds)} total length
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewPlaylist(item.keyword)}
                        className="inline-flex items-center px-3 py-2 border-0 rounded-md bg-blue-600 text-white text-sm font-medium cursor-pointer transition-colors hover:bg-blue-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mr-1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Play
                      </button>
                      <button
                        onClick={() => handleEditPlaylist(item.keyword)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-600 text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mr-1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {expandedKeyword === item.keyword && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="text-base font-medium text-gray-600 mb-4">
                        Recent Clips:
                      </h4>
                      <div className="flex flex-col gap-4">
                        {item.summaries.slice(0, 3).map((summary, idx) => (
                          <div key={idx} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {summary.timestamp}
                              </span>
                              {summary.documentName && (
                                <span className="text-xs font-medium text-blue-600">
                                  {summary.documentName}
                                </span>
                              )}
                            </div>
                            <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                              {summary.summary.substring(0, 200)}
                              {summary.summary.length > 200 ? '...' : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                      {item.summaries.length > 3 && (
                        <div className="mt-4 text-right">
                          <button
                            onClick={() => handleViewPlaylist(item.keyword)}
                            className="text-blue-600 text-sm font-medium bg-transparent border-0 cursor-pointer transition-colors hover:text-blue-800"
                          >
                            View all {item.summaries.length} clips →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}