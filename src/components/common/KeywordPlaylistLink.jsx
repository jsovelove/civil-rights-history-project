import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * A reusable component that navigates to the playlist builder with a keyword
 * Can be used in any visualization to link to related content
 */
const KeywordPlaylistLink = ({
  keyword,
  className = "",
  buttonText,
  variant = "button", // button, link, or icon
  iconOnly = false
}) => {
  const navigate = useNavigate();
  
  if (!keyword) return null;
  
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/playlist-builder?keywords=${encodeURIComponent(keyword)}`);
  };
  
  // Icon element
  const icon = (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      className={iconOnly ? "w-5 h-5" : "w-4 h-4 mr-2"} 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5} 
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" 
      />
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5} 
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
      />
    </svg>
  );

  // Default text if none provided
  const text = buttonText || `Watch ${keyword} segments`;
  
  // Render appropriate variant
  if (variant === "link") {
    return (
      <a
        href={`/playlist-builder?keywords=${encodeURIComponent(keyword)}`}
        onClick={handleClick}
        className={`inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors ${className}`}
      >
        {icon}
        {!iconOnly && text}
      </a>
    );
  }
  
  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        className={`text-blue-600 hover:text-blue-800 transition-colors rounded-full p-1 hover:bg-blue-50 ${className}`}
        title={`Watch segments about ${keyword}`}
      >
        {icon}
      </button>
    );
  }
  
  // Default button style
  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors ${className}`}
    >
      {icon}
      {!iconOnly && text}
    </button>
  );
};

export default KeywordPlaylistLink;