'use client'

import { useState, useRef, useEffect } from 'react'
import MarkdownRenderer from './MarkdownRenderer'

interface ConversationMessage {
  id: string
  role: 'student' | 'teacher'
  content: string
  timestamp: Date
  feedback?: {
    grammar: number
    pronunciation: number
    vocabulary: number
    fluency: number
    comments: string
  }
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

export default function EnglishPracticeApp() {
  const [selectedTopic, setSelectedTopic] = useState<string>('')
  const [conversation, setConversation] = useState<ConversationMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [sessionFeedback, setSessionFeedback] = useState<any>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [britishVoice, setBritishVoice] = useState<SpeechSynthesisVoice | null>(null)
  
  const recognitionRef = useRef<any>(null)
  const conversationRef = useRef<HTMLDivElement>(null)
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Voice recognition setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = 'en-US'
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          setCurrentMessage(transcript)
        }
        
        recognition.onend = () => {
          setIsListening(false)
        }
        
        recognition.onerror = () => {
          setIsListening(false)
        }
        
        recognitionRef.current = recognition
      }
    }
  }, [])

  // TTS setup - load British voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      setAvailableVoices(voices)
      
      // Find the best British English voice for Cambridge pronunciation
      const britishVoices = voices.filter(voice => 
        voice.lang.startsWith('en-GB') || 
        voice.lang.startsWith('en-UK') ||
        voice.name.toLowerCase().includes('british') ||
        voice.name.toLowerCase().includes('uk') ||
        voice.name.toLowerCase().includes('daniel') ||
        voice.name.toLowerCase().includes('hazel')
      )
      
      // Prefer premium/neural voices
      const premiumBritish = britishVoices.find(voice => 
        voice.name.toLowerCase().includes('neural') ||
        voice.name.toLowerCase().includes('premium') ||
        voice.name.toLowerCase().includes('enhanced')
      )
      
      const selectedVoice = premiumBritish || britishVoices[0] || voices.find(v => v.lang.startsWith('en-'))
      setBritishVoice(selectedVoice)
      
      if (selectedVoice) {
        console.log('Selected British voice:', selectedVoice.name, selectedVoice.lang)
      }
    }

    // Load voices immediately and on change
    loadVoices()
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
    
    // Cleanup function
    return () => {
      if (currentUtteranceRef.current) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])
  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight
    }
  }, [conversation])

  // Function to speak teacher messages in British English
  const speakTeacherMessage = (text: string) => {
    // Stop any current speech
    window.speechSynthesis.cancel()
    
    if (!britishVoice || !text.trim()) return
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = britishVoice
    utterance.lang = 'en-GB'
    utterance.rate = 0.9 // Slightly slower for clarity
    utterance.pitch = 1.0
    utterance.volume = 0.8
    
    utterance.onstart = () => {
      setIsSpeaking(true)
    }
    
    utterance.onend = () => {
      setIsSpeaking(false)
      currentUtteranceRef.current = null
    }
    
    utterance.onerror = () => {
      setIsSpeaking(false)
      currentUtteranceRef.current = null
    }
    
    currentUtteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  // Function to stop current speech
  const stopSpeaking = () => {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    currentUtteranceRef.current = null
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
        
        // Speak the teacher's opening message
        setTimeout(() => {
          speakTeacherMessage(data.response)
        }, 500) // Small delay to ensure UI is updated
      }
    } catch (error) {
      console.error('Error starting session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return

    const studentMessage: ConversationMessage = {
      id: Date.now().toString(),
      role: 'student',
      content: currentMessage,
      timestamp: new Date()
    }

    setConversation(prev => [...prev, studentMessage])
    setCurrentMessage('')
    setIsLoading(true)

    try {
      // Get teacher response
      const conversationHistory = [...conversation, studentMessage]
        .map(msg => `${msg.role === 'teacher' ? 'Teacher' : 'Student'}: ${msg.content}`)
        .join('\n')

      const response = await fetch('/api/chat', {
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
- Occasionally acknowledge good language use
- If the student makes errors, gently model correct usage without explicitly correcting
- Keep the conversation flowing naturally

Respond as the teacher would in this conversation.`,
          aiModel: 'smart'
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Get feedback for the student's message
        const feedbackResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Analyze this English response from a Dutch HAVO 2 student (A2 level) and provide detailed feedback:

Student's response: "${studentMessage.content}"

Please provide feedback in this exact JSON format:
{
  "grammar": [score 1-10],
  "pronunciation": [score 1-10 based on likely pronunciation of written text],
  "vocabulary": [score 1-10],
  "fluency": [score 1-10 based on sentence structure and flow],
  "comments": "Specific constructive feedback in Dutch, mentioning what was good and what could be improved. Keep it encouraging and specific."
}

Consider A2 level expectations:
- Grammar: Basic sentence structures, simple tenses
- Vocabulary: Common everyday words appropriate for the topic
- Fluency: Ability to express ideas clearly, even if simply
- Pronunciation: Estimate based on likely Dutch speaker challenges

Be encouraging but honest in your assessment.`,
            aiModel: 'smart'
          })
        })

        let feedback = null
        if (feedbackResponse.ok) {
          const feedbackData = await feedbackResponse.json()
          try {
            // Try to extract JSON from the response
            const jsonMatch = feedbackData.response.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              feedback = JSON.parse(jsonMatch[0])
            }
          } catch (e) {
            console.error('Error parsing feedback:', e)
          }
        }

        const teacherMessage: ConversationMessage = {
          id: (Date.now() + 1).toString(),
          role: 'teacher',
          content: data.response,
          timestamp: new Date()
        }

        // Update the student message with feedback
        setConversation(prev => [
          ...prev.slice(0, -1),
          { ...studentMessage, feedback },
          teacherMessage
        ])
        
        // Speak the teacher's response
        setTimeout(() => {
          speakTeacherMessage(data.response)
        }, 500) // Small delay to ensure UI is updated
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleVoiceRecognition = () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const endSession = async () => {
    if (conversation.length === 0) return

    setIsLoading(true)
    try {
      const conversationHistory = conversation
        .map(msg => `${msg.role === 'teacher' ? 'Teacher' : 'Student'}: ${msg.content}`)
        .join('\n')

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Provide a comprehensive session summary and feedback for this English conversation practice session with a Dutch HAVO 2 student (A2 level):

${conversationHistory}

Please provide feedback in this exact JSON format:
{
  "overallGrammar": [score 1-10],
  "overallPronunciation": [score 1-10],
  "overallVocabulary": [score 1-10],
  "overallFluency": [score 1-10],
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement area 1", "improvement area 2", "improvement area 3"],
  "specificTips": ["tip 1", "tip 2", "tip 3"],
  "encouragement": "Encouraging message in Dutch about their progress and effort"
}

Base your assessment on A2 level expectations and be constructive and encouraging.`,
          aiModel: 'smart'
        })
      })

      if (response.ok) {
        const data = await response.json()
        try {
          const jsonMatch = data.response.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const feedback = JSON.parse(jsonMatch[0])
            setSessionFeedback(feedback)
            setShowFeedback(true)
          }
        } catch (e) {
          console.error('Error parsing session feedback:', e)
        }
      }
    } catch (error) {
      console.error('Error getting session feedback:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetSession = () => {
    setSessionStarted(false)
    setConversation([])
    setCurrentMessage('')
    setSelectedTopic('')
    setShowFeedback(false)
    setSessionFeedback(null)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (showFeedback && sessionFeedback) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Sessie Voltooid!</h2>
            <p className="text-gray-600">Hier is je persoonlijke feedback</p>
          </div>

          {/* Overall Scores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{sessionFeedback.overallGrammar}/10</div>
              <div className="text-sm text-blue-800">Grammatica</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{sessionFeedback.overallPronunciation}/10</div>
              <div className="text-sm text-green-800">Uitspraak</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{sessionFeedback.overallVocabulary}/10</div>
              <div className="text-sm text-purple-800">Woordenschat</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{sessionFeedback.overallFluency}/10</div>
              <div className="text-sm text-orange-800">Vloeiendheid</div>
            </div>
          </div>

          {/* Detailed Feedback */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                Sterke Punten
              </h3>
              <ul className="space-y-2">
                {sessionFeedback.strengths?.map((strength: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span className="text-green-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Verbeterpunten
              </h3>
              <ul className="space-y-2">
                {sessionFeedback.improvements?.map((improvement: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-600 mr-2">→</span>
                    <span className="text-blue-700">{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-yellow-50 p-6 rounded-lg mb-8">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Tips voor Volgende Keer
            </h3>
            <ul className="space-y-2">
              {sessionFeedback.specificTips?.map((tip: string, index: number) => (
                <li key={index} className="flex items-start">
                  <span className="text-yellow-600 mr-2">💡</span>
                  <span className="text-yellow-700">{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Encouragement */}
          <div className="bg-purple-50 p-6 rounded-lg mb-8 text-center">
            <h3 className="text-lg font-semibold text-purple-800 mb-3">Bemoediging</h3>
            <p className="text-purple-700 italic">{sessionFeedback.encouragement}</p>
          </div>

          {/* Actions */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={resetSession}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Nieuwe Sessie Starten
            </button>
          </div>
        </div>
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
              {isLoading ? 'Sessie wordt gestart...' : 'Start Gesprek'}
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
                Voer een natuurlijk gesprek in het Engels met de AI-docent (die ook spreekt!)
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">3.</span>
                Krijg directe feedback op je grammatica, uitspraak, woordenschat en vloeiendheid
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">4.</span>
                Ontvang een uitgebreide evaluatie aan het einde van de sessie
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">💡</span>
                <strong>Tip:</strong> De docent spreekt in Cambridge Engels - luister goed naar de uitspraak!
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
            <p className="text-blue-100 text-sm">
              Gesprek in het Engels - A2 Niveau {britishVoice && `• ${britishVoice.name}`}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm"
              >
                🔇 Stop
              </button>
            )}
            <button
              onClick={endSession}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
            >
              Sessie Beëindigen
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
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.role === 'student'
                      ? 'bg-blue-600 text-white'
                      : `bg-gray-200 text-gray-800 ${isSpeaking ? 'ring-2 ring-green-400 ring-opacity-50' : ''}`
                  }`}
                >
                  <div className="text-sm font-medium mb-1">
                    {message.role === 'student' ? 'Jij' : (
                      <div className="flex items-center">
                        <span>Docent</span>
                        {message.role === 'teacher' && (
                          <div className="ml-2 flex space-x-1">
                            <button
                              onClick={() => speakTeacherMessage(message.content)}
                              disabled={isSpeaking}
                              className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded disabled:opacity-50"
                              title="Herhaal uitspraak"
                            >
                              🔊
                            </button>
                            {isSpeaking && (
                              <button
                                onClick={stopSpeaking}
                                className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
                                title="Stop uitspraak"
                              >
                                ⏹️
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>{message.content}</div>
                  {message.role === 'teacher' && isSpeaking && (
                    <div className="mt-2 text-xs text-green-600 flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                      Spreekt...
                    </div>
                  )}
                </div>
              </div>

              {/* Feedback for student messages */}
              {message.role === 'student' && message.feedback && (
                <div className="ml-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-yellow-800">Feedback:</span>
                    <div className="flex space-x-2 text-xs">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">G: {message.feedback.grammar}/10</span>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded">U: {message.feedback.pronunciation}/10</span>
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">W: {message.feedback.vocabulary}/10</span>
                      <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">V: {message.feedback.fluency}/10</span>
                    </div>
                  </div>
                  <p className="text-yellow-700">{message.feedback.comments}</p>
                </div>
              )}
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

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type je antwoord in het Engels..."
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                disabled={isLoading}
              />
            </div>
            
            {/* Voice Input Button */}
            {recognitionRef.current && (
              <button
                onClick={toggleVoiceRecognition}
                disabled={isLoading}
                className={`p-3 rounded-lg transition-colors ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                title={isListening ? "Stop opnemen" : "Start spraakherkenning"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            )}
            
            {/* Send Button */}
            <button
              onClick={sendMessage}
              disabled={!currentMessage.trim() || isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Verstuur
            </button>
          </div>
          
          {isListening && (
            <div className="mt-2 text-sm text-red-600 flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
              Luistert naar je Engels...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}