import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import "timelinejs3/compiled/css/timeline.css";
import { Timeline } from "@knight-lab/timelinejs";

export default function TimelineVisualization() {
  const timelineRef = useRef(null);
  const [timelineData, setTimelineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTimelineEvents() {
      try {
        const eventsSnapshot = await getDocs(collection(db, "timelineEvents"));
        const processedEvents = processTimelineEvents(eventsSnapshot);

        // Ensure correct format for Timeline.js
        const timelineJSON = {
          title: {
            media: { url: "", caption: "", credit: "" },
            text: {
              headline: "Civil Rights Movement Timeline",
              text: "Key events from the Civil Rights Movement, identified from interviews from the Library of Congress Civil Rights History Project."
            }
          },
          events: processedEvents
        };

        setTimelineData(timelineJSON);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching timeline data:", err);
        setError("Failed to load timeline events.");
        setLoading(false);
      }
    }

    fetchTimelineEvents();
  }, []);

  useEffect(() => {
    if (timelineData && timelineRef.current) {
      // Ensure the timeline container is not empty before rendering
      timelineRef.current.innerHTML = ""; // Reset container
      
      try {
        // Initialize timeline
        new Timeline(timelineRef.current, timelineData);
        
        // Add event listeners to interview buttons after timeline loads
        setTimeout(setupInterviewButtons, 1000);
      } catch (error) {
        console.error("Error initializing Timeline.js:", error);
        setError("Failed to initialize timeline.");
      }
    }
  }, [timelineData]);

  // Process timeline events and include button in text
  const processTimelineEvents = (eventsSnapshot) => {
    return eventsSnapshot.docs.map((doc) => {
      const data = doc.data();
      const eventDate = new Date(data.date);
      
      // Extract keywords for button
      const eventKeywords = data.keywords ? 
        data.keywords.split(",").map(kw => kw.trim()) : 
        [];
      
      // Create description text with embedded button
      const descriptionWithButton = `
        ${data.description || ""}
        <br><br>
        <button 
          class="relevant-interviews-button" 
          data-keywords="${encodeURIComponent(eventKeywords.join(","))}"
          style="background-color: #3b82f6; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; font-family: inherit; font-size: 14px;"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="width: 20px; height: 20px; margin-right: 8px;">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
          </svg>
          Relevant Interviews
        </button>
      `;

      return {
        start_date: {
          year: eventDate.getFullYear(),
          month: eventDate.getMonth() + 1,
          day: eventDate.getDate()
        },
        text: {
          headline: data.title,
          text: descriptionWithButton
        },
        media: {
          url: data.mediaUrl || "",
          caption: data.mediaCaption || "",
          credit: data.mediaCredit || ""
        }
      };
    });
  };

  // Sets up click handlers for interview buttons
  const setupInterviewButtons = () => {
    document.querySelectorAll(".relevant-interviews-button").forEach(button => {
      button.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        const keywords = this.dataset.keywords;
        if (keywords) {
          window.location.href = `/playlist-builder?keywords=${keywords}`;
        }
      });
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div 
        ref={timelineRef} 
        id="timeline-embed" 
        className="timeline-container" 
        style={{ height: "600px" }} 
      />
    </div>
  );
}