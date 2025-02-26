import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search as SearchIcon } from 'lucide-react'

export default function SearchPage() {
  const [keywords, setKeywords] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    if (keywords.trim()) {
      navigate(`/playlist-builder?keywords=${encodeURIComponent(keywords)}`)
    } else {
      alert('Please enter at least one keyword.')
    }
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-3xl text-center mb-16">
        <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Search Interviews
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-10 max-w-xl mx-auto">
          Enter keywords separated by commas to find relevant interviews and create custom playlists
        </p>
        
        <form onSubmit={handleSearch} className="w-full">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <SearchIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="civil rights, voting, education..."
              className="w-full pl-12 pr-24 py-5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-gray-800 dark:text-white text-lg transition-all duration-300"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      <div className="w-full max-w-2xl">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Popular Keywords</h2>
          <div className="flex flex-wrap gap-2">
            {['civil rights', 'voting', 'education', 'segregation', 'protests', 'leadership', 'communities', 'legislation', 'equality', 'freedom'].map((keyword) => (
              <button
                key={keyword}
                onClick={() => {
                  setKeywords(keyword)
                  navigate(`/playlist-builder?keywords=${encodeURIComponent(keyword)}`)
                }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-200 rounded-lg transition-colors text-sm"
              >
                {keyword}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}