'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function QRPage({ params }: { params: { qrCode: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const { qrCode } = params

    if (!qrCode) {
      setError('QR code inválido')
      setLoading(false)
      return
    }

    // Check QR status
    fetch(`/api/qr/${qrCode}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
          setLoading(false)
          return
        }

        if (data.status === 'completed') {
          router.push(`/results/${qrCode}`)
        } else if (data.status === 'revoked') {
          setError('Este acesso foi revogado')
          setLoading(false)
        } else if (!data.hasNickname) {
          // Redirect to registration
          router.push(`/register/${qrCode}`)
        } else {
          // Redirect to quiz start
          router.push(`/quiz/${qrCode}`)
        }
      })
      .catch(() => {
        setError('Erro ao verificar QR code')
        setLoading(false)
      })
  }, [params, router])

  if (loading) {
    return (
      <main className="container-mobile min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p>Verificando...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="container-mobile min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">Acesso indisponível</h1>
            <p className="text-gray-600">{error}</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Voltar ao início
          </button>
        </div>
      </main>
    )
  }

  return null
}
