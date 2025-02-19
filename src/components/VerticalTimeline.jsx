import React from "react";
import { extractVideoId, parseTimestampRange, getTotalPlaylistDuration, formatTime } from "../utils/timeUtils";
import { Tooltip } from "@mui/material";

const VerticalThumbnailTimeline = ({ videoQueue, currentVideoIndex, setCurrentVideoIndex }) => {
  if (!videoQueue.length) return null; // Prevent errors if empty

  return (
    <div className="w-1/4 flex flex-col items-center space-y-4 pr-4">
      <h2 className="text-lg font-bold">Playlist Timeline</h2>
      <div className="relative flex flex-col items-center">
        {/* 📍 Vertical Grey Line */}
        <div className="absolute w-1 h-full bg-gray-300 left-1/2 transform -translate-x-1/2"></div>

        {/* 🖼️ Thumbnails as Timeline Dots */}
        {videoQueue.map((video, index) => {
          const { startSeconds, endSeconds } = parseTimestampRange(video.timestamp);
          const duration = endSeconds - startSeconds;
          const videoId = extractVideoId(video.videoEmbedLink);
          const isActive = index === currentVideoIndex;

          return (
            <div key={video.id} className="relative z-10">
              {/* 🔗 Connector Line */}
              {index !== 0 && (
                <div className="absolute top-0 left-1/2 w-1 h-8 bg-gray-400 transform -translate-x-1/2"></div>
              )}

              {/* 🖼️ Tooltip + Circular Thumbnail */}
              <Tooltip
                title={
                  <div className="text-left">
                    <strong>{video.name}</strong>
                    <p className="text-xs text-gray-300">{video.summary}</p>
                  </div>
                }
                arrow
                placement="right"
              >
                <div
                  className={`w-16 h-16 rounded-full overflow-hidden flex items-center justify-center cursor-pointer ${
                    isActive ? "border-4 border-blue-300 shadow-lg scale-110" : "border-0 hover:scale-105"
                  }`}
                  onClick={() => setCurrentVideoIndex(index)}
                >
                  <img
                    src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} // Using 'mqdefault' for a zoomed image
                    alt={video.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </Tooltip>

              {/* ⏳ Duration Below Thumbnail */}
              <p className={`text-xs mt-1 ${isActive ? "text-blue-600 font-semibold" : "text-gray-500"}`}>
                {formatTime(duration)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VerticalThumbnailTimeline;
