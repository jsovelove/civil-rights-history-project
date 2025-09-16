import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { 
  Search, 
  Menu,
  X,
  Home as HomeIcon,
  List,
  FileText,
  Database,
  Braces,
  LogOut
} from 'lucide-react';
import VectorSearchOverlay from '../VectorSearchOverlay';

/**
 * Header - Shared header component with navigation
 * 
 * Features:
 * - Project title/logo
 * - Search and hamburger menu icons
 * - Slide-out sidebar with navigation links
 * - Logout functionality
 * 
 * @returns {React.ReactElement} The header with navigation
 */
export default function Header() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { path: '/', label: 'Home', icon: <HomeIcon size={20} /> },
    { path: '/visualizations', label: 'Visualizations', icon: <Database size={20} /> },
    { path: '/content-directory', label: 'Directory', icon: <List size={20} /> },
    { path: '/transcript-summary', label: 'Summarizer', icon: <FileText size={20} /> },
    { path: '/search', label: 'Search', icon: <Search size={20} /> },
    { path: '/semantic-search', label: 'Semantic Search', icon: <Braces size={20} /> }
  ];

  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Header */}
      <header className="relative" style={{ backgroundColor: '#EBEAE9' }}>
        <div className="w-full px-4 sm:px-8 lg:px-12 py-6 lg:py-9">
          <div className="flex justify-between items-start">
            {/* Logo/Title */}
            <Link to="/" className="text-decoration-none">
              <div>
                <span className="text-stone-900 text-4xl font-normal font-['Source_Serif_Pro']">Civil Rights </span>
                <br />
                <span className="text-stone-900 text-4xl font-bold font-['Source_Serif_Pro'] leading-9">History Project</span>
              </div>
            </Link>

            {/* Navigation Icons - stacked vertically */}
            <div className="flex flex-col items-end gap-3">
              {/* Hamburger menu icon */}
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-8 lg:w-12 flex flex-col justify-start items-end gap-1 hover:opacity-70 transition-opacity"
              >
                <div className="w-6 lg:w-9 h-0.5 bg-black"></div>
                <div className="w-6 lg:w-9 h-0.5 bg-black"></div>
                <div className="w-6 lg:w-9 h-0.5 bg-black"></div>
              </button>
              
              {/* Search button */}
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="p-1 text-black hover:opacity-70 transition-opacity"
              >
                <Search size={18} className="lg:w-6 lg:h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Backdrop */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 right-0 w-full sm:w-[480px] md:w-[600px] lg:w-[720px] xl:w-[960px] h-full bg-red-500 border-l border-stone-900 shadow-xl z-50 flex flex-col transition-transform duration-300 ease-in-out overflow-y-auto ${
        isMenuOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 lg:p-8 pb-8 sm:pb-12 lg:pb-16 flex-shrink-0">
          <h2 style={{
            fontFamily: 'Acumin Pro, Inter, sans-serif',
            fontWeight: 400,
            fontSize: 'clamp(20px, 3vw, 24px)',
            color: 'black'
          }}>
            Menu
          </h2>
          <button
            onClick={() => setIsMenuOpen(false)}
            className="text-black hover:text-gray-700 transition-colors"
          >
            <X size={24} className="sm:w-8 sm:h-8" strokeWidth={1.5} />
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 min-h-0">
          <nav className="space-y-0">
            {/* Timeline */}
            <div className="border-b border-black">
              <Link
                to="/"
                className="flex items-center py-4 sm:py-6 lg:py-8 group hover:opacity-80 transition-opacity"
                onClick={() => setIsMenuOpen(false)}
              >
                <span style={{
                  fontFamily: 'Acumin Pro, Inter, sans-serif',
                  fontWeight: 400,
                  fontSize: 'clamp(16px, 2vw, 24px)',
                  color: 'black'
                }} className="mr-8 sm:mr-12 lg:mr-16">
                  01.
                </span>
                <span style={{
                  fontFamily: 'Acumin Pro, Inter, sans-serif',
                  fontWeight: 700,
                  fontSize: 'clamp(32px, 6vw, 64px)',
                  color: 'black',
                  lineHeight: '1'
                }}>
                  Timeline
                </span>
              </Link>
            </div>

            {/* Interviews */}
            <div className="border-b border-black">
              <Link
                to="/interview-index"
                className="flex items-center py-4 sm:py-6 lg:py-8 group hover:opacity-80 transition-opacity"
                onClick={() => setIsMenuOpen(false)}
              >
                <span style={{
                  fontFamily: 'Acumin Pro, Inter, sans-serif',
                  fontWeight: 400,
                  fontSize: 'clamp(16px, 2vw, 24px)',
                  color: 'black'
                }} className="mr-8 sm:mr-12 lg:mr-16">
                  02.
                </span>
                <span style={{
                  fontFamily: 'Acumin Pro, Inter, sans-serif',
                  fontWeight: 700,
                  fontSize: 'clamp(32px, 6vw, 64px)',
                  color: 'black',
                  lineHeight: '1'
                }}>
                  Interviews
                </span>
              </Link>
            </div>

            {/* Glossary */}
            <div className="border-b border-black">
              <Link
                to="/topic-glossary"
                className="flex items-center py-4 sm:py-6 lg:py-8 group hover:opacity-80 transition-opacity"
                onClick={() => setIsMenuOpen(false)}
              >
                <span style={{
                  fontFamily: 'Acumin Pro, Inter, sans-serif',
                  fontWeight: 400,
                  fontSize: 'clamp(16px, 2vw, 24px)',
                  color: 'black'
                }} className="mr-8 sm:mr-12 lg:mr-16">
                  03.
                </span>
                <span style={{
                  fontFamily: 'Acumin Pro, Inter, sans-serif',
                  fontWeight: 700,
                  fontSize: 'clamp(32px, 6vw, 64px)',
                  color: 'black',
                  lineHeight: '1'
                }}>
                  Glossary
                </span>
              </Link>
            </div>

            {/* About */}
            <div className="border-b border-black">
              <Link
                to="/about"
                className="flex items-center py-4 sm:py-6 lg:py-8 group hover:opacity-80 transition-opacity"
                onClick={() => setIsMenuOpen(false)}
              >
                <span style={{
                  fontFamily: 'Acumin Pro, Inter, sans-serif',
                  fontWeight: 400,
                  fontSize: 'clamp(16px, 2vw, 24px)',
                  color: 'black'
                }} className="mr-8 sm:mr-12 lg:mr-16">
                  04.
                </span>
                <span style={{
                  fontFamily: 'Acumin Pro, Inter, sans-serif',
                  fontWeight: 700,
                  fontSize: 'clamp(32px, 6vw, 64px)',
                  color: 'black',
                  lineHeight: '1'
                }}>
                  About
                </span>
              </Link>
            </div>
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 lg:p-8 border-t border-black/20 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="text-black text-sm sm:text-base">
              © 2024 Civil Rights History Project
            </div>
            {user && (
              <button
                onClick={() => {
                  logout();
                  setIsMenuOpen(false);
                }}
                className="flex items-center space-x-2 text-black hover:text-gray-700 transition-colors"
              >
                <LogOut size={16} />
                <span className="text-sm">Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search Overlay */}
      {isSearchOpen && (
        <VectorSearchOverlay 
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
    </>
  );
} 