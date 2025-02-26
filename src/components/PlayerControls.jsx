import React from "react";

const PlayerControls = ({ onPrevious, onPlay, onPause, onNext, isPlaying, hasPrevious, hasNext }) => {
  return (
    <div 
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '24px',
        padding: '12px',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        margin: '20px auto',
        border: '2px solid #d1d5db',
        maxWidth: '320px'
      }}
    >
      <button
        onClick={onPrevious}
        disabled={!hasPrevious}
        style={{
          padding: '12px',
          borderRadius: '9999px',
          backgroundColor: hasPrevious ? '#3b82f6' : '#9ca3af',
          color: 'white',
          border: 'none',
          cursor: hasPrevious ? 'pointer' : 'not-allowed',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <button
        onClick={isPlaying ? onPause : onPlay}
        style={{
          padding: '16px',
          borderRadius: '9999px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          </svg>
        )}
      </button>
      
      <button
        onClick={onNext}
        disabled={!hasNext}
        style={{
          padding: '12px',
          borderRadius: '9999px',
          backgroundColor: hasNext ? '#3b82f6' : '#9ca3af',
          color: 'white',
          border: 'none',
          cursor: hasNext ? 'pointer' : 'not-allowed',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

export default PlayerControls;