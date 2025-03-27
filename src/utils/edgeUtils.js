/**
 * Edge Utilities
 * 
 * This file contains utilities for managing edges in React Flow,
 * providing consistent styling, creation helpers, and edge type management.
 */

// Edge style presets
export const edgeStyles = {
  default: { stroke: '#3b82f6', strokeWidth: 2, animated: true },
  data: { stroke: '#3b82f6', strokeWidth: 2, animated: true },
  control: { stroke: '#818cf8', strokeWidth: 2, animated: true },
  media: { stroke: '#ef4444', strokeWidth: 2, animated: true },
  visualization: { stroke: '#10b981', strokeWidth: 2, animated: true },
  inactive: { stroke: '#94a3b8', strokeWidth: 1, animated: false },
  highlighted: { stroke: '#f59e0b', strokeWidth: 3, animated: true }
};

// Edge types registry
const edgeTypeRegistry = {
  bezier: null, // Will be set during initialization
  step: null,
  straight: null,
  custom: {} // For custom edge types
};

/**
 * Initialize edge types with React Flow components
 * 
 * @param {Object} edgeComponents - The edge components from React Flow
 */
export function initializeEdgeTypes(edgeComponents) {
  const { BezierEdge, StraightEdge, StepEdge } = edgeComponents;
  edgeTypeRegistry.bezier = BezierEdge;
  edgeTypeRegistry.step = StepEdge;
  edgeTypeRegistry.straight = StraightEdge;
}

/**
 * Register a custom edge type
 * 
 * @param {string} type - The edge type identifier
 * @param {React.Component} component - The edge component
 */
export function registerEdgeType(type, component) {
  edgeTypeRegistry.custom[type] = component;
}

/**
 * Get all edge types as a flat object for React Flow
 * 
 * @returns {Object} Edge types object
 */
export function getEdgeTypes() {
  return {
    bezier: edgeTypeRegistry.bezier,
    step: edgeTypeRegistry.step,
    straight: edgeTypeRegistry.straight,
    // Add custom edge types
    ...edgeTypeRegistry.custom,
    // Default to bezier
    default: edgeTypeRegistry.bezier
  };
}

/**
 * Create an edge with consistent styling
 * 
 * @param {Object} params - Edge parameters
 * @param {string} params.id - Edge ID
 * @param {string} params.source - Source node ID
 * @param {string} params.target - Target node ID
 * @param {string} params.sourceHandle - Source handle ID
 * @param {string} params.targetHandle - Target handle ID
 * @param {string} params.style - Style preset key or custom style object
 * @param {string} params.type - Edge type (bezier, step, straight)
 * @param {boolean} params.animated - Whether the edge should be animated
 * @returns {Object} Edge configuration
 */
export function createEdge(params) {
  const {
    id = `e${params.source}-${params.target}`,
    source,
    target,
    sourceHandle,
    targetHandle,
    style = 'default',
    type = 'bezier',
    animated = true,
    label,
    data = {}
  } = params;

  // Get the style preset if a string is provided, otherwise use the object
  const styleConfig = typeof style === 'string'
    ? edgeStyles[style] || edgeStyles.default
    : style;

  return {
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
    type,
    animated: styleConfig.animated !== undefined ? styleConfig.animated : animated,
    style: {
      ...styleConfig,
      // Ensure these are always included
      strokeWidth: styleConfig.strokeWidth || 2,
      stroke: styleConfig.stroke || '#3b82f6'
    },
    label,
    data
  };
}

/**
 * Creates a set of standard edges for default node connections
 * 
 * @param {Object} options - Options for edge creation
 * @param {Object} options.nodeMap - Map of node IDs to connect
 * @returns {Array} Array of edge objects
 */
export function createDefaultEdges(options = {}) {
  const { nodeMap = {} } = options;
  const edges = [];

  // Add standard connections based on the node map
  if (nodeMap.input && nodeMap.processing) {
    edges.push(createEdge({
      source: nodeMap.input,
      target: nodeMap.processing,
      sourceHandle: 'output',
      targetHandle: 'input',
      style: 'data'
    }));
  }

  if (nodeMap.processing && nodeMap.output) {
    edges.push(createEdge({
      source: nodeMap.processing,
      target: nodeMap.output,
      sourceHandle: 'output',
      targetHandle: 'input',
      style: 'data'
    }));
  }

  if (nodeMap.media && nodeMap.output) {
    edges.push(createEdge({
      source: nodeMap.media,
      target: nodeMap.output,
      sourceHandle: 'output',
      targetHandle: 'media-input',
      style: 'media'
    }));
  }

  if (nodeMap.output && nodeMap.metadata) {
    edges.push(createEdge({
      source: nodeMap.output,
      target: nodeMap.metadata,
      sourceHandle: 'output',
      targetHandle: 'input',
      style: 'control'
    }));
  }

  return edges;
}

/**
 * Apply style to edges based on a filter function
 * 
 * @param {Array} edges - Current edges
 * @param {Function} filterFn - Function to determine which edges to style
 * @param {Object|string} style - Style preset key or custom style object
 * @returns {Array} Updated edges
 */
export function applyEdgeStyle(edges, filterFn, style) {
  const styleConfig = typeof style === 'string'
    ? edgeStyles[style] || edgeStyles.default
    : style;

  return edges.map(edge => {
    if (filterFn(edge)) {
      return {
        ...edge,
        style: {
          ...edge.style,
          ...styleConfig
        },
        animated: styleConfig.animated !== undefined ? styleConfig.animated : edge.animated
      };
    }
    return edge;
  });
}

/**
 * Make edges orthogonal (step-type edges)
 * 
 * @param {Array} nodes - Flow nodes
 * @param {Array} edges - Flow edges
 * @returns {Array} Updated edges with orthogonal style
 */
export function makeEdgesOrthogonal(nodes, edges) {
  return edges.map(edge => {
    // Find source and target nodes
    const sourceNode = nodes.find(node => node.id === edge.source);
    const targetNode = nodes.find(node => node.id === edge.target);
    
    if (sourceNode && targetNode) {
      // Create a new edge with orthogonal routing
      return {
        ...edge,
        type: 'step', // Use step type for orthogonal routing
        style: { 
          ...edge.style,
          // Preserve existing stroke color
          stroke: edge.style?.stroke || '#3b82f6',
          strokeWidth: 2
        }
      };
    }
    return edge;
  });
} 