// src/components/common/Navbar.jsx
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { LogOut } from 'lucide-react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/keyword-directory', label: 'Keywords' },
    { path: '/playlist-builder', label: 'Playlist' },
    { path: '/transcript-summary', label: 'Transcripts' }
  ]

  const isActiveLink = (path) => {
    return location.pathname === path 
      ? 'text-blue-600 border-b-2 border-blue-600' 
      : 'text-gray-600 hover:text-blue-600'
  }

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <Link 
            to="/" 
            className="text-xl font-bold text-blue-600 hover:text-blue-800 transition-colors"
          >
            Interview Explorer
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`${isActiveLink(link.path)} px-1 py-2 transition-colors`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* User/Auth Section */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {user.email}
                </span>
                <button
                  onClick={logout}
                  className="flex items-center text-gray-600 hover:text-red-600 transition-colors"
                >
                  <LogOut className="h-5 w-5 mr-1" />
                  <span className="hidden md:inline">Logout</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button className="p-2 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-100">
              <svg
                className="h-6 w-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu (hidden by default) */}
      <div className="hidden md:hidden">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`block px-3 py-2 rounded-md text-base font-medium ${isActiveLink(link.path)}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}