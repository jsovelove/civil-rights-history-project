import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  useReactFlow
} from 'reactflow';
import useFlowLayout from '../hooks/useFlowLayout';
import { getNodeDefaults, createNode } from '../components/nodes/registry';
import { initializeEdgeTypes, createEdge, getEdgeTypes } from '../utils/edgeUtils';

// Create the context
const FlowContext = createContext(null);

/**
 * Hook to use the Flow context
 * 
 * @returns {Object} Flow context
 */
export const useFlow = () => {
  const context = useContext(FlowContext);
  if (!context) {
    throw new Error('useFlow must be used within a FlowProvider');
  }
  return context;
};

/**
 * Flow Provider component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {Object} props.edgeComponents - Edge components from React Flow
 * @param {Object} props.defaultLayout - Default layout to use
 * @returns {React.ReactElement} Provider component
 */
export const FlowProvider = ({ children, edgeComponents, defaultLayout }) => {
  // Setup nodes and edges state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Setup selected nodes state
  const [selectedNodes, setSelectedNodes] = useState([]);
  
  // Get flow layout utilities
  const flowLayout = useFlowLayout({ defaultLayout });

  // Initialize edge types
  useEffect(() => {
    if (edgeComponents) {
      console.log("FlowProvider: Initializing edge types with components:", edgeComponents);
      try {
        initializeEdgeTypes(edgeComponents);
        console.log("FlowProvider: Edge types initialized successfully");
      } catch (error) {
        console.error("FlowProvider: Error initializing edge types:", error);
      }
    } else {
      console.warn("FlowProvider: No edge components provided for initialization");
    }
  }, [edgeComponents]);

  // Connect two nodes with an edge
  const connectNodes = useCallback((params) => {
    setEdges((eds) => addEdge(
      {
        ...params,
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      },
      eds
    ));
  }, [setEdges]);

  // Handler for node selection
  const onSelectionChange = useCallback((params) => {
    setSelectedNodes(params.nodes || []);
  }, []);

  // Add a new node to the flow
  const addNode = useCallback((type, position, data = {}, style = {}) => {
    const newNode = createNode(type, { position, data, style });
    setNodes((nds) => [...nds, newNode]);
    return newNode.id;
  }, [setNodes]);

  // Remove a node and its connections
  const removeNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter(
      (edge) => edge.source !== nodeId && edge.target !== nodeId
    ));
  }, [setNodes, setEdges]);

  // Add an edge between nodes
  const addEdge = useCallback((sourceId, targetId, sourceHandle, targetHandle, style = 'default') => {
    const newEdge = createEdge({
      source: sourceId,
      target: targetId,
      sourceHandle,
      targetHandle,
      style
    });
    
    setEdges((eds) => [...eds, newEdge]);
    return newEdge.id;
  }, [setEdges]);

  // Remove an edge
  const removeEdge = useCallback((edgeId) => {
    setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
  }, [setEdges]);

  // Update node data
  const updateNodeData = useCallback((nodeId, data) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, ...data }
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Load a layout
  const loadLayoutToFlow = useCallback((layoutName) => {
    const layout = flowLayout.loadLayout(layoutName);
    if (layout) {
      setNodes(layout.nodes || []);
      setEdges(layout.edges || []);
      return true;
    }
    return false;
  }, [flowLayout, setNodes, setEdges]);

  // Save the current layout
  const saveFlowLayout = useCallback((layoutName) => {
    return flowLayout.saveLayout(nodes, edges, layoutName);
  }, [flowLayout, nodes, edges]);

  // Apply a layout template
  const applyTemplate = useCallback((templateName) => {
    const template = flowLayout.getTemplateLayout(templateName);
    if (template) {
      setNodes(template.nodes || []);
      setEdges(template.edges || []);
      return true;
    }
    return false;
  }, [flowLayout, setNodes, setEdges]);

  // Context value
  const value = {
    // Flow elements
    nodes,
    edges,
    selectedNodes,
    
    // Node operations
    setNodes,
    onNodesChange,
    addNode,
    removeNode,
    updateNodeData,
    
    // Edge operations
    setEdges,
    onEdgesChange,
    connectNodes,
    addEdge,
    removeEdge,
    
    // Selection handling
    onSelectionChange,
    
    // Layout management
    layouts: flowLayout.layouts,
    activeLayout: flowLayout.activeLayout,
    loadLayout: loadLayoutToFlow,
    saveLayout: saveFlowLayout,
    deleteLayout: flowLayout.deleteLayout,
    applyTemplate,
    getTemplateLayout: flowLayout.getTemplateLayout,
    
    // Utility functions
    getEdgeTypes
  };

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
};

/**
 * Wrapper component that combines ReactFlowProvider with FlowProvider
 * 
 * @param {Object} props - Component props
 * @returns {React.ReactElement} Combined provider
 */
export const FlowProviderWithReactFlow = (props) => {
  return (
    <ReactFlowProvider>
      <FlowInnerProvider {...props} />
    </ReactFlowProvider>
  );
};

/**
 * Inner provider that uses the ReactFlow instance
 * 
 * @param {Object} props - Component props
 * @returns {React.ReactElement} Provider with ReactFlow instance
 */
const FlowInnerProvider = (props) => {
  const { children, ...rest } = props;
  
  console.log("FlowInnerProvider: Getting ReactFlow instance");
  let reactFlowInstance;
  
  try {
    reactFlowInstance = useReactFlow();
    console.log("FlowInnerProvider: ReactFlow instance obtained successfully");
  } catch (error) {
    console.error("FlowInnerProvider: Error getting ReactFlow instance:", error);
    // Provide a fallback instance
    reactFlowInstance = {
      project: (pos) => pos,
      viewportToScreen: (pos) => pos,
      screenToViewport: (pos) => pos,
      screenToFlowPosition: (pos) => pos
    };
  }
  
  return (
    <FlowProvider {...rest} reactFlowInstance={reactFlowInstance}>
      {children}
    </FlowProvider>
  );
};

export default FlowProviderWithReactFlow; 