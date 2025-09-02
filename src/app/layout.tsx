import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Engels Mondeling Oefenen - HAVO 2',
  description: 'Oefen je Engelse gespreksvaardigheid voor HAVO 2 mondeling met AI feedback',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <body className="bg-gray-100 min-h-screen" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  )
} 