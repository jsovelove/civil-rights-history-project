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
  X
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
    { path: '/keyword-directory', label: 'Directory', icon: <List size={20} /> },
    { path: '/playlist-builder', label: 'Playlists', icon: <PlayCircle size={20} /> },
    { path: '/transcript-summary', label: 'Summarizer', icon: <FileText size={20} /> }
  ];

  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  // Hamburger button styles
  const hamburgerButtonStyle = {
    position: 'fixed',
    top: '16px',
    left: '16px',
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    border: 'none',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#4b5563',
    zIndex: 51, // higher than sidebar
    transition: 'background-color 0.2s ease'
  };

  // Sidebar container styles
  const sidebarStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    width: '260px',
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    transition: 'transform 0.3s ease',
    transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column',
    padding: '16px'
  };

  // Overlay style for mobile (clicking outside closes the sidebar)
  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    opacity: isOpen ? 1 : 0,
    visibility: isOpen ? 'visible' : 'hidden',
    transition: 'opacity 0.3s ease, visibility 0.3s ease',
    zIndex: 49 // lower than sidebar but higher than content
  };

  // Close button style (inside sidebar)
  const closeButtonStyle = {
    position: 'absolute',
    top: '16px',
    right: '16px',
    padding: '8px',
    borderRadius: '6px',
    backgroundColor: '#f3f4f6',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#4b5563'
  };

  // Logo container styles
  const logoContainerStyle = {
    padding: '20px 16px',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '16px'
  };

  // Logo icon styles
  const logoIconStyle = {
    width: '40px',
    height: '40px',
    background: 'linear-gradient(to right, #2563eb, #4f46e5)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  // Navigation section styles
  const navSectionStyle = {
    flex: 1,
    overflow: 'auto',
    marginTop: '40px' // Space for the close button
  };

  // Navigation link styles
  const getLinkStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: isActive ? '#eef2ff' : 'transparent',
    color: isActive ? '#1e40af' : '#6b7280',
    fontWeight: isActive ? 600 : 400,
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textDecoration: 'none'
  });

  // Link icon container style
  const linkIconStyle = {
    display: 'flex',
    marginRight: '12px',
    color: 'inherit'
  };

  // Divider style
  const dividerStyle = {
    height: '1px',
    backgroundColor: '#e5e7eb',
    margin: '16px 0'
  };

  return (
    <>
      {/* Hamburger Button (always visible) */}
      <button style={hamburgerButtonStyle} onClick={toggleSidebar}>
        <Menu size={24} />
      </button>

      {/* Overlay (visible when sidebar is open) */}
      <div style={overlayStyle} onClick={toggleSidebar}></div>

      {/* Sidebar */}
      <div style={sidebarStyle}>
        {/* Close Button */}
        <button style={closeButtonStyle} onClick={toggleSidebar}>
          <X size={20} />
        </button>

        {/* Logo Section */}
        <div style={logoContainerStyle}>
          <div style={logoIconStyle}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4L4 8L12 12L20 8L12 4Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 16L12 20L20 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 12L12 16L20 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Navigation Links */}
        <div style={navSectionStyle}>
          {/* Main Navigation */}
          <div>
            {navLinks.map((link) => (
              <Link 
                key={link.path} 
                to={link.path} 
                style={getLinkStyle(isActiveLink(link.path))}
                onClick={() => setIsOpen(false)} // Close sidebar when a link is clicked
              >
                <span style={linkIconStyle}>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
            
            <Link 
              to="/search" 
              style={getLinkStyle(isActiveLink('/search'))}
              onClick={() => setIsOpen(false)}
            >
              <span style={linkIconStyle}><Search size={20} /></span>
              <span>Search</span>
            </Link>
            
            <Link 
              to="/playlists" 
              style={getLinkStyle(isActiveLink('/playlists'))}
              onClick={() => setIsOpen(false)}
            >
              <span style={linkIconStyle}><ShoppingBag size={20} /></span>
              <span>Playlists</span>
            </Link>
            
            <Link 
              to="/favorites" 
              style={getLinkStyle(isActiveLink('/favorites'))}
              onClick={() => setIsOpen(false)}
            >
              <span style={linkIconStyle}><Heart size={20} /></span>
              <span>Favorites</span>
            </Link>
          </div>

          {/* Divider */}
          <div style={dividerStyle}></div>

          {/* Settings & Logout */}
          <div>
            <Link 
              to="/settings" 
              style={getLinkStyle(isActiveLink('/settings'))}
              onClick={() => setIsOpen(false)}
            >
              <span style={linkIconStyle}><Settings size={20} /></span>
              <span>Settings</span>
            </Link>
            
            {user && (
              <button
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
                style={{
                  ...getLinkStyle(false),
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  backgroundColor: 'transparent'
                }}
              >
                <span style={linkIconStyle}><LogOut size={20} /></span>
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}