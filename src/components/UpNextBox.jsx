import React from 'react';

const UpNextBox = ({ nextKeyword, thumbnailUrl, onPlay }) => {
  return (
    <div 
      style={{
        width: '240px',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        border: '2px solid #d1d5db',
        overflow: 'hidden'
      }}
    >
      <div className="relative">
        <div 
          style={{ 
            width: '100%',
            height: '120px',
            backgroundImage: thumbnailUrl ? `url(${thumbnailUrl})` : 'none',
            backgroundColor: !thumbnailUrl ? '#e5e7eb' : 'transparent',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {!thumbnailUrl && (
            <div className="flex items-center justify-center h-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          )}
          
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button 
              onClick={onPlay}
              style={{
                padding: '12px',
                borderRadius: '9999px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div style={{ padding: '12px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <h3 style={{ 
            fontSize: '14px', 
            fontWeight: '600',
            color: '#374151',
            margin: 0
          }}>
            Up Next
          </h3>
          <span style={{
            backgroundColor: '#dbeafe',
            color: '#1e40af',
            fontSize: '12px',
            fontWeight: '500',
            padding: '2px 8px',
            borderRadius: '4px'
          }}>
            {nextKeyword}
          </span>
        </div>
        <p style={{ 
          fontSize: '12px',
          color: '#6b7280',
          margin: 0
        }}>
          Plays automatically when current playlist ends
        </p>
      </div>
    </div>
  );
};

export default UpNextBox;
