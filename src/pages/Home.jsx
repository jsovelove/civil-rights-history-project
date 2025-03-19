/**
 * @fileoverview Home page component for the Civil Rights History Project.
 * 
 * This component serves as the landing page for the application, featuring
 * a tabbed visualization interface that allows users to explore civil rights
 * history through different visualization modes (timeline, keywords, map).
 */

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import VisualizationContainer from '../components/visualization/VisualizationContainer.jsx';

/**
 * Home - Main landing page component
 * 
 * This component:
 * 1. Displays the application title and hero section
 * 2. Manages a tabbed interface for different data visualizations
 * 3. Renders the appropriate visualization based on active tab
 * 4. Provides user authentication context access
 * 
 * @returns {React.ReactElement} The home page with visualization interface
 */
export default function Home() {
  /**
   * State to track the currently active visualization tab
   * Options: 'timeline', 'keywords', 'map'
   * @type {[string, Function]} - Current active tab and setter function
   */
  const [activeTab, setActiveTab] = useState('timeline');
  
  /**
   * Authentication context to access user information
   * @type {Object} User authentication data and functions
   */
  const { user } = useAuth();
  
  /**
   * Array of available visualization tabs
   * Intentionally ordered to show timeline first as the default view
   * @type {string[]} Array of tab identifiers
   */
  const tabs = ['timeline', 'keywords', 'map'];
  
  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen font-sans">
      {/* Hero Section - Main title and introduction */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text mb-6">
          Civil Rights History Project
        </h1>
      </div>
      
      {/* Visualization Section - Contains tabs and visualization container */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 mb-6">
        {/* Tab Navigation - Allows switching between visualization types */}
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
                  {/* Capitalize first letter of tab name for display */}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Visualization Content - Renders the active visualization component */}
        <div className="p-6">
          <VisualizationContainer activeVisualization={activeTab} />
        </div>
      </div>
    </div>
  );
}