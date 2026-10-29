'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { QuizQuestion, SimulatorPhase } from '@/lib/quiz-content'
import { createAudioEngine, type AudioEngine, type ToneType } from './audio'

interface QuizData {
  phase: number
  question?: QuizQuestion
  simulator?: SimulatorPhase
}

export default function QuizPage({ params }: { params: { qrCode: string } }) {
  const router = useRouter()
  const { qrCode } = params

  const [currentPhase, setCurrentPhase] = useState(0) // 0 = loading/start
  const [started, setStarted] = useState(false)
  const [quizData, setQuizData] = useState<QuizData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Timer
  const [timeSpent, setTimeSpent] = useState(0)
  const [timerReady, setTimerReady] = useState(false)
  const timerOriginRef = useRef(0)
  const deviceIdRef = useRef('')
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Question state
  const [selectedAlternative, setSelectedAlternative] = useState('')
  const [simulatorChoices, setSimulatorChoices] = useState({
    audience: '', offer: '', channel: '', metric: ''
  })

  // Feedback state
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackCorrect, setFeedbackCorrect] = useState(false)
  const [feedbackExplanation, setFeedbackExplanation] = useState('')

  // Results
  const [results, setResults] = useState<{ phase: number; correct: boolean }[]>([])
  const [confirming, setConfirming] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [soundOn, setSoundOn] = useState(false)
  const audioRef = useRef<AudioEngine | null>(null)

  useEffect(() => {
    let deviceId = sessionStorage.getItem('growth-device-id')
    if (!deviceId) {
      deviceId = crypto.randomUUID()
      sessionStorage.setItem('growth-device-id', deviceId)
    }
    deviceIdRef.current = deviceId
    return () => {
      audioRef.current?.dispose()
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
    }
  }, [])

  const toggleSound = () => {
    if (soundOn) {
      audioRef.current?.dispose()
      audioRef.current = null
      setSoundOn(false)
      return
    }
    audioRef.current = createAudioEngine()
    audioRef.current.startMusic()
    audioRef.current.tone('start')
    setSoundOn(true)
  }

  const playTone = (type: ToneType) => {
    if (!soundOn) return
    if (!audioRef.current) audioRef.current = createAudioEngine()
    audioRef.current.tone(type)
  }

  // Load quiz data for current phase
  const loadPhaseData = useCallback(async (phase: number) => {
    setError('')
    setTimerReady(false)
    setQuizData(null)
    try {
      const res = await fetch(`/api/quiz/content?phase=${phase}&qrCode=${encodeURIComponent(qrCode)}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar fase')
      setQuizData(data)
      setSelectedAlternative('')
      setShowFeedback(false)
      setTimeSpent(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar fase')
    }
  }, [qrCode])

  // Check QR status on mount
  useEffect(() => {
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
          return
        }
        if (data.status === 'revoked') {
          setError('Este acesso foi revogado')
          setLoading(false)
          return
        }
        // pending or in_progress — show start screen
        setLoading(false)
      })
      .catch(() => {
        setError('Erro de conexão')
        setLoading(false)
      })
  }, [qrCode, router])

  // Start the quiz
  const handleStart = async () => {
    if (!audioRef.current) audioRef.current = createAudioEngine()
    audioRef.current.startMusic()
    audioRef.current.tone('start')
    setSoundOn(true)
    try {
      setLoading(true)
      const res = await fetch('/api/quiz/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode, deviceId: deviceIdRef.current }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao iniciar')
        setLoading(false)
        return
      }

      if (data.phase > 6) { router.replace(`/results/${qrCode}`); return }
      setResults(data.results || [])
      setCurrentPhase(data.phase || 1)
      setStarted(true)
      setLoading(false)
    } catch {
      setError('Erro de conexão')
      setLoading(false)
    }
  }

  // Load phase data when phase changes
  useEffect(() => {
    if (currentPhase > 0 && currentPhase <= 6) {
      loadPhaseData(currentPhase)
    }
  }, [currentPhase, loadPhaseData])

  // Informar prontidão somente depois de renderizar a pergunta e finalizar sua entrada.
  useEffect(() => {
    if (!quizData || showFeedback || isTransitioning || !started) return
    let cancelled = false
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700
    const readyTimeout = setTimeout(async () => {
      try {
        const res = await fetch('/api/quiz/content', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qrCode, phase: currentPhase, deviceId: deviceIdRef.current }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Não foi possível iniciar o desafio')
        if (!cancelled) {
          timerOriginRef.current = performance.now() - data.elapsedMs
          setTimeSpent(Math.floor(data.elapsedMs / 1000))
          setTimerReady(true)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro de conexão')
      }
    }, delay)
    return () => { cancelled = true; clearTimeout(readyTimeout) }
  }, [quizData, showFeedback, isTransitioning, started, currentPhase, qrCode])

  useEffect(() => {
    if (!timerReady || showFeedback || isTransitioning) return
    const update = () => setTimeSpent(Math.floor((performance.now() - timerOriginRef.current) / 1000))
    const interval = setInterval(update, 250)
    document.addEventListener('visibilitychange', update)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', update) }
  }, [timerReady, showFeedback, isTransitioning])

  // Submit answer
  const handleSubmitAnswer = async () => {
    if (confirming || !timerReady) return

    let answer: string
    if (!selectedAlternative) return
    answer = selectedAlternative

    setConfirming(true)
    setError('')

    try {
      const res = await fetch('/api/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrCode,
          phase: currentPhase,
          answer,
          deviceId: deviceIdRef.current,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao enviar resposta')
        setConfirming(false)
        return
      }

      setTimerReady(false)
      setTimeSpent(Math.floor((data.timeMs || 0) / 1000))
      setFeedbackCorrect(data.correct)
      setFeedbackExplanation(data.explanation)
      playTone(data.correct ? 'correct' : 'wrong')
      setShowFeedback(true)
      setResults((prev) => [...prev, { phase: currentPhase, correct: data.correct }])
    } catch {
      setError('Erro de conexão')
    } finally {
      setConfirming(false)
    }
  }

  // Next phase or finish
  const handleNext = () => {
    playTone('next')
    if (currentPhase >= 6) {
      router.push(`/results/${qrCode}`)
      return
    }
    setShowFeedback(false)
    setIsTransitioning(true)
    setTimerReady(false)
    setQuizData(null)
    transitionTimerRef.current = setTimeout(() => {
      setCurrentPhase(currentPhase + 1)
      setIsTransitioning(false)
      window.scrollTo({ top: 0 })
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1450)
  }

  // Loading screen
  if (loading) {
    return (
      <main className="container-mobile min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Carregando...</p>
        </div>
      </main>
    )
  }

  // Error
  if (error && !started) {
    return (
      <main className="container-mobile min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Erro</h1>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-primary text-white px-6 py-3 rounded-lg"
          >
            Voltar
          </button>
        </div>
      </main>
    )
  }

  // Pre-start screen
  if (!started) {
    return (
      <main className="min-h-screen bg-[#f7faf6] px-5 py-8">
        <div className="mx-auto max-w-md text-center">
           <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-4xl text-white shadow-lift">🚀</div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-primary">Growth Intelligence Hub</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-ink">Preparado para<br />o desafio?</h1>
          <p className="mt-3 text-gray-600">Seis decisões. Uma campanha. O próximo movimento é seu.</p>
           <div className="mt-8 overflow-hidden rounded-[2rem] bg-black p-5 text-left text-white shadow-card">
             <div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Seu tabuleiro</span><span className="text-xs font-black uppercase tracking-widest text-white/45">6 estações</span></div>
              <ol className="mini-board" aria-label="Seis etapas do quiz">
                {['01', '02', '03', '04', '05', '06'].map((number) => (
                  <li key={number} className="mini-board-house" aria-label={`Desafio ${number}`}>{number}</li>
                ))}
              </ol>
           </div>
           <div className="mt-5 grid grid-cols-2 gap-3 text-left">
             <div className="rounded-2xl bg-white p-4 shadow-card"><p className="text-2xl font-black text-primary">06</p><p className="text-xs font-bold text-gray-500">fases</p></div>
             <button onClick={toggleSound} className="rounded-2xl bg-black p-4 text-left text-white shadow-card transition active:scale-95"><p className="text-2xl font-black text-primary">{soundOn ? '♫' : '×'}</p><p className="text-xs font-bold text-white/60">{soundOn ? 'som ativo' : 'ativar som'}</p></button>
           </div>
          <button onClick={handleStart} className="mt-6 w-full rounded-2xl bg-primary py-4 text-lg font-black text-white shadow-lift transition hover:bg-primary-dark active:translate-y-1 active:shadow-none animate-shimmer">Começar a jornada →</button>
          <p className="mt-4 text-xs text-gray-400">Seu tempo começa quando a primeira fase estiver pronta.</p>
        </div>
      </main>
    )
  }

  // Feedback screen
  if (showFeedback) {
    return (
      <main className={`min-h-screen px-5 py-8 ${feedbackCorrect ? 'bg-[#e9f8ed]' : 'bg-[#fff1f1]'}`}>
        <div className="mx-auto max-w-md text-center animate-fade-in">
          <div className={`relative mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-[2rem] text-5xl shadow-lift animate-pop-in ${feedbackCorrect ? 'bg-primary' : 'bg-[#ff6b6b]'}`}>
            {feedbackCorrect ? '✦' : '×'}
            {feedbackCorrect && <span className="orbit-dot absolute -right-2 -top-2 h-3 w-3 rounded-full bg-black" />}
          </div>
          <p className={`text-xs font-black uppercase tracking-[.3em] ${feedbackCorrect ? 'text-primary-dark' : 'text-red-600'}`}>{feedbackCorrect ? 'Movimento confirmado' : 'Movimento fora da rota'}</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-ink">{feedbackCorrect ? 'Boa leitura.' : 'Quase lá.'}</h2>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-gray-500"><span className="rounded-full bg-black px-3 py-1 text-white">Fase {currentPhase}/6</span><span>•</span><span>{timeSpent}s de decisão</span></div>
          <div className="scan-card mt-8 rounded-[2rem] bg-black p-6 text-left text-white shadow-card"><div className="mb-4 flex items-center justify-between"><span className="text-xs font-black uppercase tracking-widest text-primary">Leitura do radar</span><span className="text-primary">↗</span></div><p className="text-sm leading-relaxed text-white/75">{feedbackExplanation}</p></div>
          <div className="mt-7 rounded-2xl bg-white p-4 shadow-card"><div className="mb-3 flex justify-between text-xs font-black uppercase tracking-widest text-gray-400"><span>Trilha</span><span>{results.filter((result) => result.correct).length}/6 acertos</span></div><div className="flex gap-2">{Array.from({ length: 6 }, (_, i) => <div key={i} className={`h-3 flex-1 rounded-full ${i < results.length ? results[i].correct ? 'bg-primary' : 'bg-red-400' : 'bg-gray-200'}`} />)}</div></div>
          <button onClick={handleNext} className="mt-6 w-full rounded-2xl bg-black py-4 text-lg font-black text-white shadow-lift transition hover:bg-primary hover:text-black">{currentPhase >= 6 ? 'Ver meu resultado →' : 'Avançar para a próxima estação →'}</button>
        </div>
      </main>
    )
  }

  if (isTransitioning) {
    return <BoardTransition from={currentPhase} to={currentPhase + 1} />
  }

  // Quiz phase screen
  if (!quizData && error) {
    return <main className="container-mobile grid place-items-center"><div role="alert" className="text-center"><p className="text-red-800">{error}</p><button onClick={() => loadPhaseData(currentPhase)} className="mt-4 rounded-xl bg-primary px-5 py-3 text-white">Tentar novamente</button></div></main>
  }
  if (!quizData) {
    return (
      <main className="container-mobile min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Carregando fase {currentPhase}...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f7faf6] px-5 py-6">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="mb-6 rounded-[1.75rem] border border-[#d9e2d8] bg-white p-5 text-[#101511] shadow-card">
          <div className="mb-5 flex items-center justify-between"><span className="text-xs font-black uppercase tracking-[0.22em] text-primary">Growth Challenge</span><div className="flex items-center gap-2"><span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-primary-dark">em jogo</span><button onClick={toggleSound} aria-label={soundOn ? 'Desligar som' : 'Ligar som'} className="rounded-xl bg-[#f1f4f0] px-3 py-2 text-lg transition active:scale-90">{soundOn ? '♫' : '×'}</button></div></div>
          <div className="flex items-center justify-between gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className={`h-2 w-full rounded-full ${i < results.length ? results[i].correct ? 'bg-primary' : 'bg-red-400' : i === results.length ? 'bg-[#101511]' : 'bg-[#d9e2d8]'}`} />
                <span className="text-[10px] font-bold text-gray-500">0{i + 1}</span>
              </div>
            ))}
            <div className="ml-3 rounded-xl bg-[#f1f4f0] px-3 py-2 text-sm font-black text-[#101511]">{timeSpent}s</div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 animate-fade-in">
          <div className="launch-transition mb-5 flex items-start justify-between">
             <div><p className="text-xs font-black uppercase tracking-[0.25em] text-primary">Desafio 0{currentPhase}</p><h1 className="mt-2 text-3xl font-black tracking-tight text-ink">Escolha a melhor resposta</h1><p className="mt-1 text-sm font-semibold text-gray-500">Analise o cenário antes de confirmar.</p></div>

          </div>
          {error && <div role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}<button onClick={() => loadPhaseData(currentPhase)} className="ml-2 underline">Tentar novamente</button></div>}

        {/* Question phases */}
        {quizData.question && (
          <div className="space-y-4">
             <div className="card-flip rounded-[1.5rem] border border-[#d9e2d8] bg-white p-5 text-[#101511] shadow-card">
              <p className="text-sm leading-relaxed whitespace-pre-line text-gray-700">{quizData.question.scenario}</p>
              {quizData.question.comparison && <table className="mt-4 w-full table-fixed text-left text-xs text-gray-700"><thead><tr>{quizData.question.comparison.headers.map(header => <th key={header} scope="col" className="border-b border-border p-2">{header}</th>)}</tr></thead><tbody>{quizData.question.comparison.rows.map(row => <tr key={row[0]}>{row.map((cell, index) => <td key={index} className="border-b border-border p-2 break-words">{cell}</td>)}</tr>)}</tbody></table>}
            </div>

            <div className="space-y-3">
              {quizData.question.alternatives.map((alt) => (
                <button
                  key={alt.id}
                  disabled={!timerReady || confirming}
                  aria-pressed={selectedAlternative === alt.id}
                  onClick={() => { playTone('select'); setSelectedAlternative(alt.id) }}
                    className={`option-card w-full rounded-[1.25rem] border-2 bg-white p-4 text-left text-[#101511] shadow-card ${
                      selectedAlternative === alt.id
                        ? 'border-primary bg-primary/10 shadow-lift'
                        : 'border-transparent hover:border-primary/50'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      selectedAlternative === alt.id
                        ? 'border-primary bg-primary'
                        : 'border-gray-400'
                    }`}>
                      {selectedAlternative === alt.id && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-sm leading-relaxed">{alt.text}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {quizData.simulator && null}
        </div>

        <div className="pt-6">
        <button
          onClick={handleSubmitAnswer}
          disabled={!selectedAlternative || confirming || !timerReady}
          className="mt-6 w-full rounded-2xl bg-primary py-4 px-6 text-lg font-black text-white shadow-lift transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
        >
          {confirming ? 'Enviando...' : 'Confirmar resposta'}
        </button>
      </div>
      </div>
    </main>
  )
}

function BoardTransition({ from, to }: { from: number; to: number }) {
  const labels = ['Hipótese', 'Métrica', 'Leitura', 'Iteração', 'Engajar', 'Escalar']
  return <main className="board-transition relative min-h-screen overflow-hidden bg-[#101511] px-5 py-8 text-white"><div className="launch-stars" /> <div className="launch-orb launch-orb-one" /><div className="launch-orb launch-orb-two" /><div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col items-center justify-center text-center"><div className="launch-rocket">🚀</div><div className="transition-dice-row"><div className="transition-die transition-die-one">{from}</div><div className="transition-die transition-die-two">{to}</div></div><p className="mt-8 text-xs font-black uppercase tracking-[.35em] text-primary">próximo movimento</p><h1 className="mt-3 text-4xl font-black">Casa {from} <span className="text-primary">→</span> Casa {to}</h1><p className="mt-3 text-white/50">O tabuleiro está lançando a próxima pergunta.</p><div className="board-transition-path mt-12 flex w-full items-center justify-between">{labels.map((label, index) => <div key={label} className={`transition-house ${index + 1 === to ? 'transition-house-target' : index + 1 <= from ? 'transition-house-done' : ''}`}>{index + 1 === to ? '♟' : index + 1}</div>)}</div><div className="mt-12 h-1 w-48 overflow-hidden rounded-full bg-white/10"><div className="transition-loader h-full rounded-full bg-primary" /></div></div></main>
}

function BoardTrack({ currentPhase, results }: { currentPhase: number; results: { phase: number; correct: boolean }[] }) {
  const stations = [
    { label: 'Hipótese', icon: '✦' },
    { label: 'Métrica', icon: '▥' },
    { label: 'Leitura', icon: '◈' },
    { label: 'Iteração', icon: '↻' },
    { label: 'Engajar', icon: '⚡' },
    { label: 'Escalar', icon: '⚑' },
  ]
  return (
    <div className="board-track relative mb-6 overflow-hidden rounded-[1.75rem] bg-[#101511] p-4 text-white shadow-card">
      <div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-[.25em] text-primary">Growth board</span><span className="text-xs font-bold text-white/45">casa {currentPhase}/6</span></div>
      <div className="relative px-1 pb-1 pt-3">
        <div className="board-path absolute left-5 right-5 top-8 h-1 rounded-full" />
        <div className="board-progress absolute left-5 top-8 h-1 rounded-full bg-primary transition-all duration-700" style={{ width: `${Math.max(0, ((currentPhase - 1) / 5) * 85)}%` }} />
        <div className="relative flex justify-between">
          {stations.map((station, index) => {
            const phase = index + 1
            const result = results.find((item) => item.phase === phase)
            const active = phase === currentPhase
            return <div key={station.label} className="relative z-10 flex w-10 flex-col items-center gap-2">
              {active && <span className="board-player absolute -top-8 text-xl">♟</span>}
              <div className={`board-house flex h-10 w-10 items-center justify-center rounded-xl border-2 text-sm font-black transition-all duration-500 ${active ? 'board-house-active border-primary bg-primary text-black' : result?.correct ? 'border-primary bg-primary/25 text-primary' : result ? 'border-red-400 bg-red-400/15 text-red-300' : 'border-white/20 bg-white/10 text-white/60'}`}>{result ? (result.correct ? '✓' : '×') : station.icon}</div>
              <span className={`text-center text-[8px] font-bold ${active ? 'text-primary' : 'text-white/45'}`}>{station.label}</span>
            </div>
          })}
        </div>
      </div>
      <div className="board-die absolute right-3 top-2 rotate-12 rounded-lg bg-white p-2 text-sm font-black text-black shadow-lg">{currentPhase % 6 || 6}</div>
    </div>
  )
}

// Simulator component
function SimulatorChoices({
  simulator,
  choices,
  onChange,
  onSelect,
}: {
  simulator: SimulatorPhase
  choices: { audience: string; offer: string; channel: string; metric: string }
  onChange: (c: { audience: string; offer: string; channel: string; metric: string }) => void
  onSelect: () => void
}) {
  const sections = [
    { key: 'audience' as const, label: 'Público', options: simulator.options.audience },
    { key: 'offer' as const, label: 'Oferta', options: simulator.options.offer },
    { key: 'channel' as const, label: 'Canal', options: simulator.options.channel },
    { key: 'metric' as const, label: 'Métrica', options: simulator.options.metric },
  ]

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.key} className="space-y-2">
          <div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-black uppercase tracking-widest text-gray-500">{section.label}</h3><span className={`text-[10px] font-black uppercase tracking-wider ${choices[section.key] ? 'text-primary-dark' : 'text-gray-400'}`}>{choices[section.key] ? 'selecionado ✓' : 'escolha 1'}</span></div>
          <div className="space-y-2">
            {section.options.map((opt) => (
              <button
                key={opt.id}
                 onClick={() => { onSelect(); onChange({ ...choices, [section.key]: opt.id }) }}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                  choices[section.key] === opt.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
