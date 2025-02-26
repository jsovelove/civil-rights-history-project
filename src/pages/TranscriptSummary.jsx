import { useState, useRef } from 'react'
import { collection, doc, setDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { FileText, Upload, Clock, Tag, ChevronRight } from 'lucide-react'

export default function TranscriptSummary() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [summaries, setSummaries] = useState(null)
  const audioRef = useRef(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [step, setStep] = useState(1) // 1: Upload, 2: Results

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
      setStep(2) // Move to results view
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
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Transcript Summarizer
        </h1>
        <p className="mt-3 text-gray-600 dark:text-gray-300">
          Upload interview transcripts to generate AI-powered summaries with timestamps and keywords
        </p>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        {/* Step 1: Upload Files */}
        {step === 1 && (
          <div className="p-8">
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex items-center">
                <FileText className="mr-2 text-blue-600" size={20} />
                Upload Interview Files
              </h2>
              
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
                    Transcript File (.txt)
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/60 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-10 h-10 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Upload your interview transcript file (TXT)</p>
                      </div>
                      <input 
                        type="file" 
                        accept=".txt" 
                        className="hidden" 
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], null)}
                      />
                    </label>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
                    Audio File (optional)
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/60 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-10 h-10 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">MP3, WAV, or other audio formats</p>
                      </div>
                      <input 
                        type="file" 
                        accept="audio/*" 
                        className="hidden" 
                        onChange={(e) => e.target.files?.[0] && setAudioUrl(URL.createObjectURL(e.target.files[0]))}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {audioUrl && (
              <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-white">Audio Preview</h3>
                <audio 
                  ref={audioRef}
                  src={audioUrl}
                  controls
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col justify-center items-center py-20">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300 animate-pulse">Processing transcript...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="m-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-300 px-6 py-4 rounded-xl">
            <div className="flex">
              <svg className="w-6 h-6 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
              </svg>
              <div>
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Results */}
        {step === 2 && summaries && (
          <div>
            {/* Audio Player (if available) */}
            {audioUrl && (
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
                <audio 
                  ref={audioRef}
                  src={audioUrl}
                  controls
                  className="w-full"
                />
              </div>
            )}
            
            {/* Overall Summary */}
            <div className="p-8 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
                Overall Summary
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {summaries.overallSummary}
              </p>
            </div>

            {/* Key Points */}
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
                Key Points
              </h2>
              
              <div className="space-y-8">
                {summaries.keyPoints.map((point, index) => (
                  <div 
                    key={index} 
                    className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-6 transition-all duration-300 hover:shadow-md"
                  >
                    <div className="flex items-start mb-4">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 mr-3 flex-shrink-0">
                        {index + 1}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                        {point.topic}
                      </h3>
                    </div>
                    
                    <div 
                      className="flex items-center mb-4 text-blue-600 dark:text-blue-400 cursor-pointer hover:text-blue-800 dark:hover:text-blue-300 transition-colors" 
                      onClick={() => jumpToTimestamp(point.timestamp)}
                    >
                      <Clock size={16} className="mr-2" />
                      <span className="font-medium">{point.timestamp}</span>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex items-start mb-2">
                        <Tag size={16} className="mr-2 text-gray-500 dark:text-gray-400 mt-0.5" />
                        <div className="flex flex-wrap gap-2">
                          {point.keywords.split(',').map((keyword, idx) => (
                            <span 
                              key={idx}
                              className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-full"
                            >
                              {keyword.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {point.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Reset button */}
            <div className="p-8 border-t border-gray-100 dark:border-gray-700 flex justify-center">
              <button
                onClick={() => {
                  setStep(1)
                  setSummaries(null)
                  setAudioUrl(null)
                  setError(null)
                }}
                className="flex items-center px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 mr-2 rotate-180" />
                Process Another Transcript
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}