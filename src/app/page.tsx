import Link from 'next/link'

const stations = [
  { number: '01', label: 'HIPÓTESE', icon: '✦' },
  { number: '02', label: 'SEGMENTAÇÃO', icon: '◉' },
  { number: '03', label: 'OFERTA', icon: '↗' },
  { number: '04', label: 'LANÇAMENTO', icon: '🚀' },
  { number: '05', label: 'MEDIÇÃO', icon: '▥' },
  { number: '06', label: 'ESCALA', icon: '⚑' },
]

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7faf6]">
      <section className="hero-grid relative min-h-[620px] overflow-hidden px-6 pb-10 pt-8 text-white md:min-h-[700px]">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/30" />
        <div className="absolute -bottom-36 -left-28 h-80 w-80 rounded-full border border-white/20" />
        <div className="absolute right-8 top-24 text-5xl opacity-80 animate-float">✦</div>
        <div className="absolute bottom-28 left-8 text-4xl opacity-70 animate-float">✧</div>

        <div className="relative mx-auto flex max-w-5xl flex-col items-center">
          <div className="w-full max-w-md md:max-w-2xl">
            <div className="mb-8 flex items-center justify-between text-xs font-bold tracking-[0.22em]">
              <span className="rounded-full border border-white/70 px-4 py-2">PICPAY CARD • GROWTH</span>
              <span className="hidden rounded-full bg-black/80 px-4 py-2 md:block">PLAY THE RIGHT CARDS</span>
            </div>
            <div className="max-w-2xl">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.35em] text-white/80">Growth Intelligence Hub</p>
              <h1 className="text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl">Desbloqueie<br />o próximo<br /><span className="text-black">movimento.</span></h1>
              <p className="mt-6 max-w-md text-lg font-medium leading-snug text-white/90">Da hipótese à escala: monte campanhas inteligentes para os perfis certos.</p>
            </div>
          </div>

          <ol className="relative mt-10 grid w-full max-w-md grid-cols-6 gap-2 md:max-w-2xl" aria-label="Seis desafios">
            {stations.map((station, index) => (
              <li key={station.number} className="flex min-w-0 flex-col items-center gap-2">
                <div className={`grid h-9 w-9 place-items-center rounded-lg border border-white/70 text-sm font-bold ${index % 2 ? 'bg-black' : 'bg-[#23894a]'}`}>{station.number}</div>
                <span className="text-[9px] font-bold text-white/90">{index < 2 ? 'Fácil' : index < 4 ? 'Médio' : 'Difícil'}</span>
              </li>
            ))}
          </ol>

          <div className="mt-2 flex w-full max-w-md items-center justify-between md:max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-white/75">Uma jornada. Seis decisões.</span>
            <span className="text-4xl animate-float">🚀</span>
          </div>
        </div>
      </section>

      <section className="relative mx-auto -mt-12 max-w-md px-5 pb-12 md:max-w-2xl">
        <div className="rounded-[2rem] border border-white bg-white p-6 shadow-lift md:p-8">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-primary">Challenge accepted?</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-ink">Play the right cards.</h2>
            </div>
            <div className="rounded-2xl bg-black px-3 py-2 text-2xl text-white">♠</div>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-gray-600">Uma experiência rápida e visual sobre aquisição, engajamento e monetização. Cada escolha move sua campanha pelo tabuleiro.</p>
          <div className="grid grid-cols-2 gap-3 text-sm font-bold">
            {['6 perguntas', '3 dificuldades', 'Brindes por acerto', 'Ranking por hora'].map((item) => (
              <div key={item} className="rounded-2xl bg-[#f1f4f0] p-4 text-gray-700"><span className="mr-2 text-primary">✦</span>{item}</div>
            ))}
          </div>
          <div className="mt-6 space-y-3">
            <div className="rounded-2xl bg-black px-5 py-4 text-center text-xs font-bold text-white"><span className="mr-2 text-primary">QR</span> Escaneie seu acesso para iniciar</div>
            <Link href="/ranking" className="block rounded-2xl border-2 border-primary px-5 py-4 text-center font-black text-primary transition hover:bg-primary hover:text-white">Ver ranking da rodada ↗</Link>
          </div>
        </div>
        <p className="mt-6 text-center text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Growth Intelligence Hub • Cards</p>
      </section>
    </main>
  )
}
