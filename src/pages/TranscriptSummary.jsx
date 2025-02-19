import { useState, useRef } from 'react'
import { collection, doc, setDoc } from 'firebase/firestore'
import { db } from '../services/firebase'

export default function TranscriptSummary() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [summaries, setSummaries] = useState(null)
  const audioRef = useRef(null)
  const [audioUrl, setAudioUrl] = useState(null)

  const handleFileUpload = async (transcriptFile, audioFile) => {
    try {
      setLoading(true)
      setError(null)

      const documentName = prompt("Enter the name of the document for this interview:")
      if (!documentName) {
        setError("Document name is required")
        return
      }

      // Handle audio file
      if (audioFile) {
        const audioUrl = URL.createObjectURL(audioFile)
        setAudioUrl(audioUrl)
      }

      // Read and process transcript
      const transcript = await readFileAsText(transcriptFile)
      const summaries = await getSummariesFromChatGPT(transcript)
      
      // Save to Firebase
      await saveProcessedTranscript(documentName.trim(), summaries)
      
      setSummaries(summaries)
    } catch (error) {
      console.error("Error processing files:", error)
      setError("Failed to process transcript")
    } finally {
      setLoading(false)
    }
  }

  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = (e) => reject(e)
      reader.readAsText(file)
    })
  }

  const getSummariesFromChatGPT = async (transcript) => {
    try {
      // Note: Replace with your actual API key mechanism
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY
      
      const systemMessage = `
        You are an assistant that processes interview transcripts into structured summaries with timestamps and keywords.
        
        Always output the content in the following strict format:
        Overall Summary:
        [Provide a concise overall summary here.]
        
        Key Points:
        1. Title: [First key topic]
           Timestamp: [Start time - End time]
           Keywords: [Comma-separated list of keywords]
           Summary: [Provide a short summary of the first key topic.]
      `

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: `Here is a transcript:\n${transcript}\n\nGenerate an overall summary, key points with timestamps, and keywords.` },
          ],
          max_tokens: 1000,
        }),
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }

      const data = await response.json()
      return parseGPTResponse(data.choices[0].message.content)
    } catch (error) {
      console.error("Error communicating with OpenAI API:", error)
      throw error
    }
  }

  const parseGPTResponse = (response) => {
    const overallSummaryMatch = response.match(/Overall Summary:\s*(.+)/i)
    const overallSummary = overallSummaryMatch 
      ? overallSummaryMatch[1].trim() 
      : "No summary found."

    const keyPoints = []
    const keyPointRegex = /\d+\.\s*Title:\s*(.+?)\s*Timestamp:\s*(.+?)\s*Keywords:\s*(.+?)\s*Summary:\s*(.+?)(?=\d+\.|$)/gs

    let match
    while ((match = keyPointRegex.exec(response)) !== null) {
      keyPoints.push({
        topic: match[1].trim(),
        timestamp: match[2].trim(),
        keywords: match[3].trim(),
        summary: match[4].trim()
      })
    }

    return { overallSummary, keyPoints }
  }

  const saveProcessedTranscript = async (documentName, summaries) => {
    try {
      // Save main summary
      const interviewDocRef = doc(collection(db, "interviewSummaries"), documentName)
      await setDoc(interviewDocRef, {
        documentName,
        mainSummary: summaries.overallSummary,
        createdAt: new Date(),
      })

      // Save subsummaries
      for (const subSummary of summaries.keyPoints) {
        const sanitizedTitle = subSummary.topic.replace(/[^a-zA-Z0-9-_]/g, "_")
        const subSummaryDocRef = doc(
          collection(db, "interviewSummaries", documentName, "subSummaries"),
          sanitizedTitle
        )

        await setDoc(subSummaryDocRef, {
          topic: subSummary.topic,
          timestamp: subSummary.timestamp,
          keywords: subSummary.keywords,
          summary: subSummary.summary,
        })
      }
    } catch (error) {
      console.error("Error storing processed transcript:", error)
      throw error
    }
  }

  const jumpToTimestamp = (timestamp) => {
    if (!audioRef.current) return

    const startTime = timestamp.split(" - ")[0]
    const timeParts = startTime.split(":").map(Number)
    
    if (timeParts.length !== 2 || timeParts.some(isNaN)) {
      console.error("Invalid timestamp format:", startTime)
      return
    }

    const minutes = timeParts[0]
    const seconds = timeParts[1]
    const totalSeconds = minutes * 60 + seconds

    if (isFinite(totalSeconds)) {
      audioRef.current.currentTime = totalSeconds
      audioRef.current.play()
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Transcript Summarizer</h1>

      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Transcript File
          </label>
          <input
            type="file"
            accept=".txt"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], null)}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Audio File (optional)
          </label>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => e.target.files?.[0] && setAudioUrl(URL.createObjectURL(e.target.files[0]))}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>
      </div>

      {audioUrl && (
        <audio 
          ref={audioRef}
          src={audioUrl}
          controls
          className="w-full mb-8"
        />
      )}

      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-8">
          {error}
        </div>
      )}

      {summaries && (
        <div className="space-y-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Overall Summary</h2>
            <p className="text-gray-700">{summaries.overallSummary}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Key Points</h2>
            <div className="space-y-6">
              {summaries.keyPoints.map((point, index) => (
                <div key={index} className="border-b border-gray-200 pb-4">
                  <h3 className="text-xl font-semibold mb-2">{point.topic}</h3>
                  <p 
                    className="text-blue-600 cursor-pointer mb-2 hover:text-blue-800"
                    onClick={() => jumpToTimestamp(point.timestamp)}
                  >
                    🕒 {point.timestamp}
                  </p>
                  <p className="text-gray-600 mb-2">
                    Keywords: {point.keywords}
                  </p>
                  <p className="text-gray-700">{point.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}