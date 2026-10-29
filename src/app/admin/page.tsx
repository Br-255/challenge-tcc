'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import QRCode from 'qrcode'

interface AdminStats { totalAttempts: number; pending: number; inProgress: number; completed: number; revoked: number; currentRound: number; perfectScores: number }
interface Attempt { id: string; qr_code: string; nickname: string; phone: string; status: string; correct_answers: number; total_time: number; round: number | null; redeemed: boolean; created_at: string }
interface Winner { round: number; state: 'winner' | 'tie' | 'empty'; nickname: string | null; phone: string | null; correct_answers: number | null; score: number | null; total_time: number | null; finalized_at: string; candidates: Array<{ nickname: string }> }

type Tab = 'overview' | 'qr' | 'attempts' | 'winners'

export default function AdminPage() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [winners, setWinners] = useState<Winner[]>([])
  const [qrCode, setQrCode] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [qrImage, setQrImage] = useState('')
  const [generating, setGenerating] = useState(false)
  const [tab, setTab] = useState<Tab>('overview')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/admin/login')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) { setAuthenticated(true); loadDashboard() }
        else setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!authenticated) return
    const timer = setInterval(loadDashboard, 12000)
    return () => clearInterval(timer)
  }, [authenticated])

  const loadDashboard = async () => {
    try {
      const responses = await Promise.all(['/api/admin/stats', '/api/admin/attempts', '/api/admin/winners'].map((url) => fetch(url)))
      if (responses.some(response => response.status === 401)) { setAuthenticated(false); setLoading(false); return }
      if (responses.some(response => !response.ok)) throw new Error('Erro ao atualizar o painel')
      const data = await Promise.all(responses.map((res) => res.json()))
      setError('')
      setStats(data[0]); setAttempts(data[1].attempts || []); setWinners(data[2].winners || [])
      setLoading(false)
    } catch { setError('Erro ao carregar dados'); setLoading(false) }
  }

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault(); setError('')
    try {
      const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao autenticar'); return }
      setAuthenticated(true); loadDashboard()
    } catch { setError('Erro de conexão') }
  }

  const handleGenerateQR = async () => {
    setGenerating(true); setError('')
    try {
      const res = await fetch('/api/qr/generate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao gerar QR'); return }
      const image = await QRCode.toDataURL(data.url, { width: 520, margin: 2, color: { dark: '#101511', light: '#ffffff' }, errorCorrectionLevel: 'H' })
      setQrCode(data.qrCode); setQrUrl(data.url); setQrImage(image); await loadDashboard()
    } catch { setError('Não foi possível gerar o QR') } finally { setGenerating(false) }
  }

  const copyUrl = async () => { await navigator.clipboard.writeText(qrUrl); setCopied(true); setTimeout(() => setCopied(false), 1600) }
  const downloadQr = () => { const link = document.createElement('a'); link.download = `growth-qr-${qrCode.slice(0, 8)}.png`; link.href = qrImage; link.click() }
  const logout = async () => { await fetch('/api/admin/logout', { method: 'POST' }); setAuthenticated(false); router.push('/') }

  const revoke = async (id: string) => {
    const reason = window.prompt('Motivo da revogação:')
    if (reason === null) return
    await fetch(`/api/admin/attempts/${id}/revoke`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) })
    loadDashboard()
  }

  if (loading) return <main className="min-h-screen grid place-items-center bg-[#08110b]"><div className="h-14 w-14 animate-spin rounded-full border-4 border-primary border-t-transparent" /></main>

  if (!authenticated) return (
    <main className="min-h-screen bg-[#08110b] px-5 py-10 text-white grid place-items-center">
      <form onSubmit={handleLogin} className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[.06] p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-10"><div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl shadow-lift">✦</div><p className="text-xs font-black uppercase tracking-[.3em] text-primary">Growth Intelligence Hub</p><h1 className="mt-3 text-4xl font-black">Control room</h1><p className="mt-2 text-white/50">Operação do desafio em tempo real.</p></div>
        <div className="space-y-4"><input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Usuário" className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none focus:border-primary" required /><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Senha" className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none focus:border-primary" required />{error && <p className="rounded-xl bg-red-500/15 p-3 text-sm text-red-300">{error}</p>}<button className="w-full rounded-xl bg-primary py-4 font-black text-[#08110b] transition hover:bg-[#72d58d]">Entrar no cockpit →</button></div>
      </form>
    </main>
  )

  const nav: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Visão geral', icon: '◈' },
    { id: 'qr', label: 'Acessos QR', icon: '⌁' },
    { id: 'attempts', label: 'Participantes', icon: '◎' },
    { id: 'winners', label: 'Vencedores', icon: '✦' },
  ]

  return (
    <main className="mobile-shell min-h-screen bg-[#08110b] pb-24 text-white lg:max-w-none lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0d1b11]/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between lg:max-w-7xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-black text-[#08110b]">✦</div>
            <div>
              <p className="text-sm font-black tracking-tight">GROWTH / CONTROL</p>
              <p className="text-[10px] uppercase tracking-[.25em] text-primary">live operation room</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-xs text-white/50">
              <i className="h-2 w-2 animate-pulse rounded-full bg-primary" /> sync ativo
            </span>
            <button onClick={logout} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white/60 hover:bg-white/10">Sair</button>
          </div>
        </div>
      </header>

        <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-6 lg:max-w-7xl lg:flex-row lg:gap-10 lg:px-8 lg:py-8">
        <aside className="w-full lg:w-60 lg:flex-shrink-0">
             <div className="hidden lg:block"><p className="mb-3 px-1 text-[10px] font-black uppercase tracking-[.25em] text-white/35">Operação</p><nav className="space-y-2">{nav.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${tab === item.id ? 'bg-primary text-[#08110b] shadow-lift' : 'text-white/55 hover:bg-white/10 hover:text-white'}`}><span className="text-lg">{item.icon}</span>{item.label}</button>)}</nav></div>
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-primary">EVENTO AO VIVO</p>
              <span className="flex items-center gap-1 text-[10px] text-white/50">
                <i className="h-2 w-2 animate-pulse rounded-full bg-primary" /> sync
              </span>
            </div>
            <p className="mt-2 text-2xl font-black">11—20h</p>
            <p className="mt-1 text-xs text-white/45">9 janelas de ranking</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          {error && <p role="alert" className="mb-4 rounded-xl bg-red-500/15 p-4 text-sm text-red-200">{error}</p>}
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[.3em] text-primary">
                {nav.find((item) => item.id === tab)?.label}
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-[-.04em]">
                {tab === 'overview' ? 'Cockpit do desafio' : nav.find((item) => item.id === tab)?.label}
              </h1>
            </div>
            {stats && (
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                <p className="text-[10px] uppercase tracking-widest text-white/40">janela atual</p>
                <p className="font-black text-primary">
                  {stats.currentRound > 0 && stats.currentRound < 10
                    ? `${10 + stats.currentRound}h—${11 + stats.currentRound}h`
                    : 'fora do evento'}
                </p>
              </div>
            )}
          </div>

          {tab === 'overview' && stats && (
            <div className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                {[
                  ['participantes', stats.totalAttempts, '◉'],
                  ['em jogo', stats.inProgress, '↗'],
                  ['concluídos', stats.completed, '✓'],
                  ['perfeitos 6/6', stats.perfectScores, '✦'],
                ].map(([label, value, icon]) => (
                  <div key={String(label)} className="group rounded-2xl border border-white/10 bg-white/[.06] p-5 transition hover:-translate-y-1 hover:border-primary/50">
                    <div className="flex justify-between text-primary">
                      <span className="text-2xl">{icon}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">live</span>
                    </div>
                    <p className="mt-7 text-4xl font-black">{value}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-widest text-white/45">{label}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
                <div className="rounded-2xl border border-white/10 bg-white/[.06] p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-primary">Pulso da operação</p>
                      <h2 className="mt-1 text-xl font-black">Últimos acessos</h2>
                    </div>
                    <button onClick={() => setTab('qr')} className="rounded-lg bg-primary px-3 py-2 text-xs font-black text-[#08110b]">
                      + gerar QR
                    </button>
                  </div>
                  <div className="space-y-3">
                    {attempts.slice(0, 5).map((attempt) => (
                      <div key={attempt.id} className="flex items-center justify-between rounded-xl bg-black/20 p-3">
                        <div className="flex items-center gap-3">
                          <span className={`h-2 w-2 rounded-full ${
                            attempt.status === 'completed' ? 'bg-primary' :
                            attempt.status === 'in_progress' ? 'bg-yellow-400 animate-pulse' :
                            'bg-white/30'
                          }`} />
                          <div>
                            <p className="text-sm font-bold">{attempt.nickname || 'QR aguardando cadastro'}</p>
                            <p className="text-xs font-semibold text-primary">{attempt.phone || 'Celular não cadastrado'}</p>
                            <p className="text-[10px] uppercase tracking-widest text-white/35">{attempt.status}</p>
                          </div>
                        </div>
                        <span className="font-mono text-xs text-white/40">{attempt.qr_code.slice(0, 8)}…</span>
                      </div>
                    ))}
                    {attempts.length === 0 && <p className="py-8 text-center text-sm text-white/35">Nenhum acesso gerado ainda.</p>}
                  </div>
                </div>

                <div className="rounded-2xl border border-primary/25 bg-primary/10 p-6">
                  <p className="text-xs font-black uppercase tracking-widest text-primary">Próximo movimento</p>
                  <h2 className="mt-3 text-2xl font-black">Gere um acesso e coloque o jogo na rua.</h2>
                  <p className="mt-3 text-sm leading-relaxed text-white/55">Cada QR é individual, imprevisível e vinculado a uma única tentativa.</p>
                  <button onClick={() => setTab('qr')} className="mt-6 w-full rounded-xl bg-black py-3 text-sm font-black transition hover:bg-white hover:text-black">
                    Abrir gerador →
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'qr' && (
            <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
              <div className="rounded-2xl border border-white/10 bg-white/[.06] p-6">
                <p className="text-5xl">⌁</p>
                <h2 className="mt-5 text-2xl font-black">Novo acesso</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/50">Gere um QR único. O participante escaneia, faz o cadastro e inicia a jornada.</p>
                <button disabled={generating} onClick={handleGenerateQR} className="mt-8 w-full rounded-xl bg-primary py-4 font-black text-[#08110b] transition hover:bg-[#72d58d] disabled:opacity-50">
                  {generating ? 'Criando acesso…' : 'Gerar QR escaneável →'}
                </button>
              </div>
              {qrImage ? (
                <div className="rounded-2xl border border-primary/35 bg-white p-6 text-[#101511] shadow-lift">
                  <div className="flex flex-col items-center gap-5">
                    <div className="w-full max-w-[304px] rounded-2xl border-8 border-[#101511] bg-white p-2"><img src={qrImage} alt="QR Code para acessar o Growth Challenge" className="aspect-square h-auto w-full" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black uppercase tracking-widest text-primary-dark">Acesso pronto para escanear</p>
                      <p className="mt-3 break-all rounded-xl bg-[#f1f4f0] p-3 font-mono text-xs">{qrUrl}</p>
                      <div className="mt-4 flex gap-2"><button onClick={downloadQr} className="rounded-xl bg-black px-4 py-3 text-xs font-black text-white">Baixar PNG</button><button onClick={copyUrl} className="rounded-xl border border-black/15 px-4 py-3 text-xs font-black">{copied ? 'Copiado ✓' : 'Copiar link'}</button></div>
                    </div>
                  </div>
                  <p className="mt-5 border-t border-black/10 pt-4 text-center text-xs font-bold text-gray-500">ID: {qrCode}</p>
                </div>
              ) : (
                <div className="grid min-h-[350px] place-items-center rounded-2xl border border-dashed border-white/20 bg-white/[.03] p-8 text-center"><div><div className="mx-auto mb-4 text-6xl text-white/20">▦</div><p className="font-bold text-white/45">Seu QR aparecerá aqui</p><p className="mt-2 text-xs text-white/30">O código é gerado pelo servidor e aponta para a URL real da jornada.</p></div></div>
              )}
            </div>
          )}

          {tab === 'attempts' && (
            <div className="space-y-3">
              {attempts.map((attempt) => (
                <div key={attempt.id} className="rounded-2xl border border-white/10 bg-white/[.06] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{attempt.nickname || 'QR aguardando cadastro'}</p>
                      <p className="mt-1 text-sm font-semibold text-primary">{attempt.phone || 'Celular não cadastrado'}</p>
                      <p className="mt-1 font-mono text-xs text-white/35">{attempt.qr_code}</p>
                    </div>
                    <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">{attempt.status}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-white/45">
                    <span>acertos <b className="block text-lg text-white">{attempt.correct_answers}/6</b></span>
                    <span>tempo <b className="block text-lg text-white">{attempt.total_time}s</b></span>
                    <span>resgate <b className="block text-lg text-white">{attempt.redeemed ? 'sim' : 'não'}</b></span>
                  </div>
                  <div className="mt-4 flex gap-4 text-xs font-bold">
                    <a href={`/results/${attempt.qr_code}`} className="text-primary">Ver resultado ↗</a>
                    {attempt.status !== 'revoked' && (
                      <button onClick={() => revoke(attempt.id)} className="text-red-300">Revogar acesso</button>
                    )}
                  </div>
                </div>
              ))}
              {attempts.length === 0 && <Empty text="Nenhum participante ainda." />}
            </div>
          )}

          {tab === 'winners' && (
            <div className="space-y-3">
              {winners.map((winner, index) => (
                <div key={`${winner.round}-${winner.nickname}`} className="flex items-center gap-4 rounded-2xl border border-primary/25 bg-primary/10 p-5">
                  <span className="text-3xl">{index < 3 ? '✦' : '◈'}</span>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-primary">{10 + winner.round}h–{11 + winner.round}h • rodada encerrada</p>
                    <p className="mt-1 font-black">{winner.state === 'winner' ? winner.nickname : winner.state === 'tie' ? 'Empate — decisão da equipe pendente' : 'Sem participantes elegíveis'}</p>
                    {winner.state === 'winner' && <><p className="mt-1 break-words text-sm font-semibold text-primary">{winner.phone || 'Celular não cadastrado'}</p><p className="mt-1 text-xs text-white/60">{winner.correct_answers}/6 • {winner.score} pts • {winner.total_time}s</p></>}
                    {winner.state === 'tie' && <p className="mt-2 text-xs text-white/60">{winner.candidates.map(candidate => candidate.nickname).join(' · ')}</p>}
                  </div>
                  <span className="font-black text-primary">#{index + 1}</span>
                </div>
              ))}
              {winners.length === 0 && <Empty text="As rodadas vencedoras aparecerão aqui." />}
            </div>
          )}
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0d1b11]/95 px-1 pb-[calc(.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(0,0,0,.35)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-md justify-around">
          {nav.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              aria-label={item.label}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[9px] font-black transition active:scale-95 ${
                tab === item.id ? 'bg-primary text-[#08110b] shadow-lift' : 'text-white/45'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </main>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-white/20 py-16 text-center text-sm text-white/35">{text}</div>
}
