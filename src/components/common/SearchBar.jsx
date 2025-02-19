import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SearchBar() {
  const [keywords, setKeywords] = useState('')
  const navigate = useNavigate()

  const handleSearch = () => {
    if (keywords.trim()) {
      navigate(`/playlist-builder?keywords=${encodeURIComponent(keywords)}`)
    } else {
      alert('Please enter at least one keyword.')
    }
  }

  return (
    <div className="max-w-2xl mx-auto mb-8">
      <div className="flex gap-2">
        <input
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="Enter keywords (comma-separated)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSearch}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Search
        </button>
      </div>
    </div>
  )
}