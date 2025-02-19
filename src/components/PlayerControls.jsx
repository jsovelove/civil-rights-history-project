import React from "react";
import { MdPlayArrow, MdPause, MdSkipNext, MdSkipPrevious } from "react-icons/md/index.js";

const PlayerControls = ({ isPlaying, setIsPlaying, handleNext, handlePrevious, currentVideoIndex, videoQueue }) => {
  return (
    <div className="flex justify-center space-x-4 mt-4">
      {/* ⏮ Previous Button */}
      <button
        onClick={handlePrevious}
        disabled={currentVideoIndex === 0}
        className="p-3 bg-gray-300 hover:bg-gray-400 rounded-full disabled:opacity-50"
      >
        <MdSkipPrevious size={24} />
      </button>

      {/* ▶️ Play / Pause Toggle */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full"
      >
        {isPlaying ? <MdPause size={28} /> : <MdPlayArrow size={28} />}
      </button>

      {/* ⏭ Skip (Next) Button */}
      <button
        onClick={handleNext}
        disabled={currentVideoIndex >= videoQueue.length - 1}
        className="p-3 bg-gray-300 hover:bg-gray-400 rounded-full disabled:opacity-50"
      >
        <MdSkipNext size={24} />
      </button>
    </div>
  );
};

export default PlayerControls;
