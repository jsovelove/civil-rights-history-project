/**
 * @fileoverview TimelineVisualization component for displaying civil rights historical events.
 * 
 * This component integrates with Timeline.js to create an interactive timeline of
 * civil rights events. It fetches event data from Firestore, processes it into the
 * required format, and renders an interactive timeline with links to relevant interviews.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import "timelinejs3/compiled/css/timeline.css";
import { Timeline } from "@knight-lab/timelinejs";
import { useNavigate } from 'react-router-dom';

/**
 * TimelineVisualization - Displays an interactive timeline of civil rights events
 * 
 * This component:
 * 1. Fetches timeline events from Firestore
 * 2. Processes events into the Timeline.js format
 * 3. Renders an interactive timeline using the Knight Lab Timeline library
 * 4. Adds links to relevant interviews for each event
 * 5. Handles navigation to related content
 * 
 * @returns {React.ReactElement} The timeline visualization interface
 */
export default function TimelineVisualization() {
  // Timeline reference for DOM manipulation
  const timelineRef = useRef(null);
  // Component state
  const [timelineData, setTimelineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Store navigate function in a ref to access it in the event listener
  // This prevents stale closures when using navigate in event handlers
  const navigateRef = useRef();
  navigateRef.current = navigate;

  /**
   * Fetch timeline events from Firestore
   * Processes the events into the format required by Timeline.js
   */
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

  /**
   * Initialize Timeline.js when data is available
   * Sets up event listeners for interview buttons after the timeline is rendered
   */
  useEffect(() => {
    if (timelineData && timelineRef.current) {
      // Ensure the timeline container is not empty before rendering
      timelineRef.current.innerHTML = ""; // Reset container
      
      try {
        // Initialize timeline
        new Timeline(timelineRef.current, timelineData);
        
        // Add event listeners to interview buttons after timeline loads
        // Using setTimeout to ensure the timeline has fully rendered
        setTimeout(setupInterviewButtons, 1000);
      } catch (error) {
        console.error("Error initializing Timeline.js:", error);
        setError("Failed to initialize timeline.");
      }
    }
  }, [timelineData]);

  /**
   * Process timeline events from Firestore into the format required by Timeline.js
   * Adds custom buttons to each event for navigating to relevant interviews
   * 
   * @param {FirebaseFirestore.QuerySnapshot} eventsSnapshot - Snapshot of events from Firestore
   * @returns {Array} Processed events in Timeline.js format
   */
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

      // Return the event in Timeline.js format
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

  /**
   * Sets up click event handlers for the "Relevant Interviews" buttons
   * 
   * This function attaches event listeners to dynamically created buttons
   * in the timeline, handling navigation to the playlist builder with
   * relevant keywords for that historical event.
   */
  const setupInterviewButtons = () => {
    document.querySelectorAll(".relevant-interviews-button").forEach(button => {
      button.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        const keywords = this.dataset.keywords;
        if (keywords) {
          // Use the navigateRef to access the current navigate function
          navigateRef.current(`/playlist-builder?keywords=${keywords}`);
        }
      });
    });
  };

  // Loading state
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

  // Error state
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