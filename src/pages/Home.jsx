import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import VisualizationContainer from '../components/visualization/VisualizationContainer.jsx';

export default function Home() {
  // Set default active tab to "timeline"
  const [activeTab, setActiveTab] = useState('timeline');
  const { user } = useAuth();
  
  // Reorder the tab array so that "timeline" is first.
  const tabs = ['timeline', 'keywords', 'map', 'people'];
  
  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen font-sans">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text mb-6">
          Civil Rights History Project
        </h1>
      </div>
      
      {/* Visualization Section */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 mb-6">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <ul className="flex flex-wrap m-0 p-0 list-none">
            {tabs.map((tab) => (
              <li key={tab} className="flex-1">
                <button
                  onClick={() => setActiveTab(tab)}
                  className={`w-full py-4 px-1 text-sm text-center transition-all duration-300 cursor-pointer border-0 ${
                    activeTab === tab 
                      ? 'bg-indigo-50 text-blue-800 font-semibold border-b-2 border-blue-600' 
                      : 'bg-transparent text-gray-500 font-normal border-b-0'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Render the active visualization */}
        <div className="p-6">
          <VisualizationContainer activeVisualization={activeTab} />
        </div>
      </div>
    </div>
  );
}