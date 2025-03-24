import TranscriptInputNode from './TranscriptInputNode';
import PromptEditingNode from './PromptEditingNode';
import ResultsDisplayNode from './ResultsDisplayNode';
import VideoPlayerNode from './VideoPlayerNode';
import KeywordBubbleNode from './KeywordBubbleNode';
import MapVisualizationNode from './MapVisualizationNode';

// Node types configuration for React Flow
export const nodeTypes = {
  transcriptInput: TranscriptInputNode,
  promptEditing: PromptEditingNode,
  resultsDisplay: ResultsDisplayNode,
  videoPlayer: VideoPlayerNode,
  keywordBubble: KeywordBubbleNode,
  mapVisualization: MapVisualizationNode,
};

// Export individual nodes for direct import
export {
  TranscriptInputNode,
  PromptEditingNode,
  ResultsDisplayNode,
  VideoPlayerNode,
  KeywordBubbleNode,
  MapVisualizationNode,
}; 