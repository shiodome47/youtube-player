import { useRef, useState } from 'react'
import { PLAYER_STATE, useYouTubePlayer } from '@shiodome47/youtube-player'

/** YouTube の見本（Blender 財団の公開映画「Big Buck Bunny」） */
const SAMPLE_YOUTUBE = 'aqz-KE-bpKQ'

type Lang = 'ja' | 'en'

const STATE_NAMES: Record<Lang, Record<number, string>> = {
  ja: { [-1]: 'まだ始まっていない', 0: 'おわり', 1: '再生中', 2: '一時停止', 3: '読み込み中', 5: '頭出し' },
  en: { [-1]: 'Unstarted', 0: 'Ended', 1: 'Playing', 2: 'Paused', 3: 'Buffering', 5: 'Cued' },
}

const TEXT = {
  ja: {
    lead: 'YouTube の埋め込みプレイヤー（IFrame API）を React で使う部品。画面は持たない（枠・ボタンは使う側）。',
    how: '下のボタンは見本のページが作ったもの。部品の play・pause・togglePlay・seekTo を呼んでいます。位置は onTick（0.1 秒ごと）で受け取っています。',
    lang: '言葉',
    ready: '準備',
    yes: 'できた',
    no: 'まだ',
    state: '状態',
    time: '位置',
    play: '再生',
    pause: '一時停止',
    toggle: '再生・一時停止',
    back: '5 秒戻る',
    forward: '5 秒進む',
    log: 'できごと（新しい順）',
    input: 'YouTube の URL か 11 文字の ID を貼って試す',
    show: '表示',
    readyLog: '準備ができた（onReady）',
    stateLog: (s: string) => `状態が変わった（onStateChange）: ${s}`,
    errorLog: (c: number) => `再生できない（onError）: ${c}`,
  },
  en: {
    lead: 'A React hook for the YouTube embedded player (IFrame API). No UI of its own — you bring the frame and buttons.',
    how: 'The buttons below belong to this demo page. They call play / pause / togglePlay / seekTo. The time comes from onTick (every 0.1 s).',
    lang: 'Language',
    ready: 'Ready',
    yes: 'yes',
    no: 'not yet',
    state: 'State',
    time: 'Time',
    play: 'Play',
    pause: 'Pause',
    toggle: 'Play / pause',
    back: 'Back 5 s',
    forward: 'Forward 5 s',
    log: 'Events (newest first)',
    input: 'Paste a YouTube URL or an 11-character ID',
    show: 'Show',
    readyLog: 'Ready (onReady)',
    stateLog: (s: string) => `State changed (onStateChange): ${s}`,
    errorLog: (c: number) => `Cannot play (onError): ${c}`,
  },
} as const

/** URL（watch?v=・youtu.be・shorts・embed）か、11 文字の ID から、動画の ID を取り出す */
function youTubeId(input: string): string | null {
  const s = input.trim()
  if (/^[\w-]{11}$/.test(s)) return s
  try {
    const u = new URL(s)
    const host = u.hostname.replace(/^(www|m)\./, '')
    if (host === 'youtu.be') return u.pathname.slice(1, 12) || null
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const v = u.searchParams.get('v')
      if (v) return v
      const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)
      return m ? m[1] : null
    }
  } catch {
    // URL ではない
  }
  return null
}

function fmt(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

export function App() {
  const [lang, setLang] = useState<Lang>('ja')
  const t = TEXT[lang]
  const [videoId, setVideoId] = useState(SAMPLE_YOUTUBE)
  const [input, setInput] = useState('')
  const [ready, setReady] = useState(false)
  const [state, setState] = useState<number>(PLAYER_STATE.UNSTARTED)
  const [time, setTime] = useState({ current: 0, duration: 0 })
  const [log, setLog] = useState<string[]>([])
  const add = (line: string) => setLog((l) => [`${new Date().toLocaleTimeString()} ${line}`, ...l].slice(0, 8))
  const boxRef = useRef<HTMLDivElement>(null)

  const yt = useYouTubePlayer(boxRef, videoId, {
    playerVars: { rel: 0, playsinline: 1 },
    onReady: () => {
      setReady(true)
      add(t.readyLog)
    },
    onStateChange: (s) => {
      setState(s)
      add(t.stateLog(STATE_NAMES[lang][s] ?? String(s)))
    },
    onError: (code) => add(t.errorLog(code)),
    onTick: ({ currentTime, duration }) => setTime({ current: currentTime, duration }),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const id = youTubeId(input)
    if (!id) return
    setReady(false)
    setState(PLAYER_STATE.UNSTARTED)
    setTime({ current: 0, duration: 0 })
    setVideoId(id)
  }

  return (
    <div className="demo">
      <main className="demo__main">
        <header>
          <h1>youtube-player</h1>
          <p>{t.lead}</p>
          <p className="demo__muted">{t.how}</p>
          <pre className="demo__code">
            <code>npm install @shiodome47/youtube-player</code>
          </pre>
          <div className="demo__row" role="group" aria-label={t.lang}>
            <span className="demo__muted">{t.lang}:</span>
            <button type="button" className="demo__btn" aria-pressed={lang === 'ja'} onClick={() => setLang('ja')}>
              日本語
            </button>
            <button type="button" className="demo__btn" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
              English
            </button>
          </div>
        </header>

        <section>
          <div className="demo__player">
            <div ref={boxRef} className="demo__yt" />
          </div>
          <dl className="demo__status">
            <dt>{t.ready}</dt>
            <dd data-testid="ready">{ready ? t.yes : t.no}</dd>
            <dt>{t.state}</dt>
            <dd data-testid="state">{STATE_NAMES[lang][state] ?? state}</dd>
            <dt>{t.time}</dt>
            <dd data-testid="time">
              {fmt(time.current)} / {fmt(time.duration)}
            </dd>
          </dl>
          <div className="demo__row">
            <button type="button" className="demo__btn" onClick={yt.togglePlay} disabled={!ready}>
              {t.toggle}
            </button>
            <button type="button" className="demo__btn" onClick={yt.play} disabled={!ready}>
              {t.play}
            </button>
            <button type="button" className="demo__btn" onClick={yt.pause} disabled={!ready}>
              {t.pause}
            </button>
            <button type="button" className="demo__btn" onClick={() => yt.seekTo(Math.max(0, time.current - 5))} disabled={!ready}>
              {t.back}
            </button>
            <button type="button" className="demo__btn" onClick={() => yt.seekTo(time.current + 5)} disabled={!ready}>
              {t.forward}
            </button>
          </div>
          <form className="demo__form" onSubmit={submit}>
            <label htmlFor="yt-url" className="demo__muted">
              {t.input}
            </label>
            <div className="demo__row">
              <input
                id="yt-url"
                type="url"
                inputMode="url"
                placeholder="https://www.youtube.com/watch?v=…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button type="submit" className="demo__btn" disabled={!youTubeId(input)}>
                {t.show}
              </button>
            </div>
          </form>
          <h2>{t.log}</h2>
          <ul className="demo__log" data-testid="log">
            {log.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>

        <footer className="demo__footer">
          <a href="https://github.com/shiodome47/youtube-player">GitHub</a>
          <a href="https://www.npmjs.com/package/@shiodome47/youtube-player">npm</a>
        </footer>
      </main>
    </div>
  )
}
