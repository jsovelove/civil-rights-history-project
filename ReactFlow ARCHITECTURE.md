# Civil Rights Oral History - Transcript Analysis Architecture

## Project Overview

This project provides an interactive, visual interface for analyzing and visualizing civil rights oral history transcripts. Using a node-based flow interface built with React Flow, it enables researchers, historians, and educators to:

- Process multiple interview transcripts simultaneously
- Generate AI-powered summaries and insights from interview content
- Create visual representations of key themes and connections
- Explore relationships between different interviews 
- View associated video content with timestamp navigation
- Extract keywords and metadata for further analysis

The application is designed to enhance the accessibility and usefulness of oral history collections by transforming raw transcript text into structured, navigable, and visually engaging content.

## Technical Stack

- **Frontend**: React with Vite for fast development
- **UI Components**: TailwindCSS for styling
- **Flow Visualization**: React Flow for node-based interfaces
- **Layout Algorithm**: Dagre for automatic node arrangement
- **AI Integration**: OpenAI API (with GPT-4o-mini as default)
- **Storage**: Firebase (optional for persistent storage)
- **Icons**: React Icons library
- **Testing**: Simulated API responses for development without API costs

## Core Architecture

The application is built around a modular, node-based architecture where different node types handle specific functions in the transcript analysis workflow.

### 1. Node Types & Data Flow

#### Input Nodes
- **TranscriptInputNode**: Entry point for transcript data
  - Handles file uploads (single or batch)
  - Accepts YouTube URLs for associated video content
  - Manages document naming and queuing

#### Processing Nodes
- **PromptEditingNode**: Controls the AI analysis configuration
  - Contains customizable system prompts for AI
  - Allows model selection (GPT-4o-mini by default)
  - Initiates the processing workflow

#### Output & Visualization Nodes
- **ResultsDisplayNode**: Displays AI-generated content
  - Shows overall summary of the transcript
  - Lists key points with timestamps
  - Provides editing capabilities for summaries and key points
  - Includes "locked" state to preserve processed content
  
- **MetadataNode**: Stores and displays metadata
  - Extracts metadata from transcripts
  - Receives data from connected results nodes
  - Provides structured data for visualizations
  - Features database saving functionality
  
- **KeywordBubbleNode**: Visualizes extracted keywords
  - Displays keywords in an interactive bubble visualization
  - Sizes bubbles based on keyword frequency
  - Updates dynamically based on connected metadata
  - Shows relationships between different themes

### 2. Data Flow Architecture

The application implements a directed data flow between nodes:

1. **Input → Processing**: 
   - Transcript text flows from TranscriptInputNode to PromptEditingNode
   - User configurations determine how transcripts will be analyzed
   
2. **Processing → Results**:
   - PromptEditingNode sends data to AI for processing
   - Results are captured in ResultsDisplayNode instances
   - Each transcript generates its own results node
   
3. **Results → Metadata**:
   - Result nodes connect to corresponding metadata nodes
   - Summary data flows automatically to connected metadata nodes
   - Changes in results update connected metadata
   
4. **Metadata → Visualization**:
   - Metadata nodes connect to visualization nodes (e.g., KeywordBubbleNode)
   - Keywords and themes are extracted and visualized
   - Visualizations update when connected metadata changes

5. **Disconnection Handling**:
   - When nodes are disconnected, dependent data is automatically cleared
   - Re-connection re-establishes the data flow
   - The UI updates to reflect current connection state

### 3. Node Locking & Processing States

The application implements a sophisticated state management system:

1. **Processed Flag**:
   - Nodes are marked with a `processed: true` flag after transcript processing
   - Processed nodes are locked to prevent inadvertent changes
   - Visual indicators show which nodes are in processed state

2. **Connection Validation**:
   - The application enforces valid connection patterns:
     - Results nodes can connect to metadata nodes
     - Metadata nodes can connect to visualization nodes
     - Invalid connections are prevented automatically

3. **Data Preservation**:
   - Input nodes (TranscriptInput and PromptEditing) are preserved during processing
   - Their positions remain fixed while new result nodes are generated
   - This allows for continuous processing of multiple transcripts

## Key Implementation Features

### 1. Smart Layout & Positioning

The application implements a sophisticated layout system:

- **Horizontal Row Organization**: 
  - Results nodes are arranged in a horizontal row
  - Metadata nodes are positioned directly below their corresponding result nodes
  - Equal spacing ensures clean visualization

- **Input Node Preservation**:
  - Input nodes maintain their original positions during processing
  - New nodes are positioned relative to existing nodes
  - The layout adapts to the presence of existing nodes

- **Custom Layout Parameters**:
  - Nodes are positioned with configurable spacing parameters
  - Horizontal spacing between related nodes is consistent
  - Vertical alignment creates clean, readable flows

```javascript
// Latest implementation for horizontal node positioning
resultRows.forEach((node, index) => {
  node.position = {
    x: startX + (index * horizontalSpacing),
    y: baseY
  };
});

metadataRows.forEach((node, index) => {
  node.position = {
    x: startX + (index * horizontalSpacing),
    y: baseY + rowSpacing
  };
});
```

### 2. Simulated Testing Environment

The application includes a comprehensive simulation system for testing without consuming API credits:

- **Simulated API Responses**:
  - Mock data closely resembles actual AI-generated content
  - Configurable delay times mimic real-world processing times
  - Testing flag (`testingMode`) toggles between real and simulated APIs

- **Mock Data Generation**:
  - Predefined summaries and key points for testing
  - Realistic keywords for visualization testing
  - Timestamps and metadata matching real-world patterns

```javascript
// Example of simulated response structure
const MOCK_SUMMARIES = {
  overallSummary: "This is a simulated summary of the interview...",
  keyPoints: [
    {
      topic: "Early Activism",
      timestamp: "00:15",
      summary: "Discussion of initial involvement in civil rights movement",
      keywords: "activism, early experiences, community involvement"
    },
    // Additional key points...
  ]
};
```

### 3. Video Integration

The application features a dedicated Video Panel component:

- **Side Panel Approach**:
  - Videos open in a dedicated panel rather than within nodes
  - Provides more screen space for video viewing
  - Keeps the flow interface clean and focused

- **Timestamp Navigation**:
  - Click on key points to navigate to specific video timestamps
  - Timecodes in transcripts are linked to video playback
  - Enhances exploration of video content

- **YouTube Integration**:
  - Automatic conversion of standard YouTube URLs to embed format
  - Support for various YouTube URL formats
  - Responsive video player with playback controls

### 4. Batch Processing

The application supports efficient batch processing of multiple transcripts:

- **Queue Management**:
  - TranscriptInputNode manages a queue of transcripts
  - Progress indicators show processing status
  - Batch operations process all queued transcripts

- **Parallel Node Creation**:
  - Each transcript generates its own set of nodes
  - Nodes are automatically connected in the correct pattern
  - Layout adapts to accommodate all new nodes

## Getting Started

### Project Setup

1. **Installation**:
   ```bash
   npm install
   ```

2. **Configuration**:
   - Create a `.env` file with your OpenAI API key (if using real API)
   - Set `testingMode` to `true` in TranscriptSummary.jsx for API-free testing

3. **Development**:
   ```bash
   npm run dev
   ```

### Using the Application

1. **Processing Transcripts**:
   - Upload transcript files using the TranscriptInputNode
   - Set system prompt in PromptEditingNode
   - Click "Process" to analyze transcripts
   - View results in the generated nodes

2. **Exploring Data**:
   - Connect nodes by dragging from handles
   - View summaries and key points in ResultsDisplayNodes 
   - Explore keywords in KeywordBubbleNode
   - Click "Auto Layout" to organize nodes

3. **Using Simulated Testing**:
   - Enable `testingMode` for development without API usage
   - Test with mock transcripts to see full workflow
   - Use the provided delay times to simulate realistic processing

## Customization Points

The application provides several customization options:

- **AI Prompts**: Modify the system prompt in PromptEditingNode
- **Layout Parameters**: Adjust spacing and direction in layout functions
- **Node Styling**: Customize appearance through CSS and component props
- **Simulation Parameters**: Configure mock data and processing times
- **New Node Types**: Extend with additional visualization nodes

## Future Extensions

The architecture supports several potential extensions:

1. **Advanced Analytics**: Integration with data analysis tools
2. **Collaborative Editing**: Multi-user support for team analysis
3. **Export/Import**: Save and load complete flow configurations
4. **Additional AI Models**: Support for more AI providers and models
5. **Timeline Visualization**: Chronological view of events from transcripts
6. **Cross-Interview Analysis**: Tools to compare themes across multiple interviews

## Conclusion

This application provides a powerful, flexible interface for transcript analysis through its node-based architecture. The design emphasizes:

1. **Modularity**: Each node handles a specific function
2. **Data Flow**: Clear, directed connections between nodes
3. **Visual Clarity**: Automatic layout ensures readability
4. **Extensibility**: Easy addition of new node types and features
5. **Testing Efficiency**: Simulated responses for development without API costs

The architecture allows researchers to transform text-heavy oral histories into interactive, visual representations that enhance understanding and accessibility. 