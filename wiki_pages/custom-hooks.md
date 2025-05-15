# Custom Hooks Documentation

This document provides comprehensive documentation for custom hooks used throughout the Civil Rights History Project application.

## Overview

The application uses a variety of custom React hooks to manage state, handle side effects, and provide reusable functionality. These hooks promote code reuse, separation of concerns, and cleaner component logic.

| Hook | Purpose |
|------|---------|
| `useTranscriptData` | Manages transcript data with local storage persistence |
| `useLocalStorage` | Provides persistent state with localStorage |
| `useFlowLayout` | Manages flow layouts for the node-based interface |
| `useDragAndDrop` | Handles drag and drop operations in React Flow |
| `useNodeDragAndDrop` | Specialized drag and drop for node creation |
| `useAuth` | Manages authentication state and operations |

## Data Management Hooks

### `useTranscriptData`

Located in `src/hooks/useTranscriptData.js`, this hook manages the state for transcript processing.

```javascript
const useTranscriptData = () => {
  // Hook implementation...
  
  return {
    transcript, setTranscript,
    audioUrl, setAudioUrl,
    summaries, setSummaries,
    documentName, setDocumentName,
    systemMessage, setSystemMessage,
    savedToDatabase, setSavedToDatabase,
    youtubeUrl, setYoutubeUrl,
    youtubeEmbedUrl, setYoutubeEmbedUrl,
    currentTimestamp, setCurrentTimestamp,
    savingToDatabase, setSavingToDatabase,
    model, setModel,
    handleSummaryChange,
    handleEditSummary,
    handleKeyPointChange,
    handleAddKeyPoint,
    handleRemoveKeyPoint,
    handleYoutubeUrlSubmit,
    jumpToTimestamp,
    handleTranscriptUpload,
    // Additional methods...
  };
};
```

**Key Features:**
- Persists transcript data in localStorage
- Manages YouTube URL processing and embedding
- Handles timestamp navigation
- Provides methods for modifying summaries and key points
- Implements default system message for OpenAI API
- Manages file uploads and processing

**Usage Example:**

```javascript
import useTranscriptData from '../hooks/useTranscriptData';

function TranscriptProcessor() {
  const {
    transcript,
    summaries,
    systemMessage,
    setSystemMessage,
    handleTranscriptUpload,
    handleSummaryChange
  } = useTranscriptData();
  
  return (
    <div>
      {/* Component implementation using the hook */}
    </div>
  );
}
```

### `useLocalStorage`

Located in `src/hooks/useLocalStorage.js`, this hook provides state persistence with localStorage.

```javascript
const useLocalStorage = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      const valueToStore = value instanceof Function ? value(value) : value;
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue];
};
```

**Key Features:**
- Works like React's `useState` but persists data in localStorage
- Handles serialization and parsing of JSON data
- Includes comprehensive error handling
- Supports functional updates like useState

**Usage Example:**

```javascript
import useLocalStorage from '../hooks/useLocalStorage';

function SettingsPanel() {
  const [settings, setSettings] = useLocalStorage('user_settings', {
    theme: 'light',
    fontSize: 'medium'
  });
  
  return (
    <div>
      <select 
        value={settings.theme} 
        onChange={(e) => setSettings({...settings, theme: e.target.value})}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
      {/* Additional settings controls */}
    </div>
  );
}
```

## Flow Management Hooks

### `useFlowLayout`

Located in `src/hooks/useFlowLayout.js`, this hook manages layouts for the React Flow interface.

```javascript
const useFlowLayout = (options = {}) => {
  // Hook implementation...
  
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
```

**Key Features:**
- Saves and loads flow layouts to/from localStorage
- Maintains a registry of available layouts
- Provides template layouts for common use cases
- Allows copying and modifying existing layouts
- Handles layout switching

**Usage Example:**

```javascript
import useFlowLayout from '../hooks/useFlowLayout';

function FlowEditor() {
  const { 
    layouts, 
    activeLayout, 
    saveLayout, 
    loadLayout, 
    getTemplateLayout 
  } = useFlowLayout();
  
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  
  const handleSave = () => {
    saveLayout(nodes, edges, 'my-layout');
  };
  
  const handleLoad = (layoutName) => {
    const layout = loadLayout(layoutName);
    if (layout) {
      setNodes(layout.nodes);
      setEdges(layout.edges);
    }
  };
  
  const applyTemplate = (templateName) => {
    const template = getTemplateLayout(templateName);
    if (template) {
      setNodes(template.nodes);
      setEdges(template.edges);
    }
  };
  
  return (
    <div>
      {/* Flow editor implementation */}
    </div>
  );
}
```

### `useDragAndDrop`

Located in `src/hooks/useDragAndDrop.js`, this hook provides drag and drop functionality for the flow interface.

```javascript
const useDragAndDrop = (options = {}) => {
  // Hook implementation...
  
  return {
    isDragging,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop
  };
};
```

**Key Features:**
- Handles drag and drop events for React Flow
- Manages dragging state
- Creates new nodes at drop positions
- Passes data to new nodes (e.g., summaries)
- Works with the Flow context

**Usage Example:**

```javascript
import useDragAndDrop from '../hooks/useDragAndDrop';

function NodePalette({ summaries }) {
  const { 
    isDragging, 
    onDragStart, 
    onDragEnd 
  } = useDragAndDrop({ summaries });
  
  return (
    <div className={`node-palette ${isDragging ? 'dragging' : ''}`}>
      <div 
        className="node-item" 
        draggable 
        data-node-type="visualization" 
        data-node-label="Keyword Bubble"
        onDragStart={(e) => onDragStart(e, 'keywordBubble')}
        onDragEnd={onDragEnd}
      >
        Keyword Bubble
      </div>
      {/* Additional draggable items */}
    </div>
  );
}
```

### `useNodeDragAndDrop`

Located in `src/hooks/useNodeDragAndDrop.js`, this hook is specifically designed for node creation and placement.

```javascript
const useNodeDragAndDrop = (options = {}) => {
  // Hook implementation...
  
  return {
    isDragging,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop
  };
};
```

**Key Features:**
- More specialized than the general `useDragAndDrop` hook
- Creates nodes with precise positioning
- Works directly with node creation functions
- Handles data transfer for node placement

**Usage Example:**

```javascript
import useNodeDragAndDrop from '../hooks/useNodeDragAndDrop';
import { createNodeFromType } from '../utils/nodeUtils';

function FlowCanvas() {
  const [nodes, setNodes] = useState([]);
  
  const { 
    onDragOver, 
    onDrop 
  } = useNodeDragAndDrop({
    onNodesChange: setNodes,
    createNodeFromType
  });
  
  return (
    <div 
      className="flow-canvas" 
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Flow canvas implementation */}
    </div>
  );
}
```

## Authentication Hook

### `useAuth`

Located in `src/contexts/AuthContext.jsx`, this hook provides authentication functionality.

```javascript
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

**Key Features:**
- Provides access to the current user
- Handles login and logout operations
- Manages authentication loading state
- Tracks authentication errors
- Uses Firebase authentication under the hood

**Usage Example:**

```javascript
import { useAuth } from '../contexts/AuthContext';

function Header() {
  const { user, loading, error, logout, isAuthenticated } = useAuth();
  
  return (
    <header>
      {loading ? (
        <div>Loading...</div>
      ) : isAuthenticated ? (
        <div>
          <span>Welcome, {user.email}</span>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button>Login</button>
      )}
      {error && <div className="error">{error}</div>}
    </header>
  );
}
```

## Best Practices

When using and creating custom hooks in this application:

1. **Separation of Concerns**: Keep each hook focused on a specific responsibility.

2. **Error Handling**: Include robust error handling in hooks that interact with external services.

3. **Default Values**: Provide sensible defaults to make hooks more flexible.

4. **Documentation**: Keep JSDoc comments up-to-date to explain parameters and return values.

5. **Composition**: Compose hooks together rather than creating monolithic hooks.

## Creating New Hooks

To create a new custom hook for the application:

1. Create a new file in the `src/hooks` directory with the naming convention `useHookName.js`

2. Implement the hook following React's rules for custom hooks:
   - The function name must start with "use"
   - The hook can call other hooks
   - The hook should return values (state, functions) to be used by components

3. Add comprehensive error handling and documentation

4. Export the hook as the default export

Example template:

```javascript
import { useState, useEffect } from 'react';

/**
 * Custom hook description
 * 
 * @param {Object} options - Hook options
 * @returns {Object} Hook return values
 */
const useNewHook = (options = {}) => {
  // State and other hook calls
  const [state, setState] = useState(initialState);
  
  // Effects
  useEffect(() => {
    // Effect implementation
    
    return () => {
      // Cleanup
    };
  }, [dependencies]);
  
  // Functions
  const handleSomething = () => {
    // Implementation
  };
  
  // Return values
  return {
    state,
    handleSomething
  };
};

export default useNewHook;
```

## Related Documentation

- [Component Documentation](component-documentation): How components use these hooks
- [Context API](context-api): How hooks interact with application contexts
- [Firebase Integration](firebase-integration): Details on authentication hooks
- [Node System Documentation](node-system): How flow hooks support the node system 