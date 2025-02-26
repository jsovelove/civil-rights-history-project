import React from "react";
import { extractVideoId, parseTimestampRange, getTotalPlaylistDuration, formatTime } from "../utils/timeUtils";
import { Tooltip } from "@mui/material";

const VerticalThumbnailTimeline = ({ videoQueue, currentVideoIndex, setCurrentVideoIndex }) => {
  if (!videoQueue.length) return null; // Prevent errors if empty

  return (
    <div className="w-1/4 flex flex-col items-center pr-4 relative">
      <h2 className="text-lg font-bold mb-4">Playlist Timeline</h2>

      <div className="relative flex flex-col items-center space-y-6">
        {/* 📍 Vertical Connecting Line */}
        <div className="absolute w-[4px] h-full bg-gray-300 left-1/2 transform -translate-x-1/2"></div>

        {/* 🎥 Thumbnails as Circular Timeline Dots */}
        {videoQueue.map((video, index) => {
          const { startSeconds, endSeconds } = parseTimestampRange(video.timestamp);
          const duration = endSeconds - startSeconds;
          const videoId = extractVideoId(video.videoEmbedLink);
          const isActive = index === currentVideoIndex;

          return (
            <div key={video.id} className="relative flex flex-col items-center">
              {/* 🔗 Connector Line Above Thumbnail */}
              {index !== 0 && (
                <div className="absolute top-[-30px] left-1/2 w-[4px] h-6 bg-gray-400 transform -translate-x-1/2"></div>
              )}

              {/* 🎥 Thumbnail as a Perfect Circle */}
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
                  className={`w-20 h-20 rounded-full overflow-hidden flex items-center justify-center cursor-pointer transition-transform ${
                    isActive ? "border-4 border-blue-500 shadow-lg scale-110" : "border-2 border-gray-300 hover:scale-105"
                  }`}
                  onClick={() => setCurrentVideoIndex(index)}
                >
                  <img
                    src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                    alt={video.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </Tooltip>

              {/* ⏳ Duration Below Thumbnail */}
              <p className={`text-sm mt-2 ${isActive ? "text-blue-600 font-semibold" : "text-gray-500"}`}>
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
