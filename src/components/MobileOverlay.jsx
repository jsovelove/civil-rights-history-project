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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6" style={{ backgroundColor: '#EBEAE9' }}>
      <div className="bg-white border-2 border-black shadow-2xl p-8 sm:p-12 max-w-lg text-center">
        <div className="mb-8">
          <svg
            className="mx-auto h-20 w-20"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            style={{ color: '#F2483C' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        
        <h2 className="text-3xl sm:text-4xl font-medium text-black mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
          Desktop Experience Required
        </h2>
        
        <p className="text-base sm:text-lg text-stone-900 mb-8" style={{ fontFamily: 'Source Serif Pro, serif' }}>
          This website is optimized for desktop viewing. Please visit us on a desktop or laptop computer for the best experience.
        </p>
        
        <div className="border-2 border-black p-4" style={{ backgroundColor: '#F2483C' }}>
          <p className="text-sm font-light text-black" style={{ fontFamily: 'Chivo Mono, monospace' }}>
            Minimum screen width: 1024px
          </p>
        </div>
      </div>
    </div>
  )
}

