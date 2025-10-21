import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * TopicBubbles - Displays top topics as styled bubble cluster
 * 
 * @param {number} maxTopics - Maximum number of topics to display (default: 8)
 * @returns {React.ReactElement} Topic bubbles component
 */
const TopicBubbles = ({ maxTopics = 8 }) => {
  const [topTopics, setTopTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTopTopics = async () => {
      try {
        const topTopicsDoc = await getDoc(doc(db, 'metadata', 'topTopics'));
        
        if (topTopicsDoc.exists()) {
          const data = topTopicsDoc.data();
          const topics = data.topics || [];
          
          // Take only the requested number of topics
          setTopTopics(topics.slice(0, maxTopics));
        } else {
          console.warn('Top topics data not found. Run calculate-top-topics.js to generate it.');
          setError('Top topics data not available');
        }
      } catch (err) {
        console.error('Error fetching top topics:', err);
        setError('Failed to load top topics');
      } finally {
        setLoading(false);
      }
    };

    fetchTopTopics();
  }, [maxTopics]);

  if (loading) {
    return (
      <div className="flex flex-wrap gap-3 justify-center">
        {/* Loading skeleton bubbles */}
        {Array.from({ length: maxTopics }).map((_, index) => (
          <div
            key={index}
            className="px-4 py-2 rounded-full border border-gray-300 bg-gray-200 animate-pulse"
          >
            <div className="h-4 w-16 bg-gray-300 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-gray-500 text-sm">
        {error}
      </div>
    );
  }

  if (topTopics.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {topTopics.map((topicData, index) => (
        <Link
          key={topicData.topic}
          to={`/playlist-builder?keywords=${encodeURIComponent(topicData.topic)}`}
          className="group relative"
        >
          <button className="px-4 py-2 rounded-full border border-red-500 text-red-500 text-sm font-light font-['Chivo_Mono'] hover:bg-red-500 hover:text-white transition-colors duration-200 whitespace-nowrap">
            {topicData.topic}
          </button>
          
          {/* Tooltip showing interview count */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
            {topicData.count} interview{topicData.count !== 1 ? 's' : ''}
          </div>
        </Link>
      ))}
    </div>
  );
};

export default TopicBubbles;
