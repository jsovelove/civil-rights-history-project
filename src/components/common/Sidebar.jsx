import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home,
  List,
  PlayCircle,
  FileText,
  LogOut,
  Settings,
  Search,
  ShoppingBag,
  Heart,
  Menu,
  X,
  Braces,
  Database
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const navLinks = [
    { path: '/', label: 'Home', icon: <Home size={20} /> },
    { path: '/content-directory', label: 'Directory', icon: <List size={20} /> },
    // Commented out Playlists in navLinks
    // { path: '/playlist-builder', label: 'Playlists', icon: <PlayCircle size={20} /> },
    { path: '/transcript-summary', label: 'Summarizer', icon: <FileText size={20} /> }
  ];

  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Hamburger Button (always visible) */}
      <button
        className="fixed top-4 left-4 w-12 h-12 rounded-lg bg-white border-none shadow-sm cursor-pointer flex justify-center items-center text-gray-600 z-[51] transition-colors duration-200 ease-in-out"
        onClick={toggleSidebar}
      >
        <Menu size={24} />  
      </button>

      {/* Overlay (visible when sidebar is open) */}
      <div
        className={`fixed inset-0 z-[49] transition-opacity duration-300 ease-in-out ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        onClick={toggleSidebar}
      ></div>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 shadow-lg transition-transform duration-300 ease-in-out z-50 flex flex-col p-4 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 p-2 rounded-md bg-gray-100 border-none cursor-pointer flex justify-center items-center text-gray-600"
          onClick={toggleSidebar}
        >
          <X size={20} />
        </button>

        {/* Navigation Links */}
        <div className="flex-1 overflow-auto mt-10">
          {/* Main Navigation */}
          <div>
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center px-4 py-3 rounded-lg mb-2 transition-all duration-200 ease-in-out no-underline ${isActiveLink(link.path)
                    ? 'bg-indigo-50 text-blue-800 font-semibold'
                    : 'bg-transparent text-gray-500 font-normal'
                  }`}
                onClick={() => setIsOpen(false)}
              >
                <span className="flex mr-3 text-inherit">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}

            <Link
              to="/search"
              className={`flex items-center px-4 py-3 rounded-lg mb-2 transition-all duration-200 ease-in-out no-underline ${isActiveLink('/search')
                  ? 'bg-indigo-50 text-blue-800 font-semibold'
                  : 'bg-transparent text-gray-500 font-normal'
                }`}
              onClick={() => setIsOpen(false)}
            >
              <span className="flex mr-3 text-inherit"><Search size={20} /></span>
              <span>Search</span>
            </Link>

            <Link
              to="/semantic-search"
              className={`flex items-center px-4 py-3 rounded-lg mb-2 transition-all duration-200 ease-in-out no-underline ${isActiveLink('/semantic-search')
                  ? 'bg-indigo-50 text-blue-800 font-semibold'
                  : 'bg-transparent text-gray-500 font-normal'
                }`}
              onClick={() => setIsOpen(false)}
            >
              <span className="flex mr-3 text-inherit"><Braces size={20} /></span>
              <span>Semantic Search</span>
            </Link>

            {/* Commented out unused navigation items */}
            {/*
            <Link
              to="/playlists"
              className={`flex items-center px-4 py-3 rounded-lg mb-2 transition-all duration-200 ease-in-out no-underline ${isActiveLink('/playlists')
                  ? 'bg-indigo-50 text-blue-800 font-semibold'
                  : 'bg-transparent text-gray-500 font-normal'
                }`}
              onClick={() => setIsOpen(false)}
            >
              <span className="flex mr-3 text-inherit"><ShoppingBag size={20} /></span>
              <span>Playlists</span>
            </Link>

            <Link
              to="/favorites"
              className={`flex items-center px-4 py-3 rounded-lg mb-2 transition-all duration-200 ease-in-out no-underline ${isActiveLink('/favorites')
                  ? 'bg-indigo-50 text-blue-800 font-semibold'
                  : 'bg-transparent text-gray-500 font-normal'
                }`}
              onClick={() => setIsOpen(false)}
            >
              <span className="flex mr-3 text-inherit"><Heart size={20} /></span>
              <span>Favorites</span>
            </Link>
            */}
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200 my-4"></div>

          {/* Settings & Logout */}
          <div>
            {/* Admin Section */}
            {/* Commented out unused settings */}
            {/*
            <Link
              to="/settings"
              className={`flex items-center px-4 py-3 rounded-lg mb-2 transition-all duration-200 ease-in-out no-underline ${isActiveLink('/settings')
                  ? 'bg-indigo-50 text-blue-800 font-semibold'
                  : 'bg-transparent text-gray-500 font-normal'
                }`}
              onClick={() => setIsOpen(false)}
            >
              <span className="flex mr-3 text-inherit"><Settings size={20} /></span>
              <span>Settings</span>
            </Link>
            */}

            {user && (
              <button
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
                className="flex items-center px-4 py-3 rounded-lg mb-2 transition-all duration-200 ease-in-out text-gray-500 font-normal w-full text-left border-none bg-transparent"
              >
                <span className="flex mr-3 text-inherit"><LogOut size={20} /></span>
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}