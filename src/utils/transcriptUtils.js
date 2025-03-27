/**
 * Utility functions for transcript processing
 */

/**
 * Reads a file as text using FileReader
 * 
 * @param {File} file - The file to read
 * @returns {Promise<string>} The file contents as text
 */
export const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

/**
 * Sends transcript to OpenAI API for analysis and summary generation
 * 
 * @param {string} transcript - The transcript text to analyze
 * @param {string} systemMessage - The system message to use for the API call
 * @param {string} model - The OpenAI model to use (defaults to gpt-4o-mini)
 * @param {number} retries - Number of retries for rate limiting
 * @param {number} delay - Delay between retries in milliseconds
 * @returns {Promise<Object>} Parsed summaries from the API response
 */
export const getSummariesFromChatGPT = async (transcript, systemMessage, model = "gpt-4o-mini", retries = 3, delay = 2000) => {
  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemMessage.trim() },
          { role: "user", content: `Here is a transcript:\n${transcript}\n\nGenerate an overall summary, key points with timestamps, and keywords.` },
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        console.warn(`Rate limit exceeded. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return getSummariesFromChatGPT(transcript, systemMessage, model, retries - 1, delay * 2);
      }
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return parseGPTResponse(data.choices[0].message.content);
  } catch (error) {
    console.error("Error communicating with OpenAI API:", error);
    throw error;
  }
};

/**
 * Parses the GPT response text into structured format
 * 
 * @param {string} response - Raw text response from GPT
 * @returns {Object} Structured summary object with overall summary and key points
 */
export const parseGPTResponse = (response) => {
  const overallSummaryMatch = response.match(/Overall Summary:\s*(.+)/i);
  const overallSummary = overallSummaryMatch 
    ? overallSummaryMatch[1].trim() 
    : "No summary found.";

  const keyPoints = [];
  const keyPointRegex = /\d+\.\s*Title:\s*(.+?)\s*Timestamp:\s*(.+?)\s*Keywords:\s*(.+?)\s*Summary:\s*(.+?)(?=\d+\.|$)/gs;

  let match;
  while ((match = keyPointRegex.exec(response)) !== null) {
    keyPoints.push({
      topic: match[1].trim(),
      timestamp: match[2].trim(),
      keywords: match[3].trim(),
      summary: match[4].trim()
    });
  }

  return { overallSummary, keyPoints };
};

/**
 * Parses a timestamp string into seconds
 * 
 * @param {string} timestamp - Timestamp in various formats: "MM:SS", "HH:MM:SS", or ranges like "MM:SS - MM:SS"
 * @returns {number} Total seconds represented by the timestamp
 */
export const parseTimestamp = (timestamp) => {
  // Handle ranges by taking just the first part
  let startTime = timestamp;
  if (timestamp.includes(" - ")) {
    startTime = timestamp.split(" - ")[0];
  }
  
  // Parse the timestamp into total seconds
  let totalSeconds = 0;
  
  // Handle HH:MM:SS format
  if (startTime.split(":").length === 3) {
    const [hours, minutes, seconds] = startTime.split(":").map(Number);
    if (hours >= 0 && minutes >= 0 && seconds >= 0) {
      totalSeconds = hours * 3600 + minutes * 60 + seconds;
    } else {
      throw new Error("Invalid timestamp components");
    }
  } 
  // Handle MM:SS format
  else if (startTime.split(":").length === 2) {
    const [minutes, seconds] = startTime.split(":").map(Number);
    if (minutes >= 0 && seconds >= 0) {
      totalSeconds = minutes * 60 + seconds;
    } else {
      throw new Error("Invalid timestamp components");
    }
  }
  // Handle just seconds
  else if (!isNaN(Number(startTime))) {
    totalSeconds = Number(startTime);
  } else {
    throw new Error("Unrecognized timestamp format");
  }
  
  return totalSeconds;
};

/**
 * Saves processed transcript data to Firebase Firestore
 * 
 * @param {string} documentName - Name of the interview document
 * @param {Object} summaries - Structured summary data to save
 * @param {Object} db - Firestore database instance
 */
export const saveProcessedTranscript = async (documentName, summaries, db) => {
  try {
    const { collection, doc, setDoc } = await import('firebase/firestore');
    
    // Save main summary
    const interviewDocRef = doc(collection(db, "interviewSummaries"), documentName);
    await setDoc(interviewDocRef, {
      documentName,
      mainSummary: summaries.overallSummary,
      createdAt: new Date(),
    });

    // Save subsummaries
    for (const subSummary of summaries.keyPoints) {
      const sanitizedTitle = subSummary.topic.replace(/[^a-zA-Z0-9-_]/g, "_");
      const subSummaryDocRef = doc(
        collection(db, "interviewSummaries", documentName, "subSummaries"),
        sanitizedTitle
      );

      await setDoc(subSummaryDocRef, {
        topic: subSummary.topic,
        timestamp: subSummary.timestamp,
        keywords: subSummary.keywords,
        summary: subSummary.summary,
      });
    }
  } catch (error) {
    console.error("Error storing processed transcript:", error);
    throw error;
  }
}; 