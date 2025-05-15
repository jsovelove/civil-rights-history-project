# OpenAI API Integration

This document provides comprehensive documentation for the OpenAI API integration in the Civil Rights History Project application, explaining how Large Language Models (LLMs) are used to process and analyze interview transcripts.

## Overview

The application leverages OpenAI's GPT models to:

1. **Generate Structured Summaries**: Convert raw interview transcripts into structured summaries
2. **Extract Key Points**: Identify and timestamp significant moments in interviews
3. **Generate Keywords**: Create relevant keywords for search and categorization
4. **Create Thematic Connections**: Identify relationships between different interviews
5. **Enable Natural Language Search**: Provide semantic search capabilities

## API Configuration

The OpenAI API is configured in the application using environment variables:

```javascript
// Configuration setup
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const baseURL = 'https://api.openai.com/v1';
const defaultModel = 'gpt-4o-mini'; // More affordable model with good capabilities
```

## Model Selection

The application uses different OpenAI models based on the task requirements:

- **GPT-4o-mini**: Default model for most transcript processing tasks, balancing cost and quality
- **GPT-3.5-turbo**: Used for simpler tasks where maximum context isn't required
- **GPT-4-turbo**: Available for complex analysis when higher accuracy is needed (optional)

The model can be selected in the TranscriptSummary page via the PromptEditingNode.

## Core Functionality

### Transcript Processing Workflow

The application follows this general workflow for transcript processing:

1. **Transcript Upload**: User uploads a transcript file or inputs YouTube URL
2. **Preprocessing**: Text is cleaned and formatted for optimal LLM processing
3. **System Prompt Creation**: Customized instructions for the LLM are generated
4. **API Request**: Transcript and prompt are sent to the OpenAI API
5. **Response Processing**: The structured JSON response is parsed and validated
6. **Database Storage**: Processed data is saved to Firestore

### API Request Implementation

The application leverages the `getSummariesFromChatGPT` function in `transcriptUtils.js` to handle communication with the OpenAI API:

```javascript
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
```

Key features of the API implementation:

1. **Customizable Parameters**:
   - `transcript`: The interview text to be processed
   - `systemMessage`: Custom system prompt for different analysis types
   - `model`: OpenAI model selection (defaults to gpt-4o-mini)
   - `retries` and `delay`: Automatic retry mechanism with exponential backoff

2. **Response Parsing**: 
   - The raw API response is passed to `parseGPTResponse()` which extracts:
     - Overall summary text
     - Key points with topics, timestamps, and keywords
   - The structured data format is consistent regardless of the prompt used

3. **Error Handling**:
   - Rate limiting detection with automatic retries
   - Comprehensive error reporting
   - Exponential backoff for transient errors

This implementation is called from the `processTranscript` function in `TranscriptSummary.jsx`:

```javascript
const processTranscript = async (transcriptText, docName, ytUrl, useModel = model) => {
  if (!transcriptText) return null;
  
  try {
    // Automatically set document name if not provided
    const processedDocName = docName || `Transcript-${Date.now()}`;
    
    // Use getSummariesFromChatGPT utility
    const summaryData = await getSummariesFromChatGPT(transcriptText, systemMessage, useModel);
    
    // Format YouTube URL if provided
    const formattedYoutubeUrl = ytUrl ? formatYoutubeUrl(ytUrl) : "";
    
    // Return the processed data
    return {
      documentName: processedDocName,
      transcript: transcriptText,
      summary: summaryData,
      youtubeUrl: ytUrl,
      youtubeEmbedUrl: formattedYoutubeUrl
    };
  } catch (error) {
    console.error("Error processing transcript:", error);
    throw error;
  }
};
```

## System Prompts

The application uses carefully crafted system prompts to instruct the LLM on how to process transcripts. These prompts are editable in the UI to allow for customization.

### Default System Prompt

The application uses the following default system prompt in the transcript processing workflow:

```
You are an assistant that processes interview transcripts into structured summaries with timestamps and keywords.

Always output the content in the following strict format:
Overall Summary:
[Provide a concise overall summary here.]

Key Points:
1. Title: [First key topic]
   Timestamp: [Start time - End time]
   Keywords: [Comma-separated list of keywords]
   Summary: [Provide a short summary of the first key topic.]
```

This prompt ensures that the LLM returns consistently formatted data that can be parsed and stored in the application's database.

### Custom Prompt Types

Users can customize prompts for different analysis types:

1. **Basic Summary**: Quick overview of the transcript
2. **Detailed Analysis**: In-depth examination with many key points
3. **Thematic Extraction**: Focus on specific themes or topics
4. **Biographical Focus**: Emphasis on people and relationships
5. **Custom Format**: User-defined output structure

## Response Structure

The OpenAI API returns structured JSON that the application parses into the following format:

```javascript
{
  summary: "Overall interview summary text...",
  keyPoints: [
    { timestamp: "10:25", topic: "Description of first key point" },
    { timestamp: "24:15", topic: "Description of second key point" },
    // Additional key points...
  ],
  keywords: ["civil rights", "protest", "Montgomery", "segregation", /* etc */],
  people: ["Martin Luther King Jr.", "Rosa Parks", /* etc */],
  organizations: ["NAACP", "SCLC", /* etc */],
  places: ["Birmingham, Alabama", "Selma", /* etc */]
}
```

## Performance Optimization

### Token Usage Optimization

The application implements several strategies to optimize token usage:

1. **Text Chunking**: Long transcripts are divided into manageable chunks
2. **Prompt Engineering**: Prompts are designed to be clear but concise
3. **Response Formatting**: JSON output reduces token waste
4. **Contextual Processing**: Processing only relevant sections when appropriate

### Cost Management

To manage API costs effectively, the application:

1. **Caches Results**: Processed transcripts are stored to avoid redundant API calls
2. **Uses Efficient Models**: Selects appropriate models based on task complexity
3. **Implements Rate Limiting**: Prevents accidental excessive API usage
4. **Provides Feedback**: Shows token usage estimates before processing

## Error Handling

The application implements robust error handling for API interactions:

```javascript
try {
  const result = await processWithOpenAI(transcript, systemPrompt, selectedModel);
  // Process successful result
} catch (error) {
  if (error.message.includes('429')) {
    // Handle rate limiting
    setError("API rate limit exceeded. Please try again later.");
  } else if (error.message.includes('401')) {
    // Handle authentication errors
    setError("API key invalid or expired. Please check your credentials.");
  } else if (error.message.includes('max_tokens')) {
    // Handle token limit errors
    setError("Transcript too long. Please try breaking it into smaller sections.");
  } else {
    // Handle general errors
    setError(`Processing error: ${error.message}`);
  }
}
```

## Usage in Components

### TranscriptSummary Page

The TranscriptSummary page is the primary interface for OpenAI API integration:

- **Prompt Editing**: Users can customize the system prompt
- **Model Selection**: Users can select the appropriate OpenAI model
- **Processing Controls**: Start, stop, and monitor the processing
- **Results Display**: View and edit the processed results

### PromptEditingNode

The PromptEditingNode component provides a specialized interface for prompt customization:

- **Template Selection**: Choose from predefined prompt templates
- **Variable Insertion**: Insert dynamic variables into prompts
- **Syntax Highlighting**: Visual editing with proper formatting
- **Token Estimation**: See estimated token usage

### ResultsDisplayNode

The ResultsDisplayNode component presents API results in a user-friendly format:

- **Formatted View**: Structured display of processed data
- **Edit Capabilities**: Modify AI-generated content
- **Export Options**: Save or share the results
- **Visualization Links**: Connect to visualization components

## Authentication and Security

OpenAI API keys are handled securely:

1. **Environment Variables**: API keys are stored in environment variables, not in code
2. **Server-Side Processing**: For production, API calls are routed through a secure backend
3. **Rate Limiting**: Prevents abuse of API credentials
4. **Error Masking**: Detailed API errors are logged but not exposed to users

## Best Practices

When working with the OpenAI API integration:

1. **Prompt Testing**: Test prompts with sample data before processing large transcripts
2. **Incremental Processing**: Process transcripts in manageable sections
3. **Response Validation**: Always validate API responses before using them
4. **Error Recovery**: Implement retry mechanisms for transient errors
5. **Output Verification**: Review AI-generated content for accuracy

## Advanced Features

### Custom Processing Pipelines

The node-based system allows users to create custom processing pipelines:

1. **Multi-Stage Analysis**: Process transcripts through multiple specialized prompts
2. **Comparative Analysis**: Compare multiple interviews on the same topic
3. **Topical Extraction**: Extract specific themes across multiple interviews
4. **Timeline Generation**: Create chronological timelines from interview content

### Integration with Visualization

OpenAI-processed data feeds directly into visualization components:

1. **Keyword Bubbles**: Show keyword frequency and relationships
2. **Geographic Maps**: Visualize locations mentioned in interviews
3. **Timelines**: Plot key events chronologically
4. **Network Graphs**: Display relationships between people and organizations

## Related Documentation

- [Node System Documentation](node-system): How the node system integrates with OpenAI
- [Firebase Integration](firebase-integration): How processed data is stored
- [Component Documentation](component-documentation): Details on components that use OpenAI responses 