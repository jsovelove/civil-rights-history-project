import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { FaDatabase, FaCode, FaTable, FaChevronRight, FaChevronDown } from 'react-icons/fa';

/**
 * MetadataNode - Node for displaying transcript metadata as it would appear in Firestore
 */
const MetadataNode = ({ data }) => {
  // State for display mode (JSON or UI)
  const [viewMode, setViewMode] = useState('ui');
  // State for expanded subcollections
  const [isSubcollectionExpanded, setIsSubcollectionExpanded] = useState(false);
  
  // Create a timestamp for the current date/time
  const timestamp = new Date().toISOString();
  
  // Format the metadata object as it would appear in Firestore
  const mainDocument = {
    name: data.documentName || 'Interview Name',
    documentName: data.documentName || 'interview_name',
    created: timestamp,
    updated: timestamp,
    source: data.youtubeUrl ? 'youtube' : 'file_upload',
    videoEmbedLink: data.youtubeEmbedUrl ? data.youtubeEmbedUrl.replace('?enablejsapi=1', '') : null,
    summary: data.summaries?.overallSummary || null,
    userID: 'user_123', // Placeholder for actual user ID
    status: 'processed',
    processingTime: '2.4s',
    wordCount: data.transcript ? data.transcript.split(/\s+/).length : 0,
  };

  // Create a valid Firestore ID from a string
  const createValidId = (text) => {
    if (!text) return `keypoint-${Math.random().toString(36).substring(2, 9)}`;
    
    // Convert to lowercase, replace spaces with underscores, remove special characters
    return text.toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .substring(0, 30); // Limit length
  };

  // Subcollection for key points
  const subSummaries = data.summaries?.keyPoints?.map((point, index) => ({
    id: createValidId(point.topic),
    topic: point.topic,
    summary: point.content || point.summary,
    timestamp: point.timestamp || null,
    keywords: point.keywords || "keywords, civil rights",
  })) || [];

  // Format JSON with indentation for display
  const formattedMainJson = JSON.stringify(mainDocument, null, 2);
  
  // Helper to render firestore-style field value
  const renderFieldValue = (value) => {
    if (value === null) return <span className="text-gray-400">null</span>;
    if (typeof value === 'string') return <span className="text-green-600">"{value}"</span>;
    if (typeof value === 'number') return <span className="text-blue-600">{value}</span>;
    if (typeof value === 'boolean') return <span className="text-purple-600">{value.toString()}</span>;
    if (Array.isArray(value)) return <span className="text-gray-500">Array({value.length})</span>;
    if (typeof value === 'object') return <span className="text-gray-500">Object</span>;
    return String(value);
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4 w-full">
      <Handle 
        type="target" 
        position={Position.Left} 
        id="metadata-input"
        style={{ left: -10, background: '#818cf8', top: '50%', transform: 'translateY(-50%)' }}
      />

      <Handle 
        type="source" 
        position={Position.Right} 
        id="metadata-output"
        style={{ right: -10, background: '#818cf8', top: '50%', transform: 'translateY(-50%)' }}
      />
      
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold flex items-center">
          <FaDatabase className="mr-2 text-indigo-600" />
          Firestore Metadata
        </h3>
        
        <div className="flex items-center gap-2">
          <button 
            className={`p-1.5 rounded ${viewMode === 'json' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}
            onClick={() => setViewMode('json')}
            title="View as JSON"
          >
            <FaCode size={14} />
          </button>
          <button 
            className={`p-1.5 rounded ${viewMode === 'ui' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}
            onClick={() => setViewMode('ui')}
            title="View as UI"
          >
            <FaTable size={14} />
          </button>
        </div>
      </div>
      
      <div className="flex flex-col gap-2">
        {viewMode === 'json' ? (
          // JSON View
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="mb-4">
              <div className="font-semibold mb-2 text-gray-700">
                /interviewSummaries/{mainDocument.documentName}
              </div>
              <pre className="text-sm font-mono text-gray-700 whitespace-pre-wrap">
                {formattedMainJson}
              </pre>
            </div>
            
            <div>
              <div className="font-semibold mb-2 text-gray-700">
                /interviewSummaries/{mainDocument.documentName}/subSummaries/*
              </div>
              <div className="overflow-auto max-h-[350px]">
                {subSummaries.map((subDoc, index) => (
                  <div key={index} className="mb-3 ml-4 pl-2 border-l-2 border-indigo-200">
                    <div className="font-medium text-gray-600 mb-1">
                      Document ID: {subDoc.id}
                    </div>
                    <pre className="text-sm font-mono text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(subDoc, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // UI View - Firestore Console Style
          <div className="rounded-lg border border-gray-200 bg-white text-sm">
            <div className="flex flex-col">
              {/* Document ID Row */}
              <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center text-gray-800 font-semibold">
                <div className="flex items-center">
                  <FaDatabase className="mr-2 text-indigo-600" size={14} />
                  <span className="font-mono">/interviewSummaries/{mainDocument.documentName || 'document-id'}</span>
                </div>
              </div>
              
              {/* Basic Metadata Fields */}
              {Object.entries(mainDocument).map(([key, value]) => (
                <div key={key} className="px-3 py-2 border-b border-gray-200 flex items-start hover:bg-gray-50">
                  <div className="w-1/3 font-medium text-gray-700">{key}</div>
                  <div className="w-2/3 font-mono">{renderFieldValue(value)}</div>
                </div>
              ))}
              
              {/* Subcollections Header */}
              <div 
                className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center hover:bg-gray-100 cursor-pointer"
                onClick={() => setIsSubcollectionExpanded(!isSubcollectionExpanded)}
              >
                <div className="flex items-center font-medium text-gray-700">
                  {isSubcollectionExpanded ? <FaChevronDown size={12} className="mr-2" /> : <FaChevronRight size={12} className="mr-2" />}
                  Subcollections
                </div>
              </div>
              
              {/* Subcollection: subSummaries */}
              {isSubcollectionExpanded && (
                <div className="pl-6 pr-3 py-2 border-b border-gray-200 bg-blue-50 hover:bg-blue-100">
                  <div className="flex items-center text-blue-700 font-medium mb-1">
                    <FaDatabase className="mr-2" size={12} /> 
                    subSummaries ({subSummaries.length} documents)
                  </div>
                  
                  {/* Display subcollection documents with scrolling */}
                  {subSummaries.length > 0 && (
                    <div className="ml-4 mt-2 overflow-auto max-h-[350px]">
                      {subSummaries.map((doc, idx) => (
                        <div key={idx} className="bg-white rounded-md p-2 mb-2 border border-blue-200">
                          <div className="text-xs text-gray-500 mb-1">ID: {doc.id}</div>
                          <div className="grid grid-cols-2 gap-1">
                            <div className="text-xs font-medium text-gray-700">topic</div>
                            <div className="text-xs font-mono text-green-600">"{doc.topic}"</div>
                            
                            <div className="text-xs font-medium text-gray-700">timestamp</div>
                            <div className="text-xs font-mono">
                              {doc.timestamp ? 
                                <span className="text-green-600">"{doc.timestamp}"</span> : 
                                <span className="text-gray-400">null</span>
                              }
                            </div>
                            
                            <div className="text-xs font-medium text-gray-700">keywords</div>
                            <div className="text-xs font-mono text-green-600">"{doc.keywords}"</div>
                            
                            <div className="text-xs font-medium text-gray-700">summary</div>
                            <div className="text-xs font-mono text-green-600">
                              "{doc.summary?.length > 30 ? doc.summary.substring(0, 30) + '...' : doc.summary}"
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
          <span>Collection: <span className="font-mono">/interviewSummaries</span></span>
          <span>Size: {new TextEncoder().encode(formattedMainJson).length} bytes</span>
        </div>
        
        {data.savedToDatabase && (
          <div className="mt-2 p-2 bg-green-50 text-green-700 rounded-md text-sm">
            ✓ Saved to Firestore
          </div>
        )}
      </div>
    </div>
  );
};

export default MetadataNode; 