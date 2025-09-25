/**
 * Migration Validation Service
 * 
 * Tools for validating data consistency during the migration from 
 * interviewSummaries to metadataV2 collection.
 */

import { db } from './firebase.js'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { mapInterviewData, mapSubSummaryData } from './collectionMapper.js'

/**
 * Validate a single interview document across both collections
 * @param {string} documentId - Document ID to validate
 * @returns {Promise<Object>} Validation result
 */
export const validateInterviewMigration = async (documentId) => {
  const result = {
    documentId,
    isValid: true,
    warnings: [],
    errors: [],
    fieldComparisons: {},
    existsInLegacy: false,
    existsInNew: false,
    segmentComparison: {
      legacy: 0,
      new: 0,
      matching: 0,
      missingInNew: [],
      onlyInNew: []
    }
  }

  try {
    // Check existence in both collections
    const legacyDoc = await getDoc(doc(db, 'interviewSummaries', documentId))
    const newDoc = await getDoc(doc(db, 'metadataV2', documentId))

    result.existsInLegacy = legacyDoc.exists()
    result.existsInNew = newDoc.exists()

    if (!result.existsInLegacy && !result.existsInNew) {
      result.errors.push('Document does not exist in either collection')
      result.isValid = false
      return result
    }

    if (!result.existsInNew) {
      result.warnings.push('Document exists in legacy collection but not in metadataV2')
    }

    if (!result.existsInLegacy) {
      result.warnings.push('Document exists in metadataV2 but not in legacy collection')
    }

    // Compare field mappings if both exist
    if (result.existsInLegacy && result.existsInNew) {
      const legacyData = mapInterviewData(
        { id: legacyDoc.id, ...legacyDoc.data() }, 
        'interviewSummaries'
      )
      const newData = mapInterviewData(
        { id: newDoc.id, ...newDoc.data() }, 
        'metadataV2'
      )

      // Compare key fields
      const fieldsToCompare = [
        'documentName', 
        'mainSummary', 
        'role', 
        'videoEmbedLink'
      ]

      for (const field of fieldsToCompare) {
        const legacyValue = legacyData[field] || ''
        const newValue = newData[field] || ''
        const matches = legacyValue === newValue

        result.fieldComparisons[field] = {
          matches,
          legacyValue,
          newValue,
          similarity: calculateSimilarity(legacyValue, newValue)
        }

        if (!matches && field !== 'mainSummary') {
          // Allow mainSummary to be different as it might be enhanced
          result.warnings.push(`Field '${field}' differs between collections`)
        }
      }

      // Validate segments
      await validateSegments(documentId, result)
    }

  } catch (error) {
    result.errors.push(`Validation error: ${error.message}`)
    result.isValid = false
  }

  result.isValid = result.errors.length === 0
  return result
}

/**
 * Validate segments/subsummaries for a document
 * @param {string} documentId - Document ID
 * @param {Object} result - Validation result object to update
 */
async function validateSegments(documentId, result) {
  try {
    // Get segments from both collections
    const legacySegmentsRef = collection(db, 'interviewSummaries', documentId, 'subSummaries')
    const newSegmentsRef = collection(db, 'metadataV2', documentId, 'subSummaries')

    const [legacySnapshot, newSnapshot] = await Promise.all([
      getDocs(legacySegmentsRef),
      getDocs(newSegmentsRef)
    ])

    result.segmentComparison.legacy = legacySnapshot.size
    result.segmentComparison.new = newSnapshot.size

    // Create maps for comparison
    const legacySegments = new Map()
    const newSegments = new Map()

    legacySnapshot.forEach(doc => {
      const data = mapSubSummaryData({ id: doc.id, ...doc.data() }, 'interviewSummaries')
      legacySegments.set(doc.id, data)
    })

    newSnapshot.forEach(doc => {
      const data = mapSubSummaryData({ id: doc.id, ...doc.data() }, 'metadataV2')
      newSegments.set(doc.id, data)
    })

    // Find matching segments
    for (const [segmentId, legacySegment] of legacySegments) {
      if (newSegments.has(segmentId)) {
        result.segmentComparison.matching++
        
        // Compare key fields
        const newSegment = newSegments.get(segmentId)
        const topicMatch = legacySegment.topic === newSegment.topic
        const timestampSimilar = compareTimestamps(legacySegment.timestamp, newSegment.timestamp)
        
        if (!topicMatch) {
          result.warnings.push(`Segment ${segmentId}: topic differs`)
        }
        if (!timestampSimilar) {
          result.warnings.push(`Segment ${segmentId}: timestamp format differs`)
        }
      } else {
        result.segmentComparison.missingInNew.push(segmentId)
      }
    }

    // Find segments only in new collection
    for (const segmentId of newSegments.keys()) {
      if (!legacySegments.has(segmentId)) {
        result.segmentComparison.onlyInNew.push(segmentId)
      }
    }

    // Add warnings for missing segments
    if (result.segmentComparison.missingInNew.length > 0) {
      result.warnings.push(
        `${result.segmentComparison.missingInNew.length} segments missing in metadataV2`
      )
    }

  } catch (error) {
    result.errors.push(`Segment validation error: ${error.message}`)
  }
}

/**
 * Calculate similarity between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity percentage (0-100)
 */
function calculateSimilarity(str1, str2) {
  if (!str1 && !str2) return 100
  if (!str1 || !str2) return 0
  if (str1 === str2) return 100

  // Simple similarity based on common words
  const words1 = str1.toLowerCase().split(/\s+/)
  const words2 = str2.toLowerCase().split(/\s+/)
  const commonWords = words1.filter(word => words2.includes(word))
  
  const totalWords = Math.max(words1.length, words2.length)
  return Math.round((commonWords.length / totalWords) * 100)
}

/**
 * Compare timestamp formats for similarity
 * @param {string} timestamp1 - First timestamp
 * @param {string} timestamp2 - Second timestamp
 * @returns {boolean} Whether timestamps are similar
 */
function compareTimestamps(timestamp1, timestamp2) {
  if (!timestamp1 && !timestamp2) return true
  if (!timestamp1 || !timestamp2) return false
  
  // Extract time parts (ignore formatting differences)
  const extractTimes = (ts) => {
    const match = ts.match(/(\d{1,2}:\d{2}(?::\d{2})?)/g)
    return match || []
  }

  const times1 = extractTimes(timestamp1)
  const times2 = extractTimes(timestamp2)

  return times1.length === times2.length && 
         times1.every((time, index) => {
           const t1 = time.replace(/[:,]/g, '')
           const t2 = (times2[index] || '').replace(/[:,]/g, '')
           return t1.startsWith(t2.substring(0, 4)) || t2.startsWith(t1.substring(0, 4))
         })
}

/**
 * Validate multiple documents in batch
 * @param {Array<string>} documentIds - Array of document IDs to validate
 * @param {Function} progressCallback - Optional progress callback
 * @returns {Promise<Object>} Batch validation result
 */
export const validateBatchMigration = async (documentIds, progressCallback) => {
  const results = {
    totalDocuments: documentIds.length,
    validDocuments: 0,
    documentsWithWarnings: 0,
    documentsWithErrors: 0,
    missingInNew: [],
    onlyInNew: [],
    detailedResults: []
  }

  for (let i = 0; i < documentIds.length; i++) {
    const documentId = documentIds[i]
    
    if (progressCallback) {
      progressCallback({
        current: i + 1,
        total: documentIds.length,
        documentId,
        percentage: Math.round(((i + 1) / documentIds.length) * 100)
      })
    }

    try {
      const validationResult = await validateInterviewMigration(documentId)
      results.detailedResults.push(validationResult)

      if (validationResult.isValid && validationResult.warnings.length === 0) {
        results.validDocuments++
      } else if (validationResult.warnings.length > 0) {
        results.documentsWithWarnings++
      }

      if (validationResult.errors.length > 0) {
        results.documentsWithErrors++
      }

      if (!validationResult.existsInNew) {
        results.missingInNew.push(documentId)
      }

      if (!validationResult.existsInLegacy) {
        results.onlyInNew.push(documentId)
      }

    } catch (error) {
      results.documentsWithErrors++
      results.detailedResults.push({
        documentId,
        isValid: false,
        errors: [`Validation failed: ${error.message}`],
        warnings: []
      })
    }
  }

  return results
}

/**
 * Generate a validation report
 * @param {Object} validationResults - Results from validation
 * @returns {string} Formatted report
 */
export const generateValidationReport = (validationResults) => {
  const { 
    totalDocuments, 
    validDocuments, 
    documentsWithWarnings, 
    documentsWithErrors,
    missingInNew,
    onlyInNew,
    detailedResults 
  } = validationResults

  let report = `
# Migration Validation Report

## Summary
- **Total Documents**: ${totalDocuments}
- **Valid Documents**: ${validDocuments} (${Math.round((validDocuments/totalDocuments)*100)}%)
- **Documents with Warnings**: ${documentsWithWarnings}
- **Documents with Errors**: ${documentsWithErrors}
- **Missing in metadataV2**: ${missingInNew.length}
- **Only in metadataV2**: ${onlyInNew.length}

## Issues Found

### Missing in metadataV2
${missingInNew.length > 0 ? missingInNew.map(id => `- ${id}`).join('\n') : 'None'}

### Only in metadataV2
${onlyInNew.length > 0 ? onlyInNew.map(id => `- ${id}`).join('\n') : 'None'}

### Documents with Errors
`

  const errorsFound = detailedResults.filter(r => r.errors.length > 0)
  if (errorsFound.length > 0) {
    errorsFound.forEach(result => {
      report += `\n#### ${result.documentId}\n`
      result.errors.forEach(error => {
        report += `- ❌ ${error}\n`
      })
    })
  } else {
    report += 'None\n'
  }

  report += '\n### Documents with Warnings\n'
  
  const warningsFound = detailedResults.filter(r => r.warnings.length > 0)
  if (warningsFound.length > 0) {
    warningsFound.slice(0, 10).forEach(result => { // Limit to first 10
      report += `\n#### ${result.documentId}\n`
      result.warnings.forEach(warning => {
        report += `- ⚠️ ${warning}\n`
      })
    })
    
    if (warningsFound.length > 10) {
      report += `\n... and ${warningsFound.length - 10} more documents with warnings\n`
    }
  } else {
    report += 'None\n'
  }

  return report
}

/**
 * Quick health check of the migration status
 * @returns {Promise<Object>} Health check result
 */
export const quickHealthCheck = async () => {
  try {
    // Get counts from both collections
    const legacySnapshot = await getDocs(collection(db, 'interviewSummaries'))
    const newSnapshot = await getDocs(collection(db, 'metadataV2'))

    return {
      legacyCollection: {
        name: 'interviewSummaries',
        documentCount: legacySnapshot.size
      },
      newCollection: {
        name: 'metadataV2',
        documentCount: newSnapshot.size
      },
      migrationProgress: newSnapshot.size > 0 ? 
        Math.round((newSnapshot.size / Math.max(legacySnapshot.size, 1)) * 100) : 0,
      isHealthy: newSnapshot.size > 0,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      isHealthy: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
}
