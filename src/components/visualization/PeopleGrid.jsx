import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { db } from '../../services/firebase'
import { div } from 'framer-motion/client'

export default function PeopleGrid() {
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchPeople()
  }, [])

  // Open modal when a person is selected
  useEffect(() => {
    if (selectedPerson) {
      setIsModalOpen(true)
    }
  }, [selectedPerson])

  // Close modal and clear selection
  const closeModal = () => {
    setIsModalOpen(false)
  }

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

  // Navigate between people in the modal
  const navigateToPrev = () => {
    if (!selectedPerson) return

    // Get filtered people based on search
    const filteredPeople = people.filter(person =>
      person.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const currentIndex = filteredPeople.findIndex(p => p.id === selectedPerson.id)
    if (currentIndex > 0) {
      // Go to previous person
      setSelectedPerson(filteredPeople[currentIndex - 1])
    } else {
      // Wrap around to the last person
      setSelectedPerson(filteredPeople[filteredPeople.length - 1])
    }
  }

  const navigateToNext = () => {
    if (!selectedPerson) return

    // Get filtered people based on search
    const filteredPeople = people.filter(person =>
      person.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const currentIndex = filteredPeople.findIndex(p => p.id === selectedPerson.id)
    if (currentIndex < filteredPeople.length - 1) {
      // Go to next person
      setSelectedPerson(filteredPeople[currentIndex + 1])
    } else {
      // Wrap around to the first person
      setSelectedPerson(filteredPeople[0])
    }
  }

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isModalOpen) return

      if (e.key === 'ArrowLeft') {
        navigateToPrev()
      } else if (e.key === 'ArrowRight') {
        navigateToNext()
      } else if (e.key === 'Escape') {
        closeModal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen, selectedPerson, searchTerm])

  // Navigation Arrow Icons
  const ChevronLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  )

  const ChevronRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  )

  const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  )

  // Modal Component with navigation arrows
  const PersonModal = ({ person, isOpen, onClose, onPrev, onNext }) => {
    if (!isOpen || !person) return null

    // Handle click on backdrop to close (but not when clicking the modal itself)
    const handleBackdropClick = (e) => {
      if (e.target === e.currentTarget) {
        onClose()
      }
    }

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black bg-opacity-60"
          onClick={handleBackdropClick}
        ></div>

        {/* Left navigation arrow - positioned outside the modal */}
        <button
          className="absolute left-4 md:left-8 z-50 bg-black bg-opacity-60 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-80 transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            onPrev()
          }}
          aria-label="Previous person"
        >
          <ChevronLeftIcon />
        </button>

        {/* Right navigation arrow - positioned outside the modal */}
        <button
          className="absolute right-4 md:right-8 z-50 bg-black bg-opacity-60 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-80 transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            onNext()
          }}
          aria-label="Next person"
        >
          <ChevronRightIcon />
        </button>

        {/* Modal content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full overflow-hidden animate-fadeIn z-50 relative">
          {/* Modal Header */}
          <div className="relative">
            {person.thumbnailUrl && (
              <div className="w-full h-48 overflow-hidden">
                <img
                  src={person.thumbnailUrl}
                  alt={person.name}
                  className="w-full h-full object-cover scale-125"
                />
              </div>
            )}
            {/* Close button */}
            <button
              className="absolute top-2 right-2 bg-black bg-opacity-60 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-80 transition-colors"
              onClick={onClose}
              aria-label="Close"
            >
              <XIcon />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{person.name}</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{person.role}</p>

            <button
              onClick={() => navigate(`/interview-player?documentName=${encodeURIComponent(person.id)}`)}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium"
            >
              View Interview
            </button>
          </div>
        </div>
      </div>
    )
  }

  // PhotoCard component
  const PhotoCard = ({ person }) => {
    const isSelected = selectedPerson?.id === person.id

    return (
      <div className="flex flex-col items-center space-y-2">
        <div></div>
        {/* Square card container */}
        <div
          className={`w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-md 
                    overflow-hidden shadow-md cursor-pointer transition-all duration-200
                    ${isSelected ? 'ring-4 ring-blue-500' : 'hover:ring-2 hover:ring-blue-300'}`}
          onClick={() => setSelectedPerson(person)}
          style={{ touchAction: 'manipulation' }}
        >
          {person.thumbnailUrl ? (
            <div className="w-full h-full overflow-hidden">
              <img
                src={person.thumbnailUrl}
                alt={person.name}
                className="w-full h-full object-cover object-center scale-150"
                draggable={false}
                loading="lazy"
              />
            </div>
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400 text-xs">No photo</span>
            </div>
          )}
        </div>

        {/* Name below card */}
        <div className="text-center w-full">
          <p className={`text-xs sm:text-sm truncate max-w-full ${isSelected ? 'font-bold text-blue-600' : 'text-gray-700'}`}>
            {person.name}
          </p>
        </div>
      </div>
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

  // Filter people based on search term
  const filteredPeople = people.filter(person =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
   
        <div className="mb-6 max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {searchTerm ? `${filteredPeople.length} of ${people.length} People` : `${people.length} People`}
          </h2>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name..."
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-300"
          />
        </div>

        {/* People Grid - Full Width */}
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-4 gap-y-6">
          {filteredPeople.map((person) => (
            <PhotoCard key={person.id} person={person} />
          ))}
        </div>
      </div>

      {/* Modal for selected person with navigation */}
      <PersonModal
        person={selectedPerson}
        isOpen={isModalOpen}
        onClose={closeModal}
        onPrev={navigateToPrev}
        onNext={navigateToNext}
      />
    </div>
  )
}