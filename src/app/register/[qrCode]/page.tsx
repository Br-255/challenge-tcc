'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterPage({ params }: { params: { qrCode: string } }) {
  const router = useRouter()
  const { qrCode } = params
  const [step, setStep] = useState<'register' | 'rules'>('register')
  const [nickname, setNickname] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (nickname.length < 2 || nickname.length > 20) {
      setError('Apelido deve ter entre 2 e 20 caracteres')
      return
    }

    if (!/^\d{10,11}$/.test(phone.replace(/\D/g, ''))) {
      setError('Telefone inválido')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/quiz/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode, nickname, phone }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao cadastrar')
        setLoading(false)
        return
      }

      setStep('rules')
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptRules = () => {
    router.push(`/quiz/${qrCode}`)
  }

  if (step === 'rules') {
    return (
      <main className="container-mobile min-h-screen flex flex-col p-6">
        <div className="flex-1 space-y-6 overflow-y-auto">
          <div>
            <h1 className="text-3xl font-bold mb-2">Regras e Privacidade</h1>
            <p className="text-gray-600">
              Leia com atenção antes de começar
            </p>
          </div>

          <div className="space-y-4 text-sm leading-relaxed">
            <div className="bg-accent bg-white rounded-lg p-4">
              <h2 className="font-semibold mb-2">Como funciona</h2>
              <ul className="space-y-2 text-gray-700 text-gray-700">
                <li>• 6 perguntas: 2 fáceis, 2 médias e 2 difíceis</li>
                <li>• Cada fase correta = 1 acerto (máximo 6/6)</li>
                <li>• Cronômetro conta o tempo de cada fase</li>
                <li>• Não há segunda tentativa de resposta</li>
                <li>• Após confirmar, não pode alterar</li>
              </ul>
            </div>

            <div className="bg-accent bg-white rounded-lg p-4">
              <h2 className="font-semibold mb-2">Premiação</h2>
              <ul className="space-y-2 text-gray-700 text-gray-700">
                <li>• 0–2 acertos: bala + adesivo</li>
                <li>• 3–4: brindes anteriores + marca-página + caneta</li>
                <li>• 5: brindes anteriores + bloco de notas ou chaveiro</li>
                <li>• 6: brindes anteriores + necessaire</li>
                <li>• Melhor da hora: mousepad após o fechamento</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h2 className="font-semibold mb-2 text-yellow-900">
                Privacidade
              </h2>
              <p className="text-yellow-800 text-sm">
                Usaremos seu telefone para avisar sobre premiação e combinar a retirada dos brindes.
                Seu número não será exibido no ranking.
              </p>
            </div>

          </div>
        </div>

        <div className="pt-6 space-y-3">
          <button
            onClick={handleAcceptRules}
            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-4 px-6 rounded-lg transition-colors"
          >
            Aceitar e Começar
          </button>
          <button
            onClick={() => setStep('register')}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Voltar
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="container-mobile min-h-screen flex flex-col justify-center p-6">
      <div className="w-full max-w-md mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Cadastro</h1>
          <p className="text-gray-600">
            Preencha para começar o desafio
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium mb-2">
              Apelido
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Como quer ser chamado?"
              className="w-full px-4 py-3 bg-white border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              maxLength={20}
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Entre 2 e 20 caracteres
            </p>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-2">
              Telefone
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              className="w-full px-4 py-3 bg-white border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Usado apenas para avisar sobre premiação
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !nickname || !phone}
            className="w-full bg-primary hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-colors"
          >
            {loading ? 'Cadastrando...' : 'Continuar'}
          </button>
        </form>
      </div>
    </main>
  )
}
