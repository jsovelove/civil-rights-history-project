/**
 * @fileoverview Common Footer component for the Civil Rights History Project.
 * 
 * This component provides a consistent footer across all pages that require one,
 * featuring the project title, navigation links, and proper styling that matches
 * the overall design system.
 */

import { Link } from 'react-router-dom';

/**
 * Footer - Common footer component
 * 
 * This component provides:
 * 1. Project branding with "Civil Rights History Project" title
 * 2. Navigation links to main sections of the site
 * 3. External link to Library of Congress
 * 4. Consistent styling and responsive design
 * 5. Proper accessibility attributes
 * 
 * @returns {React.ReactElement} The footer component
 */
export default function Footer() {
  return (
    <footer className="py-8 lg:py-12" style={{ backgroundColor: '#F2483C' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
        <div className="flex flex-col lg:flex-row justify-between items-center mb-6 lg:mb-8">
          {/* Project Title */}
          <div className="text-center lg:text-left mb-6 lg:mb-0">
            <h3 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-normal font-['Source_Serif_4']" style={{ color: '#EBEAE9' }}>
              Civil Rights <span className="font-bold">History Project</span>
            </h3>
          </div>
          
          {/* Navigation Links */}
          <nav className="flex justify-center lg:justify-end gap-2 sm:gap-4 lg:gap-6 xl:gap-8">
            <Link 
              to="/visualizations" 
              className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold font-['Inter'] hover:underline"
              style={{ color: '#EBEAE9' }}
            >
              Timeline
            </Link>
            <Link 
              to="/interview-index" 
              className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold font-['Inter'] hover:underline"
              style={{ color: '#EBEAE9' }}
            >
              Index
            </Link>
            <Link 
              to="/topic-glossary" 
              className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold font-['Inter'] hover:underline"
              style={{ color: '#EBEAE9' }}
            >
              Glossary
            </Link>
            <Link 
              to="/about" 
              className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold font-['Inter'] hover:underline"
              style={{ color: '#EBEAE9' }}
            >
              About
            </Link>
            <a 
              href="https://www.loc.gov" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold font-['Inter'] hover:underline whitespace-nowrap"
              style={{ color: '#EBEAE9' }}
            >
              Library of Congress
            </a>
          </nav>
        </div>
        
        {/* Divider */}
        <div className="w-full h-px bg-zinc-300 opacity-30"></div>
      </div>
    </footer>
  );
}
