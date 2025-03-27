# Civil Rights Oral History - Transcript Analysis Architecture

This document provides an overview of the architecture of the Transcript Summary application, which uses React Flow to create an interactive interface for analyzing and visualizing civil rights oral history transcripts.

## Application Overview

The application allows users to:
- Upload and process multiple interview transcripts
- Analyze transcripts using AI (GPT-4o-mini)
- Visualize interview data as an interactive node-based flow
- Display YouTube videos in a side panel with timestamp navigation
- Generate metadata and key points from interview content
- Auto-organize nodes for optimal visualization

## Technical Stack

- **Frontend**: React with Vite
- **UI Components**: TailwindCSS
- **Flow Visualization**: React Flow
- **Layout Algorithm**: Dagre for automatic node arrangement
- **AI Integration**: OpenAI API (GPT-4o-mini)
- **Storage**: Firebase (optional)
- **Icons**: React Icons

## Architecture Components

### 1. Core Pages

- **TranscriptSummary.jsx**: Main application page that orchestrates the entire flow 
- **BasicFlow.jsx**: Example implementation for civil rights interview visualization

### 2. Node Types

The application uses a modular node-based architecture where each node type represents a different function:

#### Input Nodes
- **TranscriptInputNode**: Handles uploading and queuing multiple transcript files
  - Supports batch processing
  - Accepts YouTube URLs
  - Manages document naming

#### Processing Nodes
- **PromptEditingNode**: Configures AI system prompts for transcript analysis
  - Uses GPT-4o-mini by default
  - Allows customization of instructions

#### Output/Visualization Nodes
- **ResultsDisplayNode**: Shows AI-generated summaries and key points with video playback controls
- **MetadataNode**: Displays additional metadata about interviews in a collapsible format
- **KeywordBubbleNode**: Visualizes keywords extracted from all transcripts
- **KeypointTimelineNode**: Displays key points on a chronological timeline

### 3. Video Integration

- **VideoPanel Component**: A dedicated side panel for video playback
  - Displays YouTube videos related to interviews
  - Provides timestamp navigation based on key points
  - Allows users to play videos without cluttering the flow canvas
  - Improves UI by separating video playback from node visualization

### 4. Flow Management

- **Automatic Layout**: Uses Dagre library to automatically arrange nodes in a horizontal layout
- **Custom Connections**: Implements specific node connection patterns:
  - Results nodes connect to metadata nodes
  - Prompt nodes connect to results nodes
- **Event Handling**: Custom hooks for handling node interactions, connections, and updates
- **Auto Layout Button**: Manual trigger to reorganize nodes when needed

### 5. Key Files and Components

- **src/pages/TranscriptSummary.jsx**: Main application component
- **src/components/nodes/**: Directory containing all node type implementations
- **src/components/VideoPanel.jsx**: Side panel for YouTube video playback
- **src/hooks/useTranscriptData.js**: Manages transcript data and processing state
- **src/hooks/useNodeDragAndDrop.js**: Handles drag and drop functionality for adding nodes
- **src/utils/transcriptUtils.js**: Utilities for processing transcripts and interacting with AI
- **src/utils/nodeUtils.js**: Utilities for node creation and configuration
- **src/examples/BasicFlow.jsx**: Example implementation of a civil rights interview flow

### 6. Application Views

The application offers two main views:
1. **Transcript Summary**: The main workspace for processing and analyzing transcripts
2. **Example Interview Flow**: A pre-populated example showing how interview data is visualized

Users can toggle between these views using buttons in the interface.

### 7. Data Flow

1. **Input Phase**:
   - User uploads transcript files through the TranscriptInputNode
   - Files are queued for batch processing with associated metadata

2. **Processing Phase**:
   - PromptEditingNode defines how the AI should analyze transcripts
   - Transcripts are sent to OpenAI API (GPT-4o-mini)
   - AI generates structured summaries and key points

3. **Visualization Phase**:
   - ResultsDisplayNodes show AI-generated summaries
   - Metadata nodes store detailed information about transcripts
   - Nodes are automatically arranged using the Dagre layout algorithm

4. **User Interaction**:
   - Users can view videos by clicking "Play Video" in the ResultsDisplayNode
   - Video content appears in the VideoPanel component
   - Users can edit AI-generated summaries if needed
   - Users can navigate the flow to explore relationships between interviews

### 8. Auto-Layout Implementation

The application implements automatic layout of nodes:

```javascript
// Auto layout function using dagre
const getLayoutedElements = (nodes, edges, direction = LAYOUT_DIRECTION.HORIZONTAL) => {
  if (nodes.length === 0) return { nodes, edges };
  
  // Create a new dagre graph
  const dagreGraph = new dagre.graphlib.Graph();
  
  // Optimized parameters for horizontal layout
  const nodeWidth = 350;
  const nodeHeight = 250;
  const rankSeparation = 300;  // Space between columns
  const nodeSeparation = 400;  // Space between rows
  
  // Set graph options
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: rankSeparation,
    nodesep: nodeSeparation,
    edgesep: 80,
    marginx: 50,
    marginy: 100,
  });
  
  // Add nodes to dagre graph with dimensions
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { 
      width: node.type === 'resultsDisplay' ? nodeWidth + 100 : 
             node.type === 'metadata' ? nodeWidth + 50 : 
             nodeWidth,
      height: node.type === 'resultsDisplay' ? nodeHeight + 100 : 
              node.type === 'videoPlayer' ? nodeHeight + 150 : 
              nodeHeight 
    });
  });
  
  // Add edges to dagre graph and calculate layout
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });
  
  dagre.layout(dagreGraph);
  
  // Apply calculated positions to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWithPosition.width / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      },
    };
  });
  
  return { nodes: layoutedNodes, edges };
};
```

The layout is applied automatically when:
- Nodes or edges are added or removed
- Connections are changed
- The application initializes
- The user clicks the "Auto Layout" button

### 9. Batch Processing

The application supports processing multiple transcripts in a batch:

1. Users queue multiple transcripts with the TranscriptInputNode
2. Each transcript can have a document name and optional YouTube URL
3. The processMultipleTranscripts function processes each transcript sequentially
4. For each transcript:
   - A ResultsDisplayNode is created to show the analysis
   - A MetadataNode is created to store detailed information
   - Edges are created to connect the nodes
5. After processing, all nodes are automatically arranged using the layout algorithm

### 10. Node Toolbar

The application includes a node toolbar that:
- Provides easy access to different node types
- Allows drag-and-drop creation of new nodes
- Can be toggled on/off to save screen space
- Enhances the user experience with visual node previews

### 11. Customization Points

The application provides several customization points:

- **System Prompts**: Users can customize the instructions given to the AI
- **Node Arrangement**: The layout can be customized by adjusting parameters in getLayoutedElements
- **Node Types**: New node types can be added by creating components in src/components/nodes/
- **Node Styling**: Node appearance can be customized through CSS and component props

## Key Workflows

### Transcript Processing Workflow

1. User uploads transcripts through the TranscriptInputNode
2. Transcripts are queued for processing
3. User configures the AI prompt in the PromptEditingNode (optional)
4. User initiates batch processing
5. For each transcript:
   - AI analyzes the content
   - Results are displayed in a ResultsDisplayNode
   - Metadata is stored in a MetadataNode
   - Nodes are connected with edges
6. All nodes are automatically arranged for optimal visualization
7. User can view videos by clicking "Play Video" in the ResultsDisplayNode, which opens the VideoPanel

### Node Management Workflow

1. Nodes can be dragged from the NodesToolbar onto the canvas
2. Nodes can be connected by dragging from one handle to another
3. Auto-layout is applied after significant changes or can be manually triggered
4. Nodes can be selected and configured through their UI

## Future Extensions

The architecture is designed to be extensible in several ways:

1. **New Node Types**: Additional node types can be created for different data visualizations
2. **Advanced Layouts**: More sophisticated layout algorithms could be implemented
3. **Collaboration Features**: Real-time collaboration could be added
4. **Export/Import**: Functionality to save and load flows
5. **Additional AI Models**: Support for different AI models beyond GPT-4o-mini

## Conclusion

This application uses React Flow to create a powerful, flexible interface for transcript analysis and visualization. The node-based architecture allows for modular development and easy extension, while the automatic layout ensures that visualizations remain clean and comprehensible regardless of complexity. The VideoPanel approach improves user experience by providing a dedicated space for video playback without cluttering the node canvas. 