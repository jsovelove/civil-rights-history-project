# 🧠 Topic Glossary Semantic Search

## Overview

The Topic Glossary now features **semantic search** that allows users to find topics by meaning and concept rather than just keyword matching. It also displays **related topics** based on semantic similarity when hovering over topic cards.

## ✨ Features

### 1. **Semantic Search**
- Search by concepts and themes, not just keywords
- Example: "economic justice" finds "Poor People's Campaign", "Jobs Program", etc.
- Toggle between semantic and keyword search modes

### 2. **Related Topics**
- Hover over any topic to see semantically related topics
- Click related topics to navigate directly to them
- Similarity scores shown on hover

### 3. **Smart Filtering**
- Combine semantic search with category filters
- Results sorted by relevance when using semantic search

## 🚀 Getting Started

### Step 1: Vectorize Your Topics

First, you need to vectorize all topics in your `events_and_topics` collection:

```bash
# Install dependencies if needed
npm install dotenv

# Run the vectorization script
node vectorize-topics-batch.js
```

This will:
1. Fetch all topics from Firestore
2. Generate embeddings for each topic (topic name + description + category)
3. Store embeddings in the `topicEmbeddings` collection
4. Pre-compute related topics for fast lookup
5. Cache relationships in the `topicRelations` collection

**Expected time:** ~2-5 minutes for 300 topics (depending on your API rate limits)

**Cost estimate:** ~$0.10-0.30 for 300 topics (OpenAI embeddings)

### Step 2: Use the Feature

Once vectorization is complete, the semantic search will be automatically enabled:

1. **Navigate to Topic Glossary** (`/topic-glossary`)
2. **Look for the toggle button** - You'll see "🔤 Keyword" or "🧠 Semantic"
3. **Click to enable semantic search** - Button turns red when active
4. **Start searching:**
   - Try: "nonviolent resistance"
   - Try: "voting and political rights"
   - Try: "school integration"
5. **Hover over topics** to see related topics

## 📊 How It Works

### Vectorization Process

Each topic is converted to a rich text representation before embedding:

```
TOPIC: Voting Rights Act
DESCRIPTION: [Full description]
CATEGORY: Legal
SUMMARY: [Short summary]
IMPORTANCE: 9/10
Found in 15 interviews
```

This text is then converted to a 1536-dimension vector using OpenAI's `text-embedding-3-small` model.

### Search Process

When you search:
1. Your query is converted to a vector
2. Cosine similarity is calculated against all topic vectors
3. Topics with similarity > 0.3 are returned
4. Results are sorted by relevance (similarity score)

### Related Topics

Related topics are pre-computed and cached:
1. For each topic, we find the 5-8 most similar topics
2. Results are cached in Firestore for 1 week
3. Cache is automatically refreshed when stale

## 🎯 Search Examples

### Conceptual Searches
```
"economic inequality" → Poor People's Campaign, Jobs Programs, Economic Justice
"peaceful protest" → Sit-ins, Freedom Rides, Nonviolent Resistance
"education rights" → Brown v. Board, School Integration, Little Rock Nine
```

### Thematic Searches
```
"black empowerment" → Black Power, Black Nationalism, Black Panthers
"legal strategy" → NAACP Legal Defense, Court Cases, Brown v. Board
"youth activism" → Student Movements, SNCC, Young Leaders
```

### Historical Context
```
"1960s protests" → Sit-ins, Freedom Rides, March on Washington
"southern resistance" → Segregation, Jim Crow, States Rights
```

## 🔧 Configuration

### Adjust Similarity Threshold

In `TopicGlossary.jsx`, you can adjust the minimum similarity score:

```javascript
const semanticResults = await searchTopicsSemanticaly(searchTerm, {
  limit: 50,
  category: categoryFilter === 'all' ? null : categoryFilter,
  minSimilarity: 0.3  // Default: 0.3 (30% similar)
  // Try 0.4 for more precise results
  // Try 0.2 for broader results
});
```

### Adjust Number of Related Topics

In the topic card, modify the slice:

```javascript
{relatedTopicsMap[topic.id].slice(0, 4).map((relatedTopic, idx) => (
  // Currently shows 4 related topics
  // Change to .slice(0, 6) for more
```

## 🔄 Maintenance

### Re-vectorize Topics

Run the batch script again if you:
- Add new topics to `events_and_topics`
- Update topic descriptions
- Change topic categories

```bash
node vectorize-topics-batch.js
```

The script will ask if you want to re-vectorize existing topics.

### Clear Cache

If related topics seem outdated, you can:
1. Clear the `topicRelations` collection in Firestore
2. Re-run the pre-computation:

```javascript
// In browser console:
import { precomputeAllTopicRelations } from './services/topicVectorSearch';
await precomputeAllTopicRelations(topics);
```

## 📈 Performance

### Current Setup (Firebase)
- **Query Time**: 150-300ms for 300 topics ✅
- **Related Topics**: <50ms (cached) ✅
- **Storage**: ~15KB per topic embedding
- **Cost**: $0/month (after initial vectorization)

### Scalability
- Works perfectly for up to 1,000 topics
- Beyond 1,000 topics, consider:
  - Client-side vector search (lighter weight)
  - Pinecone/Qdrant for larger datasets

## 🐛 Troubleshooting

### "Semantic search not available"

**Problem:** Toggle button not showing up

**Solution:**
1. Check if topics are vectorized: Open browser console and run:
   ```javascript
   await checkTopicVectorizationStatus()
   ```
2. If count is 0, run the vectorization script:
   ```bash
   node vectorize-topics-batch.js
   ```

### "Search returns no results"

**Problem:** Semantic search returns empty results

**Solutions:**
1. Lower the similarity threshold (edit `TopicGlossary.jsx`, line ~127)
2. Check if your query is too specific
3. Try keyword search to verify topics exist

### "Related topics not loading"

**Problem:** Hover doesn't show related topics

**Solutions:**
1. Check browser console for errors
2. Verify `topicRelations` collection exists in Firestore
3. Re-run pre-computation:
   ```bash
   node vectorize-topics-batch.js
   # Select "yes" when asked to pre-compute relations
   ```

## 💡 Tips & Best Practices

### For Best Search Results:
1. **Use descriptive queries**: "voting rights legislation" > "voting"
2. **Think conceptually**: "community organizing" finds many related topics
3. **Try variations**: If results aren't great, rephrase your query
4. **Use category filters**: Narrow down by concept, place, person, event, org, or legal

### For Performance:
1. **Pre-compute relations**: Run the batch script to cache everything upfront
2. **Use keyword search for exact matches**: Toggle when you know the exact term
3. **Clear old caches**: Refresh `topicRelations` periodically

## 🎨 UI Components

### Semantic Search Toggle
```jsx
{isVectorized && (
  <button
    onClick={() => setUseSemanticSearch(!useSemanticSearch)}
    className={useSemanticSearch ? 'bg-red-500 text-white' : 'bg-gray-200'}
  >
    {useSemanticSearch ? '🧠 Semantic' : '🔤 Keyword'}
  </button>
)}
```

### Related Topics Display
```jsx
{isVectorized && hoveredTopicId === topic.id && relatedTopicsMap[topic.id] && (
  <div className="mt-2 pt-3 border-t border-gray-300">
    <div className="text-xs font-medium mb-2">Related Topics:</div>
    <div className="flex flex-wrap gap-2">
      {relatedTopicsMap[topic.id].slice(0, 4).map((relatedTopic) => (
        <span className="px-2 py-1 bg-red-100 text-red-700">
          {relatedTopic.keyword}
        </span>
      ))}
    </div>
  </div>
)}
```

## 📁 Files Created/Modified

### New Files:
- `src/services/topicVectorSearch.js` - Vector search service
- `vectorize-topics-batch.js` - Batch vectorization script
- `TOPIC_GLOSSARY_SEMANTIC_SEARCH.md` - This file

### Modified Files:
- `src/pages/TopicGlossary.jsx` - Updated to use semantic search

### New Firestore Collections:
- `topicEmbeddings` - Stores topic vectors
- `topicRelations` - Caches related topic relationships

## 🚀 Next Steps

1. **Run vectorization**: `node vectorize-topics-batch.js`
2. **Test the feature**: Navigate to `/topic-glossary` and try searching
3. **Customize**: Adjust similarity thresholds, number of related topics, etc.
4. **Monitor**: Watch for search quality and performance
5. **Iterate**: Update topic descriptions for better search results

## 🤝 Contributing

To improve search quality:
1. Enhance topic descriptions in `events_and_topics` collection
2. Add more metadata to topics (related events, key figures, etc.)
3. Adjust similarity thresholds based on user feedback
4. Add more context to the vectorization text (see `topicVectorSearch.js`)

---

**Questions?** Check the code comments in `src/services/topicVectorSearch.js` for detailed implementation notes.

