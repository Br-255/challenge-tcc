export type ToneType = 'start' | 'select' | 'correct' | 'wrong' | 'next' | 'finale'

export interface AudioEngine {
  startMusic: () => void
  tone: (type: ToneType) => void
  dispose: () => void
}

export function createAudioEngine(): AudioEngine {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return { startMusic: () => undefined, tone: () => undefined, dispose: () => undefined }

  const context = new AudioContextClass()
  const master = context.createGain()
  master.gain.value = 0.16
  master.connect(context.destination)
  let musicTimer: number | null = null
  let disposed = false
  let step = 0

  const resume = () => {
    if (context.state === 'suspended') void context.resume()
  }

  const play = (frequency: number, duration: number, delay = 0, volume = 0.12, type: OscillatorType = 'triangle') => {
    if (disposed) return
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, context.currentTime + delay)
    gain.gain.setValueAtTime(0.0001, context.currentTime + delay)
    gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + delay + 0.025)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + delay + duration)
    oscillator.connect(gain)
    gain.connect(master)
    oscillator.start(context.currentTime + delay)
    oscillator.stop(context.currentTime + delay + duration + 0.04)
  }

  const tone = (type: ToneType) => {
    resume()
    const patterns: Record<ToneType, number[]> = {
      start: [261.63, 329.63, 392, 523.25],
      select: [440],
      correct: [523.25, 659.25, 783.99],
      wrong: [220, 174.61],
      next: [392, 523.25],
      finale: [392, 523.25, 659.25, 783.99, 1046.5],
    }
    patterns[type].forEach((frequency, index) => play(frequency, type === 'select' ? .12 : type === 'finale' ? .3 : .2, index * (type === 'finale' ? .11 : .08), type === 'wrong' ? .1 : type === 'finale' ? .2 : .16, type === 'finale' ? 'sine' : 'triangle'))
  }

  const startMusic = () => {
    resume()
    if (musicTimer !== null) return
    // Arpejo em 128 BPM: baixo + pulso + melodia, com tensão harmônica crescente.
    const bass = [98, 98, 110, 123.47, 98, 110, 123.47, 146.83]
    const arp = [392, 493.88, 587.33, 783.99, 493.88, 587.33, 783.99, 987.77]
    const loop = () => {
      const position = step % 8
      play(bass[position], .5, 0, .055, 'sawtooth')
      play(arp[position], .18, 0, .045, 'square')
      play(position % 2 === 0 ? 196 : 246.94, .08, .02, .035, 'sine')
      if (step % 8 === 7) play(783.99, .22, .06, .05, 'triangle')
      step += 1
    }
    loop()
    musicTimer = window.setInterval(loop, 468)
  }

  const dispose = () => {
    disposed = true
    if (musicTimer !== null) window.clearInterval(musicTimer)
    void context.close()
  }

  return { startMusic, tone, dispose }
}
