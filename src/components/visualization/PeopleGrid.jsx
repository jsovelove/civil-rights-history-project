import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { db } from '../../services/firebase'

export default function PeopleGrid() {
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [hoveredPerson, setHoveredPerson] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [selectedPerson, setSelectedPerson] = useState(null)

  const navigate = useNavigate()

  useEffect(() => {
    fetchPeople()
  }, [])

  const extractVideoId = (url) => {
    const match = url?.match(/embed\/([a-zA-Z0-9_-]+)/)
    return match ? match[1] : null
  }

  const fetchPeople = async () => {
    try {
      setLoading(true)
      const peopleSnapshot = await getDocs(collection(db, "interviewSummaries"))
      const peopleData = []

      peopleSnapshot.forEach(doc => {
        const data = doc.data()
        const videoId = extractVideoId(data.videoEmbedLink)
        
        peopleData.push({
          id: doc.id,
          name: data.name || 'Unknown Name',
          role: data.role || 'Unknown Role',
          videoEmbedLink: data.videoEmbedLink,
          thumbnailUrl: videoId ? 
            `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : 
            null
        })
      })

      setPeople(peopleData)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching people:', err)
      setError('Failed to load interview subjects')
      setLoading(false)
    }
  }

  // Updated PhotoCard component
  const PhotoCard = ({ person }) => {
    const isSelected = selectedPerson?.id === person.id

    return (
      <button 
        type="button"
        className={`relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-md overflow-hidden shadow-sm cursor-pointer focus:outline-none transition-all ${
          isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-2 hover:ring-blue-300'
        }`}
        onMouseEnter={(e) => {
          setHoveredPerson(person)
          const rect = e.currentTarget.getBoundingClientRect()
          setTooltipPosition({ 
            x: rect.left + (rect.width / 2), 
            y: rect.top 
          })
        }}
        onMouseLeave={() => setHoveredPerson(null)}
        onClick={() => {
          setSelectedPerson(person)
          console.log('Clicked:', person.name) // Debug log
        }}
      >
        <div className="w-full h-full aspect-square overflow-hidden">
          {person.thumbnailUrl ? (
            <img
              src={person.thumbnailUrl}
              alt={person.name}
              className="w-full h-full object-cover object-center scale-[1.5] transition-transform duration-300 hover:scale-[1.75]"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400 text-xs">No photo</span>
            </div>
          )}
        </div>
      </button>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  if (people.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-gray-500">No interview subjects found</div>
      </div>
    )
  }

  // 🔥 Filter people based on search term
  const filteredPeople = people.filter(person =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row gap-8 min-h-screen">
      {/* Left: Thumbnails Grid */}
      <div className="flex-1">
        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name..."
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-300"
          />
        </div>

        {/* People Grid */}
        <div className="relative">
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-14 gap-2">
            {filteredPeople.map((person) => (
              <PhotoCard key={person.id} person={person} />
            ))}
          </div>

          {/* Hover Tooltip (Only displays name) */}
          {hoveredPerson && (
            <div
              style={{
                position: 'absolute',
                left: tooltipPosition.x + 8,
                top: tooltipPosition.y - 20,
                background: 'rgba(0,0,0,0.85)',
                color: 'white',
                padding: '6px 10px',
                borderRadius: '6px',
                pointerEvents: 'none',
                fontSize: '14px',
                zIndex: 50,
              }}
            >
              <strong>{hoveredPerson.name}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Right: Selected Person Info Panel */}
      <div className="w-full md:w-72 bg-white dark:bg-gray-800 p-4 shadow-md rounded-lg border border-gray-200 dark:border-gray-700 h-fit">
        {selectedPerson ? (
          <div className="space-y-4">
            {selectedPerson.thumbnailUrl && (
              <div className="w-full aspect-video rounded-lg overflow-hidden">
                <img 
                  src={selectedPerson.thumbnailUrl} 
                  alt={selectedPerson.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedPerson.name}</h2>
              <p className="text-gray-600 dark:text-gray-300 mt-1">{selectedPerson.role}</p>
            </div>
            <button
              onClick={() => navigate(`/interview-player?documentName=${encodeURIComponent(selectedPerson.id)}`)}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
            >
              View Interview
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              Select a person to view their details
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
