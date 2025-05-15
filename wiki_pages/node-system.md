# Node System Documentation

This document provides comprehensive documentation for the node-based flow diagram system used in the Civil Rights History Project application, particularly within the TranscriptSummary page.

## Overview

The application implements a visual node-based workflow system built on React Flow, allowing users to create, connect, and manipulate nodes that represent different stages of transcript processing. This visual programming paradigm enables non-technical users to build custom processing pipelines for analyzing interview transcripts.

## Architecture

The node system architecture follows a modular, registry-based approach:

```
┌─────────────────────────────────────────────────────────────┐
│                       React Flow Core                        │
├─────────────────────────────────────────────────────────────┤
│                         Flow Context                         │
├───────────────┬───────────────────────────┬─────────────────┤
│ Node Registry │       Edge Utilities      │  Layout System  │
├───────────────┴───────────────────────────┴─────────────────┤
│                        Node Components                       │
├─────────────┬──────────────┬───────────┬────────────────────┤
│    Input    │  Processing  │  Output   │   Visualization    │
│    Nodes    │    Nodes     │   Nodes   │       Nodes        │
└─────────────┴──────────────┴───────────┴────────────────────┘
```

### Key Components

1. **React Flow Core**: The underlying library providing drag-and-drop, zooming, panning, and connection capabilities
2. **Flow Context**: A React Context managing the state of nodes, edges, and operations
3. **Node Registry**: A plugin system for registering and managing node types
4. **Edge Utilities**: Functions for creating and styling edges between nodes
5. **Layout System**: Utilities for managing node layouts and templates
6. **Node Components**: Specialized React components for different node types

## Flow Context

The FlowContext provides a centralized state management system for the node diagram.

**File Location**: `src/contexts/FlowContext.jsx`

### Key Functionality:

- Manages nodes and edges state
- Provides operations for adding, removing, and updating nodes
- Handles edge connections between nodes
- Manages selection state of nodes
- Provides layout saving and loading functionality

### Usage Example:

```jsx
import { useFlow } from '../contexts/FlowContext';

function MyComponent() {
  const { 
    nodes, 
    edges, 
    addNode, 
    connectNodes, 
    updateNodeData 
  } = useFlow();
  
  const handleAddNode = () => {
    const newNodeId = addNode('transcriptInput', { x: 100, y: 100 });
    console.log(`Created new node with ID: ${newNodeId}`);
  };
  
  // Component implementation...
}
```

## Node Registry System

The node registry provides a plugin architecture for node types, enabling dynamic registration and management of different node types.

**File Location**: `src/components/nodes/registry.js`

### Key Functions:

- `registerNodeType`: Registers a new node type with the system
- `getFlattenedNodeTypes`: Returns all node types in a format React Flow can use
- `getNodeDefaults`: Retrieves default configuration for a node type
- `createNode`: Creates a new node instance with appropriate defaults

### Node Registration Example:

```javascript
registerNodeType({
  type: 'transcriptInput',           // Unique identifier
  category: 'input',                  // Category classification
  component: TranscriptInputNode,     // React component
  defaults: {                         // Default properties
    style: { width: 320 },
    data: { label: 'Transcript Input' }
  },
  metadata: {                         // Additional information
    description: 'Node for uploading and processing transcript files',
    icon: 'file-upload'
  }
});
```

## Node Categories

The system organizes nodes into the following categories:

### 1. Input Nodes

Nodes responsible for data ingestion into the workflow.

**Key Node Types**:
- `TranscriptInputNode`: Handles transcript file uploads and text input
- `WhisperTranscriptionNode`: Processes audio files for transcription

**File Locations**: `src/components/nodes/input/`

### 2. Processing Nodes

Nodes that transform data through various processing operations.

**Key Node Types**:
- `PromptEditingNode`: Allows customization of LLM system prompts

**File Locations**: `src/components/nodes/processing/`

### 3. Output Nodes

Nodes that display results and processed information.

**Key Node Types**:
- `ResultsDisplayNode`: Shows processing results in various formats

**File Locations**: `src/components/nodes/output/`

### 4. Visualization Nodes

Nodes that create visual representations of data.

**Key Node Types**:
- `KeywordBubbleNode`: Visualizes keyword frequency in bubble charts
- `MapVisualizationNode`: Displays geographical information on maps

**File Locations**: `src/components/nodes/visualization/`

### 5. Other Nodes

General-purpose nodes that don't fit into the above categories.

**Key Node Types**:
- `MetadataNode`: Displays and manages interview metadata

**File Locations**: `src/components/nodes/`

## TranscriptSummary Page Integration

The TranscriptSummary page serves as the main interface for the node system, allowing users to create custom transcript processing workflows.

**File Location**: `src/pages/TranscriptSummary.jsx`

### Key Features:

1. **Node Canvas**: Provides a draggable, zoomable workspace for node editing
2. **Node Toolbar**: Offers a palette of available nodes to add to the canvas
3. **Context Controls**: Provides operations for layout management and organization
4. **View Modes**: Supports switching between node view and results view

### VideoPanel Integration

While not part of the node system itself, the TranscriptSummary page integrates with the VideoPanel component:

- `VideoPanel` is a modal component that displays videos associated with transcripts
- It can be opened from the ResultsDisplayNode via the `openVideoPanel` function
- The VideoPanel provides custom video playback with timestamp navigation
- TranscriptSummary manages VideoPanel state (visibility, video URL, and associated metadata)

**Integration Code Example**:
```jsx
// In TranscriptSummary.jsx
const openVideoPanel = (videoUrl, documentName, summaries) => {
  setVideoPanel({
    isOpen: true,
    videoUrl,
    documentName,
    summaries
  });
};

// Pass to nodes
const nodeConfig = getNodeConfig(type, {
  // ... other props
  openVideoPanel
});

// Render the VideoPanel
<VideoPanel 
  isOpen={videoPanel.isOpen}
  onClose={closeVideoPanel}
  videoUrl={videoPanel.videoUrl}
  documentName={videoPanel.documentName}
  summaries={videoPanel.summaries}
/>
```

### Workflow Stages:

1. **Input Stage**: Upload or input transcript text
2. **Processing Stage**: Configure LLM prompts and processing parameters
3. **Analysis Stage**: AI-powered transcript analysis and structuring
4. **Output Stage**: View and export structured results
5. **Visualization Stage**: Explore data through visual representations

### State Management:

The TranscriptSummary page manages several types of state:
- Node diagram state (via FlowContext)
- Transcript data state
- Processing configuration state
- API communication state

### Node Data Flow:

Data flows between nodes through connections, with each node:
1. Receiving input data from incoming connections
2. Processing or transforming the data
3. Passing output data to connected nodes

## Examples

### Basic Transcript Processing Workflow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  TranscriptInput│────▶│  PromptEditing  │────▶│  ResultsDisplay │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Advanced Workflow with Visualization

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  TranscriptInput│────▶│  PromptEditing  │────▶│  ResultsDisplay │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │    Metadata     │
                                               └────────┬────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │  KeywordBubble  │
                                               └─────────────────┘
```

## Extending the Node System

### Adding a Custom Node Type

1. **Create the Node Component**:
   ```jsx
   // src/components/nodes/custom/MyCustomNode.jsx
   import React from 'react';
   
   function MyCustomNode({ data, id, selected }) {
     return (
       <div className={`custom-node ${selected ? 'selected' : ''}`}>
         <div className="node-header">{data.label || 'Custom Node'}</div>
         <div className="node-content">
           {/* Node-specific implementation */}
         </div>
       </div>
     );
   }
   
   export default MyCustomNode;
   ```

2. **Register the Node Type**:
   ```javascript
   // src/components/nodes/index.js
   import MyCustomNode from './custom/MyCustomNode';
   
   registerNodeType({
     type: 'myCustomNode',
     category: 'custom',
     component: MyCustomNode,
     defaults: {
       style: { width: 300, height: 200 },
       data: { label: 'My Custom Node' }
     },
     metadata: {
       description: 'A custom node for special processing',
       icon: 'star'
     }
   });
   ```

3. **Add to the Node Toolbar**:
   ```jsx
   // Update NodesToolbar.jsx to include the new node type
   const nodeCategories = {
     // Existing categories...
     custom: {
       label: 'Custom',
       nodes: ['myCustomNode']
     }
   };
   ```

## Performance Considerations

The node system employs several performance optimizations:

1. **Memoization**: Key components are wrapped with React.memo to prevent unnecessary re-renders
2. **Virtual Rendering**: Only visible nodes are fully rendered
3. **Lazy Connections**: Edge calculations are optimized to minimize re-renders
4. **Debounced Updates**: State updates are debounced to prevent rapid consecutive updates
5. **Background Processing**: Heavy computations run in web workers when possible

## Best Practices

### Node Design:
- Keep nodes focused on a single responsibility
- Provide clear input and output handles
- Use consistent styling and layout within nodes
- Include appropriate validation and error handling

### Flow Layout:
- Organize nodes from left to right for clarity
- Group related nodes together
- Keep connection lines short and clear
- Use node labels to document the workflow

### State Management:
- Prefer Flow Context for node operations
- Use local state for UI-specific concerns
- Lift shared state to appropriate levels
- Optimize render performance with memoization

## Troubleshooting

### Common Issues:

1. **Nodes not connecting**:
   - Check that input/output handles have matching types
   - Verify the connection is from output to input handle

2. **Nodes not processing data**:
   - Inspect the input data being received
   - Check for errors in the node's processing logic
   - Verify all required data properties are present

3. **Layout issues**:
   - Reset zoom using the toolbar controls
   - Use automatic layout feature to reorganize nodes
   - Check for overflow issues in node content

### Debugging Techniques:

1. Enable debug mode via the application settings
2. Check browser console for node-specific warnings
3. Use the Flow Context inspector for state examination
4. Verify data flow through the React DevTools

## Related Documentation

- [Component Documentation](component-documentation): For details on individual node components
- [Architecture Overview](architecture-overview): For understanding how the node system fits into the overall application
- [Custom Hooks](custom-hooks): For information on hooks used by the node system 