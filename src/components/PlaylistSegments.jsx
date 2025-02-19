import React from "react";

const PlaylistSegments = ({ videoQueue, currentVideoIndex, setCurrentVideoIndex }) => {
  return (
    <div className="bg-white p-5 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-3">Playlist Segments</h2>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {videoQueue.map((video, index) => (
          <button
            key={video.id}
            onClick={() => setCurrentVideoIndex(index)}
            className={`w-full text-left p-3 rounded-md ${
              index === currentVideoIndex
                ? "bg-blue-100 border border-blue-300"
                : "hover:bg-gray-100"
            }`}
          >
            <div className="font-medium">{video.name}</div>
            <div className="text-sm text-gray-600 truncate">
              {video.summary.substring(0, 60)}...
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PlaylistSegments;
