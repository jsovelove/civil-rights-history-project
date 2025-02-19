import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import VisualizationContainer from '../components/visualization/VisualizationContainer.jsx'

export default function Home() {
  const [activeTab, setActiveTab] = useState('keywords')
  const [searchInput, setSearchInput] = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleSearch = () => {
    if (searchInput.trim()) {
      navigate(`/playlist-builder?keywords=${encodeURIComponent(searchInput)}`)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
          Civil Rights History Project
        </h1>

      </div>

      {/* Navigation Links */}
      <nav className="flex justify-center gap-4 mb-8">
        <Link 
          to="/keyword-directory" 
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
        >
          Keyword Directory
        </Link>
        <Link 
          to="/transcript-summarizer" 
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
        >
          Transcript Summarizer
        </Link>
      </nav>

      {/* Search Section */}
      <div className="max-w-3xl mx-auto mb-16">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search by keyword
            </label>
            <div className="flex gap-2">
              <input
                id="search"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter keywords (comma-separated)"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleSearch}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visualization Section */}
      <div className="mb-12">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="border-b border-gray-200">
            <ul className="flex divide-x divide-gray-200">
              {['keywords', 'map', 'timeline', 'people'].map((tab) => (
                <li key={tab} className="flex-1">
                  <button
                    onClick={() => setActiveTab(tab)}
                    className={`w-full py-4 px-1 text-center transition-colors ${
                      activeTab === tab
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Render Actual Visualization */}
          <div className="p-6">
            <VisualizationContainer activeVisualization={activeTab} />
          </div>
        </div>
      </div>
    </div>
  )
}
