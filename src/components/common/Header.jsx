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
      <div className={`fixed top-0 right-0 w-[864px] h-full px-9 pb-9 shadow-xl z-50 flex justify-start items-center gap-2.5 transition-transform duration-300 ease-in-out overflow-y-auto ${
        isMenuOpen ? 'translate-x-0' : 'translate-x-full'
      }`} style={{ backgroundColor: '#F2483C' }}>
        <div className="w-[786px] self-stretch py-9 inline-flex flex-col justify-start items-start gap-12">
          {/* Header */}
          <div className="self-stretch h-16 relative">
            <div className="w-[718px] h-0 left-[718px] top-[67px] absolute origin-top-left rotate-180 outline outline-1 outline-offset-[-0.50px] outline-black"></div>
            <div className="w-[783px] h-12 left-[3px] top-0 absolute">
              <div className="w-72 h-10 left-0 top-[3px] absolute text-black text-3xl font-light" style={{ fontFamily: 'Chivo Mono, monospace' }}>
                Menu
              </div>
              <div className="w-12 h-12 left-[735px] top-0 absolute">
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-6 h-6 left-[12px] top-[12px] absolute outline outline-2 outline-offset-[-1px] outline-black hover:opacity-70 transition-opacity"
                >
                  <X size={24} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="w-[718px] h-32 relative">
            <div className="w-[718px] h-0 left-[718px] top-[134px] absolute origin-top-left rotate-180 outline outline-1 outline-offset-[-0.50px] outline-black"></div>
            <div className="w-[718px] h-28 left-0 top-0 absolute">
              <Link
                to="/"
                className="flex items-start w-full h-full hover:opacity-80 transition-opacity"
                onClick={() => setIsMenuOpen(false)}
              >
                <div className="w-20 h-10 left-0 top-[9px] absolute text-black text-3xl font-light" style={{ fontFamily: 'Chivo Mono, monospace' }}>
                  01.
                </div>
                <div className="w-[460px] h-28 left-[258px] top-[-10px] absolute text-right text-black text-8xl font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Timeline
                </div>
              </Link>
            </div>
          </div>

          {/* Interviews */}
          <div className="w-[718px] h-36 relative">
            <div className="w-[718px] h-0 left-[718px] top-[141px] absolute origin-top-left rotate-180 outline outline-1 outline-offset-[-0.50px] outline-black"></div>
            <div className="w-[718px] h-28 left-0 top-0 absolute">
              <Link
                to="/interview-index"
                className="flex items-start w-full h-full hover:opacity-80 transition-opacity"
                onClick={() => setIsMenuOpen(false)}
              >
                <div className="w-24 h-10 left-0 top-[7px] absolute text-black text-3xl font-light" style={{ fontFamily: 'Chivo Mono, monospace' }}>
                  02.
                </div>
                <div className="w-[591px] h-28 left-[127px] top-[-13px] absolute text-right text-black text-8xl font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Interviews
                </div>
              </Link>
            </div>
          </div>

          {/* Glossary */}
          <div className="w-[718px] h-32 relative">
            <div className="w-[718px] h-0 left-[718px] top-[135px] absolute origin-top-left rotate-180 outline outline-1 outline-offset-[-0.50px] outline-black"></div>
            <div className="w-[715px] h-28 left-[3px] top-0 absolute">
              <Link
                to="/topic-glossary"
                className="flex items-start w-full h-full hover:opacity-80 transition-opacity"
                onClick={() => setIsMenuOpen(false)}
              >
                <div className="w-28 h-10 left-0 top-[2px] absolute text-black text-3xl font-light" style={{ fontFamily: 'Chivo Mono, monospace' }}>
                  03.
                </div>
                <div className="w-[591px] h-28 left-[124px] top-[-18px] absolute text-right text-black text-8xl font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Glossary
                </div>
              </Link>
            </div>
          </div>

          {/* About */}
          <div className="w-[718px] h-36 relative">
            <div className="w-[718px] h-0 left-[718px] top-[142px] absolute origin-top-left rotate-180 outline outline-1 outline-offset-[-0.50px] outline-black"></div>
            <div className="w-[715px] h-28 left-[3px] top-0 absolute">
              <Link
                to="/about"
                className="flex items-start w-full h-full hover:opacity-80 transition-opacity"
                onClick={() => setIsMenuOpen(false)}
              >
                <div className="w-24 h-10 left-0 top-0 absolute text-black text-3xl font-light" style={{ fontFamily: 'Chivo Mono, monospace' }}>
                  04.
                </div>
                <div className="w-[591px] h-28 left-[124px] top-[-20px] absolute text-right text-black text-8xl font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                  About
                </div>
              </Link>
            </div>
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