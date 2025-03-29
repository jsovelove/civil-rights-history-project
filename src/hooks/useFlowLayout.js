import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for managing ReactFlow layouts
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.storageKey - Key for localStorage (default: 'flow_layout')
 * @param {Object} options.defaultLayout - Default layout to use if none in storage
 * @returns {Object} Layout management utilities
 */
const useFlowLayout = (options = {}) => {
  const {
    storageKey = 'flow_layout',
    defaultLayout = null
  } = options;

  // State for available layouts
  const [layouts, setLayouts] = useState(() => {
    // Initialize with saved layouts from localStorage
    const savedLayouts = localStorage.getItem(`${storageKey}_registry`);
    return savedLayouts ? JSON.parse(savedLayouts) : {
      default: { name: 'Default', description: 'Default layout' }
    };
  });

  // Current active layout name
  const [activeLayout, setActiveLayout] = useState('default');

  // Function to save the current layout
  const saveLayout = useCallback((nodes, edges, name = null) => {
    try {
      const layoutName = name || activeLayout;
      
      // Extract the essential parts of nodes and edges
      const layoutData = {
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          style: node.style,
          // For visualization nodes, flag them appropriately
          ...(node.id.startsWith('viz-') ? { isVisualization: true } : {})
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          animated: edge.animated,
          type: edge.type,
          style: edge.style
        }))
      };
      
      // Save to localStorage
      localStorage.setItem(`${storageKey}_${layoutName}`, JSON.stringify(layoutData));
      
      // Update layouts registry if creating a new layout
      if (!layouts[layoutName]) {
        const updatedLayouts = {
          ...layouts,
          [layoutName]: { 
            name: layoutName,
            description: `Layout saved at ${new Date().toLocaleString()}`,
            created: new Date().toISOString()
          }
        };
        setLayouts(updatedLayouts);
        localStorage.setItem(`${storageKey}_registry`, JSON.stringify(updatedLayouts));
      }
      
      return true;
    } catch (error) {
      console.error('Error saving layout:', error);
      return false; 
    }
  }, [activeLayout, layouts, storageKey]);

  // Function to load a specific layout
  const loadLayout = useCallback((name = 'default') => {
    try {
      const savedLayout = localStorage.getItem(`${storageKey}_${name}`);
      
      if (!savedLayout) {
        return defaultLayout;
      }
      
      const layoutData = JSON.parse(savedLayout);
      setActiveLayout(name);
      
      return layoutData;
    } catch (error) {
      console.error(`Error loading layout "${name}":`, error);
      return defaultLayout;
    }
  }, [storageKey, defaultLayout]);

  // Function to delete a layout
  const deleteLayout = useCallback((name) => {
    // Don't allow deleting the default layout
    if (name === 'default') {
      return false;
    }
    
    try {
      // Remove from localStorage
      localStorage.removeItem(`${storageKey}_${name}`);
      
      // Update the layouts registry
      const updatedLayouts = { ...layouts };
      delete updatedLayouts[name];
      
      setLayouts(updatedLayouts);
      localStorage.setItem(`${storageKey}_registry`, JSON.stringify(updatedLayouts));
      
      // If the active layout was deleted, switch to default
      if (activeLayout === name) {
        setActiveLayout('default');
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting layout "${name}":`, error);
      return false;
    }
  }, [activeLayout, layouts, storageKey]);

  // Function to create a new layout by copying an existing one
  const createLayoutFrom = useCallback((baseName = activeLayout, newName) => {
    if (!newName || layouts[newName]) {
      return false;
    }
    
    try {
      const baseLayout = loadLayout(baseName);
      if (!baseLayout) {
        return false;
      }
      
      // Save with the new name
      localStorage.setItem(`${storageKey}_${newName}`, JSON.stringify(baseLayout));
      
      // Update layouts registry
      const updatedLayouts = {
        ...layouts,
        [newName]: {
          name: newName,
          description: `Copy of ${layouts[baseName]?.name || baseName}`,
          created: new Date().toISOString(),
          basedOn: baseName
        }
      };
      
      setLayouts(updatedLayouts);
      localStorage.setItem(`${storageKey}_registry`, JSON.stringify(updatedLayouts));
      
      return true;
    } catch (error) {
      console.error(`Error creating layout from "${baseName}":`, error);
      return false;
    }
  }, [activeLayout, layouts, loadLayout, storageKey]);

  // Template layouts for common use cases
  const getTemplateLayout = useCallback((templateName) => {
    const templates = {
      simple: {
        name: 'Simple Pipeline',
        nodes: [
          { id: '1', type: 'transcriptInput', position: { x: 100, y: 100 } },
          { id: '2', type: 'promptEditing', position: { x: 100, y: 300 } },
          { id: '3', type: 'resultsDisplay', position: { x: 400, y: 100 } }
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2', sourceHandle: 'transcript-output', targetHandle: 'prompt-left-input' },
          { id: 'e2-3', source: '2', target: '3', sourceHandle: 'prompt-output', targetHandle: 'results-left-input' }
        ]
      },
      interview: {
        name: 'Interview Analysis',
        nodes: [
          { id: '1', type: 'transcriptInput', position: { x: 100, y: 100 }, style: { width: 320 } },
          { id: '2', type: 'promptEditing', position: { x: 100, y: 300 }, style: { width: 320 } },
          { id: '3', type: 'resultsDisplay', position: { x: 400, y: 100 }, style: { width: 670 } },
          { id: '4', type: 'videoPlayer', position: { x: 400, y: 300 }, style: { width: 420 } },
          { id: '5', type: 'metadata', position: { x: 700, y: 500 }, style: { width: 420, height: 550 } }
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2', sourceHandle: 'transcript-output', targetHandle: 'prompt-left-input' },
          { id: 'e2-3', source: '2', target: '3', sourceHandle: 'prompt-output', targetHandle: 'results-left-input' },
          { id: 'e4-3', source: '4', target: '3', sourceHandle: 'video-output', targetHandle: 'results-input' },
          { id: 'e3-5', source: '3', target: '5', sourceHandle: 'results-output', targetHandle: 'metadata-input' }
        ]
      },
      visualization: {
        name: 'Data Visualization',
        nodes: [
          { id: '1', type: 'transcriptInput', position: { x: 100, y: 100 }, style: { width: 320 } },
          { id: '2', type: 'promptEditing', position: { x: 100, y: 300 }, style: { width: 320 } },
          { id: '3', type: 'resultsDisplay', position: { x: 400, y: 200 }, style: { width: 560 } },
          { id: 'viz1', type: 'keywordBubble', position: { x: 700, y: 100 }, style: { width: 400, height: 400 }, isVisualization: true },
          { id: 'viz2', type: 'mapVisualization', position: { x: 700, y: 350 }, style: { width: 400, height: 400 }, isVisualization: true }
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2', sourceHandle: 'transcript-output', targetHandle: 'prompt-left-input' },
          { id: 'e2-3', source: '2', target: '3', sourceHandle: 'prompt-output', targetHandle: 'results-left-input' },
          { id: 'e3-viz1', source: '3', target: 'viz1', sourceHandle: 'results-output', targetHandle: 'viz-input' },
          { id: 'e3-viz2', source: '3', target: 'viz2', sourceHandle: 'results-output', targetHandle: 'viz-input' }
        ]
      }
    };
    
    return templates[templateName] || templates.simple;
  }, []);

  // Returns all layout management functions and state
  return {
    layouts,
    activeLayout,
    setActiveLayout,
    saveLayout,
    loadLayout,
    deleteLayout,
    createLayoutFrom,
    getTemplateLayout
  };
};

export default useFlowLayout; 