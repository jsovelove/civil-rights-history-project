/**
 * Node Type Registry
 * 
 * This file provides a plugin system for registering and managing node types in the React Flow application.
 * It allows for dynamic registration of new node types and provides a centralized registry for all nodes.
 */

// Node type registries by category
const nodeRegistry = {
  input: {},
  processing: {},
  output: {},
  visualization: {},
  media: {},
  other: {} // For any nodes that don't fit into the predefined categories
};

// All registered node types (flattened for React Flow)
let flattenedNodeTypes = {};

/**
 * Register a new node type with the registry
 * 
 * @param {Object} nodePlugin - The node plugin to register
 * @param {string} nodePlugin.type - The unique identifier for this node type
 * @param {string} nodePlugin.category - The category this node belongs to
 * @param {React.Component} nodePlugin.component - The React component for this node
 * @param {Object} nodePlugin.defaults - Default properties for this node type
 * @param {Object} nodePlugin.metadata - Additional metadata about this node type
 * @returns {Object} The updated registry
 */
export function registerNodeType(nodePlugin) {
  const { type, category = 'other', component, defaults = {}, metadata = {} } = nodePlugin;
  
  if (!type || !component) {
    console.error('Node plugin must have a type and component');
    return nodeRegistry;
  }
  
  // Add to the appropriate category
  if (nodeRegistry[category]) {
    nodeRegistry[category][type] = { component, defaults, metadata };
  } else {
    nodeRegistry.other[type] = { component, defaults, metadata };
  }
  
  // Update the flattened node types for React Flow
  flattenedNodeTypes = getFlattenedNodeTypes();
  
  return nodeRegistry;
}

/**
 * Get all registered node types in a flat structure suitable for React Flow
 * 
 * @returns {Object} Flattened node types
 */
export function getFlattenedNodeTypes() {
  const flattened = {};
  
  // Flatten all categories into a single object
  Object.values(nodeRegistry).forEach(category => {
    Object.entries(category).forEach(([type, { component }]) => {
      flattened[type] = component;
    });
  });
  
  return flattened;
}

/**
 * Get the registered node types organized by category
 * 
 * @returns {Object} Node registry by category
 */
export function getNodeRegistry() {
  return nodeRegistry;
}

/**
 * Get default configuration for a node type
 * 
 * @param {string} type - The node type
 * @returns {Object} Default configuration
 */
export function getNodeDefaults(type) {
  // Search through all categories for the node type
  for (const category of Object.values(nodeRegistry)) {
    if (category[type]) {
      return category[type].defaults || {};
    }
  }
  
  return {};
}

/**
 * Create a new node instance with appropriate defaults
 * 
 * @param {string} type - The node type
 * @param {Object} options - Node creation options
 * @param {string} options.id - Unique identifier for the node
 * @param {Object} options.position - Position {x, y} of the node
 * @param {Object} options.data - Data to pass to the node
 * @param {Object} options.style - Custom styles for the node
 * @returns {Object} Node configuration object
 */
export function createNode(type, options = {}) {
  const { id = `${type}-${Date.now()}`, position = { x: 0, y: 0 }, data = {}, style = {} } = options;
  
  // Get default configuration for this node type
  const defaults = getNodeDefaults(type);
  
  // Create the node with defaults
  return {
    id,
    type,
    position,
    data: { ...defaults.data, ...data },
    style: { ...defaults.style, ...style }
  };
}

// Export the flattened node types as the default export (for React Flow)
export default getFlattenedNodeTypes(); 