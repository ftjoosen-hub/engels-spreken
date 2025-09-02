'use client'

import { useState, useRef, useEffect } from 'react'
import MarkdownRenderer from './MarkdownRenderer'

interface ConversationMessage {
  id: string
  role: 'student' | 'teacher'
  content: string
  timestamp: Date
  isPlaying?: boolean
  audioUrl?: string
}

interface SpeechFeedback {
  pronunciation: number
  fluency: number
  accuracy: number
  comments: string
}

const CONVERSATION_TOPICS = [
  { id: 'hobbies', title: 'Hobbies & Vrije tijd', description: 'Praat over wat je graag doet in je vrije tijd' },
  { id: 'school', title: 'School & Vakken', description: 'Vertel over je school, vakken en leraren' },
  { id: 'family', title: 'Familie & Vrienden', description: 'Beschrijf je familie en beste vrienden' },
  { id: 'food', title: 'Eten & Drinken', description: 'Praat over je favoriete eten en drankjes' },
  { id: 'travel', title: 'Reizen & Vakantie', description: 'Vertel over plekken waar je bent geweest of naartoe wilt' },
  { id: 'technology', title: 'Technologie & Social Media', description: 'Praat over apps, games en sociale media' },
  { id: 'sports', title: 'Sport & Beweging', description: 'Vertel over sporten die je doet of leuk vindt' },
  { id: 'future', title: 'Toekomstplannen', description: 'Praat over wat je later wilt worden of doen' },
  { id: 'daily', title: 'Dagelijkse Routine', description: 'Beschrijf een gewone dag in jouw leven' },
  { id: 'weather', title: 'Weer & Seizoenen', description: 'Praat over het weer en je favoriete seizoen' }
]

// Best British voice for Cambridge English
const CAMBRIDGE_VOICE = { name: 'Charon', style: 'Informative', description: 'Cambridge English docent stem' }

export default function EnglishPracticeApp() {
  const [selectedTopic, setSelectedTopic] = useState<string>('')
  const [conversation, setConversation] = useState<ConversationMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isTeacherSpeaking, setIsTeacherSpeaking] = useState(false)
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null)
  const [speechFeedback, setSpeechFeedback] = useState<SpeechFeedback | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [currentAudioText, setCurrentAudioText] = useState('')
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1)
  
  const recognitionRef = useRef<any>(null)
  const conversationRef = useRef<HTMLDivElement>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Voice recognition setup for pronunciation feedback
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = 'en-US'
        
        recognition.onresult = async (event: any) => {
          const transcript = event.results[0][0].transcript
          const confidence = event.results[0][0].confidence
          
          // Get pronunciation feedback
          await getPronunciationFeedback(transcript, confidence)
        }
        
        recognition.onend = () => {
          setIsListening(false)
        }
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          setIsListening(false)
        }
        
        recognitionRef.current = recognition
      }
    }
  }, [])

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight
    }
  }, [conversation])

  // Generate TTS audio and play automatically
  const generateAndPlayTTS = async (text: string, messageId: string) => {
    try {
      setIsTeacherSpeaking(true)
      setCurrentPlayingId(messageId)
      setCurrentAudioText(text)
      
      // Stop any currently playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current = null
      }

      console.log('🎙️ Generating TTS for:', text.substring(0, 50) + '...')
      
      const response = await fetch('/api/generate-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          voiceName: CAMBRIDGE_VOICE.name,
          multiSpeaker: false,
          style: 'Professioneel'
        }),
      })

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`)
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      
      // Update message with audio URL
      setConversation(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, audioUrl, isPlaying: true }
            : { ...msg, isPlaying: false }
        )
      )

      // Create and play audio
      const audio = new Audio(audioUrl)
      currentAudioRef.current = audio
      
      // Synchronized text highlighting
      const words = text.split(' ')
      const avgWordsPerSecond = 2.5 // Adjust based on speech rate
      
      audio.onplay = () => {
        console.log('🔊 Audio started playing')
        setIsTeacherSpeaking(true)
        
        // Start word highlighting
        let wordIndex = 0
        const highlightInterval = setInterval(() => {
          if (wordIndex < words.length) {
            setHighlightedWordIndex(wordIndex)
            wordIndex++
          } else {
            clearInterval(highlightInterval)
            setHighlightedWordIndex(-1)
          }
        }, (1000 / avgWordsPerSecond))
        
        audio.onended = () => {
          clearInterval(highlightInterval)
          setHighlightedWordIndex(-1)
          setIsTeacherSpeaking(false)
          setCurrentPlayingId(null)
          setCurrentAudioText('')
          URL.revokeObjectURL(audioUrl)
          currentAudioRef.current = null
          
          // Update message state
          setConversation(prev => 
            prev.map(msg => ({ ...msg, isPlaying: false }))
          )
        }
      }
      
      audio.onerror = (error) => {
        console.error('Audio playback error:', error)
        setIsTeacherSpeaking(false)
        setCurrentPlayingId(null)
        setHighlightedWordIndex(-1)
      }

      await audio.play()
      
    } catch (error) {
      console.error('TTS Error:', error)
      setIsTeacherSpeaking(false)
      setCurrentPlayingId(null)
      setHighlightedWordIndex(-1)
    }
  }

  const startSession = async () => {
    if (!selectedTopic) return

    const topic = CONVERSATION_TOPICS.find(t => t.id === selectedTopic)
    if (!topic) return

    setSessionStarted(true)
    setConversation([])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Start a conversation practice session for a Dutch HAVO 2 student (A2 English level) about the topic: "${topic.title}". 

Instructions for you as the AI teacher:
- Speak in English only
- Keep questions and responses at A2 level (simple, clear language)
- Start with a friendly greeting and introduce the topic
- Ask open-ended questions to encourage the student to speak
- Be patient and encouraging
- Focus on communication rather than perfection
- Keep responses conversational, not like an interview
- Use Cambridge English pronunciation and vocabulary
- Keep responses to 2-3 sentences maximum for better TTS experience

Topic: ${topic.description}

Please start the conversation now with a warm greeting and an opening question about this topic.`,
          aiModel: 'smart'
        })
      })

      if (response.ok) {
        const data = await response.json()
        const teacherMessage: ConversationMessage = {
          id: Date.now().toString(),
          role: 'teacher',
          content: data.response,
          timestamp: new Date()
        }
        
        setConversation([teacherMessage])
        
        // Automatically generate and play TTS
        await generateAndPlayTTS(data.response, teacherMessage.id)
        
      }
    } catch (error) {
      console.error('Error starting session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startListening = () => {
    if (!recognitionRef.current || isListening || isTeacherSpeaking) return
    
    setSpeechFeedback(null)
    setShowFeedback(false)
    setIsListening(true)
    recognitionRef.current.start()
    
    // Auto-stop after 10 seconds
    speechTimeoutRef.current = setTimeout(() => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop()
      }
    }, 10000)
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current)
    }
    setIsListening(false)
  }

  const getPronunciationFeedback = async (transcript: string, confidence: number) => {
    try {
      setIsLoading(true)
      
      // Add student message to conversation
      const studentMessage: ConversationMessage = {
        id: Date.now().toString(),
        role: 'student',
        content: transcript,
        timestamp: new Date()
      }
      
      setConversation(prev => [...prev, studentMessage])

      // Get pronunciation feedback
      const feedbackResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Analyze this English pronunciation from a Dutch HAVO 2 student (A2 level). The speech recognition confidence was ${(confidence * 100).toFixed(1)}%.

Student said: "${transcript}"

Provide pronunciation feedback in this exact JSON format:
{
  "pronunciation": [score 1-10],
  "fluency": [score 1-10],
  "accuracy": [score 1-10],
  "comments": "Specific feedback in Dutch about pronunciation, what was good and what could be improved. Be encouraging but specific."
}

Consider:
- A2 level expectations
- Common Dutch speaker pronunciation challenges
- Speech recognition confidence level
- Encourage the student while giving constructive feedback`,
          aiModel: 'smart'
        })
      })

      if (feedbackResponse.ok) {
        const feedbackData = await feedbackResponse.json()
        try {
          const jsonMatch = feedbackData.response.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const feedback = JSON.parse(jsonMatch[0])
            setSpeechFeedback(feedback)
            setShowFeedback(true)
          }
        } catch (e) {
          console.error('Error parsing feedback:', e)
        }
      }

      // Get teacher response
      const conversationHistory = [...conversation, studentMessage]
        .map(msg => `${msg.role === 'teacher' ? 'Teacher' : 'Student'}: ${msg.content}`)
        .join('\n')

      const teacherResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Continue this English conversation practice session. You are an encouraging English teacher helping a Dutch HAVO 2 student (A2 level) practice speaking.

Current conversation:
${conversationHistory}

Guidelines:
- Respond naturally to what the student said
- Ask follow-up questions to keep the conversation going
- Use A2 level English (simple, clear)
- Be encouraging and positive
- Keep responses to 2-3 sentences maximum
- Use Cambridge English style

Respond as the teacher would in this conversation.`,
          aiModel: 'smart'
        })
      })

      if (teacherResponse.ok) {
        const teacherData = await teacherResponse.json()
        const teacherMessage: ConversationMessage = {
          id: (Date.now() + 1).toString(),
          role: 'teacher',
          content: teacherData.response,
          timestamp: new Date()
        }

        setConversation(prev => [...prev, teacherMessage])
        
        // Automatically generate and play TTS for teacher response
        await generateAndPlayTTS(teacherData.response, teacherMessage.id)
      }
      
    } catch (error) {
      console.error('Error getting feedback:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetSession = () => {
    // Stop any playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }
    
    setSessionStarted(false)
    setConversation([])
    setSelectedTopic('')
    setIsTeacherSpeaking(false)
    setCurrentPlayingId(null)
    setSpeechFeedback(null)
    setShowFeedback(false)
    setHighlightedWordIndex(-1)
    setCurrentAudioText('')
  }

  const renderHighlightedText = (text: string, highlightIndex: number) => {
    const words = text.split(' ')
    return (
      <div className="leading-relaxed">
        {words.map((word, index) => (
          <span
            key={index}
            className={`${
              index === highlightIndex 
                ? 'bg-yellow-200 text-gray-900 font-semibold' 
                : ''
            } transition-all duration-200`}
          >
            {word}{index < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </div>
    )
  }

  if (!sessionStarted) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Kies een Gespreksonderwerp
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {CONVERSATION_TOPICS.map((topic) => (
              <div
                key={topic.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  selectedTopic === topic.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => setSelectedTopic(topic.id)}
              >
                <h3 className="font-semibold text-gray-800 mb-2">{topic.title}</h3>
                <p className="text-sm text-gray-600">{topic.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={startSession}
              disabled={!selectedTopic || isLoading}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg"
            >
              {isLoading ? 'Docent wordt gestart...' : 'Start Gesprek'}
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-gray-50 p-6 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3">Hoe werkt het?</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">1.</span>
                Kies een onderwerp dat je interessant vindt
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">2.</span>
                De AI-docent begint automatisch te spreken in Cambridge Engels
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">3.</span>
                Luister naar de docent en lees de tekst mee (wordt gesynchroniseerd)
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">4.</span>
                Klik op de microfoon om te antwoorden in het Engels
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">5.</span>
                Krijg directe feedback op je uitspraak en vloeiendheid
              </li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">
              {CONVERSATION_TOPICS.find(t => t.id === selectedTopic)?.title}
            </h2>
            <p className="text-blue-100 text-sm flex items-center">
              <span className={`w-2 h-2 rounded-full mr-2 ${isTeacherSpeaking ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></span>
              Cambridge Engels Docent • Gemini AI TTS ({CAMBRIDGE_VOICE.name})
              {isTeacherSpeaking && <span className="ml-2">🔊 Spreekt...</span>}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={resetSession}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
            >
              Nieuwe Sessie
            </button>
          </div>
        </div>

        {/* Conversation */}
        <div 
          ref={conversationRef}
          className="h-96 overflow-y-auto p-4 space-y-4"
        >
          {conversation.map((message) => (
            <div key={message.id} className="space-y-2">
              <div
                className={`flex ${
                  message.role === 'student' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                    message.role === 'student'
                      ? 'bg-blue-600 text-white'
                      : `bg-gray-200 text-gray-800 ${message.isPlaying ? 'ring-2 ring-green-400' : ''}`
                  }`}
                >
                  <div className="text-sm font-medium mb-2 flex items-center">
                    {message.role === 'student' ? (
                      <>
                        <span className="mr-2">🎓</span>
                        Jij
                      </>
                    ) : (
                      <>
                        <span className="mr-2">👨‍🏫</span>
                        Cambridge Docent
                        {message.isPlaying && (
                          <span className="ml-2 text-green-600">
                            <span className="animate-pulse">🔊</span>
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Synchronized text highlighting for teacher messages */}
                  {message.role === 'teacher' && currentPlayingId === message.id ? (
                    renderHighlightedText(message.content, highlightedWordIndex)
                  ) : (
                    <div>{message.content}</div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-sm">Docent denkt na...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Speech Feedback */}
        {showFeedback && speechFeedback && (
          <div className="border-t bg-yellow-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-yellow-800 flex items-center">
                <span className="mr-2">📊</span>
                Uitspraak Feedback
              </h3>
              <button
                onClick={() => setShowFeedback(false)}
                className="text-yellow-600 hover:text-yellow-800"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{speechFeedback.pronunciation}/10</div>
                <div className="text-xs text-blue-800">Uitspraak</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{speechFeedback.fluency}/10</div>
                <div className="text-xs text-green-800">Vloeiendheid</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">{speechFeedback.accuracy}/10</div>
                <div className="text-xs text-purple-800">Nauwkeurigheid</div>
              </div>
            </div>
            
            <p className="text-sm text-yellow-700 bg-yellow-100 p-2 rounded">
              {speechFeedback.comments}
            </p>
          </div>
        )}

        {/* Voice Input */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex items-center justify-center space-x-4">
            {!isTeacherSpeaking ? (
              <>
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={isLoading}
                  className={`px-6 py-3 rounded-full font-medium transition-all duration-200 flex items-center space-x-2 ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse shadow-lg' 
                      : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-md'
                  }`}
                >
                  {isListening ? (
                    <>
                      <span className="text-xl">⏹️</span>
                      <span>Stop Opnemen</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">🎤</span>
                      <span>Spreek in het Engels</span>
                    </>
                  )}
                </button>
                
                {isListening && (
                  <div className="text-sm text-red-600 flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                    Luistert naar je uitspraak... (max 10 sec)
                  </div>
                )}
              </>
            ) : (
              <div className="text-center">
                <div className="text-lg text-blue-600 font-medium mb-2 flex items-center justify-center">
                  <span className="animate-pulse mr-2">🔊</span>
                  Docent spreekt - luister en lees mee
                </div>
                <div className="text-sm text-gray-600">
                  Wacht tot de docent klaar is met spreken voordat je antwoordt
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}