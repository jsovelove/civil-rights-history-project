import { getNodeDefaults } from '../components/nodes/registry';

/**
 * Create a new node from a node type
 * 
 * @param {string} type - The type of node to create
 * @param {Object} position - Position coordinates {x, y}
 * @param {string} label - Label for the node
 * @param {Object} extraData - Additional data to pass to the node
 * @returns {Object} The new node object
 */
export const createNodeFromType = (type, position, label, extraData = {}) => {
  // Get defaults for this node type
  const defaults = getNodeDefaults(type);
  
  // Create a unique ID
  const id = `${type}-${Date.now()}`;
  
  // Determine width based on node type
  let width = defaults.style?.width || 320;
  
  // Special cases for width based on node type
  switch (type) {
    case 'resultsDisplay':
      width = 560;
      break;
    case 'metadata':
      width = 420;
      break;
    case 'videoPlayer':
      width = 420;
      break;
    case 'keywordBubble':
    case 'mapVisualization':
      width = 450;
      break;
    default:
      break;
  }
  
  // Special cases for height
  let height;
  if (type === 'metadata') {
    height = 550;
  }
  
  // Create the node with merged data
  return {
    id,
    type,
    position,
    data: { 
      label: label || defaults.data?.label || type, 
      ...extraData
    },
    style: { 
      width,
      ...(height ? { height } : {}),
      ...defaults.style 
    }
  };
};

/**
 * Create an edge between two nodes
 * 
 * @param {string} sourceId - ID of the source node
 * @param {string} targetId - ID of the target node
 * @param {string} sourceHandle - Optional handle ID on the source node
 * @param {string} targetHandle - Optional handle ID on the target node
 * @returns {Object} The new edge object
 */
export const createEdge = (sourceId, targetId, sourceHandle, targetHandle) => {
  return {
    id: `e${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    sourceHandle,
    targetHandle,
    animated: true,
    type: 'default',
    style: { stroke: '#3b82f6', strokeWidth: 2 }
  };
};

/**
 * Determine if a connection is valid between two nodes
 * 
 * @param {Object} connection - The connection parameters
 * @param {Array} nodes - The current nodes in the flow
 * @returns {boolean} Whether the connection is valid
 */
export const isValidConnection = (connection, nodes) => {
  // Basic validation: all connections are valid
  return true;
};

/**
 * Get default node configuration for a specific node type
 * 
 * @param {string} type - The node type
 * @param {Object} props - Properties to pass to the node
 * @returns {Object} Node configuration
 */
export const getNodeConfig = (type, props = {}) => {
  switch (type) {
    case 'transcriptInput':
      return {
        data: {
          onTranscriptUpload: props.handleTranscriptUpload,
          onAudioUpload: props.handleAudioUpload,
          documentName: props.documentName,
          onDocumentNameChange: props.setDocumentName,
          youtubeUrl: props.youtubeUrl,
          onYoutubeUrlChange: props.setYoutubeUrl,
          onYoutubeUrlSubmit: props.handleYoutubeUrlSubmit
        }
      };
    
    case 'whisperTranscription':
      return {
        data: {
          onQueueUpdate: props.onQueueUpdate,
          onProcessMultiple: props.processMultipleTranscripts || props.processTranscript,
          onSetTranscript: (text, docName) => {
            if (props.setTranscript) {
              props.setTranscript(text);
            }
            if (props.setDocumentName && docName) {
              props.setDocumentName(docName);
            }
          }
        }
      };
    
    case 'promptEditing':
      return {
        data: {
          systemMessage: props.systemMessage,
          onSystemMessageChange: props.setSystemMessage,
          onProcess: props.processTranscript,
          model: props.model,
          onModelChange: props.setModel,
          canProcess: !!props.transcript
        }
      };
    
    case 'resultsDisplay':
      return {
        type,
        data: {
          label: 'Results Display',
          documentName: props.documentName || '',
          summaries: props.summaries || { overallSummary: '', keyPoints: [] },
          onSummaryChange: props.handleSummaryChange,
          onKeyPointChange: props.handleKeyPointChange,
          onAddKeyPoint: props.handleAddKeyPoint,
          onRemoveKeyPoint: props.handleRemoveKeyPoint,
          onEditSummary: props.handleEditSummary,
          onSaveToDatabase: props.handleSaveToDatabase,
          savingToDatabase: props.savingToDatabase || false,
          savedToDatabase: props.savedToDatabase || false,
          youtubeEmbedUrl: props.youtubeEmbedUrl || '',
          openVideoPanel: props.openVideoPanel
        }
      };
    
    case 'videoPlayer':
      return {
        data: {
          youtubeEmbedUrl: props.youtubeEmbedUrl,
          videoRef: props.videoRef,
          currentTimestamp: props.currentTimestamp,
          summaries: props.summaries,
          onUpdateTimestamp: props.setCurrentTimestamp
        }
      };
    
    case 'metadata':
      return {
        data: {
          documentName: props.documentName,
          youtubeUrl: props.youtubeUrl,
          youtubeEmbedUrl: props.youtubeEmbedUrl,
          summaries: props.summaries,
          transcript: props.transcript,
          onSaveToDatabase: props.handleSaveToDatabase,
          savingToDatabase: props.savingToDatabase,
          savedToDatabase: props.savedToDatabase
        }
      };
    
    // Add other node types as needed
    
    default:
      return { data: {} };
  }
}; 