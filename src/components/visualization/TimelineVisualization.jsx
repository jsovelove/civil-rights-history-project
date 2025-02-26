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
      
      // Create description text with embedded button - styled to match our design system
      const descriptionWithButton = `
        ${data.description || ""}
        <br><br>
        <button 
          class="relevant-interviews-button" 
          data-keywords="${encodeURIComponent(eventKeywords.join(","))}"
          style="background-color: #2563eb; color: white; padding: 10px 16px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; font-family: inherit; font-size: 14px; font-weight: 500; transition: background-color 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"
          onmouseover="this.style.backgroundColor = '#1d4ed8'"
          onmouseout="this.style.backgroundColor = '#2563eb'"
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
      <div className="flex justify-center items-center h-96 bg-gray-50">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-500 text-red-700 px-6 py-4 rounded-lg text-center mx-auto my-6 max-w-xl">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gray-50 font-sans">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Civil Rights Timeline
        </h2>
        <p className="text-base leading-relaxed text-gray-600">
          Explore key events from the Civil Rights Movement, with links to relevant interview recordings.
        </p>
      </div>
      
      <div className="bg-white rounded-xl shadow-md overflow-hidden p-0 mb-6">
        <div 
          ref={timelineRef} 
          id="timeline-embed" 
          style={{ height: "600px", width: "100%", position: "relative" }} 
        />
      </div>
      
      <div className="bg-indigo-50 rounded-xl p-4 px-6 border-l-4 border-indigo-500">
        <p className="text-sm leading-relaxed text-indigo-800 m-0">
          <strong>Tip:</strong> Click on any event to see details, and use the "Relevant Interviews" button to find related interview recordings.
        </p>
      </div>
    </div>
  );
}