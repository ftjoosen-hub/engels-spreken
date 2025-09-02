import EnglishPracticeApp from '@/components/EnglishPracticeApp'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-4.126-.98L3 20l1.98-5.874A8.955 8.955 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
            </svg>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Engels Mondeling Oefenen
          </h1>
          
          <p className="text-xl text-blue-700 font-medium mb-2">
            HAVO 2 - A2 Niveau
          </p>
          
          <p className="text-gray-600 max-w-2xl mx-auto">
            Oefen je Engelse gespreksvaardigheid met onze AI-docent. Krijg directe feedback op je grammatica, uitspraak, woordenschat en vloeiendheid.
          </p>
        </div>

        {/* Main App */}
        <EnglishPracticeApp />
      </div>
    </div>
  )
}