// Simulated transcript processing utilities
import { db } from '../services/firebase';

// Mock data for testing
const MOCK_SUMMARIES = {
  overallSummary: "This is a simulated summary of the interview. It contains key information about civil rights movements, personal experiences, and historical context. The interviewee discusses their involvement in various protests and the impact of these events on their community.",
  keyPoints: [
    {
      topic: "Early Activism",
      timestamp: "00:15",
      summary: "Discussion of initial involvement in civil rights movement",
      keywords: "activism, early experiences, community involvement"
    },
    {
      topic: "Major Protests",
      timestamp: "05:30",
      summary: "Recollection of participation in significant protests",
      keywords: "protests, demonstrations, civil disobedience"
    },
    {
      topic: "Community Impact",
      timestamp: "12:45",
      summary: "Analysis of how protests affected local community",
      keywords: "community, impact, social change"
    },
    {
      topic: "Personal Growth",
      timestamp: "18:20",
      summary: "Personal development through activism",
      keywords: "personal growth, leadership, empowerment"
    },
    {
      topic: "Historical Context",
      timestamp: "25:10",
      summary: "Discussion of historical significance of events",
      keywords: "history, significance, legacy"
    }
  ]
};

// Simulate API delay
const simulateDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Simulate transcript processing
export const getSimulatedSummaries = async (transcriptText, systemMessage, model) => {
  // Simulate processing delay
  await simulateDelay(2000);
  
  // Return mock data
  return MOCK_SUMMARIES;
};

// Simulate saving to database
export const saveSimulatedTranscript = async (documentName, summaries) => {
  // Simulate database delay
  await simulateDelay(1000);
  
  // In a real implementation, this would save to Firebase
  console.log('Simulated saving to database:', {
    documentName,
    summaries
  });
  
  return true;
};

// Simulate reading file
export const readSimulatedFile = async (file) => {
  // Simulate file reading delay
  await simulateDelay(500);
  
  // Return mock transcript text
  return `This is a simulated transcript file content.
  
  It contains various sections about civil rights movements and personal experiences.
  
  The content is structured to mimic real interview transcripts while avoiding
  any actual API calls or database operations.
  
  This allows for testing the application's functionality without consuming
  API credits or requiring actual database access.`;
};

// Export all simulated utilities
export const simulatedTranscriptUtils = {
  getSummariesFromChatGPT: getSimulatedSummaries,
  saveProcessedTranscript: saveSimulatedTranscript,
  readFileAsText: readSimulatedFile
}; 