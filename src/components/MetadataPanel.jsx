import React, { useState } from 'react';
import { doc, updateDoc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';

const MetadataPanel = ({ metadata, onMetadataUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMetadata, setEditedMetadata] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  if (!metadata) return null;
  
  // Initialize edited metadata when entering edit mode
  const handleEditClick = () => {
    setEditedMetadata({...metadata});
    setIsEditing(true);
    setSaveError(null);
    setSaveSuccess(false);
  };
  
  // Handle field value changes
  const handleFieldChange = (fieldName, newValue) => {
    setEditedMetadata(prev => ({
      ...prev,
      [fieldName]: newValue
    }));
  };
  
  // Save changes to Firebase
  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);
      
      // Determine the document reference path based on the document structure
      // Main interview document or subsummary document
      let docRef;
      if (metadata.documentName && metadata.id) {
        // This is a subsummary document
        docRef = doc(db, "interviewSummaries", metadata.documentName, "subSummaries", metadata.id);
      } else {
        console.error("Unable to determine document path");
        setSaveError("Unable to determine document path for saving");
        setIsSaving(false);
        return;
      }
      
      // Create a clean version of the data to update
      // Remove any fields that should not be updated
      const updateData = {...editedMetadata};
      delete updateData.id; // Don't update the ID
      delete updateData.documentName; // Don't update the document name reference
      
      // Update the document in Firebase
      await updateDoc(docRef, updateData);
      
      // Update the local state to reflect changes
      if (onMetadataUpdate) {
        onMetadataUpdate(editedMetadata);
      }
      
      setSaveSuccess(true);
      setIsSaving(false);
      
      // Exit edit mode after successful save
      setTimeout(() => {
        setIsEditing(false);
        setSaveSuccess(false);
      }, 1500);
      
    } catch (error) {
      console.error("Error updating document:", error);
      setSaveError(`Error saving changes: ${error.message}`);
      setIsSaving(false);
    }
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedMetadata({});
    setSaveError(null);
    setSaveSuccess(false);
  };
  
  // Filter out large text fields that are already displayed elsewhere
  const excludedFields = ['summary'];
  
  // Get all metadata keys
  const metadataKeys = Object.keys(metadata).filter(key => 
    !excludedFields.includes(key) && metadata[key] !== undefined
  );
  
  // Determine which fields are editable
  const nonEditableFields = ['id', 'documentName', 'createdAt', 'updatedAt'];
  const isFieldEditable = (fieldName) => !nonEditableFields.includes(fieldName);
  
  // Render an editable field
  const renderEditableField = (fieldName, value) => {
    const isEditable = isFieldEditable(fieldName);
    
    // Handle different field types appropriately
    if (typeof value === 'boolean') {
      return (
        <select
          disabled={!isEditable}
          value={editedMetadata[fieldName].toString()}
          onChange={(e) => handleFieldChange(fieldName, e.target.value === 'true')}
          className={`w-full px-2 py-1 text-sm border rounded ${!isEditable ? 'bg-gray-100' : 'border-blue-300'}`}
        >
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    } else if (typeof value === 'number') {
      return (
        <input
          type="number"
          disabled={!isEditable}
          value={editedMetadata[fieldName]}
          onChange={(e) => handleFieldChange(fieldName, Number(e.target.value))}
          className={`w-full px-2 py-1 text-sm border rounded ${!isEditable ? 'bg-gray-100' : 'border-blue-300'}`}
        />
      );
    } else if (typeof value === 'object') {
      // For objects, show as JSON but not editable
      return (
        <textarea
          disabled={true}
          value={JSON.stringify(value, null, 2)}
          className="w-full px-2 py-1 text-sm border rounded bg-gray-100"
          rows={3}
        />
      );
    } else {
      // For strings and other types
      return (
        <input
          type="text"
          disabled={!isEditable}
          value={editedMetadata[fieldName] || ""}
          onChange={(e) => handleFieldChange(fieldName, e.target.value)}
          className={`w-full px-2 py-1 text-sm border rounded ${!isEditable ? 'bg-gray-100' : 'border-blue-300'}`}
        />
      );
    }
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-800">
          Clip Metadata
        </h3>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <button 
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors disabled:bg-blue-300"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button 
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="px-3 py-1 bg-gray-200 text-gray-800 text-sm font-medium rounded hover:bg-gray-300 transition-colors disabled:bg-gray-100"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={handleEditClick}
                className="px-3 py-1 bg-gray-100 text-blue-600 hover:bg-gray-200 text-sm font-medium rounded transition-colors"
              >
                Edit
              </button>
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {isExpanded ? 'Show Less' : 'Show All'}
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Success/Error messages */}
      {saveSuccess && (
        <div className="mb-3 p-2 bg-green-100 text-green-800 text-sm rounded">
          Changes saved successfully
        </div>
      )}
      
      {saveError && (
        <div className="mb-3 p-2 bg-red-100 text-red-800 text-sm rounded">
          {saveError}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        {/* Always show these important fields */}
        {['id', 'documentName', 'timestamp', 'keywords'].map(key => (
          metadata[key] && (
            <div key={key} className="mb-2">
              <span className="block text-sm font-medium text-gray-500">{key}:</span>
              {isEditing ? (
                renderEditableField(key, metadata[key])
              ) : (
                <span className="block text-sm text-gray-800 break-words">
                  {typeof metadata[key] === 'object' 
                    ? JSON.stringify(metadata[key]) 
                    : String(metadata[key])}
                </span>
              )}
            </div>
          )
        ))}
      </div>
      
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4">
            {metadataKeys
              .filter(key => !['id', 'documentName', 'timestamp', 'keywords'].includes(key))
              .map(key => (
                <div key={key} className="mb-2">
                  <span className="block text-sm font-medium text-gray-500">{key}:</span>
                  {isEditing ? (
                    renderEditableField(key, metadata[key])
                  ) : (
                    <span className="block text-sm text-gray-800 break-words">
                      {typeof metadata[key] === 'object' 
                        ? JSON.stringify(metadata[key]) 
                        : String(metadata[key])}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MetadataPanel;