// src/pages/KeywordDirectory.jsx
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

  // The original logic functions remain unchanged
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
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e5e7eb',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
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
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #ef4444',
          color: '#b91c1c',
          padding: '16px 24px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '24px',
      backgroundColor: '#f9fafb',
      minHeight: '100vh',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Page header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#111827',
          margin: '0 0 16px 0'
        }}>
          Keyword Directory
        </h1>
        <p style={{
          fontSize: '16px',
          lineHeight: '1.6',
          color: '#4b5563',
          maxWidth: '800px'
        }}>
          Browse all keywords from the interview collection. Click on any keyword to see details,
          or create a custom playlist based on specific keywords.
        </p>
      </div>

      {/* Search filter */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ maxWidth: '400px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Filter Keywords
          </label>
          <input
            type="text"
            placeholder="Type to filter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
          />
        </div>
      </div>

      {/* Stats summary */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '24px'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '16px',
            backgroundColor: '#eff6ff',
            borderRadius: '8px'
          }}>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1e40af',
              marginBottom: '8px'
            }}>
              {keywordData.length}
            </div>
            <div style={{
              fontSize: '14px',
              color: '#6b7280'
            }}>
              Total Keywords
            </div>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '16px',
            backgroundColor: '#ecfdf5',
            borderRadius: '8px'
          }}>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#047857',
              marginBottom: '8px'
            }}>
              {keywordData.reduce((sum, item) => sum + item.count, 0)}
            </div>
            <div style={{
              fontSize: '14px',
              color: '#6b7280'
            }}>
              Total Mentions
            </div>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '16px',
            backgroundColor: '#f5f3ff',
            borderRadius: '8px'
          }}>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#6d28d9',
              marginBottom: '8px'
            }}>
              {formatTime(keywordData.reduce((sum, item) => sum + item.totalLengthSeconds, 0))}
            </div>
            <div style={{
              fontSize: '14px',
              color: '#6b7280'
            }}>
              Total Content Duration
            </div>
          </div>
        </div>
      </div>

      {/* Keywords list */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        overflow: 'hidden'
      }}>
        {filteredKeywords.length === 0 ? (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            No keywords found matching your search.
          </div>
        ) : (
          <ul style={{ 
            listStyle: 'none', 
            margin: 0, 
            padding: 0,
            borderTop: '1px solid #f3f4f6' 
          }}>
            {filteredKeywords.map((item) => (
              <li 
                key={item.keyword} 
                style={{ 
                  borderBottom: '1px solid #f3f4f6',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ padding: '24px' }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    '@media (min-width: 640px)': {
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }
                  }}>
                    <div>
                      <h3 
                        style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#2563eb',
                          margin: '0 0 8px 0',
                          cursor: 'pointer',
                          transition: 'color 0.2s'
                        }}
                        onClick={() => toggleKeyword(item.keyword)}
                        onMouseEnter={(e) => e.target.style.color = '#1e40af'}
                        onMouseLeave={(e) => e.target.style.color = '#2563eb'}
                      >
                        {item.keyword}
                      </h3>
                      <div style={{ margin: '8px 0' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          backgroundColor: '#dbeafe',
                          color: '#1e40af',
                          fontSize: '13px',
                          fontWeight: '500',
                          marginRight: '8px'
                        }}>
                          {item.count} mentions
                        </span>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          backgroundColor: '#dcfce7',
                          color: '#047857',
                          fontSize: '13px',
                          fontWeight: '500'
                        }}>
                          {formatTime(item.totalLengthSeconds)} total length
                        </span>
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '8px'
                    }}>
                      <button
                        onClick={() => handleViewPlaylist(item.keyword)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          border: 'none',
                          borderRadius: '6px',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ marginRight: '6px' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Play
                      </button>
                      <button
                        onClick={() => handleEditPlaylist(item.keyword)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          backgroundColor: '#ffffff',
                          color: '#4b5563',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#ffffff'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ marginRight: '6px' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {expandedKeyword === item.keyword && (
                    <div style={{
                      marginTop: '24px',
                      paddingTop: '24px',
                      borderTop: '1px solid #e5e7eb'
                    }}>
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: '500',
                        color: '#4b5563',
                        marginBottom: '16px'
                      }}>Recent Mentions:</h4>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                      }}>
                        {item.summaries.slice(0, 3).map((summary, idx) => (
                          <div key={idx} style={{
                            backgroundColor: '#f9fafb',
                            borderRadius: '8px',
                            padding: '16px'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}>
                              <span style={{
                                fontSize: '13px',
                                color: '#6b7280'
                              }}>
                                {summary.timestamp}
                              </span>
                              {summary.documentName && (
                                <span style={{
                                  fontSize: '13px',
                                  fontWeight: '500',
                                  color: '#2563eb'
                                }}>
                                  {summary.documentName}
                                </span>
                              )}
                            </div>
                            <p style={{
                              marginTop: '8px',
                              color: '#4b5563',
                              fontSize: '14px',
                              lineHeight: '1.6'
                            }}>
                              {summary.summary.substring(0, 200)}
                              {summary.summary.length > 200 ? '...' : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                      {item.summaries.length > 3 && (
                        <div style={{
                          marginTop: '16px',
                          textAlign: 'right'
                        }}>
                          <button
                            onClick={() => handleViewPlaylist(item.keyword)}
                            style={{
                              color: '#2563eb',
                              fontSize: '14px',
                              fontWeight: '500',
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              transition: 'color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.color = '#1e40af'}
                            onMouseLeave={(e) => e.target.style.color = '#2563eb'}
                          >
                            View all {item.summaries.length} mentions →
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