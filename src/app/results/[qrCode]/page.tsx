'use client'

import { useEffect, useState } from 'react'

interface ResultData {
  nickname: string
  correctAnswers: number
  score: number | null
  totalTime: number
  round: number | null
  roundPosition: number | null
  isHourlyWinner: boolean
  roundStatus?: string
  redemptionCode: string
  redeemed: boolean
  prizes: Array<{ name: string; category: string }> | null
}

export default function ResultsPage({ params }: { params: { qrCode: string } }) {
  const { qrCode } = params
  const [data, setData] = useState<ResultData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const refresh = async () => {
      try {
        const res = await fetch(`/api/qr/${qrCode}`, { cache: 'no-store' })
        const result = await res.json()
        if (!res.ok || result.status !== 'completed') throw new Error(result.error || 'Tentativa ainda não concluída')
        if (active) { setData(result); setError('') }
      } catch (err) { if (active) setError(err instanceof Error ? err.message : 'Erro ao carregar resultado') }
      finally { if (active) setLoading(false) }
    }
    void refresh()
    const interval = setInterval(refresh, 10000)
    return () => { active = false; clearInterval(interval) }
  }, [qrCode])

  useEffect(() => {
    if (data?.correctAnswers !== 6) return
    document.title = 'Growth Challenge — Resultado perfeito'
    return () => { document.title = 'Growth Intelligence Challenge' }
  }, [data?.correctAnswers])

  if (loading) {
    return (
      <main className="container-mobile min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="container-mobile min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Erro</h1>
          <p className="text-gray-600">{error || 'Resultado não encontrado'}</p>
        </div>
      </main>
    )
  }

  const isPerfect = data.correctAnswers === 6
  const isWinner = data.isHourlyWinner === true
  const displayScore = data.score ?? 0

  return (
    <main className={`container-mobile flex flex-col p-6 ${isPerfect ? 'bg-[#e9f8ed]' : 'bg-[#f7faf6]'}`}>
      {isPerfect && <div className="pointer-events-none fixed inset-0 overflow-hidden">{Array.from({ length: 18 }, (_, index) => <span key={index} className="absolute animate-confetti text-2xl" style={{ left: `${(index * 23) % 100}%`, animationDelay: `${(index % 7) * .16}s`, color: index % 2 ? '#45b96b' : '#101511' }}>✦</span>)}</div>}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3 animate-fade-in">
             <div className={`w-24 h-24 mx-auto rounded-[2rem] flex items-center justify-center text-5xl shadow-lift animate-pop-in ${isPerfect ? 'bg-primary animate-pulse-soft' : 'bg-green-100'}`}>
             {isPerfect ? '✦' : '✓'}
          </div>
          <div>
            <h1 className="text-3xl font-bold">
              Olá, {data.nickname}!
            </h1>
            <p className="text-gray-600 mt-1">
              {isPerfect ? 'Acertou tudo!' : 'Bom trabalho!'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-[#d9e2d8] bg-white p-3 text-center shadow-card">
            <p className="text-2xl font-bold text-primary">{data.correctAnswers}/6</p>
            <p className="mt-1 text-xs font-bold text-gray-600">Acertos</p>
          </div>
          <div className="rounded-2xl border border-[#d9e2d8] bg-white p-3 text-center shadow-card">
            <p className="text-2xl font-bold">{data.totalTime}s</p>
            <p className="mt-1 text-xs font-bold text-gray-600">Tempo</p>
          </div>
          <div className="rounded-2xl border border-[#d9e2d8] bg-white p-3 text-center shadow-card">
            <p className="text-2xl font-bold text-primary">{displayScore.toLocaleString('pt-BR')}</p>
            <p className="mt-1 text-xs font-bold text-gray-600">Pontos</p>
          </div>
        </div>

        {typeof data.round === 'number' && data.round >= 1 && data.round <= 9 && (
           <div className="rounded-2xl border border-[#d9e2d8] bg-white p-4 shadow-card space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Rodada</span>
              <span className="font-medium">{data.round}ª ({getRoundTime(data.round)})</span>
            </div>
            {typeof data.roundPosition === 'number' && data.roundPosition > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Posição</span>
                <span className="font-medium">{data.roundPosition}º</span>
              </div>
            )}
          </div>
        )}

        {(data.roundStatus === 'current' || data.roundStatus === 'open') && <p className="text-center text-sm text-gray-600">Classificação provisória. O vencedor será confirmado após o fechamento da hora.</p>}
        {data.roundStatus === 'tied' && <p className="text-center text-sm text-yellow-900">Empate na rodada. A equipe definirá o vencedor.</p>}
        {/* Winner badge */}
        {isWinner && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg p-4 text-white text-center">
            <p className="text-lg font-bold">Vencedor da rodada!</p>
            <p className="text-sm mt-1">Você ganhou um mousepad exclusivo</p>
          </div>
        )}

         {/* Prize eligibility */}
         <div className="rounded-3xl border-2 border-primary/30 bg-white p-6 shadow-lift space-y-4">
           <div className="flex items-center justify-between">
             <h2 className="text-xl font-black text-[#101511]">Você ganhou</h2>
             <span className="text-3xl">🎁</span>
           </div>
           <div className="rounded-2xl bg-primary/10 p-4">
             <PrizeList correctAnswers={data.correctAnswers} />
           </div>
           <p className="text-xs text-gray-600">Brindes cumulativos sujeitos à disponibilidade. Com 5 ou 6 acertos, escolha um bloco de notas ou um chaveiro.</p>
            {isWinner && <div className="rounded-2xl bg-yellow-50 p-4 text-center text-sm font-black text-yellow-900">+ Mousepad por ser o melhor da hora</div>}
         </div>

        {/* Redeemed status */}
        {data.redeemed && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-medium text-green-800">Resgate registrado</p>
            {data.prizes && data.prizes.length > 0 && (
              <div className="mt-2 space-y-1">
                {data.prizes.map((p, i) => (
                  <p key={i} className="text-sm text-green-700">• {p.name}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Links */}
        <div className="space-y-3 pt-4">
           <a
             href="/ranking"
             className="block w-full rounded-2xl bg-black py-4 px-6 text-center font-black text-white shadow-lift transition hover:bg-primary hover:text-[#101511]"
           >
            Ver Ranking
          </a>
        </div>
      </div>
    </main>
  )
}

function PrizeList({ correctAnswers }: { correctAnswers: number }) {
  const prizes = ['Bala', 'Adesivo']
  if (correctAnswers >= 3) prizes.push('Marca-página', 'Caneta')
  if (correctAnswers >= 5) prizes.push('Bloco de notas ou Chaveiro')
  if (correctAnswers === 6) prizes.push('Necessaire')

  return (
    <ul className="space-y-2">
      {prizes.map((prize) => (
        <li key={prize} className="flex items-center gap-3 text-base font-bold text-[#101511]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-black text-white">✓</span>
          {prize}
        </li>
      ))}
    </ul>
  )
}

function getRoundTime(round: number): string {
  const start = 10 + round
  const end = start + 1
  return `${start}h-${end}h`
}
