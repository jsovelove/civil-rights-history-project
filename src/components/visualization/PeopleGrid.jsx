import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../services/firebase'

export default function PeopleGrid() {
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  // Photo Card component with hover effect - extra small with info panel
  const PhotoCard = ({ person }) => {
    return (
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-md overflow-visible shadow-sm group cursor-pointer">
        {/* Photo container with zoom effect */}
        <div className="w-full h-full overflow-hidden rounded-md">
          {person.thumbnailUrl ? (
            <img
              src={person.thumbnailUrl}
              alt={`${person.name}`}
              className="w-full h-full object-cover object-center scale-125 group-hover:scale-150 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400 text-xs">No photo</span>
            </div>
          )}
        </div>
        
        {/* Hover Panel - With guaranteed solid white background */}
        <div style={{backgroundColor: 'white'}} className="absolute inset-x-0 top-full opacity-0 group-hover:opacity-100 shadow-md transition-all duration-200 p-2 border border-gray-200 z-20 pointer-events-none group-hover:pointer-events-auto">
          <div style={{backgroundColor: 'white', opacity: 1}} className="w-full">
            <h3 className="text-gray-900 font-bold text-xs leading-tight mb-1">{person.name}</h3>
            <p className="text-gray-600 text-xs mb-1">{person.role}</p>
            <a
              href={`/accordion?documentName=${encodeURIComponent(person.id)}`}
              className="text-blue-600 text-xs hover:text-blue-800 inline-block"
            >
              View Interview
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  if (people.length === 0) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-gray-500">No interview subjects found</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
        {people.map((person) => (
          <PhotoCard key={person.id} person={person} />
        ))}
      </div>
    </div>
  )
}