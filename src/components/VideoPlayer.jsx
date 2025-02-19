import React, { useEffect, useRef } from "react";
import { extractVideoId, convertTimestampToSeconds, extractStartTimestamp } from "../utils/timeUtils";

const VideoPlayer = ({ video, onVideoEnd }) => {
  const playerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!video || !containerRef.current) return;

    const videoId = extractVideoId(video.videoEmbedLink);
    const [startRaw] = video.timestamp.split(" - ");
    const startSeconds = convertTimestampToSeconds(extractStartTimestamp(startRaw));

    const initPlayer = () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        height: "405", // 16:9 Aspect Ratio
        width: "720",
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 0, // No YouTube UI
          rel: 0,
          modestbranding: 1,
          start: startSeconds
        },
        events: {
          onReady: () => console.log("Player Ready"),
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              onVideoEnd();
            }
          }
        }
      });
    };

    if (window.YT) {
      initPlayer();
    } else {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [video]);

  return <div ref={containerRef} className="rounded-lg shadow-lg bg-black"></div>;
};

export default VideoPlayer;
