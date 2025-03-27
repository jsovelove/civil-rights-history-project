import { registerNodeType, getFlattenedNodeTypes } from './registry';

// Import node types by category
// Input nodes
import TranscriptInputNode from './input/TranscriptInputNode';

// Processing nodes
import PromptEditingNode from './processing/PromptEditingNode';

// Output nodes
import ResultsDisplayNode from './output/ResultsDisplayNode';

// Media nodes
import VideoPlayerNode from './media/VideoPlayerNode';

// Visualization nodes
import KeywordBubbleNode from './visualization/KeywordBubbleNode';
import MapVisualizationNode from './visualization/MapVisualizationNode';

// Other nodes
import MetadataNode from './MetadataNode';

// Register node types with appropriate categories
registerNodeType({
  type: 'transcriptInput',
  category: 'input',
  component: TranscriptInputNode,
  defaults: {
    style: { width: 320 },
    data: { label: 'Transcript Input' }
  },
  metadata: {
    description: 'Node for uploading and processing transcript files',
    icon: 'file-upload'
  }
});

registerNodeType({
  type: 'promptEditing',
  category: 'processing',
  component: PromptEditingNode,
  defaults: {
    style: { width: 320 },
    data: { label: 'Prompt Editing' }
  },
  metadata: {
    description: 'Node for editing system prompts for AI processing',
    icon: 'edit'
  }
});

registerNodeType({
  type: 'resultsDisplay',
  category: 'output',
  component: ResultsDisplayNode,
  defaults: {
    style: { width: 560 },
    data: { label: 'Results Display' }
  },
  metadata: {
    description: 'Node for displaying processing results',
    icon: 'analytics'
  }
});

registerNodeType({
  type: 'videoPlayer',
  category: 'media',
  component: VideoPlayerNode,
  defaults: {
    style: { width: 420 },
    data: { label: 'Video Player' }
  },
  metadata: {
    description: 'Node for playing video content',
    icon: 'video'
  }
});

registerNodeType({
  type: 'keywordBubble',
  category: 'visualization',
  component: KeywordBubbleNode,
  defaults: {
    style: { width: 400, height: 400 },
    data: { label: 'Keyword Bubble Chart' }
  },
  metadata: {
    description: 'Visualization node for displaying keyword frequency',
    icon: 'bubble-chart'
  }
});

registerNodeType({
  type: 'mapVisualization',
  category: 'visualization',
  component: MapVisualizationNode,
  defaults: {
    style: { width: 400, height: 400 },
    data: { label: 'Location Map' }
  },
  metadata: {
    description: 'Visualization node for displaying geographical information',
    icon: 'map'
  }
});

registerNodeType({
  type: 'metadata',
  category: 'other',
  component: MetadataNode,
  defaults: {
    style: { width: 420, height: 550 },
    data: { label: 'Metadata' }
  },
  metadata: {
    description: 'Node for displaying and managing metadata',
    icon: 'info'
  }
});

// Get all registered node types flattened for React Flow
export const nodeTypes = getFlattenedNodeTypes();

// Log node types for debugging
console.log("Registered node types:", nodeTypes);

// Export individual nodes for direct import
export {
  TranscriptInputNode,
  PromptEditingNode,
  ResultsDisplayNode,
  VideoPlayerNode,
  KeywordBubbleNode,
  MapVisualizationNode,
  MetadataNode
}; 