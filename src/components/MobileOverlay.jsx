import { useState, useEffect } from 'react'

/**
 * MobileOverlay component that displays a fullscreen overlay on mobile devices
 * prompting users to visit the site on desktop.
 * 
 * @component
 */
export default function MobileOverlay() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      // Consider screens smaller than 1024px as mobile/tablet
      setIsMobile(window.innerWidth < 1024)
    }

    // Check on mount
    checkScreenSize()

    // Add event listener for window resize
    window.addEventListener('resize', checkScreenSize)

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  if (!isMobile) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md text-center">
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Desktop Experience Required
        </h2>
        
        <p className="text-gray-600 mb-6">
          This website is optimized for desktop viewing. Please visit us on a desktop or laptop computer for the best experience.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-blue-800">
            Minimum screen width: 1024px
          </p>
        </div>
      </div>
    </div>
  )
}

