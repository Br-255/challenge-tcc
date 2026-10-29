'use client'

import { useEffect, useState } from 'react'

interface RankingEntry {
  nickname: string
  correct_answers: number
  score: number
  total_time: number
  round_position: number
}

export default function RankingPage() {
  const [rankings, setRankings] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentRound, setCurrentRound] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const refresh = async () => {
      try {
        const response = await fetch('/api/ranking', { cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error('Não foi possível atualizar o ranking')
        if (active) { setRankings(data.rankings || []); setCurrentRound(data.currentRound || 0); setError('') }
      } catch { if (active) setError('Sem conexão. Aguardando atualização do ranking.') }
      finally { if (active) setLoading(false) }
    }
    void refresh()
    const interval = setInterval(refresh, 5000)
    const onVisible = () => { if (!document.hidden) void refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { active = false; clearInterval(interval); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  const isEventOpen = currentRound >= 1 && currentRound <= 9
  return (
    <main className="container-mobile flex flex-col p-6">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold">Ranking da hora</h1>
        <p className="mt-2 text-sm text-gray-600">{isEventOpen ? `${10 + currentRound}h–${11 + currentRound}h • classificação provisória` : 'Evento das 11h às 20h'}</p>
      </header>
      <p className="mb-6 rounded-2xl bg-primary/10 p-4 text-center text-sm text-primary-dark">Uma lista por hora. Atualização automática a cada 5 segundos.</p>
      {error && <p role="status" className="mb-4 text-sm text-red-800">{error}</p>}
      {loading ? <p className="py-12 text-center text-gray-600">Carregando ranking…</p>
        : rankings.length === 0 ? <p className="flex-1 py-12 text-center text-gray-600">{isEventOpen ? 'Nenhuma conclusão nesta hora ainda.' : 'Não há rodada premiada aberta agora.'}</p>
        : <ol className="flex-1 space-y-3">{rankings.map((entry, index) => (
          <li key={`${entry.nickname}-${index}`} className={`flex items-center gap-3 rounded-2xl border p-4 ${index === 0 ? 'border-yellow-200 bg-yellow-50' : 'border-border bg-white'}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary font-bold text-white">{entry.round_position || index + 1}</span>
            <div className="min-w-0 flex-1"><p className="break-words font-bold">{entry.nickname}</p><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600"><span>{entry.correct_answers}/6 acertos</span><span>{entry.score.toLocaleString('pt-BR')} pts</span><span>{entry.total_time}s</span></div></div>
          </li>
        ))}</ol>}
      <a href="/" className="mt-6 rounded-2xl bg-black px-6 py-4 text-center font-bold text-white">Voltar</a>
    </main>
  )
}
