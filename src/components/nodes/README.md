# React Flow Node Architecture

This directory contains the node components used in the React Flow graph for the interview transcript processing application.

## Directory Structure

The nodes are organized by category for better maintainability and scalability:

```
src/components/nodes/
├── input/             # Input nodes for data ingestion
│   └── TranscriptInputNode.jsx
├── processing/        # Processing nodes for data transformation
│   └── PromptEditingNode.jsx
├── output/            # Output nodes for result display
│   └── ResultsDisplayNode.jsx
├── visualization/     # Visualization nodes for data representation
│   ├── KeywordBubbleNode.jsx
│   └── MapVisualizationNode.jsx
├── media/             # Media player nodes
│   └── VideoPlayerNode.jsx
├── index.js           # Main export file for all nodes
├── registry.js        # Node registry system
└── MetadataNode.jsx   # Metadata node (general purpose)
```

## Node Registry

The application uses a registry system for node types, allowing for dynamic registration and management of nodes. This makes it easy to add new node types without modifying existing code.

### How to Register a Node

```javascript
import { registerNodeType } from './registry';

registerNodeType({
  type: 'myCustomNode',           // Unique identifier for the node type
  category: 'processing',         // Category the node belongs to
  component: MyCustomNodeComponent, // React component for the node
  defaults: {                     // Default properties
    style: { width: 320 },
    data: { label: 'My Custom Node' }
  },
  metadata: {                     // Additional metadata
    description: 'A custom node for processing data',
    icon: 'custom-icon'
  }
});
```

### Creating New Nodes

To create a new node:

1. Create a React component in the appropriate category directory
2. Register the node in `index.js` using `registerNodeType`
3. The node will be automatically available in the flow editor

## Edge Handling

Edge styling and creation are handled in `src/utils/edgeUtils.js`, which provides consistent edge styles and utilities for creating connections between nodes.

## Layout Management

The application includes a layout management system that allows users to:

- Save and load layouts
- Apply predefined layout templates
- Customize node positions and connections

## Flow Context

The application uses a React context (`FlowContext`) to manage ReactFlow state, providing a cleaner separation between flow management and business logic.

To access the flow context in a component:

```javascript
import { useFlow } from '../../contexts/FlowContext';

function MyComponent() {
  const { 
    nodes, 
    edges, 
    addNode, 
    connectNodes, 
    saveLayout 
  } = useFlow();
  
  // Use flow operations here
}
```

## Adding New Node Types

To add a new node type to the application:

1. Create a React component for the node in the appropriate category directory
2. Register the node type in `index.js`
3. Add any specialized handlers or utilities
4. Update any relevant documentation

## Best Practices

- Keep node components focused on presentation, not business logic
- Use the Flow Context for flow-related operations
- Follow consistent styling and component structure
- Add proper JSDoc comments for all exported functions and components 