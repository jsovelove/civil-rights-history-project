/**
 * @fileoverview Landing page component matching the Figma design for Civil Rights History Project.
 * 
 * This component replicates the exact design shown in Figma with a two-column layout,
 * historical photograph, and red accent color (#F2483C).
 */

import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import MLKImage from '../assetts/MLKandMalcolmX.png';

/**
 * Home - Landing page component matching Figma design
 * 
 * Features:
 * - Header with navigation and search
 * - Two-column layout with text and image
 * - Red accent color for "Civil Rights Movement"
 * - Historical photograph with styled border
 * - Library of Congress attribution
 * 
 * @returns {React.ReactElement} The Figma-style landing page
 */
export default function Home() {
  const { user } = useAuth();

  return (
    <div className="h-full font-body flex flex-col relative overflow-hidden" style={{ backgroundColor: '#EBEAE9' }}>
      {/* Main Content */}
      <main className="flex-1 w-full py-4 sm:py-6 flex flex-col min-h-0 z-10">
        <div className="w-full max-w-7xl ml-0 pr-4 sm:pr-6 lg:pr-8 pl-2 sm:pl-4 lg:pl-6 flex-1 flex items-start pt-8 sm:pt-12">
          <div className="max-w-3xl">
            {/* Text Content */}
            <div className="space-y-4 flex flex-col justify-start">
              {/* Main Headline */}
              <div className="max-w-none">
                <h2 style={{
                  fontFamily: 'Freight Text Pro, Lora, serif',
                  fontWeight: 500,
                  fontSize: 'clamp(32px, 5vw, 64px)',
                  lineHeight: '1.1',
                  letterSpacing: '0%',
                  color: 'black'
                }}>
                  The{' '}
                  <span style={{
                    fontFamily: 'Freight Text Pro, Lora, serif',
                    fontWeight: 900,
                    fontSize: 'clamp(32px, 5vw, 64px)',
                    lineHeight: '1.1',
                    letterSpacing: '0%',
                    color: '#F2483C'
                  }}>
                    Civil Rights Movement
                  </span>
                  <br />
                  narrated by the activists,
                  <br />
                  artists, and change-makers
                  <br />
                  who were really there.
                </h2>
              </div>

              {/* Statistics */}
              <div className="pt-1">
                <p style={{ color: '#F2483C' }} className="font-mono font-light text-sm sm:text-base tracking-wide">
                  145 Interviews, 8700 Minutes
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Absolutely positioned image */}
      <div className="absolute bottom-0 right-0 w-full sm:w-3/4 md:w-2/3 lg:w-3/5 xl:w-1/2 max-h-[90vh] z-0">
        <img
          src={MLKImage}
          alt="Dr. Martin Luther King Jr. and other civil rights leaders"
          className="w-full h-full object-cover sm:object-contain object-bottom sm:object-bottom"
        />
      </div>

      {/* Footer */}
      <footer className="w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex-shrink-0 relative z-10">
        <div className="flex items-center">
          <p className="text-black font-body text-xs sm:text-sm mr-4 sm:mr-6 whitespace-nowrap">
            Library of Congress
          </p>
          <div className="flex-1 h-px bg-black/20"></div>
        </div>
      </footer>
    </div>
  );
}